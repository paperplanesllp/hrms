// src/store/authStore.js
import { useEffect, useState } from "react";
import { getAuth, saveAuth, clearAuth } from "../lib/auth.js";

let state = {
  user: getAuth()?.user || null,
  accessToken: getAuth()?.accessToken || null,
};

const listeners = new Set();

function setState(patch) {
  state = {
    ...state,
    ...(typeof patch === "function" ? patch(state) : patch),
  };
  listeners.forEach((l) => l());
}

export function useAuthStore(selector = (s) => s) {
  const [, force] = useState(0);

  useEffect(() => {
    const fn = () => force((x) => x + 1);
    listeners.add(fn);
    return () => listeners.delete(fn);
  }, []);

  return selector(state);
}

export function setSession(payload) {
  saveAuth(payload);
  setState({ user: payload.user, accessToken: payload.accessToken });
}

export function logout() {
  clearAuth();
  setState({ user: null, accessToken: null });
}

export function isAuthed() {
  return !!state.accessToken;
}