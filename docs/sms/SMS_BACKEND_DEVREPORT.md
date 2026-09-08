# Patient SMS (Twilio) — Backend Dev Report

**Module:** Patient → *Messages* (two-way SMS inbox) and Patient → *SMS/Email* (communication log).
**Frontend:** `src/features/sms/**` — routes `/patient/:id/messages` and `/patient/:id/communication`.
**Status:** Frontend complete and live-verified against the dev backend. **Texts cannot reach a carrier
until the backend implements the Twilio gateway + webhooks below.** Until then the UI records every
outbound text in the existing `sms_messages` log with `send_status = "queued"` and shows a banner.

> Hand this file to the backend team. The Twilio account prerequisites the practice must supply are in
> [`TWILIO_ACCOUNT_CHECKLIST.md`](./TWILIO_ACCOUNT_CHECKLIST.md).

---

## 1. What exists today (and is used)

| Backend surface | Used by the frontend for |
|---|---|
| `GET /api/v1/sms-messages?patient_id=&page=&size=&sort=&order=` (`PaginatedResponse[SmsMessageRead]`) | Thread + log. Frontend pages all rows for the patient (`size=200`, up to 10 pages). |
| `POST /api/v1/sms-messages` (`SmsMessageCreate`) | **Fallback only** — records an outbound text as `queued` when the send gateway (SMS-1) is missing. |
| `PATCH /api/v1/sms-messages/{id}` (`is_read`) | Mark a reply read/unread, "Mark all read". |
| `GET /api/v1/patients/{id}` (`cell_phone`, `phone`, `work_phone`, `no_auto_sms`, `no_auto_email`, `preferred_contact`) | Destination picker + consent guard. |
| `GET /api/v1/appointments?patient_id=` | Reminder / confirmation-request quick actions + merge fields. |
| `GET /api/v1/offices` (`name`, `phone`) | `{{office_name}}` / `{{office_phone}}` merge fields. |
| `GET /api/v1/tenants/{id}/communications` + `/phone-assignments` | Not consumed by this screen yet — the Account Info screen owns them; see SMS-7. |

**Data observed on the dev tenant:** 5,425 migrated legacy rows in `sms_messages`; every `send_status`
is `"Success"` (3 null); `message_type` is null on all rows; 17 rows carry a `reply_text`; `created_at`
is the migration date (2026-06-08) while the real send time lives in `delivered_on`.

### How the frontend interprets `SmsMessageRead` (must stay true after your changes)

The table is legacy-shaped: **one row per outbound text, with the reply on the same row**. The UI fans a
row out into up to two inbox entries:

- **Outbound entry** when `sent_text` is non-empty → `sent_phone`, `send_status`, sorted by
  `delivered_on ?? created_at`.
- **Inbound entry** when `reply_text` is non-empty → `reply_phone`, `reply_received_on`, `is_read`.

Rows with `sent_text = null` and `reply_text` set are treated as **stand-alone inbound messages**
(what an unsolicited patient text should look like). `send_status` is normalized to Twilio's vocabulary
(`queued|accepted|scheduled|sending|sent|delivered|undelivered|failed|canceled|received`), with legacy
`"Success"` → `delivered`. `message_type` accepted values: `manual | appointment_reminder |
appointment_confirmation | recall | balance | inbound_reply | other` (null is inferred from the text).

---

## 2. Gaps (priority order)

### SMS-1 — Outbound send gateway (BLOCKING)
No endpoint sends a text. Frontend already calls it and falls back when it 404s.

```
POST /api/v1/sms/send
{
  "patient_id": 2357,
  "office_id": 3,
  "appointment_id": "APPT-…" | null,
  "to_phone": "+12107936174",            // E.164 — frontend normalizes US numbers
  "body": "Hi Yolanda, …",               // ≤ 1600 chars
  "message_type": "appointment_reminder",
  "client_id": "sms_lx4…"               // idempotency key — same client_id must not send twice
}
→ 201 SmsMessageRead  (the persisted log row, see SMS-3 for new columns)
→ 400 { detail: "patient_opted_out" }   when patient.no_auto_sms and message_type != manual (see SMS-8)
→ 409 on duplicate client_id             (return the existing row)
→ 502 { detail: "twilio_error", code: 21211, message: "…" }  when Twilio rejects the request
```

Implementation notes:
- Resolve the **From** number per office (SMS-7). Prefer a Twilio **Messaging Service SID** so Twilio
  handles sender selection, opt-out keywords and sticky sender; pass `messaging_service_sid` instead
  of `from`.
- Set `status_callback` to the SMS-2 status webhook so delivery states flow back.
- Persist the row **before** calling Twilio (`send_status="queued"`), then update it with
  `twilio_sid` + Twilio's initial status. If Twilio throws, store `send_status="failed"`,
  `error_code`, `error_message` and still return the row — the UI shows the failure inline.
- Auth: the caller must have access to the patient's tenant; log `created_by` from the JWT.

### SMS-2 — Twilio webhooks: inbound messages + status callbacks (BLOCKING for replies)
Nothing receives patient replies or delivery receipts. Two **public, unauthenticated** routes are
required (Twilio signs them — validate `X-Twilio-Signature` with the Auth Token):

```
POST /api/v1/sms/webhooks/inbound   (application/x-www-form-urlencoded from Twilio)
  MessageSid, AccountSid, From, To, Body, NumMedia, MessagingServiceSid, …
POST /api/v1/sms/webhooks/status
  MessageSid, MessageStatus (queued|sent|delivered|undelivered|failed|…), ErrorCode, ErrorMessage
```

Inbound handling:
1. Match `To` → tenant/office via phone assignments (SMS-7); match `From` → patient by
   `cell_phone`/`phone`/`work_phone` (E.164-normalized). If several patients share the number
   (families), attach to the patient who most recently received a text from this office; if none,
   create an **unmatched** row with `patient_id = null` (see SMS-6 for the practice-wide inbox).
2. If the most recent outbound row to this number within the last 72 h has no reply, store the reply
   on that row (`reply_text/reply_phone/reply_received_on`, `is_read=false`) — this keeps legacy
   parity and lets the UI show "reply to reminder X". Otherwise insert a stand-alone inbound row
   (`sent_text=null`, `reply_text=Body`, `send_status="received"`, `message_type="inbound_reply"`).
3. **Reply protocol (YES / NO / STOP)** — every appointment text the frontend sends ends with
   *"Reply YES to confirm, NO to decline, or STOP to opt out of texts."* (`REPLY_INSTRUCTIONS` in
   `src/features/sms/smsTemplates.ts`; the composer appends it automatically to reminder /
   confirmation texts). Classify on the **first word** of the reply, case-insensitive
   (`REPLY_KEYWORDS` in `smsModel.ts` — keep both sides identical):

   | Intent | Keywords | Action the webhook must take |
   |---|---|---|
   | `confirm` | `YES`, `Y`, `C`, `CONFIRM`, `OK` | `PATCH /appointments/{id}/status { status: "confirmed" }` (sets `confirmed_on`) on the appointment linked to the outbound row; if the row has no `appointment_id`, use the patient's next upcoming appointment at that office |
   | `decline` | `NO`, `N`, `D`, `DECLINE`, `RESCHEDULE`, `R` | `PATCH /appointments/{id}/status { status: "cancelled", cancellation_reason: "Patient declined via SMS", add_to_call_list: true }` — **or**, if the practice prefers a human in the loop, only set `add_to_call_list=true` and leave the slot; make this a tenant setting (`sms_decline_action = cancel \| call_list`) |
   | `opt_out` | `STOP`, `STOPALL`, `UNSUBSCRIBE`, `CANCEL`, `END`, `QUIT` | Twilio already blocks the number at the carrier level. Also `PATCH /patients/{id} { no_auto_sms: true }`, set `sms_opt_out_at`, and never auto-text again until `START`/`UNSTOP` arrives (then `no_auto_sms=false`, `sms_opt_in_at`) |
   | `help` | `HELP`, `INFO` | Twilio auto-replies with the Messaging Service HELP text; just log |
   | `other` | anything else | Log with `is_read=false` so it lands in the staff "Unread replies" filter; no automatic action |

   ⚠️ **`CANCEL` is a Twilio opt-out keyword**, not a decline. Never instruct patients to text CANCEL to
   cancel an appointment — that silently blocks all future texts. Templates say **NO**.

   Persist the outcome on the row (SMS-3): `reply_intent`, `action_taken` (`appointment_confirmed`,
   `appointment_cancelled`, `added_to_call_list`, `opted_out`, `none`), `action_taken_at`,
   `action_error`. The frontend shows these in the reply's details pane and will hide its manual
   action buttons once `action_taken` is set. Until the webhook exists staff apply the same three
   actions manually from the UI (`src/features/sms/hooks/useReplyActions.ts`) using exactly the
   PATCH calls above, so the resulting data is identical.

Status handling: update the row by `twilio_sid`; map `delivered` → `delivered_on = now()`. Store
`error_code`/`error_message` on `undelivered|failed`. Idempotent (Twilio retries).

### SMS-3 — `sms_messages` schema additions (BLOCKING for SMS-1/2)
Add nullable columns, expose them on `SmsMessageRead`:

| column | type | purpose |
|---|---|---|
| `twilio_sid` | varchar(34), unique | correlate webhooks (`SM…`) |
| `from_phone` | varchar(20) | which office number sent/received |
| `direction` | enum `outbound\|inbound` | make stand-alone inbound rows unambiguous |
| `sent_at` | timestamptz | real send time (`created_at` is the migration date on legacy rows) |
| `error_code` / `error_message` | int / text | Twilio error surfaced in the UI |
| `segments` | smallint | billing/segment count from Twilio |
| `client_id` | varchar(40), unique per tenant | idempotent sends |
| `template_id` | int FK → `sms_templates` (SMS-5) | which template produced it |
| `reply_intent` | enum `confirm\|decline\|opt_out\|help\|other` | classified reply (SMS-2 §3) |
| `action_taken` / `action_taken_at` / `action_error` | enum / timestamptz / text | what the webhook did with the reply, for the audit trail and the UI |

Also backfill `message_type` on legacy rows (the frontend currently infers it from the text).

### SMS-4 — Real-time push for new replies (non-blocking)
The UI polls `GET /sms-messages` every 15 s while the tab is visible. A WebSocket/SSE event
(`sms.inbound`, `sms.status`) keyed by tenant would remove the polling — the messaging module's
gateway (`/api/v1/messaging/ws`) is the natural home. Optional for v1.

### SMS-5 — `sms_templates` resource (non-blocking)
Practice-authored templates are stored in `localStorage` (`dentc:sms:templates`) today, so they
don't sync between users/devices. Need
`GET/POST/PATCH/DELETE /api/v1/sms-templates` with `{ id, tenant_id, office_id|null, name,
message_type, body, is_active, updated_by }`. Merge-field syntax is `{{patient_first_name}}`,
`{{patient_name}}`, `{{appointment_date}}`, `{{appointment_time}}`, `{{appointment_datetime}}`,
`{{provider_name}}`, `{{office_name}}`, `{{office_phone}}` — rendering can stay client-side.

### SMS-6 — Practice-wide inbox + unmatched inbound (non-blocking)
`GET /sms-messages` is filterable by `patient_id` only. For an office-level "Unread replies" queue
(and replies from unknown numbers) add filters `office_id`, `direction`, `is_read`, `date_from/date_to`,
and return `patient_first_name/last_name` denormalized to avoid N+1 lookups. Frontend gap: no screen
yet — it will reuse `SmsLogTable`.

### SMS-7 — Office → sending number mapping (BLOCKING for multi-office)
`/tenants/{id}/phone-assignments` stores `assignment_type` + `phone_number` per office (set from
Account Info → Communications). The send gateway must resolve **From** from this table
(`OFFICE_SPECIFIC` first, then `MULTI_OFFICE_SHARED`, then tenant default). Also store the Twilio
`messaging_service_sid` per tenant (or per office) — either on `account_communications` or a new
`tenant_twilio_settings` table. **Never expose the Auth Token to the frontend.**

### SMS-8 — Consent / compliance enforcement (recommended before GA)
- Reject automated `message_type`s when `patients.no_auto_sms = true`; allow `manual` only with an
  explicit `override_consent: true` flag (the UI already asks the user to confirm).
- Record `sms_opt_out_at` / `sms_opt_in_at` on `patients` from STOP/START keywords (new columns; the UI
  currently toggles `no_auto_sms` only).
- Quiet hours: refuse/queue reminders outside 8 am–9 pm patient-local time (TCPA).
- Rate-limit per tenant to Twilio's throughput (1 MPS per long code, more via Messaging Service).

### SMS-9 — Scheduled / automated reminders (non-blocking, phase 2)
The UI sends reminders on demand. An automated job (e.g. 48 h and 2 h before `appointments.date`)
needs: tenant/office reminder settings (lead times, template, on/off), a scheduler (cron/Celery beat),
and de-duplication (`appointment_id + message_type + lead_time` unique). Reuse SMS-1 internally.

### SMS-10 — Audit + retention (recommended before GA)
Message bodies are PHI-adjacent. Log who sent what (`created_by`), keep webhook payload hashes for
disputes, and define retention (Twilio also retains message logs — decide whether to delete there).

### EMAIL-1 — Email log/send resource (non-blocking)
The *SMS/Email* screen's **Email** tab is a labelled placeholder. There is no `email_messages`
table or `POST /api/v1/email/send`. Suggested shape mirrors SMS: `{ id, tenant_id, office_id,
patient_id, appointment_id, to_email, subject, body_html, provider_message_id, send_status,
sent_at, delivered_at, opened_at, error_message, message_type, created_by }` via SendGrid (Twilio's
email product, same account) or SES, with the same webhook pattern for status.

---

## 3. Frontend behaviour the backend can rely on

- Every send includes a unique `client_id`; retries reuse it.
- Phones are sent as E.164 (`+1…`). Legacy rows may still hold bare 10-digit numbers — normalize
  on read when matching inbound `From`.
- The frontend probes `GET /api/v1/sms/send` once per session: `404` → "log only" mode,
  `405` (route exists, wrong method) → live mode. Keep the route POST-only.
- `is_read` is only meaningful for rows with `reply_text`.
- Message-type and status vocabularies are listed in §1; unknown values render as "Sent (legacy)" /
  "Other" rather than breaking the screen.

## 4. Env / config

| Where | Key | Value |
|---|---|---|
| Frontend `.env` | `VITE_SMS_BACKEND` | unset → real backend; `local` → offline simulation for demos |
| Backend | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` (or `TWILIO_API_KEY_SID` + `TWILIO_API_KEY_SECRET`), `TWILIO_MESSAGING_SERVICE_SID`, `TWILIO_STATUS_CALLBACK_URL`, `TWILIO_WEBHOOK_VALIDATE=true` | see checklist |
