"""FastAPI app exposing the agent's loopback HTTP contract (snake_case, v1).

Endpoints (consumed by `src/features/imaging/services/imagingDevice.ts`):
  GET  /status                 → capability/health
  POST /launch                 → deep-link vendor software to a patient
  POST /scan/start             → begin a capture session
  GET  /scan/{scan_id}/status  → poll capture state
  GET  /scan/{scan_id}/image   → download captured bytes (served once)
  WS   /ws                     → push variant of status + scan start/complete
                                  (v1.1; browser falls back to the polling
                                  routes above when this isn't available)

Security posture: bound to loopback only, CORS restricted to the configured app
origins, and an optional shared token (`X-DentC-Agent-Token`). The agent never
persists images — it streams them to the browser, which stores them via the
DentC backend.
"""

from __future__ import annotations

import asyncio

from fastapi import Depends, FastAPI, Header, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from starlette.exceptions import HTTPException as StarletteHTTPException

from . import __version__
from .config import Config, config
from .scan import ScanManager
from .vatech import is_software_running, launch_patient

# How often a `/ws` connection re-checks `software_running` for a status push.
# Same tasklist-based check `/status` does; a few seconds of staleness is fine
# for a "is the vendor app open" indicator.
_STATUS_PUSH_INTERVAL_S = 4.0


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
        allow_origin_regex=cfg.allowed_origin_regex,
        allow_credentials=True,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type", "X-DentC-Agent-Token"],
        # A public HTTPS page (e.g. reckondental.com) fetching this loopback
        # agent trips Chrome's Private Network Access check, on top of normal
        # CORS: the preflight OPTIONS carries
        # `Access-Control-Request-Private-Network: true` and Starlette
        # rejects it with 400 "Disallowed CORS private-network" unless this
        # is set. curl doesn't perform this check, which is why plain CORS
        # headers looked correct there while the browser still silently
        # failed to reach the agent.
        allow_private_network=True,
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

    @app.websocket("/ws")
    async def ws(websocket: WebSocket) -> None:
        """Push variant of the status/scan-poll routes above.

        Protocol (JSON text frames both ways):
          → {"type": "auth", "token": "..."}            (always sent first)
          ← {"type": "auth_result", "ok": true}
          ← {"type": "status", "software_running": bool} (on connect, then on change)
          → {"type": "start_scan", "patient_id": ..., "scan_type": "..."}
          ← {"type": "scan_started", "scan_id": "..."}
          ← {"type": "scan_completed", "scan_id": "...", "image_path": "...", "content_type": "..."}
          ← {"type": "scan_failed", "scan_id": "...", "error": "..."}

        One connection can drive multiple sequential scans. A completed/failed
        scan's image bytes are still fetched with the plain `GET
        /scan/{id}/image` route — this socket only replaces the polling loop
        that used to discover *when* those bytes were ready.
        """
        origin = websocket.headers.get("origin")
        if not cfg.is_origin_allowed(origin):
            await websocket.close(code=4403)
            return
        await websocket.accept()

        loop = asyncio.get_running_loop()
        outbox: asyncio.Queue[dict] = asyncio.Queue()
        authed = cfg.token is None

        def notify(event: dict) -> None:
            # Called from a ScanManager worker thread — never the event loop.
            loop.call_soon_threadsafe(outbox.put_nowait, event)

        async def sender() -> None:
            while True:
                event = await outbox.get()
                await websocket.send_json(event)

        async def status_pusher() -> None:
            # is_software_running() shells out to `tasklist` — genuinely
            # blocking, so it must run off the event loop or it stalls every
            # connection's send/receive (including this one's own auth/
            # start_scan handling) for the subprocess's duration, every
            # _STATUS_PUSH_INTERVAL_S.
            last: bool | None = None
            while True:
                current = await loop.run_in_executor(None, is_software_running)
                if current != last:
                    outbox.put_nowait({"type": "status", "software_running": current})
                    last = current
                await asyncio.sleep(_STATUS_PUSH_INTERVAL_S)

        sender_task = asyncio.create_task(sender())
        status_task = asyncio.create_task(status_pusher())
        try:
            while True:
                msg = await websocket.receive_json()
                msg_type = msg.get("type")

                if msg_type == "auth":
                    authed = cfg.token is None or msg.get("token") == cfg.token
                    outbox.put_nowait({"type": "auth_result", "ok": authed})
                    if not authed:
                        break
                elif not authed:
                    outbox.put_nowait({"type": "error", "error": "Not authenticated"})
                elif msg_type == "start_scan":
                    patient_id = msg.get("patient_id")
                    if patient_id is None:
                        outbox.put_nowait({"type": "error", "error": "patient_id is required"})
                        continue
                    session = manager.start_scan(
                        patient_id, msg.get("scan_type", "periapical"), notify=notify
                    )
                    if session.status == "failed":
                        outbox.put_nowait(
                            {
                                "type": "scan_failed",
                                "scan_id": session.scan_id,
                                "error": session.error,
                            }
                        )
                    else:
                        outbox.put_nowait({"type": "scan_started", "scan_id": session.scan_id})
                elif msg_type == "ping":
                    outbox.put_nowait({"type": "pong"})
                else:
                    outbox.put_nowait({"type": "error", "error": f"Unknown message type: {msg_type}"})
        except WebSocketDisconnect:
            pass
        finally:
            status_task.cancel()
            sender_task.cancel()

    @app.on_event("shutdown")
    def _shutdown() -> None:
        manager.shutdown()

    return app


app = create_app()
