import { useState, useEffect } from "react";

export const PAGE_SIZE_OPTIONS = [10, 15, 20, 50, 100];

export function usePreferences() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem("theme");
    return (saved as 'light' | 'dark') || 'light';
  });

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
  };

  useEffect(() => {
    // Aplica a classe 'dark' no html para o tailwind dark mode funcionar
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return {
    pageSize: 15,
    theme,
    toggleTheme,
  };
}
