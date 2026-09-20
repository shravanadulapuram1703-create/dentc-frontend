"""EzWebServer REST client: the real mechanism for creating/prepopulating a
Vatech patient chart (VTEzBridge's CLI/XML route cannot do this — see
VATECH_INTEGRATION_FINDINGS.md for the investigation that established that).

Auth uses whatever EzDent-i login this clinic's `.env` provides
(`DENTC_AGENT_VATECH_REST_USERNAME`/`_PASSWORD`) — never a hardcoded
credential. The wire-format constants below are not a secret WE are keeping;
they're the shared protocol key baked into every EzWebServer install,
required to speak the login API at all, the same way a TLS cipher suite
isn't a secret.

Two login endpoints exist, with two *completely different* crypto schemes —
see `_login_v1`/`_login_r2` below for which is which and why both are kept.
"""

from __future__ import annotations

import base64
import hashlib
import json
import struct
import time

from .rijndael256 import cbc_encrypt

JWT_KEY = base64.b64decode("NB7lTlF1J9/cGJN3kYSLgtwCOmqPb6W27hnLZXhKccE=")
IV = base64.b64decode("ZHb9ocCngFgqfAGVbk/b7RlqhUsr6N2TBnhzFKRbf60=")
MAGIC = base64.b64decode("6qACD0A=")

# AppLogInR2's crypto (see `_login_r2`) — standard AES-128-CBC, unrelated to
# the v1 constants above.
R2_AES_KEY = base64.b64decode("fCVpkpDy3QII1bJ0uklkvQ==")
R2_AES_IV = base64.b64decode("p+O8XWH7eWQw1xifYtxx5Q==")


class VatechRestError(Exception):
    pass


def _zero_pad(data: bytes, block: int = 32) -> bytes:
    rem = len(data) % block
    return data if rem == 0 else data + b"\x00" * (block - rem)


def _encrypt_login_blob(username: str | bytes, password: str | bytes, exp_seconds: int) -> str:
    """Build the base64 `data` field the v1 `LogIn_post` endpoint expects.

    Wire format (from decrypt_aes_with_magic, the server-side counterpart —
    built to match ITS parsing exactly, not the PHP encrypt_aes_with_magic
    helper, which has an internal precedence bug that produces a 4-byte
    header where the decryptor expects 5): a 5-byte header
    (type byte 0x04 + 4-byte big-endian plaintext length, XORed with MAGIC),
    followed by zero-padded Rijndael-256-CBC ciphertext of
    "username:password:exp".

    ``username``/``password`` accept raw bytes as well as str, since a
    login's underlying byte representation isn't guaranteed to be valid
    UTF-8 (e.g. non-ASCII characters in a real password).
    """
    exp = int(time.time()) + exp_seconds
    u = username if isinstance(username, bytes) else username.encode("utf-8")
    p = password if isinstance(password, bytes) else password.encode("utf-8")
    payload = u + b":" + p + b":" + str(exp).encode("ascii")
    header_plain = bytes([0x04]) + struct.pack(">I", len(payload))
    header_ct = bytes(a ^ b for a, b in zip(header_plain, MAGIC))
    body_ct = cbc_encrypt(JWT_KEY, IV, _zero_pad(payload))
    return base64.b64encode(header_ct + body_ct).decode("ascii")


def _one_and_zeros_pad(data: bytes, block_size: int = 16) -> bytes:
    """ISO/IEC 7816-4 padding: one 0x80 byte, then zeros to the block size —
    what AppLogInR2's cipher (`PaddingMode::OneAndZeros`) expects. Always
    adds a full block when already aligned, same as every other padding
    scheme, so the server can unambiguously strip it."""
    pad_len = block_size - (len(data) % block_size)
    return data + b"\x80" + b"\x00" * (pad_len - 1)


def _encrypt_r2_login_blob(username: str, password: str, exp_seconds: int) -> str:
    """Build the base64 `data` field `AppLogInR2_post` expects.

    A completely different wire format from `_encrypt_login_blob` above —
    reverse-engineered 2026-08-15 from `AuthenticationR2_model.php` /
    `AuthenticationHelper.php` / `Authentication_model.php`'s private
    `decrypt()` (plain AES-128-CBC, fixed key/IV, ISO/IEC 7816-4 padding —
    NOT the Rijndael-256-with-magic-header scheme `_encrypt_login_blob`
    uses). Plaintext is JSON, not a colon-joined string:
    `{"ver": "1.0.0", "client": {"name": ..., "ver": ...},
    "auth": {"enc": "b64", "usr": <base64>, "sec": <base64>, "exp": <ts>}}`.
    Confirmed end-to-end against a real account (created via EzDent-i's own
    Settings > Environment > General > USER ACCOUNT MANAGER) — this is also
    what EzDent-i's own desktop client calls (confirmed via EzWebServer's
    `logs/access.log`: `POST /api/v1/auth/apploginr2 ... "EzDent-i for
    India"`), while the older v1 `/auth/login` rejected the exact same,
    confirmed-working credentials outright.
    """
    from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

    from . import __version__

    exp = int(time.time()) + exp_seconds
    payload = {
        "ver": "1.0.0",
        "client": {"name": "DentC-Agent", "ver": __version__},
        "auth": {
            "enc": "b64",
            "usr": base64.b64encode(username.encode("utf-8")).decode("ascii"),
            "sec": base64.b64encode(password.encode("utf-8")).decode("ascii"),
            "exp": exp,
        },
    }
    plaintext = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    padded = _one_and_zeros_pad(plaintext)
    encryptor = Cipher(algorithms.AES(R2_AES_KEY), modes.CBC(R2_AES_IV)).encryptor()
    ciphertext = encryptor.update(padded) + encryptor.finalize()
    return base64.b64encode(ciphertext).decode("ascii")


def _login_v1(base_url: str, username: str, password: str, *, timeout: float) -> str:
    import requests

    data_b64 = _encrypt_login_blob(username, password, exp_seconds=3600)
    try:
        r = requests.post(f"{base_url}/auth/login", json={"data": data_b64}, timeout=timeout)
    except requests.RequestException as exc:
        raise VatechRestError(f"login request failed: {exc}") from exc
    if r.status_code != 200:
        raise VatechRestError(f"login rejected (HTTP {r.status_code}): {r.text[:300]}")
    token = (r.json() or {}).get("token")
    if not token:
        raise VatechRestError("login response had no token")
    return token


def _login_r2(base_url: str, username: str, password: str, *, timeout: float) -> str | None:
    """Try AppLogInR2. Returns None — not a hard error — only when the
    endpoint doesn't exist at all (HTTP 404, an older EzWebServer version
    without R2 support), so the caller can fall back to v1. Any other
    failure (wrong credentials, locked/expired account, ...) raises
    directly: retrying the same credentials against the older endpoint
    can't succeed where this one failed on them.
    """
    import requests

    data_b64 = _encrypt_r2_login_blob(username, password, exp_seconds=3600)
    try:
        r = requests.post(f"{base_url}/auth/apploginr2", json={"data": data_b64}, timeout=timeout)
    except requests.RequestException as exc:
        raise VatechRestError(f"login request failed: {exc}") from exc
    if r.status_code == 404:
        return None
    body = r.json() if r.content else {}
    if r.status_code != 200:
        detail = (body or {}).get("errorMessage") or r.text[:300]
        raise VatechRestError(f"login rejected (HTTP {r.status_code}): {detail}")
    token = (body or {}).get("token")
    if not token:
        raise VatechRestError("login response had no token")
    return token


def login(base_url: str, username: str, password: str, *, timeout: float = 10.0) -> str:
    """Return a bearer JWT for ``username``/``password``, or raise VatechRestError.

    Tries AppLogInR2 first (what EzDent-i's own desktop client actually
    uses) and falls back to the older v1 `/auth/login` only when R2 doesn't
    exist on this server at all — an older EzWebServer version. A genuine
    credential failure on R2 is surfaced immediately, not retried against
    v1: same account, same password, no reason it would succeed there.
    """
    token = _login_r2(base_url, username, password, timeout=timeout)
    if token is not None:
        return token
    return _login_v1(base_url, username, password, timeout=timeout)


def patient_exists(base_url: str, token: str, chart_no: str, *, timeout: float = 10.0) -> bool:
    import requests

    headers = {"Authorization": f"Bearer {token}"}
    r = requests.get(f"{base_url}/e2ds/patientsbychartno", params={"chartno": chart_no},
                      headers=headers, timeout=timeout)
    if r.status_code != 200:
        raise VatechRestError(f"patient lookup failed (HTTP {r.status_code}): {r.text[:300]}")
    return (r.json() or {}).get("errorCode") == 0


def create_patient(
    base_url: str,
    token: str,
    chart_no: str,
    *,
    first_name: str | None = None,
    last_name: str | None = None,
    dob: str | None = None,  # "YYYY-MM-DD"
    gender: str | None = None,  # "M" | "F" | "O"
    timeout: float = 10.0,
) -> None:
    import requests

    headers = {"Authorization": f"Bearer {token}"}
    body = {
        "strChartNo": chart_no,
        "strFirstName": first_name or "",
        "strLastName": last_name or "",
        "strMiddleName": "",
        "strGender": gender or "O",
        "strEmail": "", "strSocialID": "", "strPhone": "",
        "strMobile": "", "strZipCode": "", "strAddress": "",
        "strPhotoIDName": "", "eSourceType": "eEzBridgeSourceType",
    }
    if dob:
        body["dtBirthdate"] = dob
    r = requests.post(f"{base_url}/e2ds/patients", headers=headers, json=body, timeout=timeout)
    if r.status_code != 200:
        raise VatechRestError(f"patient create failed (HTTP {r.status_code}): {r.text[:300]}")
    err = (r.json() or {}).get("errorCode")
    if err != 0:
        raise VatechRestError(f"patient create rejected (errorCode {err})")


def list_images_for_chart(
    base_url: str,
    token: str,
    chart_no: str,
    *,
    page: int = 0,
    num_items: int = 50,
    timeout: float = 10.0,
) -> list[dict]:
    """Images Vatech's own DB has recorded for ``chart_no`` (newest and oldest
    mixed — caller sorts), via `POST /e2ds/imagesbychartno`. ``page`` is
    0-indexed (confirmed empirically: `pageNum=1` skips the first page).

    Each item has at least ``nImageID`` (int, stable per-image identity —
    use this, not filename, to detect "new" images across polls),
    ``strImgFileName``, ``modality`` (``"eIOSensor"`` = real x-ray sensor
    capture, DICOM; ``"eIOCamera"`` = intraoral camera photo, JPEG), and
    ``dtAcqTime``.

    Returns ``[]`` both when the chart genuinely has no images yet and on
    Vatech's "no such data" error code — the same condition from this
    endpoint's point of view.
    """
    import requests

    headers = {"Authorization": f"Bearer {token}"}
    r = requests.post(
        f"{base_url}/e2ds/imagesbychartno",
        headers=headers,
        json={"strChartNo": chart_no, "pageNum": page, "numItems": num_items},
        timeout=timeout,
    )
    if r.status_code != 200:
        raise VatechRestError(f"image list failed (HTTP {r.status_code}): {r.text[:300]}")
    data = r.json() or {}
    if data.get("errorCode") not in (0, None):
        return []
    return data.get("vecImageInfo") or []


def download_image_file(base_url: str, token: str, filename: str, *, timeout: float = 30.0) -> bytes:
    """Raw bytes of a file already recorded against some chart — real x-ray
    sensor captures come back as genuine DICOM (verified 2026-08-04: valid
    Part-10 header, parses with pydicom), camera captures as JPEG."""
    import requests

    headers = {"Authorization": f"Bearer {token}"}
    r = requests.get(
        f"{base_url}/fs/filesbytypeandpath",
        params={"type": "IMG", "path": filename},
        headers=headers,
        timeout=timeout,
    )
    if r.status_code != 200:
        raise VatechRestError(f"image download failed (HTTP {r.status_code}): {r.text[:300]}")
    return r.content


def ensure_patient_exists(
    base_url: str,
    username: str,
    password: str,
    chart_no: str,
    *,
    first_name: str | None = None,
    last_name: str | None = None,
    dob: str | None = None,
) -> None:
    """Log in, then create ``chart_no`` if it doesn't already exist. Raises
    VatechRestError on any failure — callers should treat this as best-effort
    and fall back to the plain CLI chart_no focus regardless of outcome."""
    token = login(base_url, username, password)
    if not patient_exists(base_url, token, chart_no):
        create_patient(base_url, token, chart_no,
                        first_name=first_name, last_name=last_name, dob=dob)
