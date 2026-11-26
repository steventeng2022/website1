"use client";

import type { CSSProperties, ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/** Render the right language on the server and keep it current on navigation. */
export default function DocumentLanguage({ children, siteTheme, siteScheme, style }: {
  children: ReactNode; siteTheme?: string; siteScheme?: "light" | "dark"; style?: CSSProperties;
}) {
  const pathname = usePathname();
  const requestedEnglish = useSearchParams().get("lang") === "en";
  const english = requestedEnglish && pathname !== "/admin" && !pathname.startsWith("/admin/");

  // data-site-theme is the admin-chosen palette; data-theme stays the visitor light/dark mode
  // (forced to the palette's scheme for non-classic site themes).
  return <html lang={english ? "en" : "zh-Hant-TW"} data-site-theme={siteTheme} data-site-scheme={siteScheme} style={style} suppressHydrationWarning>{children}</html>;
}
