import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getPublishedPost, getPublishedPostAccess } from "../../../db/posts";
import { blogUnlockToken, unlockCookieName } from "../../blog-lock";
import { unlockBlogPostAction } from "./unlock-action";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function BlogPost({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ unlock?: string }> }) {
  const { slug } = await params;
  const access = await getPublishedPostAccess(slug);
  if (!access) notFound();

  if (access.password_hash) {
    const jar = await cookies();
    const expected = await blogUnlockToken(access.id, access.password_hash);
    const unlocked = jar.get(unlockCookieName(access.id))?.value === expected;
    if (!unlocked) {
      const failed = (await searchParams).unlock === "failed";
      return <main className="article-shell"><header className="site-header"><Link className="brand" href="/">STEVEN</Link><nav><Link href="/blog">所有文章</Link><Link href="/admin">站長登入</Link></nav></header><section className="blog-lock"><p className="eyebrow">PROTECTED POST</p><div className="lock-icon" aria-hidden="true">LOCKED</div><h1>這篇文章已上鎖</h1><p>請輸入文章密碼以繼續閱讀。成功解鎖後，這個瀏覽器會保留權限 24 小時。</p><form action={unlockBlogPostAction}><input type="hidden" name="slug" value={slug}/><label htmlFor="post-password">文章密碼</label><input id="post-password" name="password" type="password" required minLength={4} maxLength={128} autoComplete="current-password" aria-describedby={failed ? "unlock-error" : undefined}/>{failed && <p className="lock-error" id="unlock-error" role="alert">密碼不正確，請再試一次。</p>}<button className="primary-button" type="submit">解鎖文章 →</button></form><Link className="text-link" href="/blog">← 返回所有文章</Link></section></main>;
    }
  }

  const post = await getPublishedPost(slug);
  if (!post) notFound();
  return <main className="article-shell"><header className="site-header"><Link className="brand" href="/">STEVEN</Link><nav><Link href="/blog">所有文章</Link><Link href="/admin">撰寫文章</Link></nav></header><article className="article"><p className="eyebrow">部落格 · {new Date(post.updated_at).toLocaleDateString("zh-TW", { year:"numeric", month:"short", day:"2-digit" })}{access.password_hash ? " · 已解鎖" : ""}</p><h1>{post.title}</h1>{post.tags.length > 0 && <div className="post-tags article-tags">{post.tags.map(tag => <Link key={tag.id} href={`/blog?tag=${tag.slug}`}>#{tag.name}</Link>)}</div>}{post.excerpt && <p className="article-lead">{post.excerpt}</p>}{post.cover_image && <img className="article-cover" src={post.cover_image} alt={post.title}/>}<div className="article-body markdown-body"><ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown></div>{post.gallery.length > 0 && <section className="article-gallery" aria-labelledby="gallery-title"><div className="article-gallery-heading"><p className="eyebrow">PHOTO NOTES</p><h2 id="gallery-title">文章相簿</h2></div><div className="article-gallery-grid">{post.gallery.map((item,index) => <figure key={item.id}><img src={item.image_url} alt={item.caption || `${post.title} 相簿照片 ${index+1}`}/>{item.caption && <figcaption>{item.caption}</figcaption>}</figure>)}</div></section>}<Link className="text-link" href="/blog">← 返回所有文章</Link></article></main>;
}
