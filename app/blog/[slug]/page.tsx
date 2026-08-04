import { notFound } from "next/navigation";
import { getPublishedPost } from "../../../db/posts";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) notFound();
  return <main className="article-shell"><header className="site-header"><Link className="brand" href="/">STEVEN</Link><nav><Link href="/blog">所有文章</Link><Link href="/admin">撰寫文章</Link></nav></header><article className="article"><p className="eyebrow">部落格 · {new Date(post.updated_at).toLocaleDateString("zh-TW", { year:"numeric", month:"short", day:"2-digit" })}</p><h1>{post.title}</h1>{post.tags.length > 0 && <div className="post-tags article-tags">{post.tags.map(tag => <Link key={tag.id} href={`/blog?tag=${tag.slug}`}>#{tag.name}</Link>)}</div>}{post.excerpt && <p className="article-lead">{post.excerpt}</p>}{post.cover_image && <img className="article-cover" src={post.cover_image} alt={post.title}/>}<div className="article-body markdown-body"><ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown></div><Link className="text-link" href="/blog">← 返回所有文章</Link></article></main>;
}
