# Building, installing, and updating the DentC Imaging Agent

Goal: a **one-click install** for clinical workstations that requires **no
pre-installed Python**, starts automatically, and runs quietly in the background.

## 1. Build a single executable (PyInstaller)

PyInstaller bundles the Python interpreter + dependencies into one `.exe`.

```bash
cd imaging-agent
python -m venv .venv && .venv\Scripts\activate
pip install -r requirements.txt pyinstaller
pyinstaller --onefile --name dentc-imaging-agent ^
  --collect-all watchdog ^
  --hidden-import uvicorn.logging ^
  --hidden-import uvicorn.protocols ^
  --hidden-import uvicorn.protocols.http.auto ^
  --hidden-import uvicorn.protocols.websockets.auto ^
  --hidden-import uvicorn.lifespan.on ^
  run_agent.py
```

Output: `dist/dentc-imaging-agent.exe`.

## 2. Auto-start (per-user, no admin)

Prefer a **per-user tray/background app** over a system service: it runs inside
the dentist's session (so it can launch EzDent-i and read user-profile paths) and
needs no elevation. Register it at install time via the Run key:

```
HKCU\Software\Microsoft\Windows\CurrentVersion\Run
  DentCImagingAgent = "C:\Program Files\DentC\dentc-imaging-agent.exe"
```

(Optional later: add a system-tray icon with `pystray` + `Pillow` showing
connection state and a Quit item.)

## 3. Installer

Wrap the exe in an installer (Inno Setup or WiX/MSI) that:
1. copies `dentc-imaging-agent.exe` to `C:\Program Files\DentC\`,
2. adds the Run-key entry above,
3. launches the agent immediately,
4. (optional) writes a config file / sets env vars for non-standard installs.

The web app's first-time **setup card** links to this installer
(`VITE_IMAGING_AGENT_DOWNLOAD_URL`), then polls `/status` until the agent answers.

## 4. Code signing (required)

Sign both the `.exe` and the installer with an Authenticode certificate
(`signtool sign /fd SHA256 /tr <timestamp-url> /td SHA256 ...`). Unsigned
binaries are blocked by SmartScreen/AV and will break the "one-click" promise.

## 5. Updates

- `GET /status` returns `version`. The web app compares it against a required
  minimum and prompts the user to update when behind.
- Distribute new installers from the same download URL; an MSI upgrades in place.
- Keep the HTTP contract backward-compatible; bump `version` on every release.
