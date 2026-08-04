export type GalleryItem = { id:number; post_id:number; image_url:string; caption:string; sort_order:number; created_at:number };
export type GalleryInput = Pick<GalleryItem, "image_url" | "caption" | "sort_order">;

function db(): D1Database {
  const binding = (globalThis as typeof globalThis & { __STEVEN_SITE_ENV__?: { DB: D1Database } }).__STEVEN_SITE_ENV__?.DB;
  if (!binding) throw new Error("Database binding is unavailable");
  return binding;
}

export async function ensureGalleryReady() {
  await db().batch([
    db().prepare(`CREATE TABLE IF NOT EXISTS post_gallery_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      image_url TEXT NOT NULL,
      caption TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    )`),
    db().prepare("CREATE INDEX IF NOT EXISTS post_gallery_post_idx ON post_gallery_items(post_id, sort_order, id)"),
  ]);
}

export async function galleryByPostIds(postIds: number[]) {
  const result = new Map<number, GalleryItem[]>();
  if (postIds.length === 0) return result;
  await ensureGalleryReady();
  const placeholders = postIds.map(() => "?").join(",");
  const rows = (await db().prepare(`SELECT * FROM post_gallery_items WHERE post_id IN (${placeholders}) ORDER BY sort_order, id`).bind(...postIds).all<GalleryItem>()).results;
  for (const row of rows) result.set(row.post_id, [...(result.get(row.post_id) ?? []), row]);
  return result;
}

export async function setPostGallery(postId: number, items: GalleryInput[]) {
  await ensureGalleryReady();
  const statements = [db().prepare("DELETE FROM post_gallery_items WHERE post_id = ?").bind(postId)];
  const now = Date.now();
  items.forEach((item, index) => statements.push(db().prepare("INSERT INTO post_gallery_items (post_id, image_url, caption, sort_order, created_at) VALUES (?, ?, ?, ?, ?)").bind(postId, item.image_url, item.caption, index, now)));
  await db().batch(statements);
}
