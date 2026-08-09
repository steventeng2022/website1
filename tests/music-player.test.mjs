import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [layout, component, player, styles] = await Promise.all([
  readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/music-player.tsx", import.meta.url), "utf8"),
  readFile(new URL("../public/music-player.js", import.meta.url), "utf8"),
  readFile(new URL("../app/music-player.css", import.meta.url), "utf8"),
]);

test("global layout includes the floating music player", () => {
  assert.match(layout, /<MusicPlayer\s+tracks=/);
  assert.match(component, /id="site-music-player"/);
  assert.match(component, /src="\/music-player\.js"/);
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

test("no third-party demo audio ships with the site", () => {
  assert.doesNotMatch(component + player, /soundhelix|picsum\.photos/i);
});
