import axios from "axios";

const api = axios.create({
  // baseURL: import.meta.env.VITE_API_BASE_URL || "http://16.176.134.94:8000",
  baseURL: "http://34.66.199.55:8000/",
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


export default api;
