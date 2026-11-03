"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import LanguageToggle from "./language-toggle";

type Page = "home" | "portfolio" | "experience" | "blog" | "friends";

export default function SiteHeader({ en, active = "home" }: { en: boolean; active?: Page }) {
  const [open, setOpen] = useState(false);
  const header = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const query = useSearchParams().toString();
  const home = en ? "/?lang=en" : "/";
  const route = (path: string) => en ? `${path}?lang=en` : path;
  const anchor = (id: string) => active === "home" ? `#${id}` : `${home}#${id}`;
  const SectionLink = active === "home" ? "a" : Link;

  useEffect(() => { setOpen(false); }, [pathname, query]);
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        toggle.current?.focus();
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !header.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  return (
    <header
      className="premium-header"
      ref={header}
      data-open={open}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}
    >
      <a className="premium-header__skip" href={active === "home" ? "#top" : "#main-content"} onClick={() => setOpen(false)}>{en ? "Skip to content" : "跳至主要內容"}</a>
      <noscript><style>{`@media (max-width:1100px){.premium-header .premium-header__toggle{display:none}.premium-header .premium-header__inner{flex-wrap:wrap;padding-bottom:16px}.premium-header .premium-header__nav{position:static;flex-basis:100%;visibility:visible;opacity:1;transform:none;max-height:none;box-shadow:none}}`}</style></noscript>
      <div className="premium-header__inner">
        <Link className="premium-header__brand" href={home} onClick={() => setOpen(false)} aria-label={en ? "Steven — home" : "Steven — 首頁"}>
          STEVEN<span aria-hidden="true">.</span>
        </Link>
        <div className="premium-header__mobile-controls">
          <LanguageToggle />
          <button
            className="premium-header__toggle"
            type="button"
            ref={toggle}
            aria-expanded={open}
            aria-controls="site-navigation"
            aria-label={open ? (en ? "Close navigation" : "關閉導覽選單") : (en ? "Open navigation" : "開啟導覽選單")}
            onClick={() => setOpen((value) => !value)}
          >
            <span aria-hidden="true" />
            <span aria-hidden="true" />
          </button>
        </div>
        <nav
          id="site-navigation"
          className="premium-header__nav"
          aria-label={en ? "Main navigation" : "主要導覽列"}
          onClick={(event) => { if ((event.target as Element).closest("a")) setOpen(false); }}
        >
          <SectionLink href={anchor("about")}>{en ? "About" : "關於我"}</SectionLink>
          <Link href={route("/portfolio")} aria-current={active === "portfolio" ? "page" : undefined}>{en ? "Portfolio" : "作品集"}</Link>
          <SectionLink href={anchor("skills")}>{en ? "Skills" : "技能"}</SectionLink>
          <Link href={route("/experience")} aria-current={active === "experience" ? "page" : undefined}>{en ? "Experience" : "經歷"}</Link>
          <Link href={route("/blog")} aria-current={active === "blog" ? "page" : undefined}>{en ? "Blog" : "部落格"}</Link>
          <Link href={route("/friends")} aria-current={active === "friends" ? "page" : undefined}>{en ? "Friends" : "朋友們"}</Link>
          <SectionLink className="premium-header__contact" href={anchor("contact")}>{en ? "Let’s talk" : "聊聊吧"}<span aria-hidden="true">↗</span></SectionLink>
          <div className="premium-header__language"><LanguageToggle /></div>
        </nav>
      </div>
    </header>
  );
}
