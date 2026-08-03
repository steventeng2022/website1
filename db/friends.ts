export type FriendSite = {
  id: number;
  site_name: string;
  site_url: string;
  logo_url: string;
  description: string;
  created_at: number;
};

function db(): D1Database {
  const binding = (globalThis as typeof globalThis & { __STEVEN_SITE_ENV__?: { DB: D1Database } }).__STEVEN_SITE_ENV__?.DB;
  if (!binding) throw new Error("Database binding is unavailable");
  return binding;
}

async function ready() {
  await db().prepare(`CREATE TABLE IF NOT EXISTS friends (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_name TEXT NOT NULL,
    site_url TEXT NOT NULL,
    logo_url TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL
  )`).run();
  await db().prepare("CREATE INDEX IF NOT EXISTS friends_created_idx ON friends(created_at DESC)").run();
}

export async function listFriends() {
  await ready();
  return (await db().prepare("SELECT * FROM friends ORDER BY created_at DESC").all<FriendSite>()).results;
}

export async function createFriend(input: Omit<FriendSite, "id" | "created_at">) {
  await ready();
  await db().prepare("INSERT INTO friends (site_name, site_url, logo_url, description, created_at) VALUES (?, ?, ?, ?, ?)")
    .bind(input.site_name, input.site_url, input.logo_url, input.description, Date.now()).run();
}

export async function deleteFriend(id: number) {
  await ready();
  await db().prepare("DELETE FROM friends WHERE id = ?").bind(id).run();
}
