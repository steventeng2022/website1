import SiteHeader from "../site-header";
import { listPublishedPostSummaries } from "../../db/posts";
import { listTags } from "../../db/tags";
import Link from "next/link";
import "./archive.css";

export const dynamic = "force-dynamic";

type SearchValue = string | string[] | undefined;
const first = (value: SearchValue) => (Array.isArray(value) ? value[0] : value) ?? "";

export default async function BlogArchive({ searchParams }: { searchParams: Promise<{ lang?: SearchValue; tag?: SearchValue; q?: SearchValue; page?: SearchValue }> }) {
  const params = await searchParams;
  const en = first(params.lang) === "en";
  const [archive, tags] = await Promise.all([
    listPublishedPostSummaries({ page: Number(first(params.page)) || 1, tag: first(params.tag), query: first(params.q) }),
    listTags(),
  ]);
  const { posts, total, totalPages, page, pageSize, tag, query } = archive;
  const filtered = Boolean(tag || query);
  const firstResult = total ? (page - 1) * pageSize + 1 : 0;
  const lastResult = (page - 1) * pageSize + posts.length;
  const withLang = (path: string) => en ? `${path}${path.includes("?") ? "&" : "?"}lang=en` : path;
  const archiveHref = ({ selectedTag = tag, search = query, selectedPage = 1 }: { selectedTag?: string; search?: string; selectedPage?: number } = {}) => {
    const next = new URLSearchParams();
    if (en) next.set("lang", "en");
    if (selectedTag) next.set("tag", selectedTag);
    if (search) next.set("q", search);
    if (selectedPage > 1) next.set("page", String(selectedPage));
    return `/blog${next.size ? `?${next}` : ""}`;
  };
  const clearHref = archiveHref({ selectedTag: "", search: "" });

  return <main className="friends-shell blog-shell">
    <SiteHeader en={en} active="blog" />
    <section className="friends-hero page-intro" id="main-content">
      <div className="page-heading-meta"><p className="eyebrow">{en ? "NOTES · PROJECTS · LEARNING" : "筆記 · 專案 · 學習"}</p><span className="page-index">03 / JOURNAL</span></div>
      <h1>{en ? "Field notes." : "學習手記"}</h1>
      <div className="page-intro-footer">
        <p className="friends-intro">{en ? "Things I’m learning, ideas I’m trying, and stories from the making. A journal of curiosity, one entry at a time." : "記錄正在學的事、嘗試中的點子，還有創作背後的小故事。讓每一份好奇，都有跡可循。"}</p>
        <div className="page-count"><strong>{String(total).padStart(2,"0")}</strong><span>{filtered ? (en ? "MATCHING NOTES" : "篇符合的筆記") : (en ? "PUBLISHED NOTES" : "篇公開筆記")}</span></div>
      </div>
    </section>
    <section className="friends-list" id="journal-results" aria-labelledby="journal-heading">
      <h2 className="section-kicker" id="journal-heading"><span>01</span> {en ? "THE JOURNAL" : "所有文章"}</h2>
      <form className="archive-search" action="/blog" method="get" role="search" aria-label={en ? "Search the journal" : "搜尋部落格"}>
        {en && <input type="hidden" name="lang" value="en" />}
        {tag && <input type="hidden" name="tag" value={tag} />}
        <label htmlFor="journal-search">{en ? "Find a thought, a project, a little discovery." : "找一個想法、一件作品，或一點新發現。"}</label>
        <div className="archive-search__field">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></svg>
          <input key={query} id="journal-search" type="search" name="q" defaultValue={query} maxLength={120} placeholder={en ? "Search titles and previews…" : "搜尋標題與摘要…"} />
          <button type="submit">{en ? "Search" : "搜尋"}<span aria-hidden="true">↗</span></button>
        </div>
      </form>
      <nav className="tag-filter" aria-label={en ? "Filter posts by topic" : "依主題篩選文章"}>
        <Link className={!tag ? "active" : ""} aria-current={!tag ? "page" : undefined} href={archiveHref({ selectedTag: "" })}>{en ? "All topics" : "所有主題"}</Link>
        {tags.map(item => <Link className={tag === item.slug ? "active" : ""} aria-current={tag === item.slug ? "page" : undefined} key={item.id} href={archiveHref({ selectedTag: item.slug })}>#{item.name}</Link>)}
      </nav>
      <div className="archive-results">
        <p>{total > 0 ? (en ? `Showing ${firstResult}–${lastResult} of ${total} notes` : `顯示第 ${firstResult}–${lastResult} 篇，共 ${total} 篇`) : (en ? "No notes to show" : "目前沒有符合的文章")}{query && <span>{en ? ` for “${query}”` : ` · 搜尋「${query}」`}</span>}</p>
        {filtered && <Link href={clearHref}>{en ? "Clear filters" : "清除篩選"}<span aria-hidden="true">×</span></Link>}
      </div>
      {posts.length === 0 ? <div className="blog-empty">
        <p>{query ? (en ? "No notes match your search." : "還沒有符合搜尋的筆記。") : tag ? (en ? "No notes on this topic yet." : "這個主題，還沒有筆記。") : (en ? "The first page is still unfolding." : "第一頁故事，正在醞釀。")}</p>
        {filtered ? <><span>{en ? "Try another phrase or explore all notes." : "試試其他關鍵字，或瀏覽所有筆記。"}</span><Link className="text-link" href={clearHref}>{en ? "Explore all notes" : "瀏覽所有筆記"} →</Link></> : <span>{en ? "Come back for new ideas and discoveries." : "下次見面，一起分享新的發現。"}</span>}
      </div> : <div className="blog-grid archive-grid">
        {posts.map((post, index) => <article className="blog-card" key={post.id}>
          <p className="project-tag">{String(firstResult + index).padStart(2,"0")} <span aria-hidden="true">/</span> <time dateTime={new Date(post.updated_at).toISOString()}>{new Date(post.updated_at).toLocaleDateString(en ? "en-US" : "zh-TW", { year:"numeric", month:"short", day:"2-digit" })}</time>{post.is_locked ? ` · ${en ? "LOCKED" : "密碼保護"}` : ""}</p>
          <h3><Link href={withLang(`/blog/${post.slug}`)}>{post.title}</Link></h3>
          <p>{post.excerpt}</p>
          {post.tags.length > 0 && <div className="post-tags">{post.tags.map(item => <Link key={item.id} href={archiveHref({ selectedTag: item.slug })}>#{item.name}</Link>)}</div>}
          <Link className="read-link" href={withLang(`/blog/${post.slug}`)}>{post.is_locked ? (en ? "UNLOCK NOTE" : "解鎖文章") : (en ? "READ THE STORY" : "閱讀文章")} <span aria-hidden="true">↗</span></Link>
        </article>)}
      </div>}
      {totalPages > 1 && <nav className="archive-pagination" aria-label={en ? "Journal pages" : "文章分頁"}>
        {page > 1 ? <Link rel="prev" href={`${archiveHref({ selectedPage: page - 1 })}#journal-results`}><span aria-hidden="true">←</span>{en ? "Previous" : "上一頁"}</Link> : <span className="archive-pagination__disabled" aria-disabled="true"><span aria-hidden="true">←</span>{en ? "Previous" : "上一頁"}</span>}
        <span className="archive-pagination__position">{en ? `Page ${page} of ${totalPages}` : `第 ${page} / ${totalPages} 頁`}</span>
        {page < totalPages ? <Link rel="next" href={`${archiveHref({ selectedPage: page + 1 })}#journal-results`}>{en ? "Next" : "下一頁"}<span aria-hidden="true">→</span></Link> : <span className="archive-pagination__disabled" aria-disabled="true">{en ? "Next" : "下一頁"}<span aria-hidden="true">→</span></span>}
      </nav>}
    </section>
    <footer className="friends-footer"><span>© 2026 STEVEN</span><Link href={withLang("/")}>{en ? "BACK HOME" : "回到首頁"} →</Link></footer>
  </main>;
}
