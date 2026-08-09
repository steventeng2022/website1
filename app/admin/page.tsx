import { requireAdmin } from "../cloudflare-auth";
import { listAllPosts } from "../../db/posts";
import { listFriends } from "../../db/friends";
import { listExperiences } from "../../db/experiences";
import { listTags } from "../../db/tags";
import { getSiteContent } from "../../db/site-content";
import { createContactAction, createExperienceAction, createFriendAction, createProjectAction, createSkillAction, createTagAction, deleteContactAction, deleteExperienceAction, deleteFriendAction, deletePostAction, deleteProjectAction, deleteSkillAction, deleteTagAction, moveExperienceAction, moveSiteItemAction, updateContactAction, updateExperienceAction, updatePostStatusAction, updateProjectAction, updateSiteProfileAction, updateSkillAction } from "./actions";
import CoverImageField from "./cover-image-field";
import ProjectCoverField from "./project-cover-field";
import GalleryUploadField from "./gallery-upload-field";
import BlogPasswordField from "./blog-password-field";
import MarkdownEditor from "./markdown-editor";
import Link from "next/link";
import PostSaveForm from "./post-save-form";
import MusicUploadField from "./music-upload-field";
import { listAllMusicTracks, listSongRequests } from "../../db/music";
import { createMusicTrackAction, deleteMusicTrackAction, deleteSongRequestAction, moveMusicTrackAction, setSongRequestStatusAction, updateMusicTrackAction } from "./actions";
import { getAnalyticsSummary, listAdminLogs, listVisitorLogs, logAdminActivity } from "../../db/analytics";
import SiteUptime from "../site-uptime";

export const dynamic = "force-dynamic";
type AdminSection = "overview" | "analytics" | "visitors" | "blog" | "portfolio" | "site" | "experience" | "music" | "friends";

const adminSections: { id: AdminSection; label: string; hint: string }[] = [
  { id: "overview", label: "總覽", hint: "Dashboard" },
  { id: "analytics", label: "網站狀態", hint: "Visits & logs" },
  { id: "visitors", label: "訪客紀錄", hint: "Visitor details" },
  { id: "blog", label: "文章", hint: "Posts & tags" },
  { id: "portfolio", label: "作品集", hint: "Projects" },
  { id: "site", label: "網站內容", hint: "About & skills" },
  { id: "experience", label: "經歷", hint: "Timeline" },
  { id: "music", label: "音樂", hint: "Tracks & requests" },
  { id: "friends", label: "Friends", hint: "Links" },
];

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ saved?: string; section?: string }> }) {
  const email = await requireAdmin();
  const params = await searchParams;
  const requestedSection = params.section as AdminSection | undefined;
  const activeSection = adminSections.some(item => item.id === requestedSection) ? requestedSection! : "overview";
  const posts = await listAllPosts();
  const friends = await listFriends();
  const experiences = await listExperiences();
  const tags = await listTags();
  const content = await getSiteContent();
  const [musicTracks,songRequests,analytics,adminLogs,visitorLogs]=await Promise.all([listAllMusicTracks(),listSongRequests(),getAnalyticsSummary(),listAdminLogs(),listVisitorLogs()]);
  await logAdminActivity(email, "開啟後台", adminSections.find(item=>item.id===activeSection)?.label ?? activeSection);
  const newRequests = songRequests.filter(item=>item.status==="new").length;
  return <main className="admin-shell">
    <header className="admin-top"><Link className="brand" href="/">STEVEN</Link><div><span>{email}</span><a href="/cdn-cgi/access/logout">登出</a></div></header>
    <div className="admin-workspace">
      <aside className="admin-sidebar" aria-label="後台分類">
        <div className="admin-sidebar-title"><span>CONTENT STUDIO</span><strong>管理中心</strong></div>
        <nav className="admin-nav">{adminSections.map(item=><Link key={item.id} href={`/admin?section=${item.id}`} className={activeSection===item.id?"active":""} aria-current={activeSection===item.id?"page":undefined}><span>{item.label}</span><small>{item.hint}</small>{item.id==="music"&&newRequests>0?<b>{newRequests}</b>:null}</Link>)}</nav>
        <Link className="admin-view-site" href="/">查看公開網站 ↗</Link>
      </aside>
      <div className="admin-content">
        {(params.saved === "post") && <p className="admin-save-success" role="status">文章已成功儲存，公開頁面已更新。</p>}

    {activeSection === "overview" && <section className="admin-overview">
      <div className="admin-page-heading"><p className="eyebrow">DASHBOARD</p><h1>網站管理總覽</h1><p>選擇一個區域開始編輯，不需要再從整頁內容中尋找。</p></div>
      <div className="admin-stat-grid">
        <AdminCard href="analytics" label="目前在線" value={analytics.onlineNow} note={`累積 ${analytics.totalViews.toLocaleString("zh-TW")} 次瀏覽`} alert={analytics.onlineNow>0}/>
        <AdminCard href="blog" label="文章" value={posts.length} note={`${posts.filter(post=>post.status==="draft").length} 篇草稿`}/>
        <AdminCard href="portfolio" label="作品" value={content.projects.length} note={`${content.projects.filter(item=>item.featured).length} 個精選`}/>
        <AdminCard href="experience" label="經歷" value={experiences.length} note="時間軸項目"/>
        <AdminCard href="music" label="網站歌曲" value={musicTracks.length} note={`${newRequests} 則推薦待處理`} alert={newRequests>0}/>
        <AdminCard href="site" label="技能" value={content.skills.length} note={`${content.contacts.length} 種聯絡方式`}/>
        <AdminCard href="friends" label="Friends" value={friends.length} note="合作網站"/>
      </div>
      <div className="admin-quick-actions"><h2>快速開始</h2><div><Link href="/admin?section=analytics">查看網站狀態</Link><Link href="/admin?section=blog#new-post">＋ 撰寫新文章</Link><Link href="/admin?section=portfolio#new-project">＋ 新增作品</Link><Link href="/admin?section=music#new-track">＋ 上傳歌曲</Link></div></div>
    </section>}

    {activeSection === "analytics" && <section className="analytics-admin">
      <div className="admin-page-heading"><p className="eyebrow">SITE STATUS</p><h1>網站狀態與紀錄</h1><p>查看匿名流量、Blog 閱讀情況、目前在線人數與管理員操作紀錄。</p></div>
      <div className="analytics-metrics">
        <Metric label="目前在線" value={analytics.onlineNow} note="最近 2 分鐘有活動" live/>
        <Metric label="總瀏覽量" value={analytics.totalViews} note="所有公開頁面"/>
        <Metric label="今日瀏覽" value={analytics.todayViews} note="以 UTC 日期統計"/>
        <Metric label="獨立訪客" value={analytics.uniqueVisitors} note="匿名瀏覽器估算"/>
        <Metric label="Blog 閱讀" value={analytics.blogViews} note="所有文章合計"/>
      </div>
      <section className="uptime-panel"><div><p className="eyebrow">UPTIME</p><h2>網站已上線</h2><p>自 2026 年 7 月 31 日起</p></div><SiteUptime/></section>
      <div className="analytics-columns">
        <section className="analytics-panel"><div className="editor-title"><h2>最近 7 天</h2><span>瀏覽趨勢</span></div>
          {analytics.daily.length===0?<p className="empty-state">部署新版後，這裡會開始累積瀏覽資料。</p>:<div className="daily-bars">{analytics.daily.map(day=>{const max=Math.max(...analytics.daily.map(item=>item.views),1);return <article key={day.day}><div><time>{day.day.slice(5)}</time><span>{day.visitors} 位訪客</span><strong>{day.views}</strong></div><i style={{width:`${Math.max(5,day.views/max*100)}%`}}/></article>})}</div>}
        </section>
        <section className="analytics-panel"><div className="editor-title"><h2>熱門頁面</h2><span>TOP 10</span></div>
          {analytics.popular.length===0?<p className="empty-state">目前還沒有瀏覽紀錄。</p>:<div className="popular-pages">{analytics.popular.map((item,index)=><article key={item.path}><b>{String(index+1).padStart(2,"0")}</b><div><strong>{item.blog_slug?`Blog：${item.blog_slug}`:pageLabel(item.path)}</strong><code>{item.path}</code></div><span>{item.views} 次<br/><small>{item.visitors} 人</small></span></article>)}</div>}
        </section>
      </div>
      <section className="analytics-panel admin-log-panel"><div className="editor-title"><h2>管理員紀錄</h2><span>最近 {adminLogs.length} 筆</span></div>
        <p className="editor-note">記錄後台登入與內容管理操作，不會顯示或保存密碼。</p>
        <div className="admin-log-list">{adminLogs.map(log=><article key={log.id}><time>{new Date(log.created_at).toLocaleString("zh-TW",{timeZone:"Asia/Taipei"})}</time><strong>{log.action}</strong><span>{log.detail}</span><small>{log.admin_email}</small></article>)}</div>
      </section>
    </section>}

    {activeSection === "visitors" && <section className="analytics-admin visitor-admin">
      <div className="admin-page-heading"><p className="eyebrow">VISITOR LOG</p><h1>訪客紀錄</h1><p>最近 {visitorLogs.length} 筆造訪，包含 IP、裝置、瀏覽器、系統、來源與顯示環境。</p></div>
      <div className="visitor-privacy-note"><strong>資料保護</strong><span>紀錄只限管理員查看並最長保存 90 天。公開頁尾會持續顯示蒐集項目、用途與資料權利聯絡方式。</span></div>
      {visitorLogs.length === 0 ? <section className="analytics-panel"><p className="empty-state">目前還沒有訪客紀錄。部署新版後會開始累積。</p></section> : <div className="visitor-log-list">
        {visitorLogs.map(log => <article key={log.id} className="visitor-log-card">
          <header><div><span className="consent-badge automatic">自動記錄</span><strong>{pageLabel(log.path)}</strong><code>{log.path}</code></div><div><time>{new Date(log.visited_at).toLocaleString("zh-TW",{timeZone:"Asia/Taipei"})}</time><small>停留 {formatDuration(log.duration_seconds)}</small></div></header>
          <dl>
            <VisitorDetail label="IP 位址" value={log.ip_address}/><VisitorDetail label="匿名訪客" value={`${log.visitor_hash.slice(0,10)}…`}/>
            <VisitorDetail label="裝置" value={log.device}/>
            <VisitorDetail label="瀏覽器" value={log.browser}/><VisitorDetail label="作業系統" value={log.os}/>
            <VisitorDetail label="語言" value={log.language}/><VisitorDetail label="時區" value={log.timezone}/>
            <VisitorDetail label="國家代碼" value={log.country}/><VisitorDetail label="來源" value={log.referrer_host}/>
            <VisitorDetail label="螢幕級距" value={log.screen_size}/><VisitorDetail label="視窗級距" value={log.viewport_size}/>
            <VisitorDetail label="顯示模式" value={log.color_scheme}/><VisitorDetail label="網路" value={log.connection_type}/>
            <VisitorDetail label="觸控" value={log.touch_enabled == null ? null : log.touch_enabled ? "支援" : "不支援"}/>
          </dl>
        </article>)}
      </div>}
    </section>}

    {activeSection === "site" && <div className="admin-section-stack"><section className="editor-section content-profile-admin"><div className="editor-title"><h2>關於我與頁面文案</h2><span>繁中＋英文</span></div>
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
    <ContentCollection title="技能管理" count={content.skills.length} kind="skill">
      <SkillForm action={createSkillAction} nextOrder={content.skills.length}/>
      {content.skills.map((item,index)=><details className="post-editor" key={item.id}><summary><div><span className="experience-order">{String(index+1).padStart(2,"0")}</span><h3>{item.name_zh}</h3></div><span>編輯 +</span></summary><SkillForm action={updateSkillAction} item={item}/><ItemControls kind="skill" id={item.id} index={index} length={content.skills.length} deleteAction={deleteSkillAction}/></details>)}
    </ContentCollection>
    <ContentCollection title="聯絡方式管理" count={content.contacts.length} kind="contact">
      <ContactForm action={createContactAction} nextOrder={content.contacts.length}/>
      {content.contacts.map((item,index)=><details className="post-editor" key={item.id}><summary><div><span className="experience-order">{String(index+1).padStart(2,"0")}</span><h3>{item.label} · {item.value}</h3></div><span>編輯 +</span></summary><ContactForm action={updateContactAction} item={item}/><ItemControls kind="contact" id={item.id} index={index} length={content.contacts.length} deleteAction={deleteContactAction}/></details>)}
    </ContentCollection></div>}

    {activeSection === "portfolio" && <div className="admin-section-stack" id="new-project"><ContentCollection title="作品管理" count={content.projects.length} kind="project">
      <ProjectForm action={createProjectAction} posts={posts} nextOrder={content.projects.length}/>
      {content.projects.map((item,index)=><details className="post-editor" key={item.id}><summary><div><span className="experience-order">{String(index+1).padStart(2,"0")}</span><h3>{item.title_zh}</h3>{item.featured ? <span className="status published">精選</span> : null}</div><span>編輯 +</span></summary><ProjectForm action={updateProjectAction} posts={posts} item={item}/><ItemControls kind="project" id={item.id} index={index} length={content.projects.length} deleteAction={deleteProjectAction}/></details>)}
    </ContentCollection></div>}

    {activeSection === "music" && <div className="admin-section-stack"><section className="editor-section music-admin" id="new-track"><div className="editor-title"><h2>網站歌曲設定</h2><span>共 {musicTracks.length} 首</span></div>
      <p className="editor-note">這裡上傳的歌曲會顯示給所有訪客；訪客自行加入的歌曲只會留在他們自己的裝置。</p>
      <MusicTrackForm action={createMusicTrackAction} nextOrder={musicTracks.length}/>
      <div className="music-admin-list">{musicTracks.map((track,index)=><details className="post-editor" key={track.id}><summary><div><span className="experience-order">{String(index+1).padStart(2,"0")}</span><h3>{track.title} — {track.artist}</h3><span className={`status ${track.enabled?"published":"draft"}`}>{track.enabled?"公開":"停用"}</span></div><span>編輯 +</span></summary>
        <MusicTrackForm action={updateMusicTrackAction} track={track}/><div className="experience-controls"><form action={moveMusicTrackAction}><input type="hidden" name="id" value={track.id}/><input type="hidden" name="direction" value="up"/><button className="visibility-button" disabled={index===0}>↑ 上移</button></form><form action={moveMusicTrackAction}><input type="hidden" name="id" value={track.id}/><input type="hidden" name="direction" value="down"/><button className="visibility-button" disabled={index===musicTracks.length-1}>↓ 下移</button></form><form action={deleteMusicTrackAction}><input type="hidden" name="id" value={track.id}/><button className="danger-button">刪除歌曲</button></form></div>
      </details>)}</div>
    </section>
    <section className="editor-section song-request-admin"><div className="editor-title"><h2>歌曲推薦收件匣</h2><span>{songRequests.filter(item=>item.status==="new").length} 則未處理</span></div>
      <p className="editor-note">訪客只能推薦歌名與連結，不能直接修改網站共用歌單。</p>
      <div className="song-request-list">{songRequests.length===0?<p className="empty-state">目前還沒有歌曲推薦。</p>:songRequests.map(item=><article className={item.status==="reviewed"?"is-reviewed":""} key={item.id}><div><span>{item.status==="new"?"NEW":"已處理"}</span><h3>{item.title} — {item.artist}</h3><time>{new Date(item.created_at).toLocaleDateString("zh-TW")}</time></div>{item.link_url&&<a href={item.link_url} target="_blank" rel="noopener noreferrer">開啟歌曲連結 ↗</a>}{item.message&&<p>{item.message}</p>}<div className="experience-controls"><form action={setSongRequestStatusAction}><input type="hidden" name="id" value={item.id}/><input type="hidden" name="status" value={item.status==="new"?"reviewed":"new"}/><button className="visibility-button">{item.status==="new"?"標記已處理":"標記未處理"}</button></form><form action={deleteSongRequestAction}><input type="hidden" name="id" value={item.id}/><button className="danger-button">刪除</button></form></div></article>)}</div>
    </section></div>}

    {activeSection === "blog" && <div className="admin-section-stack"><section className="editor-section" id="new-post"><h2>新增文章</h2><PostForm mode="create" tags={tags} /></section>
    <section className="editor-section"><div className="editor-title"><h2>我的文章</h2><span>共 {posts.length} 篇</span></div>
      {posts.length === 0 ? <p className="empty-state">目前還沒有文章，請從上方編輯器開始撰寫。</p> : posts.map(post => <details className="post-editor" key={post.id}>
        <summary><div><span className={`status ${post.status}`}>{post.status === "published" ? "已發布" : "草稿"}</span><h3>{post.title}</h3></div><span>編輯 +</span></summary>
        <PostForm mode="update" post={post} tags={tags} />
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
    </section></div>}

    {activeSection === "experience" && <section className="editor-section experience-admin"><div className="editor-title"><h2>Experience 經歷管理</h2><span>共 {experiences.length} 筆</span></div>
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
    </section>}

    {activeSection === "friends" && <section className="editor-section friends-admin"><div className="editor-title"><h2>Friends 網站管理</h2><span>共 {friends.length} 個網站</span></div>
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
    </section>}
      </div>
    </div>
  </main>;
}

function AdminCard({href,label,value,note,alert=false}:{href:AdminSection;label:string;value:number;note:string;alert?:boolean}) {
  return <Link href={`/admin?section=${href}`} className={`admin-stat-card${alert?" has-alert":""}`}><span>{label}</span><strong>{value}</strong><small>{note}</small><b aria-hidden="true">↗</b></Link>;
}

function Metric({label,value,note,live=false}:{label:string;value:number;note:string;live?:boolean}) {
  return <article className="analytics-metric"><span>{live?<i/>:null}{label}</span><strong>{value.toLocaleString("zh-TW")}</strong><small>{note}</small></article>;
}

function pageLabel(path:string) {
  const labels:Record<string,string>={"/":"首頁","/blog":"Blog 列表","/portfolio":"作品集","/experience":"經歷","/friends":"Friends"};
  return labels[path]??path;
}

function VisitorDetail({label,value}:{label:string;value:string|null}) {
  return <div><dt>{label}</dt><dd>{value || "未蒐集"}</dd></div>;
}

function formatDuration(seconds:number) {
  const safe=Math.max(0,seconds||0); const minutes=Math.floor(safe/60); const rest=safe%60;
  return minutes ? `${minutes} 分 ${rest} 秒` : `${rest} 秒`;
}

function ContentCollection({title,count,kind,children}:{title:string;count:number;kind:string;children:React.ReactNode}) {
  return <section className={`editor-section site-content-admin ${kind}-admin`}><div className="editor-title"><h2>{title}</h2><span>共 {count} 筆</span></div><p className="editor-note">可編輯繁中與英文內容；使用排序數字或上移／下移調整公開頁顯示順序。</p>{children}</section>;
}

type MusicTrack=Awaited<ReturnType<typeof listAllMusicTracks>>[number];
function MusicTrackForm({action,track,nextOrder=0}:{action:(formData:FormData)=>Promise<void>;track?:MusicTrack;nextOrder?:number}){
  return <form className="post-form music-track-form" action={action}>{track&&<input type="hidden" name="id" value={track.id}/>}<label>歌名<input required name="title" defaultValue={track?.title}/></label><label>歌手／作者<input required name="artist" defaultValue={track?.artist}/></label><MusicUploadField existingAudio={track?.audio_url} existingCover={track?.cover_url??""}/><label className="featured-check"><input type="checkbox" name="enabled" value="yes" defaultChecked={track?Boolean(track.enabled):true}/><span>在所有訪客的網站歌單中啟用</span></label><div className="form-row"><label>播放順序<input type="number" required step="1" name="sortOrder" defaultValue={track?.sort_order??nextOrder}/></label><button className="primary-button">{track?"儲存歌曲":"新增至網站歌單"} →</button></div></form>;
}

type Content = Awaited<ReturnType<typeof getSiteContent>>;
function ProjectForm({action,posts,item,nextOrder=0}:{action:(formData:FormData)=>Promise<void>;posts:Awaited<ReturnType<typeof listAllPosts>>;item?:Content["projects"][number];nextOrder?:number}) {
  return <form className="post-form content-item-form project-editor-form" action={action}>
    {item&&<input type="hidden" name="id" value={item.id}/>}<label>作品名稱（中文）<input required name="titleZh" defaultValue={item?.title_zh}/></label><label>Project title (English)<input required name="titleEn" defaultValue={item?.title_en}/></label>
    <label>作品介紹（中文）<textarea required name="descriptionZh" rows={4} defaultValue={item?.description_zh}/></label><label>Project description (English)<textarea required name="descriptionEn" rows={4} defaultValue={item?.description_en}/></label>
    <label>作品分類<input required name="tag" defaultValue={item?.tag} placeholder="網站 / AI / 硬體"/></label><label>技術標籤<input name="technologies" defaultValue={item?.technologies} placeholder="Next.js, Cloudflare, D1（用逗號分隔）"/></label>
    <ProjectCoverField existingCover={item?.cover_image ?? null}/>
    <label>作品／Demo 網址<input type="url" name="linkUrl" defaultValue={item?.link_url??""} placeholder="https://...（可留空）"/></label><label>GitHub 網址<input type="url" name="githubUrl" defaultValue={item?.github_url??""} placeholder="https://github.com/...（可留空）"/></label>
    <label>相關 Blog 文章<select name="blogSlug" defaultValue={item?.blog_slug ?? ""}><option value="">不連結文章</option>{posts.filter((post) => post.status === "published" || post.slug === item?.blog_slug).map((post)=><option key={post.id} value={post.slug} disabled={post.status === "draft"}>{post.title}{post.status === "draft" ? "（草稿，公開前無法連結）" : ""}</option>)}</select><small>只連結已發布文章，避免訪客看到找不到頁面。</small></label>
    <label>完成日期<input type="month" name="completedAt" defaultValue={item?.completed_at ?? ""}/></label>
    <label className="featured-check"><input type="checkbox" name="featured" value="yes" defaultChecked={Boolean(item?.featured)}/><span>設為精選作品（顯示在首頁「關於我」下方）</span></label>
    <div className="form-row"><label>顯示順序<input type="number" required step="1" name="sortOrder" defaultValue={item?.sort_order??nextOrder}/></label><button className="primary-button">{item?"儲存作品":"新增作品"} →</button></div>
  </form>;
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

function PostForm({ mode, post, tags }: { mode: "create" | "update"; post?: Awaited<ReturnType<typeof listAllPosts>>[number]; tags: Awaited<ReturnType<typeof listTags>> }) {
  return <PostSaveForm mode={mode}>
    {post && <input type="hidden" name="id" value={post.id}/>}<label>文章標題<input required name="title" defaultValue={post?.title} placeholder="我從第一個專案學到的事"/></label>
    <label>網址代稱（英文）<input required name="slug" defaultValue={post?.slug} placeholder="my-first-project" pattern="[a-z0-9-]+"/></label>
    <label>簡短介紹<textarea name="excerpt" defaultValue={post?.excerpt} rows={2} placeholder="顯示在首頁的文章簡介。"/></label>
    <label className="content-label">文章內容（Markdown）<MarkdownEditor defaultValue={post?.content ?? ""}/></label>
    <CoverImageField existingCover={post?.cover_image ?? null}/>
    <GalleryUploadField existingItems={post?.gallery ?? []}/>
    <BlogPasswordField existing={post?.passwords ?? []}/>
    <fieldset className="tag-picker"><legend>文章標籤（可複選）</legend>{tags.length === 0 ? <p>請先在下方建立標籤。</p> : tags.map(tag => <label key={tag.id}><input type="checkbox" name="tagIds" value={tag.id} defaultChecked={post?.tags.some(selected => selected.id === tag.id)}/><span>#{tag.name}</span></label>)}</fieldset>
    <div className="form-row"><label>文章狀態<select name="status" defaultValue={post?.status ?? "draft"}><option value="draft">草稿</option><option value="published">已發布</option></select></label></div>
  </PostSaveForm>;
}
