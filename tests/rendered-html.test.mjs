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
