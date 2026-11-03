"use client";

import type { ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/** Render the right language on the server and keep it current on navigation. */
export default function DocumentLanguage({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const requestedEnglish = useSearchParams().get("lang") === "en";
  const english = requestedEnglish && pathname !== "/admin" && !pathname.startsWith("/admin/");

  return <html lang={english ? "en" : "zh-Hant-TW"} suppressHydrationWarning>{children}</html>;
}
