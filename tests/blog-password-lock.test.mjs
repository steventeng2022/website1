import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("stores only a salted password hash", async () => {
  const lock = await read("app/blog-lock.ts");
  const actions = await read("app/admin/actions.ts");
  assert.match(lock, /PBKDF2/);
  assert.match(lock, /crypto\.getRandomValues/);
  assert.match(actions, /hashBlogPassword\(password\)/);
  assert.match(actions, /password_hash:\s*password \? await hashBlogPassword\(password\) : null/);
});

test("checks access before loading protected article content", async () => {
  const page = await read("app/blog/[slug]/page.tsx");
  const unlockAction = await read("app/blog/[slug]/unlock-action.ts");
  assert.ok(page.indexOf("getPublishedPostAccess(slug)") < page.indexOf("getPublishedPost(slug)"));
  assert.match(unlockAction, /httpOnly:\s*true/);
  assert.match(unlockAction, /maxAge:\s*60 \* 60 \* 24/);
});

test("supports preserving, changing, and removing an article lock", async () => {
  const actions = await read("app/admin/actions.ts");
  const posts = await read("db/posts.ts");
  assert.match(actions, /removePassword \? null : password \?/);
  assert.match(posts, /passwordHash === undefined/);
  assert.match(posts, /password_hash = \?/);
});
