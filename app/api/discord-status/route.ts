import { getDiscordStatusSettings } from "../../../db/discord-status";

export const dynamic = "force-dynamic";

type LanyardActivity = {
  name?: string;
  type?: number;
  state?: string;
  details?: string;
  emoji?: { name?: string };
};

type LanyardData = {
  discord_status?: "online" | "idle" | "dnd" | "offline";
  discord_user?: { username?: string; global_name?: string; avatar?: string; id?: string };
  activities?: LanyardActivity[];
  listening_to_spotify?: boolean;
  spotify?: { song?: string; artist?: string; album_art_url?: string };
};

function fallback(settings: Awaited<ReturnType<typeof getDiscordStatusSettings>>) {
  return {
    source: "default" as const,
    presence: "offline",
    labelZh: "現在正在做什麼",
    labelEn: "What I’m doing now",
    textZh: settings.default_status_zh,
    textEn: settings.default_status_en,
    detail: "",
    username: "Steven",
    avatarUrl: "",
  };
}

export async function GET() {
  const settings = await getDiscordStatusSettings();
  const defaultStatus = fallback(settings);
  if (!settings.discord_user_id) return Response.json(defaultStatus, { headers: { "cache-control": "public, max-age=30" } });

  try {
    const response = await fetch(`https://api.lanyard.rest/v1/users/${settings.discord_user_id}`, {
      headers: { accept: "application/json" },
      cf: { cacheTtl: 20, cacheEverything: true },
    } as RequestInit & { cf: { cacheTtl: number; cacheEverything: boolean } });
    if (!response.ok) return Response.json(defaultStatus);
    const body = await response.json() as { success?: boolean; data?: LanyardData };
    const data = body.success ? body.data : undefined;
    if (!data || data.discord_status === "offline") return Response.json(defaultStatus);

    const custom = data.activities?.find(activity => activity.type === 4 && activity.state?.trim());
    const activity = data.activities?.find(activity => activity.type === 0 && activity.name && activity.name !== "Custom Status");
    const username = data.discord_user?.global_name || data.discord_user?.username || "Steven";
    const avatarUrl = data.discord_user?.id && data.discord_user.avatar
      ? `https://cdn.discordapp.com/avatars/${data.discord_user.id}/${data.discord_user.avatar}.png?size=128`
      : "";

    if (custom?.state) {
      const emoji = custom.emoji?.name ? `${custom.emoji.name} ` : "";
      return Response.json({ ...defaultStatus, source:"discord", presence:data.discord_status, textZh:`${emoji}${custom.state}`, textEn:`${emoji}${custom.state}`, username, avatarUrl });
    }
    if (settings.show_spotify && data.listening_to_spotify && data.spotify?.song) {
      return Response.json({ ...defaultStatus, source:"spotify", presence:data.discord_status, labelZh:"正在聽", labelEn:"Listening to", textZh:data.spotify.song, textEn:data.spotify.song, detail:data.spotify.artist || "Spotify", username, avatarUrl:data.spotify.album_art_url || avatarUrl });
    }
    if (settings.show_activities && activity?.name) {
      const detail = [activity.details, activity.state].filter(Boolean).join(" · ");
      return Response.json({ ...defaultStatus, source:"discord", presence:data.discord_status, labelZh:"正在進行", labelEn:"Currently doing", textZh:activity.name, textEn:activity.name, detail, username, avatarUrl });
    }
    return Response.json({ ...defaultStatus, presence:data.discord_status, username, avatarUrl });
  } catch {
    return Response.json(defaultStatus);
  }
}
