"use client";

import { useEffect, useState } from "react";

const LAUNCHED_AT = Date.parse("2026-07-31T00:00:00+08:00");

function parts() {
  let seconds = Math.max(0, Math.floor((Date.now() - LAUNCHED_AT) / 1000));
  const days = Math.floor(seconds / 86400); seconds %= 86400;
  const hours = Math.floor(seconds / 3600); seconds %= 3600;
  const minutes = Math.floor(seconds / 60); seconds %= 60;
  return { days, hours, minutes, seconds };
}

export default function SiteUptime({ compact = false, en = false }: { compact?: boolean; en?: boolean }) {
  // The server and first client render must agree, even across a second boundary.
  const [value, setValue] = useState<ReturnType<typeof parts> | null>(null);
  useEffect(() => {
    setValue(parts());
    const timer = window.setInterval(() => setValue(parts()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const label = value
    ? (en ? `Website online for ${value.days} days, ${value.hours} hours, ${value.minutes} minutes, ${value.seconds} seconds` : `網站已上線 ${value.days} 天 ${value.hours} 小時 ${value.minutes} 分 ${value.seconds} 秒`)
    : (en ? "Loading website uptime" : "正在載入網站上線時間");
  return <div className={`uptime-clock${compact ? " compact" : ""}`} role="timer" aria-label={label}>
    <span><strong>{value ? value.days : "—"}</strong><small>{en ? "days" : "天"}</small></span>
    <span><strong>{value ? String(value.hours).padStart(2,"0") : "—"}</strong><small>{en ? "hours" : "小時"}</small></span>
    <span><strong>{value ? String(value.minutes).padStart(2,"0") : "—"}</strong><small>{en ? "minutes" : "分鐘"}</small></span>
    <span><strong>{value ? String(value.seconds).padStart(2,"0") : "—"}</strong><small>{en ? "seconds" : "秒"}</small></span>
  </div>;
}
