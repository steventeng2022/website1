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

function db(): D1Database {
  const binding = (globalThis as typeof globalThis & { __STEVEN_SITE_ENV__?: { DB: D1Database } }).__STEVEN_SITE_ENV__?.DB;
  if (!binding) throw new Error("Database binding is unavailable");
  return binding;
}

async function ready() {
  await db().prepare(`CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    excerpt TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL,
    cover_image TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`).run();
  try {
    await db().prepare("ALTER TABLE posts ADD COLUMN cover_image TEXT").run();
  } catch (error) {
    if (!String(error).toLowerCase().includes("duplicate column")) throw error;
  }
  try {
    await db().prepare("ALTER TABLE posts ADD COLUMN password_hash TEXT").run();
  } catch (error) {
    if (!String(error).toLowerCase().includes("duplicate column")) throw error;
  }
  await db().prepare(`CREATE TABLE IF NOT EXISTS blog_post_passwords (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    label TEXT NOT NULL DEFAULT '',
    password_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
  )`).run();
  await db().prepare("CREATE INDEX IF NOT EXISTS blog_post_passwords_post_idx ON blog_post_passwords(post_id, id)").run();
  await db().prepare(`INSERT INTO blog_post_passwords (post_id, label, password_hash, created_at)
    SELECT id, '原有密碼', password_hash, updated_at FROM posts
    WHERE password_hash IS NOT NULL AND password_hash <> ''
      AND NOT EXISTS (SELECT 1 FROM blog_post_passwords WHERE blog_post_passwords.post_id = posts.id)`).run();
  await db().prepare("UPDATE posts SET password_hash = NULL WHERE password_hash IS NOT NULL").run();
  await db().prepare("CREATE INDEX IF NOT EXISTS posts_status_updated_idx ON posts(status, updated_at DESC)").run();
  await db().prepare("UPDATE posts SET title = replace(title, '。', '') WHERE instr(title, '。') > 0").run();
}

export async function listPublishedPosts() {
  await ready();
  const posts = (await db().prepare("SELECT id, title, slug, excerpt, content, cover_image, status, created_at, updated_at, NULL AS password_hash, CASE WHEN EXISTS (SELECT 1 FROM blog_post_passwords WHERE blog_post_passwords.post_id = posts.id) THEN 1 ELSE 0 END AS is_locked FROM posts WHERE status = 'published' ORDER BY updated_at DESC").all<Post>()).results;
  return attachTags(posts);
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
  const tags = await tagsByPostIds(posts.map((post) => post.id));
  const gallery = await galleryByPostIds(posts.map((post) => post.id));
  const passwords = await passwordSummariesByPostIds(posts.map((post) => post.id));
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
