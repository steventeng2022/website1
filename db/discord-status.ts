export type DiscordStatusSettings = {
  id: number;
  discord_user_id: string;
  default_status_zh: string;
  default_status_en: string;
  show_activities: number;
  show_spotify: number;
  updated_at: number;
};

function db(): D1Database {
  const binding = (globalThis as typeof globalThis & { __STEVEN_SITE_ENV__?: { DB: D1Database } }).__STEVEN_SITE_ENV__?.DB;
  if (!binding) throw new Error("Database binding is unavailable");
  return binding;
}

async function ready() {
  const d1 = db();
  await d1.prepare(`CREATE TABLE IF NOT EXISTS discord_status_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    discord_user_id TEXT NOT NULL DEFAULT '',
    default_status_zh TEXT NOT NULL DEFAULT '正在學習、寫程式與製作新作品',
    default_status_en TEXT NOT NULL DEFAULT 'Learning, coding, and building something new',
    show_activities INTEGER NOT NULL DEFAULT 1,
    show_spotify INTEGER NOT NULL DEFAULT 1,
    updated_at INTEGER NOT NULL
  )`).run();
  await d1.prepare(`INSERT OR IGNORE INTO discord_status_settings
    (id,discord_user_id,default_status_zh,default_status_en,show_activities,show_spotify,updated_at)
    VALUES (1,'','正在學習、寫程式與製作新作品','Learning, coding, and building something new',1,1,?)`)
    .bind(Date.now()).run();
}

export async function getDiscordStatusSettings() {
  await ready();
  return (await db().prepare("SELECT * FROM discord_status_settings WHERE id=1").first<DiscordStatusSettings>())!;
}

export async function updateDiscordStatusSettings(input: Omit<DiscordStatusSettings, "id" | "updated_at">) {
  await ready();
  await db().prepare(`UPDATE discord_status_settings SET
    discord_user_id=?,default_status_zh=?,default_status_en=?,show_activities=?,show_spotify=?,updated_at=? WHERE id=1`)
    .bind(input.discord_user_id,input.default_status_zh,input.default_status_en,input.show_activities,input.show_spotify,Date.now()).run();
}
