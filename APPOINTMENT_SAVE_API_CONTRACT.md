# Appointment Save API Contract

This document defines the API contract for saving appointments with all details including treatments, lab information, flags, and metadata.

---

## Endpoints

### 1. Create Appointment
**POST** `/api/v1/scheduler/appointments`

### 2. Update Appointment
**PUT** `/api/v1/scheduler/appointments/{appointment_id}`

---

## Request Body Schema

### Create Appointment Request

```json
{
  "patient_id": "string (required)",
  "date": "string (required, YYYY-MM-DD format)",
  "start_time": "string (required, HH:MM format, 24-hour)",
  "duration": "integer (required, minutes, must be > 0)",
  "procedure_type": "string (required, procedure type ID or name)",
  "operatory": "string (required, operatory ID)",
  "provider": "string (required, provider name)",
  "status": "string (optional, appointment status ID or name, defaults to 'Scheduled')",
  "notes": "string (optional, appointment notes)",
  
  "lab": "boolean (optional, defaults to false)",
  "lab_dds": "string (optional, lab DDS name)",
  "lab_cost": "number (optional, decimal)",
  "lab_sent_on": "string (optional, YYYY-MM-DD format)",
  "lab_due_on": "string (optional, YYYY-MM-DD format)",
  "lab_recvd_on": "string (optional, YYYY-MM-DD format)",
  
  "missed": "boolean (optional, defaults to false)",
  "cancelled": "boolean (optional, defaults to false)",
  
  "campaign_id": "string (optional, campaign identifier)",
  
  "treatment_plan_id": "string (optional, treatment plan ID)",
  "treatment_plan_phase_id": "string (optional, treatment plan phase ID)",
  
  "treatments": [
    {
      "procedure_code": "string (required, procedure code like 'D0120')",
      "status": "string (required, 'TP' for Treatment Planned, 'C' for Completed, etc.)",
      "tooth": "string (optional, tooth number/identifier)",
      "surface": "string (optional, surface identifier)",
      "description": "string (required, procedure description)",
      "bill_to": "string (optional, 'Patient', 'Insurance', etc., defaults to 'Patient')",
      "duration": "integer (required, minutes)",
      "provider": "string (required, provider name)",
      "provider_units": "integer (optional, defaults to 1)",
      "est_patient": "number (optional, estimated patient cost)",
      "est_insurance": "number (optional, estimated insurance cost)",
      "fee": "number (required, procedure fee)"
    }
  ]
}
```

### Update Appointment Request

Same schema as Create, but all fields are optional except `id` (passed in URL).

**URL Parameter:**
- `appointment_id`: string (required, appointment ID)

---

## Example Requests

### Example 1: Create Appointment with Basic Information

```json
{
  "patient_id": "CH001",
  "date": "2024-12-20",
  "start_time": "09:00",
  "duration": 60,
  "procedure_type": "PROC001",
  "operatory": "OP1",
  "provider": "Dr. Jinna",
  "status": "Scheduled",
  "notes": "First visit - comprehensive exam"
}
```

### Example 2: Create Appointment with Lab Information

```json
{
  "patient_id": "CH002",
  "date": "2024-12-21",
  "start_time": "14:30",
  "duration": 90,
  "procedure_type": "PROC002",
  "operatory": "OP2",
  "provider": "Dr. Smith",
  "status": "Scheduled",
  "lab": true,
  "lab_dds": "ABC Dental Lab",
  "lab_cost": 250.00,
  "lab_sent_on": "2024-12-21",
  "lab_due_on": "2024-12-28",
  "notes": "Crown preparation - lab work required"
}
```

### Example 3: Create Appointment with Treatments

```json
{
  "patient_id": "CH003",
  "date": "2024-12-22",
  "start_time": "10:00",
  "duration": 120,
  "procedure_type": "PROC003",
  "operatory": "OP1",
  "provider": "Dr. Jinna",
  "status": "Scheduled",
  "treatments": [
    {
      "procedure_code": "D0120",
      "status": "TP",
      "description": "Periodic Oral Evaluation",
      "bill_to": "Patient",
      "duration": 15,
      "provider": "Dr. Jinna",
      "provider_units": 1,
      "est_patient": 75.00,
      "fee": 75.00
    },
    {
      "procedure_code": "D1110",
      "status": "TP",
      "description": "Adult Prophylaxis",
      "bill_to": "Insurance",
      "duration": 30,
      "provider": "Dr. Jinna",
      "provider_units": 1,
      "est_patient": 20.00,
      "est_insurance": 80.00,
      "fee": 100.00
    }
  ],
  "notes": "Routine cleaning and exam"
}
```

### Example 4: Create Appointment with Treatment Plan Linkage

```json
{
  "patient_id": "CH004",
  "date": "2024-12-23",
  "start_time": "11:00",
  "duration": 90,
  "procedure_type": "PROC004",
  "operatory": "OP2",
  "provider": "Dr. Smith",
  "status": "Scheduled",
  "treatment_plan_id": "TP001",
  "treatment_plan_phase_id": "TPP001",
  "treatments": [
    {
      "procedure_code": "D2740",
      "status": "TP",
      "tooth": "14",
      "description": "Crown - Porcelain/Ceramic",
      "bill_to": "Patient",
      "duration": 120,
      "provider": "Dr. Smith",
      "provider_units": 1,
      "est_patient": 1200.00,
      "fee": 1200.00
    }
  ],
  "notes": "Phase 1 of treatment plan TP001"
}
```

### Example 5: Create Appointment with All Fields

```json
{
  "patient_id": "CH005",
  "date": "2024-12-24",
  "start_time": "13:00",
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
  
  "treatments": [
    {
      "procedure_code": "D3310",
      "status": "TP",
      "tooth": "8",
      "description": "Endodontic Therapy - Anterior",
      "bill_to": "Insurance",
      "duration": 90,
      "provider": "Dr. Jinna",
      "provider_units": 1,
      "est_patient": 200.00,
      "est_insurance": 600.00,
      "fee": 800.00
    },
    {
      "procedure_code": "D2740",
      "status": "TP",
      "tooth": "8",
      "description": "Crown - Porcelain/Ceramic",
      "bill_to": "Insurance",
      "duration": 120,
      "provider": "Dr. Jinna",
      "provider_units": 1,
      "est_patient": 300.00,
      "est_insurance": 900.00,
      "fee": 1200.00
    }
  ]
}
```

---

## Response Schema

### Success Response (201 Created / 200 OK)

```json
{
  "appointment": {
    "id": "string",
    "patient_id": "string",
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

### Error Response (400 Bad Request / 404 Not Found / 500 Internal Server Error)

```json
{
  "detail": "string (error message)",
  "errors": {
    "field_name": ["error message 1", "error message 2"]
  }
}
```

---

## Field Descriptions

### Core Appointment Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `patient_id` | string | Yes | Patient identifier (chart number or ID) |
| `date` | string | Yes | Appointment date in YYYY-MM-DD format |
| `start_time` | string | Yes | Start time in HH:MM format (24-hour) |
| `duration` | integer | Yes | Duration in minutes (must be > 0) |
| `procedure_type` | string | Yes | Procedure type ID or name |
| `operatory` | string | Yes | Operatory ID |
| `provider` | string | Yes | Provider name |
| `status` | string | No | Appointment status (defaults to "Scheduled") |
| `notes` | string | No | Appointment notes |

### Lab Information Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `lab` | boolean | No | Whether lab work is required (defaults to false) |
| `lab_dds` | string | No | Lab DDS (Dental Design Studio) name |
| `lab_cost` | number | No | Lab cost (decimal) |
| `lab_sent_on` | string | No | Date lab work was sent (YYYY-MM-DD) |
| `lab_due_on` | string | No | Date lab work is due (YYYY-MM-DD) |
| `lab_recvd_on` | string | No | Date lab work was received (YYYY-MM-DD) |

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

### Treatment Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
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

---

## Validation Rules

### Appointment Validation

1. **Required Fields:**
   - `patient_id` must exist in the patients table
   - `date` must be a valid date in YYYY-MM-DD format
   - `start_time` must be a valid time in HH:MM format (24-hour)
   - `duration` must be a positive integer
   - `procedure_type` must exist in procedure_types table
   - `operatory` must exist in operatories table
   - `provider` must exist in providers table

2. **Date/Time Validation:**
   - `date` cannot be in the past (unless updating existing appointment)
   - `start_time` must be within business hours (if configured)
   - `end_time` is automatically calculated as `start_time + duration`

3. **Operatory Validation:**
   - Operatory must be available at the specified date/time
   - Operatory must belong to the current office

4. **Provider Validation:**
   - Provider must be assigned to the selected operatory (if operatory-provider mapping exists)

### Treatment Validation

1. **Required Fields:**
   - `procedure_code` must exist in procedure_codes table
   - `status` must be a valid treatment status
   - `description` cannot be empty
   - `duration` must be a positive integer
   - `provider` must exist in providers table
   - `fee` must be a non-negative number

2. **Business Rules:**
   - Total treatment duration should not exceed appointment duration (warning, not error)
   - If `tooth` is provided, it should be a valid tooth identifier
   - If `surface` is provided, it should be a valid surface identifier

### Lab Information Validation

1. If `lab` is `true`, `lab_dds` is recommended but not required
2. `lab_cost` must be a non-negative number if provided
3. Lab dates (`lab_sent_on`, `lab_due_on`, `lab_recvd_on`) must be valid dates in YYYY-MM-DD format
4. `lab_recvd_on` should not be before `lab_sent_on` (warning, not error)

---

## Database Schema

### Appointments Table

```sql
CREATE TABLE appointments (
  id VARCHAR(50) PRIMARY KEY,
  patient_id VARCHAR(50) NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration INTEGER NOT NULL,
  procedure_type VARCHAR(100) NOT NULL,
  operatory VARCHAR(50) NOT NULL,
  provider VARCHAR(200) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'Scheduled',
  notes TEXT,
  
  -- Lab fields
  lab BOOLEAN DEFAULT FALSE,
  lab_dds VARCHAR(200),
  lab_cost DECIMAL(10, 2),
  lab_sent_on DATE,
  lab_due_on DATE,
  lab_recvd_on DATE,
  
  -- Flags
  missed BOOLEAN DEFAULT FALSE,
  cancelled BOOLEAN DEFAULT FALSE,
  
  -- Additional fields
  campaign_id VARCHAR(100),
  
  -- Treatment plan linkage
  treatment_plan_id VARCHAR(50),
  treatment_plan_phase_id VARCHAR(50),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (operatory) REFERENCES operatories(id),
  FOREIGN KEY (procedure_type) REFERENCES procedure_types(id),
  FOREIGN KEY (treatment_plan_id) REFERENCES treatment_plans(id),
  FOREIGN KEY (treatment_plan_phase_id) REFERENCES treatment_plan_phases(id),
  
  INDEX idx_patient_id (patient_id),
  INDEX idx_date (date),
  INDEX idx_operatory (operatory),
  INDEX idx_provider (provider),
  INDEX idx_status (status)
);
```

### Appointment Treatments Table

```sql
CREATE TABLE appointment_treatments (
  id VARCHAR(50) PRIMARY KEY,
  appointment_id VARCHAR(50) NOT NULL,
  procedure_code VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL,
  tooth VARCHAR(10),
  surface VARCHAR(50),
  description VARCHAR(500) NOT NULL,
  bill_to VARCHAR(50) DEFAULT 'Patient',
  duration INTEGER NOT NULL,
  provider VARCHAR(200) NOT NULL,
  provider_units INTEGER DEFAULT 1,
  est_patient DECIMAL(10, 2),
  est_insurance DECIMAL(10, 2),
  fee DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
  FOREIGN KEY (procedure_code) REFERENCES procedure_codes(code),
  
  INDEX idx_appointment_id (appointment_id),
  INDEX idx_procedure_code (procedure_code)
);
```

---

## Business Logic

### Appointment Creation

1. **Automatic Calculations:**
   - `end_time` = `start_time + duration` (calculated automatically)
   - If `status` is not provided, default to "Scheduled"

2. **Operatory Availability:**
   - Check if operatory is available at the specified date/time
   - If not available, return 400 Bad Request with error message

3. **Treatment Plan Linkage:**
   - If `treatment_plan_id` is provided, validate it exists and belongs to the patient
   - If `treatment_plan_phase_id` is provided, validate it belongs to the treatment plan

4. **Treatment Creation:**
   - If `treatments` array is provided, create records in `appointment_treatments` table
   - Each treatment is linked to the appointment via `appointment_id`

### Appointment Update

1. **Partial Updates:**
   - All fields are optional (except `id` in URL)
   - Only provided fields are updated
   - `updated_at` timestamp is automatically updated

2. **Treatment Updates:**
   - If `treatments` array is provided:
     - **Option A (Recommended):** Replace all existing treatments with the new array
     - **Option B:** Merge with existing treatments (requires additional logic)
   - If `treatments` is not provided, existing treatments remain unchanged

3. **Validation:**
   - Same validation rules as creation
   - Additional check: appointment must exist

---

## Error Handling

### Common Error Scenarios

1. **400 Bad Request:**
   - Missing required fields
   - Invalid date/time format
   - Invalid patient_id, operatory, provider, or procedure_type
   - Operatory not available at specified time
   - Invalid treatment data

2. **404 Not Found:**
   - Appointment ID not found (for updates)
   - Patient ID not found
   - Operatory ID not found
   - Provider not found

3. **409 Conflict:**
   - Operatory already booked at specified time
   - Duplicate appointment (if business rules require)

4. **500 Internal Server Error:**
   - Database errors
   - Unexpected server errors

### Error Response Format

```json
{
  "detail": "Operatory OP1 is not available at 2024-12-20 09:00",
  "errors": {
    "operatory": ["Operatory is not available at the specified time"],
    "start_time": ["Time slot is already booked"]
  }
}
```

---

## Implementation Notes

### Frontend Implementation

1. **Date/Time Formatting:**
   - Frontend uses MM/DD/YYYY for display, but sends YYYY-MM-DD to API
   - Frontend uses "09:00 AM" format for display, but sends "09:00" (24-hour) to API

2. **Treatment Transformation:**
   - Frontend uses camelCase (`procedureCode`, `estPatient`, etc.)
   - API expects snake_case (`procedure_code`, `est_patient`, etc.)
   - Transformation happens in `schedulerApi.ts`

3. **Optional Fields:**
   - Fields with `undefined` values are removed from payload before sending
   - Empty strings for optional fields are sent as `null` or omitted

### Backend Implementation

1. **Transaction Handling:**
   - Appointment creation and treatment creation should be in a single transaction
   - If treatment creation fails, rollback appointment creation

2. **Automatic Calculations:**
   - Calculate `end_time` from `start_time + duration`
   - Update `updated_at` timestamp on every update

3. **Validation Order:**
   1. Validate required fields
   2. Validate data formats (date, time, etc.)
   3. Validate foreign key references (patient, operatory, provider, etc.)
   4. Validate business rules (availability, etc.)
   5. Create/update records

4. **Treatment Handling:**
   - When updating appointments with treatments, consider:
     - Deleting existing treatments and creating new ones (simpler)
     - Comparing and updating only changed treatments (more complex but preserves history)

---

## Testing Examples

### Test Case 1: Create Basic Appointment

**Request:**
```bash
POST /api/v1/scheduler/appointments
Content-Type: application/json

{
  "patient_id": "CH001",
  "date": "2024-12-20",
  "start_time": "09:00",
  "duration": 60,
  "procedure_type": "PROC001",
  "operatory": "OP1",
  "provider": "Dr. Jinna"
}
```

**Expected Response:** 201 Created with appointment object

### Test Case 2: Create Appointment with Invalid Time

**Request:**
```bash
POST /api/v1/scheduler/appointments
Content-Type: application/json

{
  "patient_id": "CH001",
  "date": "2024-12-20",
  "start_time": "25:00",  // Invalid time
  "duration": 60,
  "procedure_type": "PROC001",
  "operatory": "OP1",
  "provider": "Dr. Jinna"
}
```

**Expected Response:** 400 Bad Request with validation error

### Test Case 3: Update Appointment Status

**Request:**
```bash
PUT /api/v1/scheduler/appointments/APT001
Content-Type: application/json

{
  "status": "Completed",
  "missed": false,
  "cancelled": false
}
```

**Expected Response:** 200 OK with updated appointment object

### Test Case 4: Create Appointment with Treatments

**Request:**
```bash
POST /api/v1/scheduler/appointments
Content-Type: application/json

{
  "patient_id": "CH002",
  "date": "2024-12-21",
  "start_time": "10:00",
  "duration": 90,
  "procedure_type": "PROC002",
  "operatory": "OP2",
  "provider": "Dr. Smith",
  "treatments": [
    {
      "procedure_code": "D0120",
      "status": "TP",
      "description": "Periodic Oral Evaluation",
      "duration": 15,
      "provider": "Dr. Smith",
      "fee": 75.00
    }
  ]
}
```

**Expected Response:** 201 Created with appointment and treatments

---

## API Versioning

- Current Version: `v1`
- Base Path: `/api/v1/scheduler/appointments`

---

## Authentication & Authorization

- All endpoints require authentication (JWT token in Authorization header)
- Users must have permission to create/update appointments
- Office-level access control: users can only create appointments for their assigned offices

---

## Rate Limiting

- Recommended: 100 requests per minute per user
- Burst limit: 20 requests per second

---

## Changelog

### Version 1.0.0 (2024-12-20)
- Initial API contract
- Support for basic appointment creation/update
- Support for lab information
- Support for treatments
- Support for treatment plan linkage
