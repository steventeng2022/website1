import LanguageToggle from "../language-toggle";

type FriendSite = {
  siteName: string;
  siteUrl: string;
  logoUrl: string;
  description: string;
  descriptionEn: string;
};

// Add or edit friend websites here. Copy one object for every new website.
const friends: FriendSite[] = [
  {
    siteName: "Your Friend's Website",
    siteUrl: "https://example.com",
    logoUrl: "https://www.google.com/s2/favicons?domain=example.com&sz=256",
    description: "這是一筆範例資料。把這裡改成朋友網站的簡短介紹。",
    descriptionEn: "This is an example. Replace it with a short introduction to your friend's website.",
  },
];

export default async function FriendsPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const { lang } = await searchParams;
  const en = lang === "en";

  return (
    <main className="friends-shell">
      <header className="site-header">
        <a className="brand" href={en ? "/?lang=en" : "/"} aria-label={en ? "Steven home" : "Steven 首頁"}>
          STEVEN
        </a>
        <nav aria-label={en ? "Friends page navigation" : "Friends 頁面導覽列"}>
          <a href={en ? "/?lang=en" : "/"}>{en ? "Home" : "首頁"}</a>
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
          {friends.map((friend, index) => (
            <article className="friend-card" key={friend.siteUrl}>
              <div className="friend-card-top">
                <span className="friend-index">{String(index + 1).padStart(2, "0")}</span>
                <img src={friend.logoUrl} alt={`${friend.siteName} logo`} width="80" height="80" />
              </div>
              <div className="friend-card-copy">
                <p className="project-tag">{en ? "COLLABORATE WEBSITE" : "合作網站"}</p>
                <h2>{friend.siteName}</h2>
                <p>{en ? friend.descriptionEn : friend.description}</p>
              </div>
              <a className="friend-url" href={friend.siteUrl} target="_blank" rel="noopener noreferrer">
                <span>{friend.siteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}</span>
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
