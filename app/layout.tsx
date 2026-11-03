import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import MusicPlayer from "./music-player";
import VisitorTracker from "./visitor-tracker";
import PublicSiteStatus from "./public-site-status";
import { ThemeSync } from "./theme-toggle";
import { themeInitScript } from "./theme";
import { listPublicMusicTracks } from "../db/music";
import "./globals.css";
import "./music-player.css";
import "./premium.css";
import "./site-header.css";
import "./theme.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
  const tracks = await listPublicMusicTracks();
  return (
    <html lang="zh-Hant-TW" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeInitScript }} /></head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeSync />
        {children}
        <PublicSiteStatus />
        <VisitorTracker />
        <MusicPlayer tracks={tracks.map(track=>({id:track.id,title:track.title,artist:track.artist,src:track.audio_url,cover:track.cover_url}))}/>
      </body>
    </html>
  );
}
