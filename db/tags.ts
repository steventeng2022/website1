export type Tag = { id: number; name: string; slug: string; created_at: number };

function db(): D1Database {
  const binding = (globalThis as typeof globalThis & { __STEVEN_SITE_ENV__?: { DB: D1Database } }).__STEVEN_SITE_ENV__?.DB;
  if (!binding) throw new Error("Database binding is unavailable");
  return binding;
}

export async function ensureTagsReady() {
  const d1 = db();
  await d1.batch([
    d1.prepare(`CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL
    )`),
    d1.prepare(`CREATE TABLE IF NOT EXISTS post_tags (
      post_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      PRIMARY KEY (post_id, tag_id)
    )`),
    d1.prepare("CREATE INDEX IF NOT EXISTS post_tags_tag_idx ON post_tags(tag_id)"),
  ]);
}

export async function listTags() {
  await ensureTagsReady();
  return (await db().prepare("SELECT * FROM tags ORDER BY name COLLATE NOCASE ASC").all<Tag>()).results;
}

export async function createTag(name: string, slug: string) {
  await ensureTagsReady();
  await db().prepare("INSERT INTO tags (name, slug, created_at) VALUES (?, ?, ?)").bind(name, slug, Date.now()).run();
}

export async function deleteTag(id: number) {
  await ensureTagsReady();
  await db().batch([
    db().prepare("DELETE FROM post_tags WHERE tag_id = ?").bind(id),
    db().prepare("DELETE FROM tags WHERE id = ?").bind(id),
  ]);
}

export async function setPostTags(postId: number, tagIds: number[]) {
  await ensureTagsReady();
  const unique = [...new Set(tagIds.filter((id) => Number.isInteger(id) && id > 0))];
  await db().batch([
    db().prepare("DELETE FROM post_tags WHERE post_id = ?").bind(postId),
    ...unique.map((tagId) => db().prepare("INSERT OR IGNORE INTO post_tags (post_id, tag_id) VALUES (?, ?)").bind(postId, tagId)),
  ]);
}

export async function tagsByPostIds(postIds: number[]) {
  await ensureTagsReady();
  const map = new Map<number, Tag[]>();
  for (const id of postIds) map.set(id, []);
  if (postIds.length === 0) return map;
  const placeholders = postIds.map(() => "?").join(",");
  const rows = (await db().prepare(`SELECT pt.post_id, t.id, t.name, t.slug, t.created_at
    FROM post_tags pt JOIN tags t ON t.id = pt.tag_id
    WHERE pt.post_id IN (${placeholders}) ORDER BY t.name COLLATE NOCASE ASC`).bind(...postIds).all<Tag & { post_id: number }>()).results;
  for (const row of rows) map.get(row.post_id)?.push({ id: row.id, name: row.name, slug: row.slug, created_at: row.created_at });
  return map;
}
