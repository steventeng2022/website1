import { listPublishedPosts, listTags } from "../../db/posts";

export const dynamic = "force-dynamic";

export default async function BlogArchive({ searchParams }: { searchParams: Promise<{ tag?: string; lang?: string }> }) {
  const { tag, lang } = await searchParams;
  const en = lang === "en";
  const [allPosts, tags] = await Promise.all([listPublishedPosts(), listTags()]);
  const selectedTag = tags.find(item => item.slug === tag);
  const posts = selectedTag ? allPosts.filter(post => post.tags.some(item => item.id === selectedTag.id)) : allPosts;

  return <main className="archive-shell">
    <header className="site-header"><a className="brand" href={en ? "/?lang=en" : "/"}>STEVEN</a><nav><a href={en ? "/?lang=en#blog" : "/#blog"}>{en ? "Home" : "首頁"}</a><a href="/admin">{en ? "Write" : "撰寫文章"}</a></nav></header>
    <section className="archive-hero"><p className="eyebrow">{en ? "BLOG ARCHIVE" : "文章封存"}</p><h1>{en ? <>All<br/>posts.</> : <>所有<br/>文章。</>}</h1><p>{en ? "Older posts and notes, organized by topic." : "把較早的文章與學習筆記集中整理，並可依標籤查看。"}</p></section>
    <section className="archive-content">
      <div className="archive-toolbar"><h2>{selectedTag ? `#${selectedTag.name}` : (en ? "Latest to oldest" : "由新到舊")}</h2><div className="tag-filter"><a className={!selectedTag ? "active" : ""} href={en ? "/blog?lang=en" : "/blog"}>{en ? "All" : "全部"}</a>{tags.map(item => <a className={selectedTag?.id === item.id ? "active" : ""} key={item.id} href={`/blog?tag=${item.slug}${en ? "&lang=en" : ""}`}>#{item.name}</a>)}</div></div>
      {posts.length === 0 ? <div className="blog-empty"><p>{en ? "No posts match this tag." : "這個標籤目前沒有文章。"}</p></div> : <div className="archive-list">{posts.map((post, index) => <article className="archive-card" key={post.id}>
        <span className="archive-number">{String(index + 1).padStart(2, "0")}</span>
        <div><p className="project-tag">{new Date(post.updated_at).toLocaleDateString(en ? "en-US" : "zh-TW", { year:"numeric", month:"short", day:"2-digit" })}</p><h2><a href={`/blog/${post.slug}`}>{post.title}</a></h2><p>{post.excerpt}</p><div className="tag-list">{post.tags.map(item => <a className="tag-pill" key={item.id} href={`/blog?tag=${item.slug}${en ? "&lang=en" : ""}`}>#{item.name}</a>)}</div></div>
        <a className="archive-arrow" href={`/blog/${post.slug}`} aria-label={en ? `Read ${post.title}` : `閱讀${post.title}`}>↗</a>
      </article>)}</div>}
    </section>
  </main>;
}
