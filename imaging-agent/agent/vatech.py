"""Vatech EzDent-i driver: detect the running software and deep-link a patient.

This is the vendor-specific seam. A future vendor (Dexis, Carestream, …) would
implement the same two operations (`is_software_running`, `launch_patient`) plus
expose an export folder via config, and the rest of the agent stays unchanged.
"""

from __future__ import annotations

import subprocess
import sys

from .config import Config

# Process names that indicate EzDent-i / Vatech tooling is running.
_VATECH_PROCESSES = (
    "ezdent-i.exe",
    "ezdent.exe",
    "ezray.exe",
    "vte2loader32.exe",
    "vte232.exe",
    "vtezbridge32.exe",
    "vtfilemanageragent32.exe",
    "vtfilemanager",
    "vatech",
)

_IS_WINDOWS = sys.platform.startswith("win")


def is_software_running() -> bool:
    """True if any Vatech process is detected (Windows only)."""
    if not _IS_WINDOWS:
        return False
    try:
        out = subprocess.run(
            ["tasklist"],
            capture_output=True,
            text=True,
            timeout=5,
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
        )
    except Exception:
        return False
    if out.returncode != 0:
        return False
    haystack = out.stdout.lower()
    return any(proc in haystack for proc in _VATECH_PROCESSES)


def launch_patient(
    config: Config,
    patient_id: int | str,
    first_name: str | None = None,
    last_name: str | None = None,
    dob: str | None = None,
) -> None:
    """Open EzDent-i focused on the given patient via VTEzBridge `chart_no`.

    Raises RuntimeError with a user-facing message on any failure so the API can
    surface it.
    """
    if not _IS_WINDOWS:
        raise RuntimeError("Imaging software launch is only supported on Windows.")
    if not config.bridge_exe:
        raise RuntimeError(
            "VTEzBridge was not found. Set DENTC_AGENT_BRIDGE_EXE to its full path."
        )

    # VTEzBridge accepts /main:chart_no="<id>" to focus an existing chart.
    args = [config.bridge_exe, f'/main:chart_no={patient_id}']
    try:
        subprocess.Popen(
            args,
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
        )
    except Exception as exc:  # noqa: BLE001 — surface the OS error to the caller
        raise RuntimeError(f"Failed to launch imaging software: {exc}") from exc
