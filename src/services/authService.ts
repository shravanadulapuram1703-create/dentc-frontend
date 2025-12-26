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
