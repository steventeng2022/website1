import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

async function executeModule(path, dependencies, globals = {}) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  const sandbox = { exports: {}, require: (name) => dependencies(name), ...globals };
  vm.createContext(sandbox);
  vm.runInContext(compiled, sandbox);
  return sandbox.exports;
}

const values = {
  listAllPosts: [{ id: 1, content: "private body" }], listProjectPostOptions: [{ id: 1, title: "Published", slug: "published", status: "published" }],
  listFriends: [{ id: 2 }], listExperiences: [{ id: 3 }], listTags: [{ id: 4 }],
  getSiteContent: { projects: [], skills: [], contacts: [], profile: {} },
  listAllMusicTracks: [{ id: 5 }], listSongRequests: [{ status: "new" }, { status: "reviewed" }],
  getAnalyticsSummary: { totalViews: 50 }, listAdminLogs: [{ id: 6 }], listVisitorLogs: [{ id: 7, ip_address: "private" }],
  getDiscordStatusSettings: { discord_user_id: "123" }, getAdminOverview: { posts: 5, newRequests: 9 }, getPendingSongRequestCount: 9,
};

async function loader({ deferred = false } = {}) {
  const calls = [];
  const releases = [];
  const services = Object.fromEntries(Object.entries(values).map(([name, value]) => [name, async () => {
    calls.push(name);
    if (deferred) await new Promise(resolve => releases.push(resolve));
    return value;
  }]));
  const module = await executeModule("../app/admin/data.ts", () => services);
  return { load: module.loadAdminData, calls, releases };
}

test("each admin section fetches only its content and the small navigation badge", async () => {
  const expected = {
    overview: ["getDiscordStatusSettings", "getAdminOverview"],
    presence: ["getDiscordStatusSettings", "getPendingSongRequestCount"],
    friends: ["listFriends", "getPendingSongRequestCount"],
    experience: ["listExperiences", "getPendingSongRequestCount"],
    site: ["getSiteContent", "getPendingSongRequestCount"],
    visitors: ["listVisitorLogs", "getPendingSongRequestCount"],
    analytics: ["getAnalyticsSummary", "listAdminLogs", "getPendingSongRequestCount"],
    blog: ["listAllPosts", "listTags", "getPendingSongRequestCount"],
    portfolio: ["listProjectPostOptions", "getSiteContent", "getPendingSongRequestCount"],
    music: ["listAllMusicTracks", "listSongRequests"],
  };
  for (const [section, names] of Object.entries(expected)) {
    const { load, calls } = await loader();
    const data = await load(section);
    assert.deepEqual(calls, names, section);
    assert.equal(data.newRequests, section === "music" ? 1 : 9);
    if (section !== "blog") assert.equal(data.posts.length, 0, "unopened post bodies should not be loaded");
    if (section !== "visitors") assert.equal(data.visitorLogs.length, 0, "visitor details should remain unloaded");
    if (section === "blog") assert.equal(data.posts[0].content, "private body");
  }
});

test("independent reads start together and mutable content is fetched again on navigation", async () => {
  const { load, calls, releases } = await loader({ deferred: true });
  const first = load("blog");
  assert.deepEqual(calls, ["listAllPosts", "listTags", "getPendingSongRequestCount"]);
  releases.splice(0).forEach(resolve => resolve());
  await first;
  const second = load("blog");
  assert.equal(calls.length, 6);
  releases.splice(0).forEach(resolve => resolve());
  await second;
});

test("the admin page authenticates before any private section data is requested", async () => {
  let reads = 0;
  const page = await executeModule("../app/admin/page.tsx", name => {
    if (name === "../cloudflare-auth") return { requireAdmin: async () => { throw new Error("Not authorized"); } };
    if (name === "./data") return { loadAdminData: async () => { reads++; } };
    return {};
  });
  await assert.rejects(page.default({ searchParams: Promise.resolve({ section: "blog" }) }), /Not authorized/);
  assert.equal(reads, 0);
});

test("dashboard and project selectors use aggregate or narrow SQL instead of full records", async () => {
  const queries = [];
  const ready = [];
  const aliases = Object.fromEntries(["ensurePostsReady", "ensureMusicReady", "ensureSiteContentReady", "ensureExperiencesReady", "ensureFriendsReady", "ensureAnalyticsReady"].map(name => [name, async () => { ready.push(name); }]));
  const database = { prepare(sql) {
    queries.push(sql);
    return { bind() { return this; }, async first() { return { count: 4 }; }, async all() { return { results: [] }; } };
  } };
  const module = await executeModule("../db/admin.ts", () => aliases, { __STEVEN_SITE_ENV__: { DB: database } });
  assert.equal(await module.getPendingSongRequestCount(), 4);
  assert.match(queries.pop(), /COUNT\(\*\).*song_requests WHERE status='new'/);
  await module.getAdminOverview();
  const overview = queries.pop();
  assert.match(overview, /COUNT\(\*\).*posts/s);
  assert.doesNotMatch(overview, /SELECT \*|visitor_profiles|password|gallery|GROUP BY/i);
  assert.equal(new Set(ready).size, 6);
  await module.listProjectPostOptions();
  assert.match(queries.pop(), /SELECT id,title,slug,status FROM posts/);
});
