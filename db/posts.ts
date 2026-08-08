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

export type PostWithTags = Post & { tags: Tag[]; gallery: GalleryItem[] };

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
  await db().prepare("CREATE INDEX IF NOT EXISTS posts_status_updated_idx ON posts(status, updated_at DESC)").run();
  await db().prepare("UPDATE posts SET title = replace(title, '。', '') WHERE instr(title, '。') > 0").run();
}

export async function listPublishedPosts() {
  await ready();
  const posts = (await db().prepare("SELECT id, title, slug, excerpt, content, cover_image, status, created_at, updated_at, NULL AS password_hash, CASE WHEN password_hash IS NOT NULL AND password_hash <> '' THEN 1 ELSE 0 END AS is_locked FROM posts WHERE status = 'published' ORDER BY updated_at DESC").all<Post>()).results;
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
  return db().prepare("SELECT id, slug, password_hash FROM posts WHERE slug = ? AND status = 'published'").bind(slug).first<Pick<Post, "id" | "slug" | "password_hash">>();
}

export async function publishedPostExists(slug: string) {
  await ready();
  return Boolean(await db().prepare("SELECT id FROM posts WHERE slug = ? AND status = 'published'").bind(slug).first<{ id: number }>());
}

async function attachTags(posts: Post[]): Promise<PostWithTags[]> {
  const tags = await tagsByPostIds(posts.map((post) => post.id));
  const gallery = await galleryByPostIds(posts.map((post) => post.id));
  return posts.map((post) => ({ ...post, tags: tags.get(post.id) ?? [], gallery: gallery.get(post.id) ?? [] }));
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
}

export async function updatePost(id: number, input: Omit<PostInput, "password_hash">, tagIds: number[] = [], gallery: GalleryInput[] = [], passwordHash?: string | null) {
  await ready();
  const passwordSql = passwordHash === undefined ? "" : ", password_hash = ?";
  const statement = db().prepare(`UPDATE posts SET title = ?, slug = ?, excerpt = ?, content = ?, cover_image = ?, status = ?, updated_at = ?${passwordSql} WHERE id = ?`);
  const values: unknown[] = [input.title, input.slug, input.excerpt, input.content, input.cover_image, input.status, Date.now()];
  if (passwordHash !== undefined) values.push(passwordHash);
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
  await db().batch([db().prepare("DELETE FROM post_tags WHERE post_id = ?").bind(id), db().prepare("DELETE FROM post_gallery_items WHERE post_id = ?").bind(id), db().prepare("DELETE FROM posts WHERE id = ?").bind(id)]);
}
