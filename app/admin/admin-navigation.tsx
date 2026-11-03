"use client";

import Link, { useLinkStatus } from "next/link";

type Section = { id: string; label: string; hint: string };

function NavigationLabel({ section, count }: { section: Section; count?: number }) {
  const { pending } = useLinkStatus();
  return <span className="admin-nav-item" data-pending={pending} aria-busy={pending}>
    <span className="admin-nav-label">{section.label}</span>
    <small aria-live="polite">{pending ? "載入中…" : section.hint}</small>
    {pending ? <i className="admin-nav-spinner" aria-hidden="true" /> : count ? <b>{count}</b> : null}
  </span>;
}

export default function AdminNavigation({ sections, activeSection, newRequests }: {
  sections: Section[]; activeSection: string; newRequests: number;
}) {
  return <nav className="admin-nav" aria-label="管理區域">
    {sections.map(section => <Link
      key={section.id}
      href={`/admin?section=${section.id}`}
      prefetch={false}
      className={activeSection === section.id ? "active" : ""}
      aria-current={activeSection === section.id ? "page" : undefined}
    ><NavigationLabel section={section} count={section.id === "music" ? newRequests : undefined} /></Link>)}
  </nav>;
}
