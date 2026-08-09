"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import SiteUptime from "./site-uptime";

export default function PublicSiteStatus() {
  const pathname = usePathname();
  const [privacyOpen, setPrivacyOpen] = useState(false);

  if (!pathname || pathname.startsWith("/admin") || pathname.startsWith("/api")) return null;

  return <>
    <section className="public-site-status" aria-label="網站狀態">
      <div><span className="status-dot"/> <strong>網站已上線</strong><small>自 2026 年 7 月 31 日起</small></div>
      <SiteUptime compact/>
      <button type="button" onClick={() => setPrivacyOpen(true)}>隱私與資料告知</button>
    </section>

    {privacyOpen ? <div className="privacy-consent" role="dialog" aria-modal="true" aria-labelledby="privacy-title">
      <div className="privacy-card">
        <p className="eyebrow">PRIVACY NOTICE</p>
        <h2 id="privacy-title">訪客資料蒐集告知</h2>
        <p>造訪本網站時，系統會自動記錄網站維運與流量分析所需的技術資料，不會另外顯示同意視窗。資料只供網站管理與改善使用，不會出售或用於廣告追蹤。</p>
        <details open><summary>蒐集項目與保存方式</summary><p>IP 位址、匿名訪客代碼、頁面路徑、造訪時間、停留秒數、裝置類型、瀏覽器、作業系統、語言、時區、Cloudflare 國家代碼、來源網域、螢幕與視窗尺寸級距、深淺色模式、網路類型及觸控支援。紀錄最長保存 90 天，僅管理員可查看；不蒐集精確定位、密碼、剪貼簿或裝置指紋。</p></details>
        <p className="privacy-rights">如需查詢、更正、停止利用或刪除與你有關的資料，請寄信至 <a href="mailto:steventeng2022@gmail.com">steventeng2022@gmail.com</a>。</p>
        <div><button type="button" className="privacy-accept" onClick={() => setPrivacyOpen(false)}>我知道了</button></div>
        <button className="privacy-close" type="button" aria-label="關閉隱私告知" onClick={() => setPrivacyOpen(false)}>×</button>
      </div>
    </div> : null}
  </>;
}
