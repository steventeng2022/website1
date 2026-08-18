CREATE TABLE IF NOT EXISTS discord_status_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  discord_user_id TEXT NOT NULL DEFAULT '',
  default_status_zh TEXT NOT NULL DEFAULT '正在學習、寫程式與製作新作品',
  default_status_en TEXT NOT NULL DEFAULT 'Learning, coding, and building something new',
  show_activities INTEGER NOT NULL DEFAULT 1,
  show_spotify INTEGER NOT NULL DEFAULT 1,
  updated_at INTEGER NOT NULL
);

INSERT OR IGNORE INTO discord_status_settings
  (id,discord_user_id,default_status_zh,default_status_en,show_activities,show_spotify,updated_at)
VALUES (1,'','正在學習、寫程式與製作新作品','Learning, coding, and building something new',1,1,unixepoch() * 1000);
