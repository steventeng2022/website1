import LanguageToggle from "../language-toggle";
import { listExperiences } from "../../db/experiences";

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
    <header className="site-header">
      <a className="brand" href={en ? "/?lang=en" : "/"}>STEVEN</a>
      <nav aria-label={en ? "Experience page navigation" : "經歷頁面導覽列"}>
        <a href={en ? "/?lang=en" : "/"}>{en ? "Home" : "首頁"}</a>
        <a className="active-nav" href={en ? "/experience?lang=en" : "/experience"}>{en ? "Experience" : "經歷"}</a>
        <a href={en ? "/friends?lang=en" : "/friends"}>Friends</a>
        <LanguageToggle />
      </nav>
    </header>

    <section className="experience-hero">
      <p className="eyebrow">{en ? "LEARNING · BUILDING · GROWING" : "學習 · 實作 · 成長"}</p>
      <h1>{en ? "Experience." : "我的經歷"}</h1>
      <p>{en ? "A timeline of projects, communities, events, and the things I learned along the way." : "依時間整理我參與的專案、社群與活動，以及一路上學到的事。"}</p>
    </section>

    <section className="experience-list" aria-label={en ? "Experience timeline" : "經歷時間軸"}>
      <div className="section-kicker"><span>01</span> {en ? "TIMELINE" : "時間軸"}</div>
      {experiences.length === 0 ? <div className="blog-empty"><p>{en ? "No experiences added yet." : "目前還沒有新增經歷。"}</p><span>{en ? "New milestones will appear here." : "新增後會依設定順序顯示在這裡。"}</span></div> : <div className="timeline">
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

    <footer className="friends-footer"><span>© 2026 STEVEN</span><a href={en ? "/?lang=en" : "/"}>{en ? "BACK HOME" : "回到首頁"} →</a></footer>
  </main>;
}
