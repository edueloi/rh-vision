import { useCallback, useEffect, useSyncExternalStore } from "react";

export const PAGE_SIZE_OPTIONS = [10, 15, 20, 50, 100];

// ── Preferences Store (singleton) ──────────────────────────────────────────────

const STORAGE_KEY = "rh_vision_preferences";

interface PreferencesData {
  pageSize: number;
  theme: "light" | "dark";
  sidebarCollapsed: boolean;
}

const DEFAULTS: PreferencesData = {
  pageSize: 15,
  theme: "light",
  sidebarCollapsed: false,
};

let _data: PreferencesData = loadFromStorage();
let _listeners: Set<() => void> = new Set();

function loadFromStorage(): PreferencesData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULTS, ...parsed };
    }
  } catch {
    // ignore corrupt data
  }
  return { ...DEFAULTS };
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(_data));
}

function notify() {
  _listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  _listeners.add(listener);
  return () => {
    _listeners.delete(listener);
  };
}

function getSnapshot(): PreferencesData {
  return _data;
}

function updatePreference<K extends keyof PreferencesData>(
  key: K,
  value: PreferencesData[K]
) {
  _data = { ..._data, [key]: value };
  persist();
  notify();
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export interface PreferencesState {
  pageSize: number;
  theme: "light" | "dark";
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
}

export function usePreferences(): PreferencesState {
  const data = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  // Force light theme on mount (preserving existing behavior)
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    document.documentElement.style.colorScheme = "light";
    document.documentElement.setAttribute("data-theme", "light");
    localStorage.setItem("theme", "light");
  }, []);

  const setSidebarCollapsed = useCallback((collapsed: boolean) => {
    updatePreference("sidebarCollapsed", collapsed);
  }, []);

  const toggleSidebar = useCallback(() => {
    updatePreference("sidebarCollapsed", !_data.sidebarCollapsed);
  }, []);

  return {
    pageSize: data.pageSize,
    theme: data.theme,
    sidebarCollapsed: data.sidebarCollapsed,
    setSidebarCollapsed,
    toggleSidebar,
  };
}
