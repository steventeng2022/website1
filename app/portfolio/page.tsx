import LanguageToggle from "../language-toggle";
import { getSiteContent } from "../../db/site-content";
import Link from "next/link";

export const dynamic = "force-dynamic";

function tags(value: string) {
  return value.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean);
}

export default async function PortfolioPage({ searchParams }: { searchParams: Promise<{ lang?: string; category?: string }> }) {
  const { lang, category = "" } = await searchParams;
  const en = lang === "en";
  const { projects } = await getSiteContent();
  const categories = [...new Set(projects.map((project) => project.tag).filter(Boolean))];
  const visible = category ? projects.filter((project) => project.tag === category) : projects;
  const withLang = (path: string) => en ? `${path}${path.includes("?") ? "&" : "?"}lang=en` : path;

  return <main className="portfolio-shell">
    <header className="site-header">
      <Link className="brand" href={withLang("/")}>STEVEN</Link>
      <nav aria-label={en ? "Main navigation" : "主要導覽列"}>
        <Link href={withLang("/")}>{en ? "Home" : "首頁"}</Link>
        <Link className="active-nav" href={withLang("/portfolio")}>{en ? "Portfolio" : "作品集"}</Link>
        <Link href={withLang("/experience")}>{en ? "Experience" : "經歷"}</Link>
        <Link href={withLang("/blog")}>{en ? "Blog" : "部落格"}</Link>
        <LanguageToggle />
      </nav>
    </header>

    <section className="portfolio-hero">
      <p className="eyebrow">{en ? "PROJECTS · BUILDS · EXPERIMENTS" : "專案 · 實作 · 學習實驗"}</p>
      <h1>{en ? "Things I’ve\nbuilt." : "我完成的\n作品"}</h1>
      <div className="portfolio-hero-bottom"><p>{en ? "A growing collection of websites, software, AI explorations, and hardware projects. Some include a longer blog post about the process." : "這裡整理了我做過的網站、程式、AI 探索與硬體實作；部分作品也附有完整 Blog 記錄。"}</p><strong>{String(projects.length).padStart(2,"0")}</strong></div>
    </section>

    <section className="portfolio-index">
      <div className="portfolio-toolbar">
        <p className="section-kicker"><span>01</span> {en ? "ALL WORK" : "所有作品"}</p>
        <div className="portfolio-filters" aria-label={en ? "Project categories" : "作品分類"}>
          <Link className={!category ? "active" : ""} href={withLang("/portfolio")}>{en ? "ALL" : "全部"}</Link>
          {categories.map((item) => <Link className={category === item ? "active" : ""} key={item} href={withLang(`/portfolio?category=${encodeURIComponent(item)}`)}>{item}</Link>)}
        </div>
      </div>

      {visible.length === 0 ? <div className="portfolio-empty">{en ? "No projects in this category yet." : "這個分類目前還沒有作品。"}</div> : <div className="portfolio-grid">
        {visible.map((project, index) => {
          const destination = project.link_url || project.github_url || (project.blog_slug ? `/blog/${project.blog_slug}` : "");
          const external = destination.startsWith("http://") || destination.startsWith("https://");
          const projectTags = [...new Set([project.tag, ...tags(project.technologies)].filter(Boolean))];
          const title = en ? project.title_en : project.title_zh;

          return <article className={`portfolio-card${destination ? " has-link" : ""}`} key={project.id}>
            <div className="portfolio-media">{project.cover_image ? <img src={project.cover_image} alt={en ? `${title} project preview` : `${title}作品預覽`}/> : <div className="portfolio-placeholder"><span>{String(index + 1).padStart(2,"0")}</span><strong>{project.tag}</strong></div>}{project.featured ? <span className="featured-badge">{en ? "FEATURED" : "精選"}</span> : null}</div>
            <div className="portfolio-card-copy">
              <div className="portfolio-meta">{project.completed_at ? <time>{project.completed_at.replace("-", ".")}</time> : <span>{String(index + 1).padStart(2,"0")}</span>}</div>
              <h2>{title}</h2>
              <p>{en ? project.description_en : project.description_zh}</p>
              <div className="portfolio-card-bottom">
                {destination ? <span className="portfolio-open-label">{en ? "OPEN PROJECT" : "開啟作品"} <span aria-hidden="true">↗</span></span> : null}
                {projectTags.length > 0 ? <div className="technology-list" aria-label={en ? "Project tags" : "作品標籤"}>{projectTags.map((technology) => <span key={technology}>{technology}</span>)}</div> : null}
              </div>
            </div>
            {destination ? external ? <a className="portfolio-card-link" href={destination} target="_blank" rel="noopener noreferrer" aria-label={`${en ? "Open" : "開啟"} ${title}`}><span className="sr-only">{en ? `Open ${title}` : `開啟${title}`}</span></a> : <Link className="portfolio-card-link" href={destination} aria-label={`${en ? "Open" : "開啟"} ${title}`}><span className="sr-only">{en ? `Open ${title}` : `開啟${title}`}</span></Link> : null}
          </article>;
        })}
      </div>}
    </section>

    <footer className="portfolio-footer"><p>{en ? "Want the story behind the projects?" : "想看作品背後的學習過程？"}</p><Link href={withLang("/blog")}>{en ? "VISIT THE BLOG" : "前往 Blog"} →</Link></footer>
  </main>;
}
