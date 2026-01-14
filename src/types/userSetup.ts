// src/types/userSetup.ts

export interface UserSetupResponse {
  organization: {
    pgid: string;
    pgid_name: string;
    tenant_id: string;
  };

  offices: {
    office_id: number;
    office_oid: string;
    office_name: string;
    is_active: boolean;
  }[];

  security_groups: {
    code: string;
    name: string;
    description?: string;
  }[];

  roles: {
    code: string;
    label: string;
  }[];

  patient_access_levels: {
    code: "all" | "assigned";
    label: string;
  }[];

  time_clock: {
    enabled: boolean;
    overtime_methods: {
      code: "daily" | "weekly" | "none";
      label: string;
    }[];
    overtime_rates: {
      value: number;
      label: string;
    }[];
  };

  login_restrictions: {
    allow_24x7_default: boolean;
    allowed_days: string[];
    default_allowed_from: string;
    default_allowed_until: string;
  };

  user_preferences_schema: {
    startup_screen: { options: string[] };
    default_perio_screen: { options: string[] };
    default_navigation_search: { options: string[] };
    default_search_by: { options: string[] };
    default_referral_view: { options: string[] };
    flags: Record<string, boolean>;
  };
}
