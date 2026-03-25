// src/store/toastStore.js
import { useEffect, useState } from "react";

let state = { items: [] };
const listeners = new Set();

function setState(patch) {
  state = {
    ...state,
    ...(typeof patch === "function" ? patch(state) : patch),
  };
  listeners.forEach((l) => l());
}

export function useToastStore(selector = (s) => s) {
  const [, force] = useState(0);

  useEffect(() => {
    const fn = () => force((x) => x + 1);
    listeners.add(fn);
    return () => listeners.delete(fn);
  }, []);

  return selector(state);
}

export function toast({ title, message, type = "info" }) {
  // Use crypto.randomUUID - it's available in all modern browsers
  const id = crypto.randomUUID();

  setState((s) => ({
    items: [{ id, title, message, type }, ...s.items].slice(0, 4),
  }));

  setTimeout(() => {
    setState((s) => ({
      items: s.items.filter((x) => x.id !== id),
    }));
  }, 5000);
}