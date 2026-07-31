"use client";

import { usePathname, useSearchParams } from "next/navigation";

export default function LanguageToggle() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isEnglish = searchParams.get("lang") === "en";
  const params = new URLSearchParams(searchParams.toString());
  if (isEnglish) params.delete("lang");
  else params.set("lang", "en");
  const query = params.toString();

  return (
    <a
      className="language-toggle"
      href={`${pathname}${query ? `?${query}` : ""}`}
      aria-label={isEnglish ? "切換為繁體中文" : "Switch to English"}
    >
      {isEnglish ? "繁中" : "EN"}
    </a>
  );
}
