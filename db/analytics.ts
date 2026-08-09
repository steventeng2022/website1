export type AnalyticsSummary = {
  totalViews: number; todayViews: number; uniqueVisitors: number; onlineNow: number; blogViews: number;
  daily: { day: string; views: number; visitors: number }[];
  popular: { path: string; blog_slug: string | null; views: number; visitors: number }[];
};

export type VisitorInfo = {
  ipAddress: string; browser?: string; os?: string; device?: string; language?: string;
  timezone?: string; country?: string; screenSize?: string; viewportSize?: string; colorScheme?: string;
  connection?: string; touch?: boolean; referrerHost?: string;
};

export type VisitorLog = {
  id: number; visitor_hash: string; path: string; blog_slug: string | null; visited_at: number; duration_seconds: number;
  ip_address: string | null;
  consent_level: string; browser: string | null; os: string | null; device: string | null; language: string | null;
  timezone: string | null; country: string | null; screen_size: string | null; viewport_size: string | null;
  color_scheme: string | null; connection_type: string | null; touch_enabled: number | null; referrer_host: string | null;
};

export type AdminLog = { id: number; admin_email: string; action: string; detail: string; created_at: number };

function db(): D1Database {
  const binding = (globalThis as typeof globalThis & { __STEVEN_SITE_ENV__?: { DB: D1Database } }).__STEVEN_SITE_ENV__?.DB;
  if (!binding) throw new Error("Database binding is unavailable");
  return binding;
}

async function ready() {
  const d1 = db();
  await d1.batch([
    d1.prepare(`CREATE TABLE IF NOT EXISTS site_visits (id INTEGER PRIMARY KEY AUTOINCREMENT,visitor_hash TEXT NOT NULL,path TEXT NOT NULL,blog_slug TEXT,visited_at INTEGER NOT NULL,visit_day TEXT NOT NULL,duration_seconds INTEGER NOT NULL DEFAULT 0)`),
    d1.prepare(`CREATE TABLE IF NOT EXISTS online_sessions (visitor_hash TEXT PRIMARY KEY,path TEXT NOT NULL,last_seen INTEGER NOT NULL)`),
    d1.prepare(`CREATE TABLE IF NOT EXISTS admin_activity_logs (id INTEGER PRIMARY KEY AUTOINCREMENT,admin_email TEXT NOT NULL,action TEXT NOT NULL,detail TEXT NOT NULL DEFAULT '',created_at INTEGER NOT NULL)`),
    d1.prepare(`CREATE TABLE IF NOT EXISTS visitor_profiles (
      visitor_hash TEXT PRIMARY KEY,consent_level TEXT NOT NULL DEFAULT 'essential',first_seen INTEGER NOT NULL,last_seen INTEGER NOT NULL,
      browser TEXT,os TEXT,device TEXT,language TEXT,timezone TEXT,country TEXT,screen_size TEXT,viewport_size TEXT,
      color_scheme TEXT,connection_type TEXT,touch_enabled INTEGER,referrer_host TEXT
    )`),
    d1.prepare("CREATE INDEX IF NOT EXISTS site_visits_time_idx ON site_visits(visited_at DESC)"),
    d1.prepare("CREATE INDEX IF NOT EXISTS site_visits_day_idx ON site_visits(visit_day, visitor_hash)"),
    d1.prepare("CREATE INDEX IF NOT EXISTS site_visits_blog_idx ON site_visits(blog_slug, visited_at DESC)"),
    d1.prepare("CREATE INDEX IF NOT EXISTS online_sessions_seen_idx ON online_sessions(last_seen DESC)"),
    d1.prepare("CREATE INDEX IF NOT EXISTS admin_activity_time_idx ON admin_activity_logs(created_at DESC)"),
    d1.prepare("CREATE INDEX IF NOT EXISTS visitor_profiles_seen_idx ON visitor_profiles(last_seen DESC)"),
  ]);
  const columns = (await d1.prepare("PRAGMA table_info(site_visits)").all<{name:string}>()).results;
  if (!columns.some(column => column.name === "duration_seconds")) {
    await d1.prepare("ALTER TABLE site_visits ADD COLUMN duration_seconds INTEGER NOT NULL DEFAULT 0").run();
  }
  if (!columns.some(column => column.name === "ip_address")) {
    await d1.prepare("ALTER TABLE site_visits ADD COLUMN ip_address TEXT").run();
  }
}

const clean = (value: string | undefined, max: number) => value ? value.replace(/[\u0000-\u001f\u007f]/g, "").slice(0, max) : null;

export async function recordVisit(visitorHash: string, path: string, pageview: boolean, visitId: number | null, durationSeconds: number, info: VisitorInfo) {
  await ready();
  const now = Date.now();
  const safePath = path.split("?")[0].slice(0, 240) || "/";
  const match = /^\/blog\/([a-z0-9-]+)$/.exec(safePath);
  const d1 = db();
  const retentionStart = now - 90 * 24 * 60 * 60 * 1000;
  await d1.batch([
    d1.prepare(`INSERT INTO online_sessions(visitor_hash,path,last_seen) VALUES(?,?,?) ON CONFLICT(visitor_hash) DO UPDATE SET path=excluded.path,last_seen=excluded.last_seen`).bind(visitorHash, safePath, now),
    d1.prepare(`INSERT INTO visitor_profiles(visitor_hash,consent_level,first_seen,last_seen,browser,os,device,language,timezone,country,screen_size,viewport_size,color_scheme,connection_type,touch_enabled,referrer_host)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(visitor_hash) DO UPDATE SET consent_level=excluded.consent_level,last_seen=excluded.last_seen,
      browser=excluded.browser,os=excluded.os,device=excluded.device,language=excluded.language,timezone=excluded.timezone,country=excluded.country,
      screen_size=excluded.screen_size,viewport_size=excluded.viewport_size,color_scheme=excluded.color_scheme,connection_type=excluded.connection_type,
      touch_enabled=excluded.touch_enabled,referrer_host=excluded.referrer_host`).bind(
        visitorHash, "automatic", now, now, clean(info.browser,32), clean(info.os,32),
        clean(info.device,32), clean(info.language,24), clean(info.timezone,64),
        clean(info.country,8), clean(info.screenSize,24), clean(info.viewportSize,24),
        clean(info.colorScheme,16), clean(info.connection,16), Number(Boolean(info.touch)),
        clean(info.referrerHost,120)),
    d1.prepare("DELETE FROM online_sessions WHERE last_seen < ?").bind(now - 24 * 60 * 60 * 1000),
    d1.prepare("DELETE FROM site_visits WHERE visited_at < ?").bind(retentionStart),
    d1.prepare("DELETE FROM visitor_profiles WHERE last_seen < ?").bind(retentionStart),
  ]);

  if (pageview) {
    const day = new Date(now).toISOString().slice(0, 10);
    const result = await d1.prepare("INSERT INTO site_visits(visitor_hash,path,blog_slug,visited_at,visit_day,duration_seconds,ip_address) VALUES(?,?,?,?,?,0,?)")
      .bind(visitorHash, safePath, match?.[1] ?? null, now, day, clean(info.ipAddress,64)).run();
    return Number(result.meta.last_row_id || 0) || null;
  }
  if (visitId && Number.isInteger(visitId)) {
    await d1.prepare("UPDATE site_visits SET duration_seconds=? WHERE id=? AND visitor_hash=?")
      .bind(Math.min(Math.max(Math.floor(durationSeconds), 0), 21600), visitId, visitorHash).run();
  }
  return visitId;
}

export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  await ready();
  const d1 = db(); const now = Date.now(); const today = new Date(now).toISOString().slice(0,10);
  const since = new Date(now - 6*86400000).toISOString().slice(0,10);
  const [totals,todayRow,online,blog,daily,popular] = await Promise.all([
    d1.prepare("SELECT COUNT(*) AS views,COUNT(DISTINCT visitor_hash) AS visitors FROM site_visits").first<{views:number;visitors:number}>(),
    d1.prepare("SELECT COUNT(*) AS views FROM site_visits WHERE visit_day=?").bind(today).first<{views:number}>(),
    d1.prepare("SELECT COUNT(*) AS count FROM online_sessions WHERE last_seen>=?").bind(now-120000).first<{count:number}>(),
    d1.prepare("SELECT COUNT(*) AS views FROM site_visits WHERE blog_slug IS NOT NULL").first<{views:number}>(),
    d1.prepare("SELECT visit_day AS day,COUNT(*) AS views,COUNT(DISTINCT visitor_hash) AS visitors FROM site_visits WHERE visit_day>=? GROUP BY visit_day ORDER BY visit_day").bind(since).all<{day:string;views:number;visitors:number}>(),
    d1.prepare("SELECT path,blog_slug,COUNT(*) AS views,COUNT(DISTINCT visitor_hash) AS visitors FROM site_visits GROUP BY path,blog_slug ORDER BY views DESC LIMIT 10").all<{path:string;blog_slug:string|null;views:number;visitors:number}>(),
  ]);
  return {totalViews:totals?.views??0,todayViews:todayRow?.views??0,uniqueVisitors:totals?.visitors??0,onlineNow:online?.count??0,blogViews:blog?.views??0,daily:daily.results,popular:popular.results};
}

export async function listVisitorLogs(limit = 100) {
  await ready();
  return (await db().prepare(`SELECT v.id,v.visitor_hash,v.path,v.blog_slug,v.visited_at,v.duration_seconds,v.ip_address,p.consent_level,p.browser,p.os,p.device,p.language,p.timezone,p.country,p.screen_size,p.viewport_size,p.color_scheme,p.connection_type,p.touch_enabled,p.referrer_host
    FROM site_visits v LEFT JOIN visitor_profiles p ON p.visitor_hash=v.visitor_hash ORDER BY v.visited_at DESC LIMIT ?`)
    .bind(Math.min(Math.max(limit,1),250)).all<VisitorLog>()).results;
}

export async function logAdminActivity(adminEmail:string,action:string,detail="") { await ready(); await db().prepare("INSERT INTO admin_activity_logs(admin_email,action,detail,created_at) VALUES(?,?,?,?)").bind(adminEmail,action.slice(0,80),detail.slice(0,300),Date.now()).run(); }
export async function listAdminLogs(limit=50) { await ready(); return (await db().prepare("SELECT id,admin_email,action,detail,created_at FROM admin_activity_logs ORDER BY created_at DESC LIMIT ?").bind(Math.min(Math.max(limit,1),100)).all<AdminLog>()).results; }
