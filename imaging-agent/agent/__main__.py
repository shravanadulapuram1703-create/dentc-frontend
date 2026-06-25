"""Run the DentC Imaging Agent (loopback HTTP service).

    python -m agent

Binds to 127.0.0.1 only. Configure via env vars (see config.py): DENTC_AGENT_PORT,
DENTC_AGENT_ORIGINS, DENTC_AGENT_TOKEN, DENTC_AGENT_EXPORT_FOLDER, …
"""

from __future__ import annotations

import uvicorn

from . import __version__
from .config import config
from .server import app


def main() -> None:
    print(f"DentC Imaging Agent v{__version__}")
    print(f"  listening on http://{config.host}:{config.port} (loopback only)")
    print(f"  vendor: {config.vendor}")
    print(f"  export folder: {config.export_folder or 'NOT DETECTED'}")
    print(f"  bridge exe: {config.bridge_exe or 'NOT DETECTED'}")
    print(f"  allowed origins: {', '.join(config.allowed_origins)}")
    uvicorn.run(app, host=config.host, port=config.port, log_level="info")


if __name__ == "__main__":
    main()
