# Building, installing, and updating the DentC Imaging Agent

Goal: a **one-click install** for clinical workstations that requires **no
pre-installed Python**, starts automatically, and runs quietly in the background.

## 1. Build a single executable (PyInstaller)

PyInstaller bundles the Python interpreter + dependencies into one `.exe`.

```bash
cd imaging-agent
python -m venv .venv && .venv\Scripts\activate
pip install -r requirements.txt pyinstaller
pyinstaller --onefile --name Imaging-agent ^
  --collect-all watchdog ^
  --hidden-import uvicorn.logging ^
  --hidden-import uvicorn.protocols ^
  --hidden-import uvicorn.protocols.http.auto ^
  --hidden-import uvicorn.protocols.websockets.auto ^
  --hidden-import uvicorn.lifespan.on ^
  run_agent.py
```

Output: `dist/Imaging-agent.exe`. Smoke-tested 2026-08-05: starts standalone
(no Python on PATH needed), correctly auto-discovers the Vatech export
folder and VTEzBridge path, responds on `/status`.

## 2. Auto-start (per-user, no admin) — DONE, via the installer

Per-user tray/background app (not a system service): it runs inside the
dentist's session (so it can launch EzDent-i and read user-profile paths) and
needs no elevation. `installer/Imaging-agent.iss` sets this at install time:

```
HKCU\Software\Microsoft\Windows\CurrentVersion\Run
  DentCImagingAgent = "<install dir>\Imaging-agent.exe"
```

(Optional later: add a system-tray icon with `pystray` + `Pillow` showing
connection state and a Quit item.)

## 3. Installer — DONE (Inno Setup)

`installer/Imaging-agent.iss` builds a real one-click installer:
- Installs to `%LocalAppData%\DentC` (**not** Program Files — that needs
  admin; `PrivilegesRequired=lowest` keeps the whole install admin-free).
- Copies `Imaging-agent.exe`, adds the HKCU Run-key entry from step 2.
- Launches the agent immediately post-install (scanning unlocks with no reboot).
- Registers an uninstaller that stops the running agent first.

Build it (after installing Inno Setup 6 — `https://jrsoftware.org/isdl.php`):

```bash
cd imaging-agent/installer
ISCC Imaging-agent.iss
```

Output: `installer/Output/Imaging-agent-Setup.exe`.

The web app's first-time **setup card** links to this installer via
`VITE_IMAGING_AGENT_DOWNLOAD_URL`, then polls `/status` until the agent answers.

## 4. Code signing — mechanics done, needs a REAL certificate

Both `Imaging-agent.exe` and `Imaging-agent-Setup.exe` are Authenticode-signed
(confirmed via `Get-AuthenticodeSignature` — valid signature, SHA256,
timestamped) **but with a self-signed dev certificate**
(`installer/dev-signing-cert.pfx`, password `devonly`, subject explicitly
labelled "DentC Dev (NOT FOR PRODUCTION)"). This proves the signing mechanics
work end-to-end, but a self-signed root is **not trusted by Windows** —
SmartScreen/AV will still warn on a real clinic PC. This step is not
actually complete until someone buys a real Authenticode certificate.

**To finish this for real:**
1. Buy a code-signing certificate from a CA (DigiCert, Sectigo, SSL.com, …).
   Needs real business verification — budget a few days, not minutes.
2. Re-run the same signing command with the real `.pfx`, no code changes needed:
   ```powershell
   $cert = Get-PfxCertificate -FilePath "path\to\real-cert.pfx"
   Set-AuthenticodeSignature -FilePath dist\Imaging-agent.exe -Certificate $cert `
     -HashAlgorithm SHA256 -TimestampServer "http://timestamp.digicert.com"
   Set-AuthenticodeSignature -FilePath installer\Output\Imaging-agent-Setup.exe `
     -Certificate $cert -HashAlgorithm SHA256 -TimestampServer "http://timestamp.digicert.com"
   ```
   (`signtool sign` works identically if you have the Windows SDK instead.)
3. Delete `dev-signing-cert.pfx` and the dev cert from the machine's cert
   store once the real one is in use — no reason to keep it around.

## 5. Updates

- `GET /status` returns `version`. The web app compares it against a required
  minimum and prompts the user to update when behind.
- Distribute new installers from the same download URL; an MSI upgrades in place.
- Keep the HTTP contract backward-compatible; bump `version` on every release.
