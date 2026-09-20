"""Scan session manager: detect a freshly captured image and hand its bytes
back to the web app.

Two detection mechanisms, chosen per-session by whether Vatech REST
credentials are configured:

  REST poll (preferred, used when DENTC_AGENT_VATECH_REST_USERNAME/_PASSWORD
  are set): poll EzWebServer's `POST /e2ds/imagesbychartno` for the patient's
  chart, by `nImageID` (not filename) so we only react to genuinely new
  rows, then download via `GET /fs/filesbytypeandpath`. Verified end-to-end
  2026-08-04 against real EzDent-i captures — see
  VATECH_INTEGRATION_FINDINGS.md. Doesn't depend on a local export-folder
  path, doesn't care which workstation captured the image, and gets Vatech's
  own modality/timestamp metadata instead of inferring from a filename.

  Folder watch (fallback, used when REST credentials aren't configured):
  watch the vendor export folder for the first new image file after a scan
  starts. The original mechanism — still what's used if REST auth isn't set
  up for this clinic.

Either way: start_scan() → detect the new capture → copy/download to a temp
file → mark session completed. The web app polls status, fetches the bytes
once, and persists them through the DentC backend. Temp files are short-lived.
"""

from __future__ import annotations

import os
import shutil
import threading
import time
import uuid
from dataclasses import dataclass, field
from typing import Callable

from watchdog.events import FileSystemEventHandler
from watchdog.observers import Observer

from . import vatech_rest
from .config import Config, _discover_vatech_export_folder

_REST_POLL_INTERVAL_S = 1.5
_REST_POLL_TIMEOUT_S = 300  # matches the frontend's SCAN_TIMEOUT_MS (5 min)

# ERROR_SHARING_VIOLATION: the exporting software (or an AV/EDR product
# scanning the freshly created file -- common on clinic PCs, and varies a lot
# between products) still has its own handle open. This clears on its own
# within a few seconds. Any other WinError (e.g. 5 = ACCESS_DENIED) is a real
# permission problem that waiting can't fix -- worth failing fast on rather
# than burning the whole retry budget for nothing.
_TRANSIENT_COPY_WINERRORS = {32}
_COPY_RETRY_ATTEMPTS = 8

_IMAGE_EXTS = (".jpg", ".jpeg", ".png", ".bmp", ".dcm", ".tif", ".tiff", ".dicom")
_CONTENT_TYPES = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".bmp": "image/bmp",
    ".tif": "image/tiff",
    ".tiff": "image/tiff",
    ".dcm": "application/dicom",
    ".dicom": "application/dicom",
}


@dataclass
class ScanSession:
    scan_id: str
    patient_id: int
    scan_type: str
    started_at: float
    status: str = "scanning"  # scanning | completed | failed
    image_file: str | None = None  # local temp path
    content_type: str | None = None
    error: str | None = None
    served: bool = False
    # Set by the `/ws` handler when a scan is started over the socket, so the
    # background detector thread can push the terminal state instead of the
    # browser having to poll `/scan/{id}/status` for it. HTTP-started scans
    # (no websocket) leave this unset and behave exactly as before.
    notify: Callable[[dict], None] | None = None


class _NewImageHandler(FileSystemEventHandler):
    """Detects the first image written to the export folder after a scan starts."""

    def __init__(self, manager: "ScanManager", session: ScanSession):
        self._manager = manager
        self._session = session
        self._processed: set[str] = set()

    def on_created(self, event):  # noqa: D401
        self._maybe_handle(event)

    def on_moved(self, event):
        # Some exporters write to a temp name then rename into place.
        path = getattr(event, "dest_path", None)
        if path:
            self._consider(path)

    def _maybe_handle(self, event):
        if getattr(event, "is_directory", False):
            return
        self._consider(event.src_path)

    def _consider(self, path: str):
        if not path.lower().endswith(_IMAGE_EXTS):
            return
        if path in self._processed:
            return
        self._processed.add(path)

        # Wait for the file to finish writing (size stabilizes).
        if not _wait_until_stable(path):
            return
        self._manager._on_image_captured(self._session, path)


def _wait_until_stable(path: str, timeout: float = 15.0) -> bool:
    """Poll the file size until it stops changing (or give up)."""
    deadline = time.time() + timeout
    last = -1
    while time.time() < deadline:
        try:
            size = os.path.getsize(path)
        except OSError:
            time.sleep(0.3)
            continue
        if size > 0 and size == last:
            return True
        last = size
        time.sleep(0.5)
    return False


class ScanManager:
    """Owns active scan sessions and the single export-folder watcher."""

    def __init__(self, config: Config):
        self._config = config
        self._sessions: dict[str, ScanSession] = {}
        self._observer: Observer | None = None
        self._lock = threading.Lock()
        config.ensure_temp_dir()

    def start_scan(
        self,
        patient_id: int,
        scan_type: str,
        notify: Callable[[dict], None] | None = None,
    ) -> ScanSession:
        scan_id = f"scan-{uuid.uuid4().hex[:12]}"
        session = ScanSession(
            scan_id=scan_id,
            patient_id=patient_id,
            scan_type=scan_type,
            started_at=time.time(),
            notify=notify,
        )
        with self._lock:
            self._sessions[scan_id] = session

        if self._config.vatech_rest_username and self._config.vatech_rest_password:
            t = threading.Thread(target=self._rest_poll_worker, args=(session,), daemon=True)
            t.start()
            return session

        # Re-discover fresh rather than trusting `self._config.export_folder`,
        # a snapshot resolved once at agent startup: Vatech periodically rolls
        # over to a new SubNNNNNN export folder (observed: a brand-new
        # Sub026081 started receiving captures 6 minutes into an
        # already-running agent's session, while it kept watching the stale
        # SubNNNNNN it had resolved at import time — the capture landed in a
        # folder nobody was watching, and the scan hung forever). An explicit
        # DENTC_AGENT_EXPORT_FOLDER override is trusted as an exact path, same
        # as always; only auto-discovery gets re-resolved.
        is_override = bool(os.environ.get("DENTC_AGENT_EXPORT_FOLDER"))
        folder = _discover_vatech_export_folder() or self._config.export_folder
        if not folder or not os.path.isdir(folder):
            session.status = "failed"
            session.error = (
                "Imaging export folder not found. Capture an image in the imaging "
                "software, or set DENTC_AGENT_EXPORT_FOLDER."
            )
            return session

        # Watch the *parent* Files directory (recursively) rather than one
        # specific SubNNNNNN child, so a rollover to yet another new folder
        # mid-scan can't cause the same silent miss again. Only for
        # auto-discovered installs — an explicit override is watched exactly
        # as configured, since it isn't guaranteed to follow that layout.
        watch_root = folder if is_override else (os.path.dirname(folder) or folder)
        self._restart_observer(session, watch_root)
        return session

    def get(self, scan_id: str) -> ScanSession | None:
        with self._lock:
            return self._sessions.get(scan_id)

    def _restart_observer(self, session: ScanSession, folder: str) -> None:
        self._stop_observer()
        handler = _NewImageHandler(self, session)
        observer = Observer()
        observer.schedule(handler, folder, recursive=True)
        observer.start()
        self._observer = observer

    def _stop_observer(self) -> None:
        if self._observer is not None:
            try:
                self._observer.stop()
                self._observer.join(timeout=2)
            except Exception:
                pass
            self._observer = None

    def _on_image_captured(self, session: ScanSession, src_path: str) -> None:
        with self._lock:
            if session.status != "scanning":
                return  # already completed/failed by another event

        # Copy outside the lock: the exporting software can still hold its
        # own handle open for a moment after `_wait_until_stable` sees the
        # size stop changing (stable size just means it finished writing
        # bytes, not that it released the handle) -- that surfaces as
        # `PermissionError` too (Windows sharing violations map to the same
        # errno as a real ACL denial). Retries generously for a confirmed
        # sharing violation (clinic AV/EDR products vary widely in how long
        # they hold a scan-on-write lock, so this can't be tuned to one
        # observed value), but fails fast for anything else -- a real
        # permission problem won't clear by waiting, so there's no point
        # spending the whole retry budget on it.
        _, ext = os.path.splitext(src_path)
        ext = ext.lower()
        dest = os.path.join(self._config.temp_dir, f"{session.scan_id}{ext or '.jpg'}")
        copy_error: Exception | None = None
        for attempt in range(_COPY_RETRY_ATTEMPTS):
            try:
                shutil.copy2(src_path, dest)
                copy_error = None
                break
            except OSError as exc:
                copy_error = exc
                winerror = getattr(exc, "winerror", None)
                if winerror is not None and winerror not in _TRANSIENT_COPY_WINERRORS:
                    break  # a real ACL denial, not a lock -- fail now, not in ~10s
                time.sleep(min(0.5 * (attempt + 1), 2.0))

        with self._lock:
            if session.status != "scanning":
                return
            if copy_error is None:
                session.image_file = dest
                session.content_type = _CONTENT_TYPES.get(ext, "image/jpeg")
                session.status = "completed"
            else:
                session.status = "failed"
                session.error = f"Failed to copy captured image: {copy_error}"
        self._stop_observer()
        self._emit(session)

    def _emit(self, session: ScanSession) -> None:
        """Push the session's terminal state to a subscribed `/ws` connection.

        No-op for HTTP-only sessions (`notify` unset). Swallows errors from a
        stale callback (e.g. the browser tab/socket closed mid-scan) — the
        capture pipeline itself must never fail because nobody was listening;
        the web app's `/scan/{id}/status` fallback still has the answer.
        """
        if not session.notify:
            return
        try:
            if session.status == "completed":
                session.notify(
                    {
                        "type": "scan_completed",
                        "scan_id": session.scan_id,
                        "image_path": f"/scan/{session.scan_id}/image",
                        "content_type": session.content_type,
                    }
                )
            elif session.status == "failed":
                session.notify(
                    {"type": "scan_failed", "scan_id": session.scan_id, "error": session.error}
                )
        except Exception:  # noqa: BLE001
            pass

    def _rest_poll_worker(self, session: ScanSession) -> None:
        """Detect a new capture via EzWebServer REST instead of the folder
        watcher. Runs in its own thread (one per session); never touches
        the DB or the FastAPI event loop directly."""
        cfg = self._config
        chart_no = str(session.patient_id)
        base_url = cfg.vatech_rest_base_url

        try:
            token = vatech_rest.login(base_url, cfg.vatech_rest_username, cfg.vatech_rest_password)
        except vatech_rest.VatechRestError as exc:
            with self._lock:
                if session.status == "scanning":
                    session.status = "failed"
                    session.error = f"Could not reach Vatech REST API: {exc}"
            self._emit(session)
            return

        # Snapshot existing image IDs so a pre-existing capture never gets
        # mistaken for a new one — nImageID is stable identity, not filename.
        try:
            seen_ids = {img.get("nImageID") for img in vatech_rest.list_images_for_chart(base_url, token, chart_no)}
        except vatech_rest.VatechRestError:
            seen_ids = set()  # best-effort baseline; worst case one stale hit

        deadline = time.time() + _REST_POLL_TIMEOUT_S
        while time.time() < deadline:
            with self._lock:
                if session.status != "scanning":
                    return  # cancelled/superseded elsewhere
            time.sleep(_REST_POLL_INTERVAL_S)

            try:
                images = vatech_rest.list_images_for_chart(base_url, token, chart_no)
            except vatech_rest.VatechRestError:
                continue  # transient — keep polling until the deadline

            new_images = [img for img in images if img.get("nImageID") not in seen_ids]
            if not new_images:
                continue

            new_images.sort(key=lambda img: img.get("nImageID") or 0, reverse=True)
            target = new_images[0]
            fname = target.get("strImgFileName") or ""

            try:
                data = vatech_rest.download_image_file(base_url, token, fname)
            except vatech_rest.VatechRestError as exc:
                with self._lock:
                    if session.status == "scanning":
                        session.status = "failed"
                        session.error = f"Found a new capture but couldn't download it: {exc}"
                self._emit(session)
                return

            _, ext = os.path.splitext(fname)
            ext = ext.lower() or ".jpg"
            dest = os.path.join(cfg.temp_dir, f"{session.scan_id}{ext}")
            with self._lock:
                if session.status != "scanning":
                    return
                try:
                    with open(dest, "wb") as fh:
                        fh.write(data)
                    session.image_file = dest
                    session.content_type = _CONTENT_TYPES.get(ext, "application/octet-stream")
                    session.status = "completed"
                except OSError as exc:
                    session.status = "failed"
                    session.error = f"Failed to save downloaded capture: {exc}"
            self._emit(session)
            return

        with self._lock:
            if session.status == "scanning":
                session.status = "failed"
                session.error = "Timed out waiting for a new capture."
        self._emit(session)

    def cleanup_expired(self) -> None:
        """Delete temp files for sessions older than the TTL (PHI hygiene)."""
        now = time.time()
        with self._lock:
            stale = [
                s
                for s in self._sessions.values()
                if now - s.started_at > self._config.temp_ttl_seconds
            ]
            for s in stale:
                _safe_unlink(s.image_file)
                self._sessions.pop(s.scan_id, None)

    def mark_served_and_schedule_cleanup(self, session: ScanSession) -> None:
        """After the web app fetches the bytes, drop the temp file promptly."""
        session.served = True
        path = session.image_file
        session.image_file = None
        if path:
            threading.Timer(5.0, _safe_unlink, args=(path,)).start()

    def shutdown(self) -> None:
        self._stop_observer()
        with self._lock:
            for s in self._sessions.values():
                _safe_unlink(s.image_file)
            self._sessions.clear()


def _safe_unlink(path: str | None) -> None:
    if not path:
        return
    try:
        os.remove(path)
    except OSError:
        pass
