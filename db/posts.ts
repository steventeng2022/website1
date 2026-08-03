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

export type Tag = { id: number; name: string; slug: string; created_at: number };
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
  await db().prepare(`CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    created_at INTEGER NOT NULL
  )`).run();
  await db().prepare(`CREATE TABLE IF NOT EXISTS post_tags (
    post_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (post_id, tag_id)
  )`).run();
  await db().prepare("CREATE INDEX IF NOT EXISTS post_tags_tag_idx ON post_tags(tag_id)").run();
}

async function attachTags(posts: Post[]): Promise<PostWithTags[]> {
  if (posts.length === 0) return [];
  const placeholders = posts.map(() => "?").join(",");
  const rows = (await db().prepare(`SELECT pt.post_id, t.id, t.name, t.slug, t.created_at
    FROM post_tags pt JOIN tags t ON t.id = pt.tag_id
    WHERE pt.post_id IN (${placeholders}) ORDER BY t.name COLLATE NOCASE`).bind(...posts.map(post => post.id)).all<Tag & { post_id: number }>()).results;
  const byPost = new Map<number, Tag[]>();
  for (const row of rows) {
    const tags = byPost.get(row.post_id) ?? [];
    tags.push({ id: row.id, name: row.name, slug: row.slug, created_at: row.created_at });
    byPost.set(row.post_id, tags);
  }
  return posts.map(post => ({ ...post, tags: byPost.get(post.id) ?? [] }));
}

export async function listPublishedPosts(limit?: number) {
  await ready();
  const query = limit
    ? db().prepare("SELECT * FROM posts WHERE status = 'published' ORDER BY updated_at DESC LIMIT ?").bind(limit)
    : db().prepare("SELECT * FROM posts WHERE status = 'published' ORDER BY updated_at DESC");
  return attachTags((await query.all<Post>()).results);
}

export async function listAllPosts() {
  await ready();
  return attachTags((await db().prepare("SELECT * FROM posts ORDER BY updated_at DESC").all<Post>()).results);
}

export async function getPublishedPost(slug: string) {
  await ready();
  const post = await db().prepare("SELECT * FROM posts WHERE slug = ? AND status = 'published'").bind(slug).first<Post>();
  return post ? (await attachTags([post]))[0] : null;
}

export async function createPost(input: Omit<Post, "id" | "created_at" | "updated_at">) {
  await ready();
  const now = Date.now();
  await db().prepare("INSERT INTO posts (title, slug, excerpt, content, cover_image, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(input.title, input.slug, input.excerpt, input.content, input.cover_image, input.status, now, now).run();
  const post = await db().prepare("SELECT * FROM posts WHERE slug = ?").bind(input.slug).first<Post>();
  if (!post) throw new Error("文章建立失敗");
  return post;
}

export async function updatePost(id: number, input: Omit<Post, "id" | "created_at" | "updated_at">) {
  await ready();
  await db().prepare("UPDATE posts SET title = ?, slug = ?, excerpt = ?, content = ?, cover_image = ?, status = ?, updated_at = ? WHERE id = ?")
    .bind(input.title, input.slug, input.excerpt, input.content, input.cover_image, input.status, Date.now(), id).run();
}

export async function updatePostStatus(id: number, status: Post["status"]) {
  await ready();
  await db().prepare("UPDATE posts SET status = ?, updated_at = ? WHERE id = ?")
    .bind(status, Date.now(), id).run();
}

export async function deletePost(id: number) {
  await ready();
  await db().prepare("DELETE FROM post_tags WHERE post_id = ?").bind(id).run();
  await db().prepare("DELETE FROM posts WHERE id = ?").bind(id).run();
}

export async function listTags() {
  await ready();
  return (await db().prepare(`SELECT t.*, COUNT(pt.post_id) AS post_count FROM tags t
    LEFT JOIN post_tags pt ON pt.tag_id = t.id GROUP BY t.id ORDER BY t.name COLLATE NOCASE`).all<Tag & { post_count: number }>()).results;
}

export async function createTag(name: string, slug: string) {
  await ready();
  await db().prepare("INSERT INTO tags (name, slug, created_at) VALUES (?, ?, ?)").bind(name, slug, Date.now()).run();
}

export async function deleteTag(id: number) {
  await ready();
  await db().prepare("DELETE FROM post_tags WHERE tag_id = ?").bind(id).run();
  await db().prepare("DELETE FROM tags WHERE id = ?").bind(id).run();
}

export async function setPostTags(postId: number, tagIds: number[]) {
  await ready();
  await db().prepare("DELETE FROM post_tags WHERE post_id = ?").bind(postId).run();
  const uniqueIds = [...new Set(tagIds.filter(id => Number.isInteger(id) && id > 0))];
  for (const tagId of uniqueIds) {
    await db().prepare("INSERT OR IGNORE INTO post_tags (post_id, tag_id) SELECT ?, id FROM tags WHERE id = ?").bind(postId, tagId).run();
  }
}
