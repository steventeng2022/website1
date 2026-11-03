import { cacheForRequest } from "vinext/cache";
import { ensureTagsReady, setPostTags, tagsByPostIds, type Tag } from "./tags";
import { ensureGalleryReady, galleryByPostIds, setPostGallery, type GalleryInput, type GalleryItem } from "./gallery";

export type Post = {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image: string | null;
  status: "draft" | "published";
  password_hash: string | null;
  is_locked?: number;
  created_at: number;
  updated_at: number;
};

export type BlogPasswordSummary = { id: number; label: string; created_at: number };
type BlogPasswordRecord = BlogPasswordSummary & { password_hash: string };

export type PostWithTags = Post & { tags: Tag[]; gallery: GalleryItem[]; passwords: BlogPasswordSummary[] };
export type PublishedPostSummary = Pick<Post, "id" | "title" | "slug" | "excerpt" | "updated_at" | "is_locked"> & { tags: Tag[] };
export const BLOG_ARCHIVE_PAGE_SIZE = 12;

function db(): D1Database {
  const binding = (globalThis as typeof globalThis & { __STEVEN_SITE_ENV__?: { DB: D1Database } }).__STEVEN_SITE_ENV__?.DB;
  if (!binding) throw new Error("Database binding is unavailable");
  return binding;
}

// Share initialization within this request only; every content read stays fresh.
const ready = cacheForRequest(async () => {
  const d1 = db();
  await d1.prepare(`CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    excerpt TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL,
    cover_image TEXT,
    password_hash TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`).run();
  const columns = (await d1.prepare("PRAGMA table_info(posts)").all<{ name: string }>()).results;
  for (const name of ["cover_image", "password_hash"] as const) {
    if (columns.some(column => column.name === name)) continue;
    try {
      await d1.prepare(`ALTER TABLE posts ADD COLUMN ${name} TEXT`).run();
    } catch (error) {
      // Another request may have upgraded an older database after the PRAGMA.
      if (!String(error).toLowerCase().includes("duplicate column")) throw error;
    }
  }
  // D1 executes a batch in order and atomically: preserve legacy passwords
  // before clearing the old column, without six separate database round trips.
  await d1.batch([
    d1.prepare(`CREATE TABLE IF NOT EXISTS blog_post_passwords (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      label TEXT NOT NULL DEFAULT '',
      password_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
    )`),
    d1.prepare("CREATE INDEX IF NOT EXISTS blog_post_passwords_post_idx ON blog_post_passwords(post_id, id)"),
    d1.prepare(`INSERT INTO blog_post_passwords (post_id, label, password_hash, created_at)
      SELECT id, '原有密碼', password_hash, updated_at FROM posts
      WHERE password_hash IS NOT NULL AND password_hash <> ''
        AND NOT EXISTS (SELECT 1 FROM blog_post_passwords WHERE blog_post_passwords.post_id = posts.id)`),
    d1.prepare("UPDATE posts SET password_hash = NULL WHERE password_hash IS NOT NULL"),
    d1.prepare("CREATE INDEX IF NOT EXISTS posts_status_updated_idx ON posts(status, updated_at DESC)"),
    d1.prepare("UPDATE posts SET title = replace(title, '。', '') WHERE instr(title, '。') > 0"),
  ]);
});

export { ready as ensurePostsReady };

export async function listRecentPublishedPostSummaries(limit: number) {
  await ready();
  const capped = Math.max(0, Math.min(Math.trunc(limit) || 0, 3));
  if (!capped) return [] as Array<Pick<Post, "id" | "title" | "slug" | "excerpt" | "updated_at" | "is_locked"> & { tags: Tag[] }>;
  const posts = (await db().prepare("SELECT id, title, slug, excerpt, updated_at, CASE WHEN EXISTS (SELECT 1 FROM blog_post_passwords WHERE blog_post_passwords.post_id = posts.id) THEN 1 ELSE 0 END AS is_locked FROM posts WHERE status = 'published' ORDER BY updated_at DESC LIMIT ?").bind(capped).all<Pick<Post, "id" | "title" | "slug" | "excerpt" | "updated_at" | "is_locked">>()).results;
  const tags = await tagsByPostIds(posts.map(post => post.id));
  return posts.map(post => ({ ...post, tags: tags.get(post.id) ?? [] }));
}

export async function listPublishedPosts() {
  await ready();
  const posts = (await db().prepare("SELECT id, title, slug, excerpt, content, cover_image, status, created_at, updated_at, NULL AS password_hash, CASE WHEN EXISTS (SELECT 1 FROM blog_post_passwords WHERE blog_post_passwords.post_id = posts.id) THEN 1 ELSE 0 END AS is_locked FROM posts WHERE status = 'published' ORDER BY updated_at DESC").all<Post>()).results;
  return attachTags(posts);
}

export async function listPublishedPostSummaries({ page = 1, tag = "", query = "" }: { page?: number; tag?: string; query?: string } = {}) {
  await ready();
  const selectedTag = tag.trim().slice(0, 120);
  const search = query.trim().slice(0, 120);
  const conditions = ["p.status = 'published'"];
  const values: string[] = [];
  if (selectedTag) {
    await ensureTagsReady();
    conditions.push("EXISTS (SELECT 1 FROM post_tags pt JOIN tags t ON t.id = pt.tag_id WHERE pt.post_id = p.id AND t.slug = ?)");
    values.push(selectedTag);
  }
  if (search) {
    // Search text is literal: %, _ and backslash must not become LIKE patterns.
    const pattern = `%${search.replace(/[\\%_]/g, "\\$&")}%`;
    conditions.push("(p.title LIKE ? ESCAPE '\\' OR p.excerpt LIKE ? ESCAPE '\\')");
    values.push(pattern, pattern);
  }
  const where = conditions.join(" AND ");
  const count = await db().prepare(`SELECT COUNT(*) AS count FROM posts p WHERE ${where}`).bind(...values).first<{ count: number }>();
  const total = count?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / BLOG_ARCHIVE_PAGE_SIZE));
  const currentPage = Math.min(totalPages, Math.max(1, Number.isFinite(page) ? Math.trunc(page) : 1));
  const result = { total, totalPages, page: currentPage, pageSize: BLOG_ARCHIVE_PAGE_SIZE, tag: selectedTag, query: search };
  if (total === 0) return { ...result, posts: [] as PublishedPostSummary[] };

  const rows = (await db().prepare(`SELECT p.id, p.title, p.slug, p.excerpt, p.updated_at,
    CASE WHEN EXISTS (SELECT 1 FROM blog_post_passwords WHERE post_id = p.id) THEN 1 ELSE 0 END AS is_locked
    FROM posts p WHERE ${where} ORDER BY p.updated_at DESC, p.id DESC LIMIT ? OFFSET ?`)
    .bind(...values, BLOG_ARCHIVE_PAGE_SIZE, (currentPage - 1) * BLOG_ARCHIVE_PAGE_SIZE)
    .all<Omit<PublishedPostSummary, "tags">>()).results;
  const tags = await tagsByPostIds(rows.map(post => post.id));
  return { ...result, posts: rows.map(post => ({ ...post, tags: tags.get(post.id) ?? [] })) };
}

export async function listAllPosts() {
  await ready();
  const posts = (await db().prepare("SELECT * FROM posts ORDER BY updated_at DESC").all<Post>()).results;
  return attachTags(posts);
}

export async function getPublishedPost(slug: string) {
  await ready();
  const post = await db().prepare("SELECT * FROM posts WHERE slug = ? AND status = 'published'").bind(slug).first<Post>();
  if (!post) return null;
  return (await attachTags([post]))[0];
}

export async function getPublishedPostAccess(slug: string) {
  await ready();
  const post = await db().prepare("SELECT id, slug FROM posts WHERE slug = ? AND status = 'published'").bind(slug).first<Pick<Post, "id" | "slug">>();
  if (!post) return null;
  return { ...post, passwords: await passwordRecords(post.id) };
}

export async function publishedPostExists(slug: string) {
  await ready();
  return Boolean(await db().prepare("SELECT id FROM posts WHERE slug = ? AND status = 'published'").bind(slug).first<{ id: number }>());
}

async function attachTags(posts: Post[]): Promise<PostWithTags[]> {
  const ids = posts.map((post) => post.id);
  const [tags, gallery, passwords] = await Promise.all([
    tagsByPostIds(ids),
    galleryByPostIds(ids),
    passwordSummariesByPostIds(ids),
  ]);
  return posts.map((post) => ({ ...post, tags: tags.get(post.id) ?? [], gallery: gallery.get(post.id) ?? [], passwords: passwords.get(post.id) ?? [] }));
}

async function passwordRecords(postId: number) {
  return (await db().prepare("SELECT id, label, password_hash, created_at FROM blog_post_passwords WHERE post_id = ? ORDER BY id").bind(postId).all<BlogPasswordRecord>()).results;
}

async function passwordSummariesByPostIds(postIds: number[]) {
  const result = new Map<number, BlogPasswordSummary[]>();
  if (!postIds.length) return result;
  const placeholders = postIds.map(() => "?").join(",");
  const rows = (await db().prepare(`SELECT id, post_id, label, created_at FROM blog_post_passwords WHERE post_id IN (${placeholders}) ORDER BY id`).bind(...postIds).all<BlogPasswordSummary & { post_id: number }>()).results;
  for (const row of rows) {
    const list = result.get(row.post_id) ?? [];
    list.push({ id: row.id, label: row.label, created_at: row.created_at });
    result.set(row.post_id, list);
  }
  return result;
}

export async function addPostPasswords(postId: number, entries: { label: string; password_hash: string }[]) {
  await ready();
  if (!entries.length) return;
  const now = Date.now();
  await db().batch(entries.map((entry) => db().prepare("INSERT INTO blog_post_passwords (post_id, label, password_hash, created_at) VALUES (?, ?, ?, ?)").bind(postId, entry.label, entry.password_hash, now)));
}

export async function removePostPasswords(postId: number, ids: number[]) {
  await ready();
  const safeIds = [...new Set(ids.filter((id) => Number.isInteger(id) && id > 0))];
  if (!safeIds.length) return;
  const placeholders = safeIds.map(() => "?").join(",");
  await db().prepare(`DELETE FROM blog_post_passwords WHERE post_id = ? AND id IN (${placeholders})`).bind(postId, ...safeIds).run();
}

type PostInput = Omit<Post, "id" | "created_at" | "updated_at" | "is_locked">;

export async function createPost(input: PostInput, tagIds: number[] = [], gallery: GalleryInput[] = []) {
  await ready();
  const now = Date.now();
  const result = await db().prepare("INSERT INTO posts (title, slug, excerpt, content, cover_image, status, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(input.title, input.slug, input.excerpt, input.content, input.cover_image, input.status, input.password_hash, now, now).run();
  const insertedId = Number(result.meta.last_row_id) || Number((await db().prepare("SELECT id FROM posts WHERE slug = ?").bind(input.slug).first<{ id: number }>())?.id);
  if (insertedId) await setPostTags(insertedId, tagIds);
  if (insertedId) await setPostGallery(insertedId, gallery);
  return insertedId;
}

export async function updatePost(id: number, input: Omit<PostInput, "password_hash">, tagIds: number[] = [], gallery: GalleryInput[] = []) {
  await ready();
  const statement = db().prepare("UPDATE posts SET title = ?, slug = ?, excerpt = ?, content = ?, cover_image = ?, status = ?, updated_at = ? WHERE id = ?");
  const values: unknown[] = [input.title, input.slug, input.excerpt, input.content, input.cover_image, input.status, Date.now()];
  values.push(id);
  const result = await statement.bind(...values).run();
  if (!result.meta.changes) throw new Error("找不到要編輯的文章，請重新整理後再試");
  await setPostTags(id, tagIds);
  await setPostGallery(id, gallery);
}

export async function updatePostStatus(id: number, status: Post["status"]) {
  await ready();
  await db().prepare("UPDATE posts SET status = ?, updated_at = ? WHERE id = ?")
    .bind(status, Date.now(), id).run();
}

export async function deletePost(id: number) {
  await ready();
  await ensureTagsReady();
  await ensureGalleryReady();
  await db().batch([db().prepare("DELETE FROM post_tags WHERE post_id = ?").bind(id), db().prepare("DELETE FROM post_gallery_items WHERE post_id = ?").bind(id), db().prepare("DELETE FROM blog_post_passwords WHERE post_id = ?").bind(id), db().prepare("DELETE FROM posts WHERE id = ?").bind(id)]);
}
