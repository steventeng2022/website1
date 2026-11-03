"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import ThemeToggle from "./theme-toggle";

export default function RecoveryScreen({ missing = false }: { missing?: boolean }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const en = !pathname.startsWith("/admin") && params.get("lang") === "en";
  const home = en ? "/?lang=en" : "/";
  return <main className="recovery-shell">
    <header className="recovery-header">
      <Link className="premium-header__brand" href={home} aria-label={en ? "Steven — home" : "Steven — 首頁"}>STEVEN<span aria-hidden="true">.</span></Link>
      <ThemeToggle en={en} />
    </header>
    <section className="recovery-content" aria-labelledby="recovery-title">
      <div className="recovery-mark" aria-hidden="true"><span>{missing ? "404" : "↻"}</span><i /></div>
      <p className="eyebrow">{missing ? "A SMALL DETOUR" : "LET’S TRY THAT AGAIN"}</p>
      <h1 id="recovery-title">{missing ? (en ? "A little off the map." : "這一頁，暫時迷路了") : (en ? "This page needs another try." : "這一頁需要再試一次")}</h1>
      <p>{missing ? (en ? "This page may have moved, or the link may be incomplete. There’s still plenty to explore." : "這個頁面可能已搬家，或是連結不完整。其他作品與筆記，還在等你探索。") : (en ? "We couldn’t load this page. Try again, or return home and keep exploring." : "目前無法載入這個頁面。請再試一次，或回到首頁繼續探索。")}</p>
      <div className="recovery-actions">
        {!missing && <button className="primary-button" onClick={() => window.location.reload()}>{en ? "Try again" : "重新載入"} <span aria-hidden="true">↻</span></button>}
        <Link className={missing ? "primary-button" : "text-link"} href={home}>{en ? "Back home" : "回到首頁"} <span aria-hidden="true">→</span></Link>
        {missing && <Link className="text-link" href={en ? "/blog?lang=en" : "/blog"}>{en ? "Explore the journal" : "翻開部落格"} <span aria-hidden="true">↗</span></Link>}
      </div>
    </section>
    <footer className="recovery-footer">STEVEN · {en ? "STUDENT & CREATOR" : "學生與創作者"}</footer>
  </main>;
}
