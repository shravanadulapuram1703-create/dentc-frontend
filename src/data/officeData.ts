/**
 * Office Setup form types — snake_case, aligned 1:1 with the generated backend
 * models (`OfficeRead`/`OfficeUpdate`, `OperatoryRead`). Per the project naming
 * convention (see CLAUDE.md), the frontend uses the backend's snake_case field
 * names directly — no camelCase aliases or snake↔camel mapping layers.
 *
 * (The previous mock `Office` interface + `mockOffices` fixtures were removed;
 * Office Setup is fully backend-driven.)
 */

/** One operatory as held in the office form (mirrors OperatoryRead, snake_case). */
export interface OperatoryUi {
  id: string;
  name: string;
  display_order: number;
  is_active: boolean;
  has_future_appointments?: boolean;
  /** Local-only until the operatory model gains the field (backend gap #23). */
  default_provider_id?: string;
  default_provider_name?: string;
}

/**
 * The editable office record held in OfficeSetup form state. Field names match
 * `OfficeUpdate`/`OfficeRead` (snake_case). `operatories` is composed from the
 * `/operatories` resource and diffed on save.
 */
export interface OfficeForm {
  id?: number;
  office_code?: string | null;
  name?: string | null;
  short_id?: string | null;

  // Address
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  timezone?: string | null;

  // Contact
  phone?: string | null;
  phone_2?: string | null;
  phone_ext?: string | null;
  fax?: string | null;
  email?: string | null;

  // Scheduler
  slot_interval_minutes?: number | null;
  schedule_start_hour?: number | null;
  schedule_end_hour?: number | null;

  // Billing / fee schedules (gap #11 — now backed by OfficeRead/Update)
  tax_id?: string | null;
  billing_provider_id?: string | null;
  use_billing_license?: boolean | null;
  office_group_id?: number | null;
  opening_date?: string | null;
  default_fee_schedule_id?: number | null;
  default_ucr_fee_schedule_id?: number | null;

  is_active?: boolean | null;

  // Audit (read-only). NB: OfficeRead has no `updated_by` (backend gap #22).
  created_by?: number | string | null;
  created_at?: string | null;
  updated_at?: string | null;

  // Composed from /operatories
  operatories?: OperatoryUi[];
}
