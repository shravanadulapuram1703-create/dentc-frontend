# DentC Imaging Agent

A small local service that connects the DentC web app to dental imaging software
(Vatech EzDent-i) and its capture devices. It is the loopback bridge a browser
needs because web pages cannot talk to a USB X-ray sensor directly.

It replaces the earlier standalone prototype (Node service + spawned Python
watcher + in-memory/S3 storage) with **one Python process** that:

- detects whether the imaging software is running,
- deep-links the imaging software to a specific patient (so captures file to the
  right chart),
- watches the imaging software's export folder for a freshly captured image,
- streams that image back to the browser — which stores it through the DentC
  backend (the source of truth). **The agent never persists images itself.**

## Architecture

```
DentC Web App (HTTPS)  ──fetch──►  Imaging Agent (127.0.0.1:8765)  ──►  EzDent-i + sensor
        │                                                                     │
        └──────────── stores captured bytes via DentC backend ◄──────────────┘
                           (POST /patient-documents)
```

The web side talks to the agent **only** through
`src/features/imaging/services/imagingDevice.ts`, which auto-detects the agent at
runtime (default `http://127.0.0.1:8765`).

## HTTP contract (v1, snake_case)

| Method | Path | Purpose |
|---|---|---|
| GET  | `/status` | `{ status, version, vendor, software_running, twain_available, export_folder_detected }` |
| POST | `/launch` | body `{ patient_id, first_name?, last_name?, dob? }` → open EzDent-i on that chart |
| POST | `/scan/start` | body `{ patient_id, scan_type }` → `{ scan_id, status }` |
| GET  | `/scan/{scan_id}/status` | `{ scan_id, status, image_path?, content_type?, error? }` |
| GET  | `/scan/{scan_id}/image` | the captured bytes (served once, then deleted) |

## Websocket contract (v1.1, `/ws`)

Push variant of the status/scan-poll routes, added so the browser finds out
about a completed capture the instant the agent's internal detector (folder
watcher or Vatech REST poll) sees it, instead of waiting for its next 2s poll.
Image bytes are still fetched with the plain `GET /scan/{id}/image` route
above — the socket only replaces *finding out when they're ready*.

`imagingDevice.ts` tries this first and transparently falls back to the HTTP
polling routes if the socket doesn't come up (older agent build, or a proxy/AV
product that blocks it) — every clinic PC works either way regardless of which
agent version is installed there.

JSON text frames, one connection can drive multiple sequential scans:

```
→ {"type": "auth", "token": "..."}             (always sent first; token may be "")
← {"type": "auth_result", "ok": true}
← {"type": "status", "software_running": bool}  (on connect, then whenever it changes)
→ {"type": "start_scan", "patient_id": ..., "scan_type": "..."}
← {"type": "scan_started", "scan_id": "..."}
← {"type": "scan_completed", "scan_id": "...", "image_path": "...", "content_type": "..."}
← {"type": "scan_failed", "scan_id": "...", "error": "..."}
```

Same trust boundary as the HTTP routes: `Origin` is checked against the same
allow-list/regex as `CORSMiddleware` uses (which doesn't run on a websocket
upgrade, so this is done by hand — see `Config.is_origin_allowed`), and the
shared token (when configured) gates everything past the initial `auth`
message, same as `X-DentC-Agent-Token` does today.

## Run (development)

```bash
cd imaging-agent
python -m venv .venv && .venv\Scripts\activate     # Windows
pip install -r requirements.txt
python -m agent
```

Then open the DentC app's Patient → Imaging → **Scan & Capture** tab; it should
report the agent as connected.

## Configuration (environment variables, or a `.env` file)

Every variable below can be set as a real OS environment variable, **or** in a
`.env` file (copy `.env.example` to `.env`, same folder as this README) —
whichever is set for real always wins if both are present. The `.env` file is
mainly worth it for `DENTC_AGENT_VATECH_REST_USERNAME`/`_PASSWORD`: typing a
password containing shell-special characters (`@`, `&`, `%`, `^`, ...) into
`cmd`'s `set` or PowerShell's `$env:` is exactly the kind of thing that gets
silently mangled by the shell's own parsing before it ever reaches the agent —
a `.env` file has no such problem, and only needs setting once instead of on
every launch. `.env` is gitignored; only `.env.example` is committed.

| Variable | Default | Notes |
|---|---|---|
| `DENTC_AGENT_PORT` | `8765` | Loopback port. |
| `DENTC_AGENT_ORIGINS` | `localhost:5173, 127.0.0.1:5173, localhost:3000` | CORS allow-list (comma-separated). |
| `DENTC_AGENT_TOKEN` | _(unset)_ | When set, requests must send `X-DentC-Agent-Token`. |
| `DENTC_AGENT_EXPORT_FOLDER` | auto-discovered | EzDent-i export folder (ends in `Sub<id>`). |
| `DENTC_AGENT_BRIDGE_EXE` | auto-discovered | Full path to `VTEzBridge32.exe`. |
| `DENTC_AGENT_TEMP_DIR` | system temp `/dentc-imaging` | Short-lived capture staging. |
| `DENTC_AGENT_VATECH_REST_URL` | `http://127.0.0.1:43112/api/v1` | EzWebServer REST API base URL. |
| `DENTC_AGENT_VATECH_REST_USERNAME` | _(unset)_ | A real EzDent-i user account — set inside EzDent-i itself at **Settings → Environment → General → USER ACCOUNT MANAGER**, *not* the software's activation/license code (a different, unrelated credential). Setting both this and `_PASSWORD` switches scan detection from watching the local export folder to polling EzWebServer's REST API instead (see `agent/scan.py`) — this also enables new-patient prepopulation on `/launch`. Without them, folder-watch is used and `/launch` only focuses existing charts. |
| `DENTC_AGENT_VATECH_REST_PASSWORD` | _(unset)_ | See above. |

Auto-discovery globs the standard Vatech install paths; override only if your
install is non-standard.

### Patient prepopulation (creating a new chart)

`/launch` focuses an existing patient via VTEzBridge's `/main:chart_no=`
regardless of config. To also *create* the chart when it doesn't exist yet
(prepopulating name/DOB), set `DENTC_AGENT_VATECH_REST_USERNAME`/`_PASSWORD`
to a real EzDent-i login — this goes through EzWebServer's REST API
(`agent/vatech_rest.py`), the only mechanism that actually works for this
(VTEzBridge's own CLI/XML cannot create charts — see
`VATECH_INTEGRATION_FINDINGS.md`). If prepopulation fails for any reason
(bad credentials, network, EzWebServer down), the chart_no focus still
happens — it never blocks the core launch.

`dob` is normalized from the frontend's `MM/DD/YYYY` display format to ISO
before being sent (`vatech.py::_normalize_dob`). **Gender is not
prepopulated** — the `/launch` request has no `gender` field today (the
frontend never sends it), so every created chart gets Vatech's default
`"O"`. Wiring real gender through needs a frontend change
(`DeviceLaunchInput` / `ScanCaptureTab.tsx` / `server.py`'s `LaunchRequest`)
that hasn't been made yet — `agent/vatech_rest.py::create_patient()`
already accepts a `gender` argument, ready for when that's threaded through.

## Packaging (one-click install, no Python required on clinic PCs)

Build a single signed executable with PyInstaller so end users never install
Python:

```bash
pip install pyinstaller
pyinstaller --onefile --name dentc-imaging-agent --collect-all watchdog ^
  --hidden-import uvicorn.logging --hidden-import uvicorn.protocols ^
  -c run_agent.py
```

See [BUILD.md](BUILD.md) for the installer, auto-start, and code-signing steps.

## Security

- Binds to `127.0.0.1` only — never reachable from the network.
- CORS restricted to the configured DentC origins.
- Optional shared token (`X-DentC-Agent-Token`).
- Captured files are PHI: staged in a temp dir, served once, then deleted; the
  agent stores no cloud credentials and no permanent copies.
