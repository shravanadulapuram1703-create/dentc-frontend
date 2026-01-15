# FastAPI Backend Response Schema for Scheduler Module

This document defines the JSON response structures that the FastAPI backend should return to match the frontend requirements. All endpoints should follow RESTful conventions and return consistent response formats.

## Base Response Structure

All API responses should follow this general structure:

```json
{
  "data": { ... },  // or specific field names like "appointments", "operatories", etc.
  "message": "Success message (optional)",
  "status": "success" | "error"
}
```

For error responses:

```json
{
  "detail": "Error message",
  "status_code": 400 | 401 | 404 | 500
}
```

---

## 1. Appointments Endpoints

### 1.1 GET `/scheduler/appointments`

Fetch appointments for a date range.

**Query Parameters:**
- `start_date` (required): Start date in `YYYY-MM-DD` format
- `end_date` (optional): End date in `YYYY-MM-DD` format. If not provided, defaults to `start_date`
- `office_id` (optional): Filter by office ID

**Response Schema:**

```json
{
  "appointments": [
    {
      "id": "string (UUID or unique identifier)",
      "patient_id": "string",
      "patient_name": "string (format: 'LastName, FirstName')",
      "date": "string (YYYY-MM-DD)",
      "start_time": "string (HH:MM format, e.g., '09:00')",
      "end_time": "string (HH:MM format, e.g., '10:00')",
      "duration": "integer (minutes)",
      "procedure_type": "string",
      "status": "string (enum: Scheduled | Confirmed | Unconfirmed | Left Message | In Reception | Available | In Operatory | Checked Out | Missed | Cancelled)",
      "operatory": "string (operatory ID)",
      "provider": "string",
      "notes": "string (optional, can be empty)"
    }
  ]
}
```

**Example Response:**

```json
{
  "appointments": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "patient_id": "900097",
      "patient_name": "Miller, Nicolas",
      "date": "2024-12-20",
      "start_time": "09:00",
      "end_time": "10:00",
      "duration": 60,
      "procedure_type": "New Patient",
      "status": "Confirmed",
      "operatory": "OP1",
      "provider": "Dr. Jinna",
      "notes": "First visit"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "patient_id": "900098",
      "patient_name": "Smith, John",
      "date": "2024-12-20",
      "start_time": "10:30",
      "end_time": "11:00",
      "duration": 30,
      "procedure_type": "Cleaning",
      "status": "Scheduled",
      "operatory": "OP1",
      "provider": "Dr. Jinna",
      "notes": "Routine cleaning"
    }
  ]
}
```

### 1.2 GET `/scheduler/appointments/{appointment_id}`

Fetch a single appointment by ID.

**Response Schema:**

```json
{
  "appointment": {
    "id": "string",
    "patient_id": "string",
    "patient_name": "string",
    "date": "string (YYYY-MM-DD)",
    "start_time": "string (HH:MM)",
    "end_time": "string (HH:MM)",
    "duration": "integer",
    "procedure_type": "string",
    "status": "string",
    "operatory": "string",
    "provider": "string",
    "notes": "string"
  }
}
```

### 1.3 POST `/scheduler/appointments`

Create a new appointment.

**Request Body Schema:**

```json
{
  "patient_id": "string (required)",
  "date": "string (YYYY-MM-DD, required)",
  "start_time": "string (HH:MM, required)",
  "duration": "integer (minutes, required)",
  "procedure_type": "string (required)",
  "operatory": "string (required)",
  "provider": "string (required)",
  "notes": "string (optional)",
  "status": "string (optional, defaults to 'Scheduled')"
}
```

**Response Schema:**

```json
{
  "appointment": {
    "id": "string (generated)",
    "patient_id": "string",
    "patient_name": "string (fetched from patient record)",
    "date": "string (YYYY-MM-DD)",
    "start_time": "string (HH:MM)",
    "end_time": "string (HH:MM, calculated from start_time + duration)",
    "duration": "integer",
    "procedure_type": "string",
    "status": "string",
    "operatory": "string",
    "provider": "string",
    "notes": "string"
  }
}
```

**Note:** The backend should:
- Calculate `end_time` from `start_time` + `duration`
- Fetch `patient_name` from the patient record using `patient_id`
- Generate a unique `id` for the appointment

### 1.4 PUT `/scheduler/appointments/{appointment_id}`

Update an existing appointment.

**Request Body Schema:**

```json
{
  "patient_id": "string (optional)",
  "date": "string (YYYY-MM-DD, optional)",
  "start_time": "string (HH:MM, optional)",
  "duration": "integer (optional)",
  "procedure_type": "string (optional)",
  "operatory": "string (optional)",
  "provider": "string (optional)",
  "notes": "string (optional)",
  "status": "string (optional)"
}
```

**Response Schema:**

```json
{
  "appointment": {
    "id": "string",
    "patient_id": "string",
    "patient_name": "string",
    "date": "string (YYYY-MM-DD)",
    "start_time": "string (HH:MM)",
    "end_time": "string (HH:MM, recalculated if start_time or duration changed)",
    "duration": "integer",
    "procedure_type": "string",
    "status": "string",
    "operatory": "string",
    "provider": "string",
    "notes": "string"
  }
}
```

### 1.5 PATCH `/scheduler/appointments/{appointment_id}/status`

Update only the appointment status.

**Request Body Schema:**

```json
{
  "status": "string (required, enum: Scheduled | Confirmed | Unconfirmed | Left Message | In Reception | Available | In Operatory | Checked Out | Missed | Cancelled)"
}
```

**Response Schema:**

```json
{
  "appointment": {
    "id": "string",
    "patient_id": "string",
    "patient_name": "string",
    "date": "string (YYYY-MM-DD)",
    "start_time": "string (HH:MM)",
    "end_time": "string (HH:MM)",
    "duration": "integer",
    "procedure_type": "string",
    "status": "string (updated)",
    "operatory": "string",
    "provider": "string",
    "notes": "string"
  }
}
```

### 1.6 DELETE `/scheduler/appointments/{appointment_id}`

Delete an appointment.

**Response:**

```json
{
  "message": "Appointment deleted successfully",
  "status": "success"
}
```

**Status Code:** `204 No Content` or `200 OK` with the above JSON

---

## 2. Operatories Endpoint

### 2.1 GET `/scheduler/operatories`

Fetch all operatories for an office.

**Query Parameters:**
- `office_id` (optional): Filter by office ID

**Response Schema:**

```json
{
  "operatories": [
    {
      "id": "string (unique identifier, e.g., 'OP1')",
      "name": "string (e.g., 'OP 1 - Hygiene')",
      "provider": "string (e.g., 'Dr. Jinna')",
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
    },
    {
      "id": "OP4",
      "name": "OP 4 - Regular Checkup",
      "provider": "Dr. Dinesh",
      "office": "Moon, PA"
    },
    {
      "id": "OP5",
      "name": "OP 5 - Rescheduled",
      "provider": "Dr. Uday",
      "office": "Moon, PA"
    },
    {
      "id": "OP6",
      "name": "OP 6 - Surgery",
      "provider": "Dr. Shravan",
      "office": "Moon, PA"
    }
  ]
}
```

---

## 3. Providers Endpoint

### 3.1 GET `/scheduler/providers`

Fetch all providers.

**Query Parameters:**
- `office_id` (optional): Filter by office ID

**Response Schema:**

```json
{
  "providers": [
    {
      "id": "string (unique identifier)",
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

---

## 4. Procedure Types Endpoint

### 4.1 GET `/scheduler/procedure-types`

Fetch all procedure types.

**Response Schema:**

```json
{
  "procedure_types": [
    {
      "id": "string (unique identifier)",
      "name": "string (e.g., 'Cleaning', 'New Patient', 'Crown')",
      "color": "string (optional, CSS color class or hex code, e.g., 'bg-blue-100')"
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

---

## 5. Scheduler Configuration Endpoint

### 5.1 GET `/scheduler/config`

Fetch scheduler configuration (time slots, working hours, etc.).

**Query Parameters:**
- `office_id` (optional): Get configuration for a specific office

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

**Note:** The frontend uses this configuration to generate time slots dynamically. For example:
- `start_hour: 8` means slots start at 8:00 AM
- `end_hour: 17` means slots end at 5:00 PM (17:00)
- `slot_interval: 10` means slots are generated every 10 minutes

This generates slots: `08:00`, `08:10`, `08:20`, ..., `16:50`.

---

## 6. Error Response Format

All endpoints should return consistent error responses:

**400 Bad Request:**

```json
{
  "detail": "Validation error message",
  "status_code": 400,
  "errors": {
    "field_name": ["Error message for this field"]
  }
}
```

**401 Unauthorized:**

```json
{
  "detail": "Unauthorized. Please provide a valid authentication token.",
  "status_code": 401
}
```

**404 Not Found:**

```json
{
  "detail": "Resource not found (e.g., 'Appointment not found')",
  "status_code": 404
}
```

**500 Internal Server Error:**

```json
{
  "detail": "Internal server error message",
  "status_code": 500
}
```

---

## 7. Pydantic Models (Python Reference)

For FastAPI implementation, here are suggested Pydantic models:

```python
from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import date, time

# Appointment Status Enum
AppointmentStatus = Literal[
    "Scheduled", "Confirmed", "Unconfirmed", "Left Message",
    "In Reception", "Available", "In Operatory", "Checked Out",
    "Missed", "Cancelled"
]

# Appointment Models
class AppointmentBase(BaseModel):
    patient_id: str
    date: date
    start_time: str = Field(..., regex=r'^\d{2}:\d{2}$')  # HH:MM format
    duration: int = Field(..., gt=0)  # minutes, must be > 0
    procedure_type: str
    operatory: str
    provider: str
    notes: Optional[str] = ""
    status: AppointmentStatus = "Scheduled"

class AppointmentCreate(AppointmentBase):
    pass

class AppointmentUpdate(BaseModel):
    patient_id: Optional[str] = None
    date: Optional[date] = None
    start_time: Optional[str] = Field(None, regex=r'^\d{2}:\d{2}$')
    duration: Optional[int] = Field(None, gt=0)
    procedure_type: Optional[str] = None
    operatory: Optional[str] = None
    provider: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[AppointmentStatus] = None

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

    class Config:
        json_schema_extra = {
            "example": {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "patient_id": "900097",
                "patient_name": "Miller, Nicolas",
                "date": "2024-12-20",
                "start_time": "09:00",
                "end_time": "10:00",
                "duration": 60,
                "procedure_type": "New Patient",
                "status": "Confirmed",
                "operatory": "OP1",
                "provider": "Dr. Jinna",
                "notes": "First visit"
            }
        }

# Operatory Models
class OperatoryResponse(BaseModel):
    id: str
    name: str
    provider: str
    office: str

# Provider Models
class ProviderResponse(BaseModel):
    id: str
    name: str
    office: Optional[str] = None

# Procedure Type Models
class ProcedureTypeResponse(BaseModel):
    id: str
    name: str
    color: Optional[str] = None

# Scheduler Config Models
class SchedulerConfigResponse(BaseModel):
    start_hour: int = Field(..., ge=0, le=23)
    end_hour: int = Field(..., ge=0, le=23)
    slot_interval: int = Field(..., gt=0)

# Status Update Model
class AppointmentStatusUpdate(BaseModel):
    status: AppointmentStatus

# Response Wrappers
class AppointmentsResponse(BaseModel):
    appointments: list[AppointmentResponse]

class OperatoriesResponse(BaseModel):
    operatories: list[OperatoryResponse]

class ProvidersResponse(BaseModel):
    providers: list[ProviderResponse]

class ProcedureTypesResponse(BaseModel):
    procedure_types: list[ProcedureTypeResponse]

class SchedulerConfigWrapper(BaseModel):
    config: SchedulerConfigResponse
```

---

## 8. Implementation Notes

### 8.1 Date and Time Handling

- **Dates**: Always use `YYYY-MM-DD` format (ISO 8601 date format)
- **Times**: Always use `HH:MM` format (24-hour format, e.g., `09:00`, `14:30`)
- **End Time Calculation**: The backend should calculate `end_time` from `start_time + duration` to ensure consistency

### 8.2 Patient Name Resolution

When creating or updating an appointment:
- The backend should fetch the patient's name from the patient database using `patient_id`
- Format: `"LastName, FirstName"` (e.g., `"Miller, Nicolas"`)
- If patient not found, return a 404 error or handle gracefully

### 8.3 Validation Rules

1. **Appointment Overlap**: The backend should validate that appointments don't overlap for the same operatory on the same date
2. **Time Validation**: `start_time` should be within working hours (based on scheduler config)
3. **Duration**: Must be positive and reasonable (e.g., > 0 and < 480 minutes / 8 hours)
4. **Date Validation**: Cannot create appointments in the past (unless explicitly allowed)

### 8.4 Office Filtering

- If `office_id` is provided in query parameters, filter results by office
- If not provided, return data for the user's default office (from authentication context)

### 8.5 Authentication

All endpoints (except possibly config) should require authentication:
- Use Bearer token authentication
- Extract `office_id` from user context if not provided in query params
- Validate user permissions (e.g., only certain roles can create/delete appointments)

---

## 9. API Endpoint Summary

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/scheduler/appointments` | Fetch appointments for date range | Yes |
| GET | `/scheduler/appointments/{id}` | Get single appointment | Yes |
| POST | `/scheduler/appointments` | Create new appointment | Yes |
| PUT | `/scheduler/appointments/{id}` | Update appointment | Yes |
| PATCH | `/scheduler/appointments/{id}/status` | Update appointment status | Yes |
| DELETE | `/scheduler/appointments/{id}` | Delete appointment | Yes |
| GET | `/scheduler/operatories` | Fetch operatories | Yes |
| GET | `/scheduler/providers` | Fetch providers | Yes |
| GET | `/scheduler/procedure-types` | Fetch procedure types | Yes |
| GET | `/scheduler/config` | Fetch scheduler configuration | Yes |

---

## 10. Testing Recommendations

When implementing the backend, ensure:

1. **Date Range Queries**: Test with various date ranges (single day, week, month)
2. **Time Calculations**: Verify `end_time` is calculated correctly
3. **Overlap Detection**: Test appointment overlap validation
4. **Error Handling**: Test all error scenarios (404, 400, 401, 500)
5. **Office Filtering**: Test with and without `office_id` parameter
6. **Status Updates**: Verify status enum validation
7. **Patient Name Resolution**: Test with valid and invalid `patient_id`

---

This schema ensures seamless integration between the FastAPI backend and the React frontend. All response structures match exactly what the frontend expects, making the integration straightforward and maintainable.
