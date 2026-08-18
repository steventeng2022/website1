import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("homepage has a live Discord card with a safe default", async () => {
  const [home, card, route] = await Promise.all([
    read("app/page.tsx"), read("app/discord-status-card.tsx"), read("app/api/discord-status/route.ts"),
  ]);
  assert.match(home, /<DiscordStatusCard en=\{en\}/);
  assert.match(card, /setInterval\(load,30_000\)/);
  assert.match(route, /api\.lanyard\.rest\/v1\/users/);
  assert.match(route, /source: "default"/);
  assert.match(route, /activity\.type === 4/);
  assert.match(route, /listening_to_spotify/);
});

test("admin can configure Discord and bilingual fallback status", async () => {
  const [page, actions, database, migration] = await Promise.all([
    read("app/admin/page.tsx"), read("app/admin/actions.ts"), read("db/discord-status.ts"), read("drizzle/0013_add_discord_status.sql"),
  ]);
  assert.match(page, /Discord User ID/);
  assert.match(page, /defaultStatusZh/);
  assert.match(actions, /updateDiscordStatusAction/);
  assert.match(database, /discord_status_settings/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS discord_status_settings/);
});
