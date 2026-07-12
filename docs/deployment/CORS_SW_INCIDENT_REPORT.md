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

**Bottom line for the backend team: no backend change is required.** The backend CORS is
correctly configured. The real cause was a **stale service worker on the client**, fixed on the
frontend. This report documents what we verified so the backend side can be confidently ruled out,
plus two small items worth a look.

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

## Summary of asks for the backend team
1. **CORS:** nothing broken — but tighten `CORS_ORIGINS` from "reflect any origin" to an explicit
   allow-list (§4).
2. **WebSocket:** confirm `wss://.../api/v1/ai-chat/ws` is publicly reachable and confirm/advise on
   the `?token=` auth scheme (§3).
3. No other backend action required — the outage cause was a client-side service worker, fixed on
   the frontend.
