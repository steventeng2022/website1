import assert from "node:assert/strict";
import test from "node:test";
import worker from "../dist/server/index.js";

function bindings({ playlistFails = false, contentFails = false } = {}) {
  return {
    DB: {
      prepare(sql) {
        return {
          bind() { return this; },
          async run() { return { success: true, meta: {} }; },
          async all() {
            if (playlistFails && sql.includes("FROM music_tracks")) throw new Error("test playlist outage");
            if (contentFails && sql.includes("FROM portfolio_projects")) throw new Error("test content outage");
            return { results: [] };
          },
          async first() { return null; },
        };
      },
      async batch(statements) { return Promise.all(statements.map(statement => statement.run())); },
    },
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
  };
}
async function render(path, options) {
  const response = await worker.fetch(new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }), bindings(options), { waitUntil() {}, passThroughOnException() {} });
  return { status: response.status, html: await response.text() };
}

test("missing routes return a branded 404 with working recovery links", async () => {
  for (const [path, heading, home] of [["/this-page-does-not-exist?lang=en", "A little off the map.", "/?lang=en"], ["/this-page-does-not-exist", "這一頁，暫時迷路了", "/"]]) {
    const { status, html } = await render(path);
    assert.equal(status, 404);
    assert.ok(html.includes(heading));
    assert.ok(html.includes(`href="${home}"`));
    assert.match(html, /recovery-content/);
  }
});

test("an unavailable optional playlist does not prevent home or 404 rendering", async () => {
  const home = await render("/", { playlistFails: true });
  assert.equal(home.status, 200);
  assert.match(home.html, /hero-name/);
  const missing = await render("/this-page-does-not-exist", { playlistFails: true });
  assert.equal(missing.status, 404);
  assert.match(missing.html, /recovery-title/);
});

test("failed page data renders a useful retry screen", async () => {
  const { status, html } = await render("/portfolio?lang=en", { contentFails: true });
  // The router may already have sent a 200 shell before a streamed page rejects.
  assert.ok(status === 200 || status === 500);
  assert.match(html, /This page needs another try\./);
  assert.match(html, /Try again/);
  assert.match(html, /href="\/\?lang=en"/);
});
