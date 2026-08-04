export type SiteProfile = {
  id: number;
  about_heading_zh: string;
  about_heading_en: string;
  about_body_zh: string;
  about_body_en: string;
  skills_heading_zh: string;
  skills_heading_en: string;
  contact_heading_zh: string;
  contact_heading_en: string;
  contact_body_zh: string;
  contact_body_en: string;
  updated_at: number;
};

export type Project = {
  id: number;
  title_zh: string;
  title_en: string;
  description_zh: string;
  description_en: string;
  tag: string;
  technologies: string;
  cover_image: string | null;
  link_url: string | null;
  github_url: string | null;
  blog_slug: string | null;
  completed_at: string | null;
  featured: number;
  sort_order: number;
};

export type Skill = {
  id: number;
  name_zh: string;
  name_en: string;
  description_zh: string;
  description_en: string;
  sort_order: number;
};

export type ContactLink = {
  id: number;
  label: string;
  value: string;
  link_url: string | null;
  sort_order: number;
};

function db(): D1Database {
  const binding = (globalThis as typeof globalThis & { __STEVEN_SITE_ENV__?: { DB: D1Database } }).__STEVEN_SITE_ENV__?.DB;
  if (!binding) throw new Error("Database binding is unavailable");
  return binding;
}

async function ready() {
  const d1 = db();
  await d1.batch([
    d1.prepare(`CREATE TABLE IF NOT EXISTS site_profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      about_heading_zh TEXT NOT NULL, about_heading_en TEXT NOT NULL,
      about_body_zh TEXT NOT NULL, about_body_en TEXT NOT NULL,
      skills_heading_zh TEXT NOT NULL, skills_heading_en TEXT NOT NULL,
      contact_heading_zh TEXT NOT NULL, contact_heading_en TEXT NOT NULL,
      contact_body_zh TEXT NOT NULL, contact_body_en TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    )`),
    d1.prepare(`CREATE TABLE IF NOT EXISTS portfolio_projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title_zh TEXT NOT NULL, title_en TEXT NOT NULL,
      description_zh TEXT NOT NULL, description_en TEXT NOT NULL,
      tag TEXT NOT NULL DEFAULT '', technologies TEXT NOT NULL DEFAULT '', cover_image TEXT,
      link_url TEXT, github_url TEXT, blog_slug TEXT, completed_at TEXT,
      featured INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0
    )`),
    d1.prepare(`CREATE TABLE IF NOT EXISTS portfolio_skills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name_zh TEXT NOT NULL, name_en TEXT NOT NULL,
      description_zh TEXT NOT NULL, description_en TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    )`),
    d1.prepare(`CREATE TABLE IF NOT EXISTS contact_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      label TEXT NOT NULL, value TEXT NOT NULL, link_url TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0
    )`),
    d1.prepare("CREATE TABLE IF NOT EXISTS site_content_meta (id INTEGER PRIMARY KEY CHECK (id = 1), seeded_at INTEGER NOT NULL)"),
  ]);

  // Older versions already have portfolio_projects. Add the richer portfolio
  // fields at runtime so an existing D1 database upgrades without losing work.
  const projectColumns = (await d1.prepare("PRAGMA table_info(portfolio_projects)").all<{ name: string }>()).results;
  const existingColumns = new Set(projectColumns.map((column) => column.name));
  const additions = [
    ["technologies", "ALTER TABLE portfolio_projects ADD COLUMN technologies TEXT NOT NULL DEFAULT ''"],
    ["cover_image", "ALTER TABLE portfolio_projects ADD COLUMN cover_image TEXT"],
    ["github_url", "ALTER TABLE portfolio_projects ADD COLUMN github_url TEXT"],
    ["blog_slug", "ALTER TABLE portfolio_projects ADD COLUMN blog_slug TEXT"],
    ["completed_at", "ALTER TABLE portfolio_projects ADD COLUMN completed_at TEXT"],
    ["featured", "ALTER TABLE portfolio_projects ADD COLUMN featured INTEGER NOT NULL DEFAULT 0"],
  ] as const;
  for (const [name, sql] of additions) {
    if (!existingColumns.has(name)) await d1.prepare(sql).run();
  }

  await d1.prepare(`INSERT OR IGNORE INTO site_profile VALUES
    (1, '保持好奇。\n持續創作。', 'Stay curious.\nKeep creating.',
    '我喜歡了解事物如何運作，從程式內部的邏輯，到感測器、硬體與網路之間的連結。對我來說，科技最有趣的地方，就是能把想法變成大家看得到或用得到的成果。\n\n目前我正在透過 C++ 與 Python 提升程式能力，並探索 AI、Arduino 與 Raspberry Pi。',
    'I enjoy learning how things work, from the logic inside software to the connection between sensors, hardware, and networks. Technology is most exciting to me when it turns an idea into something people can see or use.\n\nRight now, I’m improving my programming through C++ and Python while exploring AI, Arduino, and Raspberry Pi.',
    '我現在正在學習的事。', 'What I’m learning now.',
    '一起完成\n新的作品。', 'Let’s make\nsomething new.',
    '我很樂意學習新事物、和大家合作，並嘗試新的專案。',
    'I’m always happy to learn, collaborate, and try a new project.', ?)`)
    .bind(Date.now()).run();

  const seeded = await d1.prepare("SELECT id FROM site_content_meta WHERE id = 1").first();
  if (!seeded) {
    await d1.batch([
      d1.prepare("INSERT INTO portfolio_projects (title_zh,title_en,description_zh,description_en,tag,link_url,sort_order) VALUES (?,?,?,?,?,?,?)").bind("個人介紹網站", "Personal Website", "以簡潔、響應式的版面介紹我是誰、正在學什麼，以及接下來想完成的作品。", "A clean, responsive introduction to who I am, what I am learning, and what I want to create next.", "WEB DESIGN", null, 0),
      d1.prepare("INSERT INTO portfolio_projects (title_zh,title_en,description_zh,description_en,tag,link_url,sort_order) VALUES (?,?,?,?,?,?,?)").bind("Arduino 與 Raspberry Pi 實作", "Arduino & Raspberry Pi Projects", "使用感測器、微控制器與單板電腦製作自動化裝置，探索軟硬體整合。", "Building automated devices with sensors, microcontrollers, and single-board computers while exploring hardware-software integration.", "ARDUINO · RASPBERRY PI", null, 1),
      d1.prepare("INSERT INTO portfolio_projects (title_zh,title_en,description_zh,description_en,tag,link_url,sort_order) VALUES (?,?,?,?,?,?,?)").bind("AI 學習實驗室", "AI Learning Lab", "探索機器學習、生成式 AI 與智慧應用，嘗試把模型整合到實用作品中。", "Exploring machine learning, generative AI, and practical ways to integrate intelligent features into useful projects.", "ARTIFICIAL INTELLIGENCE", null, 2),
      ...[
        ["C++", "C++", "練習解題、演算法，以及撰寫高效率程式所需的基礎。", "Building a foundation in problem solving, algorithms, and efficient programming."],
        ["Python", "Python", "快速製作原型、探索資料，並把想法變成實用工具。", "Creating quick prototypes, exploring data, and turning ideas into useful tools."],
        ["AI", "AI", "探索智慧系統如何學習、做出判斷，並協助創意工作。", "Exploring how intelligent systems learn, make decisions, and support creative work."],
        ["Arduino", "Arduino", "使用感測器、電子元件與程式設計，打造互動式硬體作品。", "Using sensors, electronic components, and code to build interactive hardware projects."],
        ["Raspberry Pi", "Raspberry Pi", "以 Linux 與 Python 製作自動化工具、伺服器及物聯網專案。", "Creating automation tools, servers, and IoT projects with Linux and Python."],
        ["AI 應用", "AI Applications", "學習機器學習、生成式 AI，並將智慧功能整合到自己的作品。", "Learning machine learning and generative AI while integrating intelligent features into personal projects."],
      ].map((item, index) => d1.prepare("INSERT INTO portfolio_skills (name_zh,name_en,description_zh,description_en,sort_order) VALUES (?,?,?,?,?)").bind(...item, index)),
      d1.prepare("INSERT INTO contact_links (label,value,link_url,sort_order) VALUES (?,?,?,?)").bind("EMAIL", "steventeng2022@gmail.com", "mailto:steventeng2022@gmail.com", 0),
      d1.prepare("INSERT INTO contact_links (label,value,link_url,sort_order) VALUES (?,?,?,?)").bind("DISCORD", "steven0925", null, 1),
      d1.prepare("INSERT INTO site_content_meta (id, seeded_at) VALUES (1, ?)").bind(Date.now()),
    ]);
  }
}

export async function getSiteContent() {
  await ready();
  const [profile, projects, skills, contacts] = await Promise.all([
    db().prepare("SELECT * FROM site_profile WHERE id = 1").first<SiteProfile>(),
    db().prepare("SELECT * FROM portfolio_projects ORDER BY sort_order ASC, id ASC").all<Project>(),
    db().prepare("SELECT * FROM portfolio_skills ORDER BY sort_order ASC, id ASC").all<Skill>(),
    db().prepare("SELECT * FROM contact_links ORDER BY sort_order ASC, id ASC").all<ContactLink>(),
  ]);
  const fallback: SiteProfile = {
    id:1, about_heading_zh:"保持好奇。\n持續創作。", about_heading_en:"Stay curious.\nKeep creating.",
    about_body_zh:"我喜歡了解事物如何運作，並把想法變成大家看得到或用得到的成果。", about_body_en:"I enjoy learning how things work and turning ideas into things people can see or use.",
    skills_heading_zh:"我現在正在學習的事。", skills_heading_en:"What I’m learning now.", contact_heading_zh:"一起完成\n新的作品。", contact_heading_en:"Let’s make\nsomething new.",
    contact_body_zh:"我很樂意學習新事物、和大家合作，並嘗試新的專案。", contact_body_en:"I’m always happy to learn, collaborate, and try a new project.", updated_at:Date.now(),
  };
  return { profile: profile ?? fallback, projects: projects.results, skills: skills.results, contacts: contacts.results };
}

export async function updateSiteProfile(input: Omit<SiteProfile, "id" | "updated_at">) {
  await ready();
  await db().prepare(`UPDATE site_profile SET about_heading_zh=?,about_heading_en=?,about_body_zh=?,about_body_en=?,skills_heading_zh=?,skills_heading_en=?,contact_heading_zh=?,contact_heading_en=?,contact_body_zh=?,contact_body_en=?,updated_at=? WHERE id=1`)
    .bind(input.about_heading_zh,input.about_heading_en,input.about_body_zh,input.about_body_en,input.skills_heading_zh,input.skills_heading_en,input.contact_heading_zh,input.contact_heading_en,input.contact_body_zh,input.contact_body_en,Date.now()).run();
}

type ProjectInput = Omit<Project, "id">;
type SkillInput = Omit<Skill, "id">;
type ContactInput = Omit<ContactLink, "id">;
export async function createProject(v: ProjectInput) { await ready(); await db().prepare("INSERT INTO portfolio_projects (title_zh,title_en,description_zh,description_en,tag,technologies,cover_image,link_url,github_url,blog_slug,completed_at,featured,sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(v.title_zh,v.title_en,v.description_zh,v.description_en,v.tag,v.technologies,v.cover_image,v.link_url,v.github_url,v.blog_slug,v.completed_at,v.featured,v.sort_order).run(); }
export async function updateProject(id:number,v:ProjectInput) { await ready(); await db().prepare("UPDATE portfolio_projects SET title_zh=?,title_en=?,description_zh=?,description_en=?,tag=?,technologies=?,cover_image=?,link_url=?,github_url=?,blog_slug=?,completed_at=?,featured=?,sort_order=? WHERE id=?").bind(v.title_zh,v.title_en,v.description_zh,v.description_en,v.tag,v.technologies,v.cover_image,v.link_url,v.github_url,v.blog_slug,v.completed_at,v.featured,v.sort_order,id).run(); }
export async function deleteProject(id:number) { await ready(); await db().prepare("DELETE FROM portfolio_projects WHERE id=?").bind(id).run(); }
export async function createSkill(v:SkillInput) { await ready(); await db().prepare("INSERT INTO portfolio_skills (name_zh,name_en,description_zh,description_en,sort_order) VALUES (?,?,?,?,?)").bind(v.name_zh,v.name_en,v.description_zh,v.description_en,v.sort_order).run(); }
export async function updateSkill(id:number,v:SkillInput) { await ready(); await db().prepare("UPDATE portfolio_skills SET name_zh=?,name_en=?,description_zh=?,description_en=?,sort_order=? WHERE id=?").bind(v.name_zh,v.name_en,v.description_zh,v.description_en,v.sort_order,id).run(); }
export async function deleteSkill(id:number) { await ready(); await db().prepare("DELETE FROM portfolio_skills WHERE id=?").bind(id).run(); }
export async function createContact(v:ContactInput) { await ready(); await db().prepare("INSERT INTO contact_links (label,value,link_url,sort_order) VALUES (?,?,?,?)").bind(v.label,v.value,v.link_url,v.sort_order).run(); }
export async function updateContact(id:number,v:ContactInput) { await ready(); await db().prepare("UPDATE contact_links SET label=?,value=?,link_url=?,sort_order=? WHERE id=?").bind(v.label,v.value,v.link_url,v.sort_order,id).run(); }
export async function deleteContact(id:number) { await ready(); await db().prepare("DELETE FROM contact_links WHERE id=?").bind(id).run(); }

export async function moveSiteItem(kind:"project"|"skill"|"contact",id:number,direction:"up"|"down") {
  await ready();
  const table = kind === "project" ? "portfolio_projects" : kind === "skill" ? "portfolio_skills" : "contact_links";
  const items = (await db().prepare(`SELECT id, sort_order FROM ${table} ORDER BY sort_order ASC, id ASC`).all<{id:number;sort_order:number}>()).results;
  const index = items.findIndex((item) => item.id === id);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= items.length) return;
  [items[index], items[target]] = [items[target], items[index]];
  await db().batch(items.map((item, order) => db().prepare(`UPDATE ${table} SET sort_order=? WHERE id=?`).bind(order,item.id)));
}
