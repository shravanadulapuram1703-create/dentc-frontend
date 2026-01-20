# Offices API Contract

This document defines the API contracts for the Offices Setup endpoints, including audit fields (created_by, created_date, modified_by, modified_at).

---

## 1. GET /api/v1/offices

**Purpose:** Fetch list of all offices with audit information.

### Request

**Method:** `GET`

**Endpoint:** `/api/v1/offices`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Query Parameters:** None

### Response

**Status Code:** `200 OK`

**Response Body Schema:**
```json
[
  {
    "id": "string",
    "officeId": 1,
    "officeName": "Main Street Dental",
    "shortId": "MSD",
    "city": "San Francisco",
    "state": "CA",
    "phone1": "(555) 123-4567",
    "isActive": true,
    "created_by": "admin",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_by": "jdoe",
    "updated_at": "2024-01-20T14:45:00Z"
  }
]
```

**Field Descriptions:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier for the office |
| `officeId` | number | Yes | Office ID (numeric) |
| `officeName` | string | Yes | Full name of the office |
| `shortId` | string | Yes | Short identifier (max 6 chars) |
| `city` | string | Yes | City name |
| `state` | string | Yes | State code (2 letters) |
| `phone1` | string | Yes | Primary phone number |
| `isActive` | boolean | Yes | Whether the office is active |
| `created_by` | string | Yes | Username of user who created the office |
| `created_at` | string (ISO 8601) | Yes | Timestamp when office was created |
| `updated_by` | string | No | Username of user who last updated the office (null if never updated) |
| `updated_at` | string (ISO 8601) | No | Timestamp when office was last updated (null if never updated) |

### Example Response

```json
[
  {
    "id": "OFF-001",
    "officeId": 1,
    "officeName": "Main Street Dental",
    "shortId": "MSD",
    "city": "San Francisco",
    "state": "CA",
    "phone1": "(555) 123-4567",
    "isActive": true,
    "created_by": "admin",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_by": "jdoe",
    "updated_at": "2024-01-20T14:45:00Z"
  },
  {
    "id": "OFF-002",
    "officeId": 2,
    "officeName": "Downtown Dental",
    "shortId": "DTD",
    "city": "Los Angeles",
    "state": "CA",
    "phone1": "(555) 987-6543",
    "isActive": true,
    "created_by": "admin",
    "created_at": "2024-01-16T09:00:00Z",
    "updated_by": null,
    "updated_at": null
  }
]
```

### Error Responses

**Status Code:** `401 Unauthorized`
```json
{
  "detail": "Not authenticated"
}
```

**Status Code:** `500 Internal Server Error`
```json
{
  "detail": "Internal server error"
}
```

---

## 2. GET /api/v1/offices/{officeId}/setup

**Purpose:** Fetch complete office setup details including all tabs (Info, Statement, Integration, Operatories, Schedule, Holidays, Advanced, SmartAssist) and audit information.

### Request

**Method:** `GET`

**Endpoint:** `/api/v1/offices/{officeId}/setup`

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `officeId` | number | Yes | Office ID (numeric) |

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
  "officeId": 1,
  "officeName": "Main Street Dental",
  "shortId": "MSD",
  "address": {
    "address1": "123 Main St",
    "address2": "Suite 100",
    "city": "San Francisco",
    "state": "CA",
    "zip": "94102",
    "timeZone": "America/Los_Angeles"
  },
  "contact": {
    "phone1": "(555) 123-4567",
    "phone1Ext": "100",
    "phone2": "(555) 123-4568",
    "email": "contact@mainstreetdental.com"
  },
  "billing": {
    "billingProviderId": "PROV-001",
    "billingProviderName": "Dr. John Smith",
    "useBillingLicense": true,
    "taxId": "12-3456789",
    "openingDate": "2020-01-15",
    "officeGroup": "Bay Area Group",
    "defaultUCRFeeSchedule": "FS-UCR-001",
    "defaultFeeSchedule": "FS-STD-001"
  },
  "settings": {
    "schedulerTimeInterval": 10,
    "isActive": true
  },
  "statementMessages": {
    "general": "Thank you for choosing our practice.",
    "current": "Payment is due upon receipt.",
    "day30": "Your account is 30 days past due.",
    "day60": "Your account is 60 days past due.",
    "day90": "Your account is 90 days past due.",
    "day120": "Your account is 120 days past due."
  },
  "statementSettings": {
    "correspondenceName": "Main Street Dental",
    "statementName": "Statement of Account",
    "statementAddress": "123 Main St, San Francisco, CA 94102",
    "statementPhone": "(555) 123-4567",
    "logoUrl": "https://example.com/logo.png"
  },
  "integrations": {
    "eClaims": {
      "vendorType": "Dentrix",
      "username": "user123",
      "password": "encrypted_password"
    },
    "transworld": {
      "acceleratorAccount": "ACC-001",
      "collectionsAccount": "COL-001",
      "userId": "user123",
      "password": "encrypted_password",
      "agingDays": 90
    },
    "imaging": {
      "system1": {
        "name": "Dexis",
        "linkType": "API",
        "mode": "Real-time"
      }
    },
    "textMessaging": {
      "phoneNumber": "+15551234567",
      "verified": true
    },
    "patientUrls": {
      "formsUrl": "https://example.com/forms",
      "schedulingUrl": "https://example.com/schedule",
      "financingUrl": "https://example.com/financing"
    },
    "acceptedCards": ["Visa", "MasterCard", "American Express"]
  },
  "acceptedCards": ["Visa", "MasterCard", "American Express"],
  "operatories": [
    {
      "id": "OP-001",
      "name": "Operatory 1",
      "order": 1,
      "has_future_appointments": false,
      "is_active": true
    }
  ],
  "schedule": {
    "monday": {
      "start": "08:00",
      "end": "17:00",
      "lunchStart": "12:00",
      "lunchEnd": "13:00",
      "closed": false
    },
    "tuesday": {
      "start": "08:00",
      "end": "17:00",
      "lunchStart": "12:00",
      "lunchEnd": "13:00",
      "closed": false
    },
    "wednesday": {
      "start": "08:00",
      "end": "17:00",
      "lunchStart": "12:00",
      "lunchEnd": "13:00",
      "closed": false
    },
    "thursday": {
      "start": "08:00",
      "end": "17:00",
      "lunchStart": "12:00",
      "lunchEnd": "13:00",
      "closed": false
    },
    "friday": {
      "start": "08:00",
      "end": "17:00",
      "lunchStart": "12:00",
      "lunchEnd": "13:00",
      "closed": false
    },
    "saturday": {
      "start": null,
      "end": null,
      "lunchStart": null,
      "lunchEnd": null,
      "closed": true
    },
    "sunday": {
      "start": null,
      "end": null,
      "lunchStart": null,
      "lunchEnd": null,
      "closed": true
    }
  },
  "holidays": [
    {
      "id": "HOL-001",
      "name": "New Year's Day",
      "start_date": "2024-01-01",
      "end_date": "2024-01-01",
      "is_active": true
    }
  ],
  "advanced": {
    "financial": {
      "annual_finance_charge_percent": 18.0,
      "minimum_balance": 100.0,
      "minimum_finance_charge": 5.0,
      "days_before_finance_charge": 30,
      "sales_tax_percent": 8.5
    },
    "scheduler": {
      "end_date": "2025-12-31",
      "default_appointment_duration": 30
    },
    "insurance": {
      "insurance_group": "GROUP-001",
      "eligibility_threshold_days": 90,
      "default_coverage_type": "PPO"
    },
    "defaults": {
      "place_of_service": "11",
      "area_code": "415",
      "city": "San Francisco",
      "state": "CA",
      "zip": "94102",
      "preferred_provider_id": "PROV-001",
      "is_ortho_office": false
    },
    "patient_checkin": {
      "hipaa_notice": true,
      "consent_form": true,
      "additional_consent_form": false
    },
    "automation": {
      "send_ecard": true,
      "effective_date": "2024-01-01"
    }
  },
  "smartAssist": {
    "enabled": true,
    "items": {
      "payment": {
        "enabled": true,
        "frequency": "Weekly",
        "includeBal": true
      },
      "email": {
        "enabled": true,
        "frequency": "Daily"
      }
    }
  },
  "created_by": "admin",
  "created_date": "2024-01-15T10:30:00Z",
  "modified_by": "jdoe",
  "modified_at": "2024-01-20T14:45:00Z"
}
```

**Field Descriptions:**

#### Root Level Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `officeId` | number | Yes | Office ID (numeric) |
| `officeName` | string | Yes | Full name of the office |
| `shortId` | string | Yes | Short identifier (max 6 chars) |
| `address` | object | Yes | Address information (see Address Object below) |
| `contact` | object | Yes | Contact information (see Contact Object below) |
| `billing` | object | Yes | Billing configuration (see Billing Object below) |
| `settings` | object | Yes | Office settings (see Settings Object below) |
| `statementMessages` | object | Yes | Statement messages for different aging periods |
| `statementSettings` | object | Yes | Statement display settings |
| `integrations` | object | Yes | Integration configurations |
| `acceptedCards` | array[string] | Yes | List of accepted payment card types |
| `operatories` | array[object] | Yes | List of operatories |
| `schedule` | object | Yes | Weekly schedule (see Schedule Object below) |
| `holidays` | array[object] | Yes | List of holidays |
| `advanced` | object | Yes | Advanced settings |
| `smartAssist` | object | Yes | SmartAssist configuration |
| `created_by` | string | Yes | Username of user who created the office |
| `created_date` | string (ISO 8601) | Yes | Timestamp when office was created |
| `modified_by` | string | No | Username of user who last updated the office (null if never updated) |
| `modified_at` | string (ISO 8601) | No | Timestamp when office was last updated (null if never updated) |

#### Address Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `address1` | string | Yes | Street address line 1 |
| `address2` | string | No | Street address line 2 (suite, unit, etc.) |
| `city` | string | Yes | City name |
| `state` | string | Yes | State code (2 letters) |
| `zip` | string | Yes | ZIP code |
| `timeZone` | string | Yes | Timezone (e.g., "America/Los_Angeles") |

#### Contact Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `phone1` | string | Yes | Primary phone number |
| `phone1Ext` | string | No | Extension for phone1 |
| `phone2` | string | No | Secondary phone number |
| `email` | string | Yes | Contact email address |

#### Billing Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `billingProviderId` | string | Yes | ID of billing provider |
| `billingProviderName` | string | Yes | Name of billing provider |
| `useBillingLicense` | boolean | Yes | Whether to use provider license in claims |
| `taxId` | string | Yes | Tax ID (format: XX-XXXXXXX) |
| `openingDate` | string (YYYY-MM-DD) | No | Office opening date |
| `officeGroup` | string | No | Office group name |
| `defaultUCRFeeSchedule` | string | Yes | Default UCR fee schedule ID |
| `defaultFeeSchedule` | string | Yes | Default standard fee schedule ID |

#### Settings Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `schedulerTimeInterval` | number | Yes | Scheduler time interval in minutes (5, 10, 15, 20, or 30) |
| `isActive` | boolean | Yes | Whether the office is active |

#### Schedule Object

Each day (monday, tuesday, wednesday, thursday, friday, saturday, sunday) has the following structure:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `start` | string (HH:MM) or null | Yes | Start time (24-hour format) or null if closed |
| `end` | string (HH:MM) or null | Yes | End time (24-hour format) or null if closed |
| `lunchStart` | string (HH:MM) or null | Yes | Lunch start time or null if no lunch |
| `lunchEnd` | string (HH:MM) or null | Yes | Lunch end time or null if no lunch |
| `closed` | boolean | Yes | Whether the office is closed on this day |

### Example Response

```json
{
  "officeId": 1,
  "officeName": "Main Street Dental",
  "shortId": "MSD",
  "address": {
    "address1": "123 Main St",
    "address2": "Suite 100",
    "city": "San Francisco",
    "state": "CA",
    "zip": "94102",
    "timeZone": "America/Los_Angeles"
  },
  "contact": {
    "phone1": "(555) 123-4567",
    "phone1Ext": "100",
    "phone2": null,
    "email": "contact@mainstreetdental.com"
  },
  "billing": {
    "billingProviderId": "PROV-001",
    "billingProviderName": "Dr. John Smith",
    "useBillingLicense": true,
    "taxId": "12-3456789",
    "openingDate": "2020-01-15",
    "officeGroup": "Bay Area Group",
    "defaultUCRFeeSchedule": "FS-UCR-001",
    "defaultFeeSchedule": "FS-STD-001"
  },
  "settings": {
    "schedulerTimeInterval": 10,
    "isActive": true
  },
  "statementMessages": {},
  "statementSettings": {},
  "integrations": {},
  "acceptedCards": [],
  "operatories": [],
  "schedule": {
    "monday": {
      "start": "08:00",
      "end": "17:00",
      "lunchStart": "12:00",
      "lunchEnd": "13:00",
      "closed": false
    }
  },
  "holidays": [],
  "advanced": {},
  "smartAssist": {},
  "created_by": "admin",
  "created_date": "2024-01-15T10:30:00Z",
  "modified_by": "jdoe",
  "modified_at": "2024-01-20T14:45:00Z"
}
```

### Error Responses

**Status Code:** `404 Not Found`
```json
{
  "detail": "Office not found"
}
```

**Status Code:** `401 Unauthorized**
```json
{
  "detail": "Not authenticated"
}
```

**Status Code:** `500 Internal Server Error`
```json
{
  "detail": "Internal server error"
}
```

---

## Database Schema Requirements

### Offices Table

The offices table should include the following audit columns:

```sql
CREATE TABLE offices (
  id SERIAL PRIMARY KEY,
  office_id INTEGER NOT NULL UNIQUE,
  office_name VARCHAR(255) NOT NULL,
  short_id VARCHAR(6) NOT NULL,
  -- ... other fields ...
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by VARCHAR(255),
  updated_at TIMESTAMP WITH TIME ZONE,
  -- ... other fields ...
);
```

### Business Rules

1. **created_by** and **created_at** must be set when the office is first created.
2. **updated_by** and **updated_at** should be set whenever the office is updated (via PUT/PATCH).
3. If an office has never been updated, **updated_by** and **updated_at** should be `null`.
4. **created_by** and **created_at** should never change after initial creation.
5. All timestamps should be in ISO 8601 format with timezone (e.g., `2024-01-15T10:30:00Z`).
6. **created_by** and **updated_by**/**modified_by** should contain the **username** of the user, not the email address (e.g., "admin", "jdoe", not "admin@example.com").

---

## Frontend Mapping

The frontend expects the following field names in camelCase, but the API can return either camelCase or snake_case. The frontend will handle both:

| Frontend Field | API Field (Preferred) | API Field (Alternative) |
|----------------|----------------------|------------------------|
| `createdBy` | `created_by` | `createdBy` |
| `createdDate` | `created_date` | `createdDate`, `createdAt`, `created_at` |
| `modifiedBy` | `modified_by` | `modifiedBy`, `updatedBy`, `updated_by` |
| `modifiedDate` | `modified_at` | `modifiedDate`, `updatedAt`, `updated_at` |

**Note:** The backend should return **snake_case** (`created_by`, `created_date`, `modified_by`, `modified_at`) for consistency with the rest of the API.

---

## Summary

- **GET /api/v1/offices**: Returns list of offices with audit fields (`created_by`, `created_at`, `updated_by`, `updated_at`)
- **GET /api/v1/offices/{officeId}/setup**: Returns complete office setup with audit fields (`created_by`, `created_date`, `modified_by`, `modified_at`)
- All audit fields are required in the response (use `null` for `updated_by`/`updated_at` if never updated)
- **created_by** and **updated_by**/**modified_by** should contain **usernames** (e.g., "admin", "jdoe"), not email addresses
- Timestamps should be in ISO 8601 format with timezone
- Frontend handles both camelCase and snake_case field names
