import { notFound } from "next/navigation";
import { getPublishedPost } from "../../../db/posts";

export const dynamic = "force-dynamic";

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) notFound();
  return <main className="article-shell"><header className="site-header"><a className="brand" href="/">STEVEN</a><nav><a href="/#blog">All posts</a><a href="/admin">Write</a></nav></header><article className="article"><p className="eyebrow">BLOG · {new Date(post.updated_at).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" })}</p><h1>{post.title}</h1>{post.excerpt && <p className="article-lead">{post.excerpt}</p>}<div className="article-body">{post.content.split(/\n\n+/).map((paragraph, i) => <p key={i}>{paragraph}</p>)}</div><a className="text-link" href="/#blog">← Back to all posts</a></article></main>;
}
