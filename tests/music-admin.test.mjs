import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read=(path)=>readFile(new URL(`../${path}`,import.meta.url),"utf8");

test("admin can manage universal songs and uploaded audio",async()=>{
  const [page,actions,database,worker]=await Promise.all([read("app/admin/page.tsx"),read("app/admin/actions.ts"),read("db/music.ts"),read("worker/index.ts")]);
  for(const action of ["createMusicTrackAction","updateMusicTrackAction","deleteMusicTrackAction","moveMusicTrackAction"])assert.match(page,new RegExp(action));
  assert.match(actions,/\/media\\\/music/);
  assert.match(database,/CREATE TABLE IF NOT EXISTS music_tracks/);
  assert.match(worker,/url\.pathname === "\/admin\/music-media"/);
  assert.match(worker,/env\.BUCKET\.put\(key, request\.body/);
  assert.match(worker,/accept-ranges/);
});

test("song requests are durable, rate-limited, and manageable",async()=>{
  const [route,database,page]=await Promise.all([read("app/api/song-requests/route.ts"),read("db/music.ts"),read("app/admin/page.tsx")]);
  assert.match(route,/createSongRequest/);
  assert.match(database,/CREATE TABLE IF NOT EXISTS song_requests/);
  assert.match(database,/count\(\*\) AS count/);
  assert.match(page,/歌曲推薦收件匣/);
  assert.match(page,/setSongRequestStatusAction/);
  assert.match(page,/deleteSongRequestAction/);
});
