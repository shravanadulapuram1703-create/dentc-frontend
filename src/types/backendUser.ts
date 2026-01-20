// src/types/backendUser.ts
export interface BackendUser {
  user_id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;

  is_active: boolean;

  home_office_id: number | null;
  assigned_offices: number[];

  roles: string[];
  security_groups: string[];
  group_memberships?: string[];

  permitted_ips: string[];

  time_clock?: {
    pay_rate?: number | null;
    overtime_method?: string | null;
    overtime_rate?: number | null;
  };

  preferences?: Record<string, any>;
}
