import { DEFAULT_THEME, HEX_COLOR, THEMES, type ThemeId } from "../app/themes";

export type ThemeSettings = { theme: ThemeId; accent: string | null; updated_at: number };

function db(): D1Database | null {
  return (globalThis as typeof globalThis & { __STEVEN_SITE_ENV__?: { DB: D1Database } }).__STEVEN_SITE_ENV__?.DB ?? null;
}

async function ready(d1: D1Database) {
  await d1.prepare(`CREATE TABLE IF NOT EXISTS site_theme (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    theme TEXT NOT NULL DEFAULT 'classic',
    accent TEXT,
    updated_at INTEGER NOT NULL
  )`).run();
  await d1.prepare("INSERT OR IGNORE INTO site_theme (id,theme,accent,updated_at) VALUES (1,'classic',NULL,?)").bind(Date.now()).run();
}

// Never throws: a theme problem must not take the public site down.
export async function getThemeSettings(): Promise<ThemeSettings> {
  const fallback: ThemeSettings = { theme: DEFAULT_THEME, accent: null, updated_at: 0 };
  try {
    const d1 = db();
    if (!d1) return fallback;
    await ready(d1);
    const row = await d1.prepare("SELECT theme,accent,updated_at FROM site_theme WHERE id=1").first<{ theme: string; accent: string | null; updated_at: number }>();
    if (!row) return fallback;
    return {
      theme: THEMES.some(t => t.id === row.theme) ? (row.theme as ThemeId) : DEFAULT_THEME,
      accent: row.accent && HEX_COLOR.test(row.accent) ? row.accent : null,
      updated_at: row.updated_at,
    };
  } catch {
    return fallback;
  }
}

export async function updateThemeSettings(theme: ThemeId, accent: string | null) {
  const d1 = db();
  if (!d1) throw new Error("Database binding is unavailable");
  await ready(d1);
  await d1.prepare("UPDATE site_theme SET theme=?,accent=?,updated_at=? WHERE id=1").bind(theme, accent, Date.now()).run();
}
