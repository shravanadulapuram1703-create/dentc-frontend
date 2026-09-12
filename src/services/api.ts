import axios, { AxiosError } from "axios";
import { env } from "@/shared/config/env";
import { clearAuthStorageKeepRemembered } from "@/features/auth/rememberMe";

const api = axios.create({
  baseURL: env.apiBaseUrl,
  headers: {
    "Content-Type": "application/json",
  },
  // FastAPI reads list query params as repeated keys (`exam_ids=1&exam_ids=2`).
  // axios' default serializes arrays as `exam_ids[]=1&exam_ids[]=2`, which the
  // backend rejects with 422 (seen on GET /perio-exams/compare). `indexes: null`
  // drops the brackets. Only list-typed query param in the generated client
  // today is `ComparePerioExamsParams.exam_ids`.
  paramsSerializer: { indexes: null },
});

// Attach token automatically
api.interceptors.request.use((config) => {
  if (!config.url?.includes("/auth/login")) {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor to handle 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Check if it's a 401 Unauthorized response
    if (error.response?.status === 401) {
      // Some 401s are business responses, not session expiry — don't log out:
      //  - /auth/login: wrong credentials (also avoids an infinite loop)
      //  - /users/me/change-password: wrong *current* password; the screen
      //    surfaces the error itself.
      const url = error.config?.url ?? "";
      const isSessionExpiry =
        !url.includes("/auth/login") && !url.includes("/users/me/change-password");
      if (isSessionExpiry) {
        // Clear authentication data (but keep the "Remember me" identifier)
        clearAuthStorageKeepRemembered();
        delete api.defaults.headers.common["Authorization"];
        
        // Dispatch a custom event that AuthContext can listen to
        window.dispatchEvent(new CustomEvent("auth:unauthorized", {
          detail: {
            message: "Your session has expired. Please log in again.",
          },
        }));
        
        // Navigate to login page
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
