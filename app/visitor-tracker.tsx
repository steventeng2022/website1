"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const VISITOR_KEY = "steven-site-anonymous-visitor";

function visitorId() {
  let id = localStorage.getItem(VISITOR_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(VISITOR_KEY, id);
  }
  return id;
}

export default function VisitorTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin") || pathname.startsWith("/api")) return;
    let first = true;
    const ping = () => {
      if (document.visibilityState !== "visible") return;
      fetch("/api/analytics/ping", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ visitorId: visitorId(), path: pathname, pageview: first }),
        keepalive: true,
      }).catch(() => undefined);
      first = false;
    };
    ping();
    const timer = window.setInterval(ping, 30_000);
    document.addEventListener("visibilitychange", ping);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", ping);
    };
  }, [pathname]);

  return null;
}
