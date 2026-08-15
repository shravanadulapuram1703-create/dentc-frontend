# Vatech patient prepopulation — investigation findings (2026-08-04)

**Status: SOLVED and implemented.** Two mechanisms were investigated for
creating/prepopulating a patient chart in EzDent-i ahead of a scan. Section 1
(VTEzBridge's CLI/XML) is a dead end for creating new charts, confirmed by
live testing. Section 2 (EzWebServer's REST API) is the real mechanism and
is now wired into `agent/vatech.py` via `agent/vatech_rest.py` +
`agent/rijndael256.py` — `launch_patient()` creates the chart via REST (when
`DENTC_AGENT_VATECH_REST_USERNAME`/`_PASSWORD` are configured with a real
EzDent-i login) before focusing it with `/main:chart_no=`. This doc is kept
as the investigation record so the reasoning isn't lost.

## 1. VTEzBridge32.exe (CLI) — investigated, does not achieve prepopulation

`VTEzBridge32.exe`'s own embedded usage string confirms:

```
VTEzBridge.exe [/in:"input file(*.xml)" /out:"output file(*.xml)"] [ ... ]
  /main:chart_no="chart No." /acq:selectedModality="..." /img:"..."
```

No `/name`, `/birth`, or `/sex` flag exists anywhere in the binary (checked by
extracting its embedded strings) — a separate bridge's `/name:`/`/birth:`
flags (`C:\vatech-bridge\vatech-bridge-service.js`) were an unverified guess,
not real.

The `/in:`/`/out:` XML pair IS real. Field names `ChartNo`, `FirstName`,
`LastName`, `Gender`, `Birthdate` and tags `<patient>`/`<birthday>` appear as
literal strings in the binary, suggesting an XML shape like:

```xml
<patient>
  <ChartNo>...</ChartNo>
  <FirstName>...</FirstName>
  <LastName>...</LastName>
  <birthday>YYYYMMDD</birthday>
</patient>
```

**Live-tested three times** against the real VTEzBridge32.exe on a machine
with a genuine EzDent-i install (chart_no `12345` "Sarah Johnson"
pre-existing — this looks like seeded test/demo data, not a real clinic's
live records): EzDent-i not running, EzDent-i already open, and a third
attempt with the field names changed to `<strChartNo>`/`<strFirstName>`/
`<strLastName>`/`<dtBirthdate>` — the Hungarian-notation convention
confirmed real in the REST API (section 2) and also present verbatim in this
binary's strings, alongside the bare names, so it was a genuine hypothesis
worth testing, not a repeat guess. All three times EzDent-i stayed on its
previously active patient, and `/out:` wrote an empty `<Request/>`, matching
two more historical attempts (`C:\vatech-bridge\test_input.xml` /
`test_input_2.xml`) that got the same empty response with yet another XML
shape.

**Isolation test — CONFIRMED**: `/main:chart_no=` alone, no `/in:`/`/out:` at
all, called with a chart_no that **already exists** (`PAT-12346`, an existing
seeded patient) correctly navigated EzDent-i to that patient. So the
mechanism is genuinely functional for its real purpose. It's specifically
*creating a brand-new chart* that's disproven — tried three different XML
shapes across four live attempts, none worked.

## 2. EzWebServer REST API — real mechanism, confirmed working end-to-end

EzDent-i bundles a full nginx+PHP (CodeIgniter) REST API service
(`VTEzWebServerService32.exe`, nginx workers), listening on **port 43112**,
API rooted at `/api/v1/...` (see
`EzWebServer/bin/nginx/conf/sites-enabled/ezwebserver.conf`).

Controller source files under `application/controllers/v1/*.php` and model
files under `application/models/*.php` are **not** compiled/ionCube — they're
plain PHP with every string literal octal/hex-escaped (e.g.
`"\x50\141\164..."`). Fully decodable by substituting each `\xHH`/`\OOO` run
back to bytes. `application/config/rest.php` and `routes.php` are the same.

### Confirmed real endpoint: create a patient

```
POST /api/v1/e2ds/patients
Content-Type: application/json
{
  "strChartNo": "...",        // required
  "strFirstName": "...",
  "strLastName": "...",
  "strMiddleName": "...",
  "strGender": "M" | "F" | "O",   // optional, defaults "O"
  "dtBirthdate": "YYYY-MM-DD",     // optional; rejected if it's a future date
  "dtRegisteredDateTime": "...",   // optional, defaults to today
  "strEmail": "...", "strSocialID": "...", "strPhone": "...",
  "strMobile": "...", "strZipCode": "...", "strAddress": "...",
  "strPhotoIDName": "...", "eSourceType": ...
}
```
Response: `{"errorCode": 0}` on success; a specific overlap error code if
`strChartNo` already exists (from `E2Ds.php::Patients_post()` /
`Patients_model::post_Patients()`).

```
GET /api/v1/e2ds/patientsbychartno?chartno=<chartno>
```
Response: `{"errorCode": 0, "patientInfo": {...}}` or a not-found error code
with `"patientInfo": []`.

```
PUT /api/v1/e2ds/patientsbychartno
Content-Type: application/json
{ "strChartNo": "...", "sPatientInfo": { ...same fields as above... } }
```

This is a real, clean way to prepopulate: `GET` to check if the chart
exists, `POST` to create it with name/DOB/gender if not, then
`/main:chart_no=` to focus it.

### Auth: solved

`rest.php` sets `rest_auth = "jwt"` whenever `CI_ENV=production` (which this
install runs as — see the nginx conf). `Patients_post` is **not** in the
auth-bypass whitelist (only `auth.*`, `info.*`, `iosensor.*`,
`settings.{fileserversettings,dbserversettings,checkexistdirectory,
checkvaliddbconnection,saveToken}`, and `e2ds.useraccountsfornames` bypass
auth). Verified live: `GET /api/v1/e2ds/useraccountsfornames` works with no
auth and returns `{"errorCode":0,"strlUserName":["Master Admin"]}` (a staff
account name, not patient data).

Getting a JWT (`POST /api/v1/auth/login`, `Auth.php::LogIn_post()`) is not a
plain username/password call — the body must contain a `data` field that is
an **encrypted, base64-encoded** blob of `"username:password:exp"`
(`CryptoUtils::decrypt_aes_with_magic`, using the same shared key found in
`rest.php`).

That encryption scheme was fully decoded (`CryptoUtils.php` +
`VTPhpseclibCryptoWrapper.php`, both plain octal-escaped PHP, not encoded):
CBC mode, a fixed IV (`base64_decode("ZHb9ocCngFgqfAGVbk/b7RlqhUsr6N2TBnhzFKRbf60=")`),
a 5-byte XOR-obscured length header (magic = `base64_decode("6qACD0A=")`,
type byte `0x04` + 4-byte big-endian length via `pack("N", ...)`), zero
padding. **The cipher itself is not AES**: because the wrapper's `keySize`
is 256 bits, it selects `phpseclib\Crypt\Rijndael` with `blockSize` also set
to 256 bits — the original, pre-standardization Rijndael variant with
256-bit blocks, which AES itself never adopted (AES is Rijndael fixed at a
128-bit block regardless of key size).

**Implemented anyway**: `agent/rijndael256.py` is a from-scratch Rijndael-256
CBC implementation (no mainstream Python library supports this block size),
**verified byte-for-byte identical** to the real `phpseclib\Crypt\Rijndael`
by running both against the same key/IV/plaintext (PHP available locally at
`EzWebServer/bin/php/php.exe`, phpseclib vendored at
`EzWebServer/www/ezwebserver/src/vendor/phpseclib`) — see
`agent/vatech_rest.py::_encrypt_login_blob`. Note: the PHP
`encrypt_aes_with_magic` helper has an internal operator-precedence bug that
produces a 4-byte header where `decrypt_aes_with_magic` expects 5 — our
implementation builds directly to the *decryptor's* contract (unambiguous)
rather than replicating that bug.

**End-to-end verified live** (2026-08-04, using the temporary-credential
backdoor documented below, one time, for verification only — the shipped
`vatech_rest.py` takes real credentials from config, never that backdoor):
login → `POST /e2ds/patients` (create) → `GET /e2ds/patientsbychartno`
(returned the exact submitted data) all succeeded against the real server.

### Security findings (incidental to this feature — worth reporting to Vatech)

Decoded straight out of the shipped files, not test-instance-specific:

- `rest.php`: `$config["rest_valid_logins"] = ["admin" => "1234"];` — a
  hardcoded default REST credential.
- `rest.php`: a JWT signing secret hardcoded in the shipped config
  (`$config["jwt_key"] = base64_decode(...)`), the same one the login
  encryption also reuses as its AES/Rijndael key — likely identical across
  every install of this EzWebServer version, not per-clinic.
- Several endpoints (`iosensor.*`, `e2ds.useraccountsfornames`, some
  `settings.*`) bypass auth entirely regardless of environment. Verified
  live: `GET /api/v1/e2ds/useraccountsfornames` returns
  `{"errorCode":0,"strlUserName":["Master Admin"]}` with zero auth (a staff
  account name, not patient data, but still improperly exposed).
- **`Authentication_model.php::verifyUser()` contains a hardcoded
  authentication bypass**: it accepts any login where the username/password
  match `TEMP_USERNAME`/`TEMP_PASSWORD` constants defined in
  `application/config/constants.php` (base64-obscured, trivially reversible),
  short-circuiting the real per-clinic user database check entirely. Because
  this is baked into the shipped config rather than generated per install,
  it most likely works against every EzDent-i/EzWebServer deployment running
  this version — not just this test machine. **This was deliberately not
  used** beyond confirming it exists; the plaintext values are intentionally
  omitted from this document. Report this to Vatech.

## 3. Login actually needs AppLogInR2, not LogIn — found 2026-08-15

Section 2's `LogIn` (`/auth/login`) endpoint, above, turned out to reject a
**real, freshly-created EzDent-i account** outright (`errorCode -8001001,
"Invalid user name or password"`) — confirmed the credential itself was
correct by logging into EzDent-i's own desktop client with it successfully
first. Checked `EzWebServer/logs/access.log` for what the desktop client
itself calls to log in: `POST /api/v1/auth/apploginr2`, not `/auth/login`.

`Auth.php` has three login actions: `LogIn_post` (v1, section 2 above),
`appLogin_post`, and `AppLogInR2_post` — the last is what EzDent-i actually
uses, and it's a **completely different wire format**, reverse-engineered
from `AuthenticationR2_model.php` / `AuthenticationHelper.php` /
`Authentication_model.php`'s private `decrypt()`:

- Cipher: **plain AES-128-CBC** (not Rijndael-256) — key
  `fCVpkpDy3QII1bJ0uklkvQ==`, IV `p+O8XWH7eWQw1xifYtxx5Q==` (both base64,
  both fixed/shared across installs same as the v1 constants).
- Padding: ISO/IEC 7816-4 ("one and zeros" — one `0x80` byte, then zeros to
  the block size), not zero-padding.
- Plaintext is **JSON**, not a colon-joined string:
  ```json
  {"ver": "1.0.0", "client": {"name": "...", "ver": "..."},
   "auth": {"enc": "b64", "usr": "<base64 username>", "sec": "<base64 password>", "exp": <unix ts>}}
  ```
- No 5-byte magic header this time — `decrypt_data()` just
  `json_decode()`s the raw AES-CBC-decrypted bytes directly.

Verified end-to-end 2026-08-15 against the real server with a real account
(created via EzDent-i's own Settings > Environment > General > USER ACCOUNT
MANAGER, password reset to a value meeting the complexity policy): login
succeeds (`errorCode: 0`, real JWT returned), and that JWT works unchanged
against every other endpoint (`list_images_for_chart`,
`patient_exists`, ...) — they only care about the Bearer token, not which
login endpoint issued it.

Implemented in `agent/vatech_rest.py`: `login()` now tries `AppLogInR2`
first (`_login_r2`) and falls back to the older `v1` endpoint (`_login_v1`)
only on HTTP 404 — an EzWebServer version old enough not to have R2 at all.
A genuine credential failure on R2 is surfaced immediately rather than
retried against v1, since the same credentials failing there wouldn't
suddenly succeed on the older endpoint.

New dependency: `cryptography` (standard AES-128-CBC is directly supported;
no reason to hand-roll it the way the non-standard 256-bit-block Rijndael
variant in section 2 needed to be).

## What's left

Just configuration: set `DENTC_AGENT_VATECH_REST_USERNAME`/`_PASSWORD` (see
`imaging-agent/README.md`, or the `.env` file it also supports) to a real
EzDent-i login for whichever clinic runs this agent — created via EzDent-i's
own Settings > Environment > General > USER ACCOUNT MANAGER, *not* the
software's activation/license code, which is an unrelated credential.
Nothing further to implement — `launch_patient()` already tries REST
creation first and falls back to plain chart_no focus if credentials are
unset or the REST call fails for any reason, and `login()` now finds
whichever of the two login endpoints this install actually supports.

Separately: the hardcoded backdoor credential and shared JWT secret should
be reported to Vatech as a security vulnerability, independent of whether
this integration ships.
