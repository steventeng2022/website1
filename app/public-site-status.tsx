"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import SiteUptime from "./site-uptime";

export default function PublicSiteStatus() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const en = searchParams.get("lang") === "en";
  const route = `${pathname}?${searchParams.toString()}`;
  const publicRoute = !!pathname && !pathname.startsWith("/admin") && !pathname.startsWith("/api");
  const [privacyRoute, setPrivacyRoute] = useState<string | null>(null);
  const privacyOpen = publicRoute && privacyRoute === route;
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // A layout survives client navigation. Forget the old dialog so Back does not reopen it.
  useEffect(() => { setPrivacyRoute(null); }, [route]);

  useEffect(() => {
    if (!privacyOpen) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setPrivacyRoute(null);
        return;
      }
      if (event.key !== "Tab") return;
      const controls = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), summary, [tabindex="0"]',
      ) ?? []).filter(element => element.getClientRects().length > 0);
      const first = controls[0];
      const last = controls.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && (document.activeElement === first || !dialogRef.current?.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialogRef.current?.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [privacyOpen]);

  if (!publicRoute) return null;

  return <>
    <section className="public-site-status" aria-label={en ? "Website status" : "網站狀態"}>
      <div><span className="status-dot" aria-hidden="true"/> <strong>{en ? "Website online" : "網站已上線"}</strong><small>{en ? "Since July 31, 2026" : "自 2026 年 7 月 31 日起"}</small></div>
      <SiteUptime compact en={en}/>
      <button type="button" aria-haspopup="dialog" onClick={() => setPrivacyRoute(route)}>{en ? "Privacy & data notice" : "隱私與資料告知"}</button>
    </section>

    {privacyOpen ? <div ref={dialogRef} className="privacy-consent" role="dialog" aria-modal="true" aria-labelledby="privacy-title">
      <div className="privacy-card">
        <p className="eyebrow">PRIVACY NOTICE</p>
        <h2 id="privacy-title">{en ? "Visitor data notice" : "訪客資料蒐集告知"}</h2>
        <p>{en ? "When you visit this website, technical data needed for site operations and traffic analysis is recorded automatically, without a separate consent window. The data is used only to manage and improve this website; it is not sold or used for advertising tracking." : "造訪本網站時，系統會自動記錄網站維運與流量分析所需的技術資料，不會另外顯示同意視窗。資料只供網站管理與改善使用，不會出售或用於廣告追蹤。"}</p>
        <details open><summary>{en ? "What is collected and how it is stored" : "蒐集項目與保存方式"}</summary><p>{en ? "IP address, anonymous visitor ID, page path, visit time, time spent in seconds, device type, browser, operating system, language, time zone, Cloudflare country code, referring domain, screen and viewport size ranges, light or dark mode, network type, and touch support. Records are kept for up to 90 days and can be viewed only by the administrator. Precise location, passwords, clipboard contents, and device fingerprints are not collected." : "IP 位址、匿名訪客代碼、頁面路徑、造訪時間、停留秒數、裝置類型、瀏覽器、作業系統、語言、時區、Cloudflare 國家代碼、來源網域、螢幕與視窗尺寸級距、深淺色模式、網路類型及觸控支援。紀錄最長保存 90 天，僅管理員可查看；不蒐集精確定位、密碼、剪貼簿或裝置指紋。"}</p></details>
        <p className="privacy-rights">{en ? "To request access to, correction of, cessation of use of, or deletion of your data, email " : "如需查詢、更正、停止利用或刪除與你有關的資料，請寄信至 "}<a href="mailto:steventeng2022@gmail.com">steventeng2022@gmail.com</a>{en ? "." : "。"}</p>
        <div><button type="button" className="privacy-accept" onClick={() => setPrivacyRoute(null)}>{en ? "Got it" : "我知道了"}</button></div>
        <button ref={closeRef} className="privacy-close" type="button" aria-label={en ? "Close privacy notice" : "關閉隱私告知"} onClick={() => setPrivacyRoute(null)}>×</button>
      </div>
    </div> : null}
  </>;
}
