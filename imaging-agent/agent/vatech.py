"""Vatech EzDent-i driver: detect the running software and deep-link a patient.

This is the vendor-specific seam. A future vendor (Dexis, Carestream, …) would
implement the same two operations (`is_software_running`, `launch_patient`) plus
expose an export folder via config, and the rest of the agent stays unchanged.
"""

from __future__ import annotations

import re
import subprocess
import sys

from . import vatech_rest
from .config import Config

# Process names that indicate EzDent-i / Vatech tooling is running.
# vte2_reqadmin32.exe added 2026-08-04: observed as the actual EzDent-i engine
# process on this install (PID stayed alive for the duration of a manual
# EzDent-i session) — the original list missed it entirely.
_VATECH_PROCESSES = (
    "ezdent-i.exe",
    "ezdent.exe",
    "ezray.exe",
    "vte2loader32.exe",
    "vte232.exe",
    "vte2_reqadmin32.exe",
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


def _normalize_dob(dob: str) -> str | None:
    """Convert PatientShellLayout's display-formatted dob to ISO YYYY-MM-DD.

    The DentC frontend's Outlet-context `patient.dob` is display text
    (`PatientShellLayout.tsx`'s `formatDate()` always emits US-style
    `MM/DD/YYYY`, via either its `YYYY-MM-DD` fast path reformatted to
    `M/D/Y` order, or `Date.toLocaleDateString('en-US', ...)` for anything
    else) — not the raw ISO value. Discovered 2026-08-04 when a real create
    would otherwise have sent EzWebServer a US-formatted date string as
    `dtBirthdate`. Also accepts already-ISO input defensively, in case that
    ever changes upstream.
    """
    s = dob.strip()
    iso = re.match(r"^(\d{4})-(\d{2})-(\d{2})$", s)
    if iso:
        return s
    us = re.match(r"^(\d{1,2})/(\d{1,2})/(\d{4})$", s)
    if us:
        month, day, year = us.groups()
        return f"{year}-{month.zfill(2)}-{day.zfill(2)}"
    return None


def launch_patient(
    config: Config,
    patient_id: int | str,
    first_name: str | None = None,
    last_name: str | None = None,
    dob: str | None = None,
) -> None:
    """Open EzDent-i focused on the given patient, prepopulating a new chart
    with name/DOB first if it doesn't already exist.

    VTEzBridge's own CLI/XML (`/main:chart_no=`, `/in:`/`/out:`) was
    investigated at length on 2026-08-04 and confirmed incapable of
    creating a new chart — every field-name/flag variant tried left
    EzDent-i on its previously active patient. It DOES correctly focus an
    EXISTING chart (isolation-tested and confirmed). Full trail in
    VATECH_INTEGRATION_FINDINGS.md.

    The real mechanism for creating a chart is EzWebServer's REST API
    (`POST /api/v1/e2ds/patients`) — confirmed working end-to-end on
    2026-08-04 (create + verify round-trip against the real server). Its
    login isn't plain username/password: the payload is encrypted with
    Rijndael-256 (`rijndael256.py`, verified byte-for-byte against the real
    `phpseclib\\Crypt\\Rijndael`), wrapped by `vatech_rest.py`. That part
    needs a real EzDent-i login — set `DENTC_AGENT_VATECH_REST_USERNAME`/
    `_PASSWORD` in the environment. Without those set, this function skips
    straight to the chart_no focus below (existing patients still work;
    brand-new ones just won't be prepopulated).

    ``dob`` is normalized from the frontend's display format (see
    `_normalize_dob`) before being sent. ``gender`` is NOT wired through at
    all — the frontend never sends it (no `gender` field exists in the
    `/launch` request today), so there's nothing here to normalize; every
    created chart gets Vatech's `"O"` (Other) default. Fixing that needs a
    frontend change (threading real patient gender into the launch payload),
    out of scope for a Python-only fix.

    Raises RuntimeError with a user-facing message on any failure so the API can
    surface it.
    """
    if not _IS_WINDOWS:
        raise RuntimeError("Imaging software launch is only supported on Windows.")
    if not config.bridge_exe:
        raise RuntimeError(
            "VTEzBridge was not found. Set DENTC_AGENT_BRIDGE_EXE to its full path."
        )

    if config.vatech_rest_username and config.vatech_rest_password and (first_name or last_name or dob):
        try:
            vatech_rest.ensure_patient_exists(
                config.vatech_rest_base_url,
                config.vatech_rest_username,
                config.vatech_rest_password,
                str(patient_id),
                first_name=first_name,
                last_name=last_name,
                dob=_normalize_dob(dob) if dob else None,
            )
        except vatech_rest.VatechRestError as exc:
            # Best-effort: prepopulation failing should never block the
            # chart_no focus below, which works regardless.
            print(f"[vatech] prepopulation via REST failed (continuing anyway): {exc}")

    # VTEzBridge accepts /main:chart_no="<id>" to focus an existing chart.
    args = [config.bridge_exe, f'/main:chart_no={patient_id}']
    try:
        subprocess.Popen(
            args,
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
        )
    except Exception as exc:  # noqa: BLE001 — surface the OS error to the caller
        raise RuntimeError(f"Failed to launch imaging software: {exc}") from exc
