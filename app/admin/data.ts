import { listAllPosts } from "../../db/posts";
import { listFriends } from "../../db/friends";
import { listExperiences } from "../../db/experiences";
import { listTags } from "../../db/tags";
import { getSiteContent } from "../../db/site-content";
import { listAllMusicTracks, listSongRequests } from "../../db/music";
import { getAnalyticsSummary, listAdminLogs, listVisitorLogs } from "../../db/analytics";
import { getDiscordStatusSettings } from "../../db/discord-status";
import { getAdminOverview, getPendingSongRequestCount, listProjectPostOptions } from "../../db/admin";

export type AdminSection = "overview" | "analytics" | "visitors" | "presence" | "blog" | "portfolio" | "site" | "experience" | "music" | "friends";

// These reads contain mutable/private data. Deliberately fetch them per request;
// schema initialization may be deduplicated, but admin content is never cached.
export async function loadAdminData(section: AdminSection) {
  const [posts, projectPosts, friends, experiences, tags, content, musicTracks, songRequests, analytics, adminLogs, visitorLogs, discordSettings, overview, pendingRequests] = await Promise.all([
    section === "blog" ? listAllPosts() : [],
    section === "portfolio" ? listProjectPostOptions() : [],
    section === "friends" ? listFriends() : [],
    section === "experience" ? listExperiences() : [],
    section === "blog" ? listTags() : [],
    section === "site" || section === "portfolio" ? getSiteContent() : null,
    section === "music" ? listAllMusicTracks() : [],
    section === "music" ? listSongRequests() : [],
    section === "analytics" ? getAnalyticsSummary() : null,
    section === "analytics" ? listAdminLogs() : [],
    section === "visitors" ? listVisitorLogs() : [],
    section === "presence" || section === "overview" ? getDiscordStatusSettings() : null,
    section === "overview" ? getAdminOverview() : null,
    section !== "overview" && section !== "music" ? getPendingSongRequestCount() : 0,
  ]);
  const newRequests = overview?.newRequests ?? (section === "music" ? songRequests.filter(item => item.status === "new").length : pendingRequests);
  return { posts, projectPosts, friends, experiences, tags, content, musicTracks, songRequests, analytics, adminLogs, visitorLogs, discordSettings, overview, newRequests };
}
