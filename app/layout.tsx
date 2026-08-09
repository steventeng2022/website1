import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import MusicPlayer from "./music-player";
import VisitorTracker from "./visitor-tracker";
import PublicSiteStatus from "./public-site-status";
import { listPublicMusicTracks } from "../db/music";
import "./globals.css";
import "./music-player.css";

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
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const tracks = await listPublicMusicTracks();
  return (
    <html lang="zh-Hant-TW">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <PublicSiteStatus />
        <VisitorTracker />
        <MusicPlayer tracks={tracks.map(track=>({id:track.id,title:track.title,artist:track.artist,src:track.audio_url,cover:track.cover_url}))}/>
      </body>
    </html>
  );
}
