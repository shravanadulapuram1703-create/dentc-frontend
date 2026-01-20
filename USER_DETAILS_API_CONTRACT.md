# User Details API Contract

This document defines the API contracts for fetching complete user details in the View User Details modal. All endpoints should return data in snake_case format.

---

## Overview

The View User Details modal requires comprehensive user information across multiple domains:
- Core user profile
- Organization and office assignments
- Security settings and IP restrictions
- Group memberships
- Time clock configuration and entries
- User preferences

---

## 1. GET /api/v1/users/{userId}

**Purpose:** Fetch core user profile and basic information.

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
  "id": "U-123",
  "first_name": "John",
  "last_name": "Doe",
  "username": "jdoe",
  "email": "john.doe@example.com",
  "is_active": true,
  "last_login_at": "2024-01-20T14:30:00Z",
  "tenant_id": 1,
  "pgid": "P-1",
  "pgid_name": "Cranberry Dental Arts Corp",
  "home_office_id": 5,
  "home_office_name": "Main Office",
  "assigned_office_ids": [5, 7, 9],
  "assigned_office_names": ["Main Office", "Branch Office", "Clinic Office"],
  "role": "Dentist",
  "security_group": "Clinical Staff",
  "password_last_changed": "2024-01-15T10:00:00Z",
  "must_change_password": false,
  "account_locked_until": null,
  "failed_login_attempts": 0,
  "require_ip_check": true,
  "time_clock_enabled": true,
  "clock_in_required": true,
  "created_by": "admin",
  "created_at": "2023-06-01T09:00:00Z",
  "updated_by": "jdoe",
  "updated_at": "2024-01-20T14:30:00Z"
}
```

**Field Descriptions:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `user_id` | number | Yes | Numeric user ID |
| `id` | string | No | Formatted user ID (e.g., "U-123") |
| `first_name` | string | Yes | User's first name |
| `last_name` | string | Yes | User's last name |
| `username` | string | Yes | Unique username |
| `email` | string | Yes | User's email address |
| `is_active` | boolean | Yes | Whether the user account is active |
| `last_login_at` | string (ISO 8601) | No | Last login timestamp (null if never logged in) |
| `tenant_id` | number | Yes | Practice Group ID (numeric) |
| `pgid` | string | No | Formatted Practice Group ID (e.g., "P-1") |
| `pgid_name` | string | Yes | Practice Group name |
| `home_office_id` | number | Yes | Numeric home office ID |
| `home_office_name` | string | Yes | Home office name |
| `assigned_office_ids` | array[number] | Yes | Array of assigned office IDs (numeric) |
| `assigned_office_names` | array[string] | Yes | Array of assigned office names (matches IDs order) |
| `role` | string | Yes | User role/type |
| `security_group` | string | Yes | Primary security group name |
| `password_last_changed` | string (ISO 8601) | No | When password was last changed |
| `must_change_password` | boolean | Yes | Whether user must change password on next login |
| `account_locked_until` | string (ISO 8601) | No | Account lock expiration (null if not locked) |
| `failed_login_attempts` | number | Yes | Number of consecutive failed login attempts |
| `require_ip_check` | boolean | Yes | Whether IP restrictions are enforced |
| `time_clock_enabled` | boolean | Yes | Whether time clock is enabled for this user |
| `clock_in_required` | boolean | Yes | Whether clock-in is required |
| `created_by` | string | Yes | Username of user who created this account |
| `created_at` | string (ISO 8601) | Yes | Account creation timestamp |
| `updated_by` | string | No | Username of user who last updated (null if never updated) |
| `updated_at` | string (ISO 8601) | No | Last update timestamp (null if never updated) |

### Example Response

```json
{
  "user_id": 123,
  "id": "U-123",
  "first_name": "John",
  "last_name": "Doe",
  "username": "jdoe",
  "email": "john.doe@example.com",
  "is_active": true,
  "last_login_at": "2024-01-20T14:30:00Z",
  "tenant_id": 1,
  "pgid": "P-1",
  "pgid_name": "Cranberry Dental Arts Corp",
  "home_office_id": 5,
  "home_office_name": "Main Office",
  "assigned_office_ids": [5, 7, 9],
  "assigned_office_names": ["Main Office", "Branch Office", "Clinic Office"],
  "role": "Dentist",
  "security_group": "Clinical Staff",
  "password_last_changed": "2024-01-15T10:00:00Z",
  "must_change_password": false,
  "account_locked_until": null,
  "failed_login_attempts": 0,
  "require_ip_check": true,
  "time_clock_enabled": true,
  "clock_in_required": true,
  "created_by": "admin",
  "created_at": "2023-06-01T09:00:00Z",
  "updated_by": "jdoe",
  "updated_at": "2024-01-20T14:30:00Z"
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
  "detail": "Not authenticated"
}
```

**Status Code:** `403 Forbidden`
```json
{
  "detail": "Insufficient permissions to view user details"
}
```

---

## 2. GET /api/v1/users/{userId}/ip-rules

**Purpose:** Fetch permitted IP addresses for the user.

### Request

**Method:** `GET`

**Endpoint:** `/api/v1/users/{userId}/ip-rules`

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userId` | number | Yes | Numeric user ID |

### Response

**Status Code:** `200 OK`

**Response Body Schema:**
```json
[
  {
    "id": "IP-001",
    "ip_address": "192.168.1.100",
    "description": "Office Main Computer",
    "active": true,
    "created_at": "2024-01-10T08:00:00Z",
    "updated_at": "2024-01-10T08:00:00Z"
  }
]
```

**Field Descriptions:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | IP rule identifier |
| `ip_address` | string | Yes | IP address (IPv4 or IPv6) |
| `description` | string | No | Description/label for this IP |
| `active` | boolean | Yes | Whether this rule is active |
| `created_at` | string (ISO 8601) | Yes | When rule was created |
| `updated_at` | string (ISO 8601) | No | When rule was last updated |

### Example Response

```json
[
  {
    "id": "IP-001",
    "ip_address": "192.168.1.100",
    "description": "Office Main Computer",
    "active": true,
    "created_at": "2024-01-10T08:00:00Z",
    "updated_at": null
  },
  {
    "id": "IP-002",
    "ip_address": "10.0.0.50",
    "description": "Remote Workstation",
    "active": true,
    "created_at": "2024-01-15T10:00:00Z",
    "updated_at": "2024-01-16T14:00:00Z"
  }
]
```

**Note:** If no IP rules exist, return an empty array `[]`.

---

## 3. GET /api/v1/users/{userId}/groups

**Purpose:** Fetch security group memberships for the user.

### Request

**Method:** `GET`

**Endpoint:** `/api/v1/users/{userId}/groups`

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userId` | number | Yes | Numeric user ID |

### Response

**Status Code:** `200 OK`

**Response Body Schema:**
```json
[
  {
    "group_id": "GRP-001",
    "group_name": "Clinical Staff",
    "description": "Users with clinical access",
    "joined_date": "2023-06-01T09:00:00Z",
    "role": "Member"
  }
]
```

**Field Descriptions:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `group_id` | string | Yes | Group identifier |
| `group_name` | string | Yes | Group name |
| `description` | string | No | Group description |
| `joined_date` | string (ISO 8601) | Yes | When user joined this group |
| `role` | string | No | User's role within the group (e.g., "Member", "Admin") |

### Example Response

```json
[
  {
    "group_id": "GRP-001",
    "group_name": "Clinical Staff",
    "description": "Users with clinical access",
    "joined_date": "2023-06-01T09:00:00Z",
    "role": "Member"
  },
  {
    "group_id": "GRP-002",
    "group_name": "Scheduler Administrators",
    "description": "Users who can manage scheduler settings",
    "joined_date": "2024-01-10T08:00:00Z",
    "role": "Member"
  }
]
```

**Note:** If no group memberships exist, return an empty array `[]`.

---

## 4. GET /api/v1/users/{userId}/time-clock

**Purpose:** Fetch time clock configuration and recent time entries.

### Request

**Method:** `GET`

**Endpoint:** `/api/v1/users/{userId}/time-clock`

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userId` | number | Yes | Numeric user ID |

### Response

**Status Code:** `200 OK`

**Response Body Schema:**
```json
{
  "enabled": true,
  "clock_in_required": true,
  "recent_entries": [
    {
      "id": "TC-001",
      "date": "2024-01-20",
      "clock_in": "08:00:00",
      "clock_out": "17:00:00",
      "total_hours": "9.0",
      "notes": "Regular shift"
    }
  ]
}
```

**Field Descriptions:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `enabled` | boolean | Yes | Whether time clock is enabled |
| `clock_in_required` | boolean | Yes | Whether clock-in is required |
| `recent_entries` | array[object] | Yes | Recent time clock entries (last 10-20 entries) |

**Time Clock Entry Object:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Time entry identifier |
| `date` | string (YYYY-MM-DD) | Yes | Date of entry |
| `clock_in` | string (HH:MM:SS) | Yes | Clock-in time |
| `clock_out` | string (HH:MM:SS) | No | Clock-out time (null if not clocked out) |
| `total_hours` | string (decimal) | Yes | Total hours worked (e.g., "9.0", "8.5") |
| `notes` | string | No | Optional notes for the entry |

### Example Response

```json
{
  "enabled": true,
  "clock_in_required": true,
  "recent_entries": [
    {
      "id": "TC-001",
      "date": "2024-01-20",
      "clock_in": "08:00:00",
      "clock_out": "17:00:00",
      "total_hours": "9.0",
      "notes": "Regular shift"
    },
    {
      "id": "TC-002",
      "date": "2024-01-19",
      "clock_in": "08:30:00",
      "clock_out": "16:30:00",
      "total_hours": "8.0",
      "notes": null
    }
  ]
}
```

**Note:** If time clock is not enabled, return:
```json
{
  "enabled": false,
  "clock_in_required": false,
  "recent_entries": []
}
```

---

## 5. GET /api/v1/users/{userId}/preferences

**Purpose:** Fetch user preferences and settings.

### Request

**Method:** `GET`

**Endpoint:** `/api/v1/users/{userId}/preferences`

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userId` | number | Yes | Numeric user ID |

### Response

**Status Code:** `200 OK`

**Response Body Schema:**
```json
{
  "theme": "Light",
  "language": "en-US",
  "date_format": "MM/DD/YYYY",
  "time_format": "12-hour",
  "email_notifications": true,
  "sms_notifications": false,
  "default_view": "Dashboard",
  "startup_screen": "Dashboard",
  "items_per_page": 50
}
```

**Field Descriptions:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `theme` | string | No | UI theme (e.g., "Light", "Dark") |
| `language` | string | No | Language code (e.g., "en-US", "es-ES") |
| `date_format` | string | No | Date format preference (e.g., "MM/DD/YYYY", "DD/MM/YYYY") |
| `time_format` | string | No | Time format ("12-hour" or "24-hour") |
| `email_notifications` | boolean | No | Whether email notifications are enabled |
| `sms_notifications` | boolean | No | Whether SMS notifications are enabled |
| `default_view` | string | No | Default view/page on login |
| `startup_screen` | string | No | Startup screen preference (alias for default_view) |
| `items_per_page` | number | No | Default items per page for pagination |

### Example Response

```json
{
  "theme": "Light",
  "language": "en-US",
  "date_format": "MM/DD/YYYY",
  "time_format": "12-hour",
  "email_notifications": true,
  "sms_notifications": false,
  "default_view": "Dashboard",
  "startup_screen": "Dashboard",
  "items_per_page": 50
}
```

**Note:** If no preferences exist, return default values or an empty object `{}`.

---

## Error Handling

All endpoints should follow consistent error response formats:

### 404 Not Found
```json
{
  "detail": "Resource not found"
}
```

### 401 Unauthorized
```json
{
  "detail": "Not authenticated"
}
```

### 403 Forbidden
```json
{
  "detail": "Insufficient permissions"
}
```

### 500 Internal Server Error
```json
{
  "detail": "Internal server error"
}
```

---

## Frontend Integration

### Data Flow

1. **Modal Opens**: Frontend receives `userId` prop (e.g., "U-123")
2. **Extract ID**: Frontend extracts numeric ID (e.g., "123") from "U-123" format
3. **Parallel API Calls**: Frontend makes all 5 API calls in parallel using `Promise.allSettled()`
4. **Data Transformation**: Frontend maps snake_case API responses to camelCase for UI
5. **State Management**: Frontend stores transformed data in component state
6. **Display**: UI renders data across 5 tabs

### Field Mapping

The frontend handles both snake_case (preferred) and camelCase for backward compatibility:

| Frontend Field | API Field (Preferred) | API Field (Alternative) |
|----------------|----------------------|------------------------|
| `firstName` | `first_name` | `firstName` |
| `lastName` | `last_name` | `lastName` |
| `isActive` | `is_active` | `isActive` |
| `lastLogin` | `last_login_at` | `lastLogin` |
| `homeOffice` | `home_office_name` | `homeOffice` |
| `homeOfficeOID` | `home_office_id` | `homeOfficeOID` |
| `assignedOfficeOIDs` | `assigned_office_ids` | `assignedOfficeOIDs` |
| `timeClockEnabled` | `time_clock_enabled` | `timeClockEnabled` |
| `clockInRequired` | `clock_in_required` | `clockInRequired` |

---

## Summary

- **GET /api/v1/users/{userId}**: Core user profile with all basic information
- **GET /api/v1/users/{userId}/ip-rules**: Permitted IP addresses
- **GET /api/v1/users/{userId}/groups**: Security group memberships
- **GET /api/v1/users/{userId}/time-clock**: Time clock config and recent entries
- **GET /api/v1/users/{userId}/preferences**: User preferences and settings

All endpoints:
- Use numeric `userId` in path (extracted from "U-123" format)
- Return snake_case field names
- Return ISO 8601 timestamps with timezone
- Support empty arrays/objects for missing data
- Include proper error responses
- Require authentication (Bearer token)
