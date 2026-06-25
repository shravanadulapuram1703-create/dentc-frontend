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

## Run (development)

```bash
cd imaging-agent
python -m venv .venv && .venv\Scripts\activate     # Windows
pip install -r requirements.txt
python -m agent
```

Then open the DentC app's Patient → Imaging → **Scan & Capture** tab; it should
report the agent as connected.

## Configuration (environment variables)

| Variable | Default | Notes |
|---|---|---|
| `DENTC_AGENT_PORT` | `8765` | Loopback port. |
| `DENTC_AGENT_ORIGINS` | `localhost:5173, 127.0.0.1:5173, localhost:3000` | CORS allow-list (comma-separated). |
| `DENTC_AGENT_TOKEN` | _(unset)_ | When set, requests must send `X-DentC-Agent-Token`. |
| `DENTC_AGENT_EXPORT_FOLDER` | auto-discovered | EzDent-i export folder (ends in `Sub<id>`). |
| `DENTC_AGENT_BRIDGE_EXE` | auto-discovered | Full path to `VTEzBridge32.exe`. |
| `DENTC_AGENT_TEMP_DIR` | system temp `/dentc-imaging` | Short-lived capture staging. |

Auto-discovery globs the standard Vatech install paths; override only if your
install is non-standard.

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
