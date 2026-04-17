import axios from "axios";
import { getAuth } from "./auth.js";
import { setSession, logout } from "../store/authStore.js";
import { API_BASE_URL } from "./url.js";
const PUBLIC_AUTH_ROUTES = new Set([
  "/auth/login",
  "/auth/refresh",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/signup",
  "/auth/temporary/register",
  "/auth/temporary/request-otp",
  "/auth/temporary/verify-otp",
]);

let refreshPromise = null;

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // keep true if you use HttpOnly refresh cookies
});

function getPathname(url = "") {
  try {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return new URL(url).pathname;
    }
    return (url.split("?")[0] || "").trim();
  } catch {
    return (url.split("?")[0] || "").trim();
  }
}

function isPublicAuthRoute(url = "") {
  const path = getPathname(url);
  return Array.from(PUBLIC_AUTH_ROUTES).some(
    (route) => path === route || path.endsWith(route) || path === `/api${route}`
  );
}

function decodeJwtPayload(token) {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;

    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(base64);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function isTokenExpired(token, leewaySeconds = 30) {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return false;
  const now = Math.floor(Date.now() / 1000);
  return payload.exp <= now + leewaySeconds;
}

async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = axios
    .post(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true })
    .then((response) => {
      const accessToken = response.data?.accessToken;
      if (!accessToken) {
        throw new Error("Refresh response missing access token");
      }

      const existing = getAuth() || {};
      const next = {
        ...existing,
        accessToken,
        user: response.data?.user || existing.user,
        rememberMe: response.data?.rememberMe || existing.rememberMe,
      };

      setSession(next);
      return accessToken;
    })
    .catch((err) => {
      // Clear session on refresh failure
      logout();
      throw err;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

api.interceptors.request.use(async (config) => {
  const auth = getAuth();
  const publicRoute = isPublicAuthRoute(config.url || "");

  if (auth?.accessToken && !publicRoute) {
    let token = auth.accessToken;

    if (isTokenExpired(token)) {
      token = await refreshAccessToken();
    }

    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  // For FormData, let axios set Content-Type automatically
  if (config.data instanceof FormData && config.headers) {
    delete config.headers["Content-Type"];
  }

  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;

    if (
      err?.response?.status === 401 &&
      original &&
      !original._retry &&
      !isPublicAuthRoute(original.url || "")
    ) {
      original._retry = true;

      try {
        const accessToken = await refreshAccessToken();
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      } catch {
        logout();
        window.location.href = "/login";
      }
    }

    return Promise.reject(err);
  }
);

export default api;