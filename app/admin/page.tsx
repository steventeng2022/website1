import { requireAdmin } from "../cloudflare-auth";
import { listAllPosts } from "../../db/posts";
import { listFriends } from "../../db/friends";
import { listExperiences } from "../../db/experiences";
import { listTags } from "../../db/tags";
import { getSiteContent } from "../../db/site-content";
import { createContactAction, createExperienceAction, createFriendAction, createPostAction, createProjectAction, createSkillAction, createTagAction, deleteContactAction, deleteExperienceAction, deleteFriendAction, deletePostAction, deleteProjectAction, deleteSkillAction, deleteTagAction, moveExperienceAction, moveSiteItemAction, updateContactAction, updateExperienceAction, updatePostAction, updatePostStatusAction, updateProjectAction, updateSiteProfileAction, updateSkillAction } from "./actions";
import CoverImageField from "./cover-image-field";
import GalleryUploadField from "./gallery-upload-field";
import MarkdownEditor from "./markdown-editor";
import Link from "next/link";

export const dynamic = "force-dynamic";
export default async function AdminPage() {
  const email = await requireAdmin();
  const posts = await listAllPosts();
  const friends = await listFriends();
  const experiences = await listExperiences();
  const tags = await listTags();
  const content = await getSiteContent();
  return <main className="admin-shell">
    <header className="admin-top"><Link className="brand" href="/">STEVEN</Link><div><span>{email}</span><a href="/cdn-cgi/access/logout">登出</a></div></header>
    <section className="studio-heading"><p className="eyebrow">STEVEN CONTENT STUDIO</p><h1>管理你的<br/>個人網站。</h1><p>在這裡編輯關於我、作品、技能、聯絡方式、經歷與文章；儲存後公開網站會直接更新。</p></section>
    <section className="editor-section content-profile-admin"><div className="editor-title"><h2>關於我與頁面文案</h2><span>繁中＋英文</span></div>
      <form className="post-form content-profile-form" action={updateSiteProfileAction}>
        <label>關於我標題（中文）<textarea required name="aboutHeadingZh" rows={2} defaultValue={content.profile.about_heading_zh}/></label>
        <label>About heading (English)<textarea required name="aboutHeadingEn" rows={2} defaultValue={content.profile.about_heading_en}/></label>
        <label>關於我內容（中文）<textarea required name="aboutBodyZh" rows={7} defaultValue={content.profile.about_body_zh}/></label>
        <label>About content (English)<textarea required name="aboutBodyEn" rows={7} defaultValue={content.profile.about_body_en}/></label>
        <label>技能區標題（中文）<input required name="skillsHeadingZh" defaultValue={content.profile.skills_heading_zh}/></label>
        <label>Skills heading (English)<input required name="skillsHeadingEn" defaultValue={content.profile.skills_heading_en}/></label>
        <label>聯絡區標題（中文）<textarea required name="contactHeadingZh" rows={2} defaultValue={content.profile.contact_heading_zh}/></label>
        <label>Contact heading (English)<textarea required name="contactHeadingEn" rows={2} defaultValue={content.profile.contact_heading_en}/></label>
        <label>聯絡區介紹（中文）<textarea required name="contactBodyZh" rows={3} defaultValue={content.profile.contact_body_zh}/></label>
        <label>Contact intro (English)<textarea required name="contactBodyEn" rows={3} defaultValue={content.profile.contact_body_en}/></label>
        <button className="primary-button" type="submit">儲存頁面文案 →</button>
      </form>
    </section>
    <ContentCollection title="作品管理" count={content.projects.length} kind="project">
      <ProjectForm action={createProjectAction} nextOrder={content.projects.length}/>
      {content.projects.map((item,index)=><details className="post-editor" key={item.id}><summary><div><span className="experience-order">{String(index+1).padStart(2,"0")}</span><h3>{item.title_zh}</h3></div><span>編輯 +</span></summary><ProjectForm action={updateProjectAction} item={item}/><ItemControls kind="project" id={item.id} index={index} length={content.projects.length} deleteAction={deleteProjectAction}/></details>)}
    </ContentCollection>
    <ContentCollection title="技能管理" count={content.skills.length} kind="skill">
      <SkillForm action={createSkillAction} nextOrder={content.skills.length}/>
      {content.skills.map((item,index)=><details className="post-editor" key={item.id}><summary><div><span className="experience-order">{String(index+1).padStart(2,"0")}</span><h3>{item.name_zh}</h3></div><span>編輯 +</span></summary><SkillForm action={updateSkillAction} item={item}/><ItemControls kind="skill" id={item.id} index={index} length={content.skills.length} deleteAction={deleteSkillAction}/></details>)}
    </ContentCollection>
    <ContentCollection title="聯絡方式管理" count={content.contacts.length} kind="contact">
      <ContactForm action={createContactAction} nextOrder={content.contacts.length}/>
      {content.contacts.map((item,index)=><details className="post-editor" key={item.id}><summary><div><span className="experience-order">{String(index+1).padStart(2,"0")}</span><h3>{item.label} · {item.value}</h3></div><span>編輯 +</span></summary><ContactForm action={updateContactAction} item={item}/><ItemControls kind="contact" id={item.id} index={index} length={content.contacts.length} deleteAction={deleteContactAction}/></details>)}
    </ContentCollection>
    <section className="editor-section"><h2>新增文章</h2><PostForm action={createPostAction} tags={tags} /></section>
    <section className="editor-section"><div className="editor-title"><h2>我的文章</h2><span>共 {posts.length} 篇</span></div>
      {posts.length === 0 ? <p className="empty-state">目前還沒有文章，請從上方編輯器開始撰寫。</p> : posts.map(post => <details className="post-editor" key={post.id}>
        <summary><div><span className={`status ${post.status}`}>{post.status === "published" ? "已發布" : "草稿"}</span><h3>{post.title}</h3></div><span>編輯 +</span></summary>
        <PostForm action={updatePostAction} post={post} tags={tags} />
        <form action={updatePostStatusAction} className="status-toggle-form">
          <input type="hidden" name="id" value={post.id}/>
          <input type="hidden" name="slug" value={post.slug}/>
          <input type="hidden" name="status" value={post.status === "published" ? "draft" : "published"}/>
          <button className="visibility-button" type="submit">{post.status === "published" ? "改為私人文章" : "重新發布文章"}</button>
        </form>
        <form action={deletePostAction}><input type="hidden" name="id" value={post.id}/><button className="danger-button" type="submit">刪除文章</button></form>
      </details>)}
    </section>
    <section className="editor-section tag-admin"><div className="editor-title"><h2>Blog 標籤管理</h2><span>共 {tags.length} 個標籤</span></div>
      <form className="tag-create-form" action={createTagAction}><label>標籤名稱<input required name="name" placeholder="Python"/></label><label>英文代稱<input required name="slug" pattern="[a-z0-9-]+" placeholder="python"/></label><button className="primary-button">建立標籤 →</button></form>
      <div className="tag-admin-list">{tags.length === 0 ? <p className="empty-state">目前還沒有標籤。</p> : tags.map(tag => <article key={tag.id}><span className="tag-chip">#{tag.name}</span><code>{tag.slug}</code><form action={deleteTagAction}><input type="hidden" name="id" value={tag.id}/><button className="danger-button">刪除</button></form></article>)}</div>
    </section>
    <section className="editor-section experience-admin"><div className="editor-title"><h2>Experience 經歷管理</h2><span>共 {experiences.length} 筆</span></div>
      <p className="editor-note">數字越小會排得越前面，也可以使用每筆資料的上移／下移按鈕。</p>
      <ExperienceForm action={createExperienceAction} nextOrder={experiences.length} />
      <div className="experience-admin-list">
        {experiences.length === 0 ? <p className="empty-state">目前還沒有經歷，請從上方表單新增。</p> : experiences.map((experience, index) => <details className="post-editor experience-editor" key={experience.id}>
          <summary><div><span className="experience-order">{String(index + 1).padStart(2, "0")}</span><h3>{experience.title}</h3></div><span>編輯 +</span></summary>
          <ExperienceForm action={updateExperienceAction} experience={experience} />
          <div className="experience-controls">
            <form action={moveExperienceAction}><input type="hidden" name="id" value={experience.id}/><input type="hidden" name="direction" value="up"/><button className="visibility-button" disabled={index === 0}>↑ 上移</button></form>
            <form action={moveExperienceAction}><input type="hidden" name="id" value={experience.id}/><input type="hidden" name="direction" value="down"/><button className="visibility-button" disabled={index === experiences.length - 1}>↓ 下移</button></form>
            <form action={deleteExperienceAction}><input type="hidden" name="id" value={experience.id}/><button className="danger-button" type="submit">刪除經歷</button></form>
          </div>
        </details>)}
      </div>
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

function ContentCollection({title,count,kind,children}:{title:string;count:number;kind:string;children:React.ReactNode}) {
  return <section className={`editor-section site-content-admin ${kind}-admin`}><div className="editor-title"><h2>{title}</h2><span>共 {count} 筆</span></div><p className="editor-note">可編輯繁中與英文內容；使用排序數字或上移／下移調整公開頁顯示順序。</p>{children}</section>;
}

type Content = Awaited<ReturnType<typeof getSiteContent>>;
function ProjectForm({action,item,nextOrder=0}:{action:(formData:FormData)=>Promise<void>;item?:Content["projects"][number];nextOrder?:number}) {
  return <form className="post-form content-item-form" action={action}>{item&&<input type="hidden" name="id" value={item.id}/>}<label>作品名稱（中文）<input required name="titleZh" defaultValue={item?.title_zh}/></label><label>Project title (English)<input required name="titleEn" defaultValue={item?.title_en}/></label><label>作品介紹（中文）<textarea required name="descriptionZh" rows={4} defaultValue={item?.description_zh}/></label><label>Project description (English)<textarea required name="descriptionEn" rows={4} defaultValue={item?.description_en}/></label><label>分類標籤<input required name="tag" defaultValue={item?.tag} placeholder="WEB DESIGN"/></label><label>作品連結<input type="url" name="linkUrl" defaultValue={item?.link_url??""} placeholder="https://...（可留空）"/></label><div className="form-row"><label>顯示順序<input type="number" required step="1" name="sortOrder" defaultValue={item?.sort_order??nextOrder}/></label><button className="primary-button">{item?"儲存作品":"新增作品"} →</button></div></form>;
}

function SkillForm({action,item,nextOrder=0}:{action:(formData:FormData)=>Promise<void>;item?:Content["skills"][number];nextOrder?:number}) {
  return <form className="post-form content-item-form" action={action}>{item&&<input type="hidden" name="id" value={item.id}/>}<label>技能名稱（中文）<input required name="nameZh" defaultValue={item?.name_zh}/></label><label>Skill name (English)<input required name="nameEn" defaultValue={item?.name_en}/></label><label>技能介紹（中文）<textarea required name="descriptionZh" rows={4} defaultValue={item?.description_zh}/></label><label>Skill description (English)<textarea required name="descriptionEn" rows={4} defaultValue={item?.description_en}/></label><div className="form-row"><label>顯示順序<input type="number" required step="1" name="sortOrder" defaultValue={item?.sort_order??nextOrder}/></label><button className="primary-button">{item?"儲存技能":"新增技能"} →</button></div></form>;
}

function ContactForm({action,item,nextOrder=0}:{action:(formData:FormData)=>Promise<void>;item?:Content["contacts"][number];nextOrder?:number}) {
  return <form className="post-form content-item-form compact-content-form" action={action}>{item&&<input type="hidden" name="id" value={item.id}/>}<label>聯絡方式名稱<input required name="label" defaultValue={item?.label} placeholder="EMAIL / GITHUB / DISCORD"/></label><label>顯示內容<input required name="value" defaultValue={item?.value} placeholder="帳號或顯示文字"/></label><label>點擊連結<input name="linkUrl" defaultValue={item?.link_url??""} placeholder="https://... 或 mailto:...（可留空）"/></label><label>顯示順序<input type="number" required step="1" name="sortOrder" defaultValue={item?.sort_order??nextOrder}/></label><button className="primary-button">{item?"儲存聯絡方式":"新增聯絡方式"} →</button></form>;
}

function ItemControls({kind,id,index,length,deleteAction}:{kind:"project"|"skill"|"contact";id:number;index:number;length:number;deleteAction:(formData:FormData)=>Promise<void>}) {
  return <div className="experience-controls"><form action={moveSiteItemAction}><input type="hidden" name="kind" value={kind}/><input type="hidden" name="id" value={id}/><input type="hidden" name="direction" value="up"/><button className="visibility-button" disabled={index===0}>↑ 上移</button></form><form action={moveSiteItemAction}><input type="hidden" name="kind" value={kind}/><input type="hidden" name="id" value={id}/><input type="hidden" name="direction" value="down"/><button className="visibility-button" disabled={index===length-1}>↓ 下移</button></form><form action={deleteAction}><input type="hidden" name="id" value={id}/><button className="danger-button">刪除</button></form></div>;
}

function ExperienceForm({ action, experience, nextOrder = 0 }: { action: (formData: FormData) => Promise<void>; experience?: Awaited<ReturnType<typeof listExperiences>>[number]; nextOrder?: number }) {
  return <form className="post-form experience-form" action={action}>
    {experience && <input type="hidden" name="id" value={experience.id}/>} 
    <label>經歷標題<input required name="title" defaultValue={experience?.title} placeholder="例如：SITCON 開發組"/></label>
    <label>單位／組織<input name="organization" defaultValue={experience?.organization} placeholder="學校、社團或活動名稱"/></label>
    <label>開始日期<input required type="date" name="startDate" defaultValue={experience?.start_date}/></label>
    <label>結束日期<input type="date" name="endDate" defaultValue={experience?.end_date ?? ""}/><small>進行中可留空</small></label>
    <label>地點<input name="location" defaultValue={experience?.location} placeholder="Taipei, Taiwan 或 Remote"/></label>
    <label>相關連結<input type="url" name="linkUrl" defaultValue={experience?.link_url ?? ""} placeholder="https://example.com（可留空）"/></label>
    <label className="wide-field">經歷介紹<textarea required name="description" defaultValue={experience?.description} rows={5} placeholder="簡短說明你做了什麼、學到什麼。"/></label>
    <div className="form-row"><label>顯示順序<input required type="number" name="sortOrder" defaultValue={experience?.sort_order ?? nextOrder} step="1"/></label><button className="primary-button" type="submit">{experience ? "儲存經歷" : "新增經歷"} →</button></div>
  </form>;
}

function PostForm({ action, post, tags }: { action: (formData: FormData) => Promise<void>; post?: Awaited<ReturnType<typeof listAllPosts>>[number]; tags: Awaited<ReturnType<typeof listTags>> }) {
  return <form className="post-form" action={action}>
    {post && <input type="hidden" name="id" value={post.id}/>}<label>文章標題<input required name="title" defaultValue={post?.title} placeholder="我從第一個專案學到的事"/></label>
    <label>網址代稱（英文）<input required name="slug" defaultValue={post?.slug} placeholder="my-first-project" pattern="[a-z0-9-]+"/></label>
    <label>簡短介紹<textarea name="excerpt" defaultValue={post?.excerpt} rows={2} placeholder="顯示在首頁的文章簡介。"/></label>
    <label className="content-label">文章內容（Markdown）<MarkdownEditor defaultValue={post?.content ?? ""}/></label>
    <CoverImageField existingCover={post?.cover_image ?? null}/>
    <GalleryUploadField existingItems={post?.gallery ?? []}/>
    <fieldset className="tag-picker"><legend>文章標籤（可複選）</legend>{tags.length === 0 ? <p>請先在下方建立標籤。</p> : tags.map(tag => <label key={tag.id}><input type="checkbox" name="tagIds" value={tag.id} defaultChecked={post?.tags.some(selected => selected.id === tag.id)}/><span>#{tag.name}</span></label>)}</fieldset>
    <div className="form-row"><label>文章狀態<select name="status" defaultValue={post?.status ?? "draft"}><option value="draft">草稿</option><option value="published">已發布</option></select></label><button className="primary-button" type="submit">{post ? "儲存變更" : "建立文章"} →</button></div>
  </form>;
}
