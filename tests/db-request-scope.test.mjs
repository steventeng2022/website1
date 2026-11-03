import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import ts from "typescript";
import { createRequestContext, runWithRequestContext } from "vinext/shims/unified-request-context";

// Run the real DB modules and vinext request cache in the same JS realm.
const moduleUrls = new Map();
async function moduleUrl(file) {
  if (moduleUrls.has(file.href)) return moduleUrls.get(file.href);
  const source = await readFile(file, "utf8");
  let compiled = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022,
  } }).outputText;
  for (const [, name] of compiled.matchAll(/from "([^"]+)"/g)) {
    const resolved = name.startsWith(".")
      ? await moduleUrl(new URL(`${name}.ts`, file))
      : import.meta.resolve(name);
    compiled = compiled.replace(`from "${name}"`, `from "${resolved}"`);
  }
  const url = `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
  moduleUrls.set(file.href, url);
  return url;
}
const load = async name => import(await moduleUrl(new URL(`../db/${name}.ts`, import.meta.url)));
const inRequest = action => runWithRequestContext(createRequestContext(), action);

function database(t) {
  const connection = new DatabaseSync(":memory:");
  const calls = [];
  const statements = [];
  const previousEnv = globalThis.__STEVEN_SITE_ENV__;
  const d1 = {
    beforeStatement: null,
    prepare(sql) {
      return {
        sql, values: [],
        bind(...values) { this.values = values; return this; },
        async all() {
          calls.push({ kind: "all", sql });
          statements.push(sql);
          return { results: connection.prepare(sql).all(...this.values) };
        },
        async first() {
          calls.push({ kind: "first", sql });
          statements.push(sql);
          return connection.prepare(sql).get(...this.values) ?? null;
        },
        async run() {
          calls.push({ kind: "run", sql });
          statements.push(sql);
          const result = connection.prepare(sql).run(...this.values);
          return { meta: { changes: result.changes, last_row_id: Number(result.lastInsertRowid) } };
        },
      };
    },
    async batch(items) {
      calls.push({ kind: "batch" });
      connection.exec("BEGIN");
      try {
        const results = items.map(item => {
          statements.push(item.sql);
          d1.beforeStatement?.(item.sql);
          const result = connection.prepare(item.sql).run(...item.values);
          return { meta: { changes: result.changes, last_row_id: Number(result.lastInsertRowid) } };
        });
        connection.exec("COMMIT");
        return results;
      } catch (error) {
        connection.exec("ROLLBACK");
        throw error;
      }
    },
  };
  globalThis.__STEVEN_SITE_ENV__ = { DB: d1 };
  t.after(() => {
    globalThis.__STEVEN_SITE_ENV__ = previousEnv;
    connection.close();
  });
  return { d1, connection, calls, statements };
}

test("all DB initializers deduplicate concurrent work only within the current request", async t => {
  const { statements } = database(t);
  const initializers = [
    ["posts", "ensurePostsReady", "posts"],
    ["music", "ensureMusicReady", "music_tracks"],
    ["site-content", "ensureSiteContentReady", "site_profile"],
    ["analytics", "ensureAnalyticsReady", "site_visits"],
    ["friends", "ensureFriendsReady", "friends"],
    ["experiences", "ensureExperiencesReady", "experiences"],
    ["tags", "ensureTagsReady", "tags"],
    ["gallery", "ensureGalleryReady", "post_gallery_items"],
    ["discord-status", "getDiscordStatusSettings", "discord_status_settings"],
  ];
  for (const [name, method, table] of initializers) {
    const api = await load(name);
    const initialized = () => statements.filter(sql => sql.startsWith(`CREATE TABLE IF NOT EXISTS ${table} (`)).length;
    await inRequest(async () => {
      await Promise.all([api[method](), api[method](), api[method]()]);
      await api[method]();
      assert.equal(initialized(), 1, `${name}: one initialization per request`);
    });
    await Promise.all([inRequest(() => api[method]()), inRequest(() => api[method]())]);
    assert.equal(initialized(), 3, `${name}: concurrent requests have independent initialization`);
    await api[method]();
    await api[method]();
    assert.equal(initialized(), 5, `${name}: outside a request no promise is retained`);
  }
});

test("request-scoped readiness never caches content, including read after write", async t => {
  const { statements } = database(t);
  const music = await load("music");
  const track = { title: "First", artist: "Steven", audio_url: "/track.mp3", cover_url: null, enabled: 1, sort_order: 0 };
  await inRequest(async () => {
    assert.deepEqual(await music.listPublicMusicTracks(), []);
    await music.createMusicTrack(track);
    const saved = (await music.listPublicMusicTracks())[0];
    assert.equal(saved.title, "First");
    await music.updateMusicTrack(saved.id, { ...track, title: "Edited" });
    assert.equal((await music.listPublicMusicTracks())[0].title, "Edited");
  });
  assert.equal((await inRequest(() => music.listPublicMusicTracks()))[0].title, "Edited");
  assert.equal(statements.filter(sql => sql.startsWith("CREATE TABLE IF NOT EXISTS music_tracks")).length, 2);
  assert.equal(statements.filter(sql => sql.startsWith("SELECT * FROM music_tracks")).length, 4);
});

function legacyPosts(connection, password = true) {
  connection.exec(`CREATE TABLE posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, slug TEXT NOT NULL UNIQUE,
    excerpt TEXT NOT NULL DEFAULT '', content TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'draft',
    created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL${password ? ", password_hash TEXT" : ""}
  )`);
  connection.exec(`INSERT INTO posts(title,slug,content,status,created_at,updated_at${password ? ",password_hash" : ""})
    VALUES ('Old。 title','old-post','private content','published',10,20${password ? ",'salted-hash'" : ""})`);
}

test("batched post upgrade preserves legacy passwords and old schemas without repeated ALTER failures", async t => {
  const { connection, calls, statements } = database(t);
  legacyPosts(connection);
  const posts = await load("posts");
  await inRequest(async () => {
    await posts.ensurePostsReady();
    const access = await posts.getPublishedPostAccess("old-post");
    assert.equal(access.passwords[0].password_hash, "salted-hash");
    assert.equal(access.passwords[0].label, "原有密碼");
    const migrated = connection.prepare("SELECT * FROM posts").get();
    assert.equal(migrated.password_hash, null);
    assert.equal(migrated.title, "Old title");
    assert.equal(migrated.content, "private content");
    assert.equal(migrated.cover_image, null);
  });
  assert.equal(statements.filter(sql => sql.startsWith("ALTER TABLE posts")).length, 1);
  const before = calls.length;
  await inRequest(() => posts.ensurePostsReady());
  assert.equal(calls.length - before, 3, "existing schema uses CREATE, PRAGMA, and one migration batch");
  assert.equal(statements.filter(sql => sql.startsWith("ALTER TABLE posts")).length, 1, "no intentional duplicate-column errors");
  assert.equal(connection.prepare("SELECT count(*) AS count FROM blog_post_passwords").get().count, 1);
});

test("an earlier posts table without either optional column upgrades successfully", async t => {
  const { connection } = database(t);
  legacyPosts(connection, false);
  const posts = await load("posts");
  await inRequest(() => posts.ensurePostsReady());
  const row = connection.prepare("SELECT cover_image,password_hash FROM posts").get();
  assert.equal(row.cover_image, null);
  assert.equal(row.password_hash, null);
  assert.equal((await inRequest(() => posts.getPublishedPostAccess("old-post"))).passwords.length, 0);
});

test("a failed migration keeps the legacy password and can retry in the same request", async t => {
  const { connection, d1 } = database(t);
  legacyPosts(connection);
  const posts = await load("posts");
  d1.beforeStatement = sql => {
    if (sql.startsWith("UPDATE posts SET password_hash")) throw new Error("temporary database failure");
  };
  await inRequest(async () => {
    await assert.rejects(posts.ensurePostsReady(), /temporary database failure/);
    assert.equal(connection.prepare("SELECT password_hash FROM posts").get().password_hash, "salted-hash");
    d1.beforeStatement = null;
    await posts.ensurePostsReady();
    assert.equal((await posts.getPublishedPostAccess("old-post")).passwords[0].password_hash, "salted-hash");
    assert.equal(connection.prepare("SELECT count(*) AS count FROM blog_post_passwords").get().count, 1);
  });
});

test("post lists retain tags, gallery, and password summaries after attachment reads run together", async t => {
  database(t);
  const posts = await load("posts");
  const tags = await load("tags");
  await inRequest(async () => {
    await tags.createTag("Learning", "learning");
    const postId = await posts.createPost({
      title: "Post", slug: "post", excerpt: "Preview", content: "Body", cover_image: null,
      status: "published", password_hash: null,
    }, [1], [{ image_url: "/image.png", caption: "Caption", sort_order: 0 }]);
    await posts.addPostPasswords(postId, [{ label: "Family", password_hash: "never-expose-in-summary" }]);
    const [post] = await posts.listAllPosts();
    assert.equal(post.tags[0].name, "Learning");
    assert.equal(post.gallery[0].image_url, "/image.png");
    assert.equal(post.passwords[0].label, "Family");
    assert.equal("password_hash" in post.passwords[0], false);
  });
});
