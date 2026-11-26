"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  applyTheme, chooseTheme, getServerThemeSnapshot, getThemeSnapshot,
  subscribeToTheme, systemTheme, THEME_STORAGE_KEY,
} from "./theme";

/** Keeps the system preference active on every route, including the studio. */
export function ThemeSync() {
  useEffect(() => {
    const root = document.documentElement;
    if (!root.dataset.themePreference) {
      let saved: string | null = null;
      try { saved = window.localStorage.getItem(THEME_STORAGE_KEY); } catch {}
      const preference = saved === "light" || saved === "dark" ? saved : "system";
      applyTheme(preference === "system" ? systemTheme() : preference, preference);
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemChange = () => {
      if (root.dataset.themePreference === "system") applyTheme(systemTheme(), "system");
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== THEME_STORAGE_KEY) return;
      const preference = event.newValue === "light" || event.newValue === "dark" ? event.newValue : "system";
      applyTheme(preference === "system" ? systemTheme() : preference, preference);
    };
    media.addEventListener("change", onSystemChange);
    window.addEventListener("storage", onStorage);
    return () => {
      media.removeEventListener("change", onSystemChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  return null;
}

export default function ThemeToggle({ en = false }: { en?: boolean }) {
  const theme = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, getServerThemeSnapshot);
  const isDark = theme === "dark";
  const label = isDark ? (en ? "Switch to light mode" : "切換為淺色模式") : (en ? "Switch to dark mode" : "切換為深色模式");

  return <button
    className="theme-toggle"
    type="button"
    aria-label={label}
    title={label}
    aria-pressed={isDark}
    onClick={() => chooseTheme(getThemeSnapshot() === "dark" ? "light" : "dark")}
  >
    <svg className="theme-toggle__sun" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3.75" />
      <path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
    </svg>
    <svg className="theme-toggle__moon" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.5 13.15A8.6 8.6 0 0 1 10.85 3.5a8.6 8.6 0 1 0 9.65 9.65Z" />
    </svg>
  </button>;
}
