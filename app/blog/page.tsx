import SiteHeader from "../site-header";
import { listPublishedPosts } from "../../db/posts";
import { listTags } from "../../db/tags";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function BlogArchive({ searchParams }: { searchParams: Promise<{ lang?: string; tag?: string }> }) {
  const { lang, tag } = await searchParams;
  const en = lang === "en";
  const [allPosts, tags] = await Promise.all([listPublishedPosts(), listTags()]);
  const posts = tag ? allPosts.filter((post) => post.tags.some((item) => item.slug === tag)) : allPosts;
  const withLang = (path: string) => en ? `${path}${path.includes("?") ? "&" : "?"}lang=en` : path;

  return <main className="friends-shell blog-shell">
    <SiteHeader en={en} active="blog" />
    <section className="friends-hero page-intro" id="main-content">
      <div className="page-heading-meta"><p className="eyebrow">{en ? "NOTES · PROJECTS · LEARNING" : "筆記 · 專案 · 學習"}</p><span className="page-index">03 / JOURNAL</span></div>
      <h1>{en ? "Field notes." : "學習手記"}</h1>
      <div className="page-intro-footer">
        <p className="friends-intro">{en ? "Things I’m learning, ideas I’m trying, and stories from the making. A journal of curiosity, one entry at a time." : "記錄正在學的事、嘗試中的點子，還有創作背後的小故事。讓每一份好奇，都有跡可循。"}</p>
        <div className="page-count"><strong>{String(allPosts.length).padStart(2,"0")}</strong><span>{en ? "PUBLISHED NOTES" : "篇公開筆記"}</span></div>
      </div>
    </section>
    <section className="friends-list">
      <div className="section-kicker"><span>01</span> {en ? "THE JOURNAL" : "所有文章"}</div>
      <div className="tag-filter" aria-label={en ? "Filter posts by topic" : "依主題篩選文章"}>
        <Link className={!tag ? "active" : ""} aria-current={!tag ? "page" : undefined} href={withLang("/blog")}>{en ? "All notes" : "所有筆記"}</Link>
        {tags.map(item => <Link className={tag === item.slug ? "active" : ""} aria-current={tag === item.slug ? "page" : undefined} key={item.id} href={withLang(`/blog?tag=${encodeURIComponent(item.slug)}`)}>#{item.name}</Link>)}
      </div>
      {posts.length === 0 ? <div className="blog-empty">
        <p>{tag ? (en ? "No notes on this topic yet." : "這個主題，還沒有筆記。") : (en ? "The first page is still unfolding." : "第一頁故事，正在醞釀。")}</p>
        {tag ? <Link className="text-link" href={withLang("/blog")}>{en ? "Explore all notes" : "瀏覽所有筆記"} →</Link> : <span>{en ? "Come back for new ideas and discoveries." : "下次見面，一起分享新的發現。"}</span>}
      </div> : <div className="blog-grid archive-grid">
        {posts.map((post, index) => <article className="blog-card" key={post.id}>
          <p className="project-tag">{String(index + 1).padStart(2,"0")} <span aria-hidden="true">/</span> <time dateTime={new Date(post.updated_at).toISOString()}>{new Date(post.updated_at).toLocaleDateString(en ? "en-US" : "zh-TW", { year:"numeric", month:"short", day:"2-digit" })}</time>{post.is_locked ? ` · ${en ? "LOCKED" : "密碼保護"}` : ""}</p>
          <h3><Link href={withLang(`/blog/${post.slug}`)}>{post.title}</Link></h3>
          <p>{post.excerpt}</p>
          {post.tags.length > 0 && <div className="post-tags">{post.tags.map(item => <Link key={item.id} href={withLang(`/blog?tag=${encodeURIComponent(item.slug)}`)}>#{item.name}</Link>)}</div>}
          <Link className="read-link" href={withLang(`/blog/${post.slug}`)}>{post.is_locked ? (en ? "UNLOCK NOTE" : "解鎖文章") : (en ? "READ THE STORY" : "閱讀文章")} <span aria-hidden="true">↗</span></Link>
        </article>)}
      </div>}
    </section>
    <footer className="friends-footer"><span>© 2026 STEVEN</span><Link href={withLang("/")}>{en ? "BACK HOME" : "回到首頁"} →</Link></footer>
  </main>;
}
