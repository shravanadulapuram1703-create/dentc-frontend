"""Agent configuration — environment-overridable, with sensible Vatech defaults.

Every machine-specific value (export folder, bridge exe, allowed origins) is a
config value, never hardcoded in logic. The Vatech export folder in particular
ends in an install-specific id (e.g. `Sub026052`), so we auto-discover it.

Values can also be set via a `.env` file (see `.env.example`) instead of real
shell environment variables — mainly for `DENTC_AGENT_VATECH_REST_USERNAME`/
`_PASSWORD`, since typing a password with shell-special characters (`@`, `&`,
`%`, ...) into `cmd`/PowerShell's `set`/`$env:` is exactly the kind of thing
that gets silently mangled by the shell's own parsing; a `.env` file has no
such issue and only needs setting once instead of every launch. A real OS
environment variable always wins if both are set (`load_dotenv`'s default:
never override what's already there).
"""

from __future__ import annotations

import glob
import os
import re
import sys
import tempfile
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv

# Packaged (PyInstaller onefile) vs. `python -m agent`: look for `.env` next
# to the exe when frozen, next to this project's root otherwise — CWD isn't
# reliable for either (the exe's CWD depends on how Windows launched it; a
# dev's CWD depends on where they happened to run the command from).
_env_dir = Path(sys.executable).parent if getattr(sys, "frozen", False) else Path(__file__).resolve().parent.parent
load_dotenv(_env_dir / ".env")


def _csv_env(name: str, default: list[str]) -> list[str]:
    raw = os.environ.get(name)
    if not raw:
        return default
    return [item.strip() for item in raw.split(",") if item.strip()]


def _discover_vatech_export_folder() -> str | None:
    """Find the EzDent-i export folder, whose final segment is install-specific.

    Layout: ``...\\VATECH\\Common\\FM\\FMData\\Files\\Sub<NNNNNN>``. We glob the
    `Sub*` children and pick the most recently modified one.
    """
    override = os.environ.get("DENTC_AGENT_EXPORT_FOLDER")
    if override:
        return override if os.path.isdir(override) else None

    roots = [
        r"C:\Program Files (x86)\VATECH\Common\FM\FMData\Files",
        r"C:\Program Files\VATECH\Common\FM\FMData\Files",
    ]
    candidates: list[str] = []
    for root in roots:
        candidates.extend(glob.glob(os.path.join(root, "Sub*")))
    candidates = [c for c in candidates if os.path.isdir(c)]
    if not candidates:
        return None
    return max(candidates, key=lambda p: os.path.getmtime(p))


def _default_bridge_exe() -> str | None:
    """Locate VTEzBridge32.exe (used to deep-link EzDent-i to a patient)."""
    override = os.environ.get("DENTC_AGENT_BRIDGE_EXE")
    if override:
        return override
    patterns = [
        r"C:\Program Files (x86)\VATECH\EzDent-i*\Bin\VTEzBridge32.exe",
        r"C:\Program Files\VATECH\EzDent-i*\Bin\VTEzBridge32.exe",
    ]
    for pattern in patterns:
        matches = glob.glob(pattern)
        if matches:
            return matches[0]
    return None


@dataclass(frozen=True)
class Config:
    host: str = "127.0.0.1"  # loopback ONLY — never bind 0.0.0.0
    port: int = int(os.environ.get("DENTC_AGENT_PORT", "8765"))
    vendor: str = "vatech"
    allowed_origins: list[str] = field(
        default_factory=lambda: _csv_env(
            "DENTC_AGENT_ORIGINS",
            [
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "http://localhost:3000",
            ],
        )
    )
    # Regex match for hosted origins, so new deployments (staging subdomains,
    # a domain rename, etc.) don't require pushing an updated env var / config
    # to every desktop running the agent — only this default (or the env var,
    # for a one-off override) needs to change. Mirrors the backend's
    # CORS_ORIGIN_REGEX (see dentc-backend app/core/config.py).
    allowed_origin_regex: str | None = os.environ.get(
        "DENTC_AGENT_ORIGIN_REGEX",
        r"^https://([a-z0-9-]+\.)*reckondental\.com$",
    ) or None
    # Optional shared token; when set, requests must send `X-DentC-Agent-Token`.
    token: str | None = os.environ.get("DENTC_AGENT_TOKEN") or None
    export_folder: str | None = field(default_factory=_discover_vatech_export_folder)
    bridge_exe: str | None = field(default_factory=_default_bridge_exe)
    temp_dir: str = os.environ.get(
        "DENTC_AGENT_TEMP_DIR", os.path.join(tempfile.gettempdir(), "dentc-imaging")
    )
    # A captured file is served once then cleaned up after this many seconds.
    temp_ttl_seconds: int = 600

    # EzWebServer REST API (patient create/prepopulate — VTEzBridge's CLI/XML
    # route cannot do this; see VATECH_INTEGRATION_FINDINGS.md). Prepopulation
    # is skipped entirely (falls back to plain chart_no focus) unless both
    # username and password are set — never hardcode a credential here.
    vatech_rest_base_url: str = os.environ.get(
        "DENTC_AGENT_VATECH_REST_URL", "http://127.0.0.1:43112/api/v1"
    )
    vatech_rest_username: str | None = os.environ.get("DENTC_AGENT_VATECH_REST_USERNAME") or None
    vatech_rest_password: str | None = os.environ.get("DENTC_AGENT_VATECH_REST_PASSWORD") or None

    def ensure_temp_dir(self) -> str:
        Path(self.temp_dir).mkdir(parents=True, exist_ok=True)
        return self.temp_dir

    def is_origin_allowed(self, origin: str | None) -> bool:
        """Mirrors the CORSMiddleware allow-list, for the `/ws` handshake.

        `CORSMiddleware` never runs on a websocket upgrade, so the origin has
        to be checked by hand here — same two rules (exact list + hosted-domain
        regex) as the HTTP routes get for free.
        """
        if not origin:
            return False
        if origin in self.allowed_origins:
            return True
        if self.allowed_origin_regex and re.match(self.allowed_origin_regex, origin):
            return True
        return False


config = Config()
