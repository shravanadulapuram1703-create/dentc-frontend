# Add/Edit User API Contract

This document defines the API contracts for creating and updating users in the Add/Edit User modal. All endpoints should accept and return data in snake_case format.

---

## Overview

The Add/Edit User modal requires three main API endpoints:
1. **GET /api/v1/users/{userId}** - Fetch user details for editing
2. **POST /api/v1/users** - Create a new user
3. **PUT /api/v1/users/{userId}** - Update an existing user

---

## 1. GET /api/v1/users/{userId}

**Purpose:** Fetch complete user details for editing in the Add/Edit User modal.

### Request

**Method:** `GET`

**Endpoint:** `/api/v1/users/{userId}`

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userId` | number | Yes | Numeric user ID (extracted from "U-123" format) |

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

### Response

**Status Code:** `200 OK`

**Response Body Schema:**
```json
{
  "user_id": 123,
  "username": "jdoe",
  "first_name": "John",
  "last_name": "Doe",
  "email": "john.doe@example.com",
  "phone": "(555) 123-4567",
  "is_active": true,
  "home_office_id": 5,
  "assigned_offices": [5, 7, 9],
  "roles": ["Dentist"],
  "security_groups": ["Clinical Staff", "Front Desk"],
  "group_memberships": ["GRP-001", "GRP-002"],
  "permitted_ips": ["192.168.1.1", "10.0.0.0/24"],
  "patient_access_level": "all",
  "login_restrictions": {
    "use_24x7_access": true,
    "allowed_days": null,
    "allowed_from": null,
    "allowed_until": null
  },
  "time_clock": {
    "pay_rate": 75.00,
    "overtime_method": "daily",
    "overtime_rate": 1.5
  },
  "preferences": {
    "startup_screen": "Dashboard",
    "default_perio_screen": "Standard",
    "default_navigation_search": "Patient",
    "default_search_by": "lastName",
    "default_referral_view": "All",
    "show_production_view": true,
    "hide_provider_time": false,
    "print_labels": false,
    "prompt_entry_date": false,
    "include_inactive_patients": false,
    "hipaa_compliant_scheduler": false,
    "is_ortho_assistant": false
  }
}
```

**Field Descriptions:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `user_id` | number | Yes | Numeric user ID |
| `username` | string | Yes | Unique username |
| `first_name` | string | Yes | User's first name |
| `last_name` | string | Yes | User's last name |
| `email` | string | Yes | User's email address |
| `phone` | string | No | User's phone number (nullable) |
| `is_active` | boolean | Yes | Whether the user account is active |
| `home_office_id` | number | Yes | Numeric home office ID |
| `assigned_offices` | array[number] | Yes | Array of assigned office IDs (numeric) |
| `roles` | array[string] | Yes | Array of user roles (e.g., ["Dentist"]) |
| `security_groups` | array[string] | Yes | Array of security group codes |
| `permitted_ips` | array[string] | Yes | Array of permitted IP addresses/CIDR blocks |
| `patient_access_level` | string | No | Patient access level: "all" or "assigned". Default: "all" |
| `login_restrictions` | object | No | Login time restrictions configuration (nullable) |
| `login_restrictions.use_24x7_access` | boolean | No | If true, user can log in 24/7. If false, restrictions apply |
| `login_restrictions.allowed_days` | array[string] | No | Allowed days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]. Null if use_24x7_access is true |
| `login_restrictions.allowed_from` | string | No | Allowed login time from (HH:MM format). Null if use_24x7_access is true |
| `login_restrictions.allowed_until` | string | No | Allowed login time until (HH:MM format). Null if use_24x7_access is true |
| `time_clock` | object | No | Time clock configuration (nullable) |
| `time_clock.pay_rate` | number | No | Hourly pay rate (nullable) |
| `time_clock.overtime_method` | string | No | Overtime calculation method: "daily", "weekly", or "none" (nullable) |
| `time_clock.overtime_rate` | number | No | Overtime rate multiplier (e.g., 1.5 for time and a half, 2.0 for double time) (nullable) |
| `preferences` | object | No | User preferences object (nullable) |
| `preferences.startup_screen` | string | No | Default startup screen: "Dashboard", "Scheduler", or "Patient" |
| `preferences.default_perio_screen` | string | No | Default perio screen: "Standard" or "Advanced" |
| `preferences.default_navigation_search` | string | No | Default navigation search: "Patient", "Appointment", or "Claim" |
| `preferences.default_search_by` | string | No | Default search field: "lastName", "firstName", "patientId", or "chartNumber" |
| `preferences.default_referral_view` | string | No | Default referral view: "All", "Active", or "Pending" |
| `preferences.show_production_view` | boolean | No | Show production colors in appointments |
| `preferences.hide_provider_time` | boolean | No | Hide provider time in scheduler |
| `preferences.print_labels` | boolean | No | Print labels for appointments |
| `preferences.prompt_entry_date` | boolean | No | Prompt for entry date |
| `preferences.include_inactive_patients` | boolean | No | Include inactive patients in search |
| `preferences.hipaa_compliant_scheduler` | boolean | No | Enable HIPAA compliant scheduler view |
| `preferences.is_ortho_assistant` | boolean | No | Is orthodontic assistant |

### Example Response

```json
{
  "user_id": 123,
  "username": "jdoe",
  "first_name": "John",
  "last_name": "Doe",
  "email": "john.doe@example.com",
  "phone": "(555) 123-4567",
  "is_active": true,
  "home_office_id": 5,
  "assigned_offices": [5, 7],
  "roles": ["Dentist"],
  "security_groups": ["Clinical Staff"],
  "group_memberships": ["GRP-001"],
  "permitted_ips": ["192.168.1.1"],
  "patient_access_level": "all",
  "login_restrictions": {
    "use_24x7_access": true,
    "allowed_days": null,
    "allowed_from": null,
    "allowed_until": null
  },
  "time_clock": {
    "pay_rate": 75.00,
    "overtime_method": "daily",
    "overtime_rate": 1.5
  },
  "preferences": {
    "startup_screen": "Dashboard",
    "default_perio_screen": "Standard",
    "default_navigation_search": "Patient",
    "default_search_by": "lastName",
    "default_referral_view": "All",
    "show_production_view": true,
    "hide_provider_time": false,
    "print_labels": false,
    "prompt_entry_date": false,
    "include_inactive_patients": false,
    "hipaa_compliant_scheduler": false,
    "is_ortho_assistant": false
  }
}
```

### Error Responses

**Status Code:** `404 Not Found`
```json
{
  "detail": "User not found"
}
```

**Status Code:** `401 Unauthorized`
```json
{
  "detail": "Unauthorized"
}
```

**Status Code:** `403 Forbidden`
```json
{
  "detail": "Insufficient permissions to view user"
}
```

---

## 2. POST /api/v1/users

**Purpose:** Create a new user account.

### Request

**Method:** `POST`

**Endpoint:** `/api/v1/users`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body Schema:**
```json
{
  "username": "jdoe",
  "password": "SecurePassword123!",
  "first_name": "John",
  "last_name": "Doe",
  "email": "john.doe@example.com",
  "phone": "(555) 123-4567",
  "is_active": true,
  "home_office_id": 5,
  "assigned_offices": [5, 7, 9],
  "roles": ["Dentist"],
  "security_groups": ["Clinical Staff", "Front Desk"],
  "group_memberships": ["GRP-001", "GRP-002"],
  "permitted_ips": ["192.168.1.1", "10.0.0.0/24"],
  "patient_access_level": "all",
  "login_restrictions": {
    "use_24x7_access": true,
    "allowed_days": null,
    "allowed_from": null,
    "allowed_until": null
  },
  "time_clock": {
    "pay_rate": 75.00,
    "overtime_method": "daily",
    "overtime_rate": 1.5
  },
  "preferences": {
    "startup_screen": "Dashboard",
    "default_perio_screen": "Standard",
    "default_navigation_search": "Patient",
    "default_search_by": "lastName",
    "default_referral_view": "All",
    "show_production_view": true,
    "hide_provider_time": false,
    "print_labels": false,
    "prompt_entry_date": false,
    "include_inactive_patients": false,
    "hipaa_compliant_scheduler": false,
    "is_ortho_assistant": false
  }
}
```

**Field Descriptions:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `username` | string | Yes | Unique username (must be unique across system) |
| `password` | string | Yes | User password (min 8 chars, must meet security requirements) |
| `first_name` | string | Yes | User's first name |
| `last_name` | string | Yes | User's last name |
| `email` | string | Yes | Valid email address (must be unique) |
| `phone` | string | No | Phone number (nullable) |
| `is_active` | boolean | Yes | Whether account is active (default: true) |
| `home_office_id` | number | Yes | Numeric home office ID (must exist) |
| `assigned_offices` | array[number] | Yes | Array of assigned office IDs (must include home_office_id) |
| `roles` | array[string] | Yes | Array of role codes (must be valid roles, at least one required) |
| `security_groups` | array[string] | Yes | Array of security group codes (must be valid groups, at least one required) |
| `permitted_ips` | array[string] | No | Array of permitted IP addresses/CIDR blocks (empty = no restrictions) |
| `patient_access_level` | string | No | Patient access level: "all" (search all offices) or "assigned" (search assigned offices only). Default: "all" |
| `login_restrictions` | object | No | Login time restrictions configuration (nullable) |
| `login_restrictions.use_24x7_access` | boolean | No | If true, user can log in 24/7 with no restrictions. If false, use allowed_days, allowed_from, allowed_until |
| `login_restrictions.allowed_days` | array[string] | No | Array of allowed days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]. Null if use_24x7_access is true |
| `login_restrictions.allowed_from` | string | No | Allowed login time from (HH:MM format, e.g., "08:00"). Null if use_24x7_access is true |
| `login_restrictions.allowed_until` | string | No | Allowed login time until (HH:MM format, e.g., "18:00"). Null if use_24x7_access is true |
| `time_clock` | object | No | Time clock configuration (nullable) |
| `time_clock.pay_rate` | number | No | Hourly pay rate (nullable) |
| `time_clock.overtime_method` | string | No | Overtime method: "daily", "weekly", or "none" (nullable) |
| `time_clock.overtime_rate` | number | No | Overtime rate multiplier (e.g., 1.5 for time and a half, 2.0 for double time). Nullable |
| `preferences` | object | No | User preferences (nullable) |
| `preferences.*` | various | No | See GET response schema for preference fields |

### Validation Rules

1. **Username:**
   - Required
   - Must be unique
   - Min length: 3 characters
   - Max length: 50 characters
   - Alphanumeric and underscores only

2. **Password:**
   - Required for new users
   - Min length: 8 characters
   - Must contain at least one uppercase letter, one lowercase letter, and one number

3. **Email:**
   - Required
   - Must be valid email format
   - Must be unique

4. **Home Office:**
   - Required
   - Must be a valid office ID
   - Must be included in `assigned_offices` array

5. **Assigned Offices:**
   - Required (non-empty array)
   - Must include `home_office_id`
   - All office IDs must be valid

6. **Roles:**
   - Required (non-empty array)
   - All role codes must be valid
   - At least one role must be provided

7. **Security Groups:**
   - Required (non-empty array)
   - All group codes must be valid
   - At least one security group must be provided

8. **Patient Access Level:**
   - Optional
   - Must be "all" or "assigned"
   - Default: "all"

9. **Login Restrictions:**
   - Optional
   - If `use_24x7_access` is true, `allowed_days`, `allowed_from`, and `allowed_until` must be null
   - If `use_24x7_access` is false, `allowed_days` must be a non-empty array, and `allowed_from`/`allowed_until` must be valid time strings (HH:MM format)
   - `allowed_days` must contain valid day names: "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"

### Response

**Status Code:** `201 Created`

**Response Body Schema:**
```json
{
  "user_id": 124,
  "username": "jdoe",
  "first_name": "John",
  "last_name": "Doe",
  "email": "john.doe@example.com",
  "phone": "(555) 123-4567",
  "is_active": true,
  "home_office_id": 5,
  "assigned_offices": [5, 7, 9],
  "roles": ["Dentist"],
  "security_groups": ["Clinical Staff"],
  "permitted_ips": ["192.168.1.1"],
  "time_clock": {
    "pay_rate": 75.00,
    "overtime_method": "daily",
    "overtime_rate": 1.5
  },
  "preferences": {
    "startup_screen": "Dashboard",
    "default_perio_screen": "Standard",
    "default_navigation_search": "Patient",
    "default_search_by": "lastName",
    "default_referral_view": "All",
    "show_production_view": true,
    "hide_provider_time": false,
    "print_labels": false,
    "prompt_entry_date": false,
    "include_inactive_patients": false,
    "hipaa_compliant_scheduler": false,
    "is_ortho_assistant": false
  },
  "created_at": "2024-01-20T14:30:00Z",
  "created_by": "admin"
}
```

### Error Responses

**Status Code:** `422 Unprocessable Entity` (Validation Error)
```json
{
  "detail": [
    {
      "loc": ["body", "username"],
      "msg": "Username already exists",
      "type": "value_error"
    }
  ]
}
```

**Status Code:** `400 Bad Request` (Invalid Data)
```json
{
  "detail": "Invalid office ID: 999"
}
```

**Status Code:** `401 Unauthorized`
```json
{
  "detail": "Unauthorized"
}
```

**Status Code:** `403 Forbidden`
```json
{
  "detail": "Insufficient permissions to create users"
}
```

---

## 3. PUT /api/v1/users/{userId}

**Purpose:** Update an existing user account.

### Request

**Method:** `PUT`

**Endpoint:** `/api/v1/users/{userId}`

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userId` | number | Yes | Numeric user ID |

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body Schema:**
```json
{
  "username": "jdoe",
  "password": "NewSecurePassword123!",
  "first_name": "John",
  "last_name": "Doe",
  "email": "john.doe@example.com",
  "phone": "(555) 123-4567",
  "is_active": true,
  "home_office_id": 5,
  "assigned_offices": [5, 7, 9],
  "roles": ["Dentist"],
  "security_groups": ["Clinical Staff", "Front Desk"],
  "group_memberships": ["GRP-001", "GRP-002"],
  "permitted_ips": ["192.168.1.1", "10.0.0.0/24"],
  "patient_access_level": "assigned",
  "login_restrictions": {
    "use_24x7_access": false,
    "allowed_days": ["Mon", "Tue", "Wed", "Thu", "Fri"],
    "allowed_from": "08:00",
    "allowed_until": "18:00"
  },
  "time_clock": {
    "pay_rate": 80.00,
    "overtime_method": "weekly",
    "overtime_rate": 2.0
  },
  "preferences": {
    "startup_screen": "Scheduler",
    "default_perio_screen": "Advanced",
    "default_navigation_search": "Patient",
    "default_search_by": "lastName",
    "default_referral_view": "Active",
    "show_production_view": true,
    "hide_provider_time": true,
    "print_labels": true,
    "prompt_entry_date": true,
    "include_inactive_patients": false,
    "hipaa_compliant_scheduler": true,
    "is_ortho_assistant": true
  }
}
```

**Field Descriptions:**

Same as POST request, with the following differences:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `password` | string | No | Only include if user wants to change password. If omitted, password remains unchanged. |

### Validation Rules

Same as POST, except:
- `password` is optional (only required if changing password)
- `username` uniqueness check excludes current user
- `email` uniqueness check excludes current user

### Response

**Status Code:** `200 OK`

**Response Body Schema:**
Same as POST response, with additional fields:

```json
{
  "user_id": 123,
  "username": "jdoe",
  "first_name": "John",
  "last_name": "Doe",
  "email": "john.doe@example.com",
  "phone": "(555) 123-4567",
  "is_active": true,
  "home_office_id": 5,
  "assigned_offices": [5, 7, 9],
  "roles": ["Dentist"],
  "security_groups": ["Clinical Staff", "Front Desk"],
  "group_memberships": ["GRP-001", "GRP-002"],
  "permitted_ips": ["192.168.1.1", "10.0.0.0/24"],
  "time_clock": {
    "pay_rate": 80.00,
    "overtime_method": "weekly",
    "overtime_rate": 1.5
  },
  "preferences": {
    "startup_screen": "Scheduler",
    "default_perio_screen": "Advanced",
    "default_navigation_search": "Patient",
    "default_search_by": "lastName",
    "default_referral_view": "Active",
    "show_production_view": true,
    "hide_provider_time": true,
    "print_labels": true,
    "prompt_entry_date": true,
    "include_inactive_patients": false,
    "hipaa_compliant_scheduler": true,
    "is_ortho_assistant": false
  },
  "updated_at": "2024-01-20T15:45:00Z",
  "updated_by": "admin"
}
```

### Error Responses

**Status Code:** `404 Not Found`
```json
{
  "detail": "User not found"
}
```

**Status Code:** `422 Unprocessable Entity` (Validation Error)
```json
{
  "detail": [
    {
      "loc": ["body", "email"],
      "msg": "Email already exists",
      "type": "value_error"
    }
  ]
}
```

**Status Code:** `401 Unauthorized`
```json
{
  "detail": "Unauthorized"
}
```

**Status Code:** `403 Forbidden`
```json
{
  "detail": "Insufficient permissions to update user"
}
```

---

## Business Rules

1. **Password Handling:**
   - For **POST** (create): Password is required
   - For **PUT** (update): Password is optional. If provided, it will be updated. If omitted, password remains unchanged.

2. **Home Office Validation:**
   - `home_office_id` must be included in `assigned_offices` array
   - All office IDs must be valid and active

3. **Role and Security Group Validation:**
   - All role codes must exist in the system
   - All security group codes must exist in the system
   - At least one role and one security group must be provided

4. **IP Address Format:**
   - Accepts both single IP addresses (e.g., "192.168.1.1") and CIDR notation (e.g., "10.0.0.0/24")
   - Empty array means no IP restrictions (login from anywhere)

5. **Patient Access Level:**
   - Optional field, defaults to "all" if not provided
   - Must be either "all" or "assigned"
   - "all": User can search patients in all offices
   - "assigned": User can only search patients in assigned offices

6. **Login Time Restrictions:**
   - Optional field
   - If `use_24x7_access` is `true`:
     - `allowed_days`, `allowed_from`, and `allowed_until` must be `null`
     - User can log in at any time from any day
   - If `use_24x7_access` is `false`:
     - `allowed_days` must be a non-empty array containing valid day names: "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"
     - `allowed_from` and `allowed_until` must be valid time strings in HH:MM format (24-hour format)
     - `allowed_from` must be earlier than `allowed_until`
   - If `login_restrictions` object is omitted, defaults to 24/7 access

11. **Time Clock Configuration:**
   - If `time_clock` is provided, all fields are optional
   - `pay_rate` must be positive if provided
   - `overtime_rate` must be >= 1.0 if provided
   - `overtime_rate` is required if `overtime_method` is not "none"

12. **Preferences:**
   - All preference fields are optional
   - If `preferences` object is omitted, default preferences will be used
   - If `preferences` object is provided but some fields are missing, defaults will be used for missing fields
   - `default_referral_view` must be one of: "All", "Active", or "Pending"
   - `is_ortho_assistant` is a boolean flag indicating if user is an orthodontic assistant
   - `hipaa_compliant_scheduler` enables HIPAA-compliant scheduler view (hides patient names)

---

## Frontend Implementation Notes

1. **Mode Detection:**
   - Add mode: `editingUser` is `null` or `editingUser.user_id` is undefined
   - Edit mode: `editingUser.user_id` is a valid number

2. **Data Fetching:**
   - In edit mode, frontend calls `GET /api/v1/users/{userId}` to fetch user data
   - Frontend populates form fields with fetched data
   - Password field is left empty in edit mode (only populated if user wants to change it)

3. **Data Transformation:**
   - Frontend uses camelCase internally (e.g., `firstName`, `homeOffice`)
   - Frontend transforms to snake_case for API calls (e.g., `first_name`, `home_office_id`)
   - Backend returns snake_case, frontend transforms to camelCase for display

4. **Error Handling:**
   - Frontend displays validation errors inline
   - Frontend shows loading states during API calls
   - Frontend handles 404, 401, 403, and 422 errors gracefully

---

## Summary

**Endpoints:**
- `GET /api/v1/users/{userId}` - Fetch user for editing
- `POST /api/v1/users` - Create new user
- `PUT /api/v1/users/{userId}` - Update existing user

**Key Points:**
- All endpoints use snake_case for request/response
- Password is required for POST, optional for PUT
- Home office must be in assigned offices array
- All validation errors return 422 with detailed field-level messages
- Preferences and time_clock are optional objects
