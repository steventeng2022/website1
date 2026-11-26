import type { Metadata } from "next";
import { Geist, Geist_Mono, Press_Start_2P } from "next/font/google";
import MusicPlayer from "./music-player";
import VisitorTracker from "./visitor-tracker";
import PublicSiteStatus from "./public-site-status";
import { ThemeSync } from "./theme-toggle";
import { themeInitScript } from "./theme";
import SiteMotion from "./site-motion";
import DocumentLanguage from "./document-language";
import { listPublicMusicTracks } from "../db/music";
import { getThemeSettings } from "../db/theme";
import { getTheme, themeStyle } from "./themes";
import "./globals.css";
import "./music-player.css";
import "./premium.css";
import "./site-header.css";
import "./theme-mario.css";
import "./theme.css";
import "./admin/admin-feedback.css";
import "./recovery.css";
import "./motion-3d.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Pixel font for the optional "mario" theme. It is only fetched when a glyph uses it.
const pixelFont = Press_Start_2P({
  variable: "--font-pixel",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

// Google Tag Manager for public pages only: the private studio under /admin is never tagged.
const googleTagScript = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag("js",new Date());var p=location.pathname;if(p!=="/admin"&&p.indexOf("/admin/")!==0){var s=document.createElement("script");s.async=true;s.src="https://www.googletagmanager.com/gtm.js?id=GTM-P4HZ4DZ5";document.head.appendChild(s)}`;

export const metadata: Metadata = {
  title: "Steven — 學生、程式設計與創作",
  description: "Steven 的個人網站：程式設計、AI、Arduino 與 Raspberry Pi。",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "16x16 32x32 48x48", type: "image/x-icon" },
      { url: "/favicon.svg", sizes: "any", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.ico",
    apple: { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [tracks, themeSettings] = await Promise.all([listPublicMusicTracks().catch(() => {
    // Music is optional; a playlist outage must not take down every page.
    console.error("Public playlist unavailable; rendering the page without site tracks.");
    return [];
  }), getThemeSettings()]);
  const siteTheme = getTheme(themeSettings.theme);
  const custom = siteTheme.id !== "classic" || Boolean(themeSettings.accent);
  return (
    <DocumentLanguage siteTheme={siteTheme.id} siteScheme={siteTheme.id === "classic" ? undefined : siteTheme.scheme} style={custom ? themeStyle(themeSettings.theme, themeSettings.accent) : undefined}>
      <head><script dangerouslySetInnerHTML={{ __html: themeInitScript }} /><script dangerouslySetInnerHTML={{ __html: googleTagScript }} /></head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${pixelFont.variable} antialiased`}
      >
        <ThemeSync />
        <SiteMotion />
        {children}
        <PublicSiteStatus />
        <VisitorTracker />
        {siteTheme.id === "mario" && <><script src="/mario-world.js?v=2" defer /><script src="/mario-game.js?v=2" defer /></>}
        <MusicPlayer tracks={tracks.map(track=>({id:track.id,title:track.title,artist:track.artist,src:track.audio_url,cover:track.cover_url}))}/>
      </body>
    </DocumentLanguage>
  );
}
