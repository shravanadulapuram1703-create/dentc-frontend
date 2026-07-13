# Incident Report — "CORS error" on production (`reckondental.com`)

**Date:** 2026-07-12
**Reported symptom:** Browser console on `https://reckondental.com` shows, for backend calls
(e.g. `GET /api/v1/appointments/scheduler`):

```
Access to fetch at 'https://dentc-backend-477406612596.us-central1.run.app/api/v1/appointments/scheduler...'
from origin 'https://reckondental.com' has been blocked by CORS policy:
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```
plus a WebSocket CSP violation and `sw.js ... no-response` network errors.

**UPDATE (live reproduction, logged in as an admin on production):** ruling the backend out was
premature. A logged-in test on `reckondental.com` isolated a **primary, backend-side defect** that
requires a fix — see **§0** below, which now supersedes the "no backend change required" framing.
The service-worker and CSP items (§2, §3) are real but secondary and already fixed on the frontend.

---

## 0. PRIMARY defect — `/appointments` router returns a 500-class error with NO CORS header (backend)

Reproduced in a **clean browser** (verified 0 service workers / 0 caches, so this is independent of
the stale-worker issue in §2). Logged in as admin and measured each request from the live page:

| Request (authenticated) | Result |
|---|---|
| `GET /api/v1/offices` | **200** ✅ (`type: cors`) |
| `GET /api/v1/users/me` | **422** ✅ (`type: cors` — CORS present even on error) |
| `GET /api/v1/appointments` | **`Failed to fetch`** in ~330 ms ❌ |
| `GET /api/v1/appointments/scheduler` | **`Failed to fetch`** in ~322 ms ❌ |
| `GET /api/v1/appointments[/scheduler]` **unauthenticated** | **401** ✅ (CORS header present) |

**Interpretation:**
- The routes exist and CORS works at the 401 level (unauthenticated returns 401 **with** the header).
- The failure appears **only after auth succeeds**, fails **fast (~330 ms → not a timeout)**, and hits
  the **whole `/appointments` router**, while sibling routers (`/offices`, `/users`) succeed.
- That is the signature of an **unhandled 500 in the appointments router**. In FastAPI/Starlette the
  `ServerErrorMiddleware` sits **outside** `CORSMiddleware`, so a 500 is returned **without**
  `Access-Control-Allow-Origin`. The browser then reports "No 'Access-Control-Allow-Origin' header is
  present" — a **server error masquerading as a CORS error**.

**Backend actions:**
1. Check `dentc-backend` Cloud Run logs for a 500 / traceback on `GET /api/v1/appointments/scheduler`
   (and `/appointments`) for an **authenticated** request. Likely a missing `office_id`/context or a
   query bug (the test account had **no office selected** — a required-context path may be throwing
   instead of returning 422/400).
2. Ensure errors still carry CORS headers — register an exception handler or make `CORSMiddleware`
   the outermost middleware — so genuine 500s surface as 500s in the browser, not phantom CORS errors.

> Consequence for the frontend: even after the frontend fixes (§2, §3) deploy, **the Scheduler will
> remain empty until this 500 is fixed.** This is the top-priority item.

## 0b. Trailing-slash redirect downgrades to insecure `http://` (backend/proxy)

`GET /api/v1/appointments/scheduler/` (trailing slash) returns:
```
HTTP/1.1 307 Temporary Redirect
location: http://dentc-backend-477406612596.us-central1.run.app/api/v1/appointments/scheduler?...
```
The `Location` is **`http://`**, not `https://` — a scheme downgrade because TLS is terminated at
Cloud Run's edge and forwarded to the app as `http`. Preflighted (auth-bearing) requests cannot
follow cross-origin redirects, so any caller hitting the slash variant fails. The frontend currently
calls the **no-slash** canonical path so it dodges this today, but it is a latent bug.

**Backend action:** honor the forwarded proto so generated URLs/redirects use `https` — e.g. run
uvicorn with `--forwarded-allow-ips='*'` (+ `--proxy-headers`) or add Starlette's
`ProxyHeadersMiddleware` / set `root_path`.

---

## 1. Backend CORS — verified OK (no action needed)

We tested the live backend directly against the exact failing URL and origin. It returns the correct
CORS headers on **both** the preflight and the actual request:

**Preflight (`OPTIONS`):**
```
HTTP/1.1 200 OK
access-control-allow-origin: https://reckondental.com
access-control-allow-credentials: true
access-control-allow-methods: DELETE, GET, HEAD, OPTIONS, PATCH, POST, PUT
access-control-allow-headers: authorization
vary: Origin
```

**Actual request (`GET`, no token):**
```
HTTP/1.1 401 Unauthorized
access-control-allow-origin: https://reckondental.com
access-control-allow-credentials: true
```
(The 401 is expected — we sent no bearer token. The CORS header is present, which is the point.)

Repeated 8× with no variance — no stale-revision intermittency.

## 2. Root cause — frontend "zombie" service worker (fixed on frontend)

An earlier PWA build of the SPA registered a Workbox service worker (`/sw.js`). The current build
ships no service worker, but the old one **remained installed in returning users' browsers**. It
intercepted every fetch — including the cross-origin backend API calls — and failed them
(`no-response`), which the browser surfaced as a CORS error even though the backend response was
fine. Because `/sw.js` now returned the SPA's `index.html` (not JS), the browser's service-worker
update check failed and the worker could never self-update or be removed.

**Frontend fix (shipped):** a self-destroying `/sw.js` served `no-cache`, so the browser's update
check evicts the old worker (clears caches, unregisters, reloads). Once every client has updated the
ghost is gone.

## 3. WebSocket — frontend CSP fix (please confirm endpoint behavior)

The console also showed:
```
Connecting to 'wss://dentc-backend-.../api/v1/ai-chat/ws?token=...'
violates the Content Security Policy directive: "connect-src 'self' https:"
```
This was a **frontend** CSP that omitted the `wss:` scheme; we added it (`connect-src 'self' https: wss:`).

**Ask for the backend team:** please confirm the AI-chat WebSocket endpoint
`wss://.../api/v1/ai-chat/ws` is reachable on the public Cloud Run URL and that token-in-query-string
auth (`?token=<jwt>`) is the intended/ supported scheme. Note: passing the JWT in the URL query
string means it can appear in access logs and proxy logs — consider a subprotocol header or a
short-lived ticket token instead if that's a concern.

## 4. Security note — CORS currently reflects *any* origin

While verifying, we observed the backend echoes back **whatever `Origin` is sent**, including
clearly invalid ones:

| Origin sent | `access-control-allow-origin` returned |
|---|---|
| `https://reckondental.com` | `https://reckondental.com` |
| `https://www.reckondental.com` | `https://www.reckondental.com` |
| `http://reckondental.com` (insecure) | `http://reckondental.com` |
| `https://reckondental.com/` (malformed, trailing slash) | `https://reckondental.com/` |

Combined with `access-control-allow-credentials: true`, reflecting arbitrary origins is effectively
"allow all origins with credentials," which is broader than intended and a CSRF/data-exposure risk.
**Recommendation:** set `CORS_ORIGINS` to an explicit allow-list and only echo an origin if it's a
member, e.g.:

```
CORS_ORIGINS=https://reckondental.com,https://www.reckondental.com
```
(add the `dentc-frontend` Cloud Run URL too if it's used directly). Then pin traffic to the latest
revision: `gcloud run services update-traffic dentc-backend --region us-central1 --to-latest`.

---

## Summary of asks for the backend team (priority order)
1. **P0 — fix the 500 on the `/appointments` router (§0).** This is the actual blocker for the
   Scheduler. Authenticated requests to `/api/v1/appointments` and `/api/v1/appointments/scheduler`
   fail fast with no CORS header (a 500 behind the CORS middleware). Check Cloud Run logs; also make
   error responses carry CORS headers.
2. **P1 — fix the `http://` scheme downgrade on trailing-slash 307 redirects (§0b)** via forwarded
   proto / proxy headers.
3. **P2 — tighten `CORS_ORIGINS`** from "reflect any origin" to an explicit allow-list (§4).
4. **P2 — WebSocket:** confirm `wss://.../api/v1/ai-chat/ws` is publicly reachable and confirm/advise
   on the `?token=` auth scheme (§3).

Frontend-side items (stale service worker §2, CSP `wss:` §3) are already fixed in the frontend repo
and pending deploy.

---

## Resolution (backend team response, 2026-07-12)

The backend team confirmed the diagnosis. Root cause and status:

- **P0 root cause = unapplied DB migrations (confirmed).** Production `recondental_migrated` was stamped
  below the Alembic head (`b0c1d2e3f4a5`) and missing the columns from revision `a9b0c1d2e3f4`
  (`appointments.posted_on, cancellation_note, cancellation_reason, add_to_call_list, created_by,
  updated_by`; `appointment_procedures.est_patient`). The scheduler feed's `select(Appointment, …)`
  loads every column, so one missing column raised `UndefinedColumn` on **every** call — matching the
  unconditional ~300 ms failure. Sibling routers worked because their migrations were applied.
  - **P0a (code, done):** added a catch-all exception handler wired *inside* `CORSMiddleware`, so 500s
    now return through CORS with `Access-Control-*` headers (honest 500, not phantom CORS).
  - **P0b (deploy, ACTION REQUIRED):** run `alembic upgrade head` against `recondental_migrated`
    out-of-band (Cloud SQL proxy or a Cloud Run Job — not on app startup), then roll the service. All
    pending revisions are additive/nullable, so safe.
- **P1 (code, done):** uvicorn/gunicorn now trust `X-Forwarded-Proto` via `--forwarded-allow-ips="*"`,
  so trailing-slash redirects emit `https://`. Takes effect on next image build + deploy.
- **P2 (code + deploy, done/landing):** `CORS_ORIGINS` tightened to an explicit allow-list (strips `*`,
  defaults to the `reckondental.com` origins).
- **AI-chat WebSocket:** intentionally deferred by the backend team for now. The frontend CSP fix
  (§3, `connect-src … wss:`) already unblocks it whenever they re-enable it.

**Still gating production:** P0b (apply migrations) + the backend rebuild/redeploy for P0a/P1 and the
`CORS_ORIGINS` env update. **Separately, the frontend image must be rebuilt/deployed** for the
service-worker kill-switch (§2) and CSP `wss:` (§3) to reach returning users — these are client-side
and unaffected by any backend change.

**Verification once both sides deploy:** log in on `reckondental.com/dashboard`; confirm
`GET /api/v1/appointments/scheduler` → 200 (no `http://` redirect), a forced error carries
`access-control-allow-origin`, and Today's Appointments / Today's Schedule populate.
