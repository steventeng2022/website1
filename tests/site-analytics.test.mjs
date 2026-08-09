import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("tracks anonymous page views and online heartbeats", async () => {
  const [tracker, route, analytics] = await Promise.all([
    read("app/visitor-tracker.tsx"),
    read("app/api/analytics/ping/route.ts"),
    read("db/analytics.ts"),
  ]);
  assert.match(tracker, /crypto\.randomUUID/);
  assert.match(tracker, /30_000/);
  assert.match(route, /SHA-256/);
  assert.doesNotMatch(route, /cf-connecting-ip|x-forwarded-for/i);
  assert.match(analytics, /COUNT\(DISTINCT visitor_hash\)/);
  assert.match(analytics, /last_seen>=\?/);
});

test("admin status includes visits, blog popularity, uptime, and activity logs", async () => {
  const [page, uptime, actions] = await Promise.all([
    read("app/admin/page.tsx"),
    read("app/admin/site-uptime.tsx"),
    read("app/admin/actions.ts"),
  ]);
  for (const label of ["網站狀態", "目前在線", "總瀏覽量", "Blog 閱讀", "熱門頁面", "管理員紀錄"]) {
    assert.match(page, new RegExp(label));
  }
  assert.match(uptime, /setInterval/);
  assert.match(uptime, /days.*hours.*minutes.*seconds/s);
  assert.match(actions, /logAdminActivity/);
});

test("analytics schema is durable and included in migration", async () => {
  const migration = await read("drizzle/0010_add_site_analytics.sql");
  for (const table of ["site_visits", "online_sessions", "admin_activity_logs"]) {
    assert.match(migration, new RegExp(table));
  }
});
