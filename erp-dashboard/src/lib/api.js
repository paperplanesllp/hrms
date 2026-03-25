import axios from "axios";
import { getAuth, saveAuth, clearAuth } from "./auth.js";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true, // keep true if you use HttpOnly refresh cookies
});

api.interceptors.request.use((config) => {
  const auth = getAuth();
  if (auth?.accessToken) {
    config.headers.Authorization = `Bearer ${auth.accessToken}`;
  }
  
  // For FormData, let axios set Content-Type automatically
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err?.response?.status === 401 && !original?._retry) {
      original._retry = true;
      try {
        console.log("🔄 Attempting token refresh...");
        const r = await axios.post(
          `${import.meta.env.VITE_API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        console.log("✅ Token refreshed successfully");
        const auth = getAuth() || {};
        const next = { 
          ...auth, 
          accessToken: r.data?.accessToken,
          user: r.data?.user || auth.user
        };
        saveAuth(next);

        original.headers.Authorization = `Bearer ${r.data?.accessToken}`;
        return api(original);
      } catch (refreshErr) {
        console.error("❌ Token refresh failed:", refreshErr?.response?.data?.message || refreshErr.message);
        clearAuth();
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

export default api;