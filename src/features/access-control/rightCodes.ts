// Access control — curated constants for the right codes we actually gate on.
//
// This is NOT the full 363-code catalog (that lives on the backend, GET
// /api/v1/permissions). It's a typo-safe, autocompleting shortlist of the codes
// referenced from FE gating — the highest-risk writes plus the new-module rights
// from the handover. Add entries here as you wire more screens; the string value
// is the contract with the backend catalog, so keep them identical.
//
// Usage: `useHasRight(RIGHT.transactions.deleteProcedure)`.

export const RIGHT = {
  transactions: {
    addPostPatientPayments: "transactions_add_post_patient_payments",
    addPostInsurancePayments: "transactions_add_post_insurance_payments",
    deleteProcedure: "transactions_delete_procedure",
    deletePatientPayments: "transactions_delete_patient_payments",
    deleteInsurancePayments: "transactions_delete_insurance_payments",
    deleteInsuranceClaims: "transactions_delete_insurance_claims",
    editFeeLedger: "transactions_edit_fee_ledger",
    treatmentPlanPostToLedger: "transactions_treatment_plan_post_to_ledger",
    treatmentPlanDelete: "transactions_treatment_plan_delete",
    patientLedgerFull: "transactions_patient_ledger_screen_full_control",
    patientLedgerView: "transactions_patient_ledger_view_only",
    // new (handover A2)
    claimsAdaDirectPrint: "transactions_claims_ada_direct_print",
    claimsSaveDraft: "transactions_claims_save_draft",
    claimsCreateSecondaryPlus: "transactions_claims_create_secondary_plus",
  },
  appointments: {
    addNew: "appointments_add_new_appointment",
    edit: "appointments_edit_existing_appointment",
    delete: "appointments_delete_existing_appointment",
    reschedule: "appointments_reschedule_appointment",
    changeStatus: "appointments_change_appointment_status",
    // new (handover A2)
    schedulerPrint: "appointments_scheduler_print",
  },
  patient: {
    infoFull: "patient_patient_information_screen_full_control",
    infoView: "patient_patient_information_view_only",
    deleteInfo: "patient_delete_patient_information",
    accessSsn: "patient_access_ssn_value",
    medicalHistoryFull: "patient_medical_history_full_control",
    medicalHistoryView: "patient_medical_history_view_only",
    prescriptionFull: "patient_prescription_screen_full_control",
    prescriptionStrikeOff: "patient_prescription_strike_off",
    // new (handover A2)
    labCasesFull: "patient_lab_cases_full_control",
    labCasesView: "patient_lab_cases_view_only",
    documentsFull: "patient_documents_full_control",
    documentsView: "patient_documents_view_only",
    documentsUpload: "patient_documents_upload",
    documentsDelete: "patient_documents_delete",
    lettersFull: "patient_letters_full_control",
    lettersView: "patient_letters_view_only",
    lettersGenerate: "patient_letters_generate",
    consentSign: "patient_consent_sign",
    emergencyContactsFull: "patient_emergency_contacts_full_control",
    emergencyContactsView: "patient_emergency_contacts_view_only",
  },
  charting: {
    restorativeFull: "charting_restorative_full_control",
    restorativeView: "charting_restorative_view_only",
    restorativeDeleteCondition: "charting_restorative_delete_condition",
    perioFull: "charting_perio_full_control",
    perioView: "charting_perio_view_only",
    perioCompare: "charting_perio_compare",
    perioPrint: "charting_perio_print",
  },
  imaging: {
    full: "imaging_full_control",
    view: "imaging_view_only",
    capture: "imaging_capture_acquire",
    deleteImage: "imaging_delete_image",
    export: "imaging_export",
  },
  appointNow: {
    inboxFull: "appointnow_request_inbox_full_control",
    inboxView: "appointnow_request_inbox_view_only",
    approve: "appointnow_approve_booking",
    decline: "appointnow_decline_booking",
  },
  messaging: {
    directFull: "messaging_direct_messages_full_control",
    directView: "messaging_direct_messages_view_only",
  },
  help: {
    center: "help_center_access",
    reportIssue: "help_report_an_issue",
    myTickets: "help_my_tickets_view",
  },
  home: {
    dashboardView: "dashboard_view",
    myPage: "my_page_access",
  },
  setup: {
    securityUsersFull: "setup_security_users_screen_full_control",
    securityUsersView: "setup_security_users_screen_view_only",
    securityGroupsFull: "setup_security_groups_screen_full_control",
    securityGroupsView: "setup_security_groups_screen_view_only",
    officeFull: "setup_office_screen_full_control",
    accountFull: "setup_account_screen_full_control",
    feeSchedulesFull: "setup_fee_schedules_screen_full_control",
    procedureCodesFull: "setup_procedure_codes_screen_full_control",
    // new (handover A2)
    appointNowConfigFull: "setup_appointnow_config_full_control",
    phoneAssignmentsFull: "setup_communications_phone_assignments_full_control",
    phoneAssignmentsView: "setup_communications_phone_assignments_view_only",
    signaturePadFull: "setup_signature_pad_device_full_control",
  },
  general: {
    viewAllOffices: "office_scope_view_all_offices",
  },
} as const;
