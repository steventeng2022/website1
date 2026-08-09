import { listPublishedPosts } from "../db/posts";
import LanguageToggle from "./language-toggle";
import HeroCharacterTabs from "./hero-character-tabs";
import { getSiteContent } from "../db/site-content";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const { lang } = await searchParams;
  const en = lang === "en";
  const [posts, content] = await Promise.all([listPublishedPosts(), getSiteContent()]);
  const { profile, projects, skills, contacts } = content;
  const featuredProjects = projects.filter((project) => project.featured).slice(0, 3);
  const homeProjects = featuredProjects.length > 0 ? featuredProjects : projects.slice(0, 3);
  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label={en ? "Steven home" : "Steven 首頁"}>STEVEN</a>
        <nav aria-label={en ? "Main navigation" : "主要導覽列"}>
          <a href="#about">{en ? "About" : "關於我"}</a>
          <Link href={en ? "/portfolio?lang=en" : "/portfolio"}>{en ? "Portfolio" : "作品集"}</Link>
          <a href="#skills">{en ? "Skills" : "技能"}</a>
          <Link href={en ? "/experience?lang=en" : "/experience"}>{en ? "Experience" : "經歷"}</Link>
          <a href="#blog">{en ? "Blog" : "部落格"}</a>
          <Link href={en ? "/friends?lang=en" : "/friends"}>Friends</Link>
          <a href="#contact">{en ? "Contact" : "聯絡我"}</a>
          <LanguageToggle />
        </nav>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">{en ? "TAIWAN · STUDENT · CREATOR" : "台灣 · 學生 · 創作者"}</p>
          <h1>{en ? <>Hi, I’m<br />Steven.</> : <>嗨，我是<br />Steven</>}</h1>
          <p className="intro">{en ? "I’m a high school student from Taiwan exploring programming, AI, Arduino, and Raspberry Pi." : "我是一名來自台灣的高中生，正在探索程式設計、AI、Arduino 與 Raspberry Pi。"}</p>
          <div className="hero-actions">
            <Link className="primary-button" href={en ? "/portfolio?lang=en" : "/portfolio"}>{en ? "View my work" : "查看我的作品"} <span aria-hidden="true">→</span></Link>
            <a className="text-link" href="#about">{en ? "More about me" : "進一步認識我"}</a>
          </div>
          <p className="skill-line"><span>C++</span><i>/</i><span>PYTHON</span><i>/</i><span>ARDUINO</span><i>/</i><span>AI</span></p>
        </div>
        <HeroCharacterTabs />
      </section>

      <section className="section about" id="about">
        <div className="section-kicker"><span>01</span> {en ? "ABOUT ME" : "關於我"}</div>
        <div className="about-grid">
          <h2 className="preserve-lines">{en ? profile.about_heading_en : profile.about_heading_zh}</h2>
          <div className="about-copy preserve-lines">{en ? profile.about_body_en : profile.about_body_zh}
            <div className="about-portfolio-callout"><strong>{projects.length}</strong><span>{en ? "projects and experiments collected so far" : "個目前整理完成的作品與實驗"}</span><Link href={en ? "/portfolio?lang=en" : "/portfolio"}>{en ? "OPEN PORTFOLIO" : "瀏覽完整作品集"} →</Link></div>
          </div>
        </div>
      </section>

      <section className="section projects" id="projects">
        <div className="section-kicker"><span>02</span> {en ? "SELECTED PROJECTS" : "精選作品"}</div>
        <div className="project-list">
          {homeProjects.map((project,index) => (
            <article className="project-card" key={project.id}>
              <span className="project-number">{String(index+1).padStart(2,"0")}</span>
              <div>
                <p className="project-tag">{project.tag}</p>
                <h3>{en ? project.title_en : project.title_zh}</h3>
                <p>{en ? project.description_en : project.description_zh}</p>
              </div>
              <Link className="project-arrow" href={en ? "/portfolio?lang=en" : "/portfolio"} aria-label={en ? `View ${project.title_en} in portfolio` : `在作品集查看${project.title_zh}`}>↗</Link>
            </article>
          ))}
        </div>
        <Link className="archive-link" href={en ? "/portfolio?lang=en" : "/portfolio"}>{en ? "VIEW COMPLETE PORTFOLIO" : "查看完整作品集"} →</Link>
      </section>

      <section className="section skills" id="skills">
        <div className="section-kicker"><span>03</span> {en ? "SKILLS & INTERESTS" : "技能與興趣"}</div>
        <h2>{en ? profile.skills_heading_en : profile.skills_heading_zh}</h2>
        <div className="skill-grid">
          {skills.map((skill, index) => (
            <article key={skill.id}>
              <p className="skill-index">{String(index + 1).padStart(2,"0")}</p>
              <h3>{en ? skill.name_en : skill.name_zh}</h3>
              <p>{en ? skill.description_en : skill.description_zh}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section blog" id="blog">
        <div className="section-kicker"><span>04</span> {en ? "PERSONAL BLOG" : "個人部落格"}</div>
        <div className="blog-heading"><h2>{en ? <>Notes on learning<br/>and creating.</> : <>記錄學習與<br/>創作過程</>}</h2><Link className="text-link" href="/admin">{en ? "OWNER SIGN IN" : "站長登入"} →</Link></div>
        {posts.length === 0 ? <div className="blog-empty"><p>{en ? "No published posts yet." : "目前還沒有已發布的文章。"}</p><span>{en ? "The first story is being written." : "第一篇故事正在撰寫中。"}</span></div> : <><div className="blog-grid">{posts.slice(0, 3).map((post, index) => <article className="blog-card" key={post.id}><p className="project-tag">{String(index + 1).padStart(2,"0")} · {new Date(post.updated_at).toLocaleDateString(en ? "en-US" : "zh-TW", { year:"numeric", month:"short", day:"2-digit" })}{post.is_locked ? ` · ${en ? "LOCKED" : "密碼保護"}` : ""}</p><h3><Link href={`/blog/${post.slug}`}>{post.title}</Link></h3>{post.tags.length > 0 && <div className="post-tags">{post.tags.map(tag => <Link key={tag.id} href={`/blog?tag=${tag.slug}`}>#{tag.name}</Link>)}</div>}<p>{post.excerpt}</p><Link className="read-link" href={`/blog/${post.slug}`}>{post.is_locked ? (en ? "UNLOCK POST" : "解鎖文章") : (en ? "READ POST" : "閱讀文章")} ↗</Link></article>)}</div><Link className="archive-link" href={en ? "/blog?lang=en" : "/blog"}>{en ? "VIEW ALL POSTS" : "查看所有舊文章"} →</Link></>}
      </section>

      <footer id="contact">
        <p className="section-kicker"><span>05</span> {en ? "CONTACT" : "聯絡我"}</p>
        <div className="footer-grid">
          <h2 className="preserve-lines">{en ? profile.contact_heading_en : profile.contact_heading_zh}</h2>
          <div className="footer-note">
            <p>{en ? profile.contact_body_en : profile.contact_body_zh}</p>
            <div className="contact-links">{contacts.map(contact => contact.link_url ? <a key={contact.id} className="contact-line" href={contact.link_url} target={contact.link_url.startsWith("http") ? "_blank" : undefined} rel={contact.link_url.startsWith("http") ? "noopener noreferrer" : undefined}><strong>{contact.label}</strong> · {contact.value} <span aria-hidden="true">↗</span></a> : <span key={contact.id} className="contact-line"><strong>{contact.label}</strong> · {contact.value}</span>)}</div>
          </div>
        </div>
        <div className="footer-bottom"><span>© 2026 STEVEN</span><a href="#top">{en ? "BACK TO TOP" : "回到頂端"} ↑</a></div>
      </footer>
    </main>
  );
}
