import { listPublishedPosts } from "../db/posts";

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
    title: "音控實作",
    description: "學習音響系統、麥克風、混音器與現場製作如何在舞台幕後協同運作。",
    tag: "音控 · 活動",
  },
  {
    number: "03",
    title: "創意程式實驗室",
    description: "透過 C++ 與 Python 小實驗，把課堂想法和程式題目變成真正能運作的作品。",
    tag: "C++ · PYTHON",
  },
];

const skills = [
  ["C++", "練習解題、演算法，以及撰寫高效率程式所需的基礎。"],
  ["Python", "快速製作原型、探索資料，並把想法變成實用工具。"],
  ["AI", "探索智慧系統如何學習、做出判斷，並協助創意工作。"],
  ["音控", "學習現場音訊、訊號流程、麥克風、混音器與活動團隊合作。"],
];

export default async function Home() {
  const posts = await listPublishedPosts();
  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Steven 首頁">STEVEN</a>
        <nav aria-label="主要導覽列">
          <a href="#about">關於我</a>
          <a href="#projects">作品</a>
          <a href="#skills">技能</a>
          <a href="#blog">部落格</a>
          <a href="#contact">聯絡我</a>
        </nav>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">台灣 · 學生 · 創作者</p>
          <h1>嗨，我是<br />Steven。</h1>
          <p className="intro">我是一名來自台灣的高中生，正在探索程式設計、AI、音控與創意科技。</p>
          <div className="hero-actions">
            <a className="primary-button" href="#projects">查看我的作品 <span aria-hidden="true">→</span></a>
            <a className="text-link" href="#about">進一步認識我</a>
          </div>
          <p className="skill-line"><span>C++</span><i>/</i><span>PYTHON</span><i>/</i><span>AI</span><i>/</i><span>SOUND CONTROL</span></p>
        </div>
        <div className="hero-photo">
          <img src="/flower.png" alt="Flower, a cheerful tiger character in front of a castle" />
          <span aria-hidden="true">FLOWER · STEVEN</span>
        </div>
      </section>

      <section className="section about" id="about">
        <div className="section-kicker"><span>01</span> 關於我</div>
        <div className="about-grid">
          <h2>保持好奇。<br />持續創作。</h2>
          <div className="about-copy">
            <p>我喜歡了解事物如何運作，從程式內部的邏輯，到現場活動幕後的音響系統。對我來說，科技最有趣的地方，就是能把一個想法變成大家看得到、聽得到或用得到的成果。</p>
            <p>目前我正在透過 C++ 與 Python 提升程式能力、探索 AI，並在學校音控與活動執行中累積實作經驗。</p>
          </div>
        </div>
      </section>

      <section className="section projects" id="projects">
        <div className="section-kicker"><span>02</span> 精選作品</div>
        <div className="project-list">
          {projects.map((project) => (
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
        <div className="section-kicker"><span>03</span> 技能與興趣</div>
        <h2>我現在正在學習的事。</h2>
        <div className="skill-grid">
          {skills.map(([name, description], index) => (
            <article key={name}>
              <p className="skill-index">0{index + 1}</p>
              <h3>{name}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section blog" id="blog">
        <div className="section-kicker"><span>04</span> 個人部落格</div>
        <div className="blog-heading"><h2>記錄學習與<br/>創作過程。</h2><a className="text-link" href="/admin">站長登入 →</a></div>
        {posts.length === 0 ? <div className="blog-empty"><p>目前還沒有已發布的文章。</p><span>第一篇故事正在撰寫中。</span></div> : <div className="blog-grid">{posts.map((post, index) => <article className="blog-card" key={post.id}><p className="project-tag">{String(index + 1).padStart(2,"0")} · {new Date(post.updated_at).toLocaleDateString("zh-TW", { year:"numeric", month:"short", day:"2-digit" })}</p><h3><a href={`/blog/${post.slug}`}>{post.title}</a></h3><p>{post.excerpt}</p><a className="read-link" href={`/blog/${post.slug}`}>閱讀文章 ↗</a></article>)}</div>}
      </section>

      <footer id="contact">
        <p className="section-kicker"><span>05</span> 聯絡我</p>
        <div className="footer-grid">
          <h2>一起完成<br />新的作品。</h2>
          <div className="footer-note">
            <p>我很樂意學習新事物、和大家合作，並嘗試新的專案。</p>
            <a href="mailto:hello@example.com">hello@example.com <span aria-hidden="true">↗</span></a>
            <small>公開網站前，請將這個 Email 改成你自己的信箱。</small>
          </div>
        </div>
        <div className="footer-bottom"><span>© 2026 STEVEN</span><a href="#top">回到頂端 ↑</a></div>
      </footer>
    </main>
  );
}
