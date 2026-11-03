export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "steven-theme";
export const THEME_CHANGE_EVENT = "steven:themechange";

// Runs before the page paints. Keep this independent of React and browser storage
// availability so a returning visitor never sees the wrong color scheme first.
export const themeInitScript = `(()=>{let saved=null;try{saved=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)})}catch{}const preference=saved==="light"||saved==="dark"?saved:"system";const theme=preference==="system"?(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):preference;const root=document.documentElement;root.dataset.theme=theme;root.dataset.themePreference=preference;root.style.colorScheme=theme})()`;

export function systemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(theme: Theme, preference: Theme | "system") {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.dataset.themePreference = preference;
  root.style.colorScheme = theme;
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

export function getThemeSnapshot(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function getServerThemeSnapshot(): Theme {
  return "light";
}

export function subscribeToTheme(onChange: () => void) {
  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  return () => window.removeEventListener(THEME_CHANGE_EVENT, onChange);
}

export function chooseTheme(theme: Theme) {
  // The DOM remains the session source of truth when storage is blocked.
  try { window.localStorage.setItem(THEME_STORAGE_KEY, theme); } catch {}
  applyTheme(theme, theme);
}
