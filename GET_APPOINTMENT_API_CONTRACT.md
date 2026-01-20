# Get Appointment Details API Contract

This document defines the API contract for fetching a single appointment with all its details including treatments, lab information, notes, and metadata.

---

## Endpoint

**GET** `/api/v1/scheduler/appointments/{appointment_id}`

---

## URL Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `appointment_id` | string | Yes | The unique identifier of the appointment |

---

## Request Headers

```
Authorization: Bearer {access_token}
Content-Type: application/json
```

---

## Response Schema

### Success Response (200 OK)

```json
{
  "appointment": {
    "id": "string",
    "patient_id": "string",
    "patient_name": "string",
    "date": "YYYY-MM-DD",
    "start_time": "HH:MM",
    "end_time": "HH:MM",
    "duration": "integer",
    "procedure_type": "string",
    "operatory": "string",
    "provider": "string",
    "status": "string",
    "notes": "string",
    
    "lab": "boolean",
    "lab_dds": "string",
    "lab_cost": "number",
    "lab_sent_on": "YYYY-MM-DD",
    "lab_due_on": "YYYY-MM-DD",
    "lab_recvd_on": "YYYY-MM-DD",
    
    "missed": "boolean",
    "cancelled": "boolean",
    
    "campaign_id": "string",
    
    "treatment_plan_id": "string",
    "treatment_plan_phase_id": "string",
    
    "created_at": "ISO 8601 timestamp",
    "updated_at": "ISO 8601 timestamp",
    
    "treatments": [
      {
        "id": "string",
        "appointment_id": "string",
        "procedure_code": "string",
        "status": "string",
        "tooth": "string",
        "surface": "string",
        "description": "string",
        "bill_to": "string",
        "duration": "integer",
        "provider": "string",
        "provider_units": "integer",
        "est_patient": "number",
        "est_insurance": "number",
        "fee": "number",
        "created_at": "ISO 8601 timestamp",
        "updated_at": "ISO 8601 timestamp"
      }
    ]
  }
}
```

---

## Example Request

```http
GET /api/v1/scheduler/appointments/APT001
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

---

## Example Response

### Example 1: Basic Appointment

```json
{
  "appointment": {
    "id": "APT001",
    "patient_id": "CH001",
    "patient_name": "Smith, John",
    "date": "2024-12-20",
    "start_time": "09:00",
    "end_time": "10:00",
    "duration": 60,
    "procedure_type": "PROC001",
    "operatory": "OP1",
    "provider": "Dr. Jinna",
    "status": "Scheduled",
    "notes": "Routine checkup",
    "lab": false,
    "missed": false,
    "cancelled": false,
    "created_at": "2024-12-15T10:30:00Z",
    "updated_at": "2024-12-15T10:30:00Z",
    "treatments": []
  }
}
```

### Example 2: Appointment with Lab Information

```json
{
  "appointment": {
    "id": "APT002",
    "patient_id": "CH002",
    "patient_name": "Doe, Jane",
    "date": "2024-12-21",
    "start_time": "14:30",
    "end_time": "16:00",
    "duration": 90,
    "procedure_type": "PROC002",
    "operatory": "OP2",
    "provider": "Dr. Smith",
    "status": "Scheduled",
    "notes": "Crown preparation - lab work required",
    "lab": true,
    "lab_dds": "ABC Dental Lab",
    "lab_cost": 250.00,
    "lab_sent_on": "2024-12-21",
    "lab_due_on": "2024-12-28",
    "lab_recvd_on": null,
    "missed": false,
    "cancelled": false,
    "created_at": "2024-12-15T11:00:00Z",
    "updated_at": "2024-12-15T11:00:00Z",
    "treatments": []
  }
}
```

### Example 3: Appointment with Treatments

```json
{
  "appointment": {
    "id": "APT003",
    "patient_id": "CH003",
    "patient_name": "Johnson, Bob",
    "date": "2024-12-22",
    "start_time": "10:00",
    "end_time": "12:00",
    "duration": 120,
    "procedure_type": "PROC003",
    "operatory": "OP1",
    "provider": "Dr. Jinna",
    "status": "Scheduled",
    "notes": "Routine cleaning and exam",
    "lab": false,
    "missed": false,
    "cancelled": false,
    "campaign_id": "CAMPAIGN_2024_Q4",
    "created_at": "2024-12-15T12:00:00Z",
    "updated_at": "2024-12-15T12:00:00Z",
    "treatments": [
      {
        "id": "TREAT001",
        "appointment_id": "APT003",
        "procedure_code": "D0120",
        "status": "TP",
        "tooth": null,
        "surface": null,
        "description": "Periodic Oral Evaluation",
        "bill_to": "Patient",
        "duration": 15,
        "provider": "Dr. Jinna",
        "provider_units": 1,
        "est_patient": 75.00,
        "est_insurance": null,
        "fee": 75.00,
        "created_at": "2024-12-15T12:00:00Z",
        "updated_at": "2024-12-15T12:00:00Z"
      },
      {
        "id": "TREAT002",
        "appointment_id": "APT003",
        "procedure_code": "D1110",
        "status": "TP",
        "tooth": null,
        "surface": null,
        "description": "Adult Prophylaxis",
        "bill_to": "Insurance",
        "duration": 30,
        "provider": "Dr. Jinna",
        "provider_units": 1,
        "est_patient": 20.00,
        "est_insurance": 80.00,
        "fee": 100.00,
        "created_at": "2024-12-15T12:00:00Z",
        "updated_at": "2024-12-15T12:00:00Z"
      }
    ]
  }
}
```

### Example 4: Complete Appointment with All Fields

```json
{
  "appointment": {
    "id": "APT004",
    "patient_id": "CH004",
    "patient_name": "Williams, Sarah",
    "date": "2024-12-24",
    "start_time": "13:00",
    "end_time": "16:00",
    "duration": 180,
    "procedure_type": "PROC005",
    "operatory": "OP1",
    "provider": "Dr. Jinna",
    "status": "Confirmed",
    "notes": "Complex procedure with multiple treatments",
    "lab": true,
    "lab_dds": "XYZ Dental Lab",
    "lab_cost": 350.00,
    "lab_sent_on": "2024-12-24",
    "lab_due_on": "2025-01-05",
    "lab_recvd_on": null,
    "missed": false,
    "cancelled": false,
    "campaign_id": "CAMPAIGN_2024_Q4",
    "treatment_plan_id": "TP002",
    "treatment_plan_phase_id": "TPP002",
    "created_at": "2024-12-15T13:00:00Z",
    "updated_at": "2024-12-15T13:00:00Z",
    "treatments": [
      {
        "id": "TREAT003",
        "appointment_id": "APT004",
        "procedure_code": "D3310",
        "status": "TP",
        "tooth": "8",
        "surface": null,
        "description": "Endodontic Therapy - Anterior",
        "bill_to": "Insurance",
        "duration": 90,
        "provider": "Dr. Jinna",
        "provider_units": 1,
        "est_patient": 200.00,
        "est_insurance": 600.00,
        "fee": 800.00,
        "created_at": "2024-12-15T13:00:00Z",
        "updated_at": "2024-12-15T13:00:00Z"
      },
      {
        "id": "TREAT004",
        "appointment_id": "APT004",
        "procedure_code": "D2740",
        "status": "TP",
        "tooth": "8",
        "surface": null,
        "description": "Crown - Porcelain/Ceramic",
        "bill_to": "Insurance",
        "duration": 120,
        "provider": "Dr. Jinna",
        "provider_units": 1,
        "est_patient": 300.00,
        "est_insurance": 900.00,
        "fee": 1200.00,
        "created_at": "2024-12-15T13:00:00Z",
        "updated_at": "2024-12-15T13:00:00Z"
      }
    ]
  }
}
```

---

## Field Descriptions

### Core Appointment Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique appointment identifier |
| `patient_id` | string | Yes | Patient identifier (chart number or ID) |
| `patient_name` | string | Yes | Patient full name (format: "LastName, FirstName") |
| `date` | string | Yes | Appointment date in YYYY-MM-DD format |
| `start_time` | string | Yes | Start time in HH:MM format (24-hour) |
| `end_time` | string | Yes | End time in HH:MM format (24-hour), calculated from start_time + duration |
| `duration` | integer | Yes | Duration in minutes |
| `procedure_type` | string | Yes | Procedure type ID or name |
| `operatory` | string | Yes | Operatory ID |
| `provider` | string | Yes | Provider name |
| `status` | string | Yes | Appointment status (e.g., "Scheduled", "Confirmed", "Cancelled") |
| `notes` | string | No | Appointment notes |

### Lab Information Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `lab` | boolean | No | Whether lab work is required (defaults to false) |
| `lab_dds` | string | No | Lab DDS (Dental Design Studio) name |
| `lab_cost` | number | No | Lab cost (decimal) |
| `lab_sent_on` | string | No | Date lab work was sent (YYYY-MM-DD) |
| `lab_due_on` | string | No | Date lab work is due (YYYY-MM-DD) |
| `lab_recvd_on` | string | No | Date lab work was received (YYYY-MM-DD, null if not received) |

### Flag Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `missed` | boolean | No | Whether appointment was missed (defaults to false) |
| `cancelled` | boolean | No | Whether appointment was cancelled (defaults to false) |

### Additional Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `campaign_id` | string | No | Campaign identifier for marketing tracking |
| `treatment_plan_id` | string | No | Linked treatment plan ID |
| `treatment_plan_phase_id` | string | No | Linked treatment plan phase ID |
| `created_at` | string | Yes | ISO 8601 timestamp of creation |
| `updated_at` | string | Yes | ISO 8601 timestamp of last update |

### Treatment Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique treatment identifier |
| `appointment_id` | string | Yes | Associated appointment ID |
| `procedure_code` | string | Yes | Procedure code (e.g., "D0120", "D1110") |
| `status` | string | Yes | Treatment status: "TP" (Treatment Planned), "C" (Completed), etc. |
| `tooth` | string | No | Tooth number/identifier |
| `surface` | string | No | Surface identifier |
| `description` | string | Yes | Procedure description |
| `bill_to` | string | No | Billing target: "Patient", "Insurance", etc. (defaults to "Patient") |
| `duration` | integer | Yes | Procedure duration in minutes |
| `provider` | string | Yes | Provider name |
| `provider_units` | integer | No | Provider units (defaults to 1) |
| `est_patient` | number | No | Estimated patient cost |
| `est_insurance` | number | No | Estimated insurance cost |
| `fee` | number | Yes | Procedure fee |
| `created_at` | string | Yes | ISO 8601 timestamp of creation |
| `updated_at` | string | Yes | ISO 8601 timestamp of last update |

---

## Error Responses

### 404 Not Found

**Response:**
```json
{
  "detail": "Appointment not found"
}
```

**Status Code:** 404

**When:** The appointment ID does not exist in the database.

---

### 401 Unauthorized

**Response:**
```json
{
  "detail": "Not authenticated"
}
```

**Status Code:** 401

**When:** The request is missing a valid authentication token or the token is expired.

---

### 403 Forbidden

**Response:**
```json
{
  "detail": "Not authorized to access this appointment"
}
```

**Status Code:** 403

**When:** The user does not have permission to access this appointment (e.g., appointment belongs to a different office).

---

### 500 Internal Server Error

**Response:**
```json
{
  "detail": "Internal server error"
}
```

**Status Code:** 500

**When:** An unexpected server error occurs.

---

## Business Rules

1. **Authorization:**
   - Users can only access appointments for their assigned offices
   - System administrators can access all appointments

2. **Data Completeness:**
   - All fields that were saved during appointment creation should be returned
   - If a field was not set, it should be returned as `null` (for optional fields) or the default value (for required fields)

3. **Treatment Loading:**
   - Treatments are loaded as part of the appointment response
   - If no treatments exist, the `treatments` array should be empty `[]`
   - Treatments are ordered by creation time (oldest first)

4. **Date/Time Format:**
   - All dates are in YYYY-MM-DD format
   - All times are in HH:MM format (24-hour)
   - Timestamps are in ISO 8601 format

---

## Implementation Notes

### Frontend Implementation

1. **Data Transformation:**
   - Convert `date` from YYYY-MM-DD to MM/DD/YYYY for display
   - Convert `start_time` from 24-hour (HH:MM) to 12-hour (HH:MM AM/PM) for display
   - Transform `treatments` array to match frontend `Treatment` interface

2. **Form Population:**
   - Use fetched appointment data to pre-populate all form fields
   - Handle null/undefined values gracefully (use empty strings or default values)
   - Map treatment data to the frontend treatment structure

3. **Error Handling:**
   - Display user-friendly error messages for 404, 401, 403 errors
   - Log errors for debugging
   - Fallback to default values if API call fails

### Backend Implementation

1. **Database Query:**
   - Join appointments table with appointment_treatments table
   - Include all appointment fields (lab, flags, campaign, etc.)
   - Order treatments by creation time

2. **Authorization Check:**
   - Verify user has access to the appointment's office
   - Return 403 if access is denied

3. **Data Serialization:**
   - Return all fields, even if null
   - Use snake_case for all field names
   - Include timestamps for audit trail

---

## Testing Examples

### Test Case 1: Fetch Basic Appointment

**Request:**
```http
GET /api/v1/scheduler/appointments/APT001
Authorization: Bearer {token}
```

**Expected Response:** 200 OK with appointment object (no treatments)

---

### Test Case 2: Fetch Appointment with Treatments

**Request:**
```http
GET /api/v1/scheduler/appointments/APT003
Authorization: Bearer {token}
```

**Expected Response:** 200 OK with appointment object including treatments array

---

### Test Case 3: Fetch Non-Existent Appointment

**Request:**
```http
GET /api/v1/scheduler/appointments/INVALID_ID
Authorization: Bearer {token}
```

**Expected Response:** 404 Not Found

---

### Test Case 4: Fetch Appointment Without Authentication

**Request:**
```http
GET /api/v1/scheduler/appointments/APT001
```

**Expected Response:** 401 Unauthorized

---

## API Versioning

- Current Version: `v1`
- Base Path: `/api/v1/scheduler/appointments`

---

## Rate Limiting

- Recommended: 100 requests per minute per user
- Burst limit: 20 requests per second

---

## Changelog

### Version 1.0.0 (2024-12-20)
- Initial API contract
- Support for fetching complete appointment details
- Support for lab information
- Support for treatments
- Support for treatment plan linkage
