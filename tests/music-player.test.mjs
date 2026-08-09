import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [layout, component, player, styles] = await Promise.all([
  readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/music-player.tsx", import.meta.url), "utf8"),
  readFile(new URL("../public/music-player-v27.js", import.meta.url), "utf8"),
  readFile(new URL("../app/music-player.css", import.meta.url), "utf8"),
]);

test("global layout includes the floating music player", () => {
  assert.match(layout, /<MusicPlayer\s+tracks=/);
  assert.match(component, /id="site-music-player"/);
  assert.match(component, /src="\/music-player-v27\.js"/);
});

test("toggle opens independently and player script initializes after loading",()=>{
  assert.match(component,/useState\(false\)/);
  assert.match(component,/onClick=\{\(\)=>setIsOpen\(open=>!open\)\}/);
  assert.match(component,/aria-expanded=\{isOpen\}/);
  assert.match(component,/onLoad=\{initialize\}/);
  assert.match(component,/onReady=\{initialize\}/);
  assert.doesNotMatch(player,/data-music-toggle.*addEventListener/);
});

test("player separates universal site tracks from visitor-local tracks", () => {
  assert.match(player, /constructor\(root, tracks = \[\]\)/);
  assert.match(player, /this\.tracks\.push\(track\)/);
  assert.match(player, /this\.siteTracks = tracks/);
  assert.match(player, /this\.userTracks = this\.readSavedTracks/);
  assert.match(player, /saveUserTracks\(\)/);
  assert.match(component, /data-site-tracks/);
  assert.match(player, /startSiteMusicPlayer/);
});

test("visitors can request a song without changing the universal playlist",()=>{
  assert.match(component,/推薦歌曲給我/);
  assert.match(component,/data-music-request-form/);
  assert.match(player,/fetch\("\/api\/song-requests"/);
  assert.match(player,/track\.origin === "user"/);
});

test("player includes complete controls and responsive styling", () => {
  for (const control of ["data-music-play", "data-music-prev", "data-music-next", "data-music-shuffle", "data-music-loop", "data-music-volume", "data-music-progress"]) {
    assert.ok(component.includes(control), `missing ${control}`);
  }
  assert.match(styles, /@media \(max-width: 520px\)/);
  assert.match(styles, /prefers-reduced-motion/);
});

test("player keeps running across client-side internal navigation", async () => {
  const pages = await Promise.all([
    "../app/page.tsx",
    "../app/portfolio/page.tsx",
    "../app/experience/page.tsx",
    "../app/friends/page.tsx",
    "../app/blog/page.tsx",
    "../app/language-toggle.tsx",
  ].map(path => readFile(new URL(path, import.meta.url), "utf8")));
  for (const page of pages) assert.match(page, /from "next\/link"/);
  assert.match(component, /src="\/music-default-cover\.svg"/);
  assert.match(player, /this\.cover\.addEventListener\("error"/);
  assert.match(player, /return "\/music-default-cover\.svg"/);
});

test("no third-party demo audio ships with the site", () => {
  assert.doesNotMatch(component + player, /soundhelix|picsum\.photos/i);
});
