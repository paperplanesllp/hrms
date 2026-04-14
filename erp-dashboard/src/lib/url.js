const DEFAULT_DEV_SERVER_ORIGIN = "http://localhost:5000";

const normalizeApiBaseUrl = (value) => {
  const candidate = (value || "").trim();
  const fallbackBase = import.meta.env.DEV
    ? `${DEFAULT_DEV_SERVER_ORIGIN}/api`
    : `${window.location.origin}/api`;
  const base = candidate || fallbackBase;
  return base.endsWith("/api") ? base : `${base.replace(/\/$/, "")}/api`;
};

const normalizeServerBaseUrl = (value, apiBaseUrl) => {
  const candidate = (value || "").trim();
  if (candidate) {
    return candidate.replace(/\/$/, "");
  }

  return apiBaseUrl.replace(/\/api$/, "");
};

const normalizeSocketBaseUrl = (value, serverBaseUrl) => {
  const candidate = (value || "").trim();
  if (candidate) {
    return candidate.replace(/\/$/, "");
  }

  return serverBaseUrl.replace(/\/$/, "");
};

export const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL);
export const SERVER_BASE_URL = normalizeServerBaseUrl(import.meta.env.VITE_SERVER_URL, API_BASE_URL);
export const SOCKET_BASE_URL = normalizeSocketBaseUrl(import.meta.env.VITE_SOCKET_URL, SERVER_BASE_URL);

export const toServerUrl = (path) => {
  if (!path) return null;
  if (path.startsWith("data:") || path.startsWith("blob:")) return path;
  if (/^https?:\/\//i.test(path)) return path;

  let cleanPath = path.replace(/\\/g, "/");

  if (cleanPath.includes("uploads")) {
    const uploadsIndex = cleanPath.indexOf("uploads");
    cleanPath = cleanPath.substring(uploadsIndex);
  }

  if (!cleanPath.startsWith("/")) {
    cleanPath = `/${cleanPath}`;
  }

  return `${SERVER_BASE_URL}${cleanPath}`;
};