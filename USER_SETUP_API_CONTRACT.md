# User Setup API Contract

This document defines the API contracts for the User Setup page endpoints. These endpoints are used to fetch lists of tenants, offices, and users.

---

## 1. GET /api/v1/users/all-tenants

**Purpose:** Fetch list of all practice groups (tenants) available to the current user.

### Request

**Method:** `GET`

**Endpoint:** `/api/v1/users/all-tenants`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tenant_id` | number | No* | Filter by specific tenant ID. If omitted, returns all tenants accessible to the current user. |
| `organization_id` | number | No* | Alternative to tenant_id. Filter by organization ID. |

\* **Note:** At least one of `tenant_id` or `organization_id` should be provided if the backend requires tenant scoping. If neither is provided, the backend should use the tenant from the authenticated user's token.

### Response

**Status Code:** `200 OK`

**Response Body Schema:**
```json
[
  {
    "id": 1,
    "name": "Cranberry Dental Arts Corp",
    "code": "PG-001"
  }
]
```

**Field Descriptions:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | number | Yes | Numeric tenant/practice group ID |
| `name` | string | Yes | Practice group name |
| `code` | string | No | Practice group code |

### Example Response

```json
[
  {
    "id": 1,
    "name": "Cranberry Dental Arts Corp",
    "code": "PG-001"
  },
  {
    "id": 2,
    "name": "Pittsburgh Dental Group",
    "code": "PG-002"
  }
]
```

### Error Responses

**Status Code:** `422 Unprocessable Entity`
```json
{
  "detail": [
    {
      "loc": ["query", "tenant_id"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

**Note:** If `tenant_id` is required, the backend should accept it from:
1. Query parameter `tenant_id`
2. Query parameter `organization_id` (as alias)
3. Authenticated user's token context (preferred fallback)

---

## 2. GET /api/v1/users/all-offices

**Purpose:** Fetch list of all offices available to the current user.

### Request

**Method:** `GET`

**Endpoint:** `/api/v1/users/all-offices`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tenant_id` | number | No* | Filter by specific tenant ID. If omitted, returns all offices accessible to the current user. |
| `organization_id` | number | No* | Alternative to tenant_id. Filter by organization ID. |
| `office_id` | number | No | Filter by specific office ID. |

\* **Note:** At least one of `tenant_id` or `organization_id` should be provided if the backend requires tenant scoping. If neither is provided, the backend should use the tenant from the authenticated user's token.

### Response

**Status Code:** `200 OK`

**Response Body Schema:**
```json
[
  {
    "id": 5,
    "officeId": 5,
    "officeCode": "O-5",
    "officeName": "Main Office",
    "city": "San Francisco",
    "state": "CA",
    "phone1": "(555) 123-4567",
    "tenantId": 1,
    "timezone": "America/Los_Angeles",
    "isActive": true,
    "createdAt": "2023-06-01T09:00:00Z",
    "updatedAt": "2024-01-20T14:30:00Z"
  }
]
```

**Field Descriptions:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | number | Yes | Numeric office ID |
| `officeId` | number | Yes | Numeric office ID (duplicate of id) |
| `officeCode` | string | No | Office code (e.g., "O-5") |
| `officeName` | string | Yes | Office name |
| `city` | string | Yes | City name |
| `state` | string | Yes | State code (2 letters) |
| `phone1` | string | Yes | Primary phone number |
| `tenantId` | number | Yes | Tenant/Practice Group ID |
| `timezone` | string | Yes | Timezone (e.g., "America/Los_Angeles") |
| `isActive` | boolean | Yes | Whether the office is active |
| `createdAt` | string (ISO 8601) | Yes | Creation timestamp |
| `updatedAt` | string (ISO 8601) | Yes | Last update timestamp |

### Example Response

```json
[
  {
    "id": 5,
    "officeId": 5,
    "officeCode": "O-5",
    "officeName": "Main Office",
    "city": "San Francisco",
    "state": "CA",
    "phone1": "(555) 123-4567",
    "tenantId": 1,
    "timezone": "America/Los_Angeles",
    "isActive": true,
    "createdAt": "2023-06-01T09:00:00Z",
    "updatedAt": "2024-01-20T14:30:00Z"
  },
  {
    "id": 7,
    "officeId": 7,
    "officeCode": "O-7",
    "officeName": "Branch Office",
    "city": "Los Angeles",
    "state": "CA",
    "phone1": "(555) 987-6543",
    "tenantId": 1,
    "timezone": "America/Los_Angeles",
    "isActive": true,
    "createdAt": "2023-07-15T10:00:00Z",
    "updatedAt": "2024-01-18T11:00:00Z"
  }
]
```

### Error Responses

**Status Code:** `422 Unprocessable Entity`
```json
{
  "detail": [
    {
      "loc": ["query", "tenant_id"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

---

## 3. GET /api/v1/users/list-with-home-office

**Purpose:** Fetch list of all users with their home office information.

### Request

**Method:** `GET`

**Endpoint:** `/api/v1/users/list-with-home-office`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tenant_id` | number | No* | Filter by specific tenant ID. If omitted, returns all users accessible to the current user. |
| `organization_id` | number | No* | Alternative to tenant_id. Filter by organization ID. |
| `office_id` | number | No | Filter by specific office ID (returns users assigned to that office). |

\* **Note:** At least one of `tenant_id` or `organization_id` should be provided if the backend requires tenant scoping. If neither is provided, the backend should use the tenant from the authenticated user's token.

### Response

**Status Code:** `200 OK`

**Response Body Schema:**
```json
[
  {
    "user_id": 123,
    "first_name": "John",
    "last_name": "Doe",
    "username": "jdoe",
    "email": "john.doe@example.com",
    "is_active": true,
    "pgid": 1,
    "pgid_name": "Cranberry Dental Arts Corp",
    "home_office_id": 5,
    "home_office_name": "Main Office",
    "assigned_office_ids": [5, 7, 9],
    "assigned_office_names": ["Main Office", "Branch Office", "Clinic Office"],
    "role": "Dentist",
    "security_group": "Clinical Staff",
    "last_login_at": "2024-01-20T14:30:00Z",
    "created_at": "2023-06-01T09:00:00Z",
    "updated_at": "2024-01-20T14:30:00Z",
    "updated_by": "jdoe"
  }
]
```

**Field Descriptions:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `user_id` | number | Yes | Numeric user ID |
| `first_name` | string | Yes | User's first name |
| `last_name` | string | Yes | User's last name |
| `username` | string | Yes | Unique username |
| `email` | string | Yes | User's email address |
| `is_active` | boolean | Yes | Whether the user account is active |
| `pgid` | number | Yes | Practice Group ID (numeric) |
| `pgid_name` | string | Yes | Practice Group name |
| `home_office_id` | number | Yes | Numeric home office ID |
| `home_office_name` | string | Yes | Home office name |
| `assigned_office_ids` | array[number] | Yes | Array of assigned office IDs (numeric) |
| `assigned_office_names` | array[string] | Yes | Array of assigned office names (matches IDs order) |
| `role` | string | Yes | User role/type |
| `security_group` | string | Yes | Primary security group name |
| `last_login_at` | string (ISO 8601) | No | Last login timestamp (null if never logged in) |
| `created_at` | string (ISO 8601) | Yes | Account creation timestamp |
| `updated_at` | string (ISO 8601) | Yes | Last update timestamp |
| `updated_by` | string | No | Username of user who last updated |

### Example Response

```json
[
  {
    "user_id": 123,
    "first_name": "John",
    "last_name": "Doe",
    "username": "jdoe",
    "email": "john.doe@example.com",
    "is_active": true,
    "pgid": 1,
    "pgid_name": "Cranberry Dental Arts Corp",
    "home_office_id": 5,
    "home_office_name": "Main Office",
    "assigned_office_ids": [5, 7],
    "assigned_office_names": ["Main Office", "Branch Office"],
    "role": "Dentist",
    "security_group": "Clinical Staff",
    "last_login_at": "2024-01-20T14:30:00Z",
    "created_at": "2023-06-01T09:00:00Z",
    "updated_at": "2024-01-20T14:30:00Z",
    "updated_by": "jdoe"
  },
  {
    "user_id": 124,
    "first_name": "Jane",
    "last_name": "Smith",
    "username": "jsmith",
    "email": "jane.smith@example.com",
    "is_active": true,
    "pgid": 1,
    "pgid_name": "Cranberry Dental Arts Corp",
    "home_office_id": 7,
    "home_office_name": "Branch Office",
    "assigned_office_ids": [7],
    "assigned_office_names": ["Branch Office"],
    "role": "Hygienist",
    "security_group": "Clinical Staff",
    "last_login_at": null,
    "created_at": "2024-01-15T10:00:00Z",
    "updated_at": "2024-01-15T10:00:00Z",
    "updated_by": "admin"
  }
]
```

### Error Responses

**Status Code:** `422 Unprocessable Entity`
```json
{
  "detail": [
    {
      "loc": ["query", "tenant_id"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

---

## Backend Implementation Recommendations

### Option 1: Require tenant_id in Query (Current Issue)

If the backend requires `tenant_id` as a query parameter:

1. **Accept from query parameter**: `?tenant_id=1`
2. **Extract from token**: If not provided, extract from JWT token's `tenant_id` or `organization_id` claim
3. **Return 422 if missing**: Only if neither query param nor token contains tenant_id

### Option 2: Extract from Token (Recommended)

The backend should extract `tenant_id` from the authenticated user's JWT token:

```python
# Pseudo-code
@router.get("/api/v1/users/all-tenants")
async def get_all_tenants(
    request: Request,
    tenant_id: Optional[int] = None  # Optional query param
):
    # Extract from token if not in query
    if not tenant_id:
        token_tenant_id = request.state.user.tenant_id  # From JWT
        tenant_id = token_tenant_id
    
    # Use tenant_id for filtering/authorization
    ...
```

### Option 3: Make tenant_id Optional (Flexible)

Allow the endpoint to work with or without `tenant_id`:

- **With tenant_id**: Filter results to that tenant
- **Without tenant_id**: Return all tenants accessible to the authenticated user based on their permissions

---

## Frontend Implementation

The frontend now:
1. Extracts `tenant_id` from `currentOrganization` (from AuthContext)
2. Passes it as query parameter: `?tenant_id=1`
3. Falls back to no parameter if extraction fails
4. Handles errors gracefully

### Example API Calls

```typescript
// With tenant_id
api.get("/api/v1/users/all-tenants", { 
  params: { tenant_id: "1" } 
})

// Without tenant_id (backend should use token)
api.get("/api/v1/users/all-tenants")
```

---

## Summary

**Endpoints:**
- `GET /api/v1/users/all-tenants` - List all tenants
- `GET /api/v1/users/all-offices` - List all offices
- `GET /api/v1/users/list-with-home-office` - List all users with home office

**Common Issues:**
- **422 Error**: Backend expects `tenant_id` query parameter but frontend might not be sending it
- **Solution Options:**
  1. Frontend sends `tenant_id` (✅ Already implemented)
  2. Backend extracts `tenant_id` from JWT token (Recommended)
  3. Make `tenant_id` optional and use token-based filtering

**Recommendation:** Backend should extract `tenant_id` from the JWT token if not provided in query params to avoid 422 errors and improve security.
