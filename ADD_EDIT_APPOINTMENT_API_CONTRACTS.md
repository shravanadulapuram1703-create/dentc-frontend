# Add/Edit Appointment Page - API Contracts

This document defines all APIs required to make the Add/Edit Appointment page fully dynamic and API-driven.

## Table of Contents

1. [Existing APIs (Already Implemented)](#existing-apis)
2. [New APIs Required](#new-apis-required)
3. [Data Model Changes](#data-model-changes)
4. [Implementation Notes](#implementation-notes)

---

## Existing APIs (Already Implemented)

These APIs are already available and should be used:

### 1. Providers API
- **Endpoint:** `GET /api/v1/scheduler/providers`
- **Query Params:** `office_id` (optional)
- **Response:** `{ providers: Provider[] }`
- **Status:** ✅ Implemented

### 2. Operatories API
- **Endpoint:** `GET /api/v1/scheduler/operatories`
- **Query Params:** `office_id` (optional)
- **Response:** `{ operatories: Operatory[] }`
- **Status:** ✅ Implemented

### 3. Procedure Types API
- **Endpoint:** `GET /api/v1/scheduler/procedure-types`
- **Response:** `{ procedure_types: ProcedureType[] }`
- **Status:** ✅ Implemented

### 4. Scheduler Config API
- **Endpoint:** `GET /api/v1/scheduler/config`
- **Query Params:** `office_id` (optional)
- **Response:** `{ config: SchedulerConfig }`
- **Status:** ✅ Implemented

### 5. Create/Update Appointment API
- **Endpoint:** `POST /api/v1/scheduler/appointments` (create)
- **Endpoint:** `PUT /api/v1/scheduler/appointments/{id}` (update)
- **Status:** ✅ Implemented

---

## New APIs Required

### 1. Appointment Status Types API

**Endpoint:** `GET /api/v1/scheduler/appointment-statuses`

**Description:** Fetch all available appointment status types for the status dropdown.

**Query Parameters:** None

**Response Schema:**
```json
{
  "statuses": [
    {
      "id": "string (unique identifier, e.g., 'STATUS001')",
      "name": "string (e.g., 'Scheduled', 'Confirmed')",
      "displayName": "string (e.g., 'Scheduled', 'Confirmed')",
      "color": "string (optional, CSS color or hex, e.g., '#3A6EA5')"
    }
  ]
}
```

**Example Response:**
```json
{
  "statuses": [
    {
      "id": "STATUS001",
      "name": "Scheduled",
      "displayName": "Scheduled",
      "color": "#3A6EA5"
    },
    {
      "id": "STATUS002",
      "name": "Confirmed",
      "displayName": "Confirmed",
      "color": "#2FB9A7"
    },
    {
      "id": "STATUS003",
      "name": "Unconfirmed",
      "displayName": "Unconfirmed",
      "color": "#F59E0B"
    },
    {
      "id": "STATUS004",
      "name": "Left Message",
      "displayName": "Left Msg",
      "color": "#8B5CF6"
    },
    {
      "id": "STATUS005",
      "name": "In Operatory",
      "displayName": "In Operatory",
      "color": "#10B981"
    },
    {
      "id": "STATUS006",
      "name": "Available",
      "displayName": "Available",
      "color": "#6B7280"
    },
    {
      "id": "STATUS007",
      "name": "In Reception",
      "displayName": "In Reception",
      "color": "#EC4899"
    },
    {
      "id": "STATUS008",
      "name": "Checked Out",
      "displayName": "Checked Out",
      "color": "#14B8A6"
    },
    {
      "id": "STATUS009",
      "name": "Missed",
      "displayName": "Missed",
      "color": "#EF4444"
    },
    {
      "id": "STATUS010",
      "name": "Cancelled",
      "displayName": "Cancelled",
      "color": "#DC2626"
    }
  ]
}
```

**DB Table Impact:**
- Create `appointment_statuses` table:
  ```sql
  CREATE TABLE appointment_statuses (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    color VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  );
  ```

---

### 2. Appointment Types API (Optional)

**Endpoint:** `GET /api/v1/scheduler/appointment-types`

**Description:** Fetch appointment types (if different from procedure types). This may be the same as procedure types, in which case this API can be skipped.

**Query Parameters:** None

**Response Schema:**
```json
{
  "appointment_types": [
    {
      "id": "string (unique identifier)",
      "name": "string (e.g., 'New Patient', 'Follow-up')",
      "description": "string (optional)"
    }
  ]
}
```

**Example Response:**
```json
{
  "appointment_types": [
    {
      "id": "TYPE001",
      "name": "New Patient",
      "description": "First visit appointment"
    },
    {
      "id": "TYPE002",
      "name": "Follow-up",
      "description": "Follow-up appointment"
    }
  ]
}
```

**DB Table Impact:**
- Create `appointment_types` table (if needed):
  ```sql
  CREATE TABLE appointment_types (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  ```

**Note:** If appointment types are the same as procedure types, this API can be skipped and procedure types can be reused.

---

### 3. Procedure Codes API (Quick Add)

**Endpoint:** `GET /api/v1/procedures/codes`

**Description:** Fetch all procedure codes for the Quick Add procedure browser. Supports filtering by category and search.

**Query Parameters:**
- `category` (optional, string): Filter by procedure category
- `search` (optional, string): Search in code, userCode, or description

**Response Schema:**
```json
{
  "procedure_codes": [
    {
      "code": "string (e.g., 'D0120')",
      "userCode": "string (e.g., 'PROPHY-ADULT')",
      "description": "string (e.g., 'Periodic Oral Evaluation')",
      "category": "string (e.g., 'DIAGNOSTIC', 'PREVENTIVE')",
      "requirements": {
        "tooth": "boolean",
        "surface": "boolean",
        "quadrant": "boolean",
        "materials": "boolean"
      },
      "defaultFee": "number (e.g., 75.00)",
      "defaultDuration": "number (optional, minutes, e.g., 30)"
    }
  ]
}
```

**Example Request:**
```
GET /api/v1/procedures/codes?category=DIAGNOSTIC&search=D0120
```

**Example Response:**
```json
{
  "procedure_codes": [
    {
      "code": "D0120",
      "userCode": "-",
      "description": "Periodic Oral Evaluation",
      "category": "DIAGNOSTIC",
      "requirements": {
        "tooth": false,
        "surface": false,
        "quadrant": false,
        "materials": false
      },
      "defaultFee": 75.00,
      "defaultDuration": 15
    },
    {
      "code": "D0140",
      "userCode": "-",
      "description": "Limited Oral Eval Prob Focused",
      "category": "DIAGNOSTIC",
      "requirements": {
        "tooth": false,
        "surface": false,
        "quadrant": false,
        "materials": false
      },
      "defaultFee": 85.00,
      "defaultDuration": 20
    }
  ]
}
```

**DB Table Impact:**
- Create `procedure_codes` table:
  ```sql
  CREATE TABLE procedure_codes (
    code VARCHAR(20) PRIMARY KEY,
    user_code VARCHAR(50),
    description VARCHAR(500) NOT NULL,
    category VARCHAR(100) NOT NULL,
    requires_tooth BOOLEAN DEFAULT FALSE,
    requires_surface BOOLEAN DEFAULT FALSE,
    requires_quadrant BOOLEAN DEFAULT FALSE,
    requires_materials BOOLEAN DEFAULT FALSE,
    default_fee DECIMAL(10, 2) NOT NULL,
    default_duration INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category (category),
    INDEX idx_code (code),
    INDEX idx_user_code (user_code),
    FULLTEXT INDEX idx_description (description)
  );
  ```

---

### 4. Procedure Categories API

**Endpoint:** `GET /api/v1/procedures/categories`

**Description:** Fetch all procedure categories for filtering procedure codes.

**Query Parameters:** None

**Response Schema:**
```json
{
  "categories": [
    {
      "id": "string (e.g., 'DIAGNOSTIC')",
      "name": "string (e.g., 'DIAGNOSTIC')",
      "displayName": "string (e.g., 'Diagnostic')"
    }
  ]
}
```

**Example Response:**
```json
{
  "categories": [
    {
      "id": "ALL",
      "name": "ALL",
      "displayName": "All"
    },
    {
      "id": "DIAGNOSTIC",
      "name": "DIAGNOSTIC",
      "displayName": "Diagnostic"
    },
    {
      "id": "PREVENTIVE",
      "name": "PREVENTIVE",
      "displayName": "Preventive"
    },
    {
      "id": "RESTORATIVE",
      "name": "RESTORATIVE",
      "displayName": "Restorative"
    },
    {
      "id": "ENDODONTICS",
      "name": "ENDODONTICS",
      "displayName": "Endodontics"
    },
    {
      "id": "PERIODONTICS",
      "name": "PERIODONTICS",
      "displayName": "Periodontics"
    },
    {
      "id": "PROSTHODONTICS",
      "name": "PROSTHODONTICS",
      "displayName": "Prosthodontics"
    },
    {
      "id": "ORAL_SURGERY",
      "name": "ORAL_SURGERY",
      "displayName": "Oral Surgery"
    },
    {
      "id": "ORTHODONTICS",
      "name": "ORTHODONTICS",
      "displayName": "Orthodontics"
    },
    {
      "id": "IMPLANT_SERVICES",
      "name": "IMPLANT_SERVICES",
      "displayName": "Implant Services"
    },
    {
      "id": "ALL_MEDICAL",
      "name": "ALL_MEDICAL",
      "displayName": "All Medical"
    }
  ]
}
```

**DB Table Impact:**
- Create `procedure_categories` table:
  ```sql
  CREATE TABLE procedure_categories (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  ```

---

### 5. Treatment Plans API

**Endpoint:** `GET /api/v1/patients/{patient_id}/treatment-plans`

**Description:** Fetch all treatment plans for a specific patient. Treatment plans contain phases, and phases contain procedures.

**Path Parameters:**
- `patient_id` (required, string): Patient ID

**Query Parameters:**
- `status` (optional, string): Filter by status ("Active", "Completed", "Cancelled")
- `include_completed` (optional, boolean): Include completed plans (default: false)

**Response Schema:**
```json
{
  "treatment_plans": [
    {
      "id": "string (unique identifier)",
      "name": "string (e.g., 'Plan 1', 'Comprehensive Treatment')",
      "patientId": "string",
      "phases": [
        {
          "id": "string (unique identifier)",
          "name": "string (e.g., 'Phase 1', 'Initial Treatment')",
          "procedures": [
            {
              "id": "string (unique identifier)",
              "code": "string (e.g., 'Z6000')",
              "description": "string (e.g., 'Impressions Diagnosed')",
              "tooth": "string (optional)",
              "surface": "string (optional)",
              "diagnosedProvider": "string (provider name)",
              "fee": "number (e.g., 250.00)",
              "insuranceEstimate": "number (e.g., 0.00)",
              "status": "string (enum: 'Planned' | 'Scheduled' | 'Completed')"
            }
          ]
        }
      ],
      "createdDate": "string (ISO 8601 date, e.g., '2024-01-15T10:30:00Z')",
      "status": "string (enum: 'Active' | 'Completed' | 'Cancelled')"
    }
  ]
}
```

**Example Request:**
```
GET /api/v1/patients/900097/treatment-plans?status=Active
```

**Example Response:**
```json
{
  "treatment_plans": [
    {
      "id": "TXP-001",
      "name": "Plan 1",
      "patientId": "900097",
      "phases": [
        {
          "id": "PHASE-001",
          "name": "Phase 1",
          "procedures": [
            {
              "id": "PROC-001",
              "code": "Z6000",
              "description": "Impressions Diagnosed (6963/JN, Ahmed, Mary)",
              "tooth": "",
              "surface": "",
              "diagnosedProvider": "Dr. Ahmed",
              "fee": 250.00,
              "insuranceEstimate": 0.00,
              "status": "Planned"
            },
            {
              "id": "PROC-002",
              "code": "Z6000",
              "description": "Impressions Diagnosed (6963/JN, Ahmed, Meier)",
              "tooth": "",
              "surface": "",
              "diagnosedProvider": "Dr. Ahmed",
              "fee": 250.00,
              "insuranceEstimate": 0.00,
              "status": "Planned"
            }
          ]
        }
      ],
      "createdDate": "2024-01-15T10:30:00Z",
      "status": "Active"
    }
  ]
}
```

**DB Table Impact:**
- Create `treatment_plans` table:
  ```sql
  CREATE TABLE treatment_plans (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    patient_id VARCHAR(50) NOT NULL,
    status ENUM('Active', 'Completed', 'Cancelled') DEFAULT 'Active',
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id),
    INDEX idx_patient_id (patient_id),
    INDEX idx_status (status)
  );
  ```

- Create `treatment_plan_phases` table:
  ```sql
  CREATE TABLE treatment_plan_phases (
    id VARCHAR(50) PRIMARY KEY,
    treatment_plan_id VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    phase_order INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (treatment_plan_id) REFERENCES treatment_plans(id) ON DELETE CASCADE,
    INDEX idx_treatment_plan_id (treatment_plan_id)
  );
  ```

- Create `treatment_plan_procedures` table:
  ```sql
  CREATE TABLE treatment_plan_procedures (
    id VARCHAR(50) PRIMARY KEY,
    phase_id VARCHAR(50) NOT NULL,
    procedure_code VARCHAR(20) NOT NULL,
    description VARCHAR(500) NOT NULL,
    tooth VARCHAR(10),
    surface VARCHAR(50),
    diagnosed_provider VARCHAR(200) NOT NULL,
    fee DECIMAL(10, 2) NOT NULL,
    insurance_estimate DECIMAL(10, 2) DEFAULT 0.00,
    status ENUM('Planned', 'Scheduled', 'Completed') DEFAULT 'Planned',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (phase_id) REFERENCES treatment_plan_phases(id) ON DELETE CASCADE,
    FOREIGN KEY (procedure_code) REFERENCES procedure_codes(code),
    INDEX idx_phase_id (phase_id),
    INDEX idx_status (status)
  );
  ```

---

### 6. Organization/Office Context API

**Note:** This information is already available via `AuthContext`. The frontend should use:
- `currentOrganization` from `AuthContext` for Organization ID
- `currentOffice` from `AuthContext` for Office ID
- `organizations` array from `AuthContext` to get organization details

**No new API required** - use existing AuthContext.

---

## Data Model Changes

### Appointment Table Updates

The appointment table should support all fields used in the Add/Edit Appointment form:

```sql
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS
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
  
  FOREIGN KEY (treatment_plan_id) REFERENCES treatment_plans(id),
  FOREIGN KEY (treatment_plan_phase_id) REFERENCES treatment_plan_phases(id);
```

### Appointment Treatments Table

Create a table to store treatments/procedures linked to appointments:

```sql
CREATE TABLE appointment_treatments (
  id VARCHAR(50) PRIMARY KEY,
  appointment_id VARCHAR(50) NOT NULL,
  procedure_code VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL, -- 'TP' (Treatment Planned), 'C' (Completed), etc.
  tooth VARCHAR(10),
  surface VARCHAR(50),
  description VARCHAR(500),
  bill_to VARCHAR(50) DEFAULT 'Patient', -- 'Patient', 'Insurance', etc.
  duration INTEGER NOT NULL, -- minutes
  provider VARCHAR(200) NOT NULL,
  provider_units INTEGER DEFAULT 1,
  est_patient DECIMAL(10, 2),
  est_insurance DECIMAL(10, 2),
  fee DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
  FOREIGN KEY (procedure_code) REFERENCES procedure_codes(code),
  INDEX idx_appointment_id (appointment_id)
);
```

---

## Implementation Notes

### Frontend Implementation

1. **Component Mount:** On `AddEditAppointmentForm` mount, fetch all metadata:
   - Providers (from existing API)
   - Operatories (from existing API)
   - Procedure Types (from existing API)
   - Status Types (from new API)
   - Procedure Codes (from new API, can be lazy-loaded)
   - Procedure Categories (from new API)
   - Treatment Plans (from new API, for the patient)

2. **Dynamic Context Header:**
   - Use `useAuth()` hook to get `currentOrganization` and `currentOffice`
   - Display Organization ID (PGID) and Office ID (OID) dynamically

3. **Treatment Plans Tab:**
   - Fetch treatment plans on mount using `fetchTreatmentPlans(patient.patientId)`
   - Display plans, phases, and procedures dynamically
   - When procedures are selected and added to appointment, link them via `appointment_treatments` table

4. **Quick Add Tab:**
   - Fetch procedure codes on tab open (lazy load)
   - Filter by category and search dynamically
   - When procedures are selected and added, create treatment records

5. **Save Appointment:**
   - Save appointment via `createAppointment` or `updateAppointment`
   - Save treatments via separate API call or include in appointment payload
   - Persist all form data (lab info, flags, notes, campaign, etc.)

### Backend Implementation Priority

1. **High Priority (Required for basic functionality):**
   - Appointment Status Types API
   - Procedure Codes API
   - Procedure Categories API
   - Treatment Plans API

2. **Medium Priority (Can use existing data initially):**
   - Appointment Types API (if different from procedure types)

3. **Database Migrations:**
   - Create all new tables as defined above
   - Migrate existing static data to database
   - Update appointment table with new fields

### Data Migration

1. **Procedure Codes:**
   - Migrate static `procedureCodes.ts` data to `procedure_codes` table
   - Ensure all categories exist in `procedure_categories` table

2. **Status Types:**
   - Insert default status types into `appointment_statuses` table

3. **Treatment Plans:**
   - If existing treatment plans exist in another system, migrate them
   - Otherwise, start with empty table

---

## Summary

### APIs to Implement (New):
1. ✅ `GET /api/v1/scheduler/appointment-statuses` - **REQUIRED**
2. ⚠️ `GET /api/v1/scheduler/appointment-types` - **OPTIONAL** (may reuse procedure types)
3. ✅ `GET /api/v1/procedures/codes` - **REQUIRED**
4. ✅ `GET /api/v1/procedures/categories` - **REQUIRED**
5. ✅ `GET /api/v1/patients/{patient_id}/treatment-plans` - **REQUIRED**

### APIs Already Available:
- ✅ Providers API
- ✅ Operatories API
- ✅ Procedure Types API
- ✅ Scheduler Config API
- ✅ Create/Update Appointment API

### Database Tables to Create:
1. `appointment_statuses`
2. `procedure_codes`
3. `procedure_categories`
4. `treatment_plans`
5. `treatment_plan_phases`
6. `treatment_plan_procedures`
7. `appointment_treatments`

### Database Tables to Update:
1. `appointments` (add lab fields, flags, campaign, treatment plan linkage)

---

**End of Document**
