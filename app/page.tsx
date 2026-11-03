import { listRecentPublishedPostSummaries } from "../db/posts";
import SiteHeader from "./site-header";
import HeroCharacterTabs from "./hero-character-tabs";
import { getSiteContent } from "../db/site-content";
import Link from "next/link";
import DiscordStatusCard from "./discord-status-card";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const { lang } = await searchParams;
  const en = lang === "en";
  const withLang = (path: string) => en ? `${path}${path.includes("?") ? "&" : "?"}lang=en` : path;
  const [posts, content] = await Promise.all([listRecentPublishedPostSummaries(3), getSiteContent()]);
  const { profile, projects, skills, contacts } = content;
  const featuredProjects = projects.filter((project) => project.featured).slice(0, 3);
  const homeProjects = featuredProjects.length > 0 ? featuredProjects : projects.slice(0, 3);
  return (
    <main className="home-shell">
      <SiteHeader en={en} active="home" />

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow hero-eyebrow"><span aria-hidden="true" />{en ? "A LITTLE CORNER OF MY WORLD" : "歡迎來到我的小小世界"}</p>
          <h1><span className="hero-greeting">{en ? "Hi, I’m" : "嗨，我是"}</span><br /><span className="hero-name">Steven<span className="hero-period">.</span></span></h1>
          <p className="intro">{en ? "I’m a high school student from Taiwan exploring programming, AI, Arduino, and Raspberry Pi." : "我是一名來自台灣的高中生，正在探索程式設計、AI、Arduino 與 Raspberry Pi。"}</p>
          <div className="hero-actions">
            <Link className="primary-button" href={en ? "/portfolio?lang=en" : "/portfolio"}>{en ? "View my work" : "查看我的作品"} <span aria-hidden="true">→</span></Link>
            <a className="text-link" href="#about">{en ? "More about me" : "進一步認識我"}</a>
          </div>
          <DiscordStatusCard en={en} />
        </div>
        <HeroCharacterTabs en={en} />
        <div className="hero-bottom"><p className="skill-line"><span>C++</span><i>·</i><span>PYTHON</span><i>·</i><span>ARDUINO</span><i>·</i><span>AI</span></p><a href="#about">{en ? "A little more about me" : "往下探索，認識更多的我"}<span aria-hidden="true">↓</span></a></div>
      </section>

      <section className="section about motion-reveal" id="about">
        <div className="section-kicker"><span>01</span> {en ? "ABOUT ME" : "關於我"}</div>
        <div className="about-grid">
          <h2 className="preserve-lines">{en ? profile.about_heading_en : profile.about_heading_zh}</h2>
          <div className="about-copy preserve-lines">{en ? profile.about_body_en : profile.about_body_zh}
            <div className="about-portfolio-callout"><strong>{projects.length}</strong><span>{en ? "projects and experiments collected so far" : "個目前整理完成的作品與實驗"}</span><Link href={en ? "/portfolio?lang=en" : "/portfolio"}>{en ? "OPEN PORTFOLIO" : "瀏覽完整作品集"} →</Link></div>
          </div>
        </div>
      </section>

      <section className="section projects motion-reveal" id="projects">
        <div className="section-kicker"><span>02</span> {en ? "SELECTED PROJECTS" : "精選作品"}</div>
        <div className="section-heading"><h2>{en ? <>Ideas, made<br /><em>real.</em></> : <>讓想法<br /><em>成為作品</em></>}</h2><p>{en ? "A few things I’ve been building, experimenting with, and learning along the way." : "把好奇心化為行動，記錄每一次實作、實驗與學習。"}</p></div>
        <div className="project-list">
          {homeProjects.map((project,index) => (
            <article className="project-card" key={project.id}>
              <div className={`project-preview project-preview-${index % 3}`}>
                {project.cover_image ? <img src={project.cover_image} alt={en ? project.title_en : project.title_zh} loading="lazy" decoding="async" /> : <><span className="project-preview-label">{project.tag}</span><span className="project-glyph" aria-hidden="true">{index % 3 === 0 ? "</>" : index % 3 === 1 ? "{ }" : "✳"}</span><span className="project-preview-caption">STEVEN / EXPLORATIONS</span></>}
                <span className="project-number">{String(index+1).padStart(2,"0")}</span>
              </div>
              <div className="project-copy">
                <p className="project-tag">{project.tag}</p>
                <h3>{en ? project.title_en : project.title_zh}</h3>
                <p>{en ? project.description_en : project.description_zh}</p>
              </div>
              <Link className="project-arrow" href={en ? "/portfolio?lang=en" : "/portfolio"} aria-label={en ? `View ${project.title_en} in portfolio` : `在作品集查看${project.title_zh}`}><span aria-hidden="true">↗</span></Link>
            </article>
          ))}
        </div>
        <Link className="archive-link" href={en ? "/portfolio?lang=en" : "/portfolio"}>{en ? "VIEW COMPLETE PORTFOLIO" : "查看完整作品集"} →</Link>
      </section>

      <section className="section skills motion-reveal" id="skills">
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

      <section className="section blog motion-reveal" id="blog">
        <div className="section-kicker"><span>04</span> {en ? "PERSONAL BLOG" : "個人部落格"}</div>
        <div className="blog-heading"><h2>{en ? <>Learning, one<br/><em>note at a time.</em></> : <>用文字記錄<br/><em>學習的軌跡</em></>}</h2><Link className="text-link" href={en ? "/blog?lang=en" : "/blog"}>{en ? "Explore the journal" : "翻開部落格"} ↗</Link></div>
        {posts.length === 0 ? <div className="blog-empty"><p>{en ? "No published posts yet." : "目前還沒有已發布的文章。"}</p><span>{en ? "The first story is being written." : "第一篇故事正在撰寫中。"}</span></div> : <><div className="blog-grid">{posts.map((post, index) => <article className="blog-card" key={post.id}><p className="project-tag">{String(index + 1).padStart(2,"0")} · {new Date(post.updated_at).toLocaleDateString(en ? "en-US" : "zh-TW", { year:"numeric", month:"short", day:"2-digit" })}{post.is_locked ? ` · ${en ? "LOCKED" : "密碼保護"}` : ""}</p><h3><Link href={withLang(`/blog/${post.slug}`)}>{post.title}</Link></h3>{post.tags.length > 0 && <div className="post-tags">{post.tags.map(tag => <Link key={tag.id} href={withLang(`/blog?tag=${encodeURIComponent(tag.slug)}`)}>#{tag.name}</Link>)}</div>}<p>{post.excerpt}</p><Link className="read-link" href={withLang(`/blog/${post.slug}`)}>{post.is_locked ? (en ? "UNLOCK POST" : "解鎖文章") : (en ? "READ POST" : "閱讀文章")} ↗</Link></article>)}</div><Link className="archive-link" href={en ? "/blog?lang=en" : "/blog"}>{en ? "VIEW ALL POSTS" : "查看所有舊文章"} →</Link></>}
      </section>

      <footer className="motion-reveal" id="contact">
        <p className="section-kicker"><span>05</span> {en ? "CONTACT" : "聯絡我"}</p>
        <div className="footer-grid">
          <h2 className="preserve-lines">{en ? profile.contact_heading_en : profile.contact_heading_zh}</h2>
          <div className="footer-note">
            <p>{en ? profile.contact_body_en : profile.contact_body_zh}</p>
            <div className="contact-links">{contacts.map(contact => contact.link_url ? <a key={contact.id} className="contact-line" href={contact.link_url} target={contact.link_url.startsWith("http") ? "_blank" : undefined} rel={contact.link_url.startsWith("http") ? "noopener noreferrer" : undefined}><strong>{contact.label}</strong> · {contact.value} <span aria-hidden="true">↗</span></a> : <span key={contact.id} className="contact-line"><strong>{contact.label}</strong> · {contact.value}</span>)}</div>
          </div>
        </div>
        <div className="footer-bottom"><span>© 2026 STEVEN <span className="footer-location"> · {en ? "MADE WITH CURIOSITY, IN TAIWAN" : "帶著好奇心，在台灣創作"}</span></span><div><Link href="/admin">{en ? "Owner sign in" : "站長登入"}</Link><a href="#top">{en ? "Back to top" : "回到頂端"} ↑</a></div></div>
      </footer>
    </main>
  );
}
