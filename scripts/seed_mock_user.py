#!/usr/bin/env python3
"""
Seed a fully-populated mock user (Security -> Users) for manual testing.

Mirrors the sample "Uday Krishna" screen. Resolves office / group / role IDs by name
at runtime against the running backend, creates any missing user-groups, then POSTs
POST /api/v1/users/complete in one transaction.

Usage (backend must be running, default http://127.0.0.1:8000):
    python scripts/seed_mock_user.py --user shravan --pass 'YOUR_PASSWORD'
    # or:  DENTC_USER=shravan DENTC_PASS=... python scripts/seed_mock_user.py

Only fields the user contract supports are sent. Fields with no contract (Short ID,
Report Access Provider, Custom Fields, Signature, User Image) are documented in
docs/security/users/users_missing_fields_devreport.md. Preference-storable extras
(toolbar, perio_setup_template, production_view, show_production_colors) ARE seeded as
preference keys so the user round-trips them.
"""
import argparse
import json
import os
import sys
import urllib.error
import urllib.request

# ---- sample user (edit here to taste) -------------------------------------------
USERNAME = "udayk"
EMAIL = "social@exceldentalpc.com"
FIRST_NAME = "Uday"
LAST_NAME = "Krishna"
PHONE = None
PASSWORD = "Test@12345"  # >= 8 chars; change after first login
SHORT_ID = "KRIUDA"
CUSTOM_1 = "Custom 1"
CUSTOM_2 = "Custom 2"
# 1x1 transparent PNG data-URL, standing in for a Topaz signature capture.
SIGNATURE_DATA = (
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwC"
    "AAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
)
ROLE_LABEL = "Front Desk"
PATIENT_ACCESS_HINT = "all"  # match the "all offices" access level by label
HOME_OFFICE = "Cranberry Dental Arts"
ASSIGNED_OFFICES = [
    "Brookline Family Dentistry",
    "Cranberry Dental Arts",
    "Excel Dental",
    "Excel Dental - Wexford",
    "Excel Dental Of Greentree Inc",
    "Excel Dental- Langhorne",
    "Excel Dental- Moon",
    "Excel Dental- Moon, PA",
    "Excel Dental- Pittsburgh, PA",
    "Hamilton Dental Care",
    "McCandless Family Dentistry",
    "McMurray Dental Care, P.C",
    "Robinson Dental Care, P.C",
    "Wexford Smiles Dentistry",
]
GROUPS = ["Administrators", "Office Manager", "Clerical", "Administrators 2", "FrontDesk", "Billing"]
OVERTIME_LABEL = "Daily"
PREFERENCES = {
    "startup_screen": "My Page",
    "toolbar": "Front Desk",
    "perio_setup_template": "Default Template",
    "default_perio_screen": "Data Entry",
    "default_navigation_search": "Patient",
    "production_view": "false",
    "show_production_colors": "false",
    "print_labels": "false",
    "prompt_entry_date": "false",
    "hide_provider_time": "false",
    "default_search_by": "Patient Last Name",
    "default_referral_view": "Internal-Incoming",
    "include_inactive_patients": "false",
    "is_ortho_assistant": "false",
    "hipaa_compliant_scheduler": "false",
}
LOGIN_RESTRICTIONS = {
    "is_24_7": False,
    "allowed_days": "Sun,Mon,Tue,Wed,Thu,Fri,Sat",
    "start_time": "00:00:00",
    "end_time": "23:55:00",
}
TIME_CLOCK = {"pay_rate": "0.00", "overtime_method": None, "overtime_rate": "0.00", "clock_in_required": False}
# ---------------------------------------------------------------------------------


def req(method, base, path, token=None, body=None):
    url = f"{base}{path}"
    data = json.dumps(body).encode() if body is not None else None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    r = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r) as resp:
            raw = resp.read().decode()
            return resp.status, (json.loads(raw) if raw else None)
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            return e.code, json.loads(raw)
        except Exception:
            return e.code, raw


def items(payload):
    if isinstance(payload, dict) and "items" in payload:
        return payload["items"]
    return payload or []


def norm(s):
    return (s or "").strip().lower()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default=os.environ.get("DENTC_API", "http://127.0.0.1:8000/api/v1"))
    ap.add_argument("--user", default=os.environ.get("DENTC_USER", "shravan"))
    ap.add_argument("--pass", dest="password", default=os.environ.get("DENTC_PASS"))
    args = ap.parse_args()
    if not args.password:
        sys.exit("Provide the login password via --pass or DENTC_PASS")

    base = args.base.rstrip("/")

    # 1) login
    st, tok = req("POST", base, "/auth/login", body={"username": args.user, "password": args.password})
    if st != 200 or not isinstance(tok, dict) or "access_token" not in tok:
        sys.exit(f"Login failed ({st}): {tok}")
    token = tok["access_token"]
    print(f"✓ Logged in as {args.user}")

    # 2) lookups
    _, offices = req("GET", base, "/offices?size=200", token)
    _, groups = req("GET", base, "/user-groups?size=200", token)
    _, roles = req("GET", base, "/roles", token)
    _, meta = req("GET", base, "/users/setup-metadata", token)
    _, providers = req("GET", base, "/providers?size=200", token)
    provider_id = items(providers)[0]["id"] if items(providers) else None

    office_by_name = {norm(o["name"]): o["id"] for o in items(offices)}
    group_by_name = {norm(g["name"]): g["id"] for g in items(groups)}
    role_opts = roles if isinstance(roles, list) else []
    access_opts = (meta or {}).get("patient_access_levels", [])
    ot_opts = (meta or {}).get("overtime_methods", [])

    def pick(opts, label, contains=False, default=None):
        for o in opts:
            lbl, val = norm(o.get("label")), o.get("value")
            if (contains and norm(label) in lbl) or (not contains and lbl == norm(label)):
                return val
        return default

    role = pick(role_opts, ROLE_LABEL, default="front_desk")
    access = pick(access_opts, PATIENT_ACCESS_HINT, contains=True, default=(access_opts[0]["value"] if access_opts else None))
    overtime = pick(ot_opts, OVERTIME_LABEL, default="daily")

    # 3) home + assigned office ids
    home_id = office_by_name.get(norm(HOME_OFFICE))
    if home_id is None:
        sys.exit(f"Home office '{HOME_OFFICE}' not found. Available: {sorted(o['name'] for o in items(offices))}")
    assigned_ids, missing_off = [], []
    for name in ASSIGNED_OFFICES:
        oid = office_by_name.get(norm(name))
        (assigned_ids.append(oid) if oid is not None else missing_off.append(name))
    if home_id not in assigned_ids:
        assigned_ids.append(home_id)

    # 4) group ids (create any missing)
    group_ids = []
    for name in GROUPS:
        gid = group_by_name.get(norm(name))
        if gid is None:
            st, created = req("POST", base, "/user-groups", token, {"name": name, "is_active": True})
            if st in (200, 201) and isinstance(created, dict):
                gid = created["id"]
                print(f"  + created group '{name}' (id {gid})")
            else:
                print(f"  ! could not create group '{name}' ({st}): {created}")
                continue
        group_ids.append(gid)

    # 5) build + post the compound payload
    TIME_CLOCK["overtime_method"] = overtime
    payload = {
        "email": EMAIL, "username": USERNAME, "password": PASSWORD,
        "first_name": FIRST_NAME, "last_name": LAST_NAME, "phone": PHONE,
        "role": role, "must_change_password": False,
        "patient_access_level": access,
        "short_id": SHORT_ID,
        "report_access_provider_id": provider_id,
        "custom_1": CUSTOM_1,
        "custom_2": CUSTOM_2,
        "signature_data": SIGNATURE_DATA,
        "home_office_id": home_id,
        "assigned_offices": assigned_ids,
        "group_ids": group_ids,
        "ip_rules": [],
        "login_restrictions": LOGIN_RESTRICTIONS,
        "time_clock": TIME_CLOCK,
        "preferences": PREFERENCES,
    }
    # Upsert: if the username already exists, PUT /users/{id}/complete; else POST.
    _, existing = req("GET", base, f"/users?search={USERNAME}&size=50", token)
    match = next((u for u in items(existing) if norm(u.get("username")) == norm(USERNAME)), None)
    if match:
        uid = match["id"]
        st, res = req("PUT", base, f"/users/{uid}/complete", token, payload)
        action = "Updated"
    else:
        st, res = req("POST", base, "/users/complete", token, payload)
        uid = res.get("id") if isinstance(res, dict) else None
        action = "Created"
    if st not in (200, 201):
        print(json.dumps(payload, indent=2))
        sys.exit(f"\n✗ {action} failed ({st}): {res}")

    print(f"\n✓ {action} mock user '{USERNAME}' (id {uid}), password '{PASSWORD}'")
    print(f"  role={role}  access={access}  home_office={home_id}  "
          f"assigned={len(assigned_ids)}  groups={len(group_ids)}")
    if missing_off:
        print(f"  ! offices not found (skipped): {missing_off}")
    print("  Open Security → Users in the app and select this user to verify.")


if __name__ == "__main__":
    main()
