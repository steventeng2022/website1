import SiteHeader from "../site-header";
import { listExperiences } from "../../db/experiences";
import Link from "next/link";

export const dynamic = "force-dynamic";

function formatMonth(value: string, en: boolean) {
  const [year, month] = value.split("-").map(Number);
  if (!year || !month) return value;
  return new Intl.DateTimeFormat(en ? "en-US" : "zh-TW", { year: "numeric", month: en ? "short" : "long", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export default async function ExperiencePage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const { lang } = await searchParams;
  const en = lang === "en";
  const experiences = await listExperiences();

  return <main className="experience-shell">
    <SiteHeader en={en} active="experience" />

    <section className="experience-hero page-intro" id="main-content">
      <div className="page-heading-meta"><p className="eyebrow">{en ? "LEARNING · BUILDING · GROWING" : "學習 · 實作 · 成長"}</p><span className="page-index">02 / EXPERIENCE</span></div>
      <h1>{en ? "Experience." : "我的經歷"}</h1>
      <div className="page-intro-footer"><p>{en ? "Every experience leaves something behind. The projects, communities, and moments that shape the way I learn and create." : "每段經歷，都留下一點養分。記錄參與過的專案、社群與活動，以及它們如何改變我學習與創作的方式。"}</p><span className="page-index">{en ? "AN ONGOING JOURNEY" : "持續累積的旅程"} ↘</span></div>
    </section>

    <section className="experience-list" aria-label={en ? "Experience timeline" : "經歷時間軸"}>
      <div className="section-kicker"><span>01</span> {en ? "TIMELINE" : "時間軸"}</div>
      {experiences.length === 0 ? <div className="blog-empty"><p>{en ? "The journey is still being written." : "旅程，還在持續書寫。"}</p><span>{en ? "New milestones will find a home here." : "新的里程碑，會慢慢收藏在這裡。"}</span></div> : <div className="timeline">
        {experiences.map((experience, index) => <article className="timeline-item" key={experience.id}>
          <div className="timeline-marker"><span>{String(index + 1).padStart(2, "0")}</span></div>
          <div className="timeline-date">
            <time dateTime={experience.start_date}>{formatMonth(experience.start_date, en)}</time>
            <span>—</span>
            {experience.end_date ? <time dateTime={experience.end_date}>{formatMonth(experience.end_date, en)}</time> : <span>{en ? "Present" : "至今"}</span>}
          </div>
          <div className="timeline-content">
            <p className="project-tag">{[experience.organization, experience.location].filter(Boolean).join(" · ") || (en ? "EXPERIENCE" : "經歷")}</p>
            <h2>{experience.title}</h2>
            <p>{experience.description}</p>
            {experience.link_url && <a className="read-link" href={experience.link_url} target="_blank" rel="noopener noreferrer">{en ? "VIEW RELATED LINK" : "查看相關連結"} ↗</a>}
          </div>
        </article>)}
      </div>}
    </section>

    <footer className="friends-footer"><span>© 2026 STEVEN</span><Link href={en ? "/?lang=en" : "/"}>{en ? "BACK HOME" : "回到首頁"} →</Link></footer>
  </main>;
}
