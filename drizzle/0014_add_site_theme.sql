CREATE TABLE IF NOT EXISTS site_theme (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  theme TEXT NOT NULL DEFAULT 'classic',
  accent TEXT,
  updated_at INTEGER NOT NULL
);
INSERT OR IGNORE INTO site_theme (id, theme, accent, updated_at) VALUES (1, 'classic', NULL, 0);
