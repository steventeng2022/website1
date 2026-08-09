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

export default function SiteUptime() {
  const [value, setValue] = useState(parts);
  useEffect(() => {
    const timer = window.setInterval(() => setValue(parts()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return <div className="uptime-clock" aria-label={`網站已上線 ${value.days} 天 ${value.hours} 小時 ${value.minutes} 分 ${value.seconds} 秒`}>
    <span><strong>{value.days}</strong><small>天</small></span>
    <span><strong>{String(value.hours).padStart(2,"0")}</strong><small>小時</small></span>
    <span><strong>{String(value.minutes).padStart(2,"0")}</strong><small>分鐘</small></span>
    <span><strong>{String(value.seconds).padStart(2,"0")}</strong><small>秒</small></span>
  </div>;
}
