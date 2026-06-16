// src/types/backendUser.ts
import type { LoginRestrictions } from "../api/generated/model/loginRestrictions";

export interface BackendUser {
  user_id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;

  is_active: boolean;

  patient_access_level?: string | null;

  // Structural fields (migration c0d1e2f3a4b5)
  short_id?: string | null;
  report_access_provider_id?: string | null;
  custom_1?: string | null;
  custom_2?: string | null;
  signature_data?: string | null;
  image_url?: string | null; // read-only; set via the image endpoint

  home_office_id: number | null;
  assigned_offices: number[];

  roles: string[];
  group_memberships?: string[];

  permitted_ips: string[];

  login_restrictions?: LoginRestrictions | null;

  time_clock?: {
    pay_rate?: number | string | null;
    overtime_method?: string | null;
    overtime_rate?: number | string | null;
    clock_in_required?: boolean;
  };

  preferences?: Record<string, string | null>;
}
