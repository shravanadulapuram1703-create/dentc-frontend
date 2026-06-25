"""FastAPI app exposing the agent's loopback HTTP contract (snake_case, v1).

Endpoints (consumed by `src/features/imaging/services/imagingDevice.ts`):
  GET  /status                 → capability/health
  POST /launch                 → deep-link vendor software to a patient
  POST /scan/start             → begin a capture session
  GET  /scan/{scan_id}/status  → poll capture state
  GET  /scan/{scan_id}/image   → download captured bytes (served once)

Security posture: bound to loopback only, CORS restricted to the configured app
origins, and an optional shared token (`X-DentC-Agent-Token`). The agent never
persists images — it streams them to the browser, which stores them via the
DentC backend.
"""

from __future__ import annotations

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from starlette.exceptions import HTTPException as StarletteHTTPException

from . import __version__
from .config import Config, config
from .scan import ScanManager
from .vatech import is_software_running, launch_patient


class LaunchRequest(BaseModel):
    patient_id: int | str
    first_name: str | None = None
    last_name: str | None = None
    dob: str | None = None


class ScanStartRequest(BaseModel):
    patient_id: int
    scan_type: str = "periapical"


def _require_token(cfg: Config):
    """Dependency that enforces the optional shared token when configured."""

    def _check(x_dentc_agent_token: str | None = Header(default=None)) -> None:
        if cfg.token and x_dentc_agent_token != cfg.token:
            raise HTTPException(status_code=401, detail="Invalid agent token")

    return _check


def create_app(cfg: Config = config) -> FastAPI:
    app = FastAPI(title="DentC Imaging Agent", version=__version__)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cfg.allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type", "X-DentC-Agent-Token"],
    )

    manager = ScanManager(cfg)
    auth = _require_token(cfg)

    @app.exception_handler(StarletteHTTPException)
    async def _error_body(_request, exc: StarletteHTTPException):
        # The web client reads `{ "error": ... }`; map FastAPI's `detail` to it
        # so the agent's helpful messages reach the UI toast.
        return JSONResponse(status_code=exc.status_code, content={"error": exc.detail})

    @app.get("/status")
    def status() -> dict:
        manager.cleanup_expired()
        return {
            "status": "online",
            "version": __version__,
            "vendor": cfg.vendor,
            "software_running": is_software_running(),
            "twain_available": True,
            "export_folder_detected": bool(cfg.export_folder),
        }

    @app.post("/launch", dependencies=[Depends(auth)])
    def launch(req: LaunchRequest) -> dict:
        try:
            launch_patient(
                cfg, req.patient_id, req.first_name, req.last_name, req.dob
            )
        except RuntimeError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc
        return {"success": True, "patient_id": req.patient_id}

    @app.post("/scan/start", dependencies=[Depends(auth)])
    def scan_start(req: ScanStartRequest) -> dict:
        session = manager.start_scan(req.patient_id, req.scan_type)
        if session.status == "failed":
            raise HTTPException(status_code=502, detail=session.error or "Scan failed")
        return {"scan_id": session.scan_id, "status": session.status}

    @app.get("/scan/{scan_id}/status", dependencies=[Depends(auth)])
    def scan_status(scan_id: str) -> dict:
        session = manager.get(scan_id)
        if not session:
            raise HTTPException(status_code=404, detail="Scan session not found")
        body: dict = {"scan_id": session.scan_id, "status": session.status}
        if session.status == "completed":
            body["image_path"] = f"/scan/{session.scan_id}/image"
            body["content_type"] = session.content_type
        if session.error:
            body["error"] = session.error
        return body

    @app.get("/scan/{scan_id}/image", dependencies=[Depends(auth)])
    def scan_image(scan_id: str):
        session = manager.get(scan_id)
        if not session or session.status != "completed" or not session.image_file:
            raise HTTPException(status_code=404, detail="Captured image not available")
        path = session.image_file
        media_type = session.content_type or "image/jpeg"
        # Serve once, then schedule prompt temp-file cleanup (PHI hygiene).
        response = FileResponse(path, media_type=media_type)
        manager.mark_served_and_schedule_cleanup(session)
        return response

    @app.on_event("shutdown")
    def _shutdown() -> None:
        manager.shutdown()

    return app


app = create_app()
