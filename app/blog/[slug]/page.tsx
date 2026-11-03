import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getPublishedPost, getPublishedPostAccess } from "../../../db/posts";
import { blogUnlockToken, unlockCookieName } from "../../blog-lock";
import { unlockBlogPostAction } from "./unlock-action";
import SiteHeader from "../../site-header";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function BlogPost({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ unlock?: string; lang?: string }> }) {
  const { slug } = await params;
  const { lang, unlock } = await searchParams;
  const en = lang === "en";
  const withLang = (path: string) => en ? `${path}${path.includes("?") ? "&" : "?"}lang=en` : path;
  const access = await getPublishedPostAccess(slug);
  if (!access) notFound();

  if (access.passwords.length > 0) {
    const jar = await cookies();
    const expected = await blogUnlockToken(access.id, access.passwords);
    const unlocked = jar.get(unlockCookieName(access.id))?.value === expected;
    if (!unlocked) {
      const failed = unlock === "failed";
      return <main className="article-shell">
        <SiteHeader en={en} active="blog" />
        <section className="blog-lock" id="main-content">
          <p className="eyebrow">{en ? "A PRIVATE NOTE" : "一篇私人筆記"}</p>
          <div className="lock-icon" aria-hidden="true">LOCKED</div>
          <h1>{en ? "A story with\na little privacy." : "這篇文章已上鎖"}</h1>
          <p>{en ? "Enter the post password to keep reading. Once unlocked, this browser will remember your access for 24 hours." : "請輸入文章密碼以繼續閱讀。成功解鎖後，這個瀏覽器會保留權限 24 小時。"}</p>
          <form action={unlockBlogPostAction}>
            <input type="hidden" name="slug" value={slug}/>
            <label htmlFor="post-password">{en ? "Post password" : "文章密碼"}</label>
            <input id="post-password" name="password" type="password" required minLength={4} maxLength={128} autoComplete="current-password" aria-describedby={failed ? "unlock-error" : undefined}/>
            {failed && <p className="lock-error" id="unlock-error" role="alert">{en ? "That password didn’t match. Please try again." : "密碼不正確，請再試一次。"}</p>}
            <button className="primary-button" type="submit">{en ? "Unlock the story" : "解鎖文章"} <span aria-hidden="true">→</span></button>
          </form>
          <Link className="text-link" href={withLang("/blog")}>← {en ? "Back to the journal" : "返回所有文章"}</Link>
        </section>
      </main>;
    }
  }

  const post = await getPublishedPost(slug);
  if (!post) notFound();

  return <main className="article-shell">
    <SiteHeader en={en} active="blog" />
    <article className="article" id="main-content">
      <Link className="article-back text-link" href={withLang("/blog")}>← {en ? "The journal" : "所有文章"}</Link>
      <div className="article-heading">
        <p className="eyebrow">{en ? "FIELD NOTES" : "學習手記"} <span aria-hidden="true">/</span> <time dateTime={new Date(post.updated_at).toISOString()}>{new Date(post.updated_at).toLocaleDateString(en ? "en-US" : "zh-TW", { year:"numeric", month:"short", day:"2-digit" })}</time>{access.passwords.length > 0 ? (en ? " · UNLOCKED" : " · 已解鎖") : ""}</p>
        <h1>{post.title}</h1>
        {post.tags.length > 0 && <div className="post-tags article-tags">{post.tags.map(tag => <Link key={tag.id} href={withLang(`/blog?tag=${encodeURIComponent(tag.slug)}`)}>#{tag.name}</Link>)}</div>}
        {post.excerpt && <p className="article-lead">{post.excerpt}</p>}
      </div>
      {post.cover_image && <img className="article-cover" src={post.cover_image} alt={post.title} decoding="async"/>}
      <div className="article-body markdown-body"><ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown></div>
      {post.gallery.length > 0 && <section className="article-gallery" aria-labelledby="gallery-title">
        <div className="article-gallery-heading"><p className="eyebrow">PHOTO NOTES</p><h2 id="gallery-title">{en ? "In pictures." : "文章相簿"}</h2></div>
        <div className="article-gallery-grid">{post.gallery.map((item,index) => <figure key={item.id}>
          <img src={item.image_url} alt={item.caption || `${post.title} ${en ? "photo" : "相簿照片"} ${index+1}`} loading="lazy" decoding="async"/>
          {item.caption && <figcaption>{item.caption}</figcaption>}
        </figure>)}</div>
      </section>}
      <div className="article-end"><span className="page-index">{en ? "THANKS FOR READING" : "謝謝你讀到這裡"}</span><Link className="text-link" href={withLang("/blog")}>← {en ? "More from the journal" : "返回所有文章"}</Link></div>
    </article>
    <footer className="friends-footer"><span>© 2026 STEVEN</span><Link href={withLang("/")}>{en ? "BACK HOME" : "回到首頁"} →</Link></footer>
  </main>;
}
