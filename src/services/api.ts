import axios, { AxiosError } from "axios";

const api = axios.create({
  // baseURL: import.meta.env.VITE_API_BASE_URL || "http://34.66.199.55:8000/",
  baseURL: "http://127.0.0.1:8000/",
  headers: {
    "Content-Type": "application/json",
  },
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
      // Skip logout for login endpoint to avoid infinite loops
      if (!error.config?.url?.includes("/auth/login")) {
        // Clear authentication data
        localStorage.clear();
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
