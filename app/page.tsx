import { listPublishedPosts } from "../db/posts";
import LanguageToggle from "./language-toggle";
import HeroCharacterTabs from "./hero-character-tabs";

export const dynamic = "force-dynamic";

const projects = [
  {
    number: "01",
    title: "個人介紹網站",
    description: "以簡潔、響應式的版面介紹我是誰、正在學什麼，以及接下來想完成的作品。",
    tag: "網頁設計",
  },
  {
    number: "02",
    title: "Arduino 與 Raspberry Pi 實作",
    description: "使用感測器、微控制器與單板電腦製作自動化裝置，探索軟硬體整合。",
    tag: "ARDUINO · RASPBERRY PI",
  },
  {
    number: "03",
    title: "AI 學習實驗室",
    description: "探索機器學習、生成式 AI 與智慧應用，嘗試把模型整合到實用作品中。",
    tag: "ARTIFICIAL INTELLIGENCE",
  },
];

const skills = [
  ["C++", "練習解題、演算法，以及撰寫高效率程式所需的基礎。"],
  ["Python", "快速製作原型、探索資料，並把想法變成實用工具。"],
  ["AI", "探索智慧系統如何學習、做出判斷，並協助創意工作。"],
  ["Arduino", "使用感測器、電子元件與程式設計，打造互動式硬體作品。"],
  ["Raspberry Pi", "以 Linux 與 Python 製作自動化工具、伺服器及物聯網專案。"],
  ["AI 應用", "學習機器學習、生成式 AI，並將智慧功能整合到自己的作品。"],
];

const englishProjects = [
  { number: "01", title: "Personal Website", description: "A clean, responsive introduction to who I am, what I am learning, and what I want to create next.", tag: "WEB DESIGN" },
  { number: "02", title: "Arduino & Raspberry Pi Projects", description: "Building automated devices with sensors, microcontrollers, and single-board computers while exploring hardware-software integration.", tag: "ARDUINO · RASPBERRY PI" },
  { number: "03", title: "AI Learning Lab", description: "Exploring machine learning, generative AI, and practical ways to integrate intelligent features into useful projects.", tag: "ARTIFICIAL INTELLIGENCE" },
];

const englishSkills = [
  ["C++", "Building a foundation in problem solving, algorithms, and efficient programming."],
  ["Python", "Creating quick prototypes, exploring data, and turning ideas into useful tools."],
  ["AI", "Exploring how intelligent systems learn, make decisions, and support creative work."],
  ["Arduino", "Using sensors, electronic components, and code to build interactive hardware projects."],
  ["Raspberry Pi", "Creating automation tools, servers, and IoT projects with Linux and Python."],
  ["AI Applications", "Learning machine learning and generative AI while integrating intelligent features into personal projects."],
];

export default async function Home({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const { lang } = await searchParams;
  const en = lang === "en";
  const displayedProjects = en ? englishProjects : projects;
  const displayedSkills = en ? englishSkills : skills;
  const posts = await listPublishedPosts();
  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label={en ? "Steven home" : "Steven 首頁"}>STEVEN</a>
        <nav aria-label={en ? "Main navigation" : "主要導覽列"}>
          <a href="#about">{en ? "About" : "關於我"}</a>
          <a href="#projects">{en ? "Projects" : "作品"}</a>
          <a href="#skills">{en ? "Skills" : "技能"}</a>
          <a href={en ? "/experience?lang=en" : "/experience"}>{en ? "Experience" : "經歷"}</a>
          <a href="#blog">{en ? "Blog" : "部落格"}</a>
          <a href={en ? "/friends?lang=en" : "/friends"}>Friends</a>
          <a href="#contact">{en ? "Contact" : "聯絡我"}</a>
          <LanguageToggle />
        </nav>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">{en ? "TAIWAN · STUDENT · CREATOR" : "台灣 · 學生 · 創作者"}</p>
          <h1>{en ? <>Hi, I’m<br />Steven.</> : <>嗨，我是<br />Steven。</>}</h1>
          <p className="intro">{en ? "I’m a high school student from Taiwan exploring programming, AI, Arduino, and Raspberry Pi." : "我是一名來自台灣的高中生，正在探索程式設計、AI、Arduino 與 Raspberry Pi。"}</p>
          <div className="hero-actions">
            <a className="primary-button" href="#projects">{en ? "View my work" : "查看我的作品"} <span aria-hidden="true">→</span></a>
            <a className="text-link" href="#about">{en ? "More about me" : "進一步認識我"}</a>
          </div>
          <p className="skill-line"><span>C++</span><i>/</i><span>PYTHON</span><i>/</i><span>ARDUINO</span><i>/</i><span>AI</span></p>
        </div>
        <HeroCharacterTabs />
      </section>

      <section className="section about" id="about">
        <div className="section-kicker"><span>01</span> {en ? "ABOUT ME" : "關於我"}</div>
        <div className="about-grid">
          <h2>{en ? <>Stay curious.<br />Keep creating.</> : <>保持好奇。<br />持續創作。</>}</h2>
          <div className="about-copy">
            <p>{en ? "I enjoy learning how things work, from the logic inside software to the connection between sensors, hardware, and networks. Technology is most exciting to me when it turns an idea into something people can see or use." : "我喜歡了解事物如何運作，從程式內部的邏輯，到感測器、硬體與網路之間的連結。對我來說，科技最有趣的地方，就是能把想法變成大家看得到或用得到的成果。"}</p>
            <p>{en ? "Right now, I’m improving my programming through C++ and Python while exploring AI, Arduino, and Raspberry Pi." : "目前我正在透過 C++ 與 Python 提升程式能力，並探索 AI、Arduino 與 Raspberry Pi。"}</p>
          </div>
        </div>
      </section>

      <section className="section projects" id="projects">
        <div className="section-kicker"><span>02</span> {en ? "SELECTED PROJECTS" : "精選作品"}</div>
        <div className="project-list">
          {displayedProjects.map((project) => (
            <article className="project-card" key={project.number}>
              <span className="project-number">{project.number}</span>
              <div>
                <p className="project-tag">{project.tag}</p>
                <h3>{project.title}</h3>
                <p>{project.description}</p>
              </div>
              <span className="project-arrow" aria-hidden="true">↗</span>
            </article>
          ))}
        </div>
      </section>

      <section className="section skills" id="skills">
        <div className="section-kicker"><span>03</span> {en ? "SKILLS & INTERESTS" : "技能與興趣"}</div>
        <h2>{en ? "What I’m learning now." : "我現在正在學習的事。"}</h2>
        <div className="skill-grid">
          {displayedSkills.map(([name, description], index) => (
            <article key={name}>
              <p className="skill-index">0{index + 1}</p>
              <h3>{name}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section blog" id="blog">
        <div className="section-kicker"><span>04</span> {en ? "PERSONAL BLOG" : "個人部落格"}</div>
        <div className="blog-heading"><h2>{en ? <>Notes on learning<br/>and creating.</> : <>記錄學習與<br/>創作過程。</>}</h2><a className="text-link" href="/admin">{en ? "OWNER SIGN IN" : "站長登入"} →</a></div>
        {posts.length === 0 ? <div className="blog-empty"><p>{en ? "No published posts yet." : "目前還沒有已發布的文章。"}</p><span>{en ? "The first story is being written." : "第一篇故事正在撰寫中。"}</span></div> : <><div className="blog-grid">{posts.slice(0, 3).map((post, index) => <article className="blog-card" key={post.id}><p className="project-tag">{String(index + 1).padStart(2,"0")} · {new Date(post.updated_at).toLocaleDateString(en ? "en-US" : "zh-TW", { year:"numeric", month:"short", day:"2-digit" })}</p><h3><a href={`/blog/${post.slug}`}>{post.title}</a></h3>{post.tags.length > 0 && <div className="post-tags">{post.tags.map(tag => <a key={tag.id} href={`/blog?tag=${tag.slug}`}>#{tag.name}</a>)}</div>}<p>{post.excerpt}</p><a className="read-link" href={`/blog/${post.slug}`}>{en ? "READ POST" : "閱讀文章"} ↗</a></article>)}</div><a className="archive-link" href={en ? "/blog?lang=en" : "/blog"}>{en ? "VIEW ALL POSTS" : "查看所有舊文章"} →</a></>}
      </section>

      <footer id="contact">
        <p className="section-kicker"><span>05</span> {en ? "CONTACT" : "聯絡我"}</p>
        <div className="footer-grid">
          <h2>{en ? <>Let’s make<br />something new.</> : <>一起完成<br />新的作品。</>}</h2>
          <div className="footer-note">
            <p>{en ? "I’m always happy to learn, collaborate, and try a new project." : "我很樂意學習新事物、和大家合作，並嘗試新的專案。"}</p>
            <a href="mailto:steventeng2022@gmail.com">steventeng2022@gmail.com <span aria-hidden="true">↗</span></a>
            <span className="contact-line">DISCORD · steven0925</span>
          </div>
        </div>
        <div className="footer-bottom"><span>© 2026 STEVEN</span><a href="#top">{en ? "BACK TO TOP" : "回到頂端"} ↑</a></div>
      </footer>
    </main>
  );
}
