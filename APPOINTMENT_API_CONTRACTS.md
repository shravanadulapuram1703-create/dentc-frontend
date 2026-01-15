# Appointment Creation API Contracts

This document defines the exact API contracts for the **Quick Save** appointment creation flow. All endpoints follow RESTful conventions and use JSON for request/response bodies.

## Important: Two-Step Flow for New Patients

When creating an appointment for a **new patient**, the flow is:

1. **Step 1:** Create the patient using `POST /api/v1/patients` (see Patients API Documentation)
2. **Step 2:** Create the appointment using `POST /api/v1/scheduler/appointments` with the patient's identifier (ID or chartNo)

The frontend handles this sequential flow automatically. The backend should only handle appointment creation - patient creation is handled separately.

---

## Table of Contents

1. [Metadata APIs](#metadata-apis)
   - [Providers](#1-providers-api)
   - [Operatories](#2-operatories-api)
   - [Procedure Types](#3-procedure-types-api)
   - [Scheduler Config](#4-scheduler-config-api)
2. [Create Appointment API](#create-appointment-api)
   - [Quick Save Request](#quick-save-request)
   - [Success Response](#success-response)
   - [Error Responses](#error-responses)
3. [Field Validation Rules](#field-validation-rules)
4. [Implementation Notes](#implementation-notes)

---

## Metadata APIs

These endpoints provide the dynamic metadata needed to populate the New Appointment modal dropdowns and form fields.

### 1. Providers API

**Endpoint:** `GET /api/v1/scheduler/providers`

**Description:** Fetch all available providers (doctors/staff) for appointment assignment.

**Query Parameters:**
- `office_id` (optional, string): Filter providers by office ID

**Request Example:**
```
GET /api/v1/scheduler/providers?office_id=OFFICE001
```

**Response Schema:**
```json
{
  "providers": [
    {
      "id": "string (unique identifier, e.g., 'PROV001')",
      "name": "string (e.g., 'Dr. Jinna')",
      "office": "string (optional, office name)"
    }
  ]
}
```

**Example Response:**
```json
{
  "providers": [
    {
      "id": "PROV001",
      "name": "Dr. Jinna",
      "office": "Moon, PA"
    },
    {
      "id": "PROV002",
      "name": "Dr. Smith",
      "office": "Moon, PA"
    },
    {
      "id": "PROV003",
      "name": "Dr. Jones",
      "office": "Moon, PA"
    }
  ]
}
```

**Notes:**
- Providers are typically filtered by the current office context
- The `name` field is used for display in dropdowns
- The `id` field can be used for backend operations if needed

---

### 2. Operatories API

**Endpoint:** `GET /api/v1/scheduler/operatories`

**Description:** Fetch all available operatories (treatment rooms) for appointment scheduling.

**Query Parameters:**
- `office_id` (optional, string): Filter operatories by office ID

**Request Example:**
```
GET /api/v1/scheduler/operatories?office_id=OFFICE001
```

**Response Schema:**
```json
{
  "operatories": [
    {
      "id": "string (unique identifier, e.g., 'OP1')",
      "name": "string (e.g., 'OP 1 - Hygiene')",
      "provider": "string (default provider name, e.g., 'Dr. Jinna')",
      "office": "string (office name, e.g., 'Moon, PA')"
    }
  ]
}
```

**Example Response:**
```json
{
  "operatories": [
    {
      "id": "OP1",
      "name": "OP 1 - Hygiene",
      "provider": "Dr. Jinna",
      "office": "Moon, PA"
    },
    {
      "id": "OP2",
      "name": "OP 2 - Major",
      "provider": "Dr. Smith",
      "office": "Moon, PA"
    },
    {
      "id": "OP3",
      "name": "OP 3 - Minor",
      "provider": "Dr. Jones",
      "office": "Moon, PA"
    }
  ]
}
```

**Notes:**
- Each operatory has a default `provider` that can be auto-selected when the operatory is chosen
- The `id` field is used to identify the operatory in appointment creation
- The `name` field is displayed in the dropdown

---

### 3. Procedure Types API

**Endpoint:** `GET /api/v1/scheduler/procedure-types`

**Description:** Fetch all available procedure types for appointment categorization.

**Query Parameters:** None

**Request Example:**
```
GET /api/v1/scheduler/procedure-types
```

**Response Schema:**
```json
{
  "procedure_types": [
    {
      "id": "string (unique identifier, e.g., 'PROC001')",
      "name": "string (e.g., 'Cleaning', 'New Patient', 'Crown')",
      "color": "string (optional, CSS color class or hex code, e.g., 'bg-blue-100' or '#E3F2FD')"
    }
  ]
}
```

**Example Response:**
```json
{
  "procedure_types": [
    {
      "id": "PROC001",
      "name": "Cleaning",
      "color": "bg-blue-100"
    },
    {
      "id": "PROC002",
      "name": "New Patient",
      "color": "bg-green-100"
    },
    {
      "id": "PROC003",
      "name": "Crown",
      "color": "bg-purple-100"
    },
    {
      "id": "PROC004",
      "name": "Root Canal",
      "color": "bg-red-100"
    },
    {
      "id": "PROC005",
      "name": "Filling",
      "color": "bg-yellow-100"
    }
  ]
}
```

**Notes:**
- The `color` field is optional and used for visual indication in the UI
- If `color` is not provided, the frontend will use a default gray color
- The `name` field is used for display and is stored with the appointment

---

### 4. Scheduler Config API

**Endpoint:** `GET /api/v1/scheduler/config`

**Description:** Fetch scheduler configuration (working hours, time slot intervals, etc.).

**Query Parameters:**
- `office_id` (optional, string): Get configuration for a specific office

**Request Example:**
```
GET /api/v1/scheduler/config?office_id=OFFICE001
```

**Response Schema:**
```json
{
  "config": {
    "start_hour": "integer (0-23, e.g., 8 for 8:00 AM)",
    "end_hour": "integer (0-23, e.g., 17 for 5:00 PM)",
    "slot_interval": "integer (minutes, e.g., 10 for 10-minute intervals)"
  }
}
```

**Example Response:**
```json
{
  "config": {
    "start_hour": 8,
    "end_hour": 17,
    "slot_interval": 10
  }
}
```

**Notes:**
- `start_hour`: Hour when the scheduler day begins (24-hour format, 0-23)
- `end_hour`: Hour when the scheduler day ends (24-hour format, 0-23)
- `slot_interval`: Time slot granularity in minutes (e.g., 10 = 10-minute slots)
- This config is used to generate the time grid and validate appointment times

---

## Create Appointment API

### Quick Save Request

**Endpoint:** `POST /api/v1/scheduler/appointments`

**Description:** Create a new appointment with minimal required information (Quick Save flow).

**Authentication:** Required (Bearer token)

**Request Headers:**
```
Content-Type: application/json
Authorization: Bearer <access_token>
```

**Request Body Schema:**

The request body supports two scenarios:

#### Scenario 1: Existing Patient (Quick Save)

When creating an appointment for an existing patient, only appointment data is required:

```json
{
  "patient_id": "string (required, existing patient ID)",
  "date": "string (required, YYYY-MM-DD format)",
  "start_time": "string (required, HH:MM format, 24-hour)",
  "duration": "integer (required, minutes, must be > 0)",
  "procedure_type": "string (required, procedure type name)",
  "operatory": "string (required, operatory ID)",
  "provider": "string (required, provider name)",
  "notes": "string (optional, appointment notes)",
  "status": "string (optional, defaults to 'Scheduled', enum: Scheduled | Confirmed | Unconfirmed | Left Message | In Reception | Available | In Operatory | Checked Out | Missed | Cancelled)"
}
```

**Example Request (Existing Patient):**
```json
{
  "patient_id": "900097",
  "date": "2024-12-20",
  "start_time": "09:00",
  "duration": 60,
  "procedure_type": "New Patient",
  "operatory": "OP1",
  "provider": "Dr. Jinna",
  "notes": "First visit",
  "status": "Scheduled"
}
```

#### Scenario 2: New Patient (Quick Save)

**Important:** For new patients, the frontend handles patient creation separately using the Patients API (`POST /api/v1/patients`) **before** calling this appointment creation endpoint. The appointment creation request will only contain the `patient_id` (or `chartNo`) returned from the patient creation.

**Request Format:**
The request format is the same as Scenario 1 (Existing Patient), but the `patient_id` will be the newly created patient's identifier:

```json
{
  "patient_id": "string (required, patient ID or chartNo from patient creation)",
  "date": "string (required, YYYY-MM-DD format)",
  "start_time": "string (required, HH:MM format, 24-hour)",
  "duration": "integer (required, minutes, must be > 0)",
  "procedure_type": "string (required, procedure type name)",
  "operatory": "string (required, operatory ID)",
  "provider": "string (required, provider name)",
  "notes": "string (optional, appointment notes)",
  "status": "string (optional, defaults to 'Scheduled')"
}
```

**Example Request (New Patient - after patient creation):**
```json
{
  "patient_id": "CH001",
  "date": "2024-12-20",
  "start_time": "09:00",
  "duration": 60,
  "procedure_type": "New Patient",
  "operatory": "OP1",
  "provider": "Dr. Jinna",
  "notes": "First visit",
  "status": "Scheduled"
}
```

**Frontend Flow:**
1. User fills in patient details (first name, last name, birthdate, phone, email) and appointment details
2. Frontend calls `POST /api/v1/patients` to create patient (see Patients API Documentation)
3. Frontend receives patient response with `id` (number) and `chartNo` (string)
4. Frontend calls `POST /api/v1/scheduler/appointments` with `patient_id` set to the patient's `chartNo` (or `id` converted to string)

**Backend Processing:**
1. Validate that `patient_id` exists in the patient database (by ID or chartNo)
2. Create the appointment record
3. Calculate `end_time` automatically from `start_time + duration`
4. Fetch `patient_name` from patient record and include in response

---

### Success Response

**Status Code:** `201 Created` or `200 OK`

**Response Schema:**

```json
{
  "appointment": {
    "id": "string (generated appointment ID, UUID or unique identifier)",
    "patient_id": "string",
    "patient_name": "string (format: 'LastName, FirstName', e.g., 'Smith, John')",
    "date": "string (YYYY-MM-DD)",
    "start_time": "string (HH:MM format)",
    "end_time": "string (HH:MM format, calculated from start_time + duration)",
    "duration": "integer (minutes)",
    "procedure_type": "string",
    "status": "string",
    "operatory": "string (operatory ID)",
    "provider": "string",
    "notes": "string"
  },
  "message": "string (optional, e.g., 'Appointment created successfully')"
}
```

**Example Response:**
```json
{
  "appointment": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "patient_id": "900097",
    "patient_name": "Smith, John",
    "date": "2024-12-20",
    "start_time": "09:00",
    "end_time": "10:00",
    "duration": 60,
    "procedure_type": "New Patient",
    "status": "Scheduled",
    "operatory": "OP1",
    "provider": "Dr. Jinna",
    "notes": "First visit"
  },
  "message": "Appointment created successfully"
}
```

**For New Patient Creation:**
If a new patient was created, the response may also include patient information:

```json
{
  "patient": {
    "id": "string (generated patient ID)",
    "first_name": "string",
    "last_name": "string",
    "birthdate": "string (YYYY-MM-DD)",
    "phone": "string",
    "email": "string (optional)"
  },
  "appointment": {
    "id": "string",
    "patient_id": "string (matches patient.id above)",
    "patient_name": "string (format: 'LastName, FirstName')",
    "date": "string (YYYY-MM-DD)",
    "start_time": "string (HH:MM)",
    "end_time": "string (HH:MM)",
    "duration": "integer",
    "procedure_type": "string",
    "status": "string",
    "operatory": "string",
    "provider": "string",
    "notes": "string"
  },
  "message": "Patient and appointment created successfully"
}
```

---

### Error Responses

#### 400 Bad Request - Validation Error

**Status Code:** `400 Bad Request`

**Response Schema:**
```json
{
  "detail": "string (general error message)",
  "status_code": 400,
  "errors": {
    "field_name": ["string (specific error message for this field)"]
  }
}
```

**Example Response:**
```json
{
  "detail": "Validation error",
  "status_code": 400,
  "errors": {
    "patient_id": ["Patient ID is required for existing patient appointments"],
    "start_time": ["Start time must be within working hours (08:00 - 17:00)"],
    "duration": ["Duration must be greater than 0"],
    "operatory": ["Operatory is required"],
    "provider": ["Provider is required"],
    "procedure_type": ["Procedure type is required"]
  }
}
```

#### 400 Bad Request - Appointment Overlap

**Status Code:** `400 Bad Request`

**Response Schema:**
```json
{
  "detail": "Appointment time slot is already occupied",
  "status_code": 400,
  "conflicting_appointment": {
    "id": "string",
    "patient_name": "string",
    "start_time": "string (HH:MM)",
    "end_time": "string (HH:MM)"
  }
}
```

**Example Response:**
```json
{
  "detail": "Appointment time slot is already occupied",
  "status_code": 400,
  "conflicting_appointment": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "patient_name": "Miller, Nicolas",
    "start_time": "09:00",
    "end_time": "10:00"
  }
}
```

#### 404 Not Found - Patient Not Found

**Status Code:** `404 Not Found`

**Response Schema:**
```json
{
  "detail": "Patient not found",
  "status_code": 404,
  "patient_id": "string (the patient ID that was not found)"
}
```

**Example Response:**
```json
{
  "detail": "Patient not found",
  "status_code": 404,
  "patient_id": "900097"
}
```

#### 401 Unauthorized

**Status Code:** `401 Unauthorized`

**Response Schema:**
```json
{
  "detail": "Unauthorized. Please provide a valid authentication token.",
  "status_code": 401
}
```

#### 500 Internal Server Error

**Status Code:** `500 Internal Server Error`

**Response Schema:**
```json
{
  "detail": "Internal server error message",
  "status_code": 500
}
```

---

## Field Validation Rules

### Required Fields

**For Existing Patient Appointments:**
- `patient_id` (string): Must exist in patient database
- `date` (string): Must be in `YYYY-MM-DD` format, cannot be in the past (unless explicitly allowed)
- `start_time` (string): Must be in `HH:MM` format (24-hour), must be within working hours
- `duration` (integer): Must be > 0 and < 480 minutes (8 hours)
- `procedure_type` (string): Must match a valid procedure type name
- `operatory` (string): Must match a valid operatory ID
- `provider` (string): Must match a valid provider name

**For New Patient Appointments:**
- All appointment fields above, plus:
- `patient.first_name` (string): Required, non-empty
- `patient.last_name` (string): Required, non-empty
- `patient.birthdate` (string): Required, must be in `YYYY-MM-DD` format, must be a valid date
- `patient.phone` (string): Required, non-empty

### Optional Fields

- `notes` (string): Optional, can be empty
- `status` (string): Optional, defaults to "Scheduled" if not provided
- `patient.email` (string): Optional for new patients
- `patient.phone_type` (string): Optional, defaults to "Cell" if not provided

### Validation Rules

1. **Time Validation:**
   - `start_time` must be within working hours (based on scheduler config)
   - `start_time` + `duration` must not exceed `end_hour` from scheduler config
   - Time must be in `HH:MM` format (24-hour, e.g., "09:00", "14:30")

2. **Date Validation:**
   - `date` must be in `YYYY-MM-DD` format (ISO 8601)
   - Cannot create appointments in the past (unless user has special permissions)
   - Must be a valid calendar date

3. **Duration Validation:**
   - Must be a positive integer
   - Must be greater than 0
   - Should be reasonable (e.g., < 480 minutes / 8 hours)
   - Should be a multiple of `slot_interval` from scheduler config (recommended, not required)

4. **Overlap Validation:**
   - Cannot create appointment if time slot overlaps with existing appointment in the same operatory on the same date
   - Overlap is determined by: `start_time < existing_end_time AND end_time > existing_start_time`

5. **Reference Validation:**
   - `operatory` must exist in the operatories list
   - `provider` must exist in the providers list
   - `procedure_type` must exist in the procedure types list
   - `patient_id` (for existing patients) must exist in the patient database

---

## Implementation Notes

### 1. Date and Time Format

- **Dates:** Always use `YYYY-MM-DD` format (ISO 8601 date format)
  - Example: `"2024-12-20"`
- **Times:** Always use `HH:MM` format (24-hour format)
  - Example: `"09:00"` (9:00 AM), `"14:30"` (2:30 PM)
- **End Time Calculation:** Backend should calculate `end_time` from `start_time + duration` to ensure consistency

### 2. Patient Name Format

- When returning appointment data, `patient_name` should be formatted as: `"LastName, FirstName"`
- Example: `"Smith, John"` (not `"John Smith"`)

### 3. Office Context

- If `office_id` is provided in query parameters for metadata endpoints, filter results by office
- If not provided, return data for the user's default office (from authentication context)
- For appointment creation, the office context is typically derived from the authenticated user's context

### 4. New Patient Creation

- When `patient` object is provided in the request:
  1. Create patient record first
  2. Generate a unique `patient_id`
  3. Use the generated `patient_id` to create the appointment
  4. Return both patient and appointment data in the response

### 5. Default Values

- `status` defaults to `"Scheduled"` if not provided
- `patient.phone_type` defaults to `"Cell"` if not provided
- `notes` defaults to empty string if not provided

### 6. Error Handling

- Always return consistent error response format
- Include specific field-level errors in `errors` object for validation failures
- Return appropriate HTTP status codes (400 for validation, 404 for not found, 401 for unauthorized, 500 for server errors)

### 7. Authentication

- All endpoints require authentication (Bearer token)
- Token should be included in `Authorization` header: `Authorization: Bearer <token>`
- Extract office context from user's authentication token if not provided in query params

---

## Pydantic Models (Python Reference)

For FastAPI implementation, here are suggested Pydantic models:

```python
from pydantic import BaseModel, Field, validator
from typing import Optional, Literal
from datetime import date

# Appointment Status Enum
AppointmentStatus = Literal[
    "Scheduled", "Confirmed", "Unconfirmed", "Left Message",
    "In Reception", "Available", "In Operatory", "Checked Out",
    "Missed", "Cancelled"
]

# Phone Type Enum
PhoneType = Literal["Cell", "Home", "Work"]

# New Patient Request Model
class NewPatientRequest(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    birthdate: date
    phone: str = Field(..., min_length=1)
    phone_type: PhoneType = "Cell"
    email: Optional[str] = Field(None, max_length=255)

# Appointment Request Model (for existing patient)
class AppointmentRequestExistingPatient(BaseModel):
    patient_id: str = Field(..., min_length=1)
    date: date
    start_time: str = Field(..., regex=r'^\d{2}:\d{2}$')  # HH:MM format
    duration: int = Field(..., gt=0, le=480)  # minutes, 1-480
    procedure_type: str = Field(..., min_length=1)
    operatory: str = Field(..., min_length=1)
    provider: str = Field(..., min_length=1)
    notes: Optional[str] = ""
    status: AppointmentStatus = "Scheduled"

# Appointment Request Model (for new patient)
class AppointmentRequestNewPatient(BaseModel):
    patient: NewPatientRequest
    appointment: "AppointmentRequestExistingPatient"

# Appointment Response Model
class AppointmentResponse(BaseModel):
    id: str
    patient_id: str
    patient_name: str
    date: date
    start_time: str
    end_time: str
    duration: int
    procedure_type: str
    status: AppointmentStatus
    operatory: str
    provider: str
    notes: str

# Patient Response Model (for new patient creation)
class PatientResponse(BaseModel):
    id: str
    first_name: str
    last_name: str
    birthdate: date
    phone: str
    email: Optional[str] = None

# Success Response Wrapper
class AppointmentCreateResponse(BaseModel):
    appointment: AppointmentResponse
    patient: Optional[PatientResponse] = None  # Only included for new patient creation
    message: Optional[str] = None
```

---

## Testing Recommendations

When implementing the backend, ensure:

1. **Validation Testing:**
   - Test all required field validations
   - Test date format validation
   - Test time format validation
   - Test duration range validation
   - Test overlap detection

2. **New Patient Flow:**
   - Test patient creation with all required fields
   - Test patient creation with optional fields
   - Test appointment creation after patient creation
   - Test error handling if patient creation fails

3. **Existing Patient Flow:**
   - Test appointment creation with valid patient_id
   - Test error handling for invalid patient_id
   - Test error handling for missing patient_id

4. **Overlap Detection:**
   - Test appointment creation when slot is free
   - Test appointment creation when slot is occupied
   - Test partial overlaps (start time overlaps, end time overlaps)
   - Test exact time matches

5. **Office Context:**
   - Test filtering by office_id
   - Test default office when office_id not provided
   - Test cross-office appointment creation (if allowed)

6. **Error Handling:**
   - Test all error response formats
   - Test authentication failures
   - Test validation error messages
   - Test server error handling

---

This API contract ensures seamless integration between the frontend Quick Save flow and the FastAPI backend. All request/response structures match exactly what the frontend expects, making the integration straightforward and maintainable.
