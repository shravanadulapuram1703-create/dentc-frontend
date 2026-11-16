# Security → Users: create / login / password-reset — backend dev report (USR-AUTH-1…7)

**Date:** 2026-10-30 · **Reported from:** UAT (reckondental.com, org "Test Dental Group", tenant 1)
**Frontend:** `src/components/modals/AddEditUserModal.tsx`, `src/components/pages/setup/UserSetup.tsx`,
`src/services/userApi.ts` (`describeUserConflict`)
**Backend files:** `app/services/auth_service.py`, `app/services/auth_extras_service.py`,
`app/services/user_admin_service.py`, `app/db/models/identity.py`, `app/schemas/user_admin.py`

## What the user saw

1. A newly created user (`Satyareckon`, id 2) **could not sign in** and the password **could not be
   reset**.
2. Creating a second user (`satyareckon2`, same email) failed with the alert
   *"User violates a uniqueness/reference constraint"*.

## Root causes (verified against the `Test_Dental_Group` DB)

| # | Finding | Evidence |
|---|---------|----------|
| A | **Login matches the username case-sensitively.** `authenticate()` does `User.username == username` (and `User.email == username`). The account was saved as `Satyareckon` (capital S); signing in as `satyareckon` returns `401 invalid_credentials`. | Row id 2: `username='Satyareckon'`, `is_active=true`, `last_login_at=NULL`, no login restrictions, no IP rules. Reproduced with test user: `qa.testuser` → 200, `QA.Testuser` → 401. |
| B | **Email is globally unique** (`users_email_key`), so the second user with `satya@exceldentalpc.com` hit an `IntegrityError` → 409 with a generic message. | `pg_constraint`: `users_email_key`, `users_username_key`, `uq_users_tenant_short_id`. |
| C | **There was no admin-side password reset in the UI.** The Edit User screen only showed the password on create. Forgot-password needs SMTP delivery and an exact email match. | Frontend gap, now fixed (see below). |

## Frontend changes shipped (this pass)

- **Edit User → Password → Reset Password.** Admin enters New/Confirm password (shared
  `passwordPolicy` rules) and chooses *"Require the user to change this password at next login"*
  (default on). This uses the existing `PUT /users/{id}/complete` (`password`, `must_change_password`).
  The login page already sends `must_change_password` users to Change My Password.
- **Add User:** the misleading "Default: same as username" placeholder is removed. A new checkbox,
  *Require password change at first login*, maps to `must_change_password`. Username, email and
  Short ID are trimmed; email is lowercased.
- **409 messages are field-specific.** `describeUserConflict()` reads `error.details` (the raw
  Postgres error) and maps `users_email_key` / `users_username_key` / `short_id` /
  `report_access_provider` to a clear sentence.
- **422 messages show the failing field.** The UI now shows each item in `error.details`, not just
  "Request validation failed".
- A hint under Username says sign-in is case-sensitive. Remove it once USR-AUTH-1 ships.

## Backend gaps

### USR-AUTH-1 (P0) — case-insensitive username/email login
`auth_service.authenticate`, `verify_user_credentials`, `auth_extras_service._find_user` /
`forgot_password` compare exactly. Legacy Denticon usernames are case-insensitive. Users type
their username in whatever case they remember.

**Ask:** match on `func.lower(User.username) == ident.lower()` (same for email), and add functional
unique indexes `lower(username)` / `lower(email)` so `Foo` and `foo` cannot both exist. Check for
case-only duplicates before the migration:
```sql
select lower(username), count(*) from users group by 1 having count(*) > 1;
select lower(email),    count(*) from users group by 1 having count(*) > 1;
```
Also normalise on write (`strip()`; lowercase email) in `create_complete` / `update_complete`.

### USR-AUTH-2 (P1) — 409 should name the conflicting field
`user_admin_service._commit/_flush` raise `ConflictError("User violates a uniqueness/reference
constraint", details=<raw psycopg text>)`. The frontend now parses the constraint name, but that is
brittle and leaks SQL text.

**Ask:** pre-check before insert/update and raise a structured error, e.g.
`409 {code: "username_taken" | "email_taken" | "short_id_taken", details: {field: "email"}}`.
Return 422 `{field: "report_access_provider_id"}` for the FK case.

### USR-AUTH-3 (P1) — is the email uniqueness scope right?
`users.email` is unique **across all tenants**. Real practices often share one mailbox between
staff, or a person works in two orgs. **Decide:** keep it global (then the 409 above is the
answer), or move to `(tenant_id, lower(email))` plus a nullable email. If email stays the login
identifier, it must stay unique within the scope login searches. Login currently searches all
tenants.

### USR-AUTH-4 (P1) — dedicated admin reset endpoint + audit
Admin reset currently rides on `PUT /users/{id}/complete` (`password` + `must_change_password`).
It works (verified), but:
- it is not written to the audit trail as a password event;
- it does not revoke the user's existing refresh tokens / sessions;
- it does not set `password_created_at`;
- it does not clear the Redis lockout counter (`login:fail:<username>`). A user locked out by
  failed tries stays locked after the admin resets the password (until the TTL expires).

**Ask:** `POST /users/{id}/reset-password {new_password, must_change_password}` (admin right
required). It should do all four of the above. Optional: `{send_email: true}` to email a reset link
instead of setting a password.

### USR-AUTH-5 (P2) — server-side password policy
The backend only enforces `min_length=8`. The frontend applies the 5-rule policy
(`passwordPolicy.ts`: length, lower, upper, number, symbol) for admin resets / change / reset
flows, but create still allows any 8-char string.
**Ask:** one server-side policy on `UserCompleteCreate.password`, `UserCompleteUpdate.password`,
`ChangePasswordRequest.new_password`, `ResetPasswordRequest.new_password`.

### USR-AUTH-6 (P2) — forgot-password delivery is silent
`forgot_password` always returns the generic message (correct, no enumeration). But SMTP failures
in the background task are invisible to support, and the email match is exact (see
USR-AUTH-1). **Ask:** log/alert on send failure. Also expose an admin "send reset link" action
(see USR-AUTH-4).

### USR-AUTH-7 (P2) — `create_complete` trusts its caller
The schema (`EmailStr`) rejects special-use domains like `*.test`, but `create_complete()` does not
re-validate. A service-level insert can store an email that later makes every
`PUT /users/{id}/complete` fail with 422 on `email`. **Ask:** validate/normalise identity fields
inside the service, not only in the request schema.

## Data follow-up for UAT
- `Satyareckon` (id 2) is healthy: active, no restrictions. Sign in with the **exact** username
  `Satyareckon`. Or, as an admin, use *Edit User → Reset Password* to set a temporary password.
- Test account created for QA: `qa.testuser` (id 8, role admin, offices 2+3, email
  `qa.testuser@reckondental.com`). Deactivate or delete it when UAT is done.
