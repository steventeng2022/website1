"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const DEPTH_TARGETS = ".character-stage, .project-card, .portfolio-card.has-link";
const MOTION_QUERY = "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)";

/** Event-driven depth: one paint per pointer frame, with no idle render loop. */
export default function SiteMotion() {
  const pathname = usePathname();
  const query = useSearchParams().toString();

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin") || pathname.startsWith("/api")) return;
    const media = window.matchMedia(MOTION_QUERY);
    let active: HTMLElement | null = null;
    let bounds: DOMRect | null = null;
    let frame = 0;
    let point = { x: 0, y: 0 };

    const reset = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      if (active) {
        active.removeAttribute("data-depth-active");
        for (const property of ["--tilt-x", "--tilt-y", "--shine-x", "--shine-y"]) active.style.removeProperty(property);
      }
      active = null;
      bounds = null;
    };
    const paint = () => {
      frame = 0;
      if (!active || !bounds || !media.matches || document.hidden) return;
      const x = Math.max(0, Math.min(1, (point.x - bounds.left) / bounds.width));
      const y = Math.max(0, Math.min(1, (point.y - bounds.top) / bounds.height));
      const strength = active.classList.contains("character-stage") ? 7 : 4;
      active.style.setProperty("--tilt-x", `${((.5 - y) * strength).toFixed(2)}deg`);
      active.style.setProperty("--tilt-y", `${((x - .5) * strength).toFixed(2)}deg`);
      active.style.setProperty("--shine-x", `${(x * 100).toFixed(1)}%`);
      active.style.setProperty("--shine-y", `${(y * 100).toFixed(1)}%`);
    };
    const onMove = (event: PointerEvent) => {
      if (!media.matches || event.pointerType === "touch" || document.hidden) return;
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>(DEPTH_TARGETS) : null;
      if (!target) { reset(); return; }
      if (target !== active) {
        reset();
        active = target;
        bounds = target.getBoundingClientRect();
        target.setAttribute("data-depth-active", "true");
      }
      point = { x: event.clientX, y: event.clientY };
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const onLeave = (event: PointerEvent) => {
      if (active && (!(event.relatedTarget instanceof Node) || !active.contains(event.relatedTarget))) reset();
    };
    const onVisibility = () => {
      document.documentElement.toggleAttribute("data-motion-paused", document.hidden);
      if (document.hidden) reset();
    };

    const hero = document.querySelector<HTMLElement>(".hero-character");
    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(([entry]) => {
      hero?.classList.toggle("is-out-of-view", !entry.isIntersecting);
      if (!entry.isIntersecting) reset();
    }, { threshold: 0 });
    if (hero) observer?.observe(hero);

    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerout", onLeave, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("scroll", reset, { passive: true });
    window.addEventListener("resize", reset, { passive: true });
    window.addEventListener("blur", reset);
    media.addEventListener("change", reset);
    onVisibility();

    return () => {
      reset();
      observer?.disconnect();
      hero?.classList.remove("is-out-of-view");
      document.documentElement.removeAttribute("data-motion-paused");
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerout", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("scroll", reset);
      window.removeEventListener("resize", reset);
      window.removeEventListener("blur", reset);
      media.removeEventListener("change", reset);
    };
  }, [pathname, query]);

  return null;
}
