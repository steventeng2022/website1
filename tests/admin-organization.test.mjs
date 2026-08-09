import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const page = await readFile(new URL("../app/admin/page.tsx", import.meta.url), "utf8");
const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

test("admin is organized into focused sections instead of one long page", () => {
  for (const section of ["overview", "blog", "portfolio", "site", "experience", "music", "friends"]) {
    assert.match(page, new RegExp(`id: "${section}"`));
    assert.match(page, new RegExp(`activeSection === "${section}"`));
  }
  assert.match(page, /className="admin-nav"/);
  assert.match(page, /網站管理總覽/);
  assert.match(page, /快速開始/);
});

test("admin navigation is sticky on desktop and scrollable on mobile", () => {
  assert.match(css, /\.admin-workspace\s*\{[^}]*grid-template-columns:260px minmax\(0,1fr\)/s);
  assert.match(css, /\.admin-sidebar\s*\{[^}]*position:sticky/s);
  assert.match(css, /\.admin-nav\s*\{[^}]*display:flex;[^}]*overflow-x:auto/s);
});
