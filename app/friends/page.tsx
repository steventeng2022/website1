import LanguageToggle from "../language-toggle";
import { listFriends } from "../../db/friends";

export const dynamic = "force-dynamic";

export default async function FriendsPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const { lang } = await searchParams;
  const en = lang === "en";
  const friends = await listFriends();

  return (
    <main className="friends-shell">
      <header className="site-header">
        <a className="brand" href={en ? "/?lang=en" : "/"} aria-label={en ? "Steven home" : "Steven 首頁"}>
          STEVEN
        </a>
        <nav aria-label={en ? "Friends page navigation" : "Friends 頁面導覽列"}>
          <a href={en ? "/?lang=en" : "/"}>{en ? "Home" : "首頁"}</a>
          <a href={en ? "/experience?lang=en" : "/experience"}>{en ? "Experience" : "經歷"}</a>
          <a className="active-nav" href={en ? "/friends?lang=en" : "/friends"}>Friends</a>
          <LanguageToggle />
        </nav>
      </header>

      <section className="friends-hero">
        <p className="eyebrow">{en ? "COLLABORATORS · CREATORS · FRIENDS" : "合作夥伴 · 創作者 · 朋友"}</p>
        <h1>Friends.</h1>
        <p className="friends-intro">
          {en
            ? "A collection of websites made by friends and creators I have collaborated with."
            : "收藏曾與我合作的朋友與創作者所製作的網站。"}
        </p>
      </section>

      <section className="friends-list" aria-label={en ? "Friend websites" : "朋友網站列表"}>
        <div className="section-kicker"><span>01</span> {en ? "WEBSITES" : "合作網站"}</div>
        <div className="friend-grid">
          {friends.length === 0 ? <div className="blog-empty"><p>{en ? "No friend websites yet." : "目前還沒有 Friends 網站。"}</p><span>{en ? "New collaborators will appear here." : "新增合作網站後會顯示在這裡。"}</span></div> : friends.map((friend, index) => (
            <article className="friend-card" key={friend.id}>
              <div className="friend-card-top">
                <span className="friend-index">{String(index + 1).padStart(2, "0")}</span>
                <img src={friend.logo_url} alt={`${friend.site_name} logo`} width="80" height="80" />
              </div>
              <div className="friend-card-copy">
                <p className="project-tag">{en ? "COLLABORATE WEBSITE" : "合作網站"}</p>
                <h2>{friend.site_name}</h2>
                <p>{friend.description}</p>
              </div>
              <a className="friend-url" href={friend.site_url} target="_blank" rel="noopener noreferrer">
                <span>{friend.site_url.replace(/^https?:\/\//, "").replace(/\/$/, "")}</span>
                <span aria-hidden="true">↗</span>
              </a>
            </article>
          ))}
        </div>
      </section>

      <footer className="friends-footer">
        <span>© 2026 STEVEN</span>
        <a href={en ? "/?lang=en" : "/"}>{en ? "BACK HOME" : "回到首頁"} →</a>
      </footer>
    </main>
  );
}
