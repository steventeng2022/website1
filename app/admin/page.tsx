import { requireAdmin } from "../cloudflare-auth";
import { listAllPosts } from "../../db/posts";
import { createPostAction, deletePostAction, updatePostAction } from "./actions";

export const dynamic = "force-dynamic";
export default async function AdminPage() {
  const email = await requireAdmin();
  const posts = await listAllPosts();
  return <main className="admin-shell">
    <header className="admin-top"><a className="brand" href="/">STEVEN</a><div><span>{email}</span><a href="/cdn-cgi/access/logout">Sign out</a></div></header>
    <section className="studio-heading"><p className="eyebrow">PRIVATE WRITING STUDIO</p><h1>Write what<br/>you’re learning.</h1><p>Create a draft, shape the story, then publish it when it is ready.</p></section>
    <section className="editor-section"><h2>New post</h2><PostForm action={createPostAction} /></section>
    <section className="editor-section"><div className="editor-title"><h2>Your posts</h2><span>{posts.length} TOTAL</span></div>
      {posts.length === 0 ? <p className="empty-state">No posts yet. Start with the editor above.</p> : posts.map(post => <details className="post-editor" key={post.id}>
        <summary><div><span className={`status ${post.status}`}>{post.status}</span><h3>{post.title}</h3></div><span>Edit +</span></summary>
        <PostForm action={updatePostAction} post={post} />
        <form action={deletePostAction}><input type="hidden" name="id" value={post.id}/><button className="danger-button" type="submit">Delete post</button></form>
      </details>)}
    </section>
  </main>;
}

function PostForm({ action, post }: { action: (formData: FormData) => Promise<void>; post?: Awaited<ReturnType<typeof listAllPosts>>[number] }) {
  return <form className="post-form" action={action}>
    {post && <input type="hidden" name="id" value={post.id}/>}<label>Title<input required name="title" defaultValue={post?.title} placeholder="What I learned from my first project"/></label>
    <label>URL slug<input required name="slug" defaultValue={post?.slug} placeholder="my-first-project" pattern="[a-z0-9-]+"/></label>
    <label>Short description<textarea name="excerpt" defaultValue={post?.excerpt} rows={2} placeholder="A short introduction shown on the homepage."/></label>
    <label>Article<textarea required name="content" defaultValue={post?.content} rows={12} placeholder="Write your article here..."/></label>
    <div className="form-row"><label>Status<select name="status" defaultValue={post?.status ?? "draft"}><option value="draft">Draft</option><option value="published">Published</option></select></label><button className="primary-button" type="submit">{post ? "Save changes" : "Create post"} →</button></div>
  </form>;
}
