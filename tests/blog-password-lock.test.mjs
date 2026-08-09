import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("stores only a salted password hash", async () => {
  const lock = await read("app/blog-lock.ts");
  const saver = await read("app/admin/post-save.ts");
  assert.match(lock, /scrypt-v1/);
  assert.match(lock, /randomBytes\(16\)/);
  assert.match(lock, /timingSafeEqual/);
  assert.match(saver, /password_hash:\s*await hashBlogPassword\(entry\.password\)/);
  assert.doesNotMatch(saver, /INSERT[^\n]+password(?!_hash)/i);
});

test("avoids the Workers Web Crypto PBKDF2 iteration ceiling", async () => {
  const lock = await read("app/blog-lock.ts");
  assert.doesNotMatch(lock, /crypto\.subtle\.deriveBits/);
  assert.doesNotMatch(lock, /const ITERATIONS = 120_000/);
  assert.match(lock, /deriveLegacyPbkdf2/);
  assert.match(lock, /parts\[0\] === "pbkdf2-sha256"/);
});

test("checks access before loading protected article content", async () => {
  const page = await read("app/blog/[slug]/page.tsx");
  const unlockAction = await read("app/blog/[slug]/unlock-action.ts");
  assert.ok(page.indexOf("getPublishedPostAccess(slug)") < page.indexOf("getPublishedPost(slug)"));
  assert.match(unlockAction, /httpOnly:\s*true/);
  assert.match(unlockAction, /maxAge:\s*60 \* 60 \* 24/);
});

test("supports multiple independent passwords and selective removal", async () => {
  const saver = await read("app/admin/post-save.ts");
  const posts = await read("db/posts.ts");
  const field = await read("app/admin/blog-password-field.tsx");
  assert.match(saver, /newBlogPasswords/);
  assert.match(saver, /removeBlogPasswordIds/);
  assert.match(saver, /addPostPasswords/);
  assert.match(saver, /removePostPasswords/);
  assert.match(posts, /CREATE TABLE IF NOT EXISTS blog_post_passwords/);
  assert.match(field, /新增另一組密碼/);
  assert.match(field, /最多 20 組/);
});

test("saves posts without navigating to a blank server-action page", async () => {
  const form = await read("app/admin/post-save-form.tsx");
  const route = await read("app/admin/post-save/route.ts");
  assert.match(form, /event\.preventDefault\(\)/);
  assert.match(form, /fetch\("\/admin\/post-save"/);
  assert.match(form, /setMessage\(/);
  assert.match(form, /response\.json\(\)\.catch/);
  assert.match(route, /Response\.json\(\{ ok: true/);
  assert.match(route, /Response\.json\(\{ ok: false, error:/);
});

test("hashes new passwords before changing the saved post", async () => {
  const saver = await read("app/admin/post-save.ts");
  assert.ok(saver.indexOf("const passwords = await hashedPasswords(newPasswords)") < saver.indexOf("await updatePost(id"));
  assert.doesNotMatch(saver, /Promise\.all\(entries\.map/);
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
