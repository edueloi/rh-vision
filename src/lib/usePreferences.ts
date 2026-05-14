import { useEffect } from "react";

export const PAGE_SIZE_OPTIONS = [10, 15, 20, 50, 100];

interface PreferencesState {
  pageSize: number;
  theme: "light" | "dark";
}

export function usePreferences(): PreferencesState {
  const theme = "light";

  useEffect(() => {
    document.documentElement.classList.remove("dark");
    document.documentElement.style.colorScheme = "light";
    document.documentElement.setAttribute("data-theme", "light");
    localStorage.setItem("theme", "light");
  }, []);

  return {
    pageSize: 15,
    theme: theme as "light" | "dark",
  };
}
