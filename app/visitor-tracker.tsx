"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
const PERSISTENT_VISITOR_KEY = "steven-site-anonymous-visitor";

function visitorId() {
  let id = localStorage.getItem(PERSISTENT_VISITOR_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(PERSISTENT_VISITOR_KEY, id);
  }
  return id;
}

function browserName() {
  const ua = navigator.userAgent;
  if (/Edg\//.test(ua)) return "Edge";
  if (/OPR\//.test(ua)) return "Opera";
  if (/Firefox\//.test(ua)) return "Firefox";
  if (/Chrome\//.test(ua)) return "Chrome";
  if (/Safari\//.test(ua)) return "Safari";
  return "Other";
}

function osName() {
  const ua = navigator.userAgent;
  if (/Windows/.test(ua)) return "Windows";
  if (/Android/.test(ua)) return "Android";
  if (/iPhone|iPad|iPod/.test(ua)) return "iOS / iPadOS";
  if (/Mac OS X/.test(ua)) return "macOS";
  if (/Linux/.test(ua)) return "Linux";
  return "Other";
}

function sizeBucket(width: number, height: number) {
  const rounded = (value: number) => Math.max(100, Math.round(value / 100) * 100);
  return `${rounded(width)}×${rounded(height)}`;
}

function technicalInfo() {
  const connection = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection;
  const referrerHost = (() => {
    try { return document.referrer ? new URL(document.referrer).hostname.slice(0, 120) : "Direct"; }
    catch { return "Unknown"; }
  })();
  const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  return {
    browser: browserName(), os: osName(), device: mobile ? "Mobile / Tablet" : "Desktop",
    language: navigator.language.slice(0, 24), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone.slice(0, 64),
    screenSize: sizeBucket(screen.width, screen.height), viewportSize: sizeBucket(innerWidth, innerHeight),
    colorScheme: matchMedia("(prefers-color-scheme: dark)").matches ? "Dark" : "Light",
    connection: connection?.effectiveType?.slice(0, 16) ?? "Unknown", touch: navigator.maxTouchPoints > 0,
    referrerHost,
  };
}

export default function VisitorTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin") || pathname.startsWith("/api")) return;
    let first = true;
    let visitId: number | null = null;
    let activeStarted = Date.now();
    let activeSeconds = 0;

    const ping = async () => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      activeSeconds += Math.max(0, Math.floor((now - activeStarted) / 1000));
      activeStarted = now;
      try {
        const response = await fetch("/api/analytics/ping", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            visitorId: visitorId(), path: pathname, pageview: first, visitId,
            durationSeconds: activeSeconds, info: technicalInfo(),
          }),
          keepalive: true,
        });
        const data = await response.json() as { visitId?: number | null };
        if (typeof data.visitId === "number") visitId = data.visitId;
      } catch { /* Analytics must never interrupt browsing. */ }
      first = false;
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") activeStarted = Date.now();
      void ping();
    };
    void ping();
    const timer = window.setInterval(() => void ping(), 30_000);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [pathname]);

  return null;
}
