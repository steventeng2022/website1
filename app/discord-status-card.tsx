"use client";

import { useEffect, useState } from "react";

type Status = {
  source: "default" | "discord" | "spotify";
  presence: "online" | "idle" | "dnd" | "offline";
  labelZh: string;
  labelEn: string;
  textZh: string;
  textEn: string;
  detail: string;
  username: string;
  avatarUrl: string;
};

const initial: Status = {
  source:"default", presence:"offline", labelZh:"現在正在做什麼", labelEn:"What I’m doing now",
  textZh:"正在學習、寫程式與製作新作品", textEn:"Learning, coding, and building something new",
  detail:"", username:"Steven", avatarUrl:"",
};

export default function DiscordStatusCard({ en }: { en: boolean }) {
  const [status,setStatus] = useState(initial);
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch("/api/discord-status", { cache:"no-store" });
        if (response.ok && active) setStatus(await response.json());
      } catch { /* The configured fallback remains visible. */ }
    };
    void load();
    const timer = window.setInterval(load,30_000);
    return () => { active=false; window.clearInterval(timer); };
  },[]);
  const live = status.source !== "default";
  return <aside className={`discord-status-card ${live ? "is-live" : "is-default"}`} aria-live="polite">
    <div className="discord-status-identity">
      {status.avatarUrl ? <img src={status.avatarUrl} alt=""/> : <span className="discord-avatar-fallback" aria-hidden="true">S</span>}
      <i className={`discord-presence ${status.presence}`} aria-hidden="true"/>
    </div>
    <div className="discord-status-copy">
      <p><span>{live ? "DISCORD LIVE" : "DEFAULT STATUS"}</span> · {en ? status.labelEn : status.labelZh}</p>
      <strong>{en ? status.textEn : status.textZh}</strong>
      {status.detail && <small>{status.detail}</small>}
    </div>
    <span className="discord-mark" aria-hidden="true">DC</span>
  </aside>;
}
