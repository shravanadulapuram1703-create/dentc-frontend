import api from "./api";

export interface LoginPayload {
  email: string;
  password: string;
  tenant_id?: number;
}

export interface SignupPayload {
  email: string;
  password: string;
  tenant_id?: number;
}

export const authService = {
  async login(data: LoginPayload) {
    const res = await api.post("/api/v1/auth/login", {
      ...data,
      tenant_id: data.tenant_id ?? 1,
    });
    return res.data; // { access_token, refresh_token }
  },

  async signup(data: SignupPayload) {
    const res = await api.post("/api/v1/auth/signup", {
      ...data,
      tenant_id: data.tenant_id ?? 1,
    });
    return res.data; // { message }
  },

  async refresh(refreshToken: string) {
    const res = await api.post("/api/v1/auth/refresh", {
      refresh_token: refreshToken,
    });
    return res.data;
  },

  async logout(refreshToken: string) {
    await api.post("/api/v1/auth/logout", {
      refresh_token: refreshToken,
    });
  },

  async me() {
    const res = await api.get("/api/v1/users/me");
    return res.data;
  },
};


export interface EClaimsConfig {
  vendorType?: string;
  username?: string;
  password?: string;
}

export interface TransworldConfig {
  acceleratorAccount?: string;
  collectionsAccount?: string;
  userId?: string;
  password?: string;
  agingDays?: number;
}

export interface ImagingSystemConfig {
  index: number;
  name?: string;
  linkType?: string;
  mode?: string;
}

export interface TextMessagingConfig {
  phoneNumber?: string;
  verified?: boolean;
}

export interface PatientUrlsConfig {
  formsUrl?: string;
  schedulingUrl?: string;
  financingUrl?: string;
  customUrl1?: string;
  customUrl2?: string;
}
