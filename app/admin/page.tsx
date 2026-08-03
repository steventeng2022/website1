import { requireAdmin } from "../cloudflare-auth";
import { listAllPosts } from "../../db/posts";
import { listFriends } from "../../db/friends";
import { createFriendAction, createPostAction, deleteFriendAction, deletePostAction, updatePostAction, updatePostStatusAction } from "./actions";
import CoverImageField from "./cover-image-field";
import MarkdownEditor from "./markdown-editor";

export const dynamic = "force-dynamic";
export default async function AdminPage() {
  const email = await requireAdmin();
  const posts = await listAllPosts();
  const friends = await listFriends();
  return <main className="admin-shell">
    <header className="admin-top"><a className="brand" href="/">STEVEN</a><div><span>{email}</span><a href="/cdn-cgi/access/logout">登出</a></div></header>
    <section className="studio-heading"><p className="eyebrow">私人文章工作室</p><h1>寫下你的<br/>學習歷程。</h1><p>先建立草稿、整理內容，準備好後再發布文章。</p></section>
    <section className="editor-section"><h2>新增文章</h2><PostForm action={createPostAction} /></section>
    <section className="editor-section"><div className="editor-title"><h2>我的文章</h2><span>共 {posts.length} 篇</span></div>
      {posts.length === 0 ? <p className="empty-state">目前還沒有文章，請從上方編輯器開始撰寫。</p> : posts.map(post => <details className="post-editor" key={post.id}>
        <summary><div><span className={`status ${post.status}`}>{post.status === "published" ? "已發布" : "草稿"}</span><h3>{post.title}</h3></div><span>編輯 +</span></summary>
        <PostForm action={updatePostAction} post={post} />
        <form action={updatePostStatusAction} className="status-toggle-form">
          <input type="hidden" name="id" value={post.id}/>
          <input type="hidden" name="slug" value={post.slug}/>
          <input type="hidden" name="status" value={post.status === "published" ? "draft" : "published"}/>
          <button className="visibility-button" type="submit">{post.status === "published" ? "改為私人文章" : "重新發布文章"}</button>
        </form>
        <form action={deletePostAction}><input type="hidden" name="id" value={post.id}/><button className="danger-button" type="submit">刪除文章</button></form>
      </details>)}
    </section>
    <section className="editor-section friends-admin"><div className="editor-title"><h2>Friends 網站管理</h2><span>共 {friends.length} 個網站</span></div>
      <form className="post-form" action={createFriendAction}>
        <label>網站名稱<input required name="siteName" placeholder="Friend's Website"/></label>
        <label>網站網址<input required type="url" name="siteUrl" placeholder="https://example.com"/></label>
        <label>Logo 網址<input required type="url" name="logoUrl" placeholder="https://example.com/logo.png"/></label>
        <label>網站介紹<textarea required name="description" rows={3} placeholder="簡短介紹這個合作網站。"/></label>
        <button className="primary-button" type="submit">新增 Friends 網站 →</button>
      </form>
      <div className="friends-admin-list">
        {friends.length === 0 ? <p className="empty-state">目前還沒有 Friends 網站。</p> : friends.map(friend => <article className="friends-admin-item" key={friend.id}>
          <img src={friend.logo_url} alt="" width="52" height="52"/>
          <div><h3>{friend.site_name}</h3><a href={friend.site_url} target="_blank" rel="noopener noreferrer">{friend.site_url}</a><p>{friend.description}</p></div>
          <form action={deleteFriendAction}><input type="hidden" name="id" value={friend.id}/><button className="danger-button" type="submit">刪除</button></form>
        </article>)}
      </div>
    </section>
  </main>;
}

function PostForm({ action, post }: { action: (formData: FormData) => Promise<void>; post?: Awaited<ReturnType<typeof listAllPosts>>[number] }) {
  return <form className="post-form" action={action}>
    {post && <input type="hidden" name="id" value={post.id}/>}<label>文章標題<input required name="title" defaultValue={post?.title} placeholder="我從第一個專案學到的事"/></label>
    <label>網址代稱（英文）<input required name="slug" defaultValue={post?.slug} placeholder="my-first-project" pattern="[a-z0-9-]+"/></label>
    <label>簡短介紹<textarea name="excerpt" defaultValue={post?.excerpt} rows={2} placeholder="顯示在首頁的文章簡介。"/></label>
    <label className="content-label">文章內容（Markdown）<MarkdownEditor defaultValue={post?.content ?? ""}/></label>
    <CoverImageField existingCover={post?.cover_image ?? null}/>
    <div className="form-row"><label>文章狀態<select name="status" defaultValue={post?.status ?? "draft"}><option value="draft">草稿</option><option value="published">已發布</option></select></label><button className="primary-button" type="submit">{post ? "儲存變更" : "建立文章"} →</button></div>
  </form>;
}
