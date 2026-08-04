import { ensureTagsReady, setPostTags, tagsByPostIds, type Tag } from "./tags";

export type Post = {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image: string | null;
  status: "draft" | "published";
  created_at: number;
  updated_at: number;
};

export type PostWithTags = Post & { tags: Tag[] };

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
  await db().prepare("CREATE INDEX IF NOT EXISTS posts_status_updated_idx ON posts(status, updated_at DESC)").run();
}

export async function listPublishedPosts() {
  await ready();
  const posts = (await db().prepare("SELECT * FROM posts WHERE status = 'published' ORDER BY updated_at DESC").all<Post>()).results;
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

async function attachTags(posts: Post[]): Promise<PostWithTags[]> {
  const tags = await tagsByPostIds(posts.map((post) => post.id));
  return posts.map((post) => ({ ...post, tags: tags.get(post.id) ?? [] }));
}

export async function createPost(input: Omit<Post, "id" | "created_at" | "updated_at">, tagIds: number[] = []) {
  await ready();
  const now = Date.now();
  const result = await db().prepare("INSERT INTO posts (title, slug, excerpt, content, cover_image, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(input.title, input.slug, input.excerpt, input.content, input.cover_image, input.status, now, now).run();
  const insertedId = Number(result.meta.last_row_id) || Number((await db().prepare("SELECT id FROM posts WHERE slug = ?").bind(input.slug).first<{ id: number }>())?.id);
  if (insertedId) await setPostTags(insertedId, tagIds);
}

export async function updatePost(id: number, input: Omit<Post, "id" | "created_at" | "updated_at">, tagIds: number[] = []) {
  await ready();
  await db().prepare("UPDATE posts SET title = ?, slug = ?, excerpt = ?, content = ?, cover_image = ?, status = ?, updated_at = ? WHERE id = ?")
    .bind(input.title, input.slug, input.excerpt, input.content, input.cover_image, input.status, Date.now(), id).run();
  await setPostTags(id, tagIds);
}

export async function updatePostStatus(id: number, status: Post["status"]) {
  await ready();
  await db().prepare("UPDATE posts SET status = ?, updated_at = ? WHERE id = ?")
    .bind(status, Date.now(), id).run();
}

export async function deletePost(id: number) {
  await ready();
  await ensureTagsReady();
  await db().batch([db().prepare("DELETE FROM post_tags WHERE post_id = ?").bind(id), db().prepare("DELETE FROM posts WHERE id = ?").bind(id)]);
}
