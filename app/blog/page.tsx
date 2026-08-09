import LanguageToggle from "../language-toggle";
import { listPublishedPosts } from "../../db/posts";
import { listTags } from "../../db/tags";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function BlogArchive({ searchParams }: { searchParams: Promise<{ lang?: string; tag?: string }> }) {
  const { lang, tag } = await searchParams;
  const en = lang === "en";
  const allPosts = await listPublishedPosts();
  const tags = await listTags();
  const posts = tag ? allPosts.filter((post) => post.tags.some((item) => item.slug === tag)) : allPosts;
  return <main className="friends-shell">
    <header className="site-header"><Link className="brand" href={en ? "/?lang=en" : "/"}>STEVEN</Link><nav><Link href={en ? "/?lang=en" : "/"}>{en ? "Home" : "首頁"}</Link><Link className="active-nav" href={en ? "/blog?lang=en" : "/blog"}>{en ? "Blog" : "文章"}</Link><LanguageToggle /></nav></header>
    <section className="friends-hero"><p className="eyebrow">{en ? "NOTES · PROJECTS · LEARNING" : "筆記 · 專案 · 學習"}</p><h1>Blog.</h1><p className="friends-intro">{en ? "All my published notes, from newest to oldest." : "所有已發布文章，依照最新到最舊排列。"}</p></section>
    <section className="friends-list"><div className="section-kicker"><span>01</span> {en ? "ALL POSTS" : "所有文章"}</div>
      <div className="tag-filter"><Link className={!tag ? "active" : ""} href={en ? "/blog?lang=en" : "/blog"}>{en ? "All" : "全部"}</Link>{tags.map(item => <Link className={tag === item.slug ? "active" : ""} key={item.id} href={`/blog?tag=${item.slug}${en ? "&lang=en" : ""}`}>#{item.name}</Link>)}</div>
      {posts.length === 0 ? <div className="blog-empty"><p>{en ? "No published posts yet." : "目前還沒有已發布文章。"}</p></div> : <div className="blog-grid archive-grid">{posts.map((post, index) => <article className="blog-card" key={post.id}><p className="project-tag">{String(index + 1).padStart(2,"0")} · {new Date(post.updated_at).toLocaleDateString(en ? "en-US" : "zh-TW")}{post.is_locked ? ` · ${en ? "LOCKED" : "密碼保護"}` : ""}</p><h3><Link href={`/blog/${post.slug}`}>{post.title}</Link></h3><p>{post.excerpt}</p><Link className="read-link" href={`/blog/${post.slug}`}>{post.is_locked ? (en ? "UNLOCK POST" : "解鎖文章") : (en ? "READ POST" : "閱讀文章")} ↗</Link></article>)}</div>}
    </section>
    <footer className="friends-footer"><span>© 2026 STEVEN</span><Link href={en ? "/?lang=en" : "/"}>{en ? "BACK HOME" : "回到首頁"} →</Link></footer>
  </main>;
}
