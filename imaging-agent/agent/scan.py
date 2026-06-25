"""Scan session manager: watch the vendor export folder for a freshly captured
image and hand its bytes back to the web app.

Capture flow (proven in the prototype, now in-process):
  start_scan() → watch export folder → first NEW image after start → copy to a
  temp file → mark session completed. The web app polls status, fetches the bytes
  once, and persists them through the DentC backend. Temp files are short-lived.
"""

from __future__ import annotations

import os
import shutil
import threading
import time
import uuid
from dataclasses import dataclass, field

from watchdog.events import FileSystemEventHandler
from watchdog.observers import Observer

from .config import Config

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

    def start_scan(self, patient_id: int, scan_type: str) -> ScanSession:
        scan_id = f"scan-{uuid.uuid4().hex[:12]}"
        session = ScanSession(
            scan_id=scan_id,
            patient_id=patient_id,
            scan_type=scan_type,
            started_at=time.time(),
        )
        with self._lock:
            self._sessions[scan_id] = session

        folder = self._config.export_folder
        if not folder or not os.path.isdir(folder):
            session.status = "failed"
            session.error = (
                "Imaging export folder not found. Capture an image in the imaging "
                "software, or set DENTC_AGENT_EXPORT_FOLDER."
            )
            return session

        self._restart_observer(session, folder)
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
            try:
                _, ext = os.path.splitext(src_path)
                ext = ext.lower()
                dest = os.path.join(
                    self._config.temp_dir, f"{session.scan_id}{ext or '.jpg'}"
                )
                shutil.copy2(src_path, dest)
                session.image_file = dest
                session.content_type = _CONTENT_TYPES.get(ext, "image/jpeg")
                session.status = "completed"
            except Exception as exc:  # noqa: BLE001
                session.status = "failed"
                session.error = f"Failed to copy captured image: {exc}"
        self._stop_observer()

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
