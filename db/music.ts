export type MusicTrack = {
  id: number;
  title: string;
  artist: string;
  audio_url: string;
  cover_url: string | null;
  enabled: number;
  sort_order: number;
  created_at: number;
};

export type SongRequest = {
  id: number;
  title: string;
  artist: string;
  link_url: string | null;
  message: string;
  status: "new" | "reviewed";
  created_at: number;
};

function db(): D1Database {
  const binding = (globalThis as typeof globalThis & { __STEVEN_SITE_ENV__?: { DB: D1Database } }).__STEVEN_SITE_ENV__?.DB;
  if (!binding) throw new Error("Database binding is unavailable");
  return binding;
}

async function ready() {
  const d1 = db();
  await d1.batch([
    d1.prepare(`CREATE TABLE IF NOT EXISTS music_tracks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      artist TEXT NOT NULL,
      audio_url TEXT NOT NULL,
      cover_url TEXT,
      enabled INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    )`),
    d1.prepare(`CREATE TABLE IF NOT EXISTS song_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      artist TEXT NOT NULL,
      link_url TEXT,
      message TEXT NOT NULL DEFAULT '',
      requester_hash TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'new',
      created_at INTEGER NOT NULL
    )`),
    d1.prepare("CREATE INDEX IF NOT EXISTS music_tracks_sort_idx ON music_tracks(enabled, sort_order, id)"),
    d1.prepare("CREATE INDEX IF NOT EXISTS song_requests_requester_idx ON song_requests(requester_hash, created_at)"),
  ]);
}

export async function listPublicMusicTracks() {
  await ready();
  return (await db().prepare("SELECT * FROM music_tracks WHERE enabled=1 ORDER BY sort_order ASC,id ASC").all<MusicTrack>()).results;
}

export async function listAllMusicTracks() {
  await ready();
  return (await db().prepare("SELECT * FROM music_tracks ORDER BY sort_order ASC,id ASC").all<MusicTrack>()).results;
}

export async function createMusicTrack(input: Omit<MusicTrack, "id" | "created_at">) {
  await ready();
  await db().prepare("INSERT INTO music_tracks(title,artist,audio_url,cover_url,enabled,sort_order,created_at) VALUES(?,?,?,?,?,?,?)")
    .bind(input.title,input.artist,input.audio_url,input.cover_url,input.enabled,input.sort_order,Date.now()).run();
}

export async function updateMusicTrack(id:number,input:Omit<MusicTrack,"id"|"created_at">) {
  await ready();
  const result = await db().prepare("UPDATE music_tracks SET title=?,artist=?,audio_url=?,cover_url=?,enabled=?,sort_order=? WHERE id=?")
    .bind(input.title,input.artist,input.audio_url,input.cover_url,input.enabled,input.sort_order,id).run();
  if (!result.meta.changes) throw new Error("找不到要編輯的歌曲");
}

export async function deleteMusicTrack(id:number) {
  await ready();
  const track = await db().prepare("SELECT * FROM music_tracks WHERE id=?").bind(id).first<MusicTrack>();
  if (!track) throw new Error("找不到要刪除的歌曲");
  await db().prepare("DELETE FROM music_tracks WHERE id=?").bind(id).run();
  return track;
}

export async function moveMusicTrack(id:number,direction:"up"|"down") {
  await ready();
  const d1 = db();
  const items = (await d1.prepare("SELECT id FROM music_tracks ORDER BY sort_order ASC,id ASC").all<{id:number}>()).results;
  const index = items.findIndex((item)=>item.id===id);
  const target = direction === "up" ? index-1 : index+1;
  if (index<0 || target<0 || target>=items.length) return;
  [items[index],items[target]]=[items[target],items[index]];
  await d1.batch(items.map((item,order)=>d1.prepare("UPDATE music_tracks SET sort_order=? WHERE id=?").bind(order,item.id)));
}

export async function createSongRequest(input:{title:string;artist:string;link_url:string|null;message:string;requester_hash:string}) {
  await ready();
  const since = Date.now()-24*60*60*1000;
  const count = await db().prepare("SELECT count(*) AS count FROM song_requests WHERE requester_hash=? AND created_at>=?").bind(input.requester_hash,since).first<{count:number}>();
  if ((count?.count ?? 0)>=5) throw new Error("今天已送出多次推薦，請明天再試");
  await db().prepare("INSERT INTO song_requests(title,artist,link_url,message,requester_hash,status,created_at) VALUES(?,?,?,?,?,'new',?)")
    .bind(input.title,input.artist,input.link_url,input.message,input.requester_hash,Date.now()).run();
}

export async function listSongRequests() {
  await ready();
  return (await db().prepare("SELECT id,title,artist,link_url,message,status,created_at FROM song_requests ORDER BY CASE status WHEN 'new' THEN 0 ELSE 1 END,created_at DESC").all<SongRequest>()).results;
}

export async function setSongRequestStatus(id:number,status:"new"|"reviewed") {
  await ready();
  await db().prepare("UPDATE song_requests SET status=? WHERE id=?").bind(status,id).run();
}

export async function deleteSongRequest(id:number) {
  await ready();
  await db().prepare("DELETE FROM song_requests WHERE id=?").bind(id).run();
}
