"""DentC Imaging Agent — local loopback bridge to vendor imaging software.

A single self-contained Python service (FastAPI) that connects the DentC web app
to locally installed dental imaging software (Vatech EzDent-i) and its capture
devices. It replaces the earlier Node-service + Python-watcher prototype with one
process and exposes a small, versioned, snake_case HTTP contract on loopback only.

The agent is intentionally NOT a persistence layer: a captured image is streamed
back to the browser, which stores it through the DentC backend (the source of
truth). The agent holds nothing beyond short-lived temp files.
"""

__version__ = "1.0.0"
