const normalizeApiBaseUrl = (value) => {
  const candidate = (value || "").trim();
  const base = candidate || `${window.location.origin}/api`;
  return base.endsWith("/api") ? base : `${base.replace(/\/$/, "")}/api`;
};

const normalizeServerBaseUrl = (value, apiBaseUrl) => {
  const candidate = (value || "").trim();
  if (candidate) {
    return candidate.replace(/\/$/, "");
  }

  return apiBaseUrl.replace(/\/api$/, "");
};

export const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL);
export const SERVER_BASE_URL = normalizeServerBaseUrl(import.meta.env.VITE_SERVER_URL, API_BASE_URL);

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