"""Agent configuration — environment-overridable, with sensible Vatech defaults.

Every machine-specific value (export folder, bridge exe, allowed origins) is a
config value, never hardcoded in logic. The Vatech export folder in particular
ends in an install-specific id (e.g. `Sub026052`), so we auto-discover it.
"""

from __future__ import annotations

import glob
import os
import tempfile
from dataclasses import dataclass, field
from pathlib import Path


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
    # Optional shared token; when set, requests must send `X-DentC-Agent-Token`.
    token: str | None = os.environ.get("DENTC_AGENT_TOKEN") or None
    export_folder: str | None = field(default_factory=_discover_vatech_export_folder)
    bridge_exe: str | None = field(default_factory=_default_bridge_exe)
    temp_dir: str = os.environ.get(
        "DENTC_AGENT_TEMP_DIR", os.path.join(tempfile.gettempdir(), "dentc-imaging")
    )
    # A captured file is served once then cleaned up after this many seconds.
    temp_ttl_seconds: int = 600

    def ensure_temp_dir(self) -> str:
        Path(self.temp_dir).mkdir(parents=True, exist_ok=True)
        return self.temp_dir


config = Config()
