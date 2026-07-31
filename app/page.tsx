import { listPublishedPosts } from "../db/posts";

export const dynamic = "force-dynamic";

const projects = [
  {
    number: "01",
    title: "Personal Intro Website",
    description: "A clean, responsive space designed to introduce who I am, what I learn, and what I want to build next.",
    tag: "WEB DESIGN",
  },
  {
    number: "02",
    title: "Sound Control Projects",
    description: "Learning how audio systems, microphones, mixers, and live production work together behind the stage.",
    tag: "AUDIO · EVENTS",
  },
  {
    number: "03",
    title: "Creative Coding Lab",
    description: "Small C++ and Python experiments that turn class ideas and programming challenges into working projects.",
    tag: "C++ · PYTHON",
  },
];

const skills = [
  ["C++", "Problem solving, algorithms, and the fundamentals behind efficient programs."],
  ["Python", "Rapid prototyping, data exploration, and turning ideas into useful tools."],
  ["AI", "Exploring how intelligent systems learn, make decisions, and support creative work."],
  ["Sound", "Live audio, signal flow, microphones, mixers, and the teamwork behind events."],
];

export default async function Home() {
  const posts = await listPublishedPosts();
  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Steven home">STEVEN</a>
        <nav aria-label="Main navigation">
          <a href="#about">About</a>
          <a href="#projects">Projects</a>
          <a href="#skills">Skills</a>
          <a href="#blog">Blog</a>
          <a href="#contact">Contact</a>
        </nav>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">TAIWAN · STUDENT · CREATOR</p>
          <h1>Hi, I’m<br />Steven.</h1>
          <p className="intro">I’m a Taiwanese high-school student exploring code, AI, sound, and creative technology.</p>
          <div className="hero-actions">
            <a className="primary-button" href="#projects">View my work <span aria-hidden="true">→</span></a>
            <a className="text-link" href="#about">More about me</a>
          </div>
          <p className="skill-line"><span>C++</span><i>/</i><span>PYTHON</span><i>/</i><span>AI</span><i>/</i><span>SOUND CONTROL</span></p>
        </div>
        <div className="hero-mark" aria-hidden="true"><span>ST</span></div>
      </section>

      <section className="section about" id="about">
        <div className="section-kicker"><span>01</span> About</div>
        <div className="about-grid">
          <h2>Curious by nature.<br />Always building.</h2>
          <div className="about-copy">
            <p>I enjoy learning how things work—from the logic inside a program to the audio system behind a live event. For me, technology is most exciting when it helps turn an idea into something people can see, hear, or use.</p>
            <p>I’m currently improving my programming through C++ and Python, exploring AI, and gaining hands-on experience with school sound control and event production.</p>
          </div>
        </div>
      </section>

      <section className="section projects" id="projects">
        <div className="section-kicker"><span>02</span> Selected projects</div>
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
        <div className="section-kicker"><span>03</span> Skills & interests</div>
        <h2>What I’m learning now.</h2>
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
        <div className="section-kicker"><span>04</span> Personal blog</div>
        <div className="blog-heading"><h2>Notes from<br/>the process.</h2><a className="text-link" href="/admin">Owner sign in →</a></div>
        {posts.length === 0 ? <div className="blog-empty"><p>No published posts yet.</p><span>The first story is being written.</span></div> : <div className="blog-grid">{posts.map((post, index) => <article className="blog-card" key={post.id}><p className="project-tag">{String(index + 1).padStart(2,"0")} · {new Date(post.updated_at).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" })}</p><h3><a href={`/blog/${post.slug}`}>{post.title}</a></h3><p>{post.excerpt}</p><a className="read-link" href={`/blog/${post.slug}`}>Read article ↗</a></article>)}</div>}
      </section>

      <footer id="contact">
        <p className="section-kicker"><span>05</span> Contact</p>
        <div className="footer-grid">
          <h2>Let’s create<br />something.</h2>
          <div className="footer-note">
            <p>I’m always open to learning, collaborating, and trying a new project.</p>
            <a href="mailto:hello@example.com">hello@example.com <span aria-hidden="true">↗</span></a>
            <small>Replace this email with your own before sharing.</small>
          </div>
        </div>
        <div className="footer-bottom"><span>© 2026 STEVEN</span><a href="#top">Back to top ↑</a></div>
      </footer>
    </main>
  );
}
