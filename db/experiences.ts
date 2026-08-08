export type Experience = {
  id: number;
  title: string;
  organization: string;
  location: string;
  start_date: string;
  end_date: string | null;
  description: string;
  link_url: string | null;
  sort_order: number;
  created_at: number;
  updated_at: number;
};

function db(): D1Database {
  const binding = (globalThis as typeof globalThis & { __STEVEN_SITE_ENV__?: { DB: D1Database } }).__STEVEN_SITE_ENV__?.DB;
  if (!binding) throw new Error("Database binding is unavailable");
  return binding;
}

async function ready() {
  const d1 = db();
  await d1.batch([
    d1.prepare(`CREATE TABLE IF NOT EXISTS experiences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      organization TEXT NOT NULL DEFAULT '',
      location TEXT NOT NULL DEFAULT '',
      start_date TEXT NOT NULL,
      end_date TEXT,
      description TEXT NOT NULL DEFAULT '',
      link_url TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`),
    d1.prepare("CREATE INDEX IF NOT EXISTS experiences_order_idx ON experiences(sort_order ASC, start_date DESC)"),
    d1.prepare("UPDATE experiences SET title = replace(title, '。', '') WHERE instr(title, '。') > 0"),
  ]);
}

export async function listExperiences() {
  await ready();
  return (await db().prepare("SELECT * FROM experiences ORDER BY sort_order ASC, start_date DESC, id DESC").all<Experience>()).results;
}

export async function createExperience(input: Omit<Experience, "id" | "created_at" | "updated_at">) {
  await ready();
  const now = Date.now();
  await db().prepare(`INSERT INTO experiences
    (title, organization, location, start_date, end_date, description, link_url, sort_order, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(input.title, input.organization, input.location, input.start_date, input.end_date, input.description, input.link_url, input.sort_order, now, now).run();
}

export async function updateExperience(id: number, input: Omit<Experience, "id" | "created_at" | "updated_at">) {
  await ready();
  await db().prepare(`UPDATE experiences SET title = ?, organization = ?, location = ?, start_date = ?,
    end_date = ?, description = ?, link_url = ?, sort_order = ?, updated_at = ? WHERE id = ?`)
    .bind(input.title, input.organization, input.location, input.start_date, input.end_date, input.description, input.link_url, input.sort_order, Date.now(), id).run();
}

export async function deleteExperience(id: number) {
  await ready();
  await db().prepare("DELETE FROM experiences WHERE id = ?").bind(id).run();
}

export async function moveExperience(id: number, direction: "up" | "down") {
  await ready();
  const items = await listExperiences();
  const index = items.findIndex((item) => item.id === id);
  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || targetIndex < 0 || targetIndex >= items.length) return;
  const normalized = items.map((item, order) => ({ ...item, sort_order: order }));
  [normalized[index], normalized[targetIndex]] = [normalized[targetIndex], normalized[index]];
  await db().batch(normalized.map((item, order) => db().prepare("UPDATE experiences SET sort_order = ?, updated_at = ? WHERE id = ?").bind(order, Date.now(), item.id)));
}
