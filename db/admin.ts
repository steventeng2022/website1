import { ensurePostsReady } from "./posts";
import { ensureMusicReady } from "./music";
import { ensureSiteContentReady } from "./site-content";
import { ensureExperiencesReady } from "./experiences";
import { ensureFriendsReady } from "./friends";
import { ensureAnalyticsReady } from "./analytics";

function db(): D1Database {
  const binding = (globalThis as typeof globalThis & { __STEVEN_SITE_ENV__?: { DB: D1Database } }).__STEVEN_SITE_ENV__?.DB;
  if (!binding) throw new Error("Database binding is unavailable");
  return binding;
}

export type AdminOverview = {
  posts: number; drafts: number; projects: number; featured: number;
  experiences: number; tracks: number; skills: number; contacts: number;
  friends: number; newRequests: number; totalViews: number; onlineNow: number;
};

// Navigation needs one number, not every song request's title and message.
export async function getPendingSongRequestCount() {
  await ensureMusicReady();
  const row = await db().prepare("SELECT COUNT(*) AS count FROM song_requests WHERE status='new'").first<{ count: number }>();
  return row?.count ?? 0;
}

// The overview displays counts, so do not fetch post bodies, galleries, password
// records, visitor details, or the analytics charts just to populate its cards.
export async function getAdminOverview(): Promise<AdminOverview> {
  await Promise.all([
    ensurePostsReady(), ensureMusicReady(), ensureSiteContentReady(),
    ensureExperiencesReady(), ensureFriendsReady(), ensureAnalyticsReady(),
  ]);
  const row = await db().prepare(`SELECT
    (SELECT COUNT(*) FROM posts) AS posts,
    (SELECT COUNT(*) FROM posts WHERE status='draft') AS drafts,
    (SELECT COUNT(*) FROM portfolio_projects) AS projects,
    (SELECT COUNT(*) FROM portfolio_projects WHERE featured<>0) AS featured,
    (SELECT COUNT(*) FROM experiences) AS experiences,
    (SELECT COUNT(*) FROM music_tracks) AS tracks,
    (SELECT COUNT(*) FROM portfolio_skills) AS skills,
    (SELECT COUNT(*) FROM contact_links) AS contacts,
    (SELECT COUNT(*) FROM friends) AS friends,
    (SELECT COUNT(*) FROM song_requests WHERE status='new') AS newRequests,
    (SELECT COUNT(*) FROM site_visits) AS totalViews,
    (SELECT COUNT(*) FROM online_sessions WHERE last_seen>=?) AS onlineNow`)
    .bind(Date.now() - 120000).first<AdminOverview>();
  return row ?? { posts: 0, drafts: 0, projects: 0, featured: 0, experiences: 0, tracks: 0, skills: 0, contacts: 0, friends: 0, newRequests: 0, totalViews: 0, onlineNow: 0 };
}

export type ProjectPostOption = { id: number; title: string; slug: string; status: "published" | "draft" };

export async function listProjectPostOptions() {
  await ensurePostsReady();
  return (await db().prepare("SELECT id,title,slug,status FROM posts ORDER BY updated_at DESC").all<ProjectPostOption>()).results;
}
