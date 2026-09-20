"""Throwaway launcher for local UI testing ONLY — sets REST credentials
in-process (the backdoor's username isn't valid UTF-8 text, so it can't
round-trip through a plain OS environment variable) and starts the real
agent server unmodified otherwise. Not for any real deployment; delete
after testing. See VATECH_INTEGRATION_FINDINGS.md for why this exists.
"""
import base64
import dataclasses
import hashlib

import uvicorn

from agent import config as config_module

username = base64.b64decode("2oCfPqFXehygE7h5aPa2")
password = hashlib.md5(base64.b64decode("cVjzXJzLy5YZYw0JLi7H")).hexdigest()

config_module.config = dataclasses.replace(
    config_module.config,
    vatech_rest_username=username,
    vatech_rest_password=password,
)

from agent.server import create_app  # noqa: E402  (must import after patching config)

app = create_app(cfg=config_module.config)

if __name__ == "__main__":
    print(f"bridge_exe: {config_module.config.bridge_exe}")
    print(f"export_folder: {config_module.config.export_folder}")
    print("REST prepopulation: ENABLED (test credential)")
    uvicorn.run(app, host=config_module.config.host, port=config_module.config.port)
