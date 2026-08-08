import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const developmentPreviewMeta =
  /<meta(?=[^>]*\bname=["']codex-preview["'])(?=[^>]*\bcontent=["']development["'])[^>]*>/i;

test("renders development preview metadata", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      DB: {
        prepare() {
          return {
            bind() { return this; },
            async run() { return { success: true, meta: {} }; },
            async all() { return { results: [] }; },
            async first() { return null; },
          };
        },
        async batch(statements) { return Promise.all(statements.map((statement) => statement.run())); },
      },
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  assert.match(await response.text(), developmentPreviewMeta);
});

test("renders the portfolio route", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("portfolio-test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const response = await worker.fetch(new Request("http://localhost/portfolio", { headers: { accept: "text/html" } }), {
    DB: {
      prepare() { return { bind() { return this; }, async run() { return { success: true, meta: {} }; }, async all() { return { results: [] }; }, async first() { return null; } }; },
      async batch(statements) { return Promise.all(statements.map((statement) => statement.run())); },
    },
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
  }, { waitUntil() {}, passThroughOnException() {} });
  assert.equal(response.status, 200);
  assert.match(await response.text(), /我完成的/);
});

test("portfolio uses linked horizontal project cards", async () => {
  const [page, styles] = await Promise.all([
    readFile(new URL("../app/portfolio/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(page, /project\.link_url \|\| project\.github_url/);
  assert.match(page, /className="portfolio-card-link"/);
  assert.match(page, /projectTags\.map/);
  assert.match(styles, /\.portfolio-card \{[^}]*grid-template-columns:minmax\(260px,38%\) 1fr/s);
  assert.match(styles, /\.portfolio-card-bottom \{[^}]*justify-content:space-between/s);
  assert.match(styles, /\.portfolio-card-link \{ position:absolute; inset:0;/);
  assert.match(styles, /@media \(max-width:800px\)[\s\S]*\.portfolio-card \{[^}]*grid-template-columns:1fr/);
});

test("project management keeps every operation wired", async () => {
  const [admin, actions, database, upload] = await Promise.all([
    readFile(new URL("../app/admin/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/actions.ts", import.meta.url), "utf8"),
    readFile(new URL("../db/site-content.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/project-cover-field.tsx", import.meta.url), "utf8"),
  ]);

  for (const action of ["createProjectAction", "updateProjectAction", "deleteProjectAction", "moveSiteItemAction"]) {
    assert.match(admin, new RegExp(action));
    assert.match(actions, new RegExp(`export async function ${action}`));
  }
  assert.match(admin, /name="featured"/);
  assert.match(admin, /name="sortOrder"/);
  assert.match(admin, /post\.status === "published"/);
  assert.match(actions, /publishedPostExists/);
  assert.match(database, /if \(!result\.meta\.changes\) throw new Error\("找不到要編輯的作品/);
  assert.match(database, /if \(!result\.meta\.changes\) throw new Error\("找不到要刪除的作品/);
  assert.match(upload, /uploadPreparedImage/);
});

test("Chinese titles remove full-width periods", async () => {
  const [home, portfolio, experience, admin, actions, database] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/portfolio/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/experience/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/actions.ts", import.meta.url), "utf8"),
    readFile(new URL("../db/site-content.ts", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(home, /Steven。|創作過程。/);
  assert.doesNotMatch(portfolio, /我完成的\\n作品。/);
  assert.doesNotMatch(experience, /"我的經歷。"/);
  assert.doesNotMatch(admin, /個人網站。<\/h1>/);
  assert.match(actions, /replace\(\/。\+\/g, ""\)/);
  assert.match(database, /UPDATE portfolio_projects SET title_zh=replace/);
});
