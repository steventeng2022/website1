export type Post = {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  status: "draft" | "published";
  created_at: number;
  updated_at: number;
};

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
    status TEXT NOT NULL DEFAULT 'draft',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`).run();
  await db().prepare("CREATE INDEX IF NOT EXISTS posts_status_updated_idx ON posts(status, updated_at DESC)").run();
}

export async function listPublishedPosts() {
  await ready();
  return (await db().prepare("SELECT * FROM posts WHERE status = 'published' ORDER BY updated_at DESC").all<Post>()).results;
}

export async function listAllPosts() {
  await ready();
  return (await db().prepare("SELECT * FROM posts ORDER BY updated_at DESC").all<Post>()).results;
}

export async function getPublishedPost(slug: string) {
  await ready();
  return db().prepare("SELECT * FROM posts WHERE slug = ? AND status = 'published'").bind(slug).first<Post>();
}

export async function createPost(input: Omit<Post, "id" | "created_at" | "updated_at">) {
  await ready();
  const now = Date.now();
  await db().prepare("INSERT INTO posts (title, slug, excerpt, content, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(input.title, input.slug, input.excerpt, input.content, input.status, now, now).run();
}

export async function updatePost(id: number, input: Omit<Post, "id" | "created_at" | "updated_at">) {
  await ready();
  await db().prepare("UPDATE posts SET title = ?, slug = ?, excerpt = ?, content = ?, status = ?, updated_at = ? WHERE id = ?")
    .bind(input.title, input.slug, input.excerpt, input.content, input.status, Date.now(), id).run();
}

export async function deletePost(id: number) {
  await ready();
  await db().prepare("DELETE FROM posts WHERE id = ?").bind(id).run();
}
