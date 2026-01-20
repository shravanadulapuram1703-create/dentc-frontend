# User Setup Metadata API Contract

This document defines the API contract for the `/api/v1/users/setup` endpoint used by the Add/Edit User modal to fetch metadata and configuration options.

---

## GET /api/v1/users/setup

**Purpose:** Fetch all metadata, configuration options, and reference data needed to populate the Add/Edit User form. This includes offices, roles, security groups, time clock settings, and user preference options.

### Request

**Method:** `GET`

**Endpoint:** `/api/v1/users/setup`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Query Parameters:** None

**Note:** The endpoint should return data scoped to the authenticated user's tenant/organization context.

### Response

**Status Code:** `200 OK`

**Response Body Schema:**
```json
{
  "organization": {
    "pgid": "P-1",
    "pgid_name": "Cranberry Dental Arts Corp",
    "tenant_id": "1"
  },
  "offices": [
    {
      "office_id": 5,
      "office_oid": "O-5",
      "office_name": "Main Office",
      "is_active": true
    },
    {
      "office_id": 7,
      "office_oid": "O-7",
      "office_name": "Branch Office",
      "is_active": true
    }
  ],
  "security_groups": [
    {
      "code": "CLINICAL_STAFF",
      "name": "Clinical Staff",
      "description": "Clinical staff members with patient care access"
    },
    {
      "code": "FRONT_DESK",
      "name": "Front Desk",
      "description": "Front desk and administrative staff"
    },
    {
      "code": "BILLING",
      "name": "Billing",
      "description": "Billing and financial staff"
    }
  ],
  "roles": [
    {
      "code": "DENTIST",
      "label": "Dentist"
    },
    {
      "code": "HYGIENIST",
      "label": "Hygienist"
    },
    {
      "code": "ASSISTANT",
      "label": "Dental Assistant"
    },
    {
      "code": "ADMIN",
      "label": "Administrator"
    }
  ],
  "patient_access_levels": [
    {
      "code": "all",
      "label": "Search patients in all offices"
    },
    {
      "code": "assigned",
      "label": "Search patients in assigned offices only"
    }
  ],
  "time_clock": {
    "enabled": true,
    "overtime_methods": [
      {
        "code": "daily",
        "label": "Daily"
      },
      {
        "code": "weekly",
        "label": "Weekly"
      },
      {
        "code": "none",
        "label": "None"
      }
    ],
    "overtime_rates": [
      {
        "value": 1.0,
        "label": "1.0x (Regular Rate)"
      },
      {
        "value": 1.5,
        "label": "1.5x (Time and a Half)"
      },
      {
        "value": 2.0,
        "label": "2.0x (Double Time)"
      }
    ]
  },
  "login_restrictions": {
    "allow_24x7_default": true,
    "allowed_days": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    "default_allowed_from": "08:00",
    "default_allowed_until": "18:00"
  },
  "user_preferences_schema": {
    "startup_screen": {
      "options": ["Dashboard", "Scheduler", "Patient"]
    },
    "default_perio_screen": {
      "options": ["Standard", "Advanced"]
    },
    "default_navigation_search": {
      "options": ["Patient", "Appointment", "Claim"]
    },
    "default_search_by": {
      "options": ["lastName", "firstName", "patientId", "chartNumber"]
    },
    "default_referral_view": {
      "options": ["All", "Active", "Pending"]
    },
    "flags": {
      "show_production_view": true,
      "hide_provider_time": false,
      "print_labels": false,
      "prompt_entry_date": false,
      "include_inactive_patients": false,
      "hipaa_compliant_scheduler": false,
      "is_ortho_assistant": false
    }
  }
}
```

### Field Descriptions

#### `organization` (object, required)
Organization context information for the current tenant.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `pgid` | string | Yes | Practice Group ID (e.g., "P-1") |
| `pgid_name` | string | Yes | Practice Group name |
| `tenant_id` | string | Yes | Numeric tenant ID as string |

#### `offices` (array, required)
List of all offices available for assignment. Should be filtered by the authenticated user's tenant/organization.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `office_id` | number | Yes | Numeric office ID (used for assignment) |
| `office_oid` | string | Yes | Office identifier (e.g., "O-5") |
| `office_name` | string | Yes | Office name for display |
| `is_active` | boolean | Yes | Whether the office is active |

#### `security_groups` (array, required)
List of all security groups available for assignment.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `code` | string | Yes | Security group code (used for assignment, e.g., "CLINICAL_STAFF") |
| `name` | string | Yes | Security group display name |
| `description` | string | No | Optional description of the security group |

#### `roles` (array, required)
List of all user roles available for assignment.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `code` | string | Yes | Role code (used for assignment, e.g., "DENTIST") |
| `label` | string | Yes | Role display label |

#### `patient_access_levels` (array, required)
Patient access level options.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `code` | string | Yes | Access level code: "all" or "assigned" |
| `label` | string | Yes | Display label for the access level |

#### `time_clock` (object, required)
Time clock configuration and options.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `enabled` | boolean | Yes | Whether time clock is enabled for the organization |
| `overtime_methods` | array | Yes | Available overtime calculation methods |
| `overtime_methods[].code` | string | Yes | Method code: "daily", "weekly", or "none" |
| `overtime_methods[].label` | string | Yes | Display label for the method |
| `overtime_rates` | array | Yes | Available overtime rate multipliers |
| `overtime_rates[].value` | number | Yes | Numeric multiplier value (e.g., 1.5) |
| `overtime_rates[].label` | string | Yes | Display label (e.g., "1.5x (Time and a Half)") |

#### `login_restrictions` (object, required)
Default login restriction settings.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `allow_24x7_default` | boolean | Yes | Default value for 24/7 access checkbox |
| `allowed_days` | array[string] | Yes | List of allowed day codes: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] |
| `default_allowed_from` | string | Yes | Default start time in HH:MM format (24-hour, e.g., "08:00") |
| `default_allowed_until` | string | Yes | Default end time in HH:MM format (24-hour, e.g., "18:00") |

#### `user_preferences_schema` (object, required)
Schema defining available options for user preferences.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `startup_screen.options` | array[string] | Yes | Available startup screen options |
| `default_perio_screen.options` | array[string] | Yes | Available perio screen options |
| `default_navigation_search.options` | array[string] | Yes | Available navigation search options |
| `default_search_by.options` | array[string] | Yes | Available search field options |
| `default_referral_view.options` | array[string] | Yes | Available referral view options |
| `flags` | object | Yes | Default values for boolean preference flags |
| `flags.show_production_view` | boolean | Yes | Default for show production view |
| `flags.hide_provider_time` | boolean | Yes | Default for hide provider time |
| `flags.print_labels` | boolean | Yes | Default for print labels |
| `flags.prompt_entry_date` | boolean | Yes | Default for prompt entry date |
| `flags.include_inactive_patients` | boolean | Yes | Default for include inactive patients |
| `flags.hipaa_compliant_scheduler` | boolean | Yes | Default for HIPAA compliant scheduler |
| `flags.is_ortho_assistant` | boolean | Yes | Default for is ortho assistant |

### Example Response

```json
{
  "organization": {
    "pgid": "P-1",
    "pgid_name": "Cranberry Dental Arts Corp",
    "tenant_id": "1"
  },
  "offices": [
    {
      "office_id": 5,
      "office_oid": "O-5",
      "office_name": "Main Office",
      "is_active": true
    },
    {
      "office_id": 7,
      "office_oid": "O-7",
      "office_name": "Branch Office",
      "is_active": true
    }
  ],
  "security_groups": [
    {
      "code": "CLINICAL_STAFF",
      "name": "Clinical Staff",
      "description": "Clinical staff members with patient care access"
    },
    {
      "code": "FRONT_DESK",
      "name": "Front Desk",
      "description": "Front desk and administrative staff"
    }
  ],
  "roles": [
    {
      "code": "DENTIST",
      "label": "Dentist"
    },
    {
      "code": "HYGIENIST",
      "label": "Hygienist"
    }
  ],
  "patient_access_levels": [
    {
      "code": "all",
      "label": "Search patients in all offices"
    },
    {
      "code": "assigned",
      "label": "Search patients in assigned offices only"
    }
  ],
  "time_clock": {
    "enabled": true,
    "overtime_methods": [
      {
        "code": "daily",
        "label": "Daily"
      },
      {
        "code": "weekly",
        "label": "Weekly"
      },
      {
        "code": "none",
        "label": "None"
      }
    ],
    "overtime_rates": [
      {
        "value": 1.0,
        "label": "1.0x (Regular Rate)"
      },
      {
        "value": 1.5,
        "label": "1.5x (Time and a Half)"
      },
      {
        "value": 2.0,
        "label": "2.0x (Double Time)"
      }
    ]
  },
  "login_restrictions": {
    "allow_24x7_default": true,
    "allowed_days": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    "default_allowed_from": "08:00",
    "default_allowed_until": "18:00"
  },
  "user_preferences_schema": {
    "startup_screen": {
      "options": ["Dashboard", "Scheduler", "Patient"]
    },
    "default_perio_screen": {
      "options": ["Standard", "Advanced"]
    },
    "default_navigation_search": {
      "options": ["Patient", "Appointment", "Claim"]
    },
    "default_search_by": {
      "options": ["lastName", "firstName", "patientId", "chartNumber"]
    },
    "default_referral_view": {
      "options": ["All", "Active", "Pending"]
    },
    "flags": {
      "show_production_view": true,
      "hide_provider_time": false,
      "print_labels": false,
      "prompt_entry_date": false,
      "include_inactive_patients": false,
      "hipaa_compliant_scheduler": false,
      "is_ortho_assistant": false
    }
  }
}
```

### Error Responses

**Status Code:** `401 Unauthorized`
```json
{
  "detail": "Unauthorized"
}
```

**Status Code:** `403 Forbidden`
```json
{
  "detail": "Insufficient permissions to access setup data"
}
```

**Status Code:** `500 Internal Server Error`
```json
{
  "detail": "Internal server error"
}
```

---

## Business Rules

1. **Tenant Scoping:**
   - All data should be scoped to the authenticated user's tenant/organization
   - Offices should only include offices accessible to the current tenant
   - Security groups and roles should be tenant-specific if multi-tenancy is supported

2. **Office Filtering:**
   - Only active offices should be returned by default
   - If inactive offices need to be included, add an optional query parameter `include_inactive=true`

3. **Security Groups and Roles:**
   - Should be ordered alphabetically by name/label for better UX
   - Codes should be unique within the tenant scope
   - Codes are used for assignment, names/labels are for display

4. **Time Clock:**
   - If `time_clock.enabled` is `false`, the time clock tab may be hidden or disabled in the UI
   - Overtime methods and rates should match the organization's payroll configuration

5. **Login Restrictions:**
   - `allowed_days` should include all 7 days of the week
   - Time format should be 24-hour (HH:MM)
   - Default times should reflect the organization's business hours

6. **User Preferences Schema:**
   - Options arrays should be non-empty
   - Flag defaults should reflect organization-wide defaults
   - Options should be ordered logically (most common first)

---

## Frontend Usage

The frontend uses this endpoint to:

1. **Populate Dropdowns:**
   - Office selection (available and assigned offices)
   - Security group selection
   - Role selection
   - Patient access level selection
   - Time clock overtime method and rate selection
   - All user preference dropdowns

2. **Display Organization Context:**
   - Show PGID and organization name in the form header

3. **Set Default Values:**
   - Use `login_restrictions` defaults for new users
   - Use `user_preferences_schema.flags` for default checkbox states
   - Use `user_preferences_schema.*.options[0]` for default dropdown selections

4. **Validation:**
   - Validate that selected offices exist in the `offices` array
   - Validate that selected roles exist in the `roles` array
   - Validate that selected security groups exist in the `security_groups` array

---

## Performance Considerations

1. **Caching:**
   - This endpoint can be cached for several minutes as metadata rarely changes
   - Consider implementing client-side caching with a TTL of 5-10 minutes

2. **Response Size:**
   - For large organizations with many offices, consider pagination or filtering
   - Typical response should be < 50KB

3. **Loading Strategy:**
   - Frontend should fetch this data when the modal opens
   - Show loading state while fetching
   - Handle errors gracefully with retry option

---

## Summary

**Endpoint:** `GET /api/v1/users/setup`

**Purpose:** Fetch all metadata and configuration options needed for the Add/Edit User form

**Key Data:**
- Organization context (PGID, name)
- Offices list (for assignment)
- Security groups (for assignment)
- Roles (for assignment)
- Patient access levels
- Time clock configuration and options
- Login restriction defaults
- User preferences schema and defaults

**Response Format:** snake_case

**Authentication:** Required (Bearer token)

**Scoping:** Tenant/organization-scoped based on authenticated user
