import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import vm from "node:vm";
import { createElement } from "react";
import * as jsx from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { createRequestContext, runWithRequestContext } from "vinext/shims/unified-request-context";

const moduleUrls = new Map();
async function moduleUrl(file) {
  if (moduleUrls.has(file.href)) return moduleUrls.get(file.href);
  let compiled = ts.transpileModule(await readFile(file, "utf8"), { compilerOptions: {
    module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022,
  } }).outputText;
  for (const [, name] of compiled.matchAll(/from "([^"]+)"/g)) {
    const resolved = name.startsWith(".") ? await moduleUrl(new URL(`${name}.ts`, file)) : import.meta.resolve(name);
    compiled = compiled.replace(`from "${name}"`, `from "${resolved}"`);
  }
  const url = `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
  moduleUrls.set(file.href, url);
  return url;
}
const posts = await import(await moduleUrl(new URL("../db/posts.ts", import.meta.url)));
const tags = await import(await moduleUrl(new URL("../db/tags.ts", import.meta.url)));
const inRequest = action => runWithRequestContext(createRequestContext(), action);

async function fixture(t, size = 25) {
  const sql = new DatabaseSync(":memory:");
  const reads = [];
  const oldEnv = globalThis.__STEVEN_SITE_ENV__;
  const d1 = {
    prepare(query) {
      return {
        query, values: [],
        bind(...values) { this.values = values; return this; },
        async all() {
          const results = sql.prepare(query).all(...this.values);
          reads.push({ query, values: this.values, rows: results.length });
          return { results };
        },
        async first() {
          const result = sql.prepare(query).get(...this.values) ?? null;
          reads.push({ query, values: this.values, rows: result ? 1 : 0 });
          return result;
        },
        async run() {
          const result = sql.prepare(query).run(...this.values);
          return { meta: { changes: result.changes, last_row_id: Number(result.lastInsertRowid) } };
        },
      };
    },
    async batch(items) {
      sql.exec("BEGIN");
      try {
        for (const item of items) sql.prepare(item.query).run(...item.values);
        sql.exec("COMMIT");
      } catch (error) { sql.exec("ROLLBACK"); throw error; }
      return [];
    },
  };
  globalThis.__STEVEN_SITE_ENV__ = { DB: d1 };
  t.after(() => { globalThis.__STEVEN_SITE_ENV__ = oldEnv; sql.close(); });
  await inRequest(() => Promise.all([posts.ensurePostsReady(), tags.ensureTagsReady()]));
  const insert = sql.prepare("INSERT INTO posts(title,slug,excerpt,content,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?)");
  for (let i = 1; i <= size; i++) insert.run(`Note ${i}`, `note-${i}`, "A short preview", "UNUSED PRIVATE BODY ".repeat(1000), "published", 1000, 2000);
  insert.run("Draft", "draft", "Not public", "Draft body", "draft", 1000, 9000);
  sql.exec("INSERT INTO tags(name,slug,created_at) VALUES('Learning','learning',1),('Projects','projects',1)");
  for (let i = 1; i <= size; i++) sql.prepare("INSERT INTO post_tags(post_id,tag_id) VALUES(?,?)").run(i, i % 2 ? 1 : 2);
  reads.length = 0;
  return { sql, reads };
}

test("the archive returns twelve summaries in a stable order without skipped tied dates", async t => {
  const { sql, reads } = await fixture(t);
  sql.exec("INSERT INTO blog_post_passwords(post_id,label,password_hash,created_at) VALUES(25,'Family','PRIVATE HASH',1)");
  const pages = await inRequest(async () => Promise.all([1, 2, 3].map(page => posts.listPublishedPostSummaries({ page }))));
  assert.deepEqual(pages.map(page => page.posts.length), [12, 12, 1]);
  assert.deepEqual(pages.flatMap(page => page.posts.map(post => post.id)), Array.from({ length: 25 }, (_, index) => 25 - index));
  assert.ok(pages.every(page => page.total === 25 && page.totalPages === 3));
  assert.equal(pages[0].posts[0].is_locked, 1);
  assert.equal(pages[0].posts[0].tags[0].slug, "learning");
  for (const post of pages.flatMap(page => page.posts)) {
    assert.deepEqual(Object.keys(post).sort(), ["excerpt", "id", "is_locked", "slug", "tags", "title", "updated_at"]);
  }
  assert.ok(reads.filter(read => read.query.startsWith("SELECT p.id")).every(read => read.rows <= 12));
  assert.ok(reads.filter(read => read.query.includes("FROM post_tags pt JOIN")).every(read => read.values.length <= 12));
  assert.ok(reads.every(read => !read.query.includes("post_gallery_items")));
  assert.ok(reads.filter(read => read.query.startsWith("SELECT")).every(read => !/content|password_hash|SELECT \*/.test(read.query)));
});

test("page numbers are clamped, including an empty archive and removed last pages", async t => {
  const { sql } = await fixture(t);
  await inRequest(async () => {
    for (const page of [0, -12, NaN, Infinity]) assert.equal((await posts.listPublishedPostSummaries({ page })).page, 1);
    assert.equal((await posts.listPublishedPostSummaries({ page: 2.9 })).page, 2);
    assert.equal((await posts.listPublishedPostSummaries({ page: Number.MAX_VALUE })).page, 3);
    sql.exec("DELETE FROM posts WHERE id >= 13");
    const clamped = await posts.listPublishedPostSummaries({ page: 3 });
    assert.equal(clamped.page, 1);
    assert.equal(clamped.total, 12);
    sql.exec("DELETE FROM posts");
    const empty = await posts.listPublishedPostSummaries({ page: 100 });
    assert.equal(empty.page, 1);
    assert.equal(empty.totalPages, 1);
    assert.deepEqual(empty.posts, []);
  });
});

test("tag and title/preview search are applied together before pagination", async t => {
  const { sql } = await fixture(t);
  sql.exec("UPDATE posts SET excerpt='Learning about sensors' WHERE id IN (1,2,3)");
  sql.exec("UPDATE posts SET title='SENSORS and circuits' WHERE id=5");
  const filtered = await inRequest(() => posts.listPublishedPostSummaries({ tag: "learning", query: " sensors " }));
  assert.deepEqual(filtered.posts.map(post => post.id), [5, 3, 1]);
  assert.equal(filtered.total, 3);
  assert.equal(filtered.query, "sensors");
  const unknown = await inRequest(() => posts.listPublishedPostSummaries({ tag: "unknown" }));
  assert.equal(unknown.total, 0);
  const bodyOnly = await inRequest(() => posts.listPublishedPostSummaries({ query: "UNUSED PRIVATE BODY" }));
  assert.equal(bodyOnly.total, 0);
});

test("search treats SQL wildcards, quotes, backslashes, and Chinese text literally", async t => {
  const { sql } = await fixture(t);
  const examples = [[1, "100% complete", "%"], [2, "under_score", "_"], [3, "path\\file", "\\"], [4, "Steven's note", "Steven's"], [5, "學習筆記", "學習"]];
  for (const [id, title] of examples) sql.prepare("UPDATE posts SET title=? WHERE id=?").run(title, id);
  for (const [id, , query] of examples) {
    const result = await inRequest(() => posts.listPublishedPostSummaries({ query }));
    assert.deepEqual(result.posts.map(post => post.id), [id], query);
  }
  assert.equal((await inRequest(() => posts.listPublishedPostSummaries({ query: "%' OR 1=1 --" }))).total, 0);
});

test("newly edited and published notes appear without cached archive content", async t => {
  const { sql } = await fixture(t);
  await inRequest(async () => {
    assert.equal((await posts.listPublishedPostSummaries({ query: "fresh" })).total, 0);
    sql.exec("UPDATE posts SET status='published',title='Fresh note' WHERE slug='draft'");
    const fresh = await posts.listPublishedPostSummaries({ query: "fresh" });
    assert.equal(fresh.total, 1);
    assert.equal(fresh.posts[0].slug, "draft");
  });
});

const pageSource = await readFile(new URL("../app/blog/page.tsx", import.meta.url), "utf8");
const compiledPage = ts.transpileModule(pageSource, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
} }).outputText;
async function renderPage(searchParams) {
  const sandbox = { exports: {}, URLSearchParams, require(name) {
    if (name === "react/jsx-runtime") return jsx;
    if (name === "../../db/posts") return posts;
    if (name === "../../db/tags") return tags;
    if (name === "next/link") return { default: props => createElement("a", props) };
    return { default: () => null };
  } };
  vm.createContext(sandbox);
  vm.runInContext(compiledPage, sandbox);
  return inRequest(async () => renderToStaticMarkup(await sandbox.exports.default({ searchParams: Promise.resolve(searchParams) })));
}

test("GET search and pagination preserve language, topic, and encoded query", async t => {
  const { sql } = await fixture(t);
  sql.exec("UPDATE posts SET excerpt='100% of the learning journey'");
  const html = await renderPage({ lang: "en", tag: "learning", q: "%", page: "1" });
  const searchForm = html.match(/<form[^>]*>/)?.[0] ?? "";
  assert.match(searchForm, /method="get"/);
  assert.match(searchForm, /role="search"/);
  assert.match(searchForm, /action="\/blog"/);
  assert.match(html, /<label for="journal-search">/);
  assert.match(html, /type="hidden" name="lang" value="en"/);
  assert.match(html, /type="hidden" name="tag" value="learning"/);
  assert.match(html, /Showing 1–12 of 13 notes/);
  assert.equal((html.match(/<article class="blog-card"/g) ?? []).length, 12);
  assert.match(html, /rel="next" href="\/blog\?lang=en&amp;tag=learning&amp;q=%25&amp;page=2#journal-results"/);
  assert.match(html, /href="\/blog\?lang=en&amp;tag=projects&amp;q=%25"/);
  assert.match(html, /href="\/blog\?lang=en">Clear filters/);
  const last = await renderPage({ lang: "en", tag: "learning", q: "%", page: "2" });
  assert.match(last, /Showing 13–13 of 13 notes/);
  assert.match(last, /rel="prev" href="\/blog\?lang=en&amp;tag=learning&amp;q=%25#journal-results"/);
  assert.doesNotMatch(last, /rel="next"/);
});

test("empty states distinguish an empty journal, missing topic, and unmatched search in both languages", async t => {
  const { sql } = await fixture(t, 0);
  assert.match(await renderPage({}), /第一頁故事，正在醞釀/);
  assert.match(await renderPage({ lang: "en" }), /The first page is still unfolding/);
  assert.match(await renderPage({ tag: "missing" }), /這個主題，還沒有筆記/);
  assert.match(await renderPage({ lang: "en", tag: "missing" }), /No notes on this topic yet/);
  assert.match(await renderPage({ q: "test" }), /還沒有符合搜尋的筆記/);
  const noMatch = await renderPage({ lang: "en", q: "test" });
  assert.match(noMatch, /No notes match your search/);
  assert.doesNotMatch(noMatch, /archive-pagination/);
  sql.exec("UPDATE posts SET status='published'");
  assert.match(await renderPage({}), /顯示第 1–1 篇，共 1 篇/);
});
