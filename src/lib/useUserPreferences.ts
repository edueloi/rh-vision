import { useCallback, useEffect, useRef, useState } from "react";
import { getAuthUser, getAuthHeaders } from "./auth";
import { getTenantId } from "./auth";

// Debounce delay before flushing to backend (ms)
const FLUSH_DELAY = 800;

function getUserId(): string | null {
  try { return getAuthUser()?.id ?? null; } catch { return null; }
}

/**
 * useUserPreferences
 *
 * Reads all preferences for the current user from the backend on mount.
 * Falls back to localStorage while loading so the UI is snappy.
 * Writes are debounced and flushed to the backend in bulk.
 *
 * Usage:
 *   const { get, set, ready } = useUserPreferences();
 *   const pageSize = get<number>("candidates_pageSize", 20);
 *   set("candidates_pageSize", 50);
 */
export function useUserPreferences() {
  const [prefs, setPrefs] = useState<Record<string, any>>({});
  const [ready, setReady] = useState(false);
  const pendingRef = useRef<Record<string, any>>({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tenantId = getTenantId();
  const userId = getUserId();

  // Load from backend on mount
  useEffect(() => {
    if (!userId) { setReady(true); return; }
    fetch(`/api/user-preferences?userId=${encodeURIComponent(userId)}`, {
      headers: getAuthHeaders(),
    })
      .then(r => r.ok ? r.json() : {})
      .then(data => {
        setPrefs(data ?? {});
        setReady(true);
      })
      .catch(() => setReady(true));
  }, [userId]);

  const flush = useCallback(async (patch: Record<string, any>) => {
    if (!userId || !tenantId || Object.keys(patch).length === 0) return;
    try {
      await fetch('/api/user-preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ userId, tenantId, prefs: patch }),
      });
    } catch { /* silent — localStorage is the fallback */ }
  }, [userId, tenantId]);

  const set = useCallback(<T = any>(key: string, value: T) => {
    setPrefs(prev => ({ ...prev, [key]: value }));
    // Also keep localStorage as instant fallback
    try { localStorage.setItem(`upref_${userId}_${key}`, JSON.stringify(value)); } catch { /* silent */ }

    pendingRef.current[key] = value;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const batch = { ...pendingRef.current };
      pendingRef.current = {};
      flush(batch);
    }, FLUSH_DELAY);
  }, [flush, userId]);

  const get = useCallback(<T = any>(key: string, defaultValue: T): T => {
    if (key in prefs) return prefs[key] as T;
    // Instant localStorage fallback while backend is loading
    try {
      const raw = localStorage.getItem(`upref_${userId}_${key}`);
      if (raw !== null) return JSON.parse(raw) as T;
    } catch { /* silent */ }
    return defaultValue;
  }, [prefs, userId]);

  return { get, set, ready };
}
