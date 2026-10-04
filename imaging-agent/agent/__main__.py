"""Run the DentC Imaging Agent (loopback HTTP service).

    python -m agent

Binds to 127.0.0.1 only. Configure via env vars (see config.py): DENTC_AGENT_PORT,
DENTC_AGENT_ORIGINS, DENTC_AGENT_TOKEN, DENTC_AGENT_EXPORT_FOLDER, …
"""

from __future__ import annotations

import subprocess
import sys
import time

import requests
import uvicorn

from . import __version__
from .config import config
from .server import app

_IS_WINDOWS = sys.platform.startswith("win")


def _pid_listening_on(port: int) -> int | None:
    """PID currently LISTENING on 127.0.0.1:<port>, or None (Windows only)."""
    if not _IS_WINDOWS:
        return None
    try:
        out = subprocess.run(
            ["netstat", "-ano", "-p", "TCP"],
            capture_output=True,
            text=True,
            timeout=5,
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
        )
    except Exception:
        return None
    for line in out.stdout.splitlines():
        parts = line.split()
        if len(parts) >= 5 and parts[0] == "TCP" and parts[-2] == "LISTENING" and parts[1].endswith(f":{port}"):
            try:
                return int(parts[-1])
            except ValueError:
                continue
    return None


def _take_over_port(port: int) -> None:
    """Make sure this process ends up the only thing bound to `port`.

    The agent auto-starts per-user (HKCU Run key) and the installer launches
    it immediately post-install; either can land while a previous session's
    agent is still running, so the port is already held by a stale/older
    instance — the exact thing that should never coexist with this one
    ("run only the new websocket agent"). Confirms the current holder
    actually answers our own `/status` contract before touching it — this
    must never kill an unrelated process that happens to be on the port —
    then stops it so only the instance being launched now ends up running.
    """
    pid = _pid_listening_on(port)
    if pid is None:
        return

    try:
        resp = requests.get(f"http://127.0.0.1:{port}/status", timeout=2)
        existing_version = resp.json()["version"]
    except Exception:
        print(
            f"  port {port} is already in use by PID {pid}, and it doesn't look "
            "like a DentC Imaging Agent - leaving it alone and exiting."
        )
        raise SystemExit(1)

    print(f"  found an existing agent v{existing_version} (PID {pid}) on port {port} - stopping it.")
    try:
        subprocess.run(
            ["taskkill", "/PID", str(pid), "/F"],
            capture_output=True,
            timeout=5,
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
        )
    except Exception as exc:
        print(f"  could not stop the existing agent (PID {pid}): {exc}")
        raise SystemExit(1)

    for _ in range(20):
        if _pid_listening_on(port) is None:
            return
        time.sleep(0.25)
    print(f"  port {port} is still held after stopping PID {pid}; giving up.")
    raise SystemExit(1)


def main() -> None:
    print(f"DentC Imaging Agent v{__version__}")
    _take_over_port(config.port)
    print(f"  listening on http://{config.host}:{config.port} (loopback only)")
    print(f"  vendor: {config.vendor}")
    print(f"  export folder: {config.export_folder or 'NOT DETECTED'}")
    print(f"  bridge exe: {config.bridge_exe or 'NOT DETECTED'}")
    print(f"  allowed origins: {', '.join(config.allowed_origins)}")
    uvicorn.run(app, host=config.host, port=config.port, log_level="info")


if __name__ == "__main__":
    main()
