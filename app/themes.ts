// Single source of truth for site themes. The active theme is applied as CSS
// variables on <html>, overriding the defaults declared in globals.css/premium.css.
export type ThemeId = "classic" | "midnight" | "ocean" | "forest" | "sunset" | "rose" | "mono" | "mario" | "abyss";

export type ThemeDef = {
  id: ThemeId;
  name_zh: string;
  name_en: string;
  scheme: "light" | "dark";
  animated?: boolean;
  vars: { paper: string; ink: string; blue: string; line: string; muted: string; surface: string; surface2: string; surface3: string };
};

export const THEMES: ThemeDef[] = [
  { id: "classic", name_zh: "經典米白", name_en: "Classic", scheme: "light",
    vars: { paper: "#f7f7f2", ink: "#182225", blue: "#315df4", line: "#dddfd8", muted: "#666d68", surface: "#ffffff", surface2: "#faf8f1", surface3: "#eef0e9" } },
  { id: "midnight", name_zh: "午夜深色", name_en: "Midnight", scheme: "dark",
    vars: { paper: "#0f1217", ink: "#e8ecf1", blue: "#6d8dff", line: "#2a313b", muted: "#98a2b0", surface: "#171c23", surface2: "#1b212a", surface3: "#222a35" } },
  { id: "ocean", name_zh: "海洋藍", name_en: "Ocean", scheme: "light",
    vars: { paper: "#eef6fa", ink: "#0f2a3a", blue: "#0a7ea4", line: "#cfe0e9", muted: "#587283", surface: "#ffffff", surface2: "#f4fafc", surface3: "#e0eef5" } },
  { id: "forest", name_zh: "森林綠", name_en: "Forest", scheme: "light",
    vars: { paper: "#f1f5ee", ink: "#1b2a1f", blue: "#2f7a4b", line: "#d3ddcd", muted: "#5f7365", surface: "#ffffff", surface2: "#f7faf4", surface3: "#e4ecdf" } },
  { id: "sunset", name_zh: "夕陽橘", name_en: "Sunset", scheme: "light",
    vars: { paper: "#fbf3ec", ink: "#2b1d17", blue: "#d9541e", line: "#ecd8c8", muted: "#80655a", surface: "#ffffff", surface2: "#fdf8f3", surface3: "#f4e4d6" } },
  { id: "rose", name_zh: "玫瑰粉", name_en: "Rose", scheme: "light",
    vars: { paper: "#fbf0f3", ink: "#2d1a22", blue: "#c2345f", line: "#efd5dd", muted: "#82606c", surface: "#ffffff", surface2: "#fdf6f8", surface3: "#f5e1e8" } },
  { id: "mono", name_zh: "極簡黑白", name_en: "Mono", scheme: "dark",
    vars: { paper: "#000000", ink: "#f2f2f2", blue: "#ffffff", line: "#2c2c2c", muted: "#a0a0a0", surface: "#0d0d0d", surface2: "#131313", surface3: "#1c1c1c" } },
  { id: "mario", name_zh: "超級瑪利風", name_en: "Super Plumber (retro)", scheme: "light", animated: true,
    vars: { paper: "#9ad1ff", ink: "#1b1f3b", blue: "#e52521", line: "#1b1f3b", muted: "#3b4468", surface: "#ffffff", surface2: "#fff8e1", surface3: "#ffe9a8" } },
  { id: "abyss", name_zh: "海底世界", name_en: "Underwater", scheme: "dark", animated: true,
    vars: { paper: "#0b5a86", ink: "#eafcff", blue: "#2ee6d6", line: "#2f86aa", muted: "#a9dcee", surface: "#0e4a6f", surface2: "#115a82", surface3: "#166c97" } },
];

export const DEFAULT_THEME: ThemeId = "classic";
export const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export function getTheme(id: string): ThemeDef {
  return THEMES.find(theme => theme.id === id) ?? THEMES[0];
}

export function themeStyle(id: string, accent: string | null): Record<string, string> {
  const theme = getTheme(id);
  const v = theme.vars;
  return {
    "--paper": v.paper, "--ink": v.ink, "--blue": accent && HEX_COLOR.test(accent) ? accent : v.blue,
    "--line": v.line, "--muted": v.muted, "--surface": v.surface, "--surface-2": v.surface2, "--surface-3": v.surface3,
  };
}
