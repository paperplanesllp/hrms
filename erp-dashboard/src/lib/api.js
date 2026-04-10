import axios from "axios";
import { getAuth, saveAuth, clearAuth } from "./auth.js";

const normalizeApiBaseUrl = (value) => {
  const candidate = (value || "").trim();
  const base = candidate || `${window.location.origin}/api`;
  return base.endsWith("/api") ? base : `${base.replace(/\/$/, "")}/api`;
};

const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // keep true if you use HttpOnly refresh cookies
});

api.interceptors.request.use((config) => {
  const auth = getAuth();
  const isPublicAuthRoute = [
    "/auth/login",
    "/auth/refresh",
    "/auth/forgot-password",
    "/auth/reset-password",
    "/auth/signup",
  ].includes(config.url);
  
  console.log('🔐 [API Request] URL:', config.url);
  console.log('🔐 [API Request] Method:', config.method);
  console.log('🔐 [API Request] Has token:', !!auth?.accessToken);
  
  if (auth?.accessToken) {
    config.headers.Authorization = `Bearer ${auth.accessToken}`;
    console.log('🔐 [API Request] Auth header added');
  } else if (!isPublicAuthRoute) {
    console.warn('⚠️ [API Request] No access token found!');
  }
  
  // For FormData, let axios set Content-Type automatically
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  
  return config;
});

api.interceptors.response.use(
  (res) => {
    console.log('✅ [API Response] URL:', res.config.url);
    console.log('✅ [API Response] Status:', res.status);
    console.log('✅ [API Response] Data:', res.data);
    return res;
  },
  async (err) => {
    console.error('❌ [API Error] URL:', err.config?.url);
    console.error('❌ [API Error] Status:', err.response?.status);
    console.error('❌ [API Error] Data:', err.response?.data);
    console.error('❌ [API Error] Message:', err.message);
    
    const original = err.config;
    if (err?.response?.status === 401 && !original?._retry) {
      original._retry = true;
      try {
        console.log("🔄 Attempting token refresh...");
        const r = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
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