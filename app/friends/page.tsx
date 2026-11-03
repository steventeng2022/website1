import SiteHeader from "../site-header";
import { listFriends } from "../../db/friends";
import Link from "next/link";

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
      <SiteHeader en={en} active="friends" />

      <section className="friends-hero page-intro" id="main-content">
        <div className="page-heading-meta"><p className="eyebrow">{en ? "COLLABORATORS · CREATORS · FRIENDS" : "合作夥伴 · 創作者 · 朋友"}</p><span className="page-index">04 / FRIENDS</span></div>
        <h1>Friends.</h1>
        <div className="page-intro-footer"><p className="friends-intro">
          {en
            ? "Good things happen when curious people meet. A small corner of the internet for friends and creators I’ve worked with."
            : "有趣的人相遇，讓好點子發生。在網路的一角，收藏與我一起創作的朋友和他們的網站。"}
        </p><span className="page-index">{en ? "BETTER TOGETHER" : "一起創作，一起成長"} ↘</span></div>
      </section>

      <section className="friends-list" aria-label={en ? "Friend websites" : "朋友網站列表"}>
        <div className="section-kicker"><span>01</span> {en ? "WEBSITES" : "合作網站"}</div>
        <div className="friend-grid">
          {friends.length === 0 ? <div className="blog-empty"><p>{en ? "Room for new connections." : "留一個位置，給新的相遇。"}</p><span>{en ? "Friends and their websites will appear here." : "朋友們的網站，會慢慢收藏在這裡。"}</span></div> : friends.map((friend, index) => (
            <article className="friend-card" key={friend.id}>
              <div className="friend-card-top">
                <span className="friend-index">{String(index + 1).padStart(2, "0")}</span>
                <img src={friend.logo_url} alt={`${friend.site_name} logo`} width="80" height="80" loading="lazy" decoding="async" />
              </div>
              <div className="friend-card-copy">
                <p className="project-tag">{en ? "FRIEND OF THE SITE" : "一起創作的朋友"}</p>
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
        <Link href={en ? "/?lang=en" : "/"}>{en ? "BACK HOME" : "回到首頁"} →</Link>
      </footer>
    </main>
  );
}
