/**
 * Session token storage.
 * In v1 we have no real auth (per research/15-routes.md) — the user gets a
 * session token from /api/v1/connect, and we keep it in localStorage.
 *
 * Components read from here so they stay in sync across pages.
 */
"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "argus-session-token";

export function getSessionToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_KEY);
}

export function setSessionToken(token: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, token);
  // Notify same-tab listeners
  window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY, newValue: token }));
}

export function clearSessionToken(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY, newValue: null }));
}

export function useSessionToken(): {
  token: string | null;
  setToken: (t: string) => void;
  clear: () => void;
} {
  const [token, setTokenState] = useState<string | null>(null);
  useEffect(() => {
    setTokenState(getSessionToken());
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setTokenState(e.newValue);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  const setToken = useCallback((t: string) => {
    setSessionToken(t);
    setTokenState(t);
  }, []);
  const clear = useCallback(() => {
    clearSessionToken();
    setTokenState(null);
  }, []);
  return { token, setToken, clear };
}
