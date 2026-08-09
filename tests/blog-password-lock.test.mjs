import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("stores only a salted password hash", async () => {
  const lock = await read("app/blog-lock.ts");
  const actions = await read("app/admin/actions.ts");
  assert.match(lock, /PBKDF2/);
  assert.match(lock, /crypto\.getRandomValues/);
  assert.match(actions, /password_hash:\s*await hashBlogPassword\(entry\.password\)/);
  assert.doesNotMatch(actions, /INSERT[^\n]+password(?!_hash)/i);
});

test("checks access before loading protected article content", async () => {
  const page = await read("app/blog/[slug]/page.tsx");
  const unlockAction = await read("app/blog/[slug]/unlock-action.ts");
  assert.ok(page.indexOf("getPublishedPostAccess(slug)") < page.indexOf("getPublishedPost(slug)"));
  assert.match(unlockAction, /httpOnly:\s*true/);
  assert.match(unlockAction, /maxAge:\s*60 \* 60 \* 24/);
});

test("supports multiple independent passwords and selective removal", async () => {
  const actions = await read("app/admin/actions.ts");
  const posts = await read("db/posts.ts");
  const field = await read("app/admin/blog-password-field.tsx");
  assert.match(actions, /newBlogPasswords/);
  assert.match(actions, /removeBlogPasswordIds/);
  assert.match(actions, /addPostPasswords/);
  assert.match(actions, /removePostPasswords/);
  assert.match(posts, /CREATE TABLE IF NOT EXISTS blog_post_passwords/);
  assert.match(field, /新增另一組密碼/);
  assert.match(field, /最多 20 組/);
});

test("accepts any saved password and invalidates cookies when the password set changes", async () => {
  const lock = await read("app/blog-lock.ts");
  const unlockAction = await read("app/blog/[slug]/unlock-action.ts");
  assert.match(lock, /verifyAnyBlogPassword/);
  assert.match(lock, /for \(const record of records\)/);
  assert.match(lock, /sort\(\(a, b\) => a\.id - b\.id\)/);
  assert.match(unlockAction, /verifyAnyBlogPassword\(password, post\.passwords\)/);
});

test("migrates the previous single password without losing it", async () => {
  const posts = await read("db/posts.ts");
  const migration = await read("drizzle/0008_add_multiple_blog_passwords.sql");
  assert.match(posts, /SELECT id, '原有密碼', password_hash, updated_at FROM posts/);
  assert.match(migration, /INSERT INTO `blog_post_passwords`/);
  assert.match(migration, /UPDATE `posts` SET `password_hash` = NULL/);
});
