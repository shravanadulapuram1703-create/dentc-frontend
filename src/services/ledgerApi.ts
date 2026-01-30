import api from "./api";

// ===== TYPES =====

export interface LedgerEntry {
  id: string;
  transaction_id: string;
  posted_date: string; // YYYY-MM-DD
  patient_id: string;
  patient_name: string;
  office_id: string;
  office_name: string;
  apply_to: string; // "P" or "R"
  code: string;
  tooth: string;
  surface: string;
  type: "P" | "C"; // Production or Collection
  has_notes: boolean;
  has_eob: boolean;
  has_attachments: boolean;
  description: string;
  billing_order: string;
  duration_minutes: number | null;
  provider_id: string;
  provider_name: string;
  est_patient: number;
  est_insurance: number;
  posted_amount: number;
  running_balance: number;
  created_by: string;
  created_at: string;
  transaction_type: "procedure" | "patient_payment" | "insurance_payment" | "adjustment" | "claim_event";
  status: "not_sent" | "sent" | "paid" | "partial" | "denied" | "posted" | "";
  procedure_id: string | null;
  claim_id: string | null;
  payment_id: string | null;
  adjustment_id: string | null;
}

export interface LedgerResponse {
  ledger_entries: LedgerEntry[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
}

export interface BalancesResponse {
  account_balance: number;
  patient_balance: number;
  insurance_balance: number;
  estimated_insurance: number;
  estimated_patient: number;
  aging: {
    current: number;
    age_30: number;
    age_60: number;
    age_90: number;
    age_120: number;
  };
  recent_activity: {
    today_charges: number;
    last_insurance_payment: {
      amount: number;
      date: string;
    } | null;
    last_patient_payment: {
      amount: number;
      date: string;
    } | null;
  };
}

export interface ProcedureCreateRequest {
  procedure_code: string;
  date_of_service: string; // YYYY-MM-DD
  provider_id: string;
  office_id: string;
  tooth?: string | null;
  surface?: string | null;
  quadrant?: string | null;
  materials?: string[] | null;
  duration_minutes?: number;
  fee: number;
  est_patient: number;
  est_insurance: number;
  billing_order?: string;
  notes?: string | null;
  apply_to?: string; // "P" or "R"
}

export interface ProcedureCreateResponse {
  procedure_id: string;
  ledger_entry_id: string;
  transaction_id: string;
  posted_date: string;
  running_balance: number;
  status: string;
  created_at: string;
}

export interface ProcedureResponse {
  procedure_id: string;
  procedure_code: string;
  date_of_service: string;
  provider_id: string;
  provider_name: string;
  office_id: string;
  office_name: string;
  tooth: string | null;
  surface: string | null;
  quadrant: string | null;
  materials: string[] | null;
  duration_minutes: number;
  fee: number;
  est_patient: number;
  est_insurance: number;
  billing_order: string;
  notes: string | null;
  status: string;
  claim_id: string | null;
  ledger_entry_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ClaimCreateRequest {
  procedure_ids: string[];
  claim_type: "dental" | "medical";
  billing_order: string;
  date_of_service_from?: string;
  date_of_service_to?: string;
  notes?: string | null;
}

export interface ClaimProcedure {
  procedure_id: string;
  procedure_code: string;
  date_of_service: string;
  fee: number;
  est_insurance: number;
}

export interface ClaimCreateResponse {
  claim_id: string;
  claim_number: string;
  status: string;
  claim_type: string;
  billing_order: string;
  date_of_service_from: string;
  date_of_service_to: string;
  total_submitted_fees: number;
  total_fee: number;
  total_est_insurance: number;
  procedures: ClaimProcedure[];
  created_by: string;
  created_at: string;
}

export interface ClaimDetailResponse {
  claim_id: string;
  claim_number: string;
  status: string;
  claim_type: string;
  billing_order: string;
  date_of_service_from: string;
  date_of_service_to: string;
  created_date: string;
  created_time: string;
  created_by: string;
  last_status_update_date: string | null;
  claim_sent_date: string | null;
  claim_sent_status: string | null;
  claim_close_date: string | null;
  claim_closed_by: string | null;
  dxc_attachment_id: string | null;
  icd10_codes: string | null;
  patient_info: {
    patient_id: string;
    patient_name: string;
    patient_dob: string;
    subscriber_name: string;
    subscriber_id: string;
    subscriber_dob: string;
    responsible_party_name: string;
    responsible_party_id: string;
    responsible_party_dob: string;
  };
  coverage_info: {
    insurance_carrier: string;
    carrier_phone: string | null;
    group_plan: string | null;
    benefits_used: string | null;
    employer_name: string | null;
    deductibles_used: string | null;
  };
  billing_dentist: {
    provider_id: string;
    provider_name: string;
  };
  treating_dentist: {
    provider_id: string;
    provider_name: string;
  };
  amounts: {
    total_submitted_fees: number;
    total_fee: number;
    total_est_insurance: number;
    total_insurance_paid: number;
    variance: number;
  };
  payment_info: {
    check_number: string | null;
    bank_number: string | null;
    eob_number: string | null;
  };
  notes: string | null;
  attachment_required: boolean;
  procedures: Array<{
    procedure_id: string;
    dos: string;
    code: string;
    tooth: string | null;
    surface: string | null;
    description: string;
    bref: string;
    submitted: number;
    fee: number;
    est_ins: number;
    ins_paid: number;
    ins_overpayment: number;
    ins_allocated: number;
    overpayment_disbursement: number;
    write_off_1: number;
    write_off_2: number;
    write_off_3: number;
    other_insurance: number;
    reason_code: string | null;
  }>;
  attachments: Array<{
    attachment_id: string;
    attachment_type: string;
    required: boolean;
    provided: boolean;
    file_name: string | null;
    uploaded_at: string | null;
  }>;
}

export interface ClaimSendRequest {
  batch_id?: string | null;
  send_method: "electronic" | "paper" | "fax";
}

export interface ClaimSendResponse {
  claim_id: string;
  batch_id: string;
  status: string;
  sent_date: string;
  sent_time: string;
  sent_by: string;
  send_method: string;
}

export interface ClaimListItem {
  claim_id: string;
  claim_number: string;
  status: string;
  claim_type: string;
  date_of_service_from: string;
  date_of_service_to: string;
  total_fee: number;
  total_est_insurance: number;
  created_date: string;
  created_by: string;
}

export interface ClaimsListResponse {
  claims: ClaimListItem[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
}

export interface PaymentCreateRequest {
  payment_date: string; // YYYY-MM-DD
  payment_amount: number;
  payment_type: "patient" | "insurance";
  payment_method: string;
  apply_to: "P" | "R";
  provider_id?: string | null;
  procedure_ids?: string[];
  check_number?: string | null;
  bank_number?: string | null;
  notes?: string | null;
}

export interface PaymentCreateResponse {
  payment_id: string;
  ledger_entry_id: string;
  transaction_id: string;
  posted_date: string;
  running_balance: number;
  status: string;
  created_at: string;
}

export interface PaymentResponse {
  payment_id: string;
  payment_date: string;
  payment_amount: number;
  payment_type: string;
  payment_method: string;
  apply_to: string;
  provider_id: string | null;
  provider_name: string | null;
  procedure_ids: string[];
  check_number: string | null;
  bank_number: string | null;
  notes: string | null;
  ledger_entry_id: string;
  created_by: string;
  created_at: string;
}

export interface AdjustmentCreateRequest {
  adjustment_date: string; // YYYY-MM-DD
  adjustment_amount: number; // Negative amount
  adjustment_code: string;
  adjustment_reason: string;
  apply_to: "P" | "R";
  procedure_ids?: string[];
  notes?: string | null;
}

export interface AdjustmentCreateResponse {
  adjustment_id: string;
  ledger_entry_id: string;
  transaction_id: string;
  posted_date: string;
  running_balance: number;
  status: string;
  created_at: string;
}

export interface AdjustmentResponse {
  adjustment_id: string;
  adjustment_date: string;
  adjustment_amount: number;
  adjustment_code: string;
  adjustment_reason: string;
  apply_to: string;
  procedure_ids: string[];
  notes: string | null;
  ledger_entry_id: string;
  created_by: string;
  created_at: string;
}

export interface ProcedureCode {
  code: string;
  user_code: string | null;
  description: string;
  category: string;
  requirements: {
    tooth: boolean;
    surface: boolean;
    quadrant: boolean;
    materials: boolean;
  };
  // ✅ Anatomy rules for tooth/quadrant/arch selection
  anatomyRules?: {
    mode: "TOOTH" | "QUADRANT" | "ARCH" | "FULL_MOUTH" | "NONE";
    allowedToothSet: "PERMANENT_ONLY" | "PRIMARY_ONLY" | "BOTH" | "NONE";
    allowedQuadrants?: ("UR" | "UL" | "LR" | "LL" | "UA" | "LA" | "FM")[];
    allowMultipleTeeth: boolean;
  };
  // ✅ Surface-specific rules
  surfaceRules?: {
    enabled: boolean;
    min?: number;
    max?: number;
    allowedSurfaces?: string[];
  };
  // ✅ Materials-specific rules
  materialsRules?: {
    enabled: boolean;
    options?: string[];
    min?: number;
    max?: number;
  };
  default_fee?: number;
  default_duration?: number;
  is_active: boolean;
}

export interface ProcedureCodesResponse {
  procedure_codes: ProcedureCode[];
  categories: string[];
}

export interface PaymentCode {
  code: string;
  description: string;
  type: "Cash" | "Check" | "Credit Card" | "Debit Card" | "E-Check" | "Third-Party";
  is_active: boolean;
}

export interface PaymentCodesResponse {
  payment_codes: PaymentCode[];
}

export interface AdjustmentCode {
  code: string;
  description: string;
  is_active: boolean;
}

export interface AdjustmentCodesResponse {
  adjustment_codes: AdjustmentCode[];
}

export interface ClaimStatus {
  code: string;
  display_name: string;
  description: string | null;
}

export interface ClaimStatusesResponse {
  claim_statuses: ClaimStatus[];
}

export interface TransactionType {
  code: string;
  display_name: string;
  description: string | null;
}

export interface TransactionTypesResponse {
  transaction_types: TransactionType[];
}

export interface Provider {
  provider_id: string;
  provider_name: string;
  npi: string | null;
  is_active: boolean;
}

export interface ProvidersResponse {
  providers: Provider[];
}

// ===== API FUNCTIONS =====

/**
 * Get paginated ledger entries for a patient
 */
export const getPatientLedger = async (
  patientId: string,
  params?: {
    date_from?: string;
    date_to?: string;
    transaction_type?: string;
    status?: string;
    limit?: number;
    offset?: number;
    sort_by?: string;
    sort_order?: "asc" | "desc";
  }
): Promise<LedgerResponse> => {
  const queryParams: Record<string, string> = {};
  
  if (params?.date_from) queryParams.date_from = params.date_from;
  if (params?.date_to) queryParams.date_to = params.date_to;
  if (params?.transaction_type) queryParams.transaction_type = params.transaction_type;
  if (params?.status) queryParams.status = params.status;
  if (params?.limit) queryParams.limit = params.limit.toString();
  if (params?.offset) queryParams.offset = params.offset.toString();
  if (params?.sort_by) queryParams.sort_by = params.sort_by;
  if (params?.sort_order) queryParams.sort_order = params.sort_order;

  const response = await api.get<LedgerResponse>(
    `/api/v1/patients/${patientId}/ledger`,
    { params: queryParams }
  );
  return response.data;
};

/**
 * Get account balances and aging information
 */
export const getPatientBalances = async (
  patientId: string
): Promise<BalancesResponse> => {
  const response = await api.get<BalancesResponse>(
    `/api/v1/patients/${patientId}/balances`
  );
  return response.data;
};

/**
 * Add a new procedure to the patient ledger
 */
export const addProcedure = async (
  patientId: string,
  data: ProcedureCreateRequest
): Promise<ProcedureCreateResponse> => {
  const response = await api.post<ProcedureCreateResponse>(
    `/api/v1/patients/${patientId}/procedures`,
    data
  );
  return response.data;
};

/**
 * Get procedure details
 */
export const getProcedure = async (
  patientId: string,
  procedureId: string
): Promise<ProcedureResponse> => {
  const response = await api.get<ProcedureResponse>(
    `/api/v1/patients/${patientId}/procedures/${procedureId}`
  );
  return response.data;
};

/**
 * Update a procedure
 */
export const updateProcedure = async (
  patientId: string,
  procedureId: string,
  data: Partial<ProcedureCreateRequest>
): Promise<ProcedureResponse> => {
  const response = await api.put<ProcedureResponse>(
    `/api/v1/patients/${patientId}/procedures/${procedureId}`,
    data
  );
  return response.data;
};

/**
 * Delete a procedure
 */
export const deleteProcedure = async (
  patientId: string,
  procedureId: string
): Promise<void> => {
  await api.delete(`/api/v1/patients/${patientId}/procedures/${procedureId}`);
};

/**
 * Create a new claim from selected procedures
 */
export const createClaim = async (
  patientId: string,
  data: ClaimCreateRequest
): Promise<ClaimCreateResponse> => {
  const response = await api.post<ClaimCreateResponse>(
    `/api/v1/patients/${patientId}/claims`,
    data
  );
  return response.data;
};

/**
 * Get detailed claim information
 */
export const getClaim = async (
  patientId: string,
  claimId: string
): Promise<ClaimDetailResponse> => {
  const response = await api.get<ClaimDetailResponse>(
    `/api/v1/patients/${patientId}/claims/${claimId}`
  );
  return response.data;
};

/**
 * Update claim information
 */
export const updateClaim = async (
  patientId: string,
  claimId: string,
  data: {
    notes?: string | null;
    icd10_codes?: string | null;
    payment_info?: {
      check_number?: string | null;
      bank_number?: string | null;
      eob_number?: string | null;
    };
  }
): Promise<ClaimDetailResponse> => {
  const response = await api.put<ClaimDetailResponse>(
    `/api/v1/patients/${patientId}/claims/${claimId}`,
    data
  );
  return response.data;
};

/**
 * Send claim to batch processing
 */
export const sendClaim = async (
  patientId: string,
  claimId: string,
  data: ClaimSendRequest
): Promise<ClaimSendResponse> => {
  const response = await api.post<ClaimSendResponse>(
    `/api/v1/patients/${patientId}/claims/${claimId}/send`,
    data
  );
  return response.data;
};

/**
 * Get list of claims for a patient
 */
export const getPatientClaims = async (
  patientId: string,
  params?: {
    status?: string;
    limit?: number;
    offset?: number;
  }
): Promise<ClaimsListResponse> => {
  const queryParams: Record<string, string> = {};
  if (params?.status) queryParams.status = params.status;
  if (params?.limit) queryParams.limit = params.limit.toString();
  if (params?.offset) queryParams.offset = params.offset.toString();

  const response = await api.get<ClaimsListResponse>(
    `/api/v1/patients/${patientId}/claims`,
    { params: queryParams }
  );
  return response.data;
};

/**
 * Add a payment to the patient ledger
 */
export const addPayment = async (
  patientId: string,
  data: PaymentCreateRequest
): Promise<PaymentCreateResponse> => {
  const response = await api.post<PaymentCreateResponse>(
    `/api/v1/patients/${patientId}/payments`,
    data
  );
  return response.data;
};

/**
 * Get payment details
 */
export const getPayment = async (
  patientId: string,
  paymentId: string
): Promise<PaymentResponse> => {
  const response = await api.get<PaymentResponse>(
    `/api/v1/patients/${patientId}/payments/${paymentId}`
  );
  return response.data;
};

/**
 * Add an adjustment to the patient ledger
 */
export const addAdjustment = async (
  patientId: string,
  data: AdjustmentCreateRequest
): Promise<AdjustmentCreateResponse> => {
  const response = await api.post<AdjustmentCreateResponse>(
    `/api/v1/patients/${patientId}/adjustments`,
    data
  );
  return response.data;
};

/**
 * Get adjustment details
 */
export const getAdjustment = async (
  patientId: string,
  adjustmentId: string
): Promise<AdjustmentResponse> => {
  const response = await api.get<AdjustmentResponse>(
    `/api/v1/patients/${patientId}/adjustments/${adjustmentId}`
  );
  return response.data;
};

// ===== METADATA APIs =====

/**
 * Get procedure codes with categories and requirements
 */
export const getProcedureCodes = async (
  params?: {
    category?: string;
    search?: string;
    limit?: number;
  }
): Promise<ProcedureCodesResponse> => {
  const queryParams: Record<string, string> = {};
  if (params?.category) queryParams.category = params.category;
  if (params?.search) queryParams.search = params.search;
  if (params?.limit) queryParams.limit = params.limit.toString();

  const response = await api.get<ProcedureCodesResponse>(
    `/api/v1/metadata/procedure-codes`,
    { params: queryParams }
  );
  return response.data;
};

/**
 * Get payment method codes
 */
export const getPaymentCodes = async (): Promise<PaymentCodesResponse> => {
  const response = await api.get<PaymentCodesResponse>(
    `/api/v1/metadata/payment-codes`
  );
  return response.data;
};

/**
 * Get adjustment reason codes
 */
export const getAdjustmentCodes = async (): Promise<AdjustmentCodesResponse> => {
  const response = await api.get<AdjustmentCodesResponse>(
    `/api/v1/metadata/adjustment-codes`
  );
  return response.data;
};

/**
 * Get available claim statuses
 */
export const getClaimStatuses = async (): Promise<ClaimStatusesResponse> => {
  const response = await api.get<ClaimStatusesResponse>(
    `/api/v1/metadata/claim-statuses`
  );
  return response.data;
};

/**
 * Get available transaction types
 */
export const getTransactionTypes = async (): Promise<TransactionTypesResponse> => {
  const response = await api.get<TransactionTypesResponse>(
    `/api/v1/metadata/transaction-types`
  );
  return response.data;
};

/**
 * Get providers for an office
 */
export const getOfficeProviders = async (
  officeId: string
): Promise<ProvidersResponse> => {
  const response = await api.get<ProvidersResponse>(
    `/api/v1/offices/${officeId}/providers`
  );
  return response.data;
};
