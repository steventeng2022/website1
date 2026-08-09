export type AnalyticsSummary = {
  totalViews: number;
  todayViews: number;
  uniqueVisitors: number;
  onlineNow: number;
  blogViews: number;
  daily: { day: string; views: number; visitors: number }[];
  popular: { path: string; blog_slug: string | null; views: number; visitors: number }[];
};

export type AdminLog = {
  id: number;
  admin_email: string;
  action: string;
  detail: string;
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
    d1.prepare(`CREATE TABLE IF NOT EXISTS site_visits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      visitor_hash TEXT NOT NULL,
      path TEXT NOT NULL,
      blog_slug TEXT,
      visited_at INTEGER NOT NULL,
      visit_day TEXT NOT NULL
    )`),
    d1.prepare(`CREATE TABLE IF NOT EXISTS online_sessions (
      visitor_hash TEXT PRIMARY KEY,
      path TEXT NOT NULL,
      last_seen INTEGER NOT NULL
    )`),
    d1.prepare(`CREATE TABLE IF NOT EXISTS admin_activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_email TEXT NOT NULL,
      action TEXT NOT NULL,
      detail TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL
    )`),
    d1.prepare("CREATE INDEX IF NOT EXISTS site_visits_time_idx ON site_visits(visited_at DESC)"),
    d1.prepare("CREATE INDEX IF NOT EXISTS site_visits_day_idx ON site_visits(visit_day, visitor_hash)"),
    d1.prepare("CREATE INDEX IF NOT EXISTS site_visits_blog_idx ON site_visits(blog_slug, visited_at DESC)"),
    d1.prepare("CREATE INDEX IF NOT EXISTS online_sessions_seen_idx ON online_sessions(last_seen DESC)"),
    d1.prepare("CREATE INDEX IF NOT EXISTS admin_activity_time_idx ON admin_activity_logs(created_at DESC)"),
  ]);
}

export async function recordVisit(visitorHash: string, path: string, pageview: boolean) {
  await ready();
  const now = Date.now();
  const safePath = path.split("?")[0].slice(0, 240) || "/";
  const match = /^\/blog\/([a-z0-9-]+)$/.exec(safePath);
  const d1 = db();
  const statements = [
    d1.prepare(`INSERT INTO online_sessions(visitor_hash,path,last_seen) VALUES(?,?,?)
      ON CONFLICT(visitor_hash) DO UPDATE SET path=excluded.path,last_seen=excluded.last_seen`)
      .bind(visitorHash, safePath, now),
    d1.prepare("DELETE FROM online_sessions WHERE last_seen < ?").bind(now - 24 * 60 * 60 * 1000),
  ];
  if (pageview) {
    const day = new Date(now).toISOString().slice(0, 10);
    statements.unshift(d1.prepare("INSERT INTO site_visits(visitor_hash,path,blog_slug,visited_at,visit_day) VALUES(?,?,?,?,?)")
      .bind(visitorHash, safePath, match?.[1] ?? null, now, day));
  }
  await d1.batch(statements);
}

export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  await ready();
  const d1 = db();
  const now = Date.now();
  const today = new Date(now).toISOString().slice(0, 10);
  const since = new Date(now - 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const [totals, todayRow, online, blog, daily, popular] = await Promise.all([
    d1.prepare("SELECT COUNT(*) AS views,COUNT(DISTINCT visitor_hash) AS visitors FROM site_visits").first<{views:number;visitors:number}>(),
    d1.prepare("SELECT COUNT(*) AS views FROM site_visits WHERE visit_day=?").bind(today).first<{views:number}>(),
    d1.prepare("SELECT COUNT(*) AS count FROM online_sessions WHERE last_seen>=?").bind(now - 2 * 60 * 1000).first<{count:number}>(),
    d1.prepare("SELECT COUNT(*) AS views FROM site_visits WHERE blog_slug IS NOT NULL").first<{views:number}>(),
    d1.prepare("SELECT visit_day AS day,COUNT(*) AS views,COUNT(DISTINCT visitor_hash) AS visitors FROM site_visits WHERE visit_day>=? GROUP BY visit_day ORDER BY visit_day").bind(since).all<{day:string;views:number;visitors:number}>(),
    d1.prepare("SELECT path,blog_slug,COUNT(*) AS views,COUNT(DISTINCT visitor_hash) AS visitors FROM site_visits GROUP BY path,blog_slug ORDER BY views DESC LIMIT 10").all<{path:string;blog_slug:string|null;views:number;visitors:number}>(),
  ]);
  return {
    totalViews: totals?.views ?? 0,
    todayViews: todayRow?.views ?? 0,
    uniqueVisitors: totals?.visitors ?? 0,
    onlineNow: online?.count ?? 0,
    blogViews: blog?.views ?? 0,
    daily: daily.results,
    popular: popular.results,
  };
}

export async function logAdminActivity(adminEmail: string, action: string, detail = "") {
  await ready();
  await db().prepare("INSERT INTO admin_activity_logs(admin_email,action,detail,created_at) VALUES(?,?,?,?)")
    .bind(adminEmail, action.slice(0, 80), detail.slice(0, 300), Date.now()).run();
}

export async function listAdminLogs(limit = 50) {
  await ready();
  return (await db().prepare("SELECT id,admin_email,action,detail,created_at FROM admin_activity_logs ORDER BY created_at DESC LIMIT ?")
    .bind(Math.min(Math.max(limit, 1), 100)).all<AdminLog>()).results;
}
