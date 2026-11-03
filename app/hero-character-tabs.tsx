"use client";

import { useRef, useState, type KeyboardEvent } from "react";

export default function HeroCharacterTabs({ en = false }: { en?: boolean }) {
  const [active, setActive] = useState<"steven" | "flower">("steven");
  const isSteven = active === "steven";
  const stevenTab = useRef<HTMLButtonElement>(null);
  const flowerTab = useRef<HTMLButtonElement>(null);
  function moveTab(event: KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === "Home" ? "steven" : event.key === "End" ? "flower" : isSteven ? "flower" : "steven";
    setActive(next);
    (next === "steven" ? stevenTab : flowerTab).current?.focus();
  }

  return <div className="hero-character">
    <div className="character-stage">
      <div className="character-stage-top"><span>{en ? "THE PERSON BEHIND THE PIXELS" : "螢幕背後的我"}</span><span aria-hidden="true">↗</span></div>
      <div className="character-orbit" aria-hidden="true" />
      <div className="stage-depth-grid" aria-hidden="true" />
      <div className="stage-shape stage-sphere" aria-hidden="true" />
      <div className="stage-shape stage-cube" aria-hidden="true"><i /><i /><i /></div>
      <div className="stage-shape stage-ring" aria-hidden="true" />
      <div className="character-note" aria-hidden="true">{en ? "a work in progress" : "持續進化中"}<span>↘</span></div>
      <div className="hero-photo" role="tabpanel" id="character-panel" aria-labelledby={`character-tab-${active}`} tabIndex={0}>
        <img
          key={active}
          src={isSteven ? "/steven-drawing.png" : "/flower.webp"}
          loading={isSteven ? "eager" : "lazy"}
          decoding="async"
          width={625}
          height={502}
          alt={isSteven ? (en ? "Steven's hand-drawn character" : "Steven 的手繪角色") : (en ? "Flower, a cheerful tiger character in front of a castle" : "站在城堡前的開朗老虎角色 Flower")}
          className={isSteven ? "steven-drawing" : "flower-photo"}
        />
        <span aria-hidden="true">{isSteven ? "01 — STEVEN, IN A SKETCH" : "02 — A LITTLE MORE PLAYFUL"}<b>✳</b></span>
      </div>
      <div className="character-stage-bottom"><span>TAIWAN · STUDENT & CREATOR</span><span aria-hidden="true">ALWAYS EXPLORING</span></div>
    </div>
    <div className="character-controls"><p>{en ? "A different side of me" : "換個角度認識我"}</p><div className="character-tabs" role="tablist" aria-label={en ? "Character photo" : "角色插圖"} onKeyDown={moveTab}>
      <button
        ref={stevenTab}
        id="character-tab-steven"
        type="button"
        role="tab"
        tabIndex={isSteven ? 0 : -1}
        aria-controls="character-panel"
        aria-selected={isSteven}
        className={isSteven ? "active" : ""}
        onClick={() => setActive("steven")}
      >STEVEN</button>
      <button
        ref={flowerTab}
        id="character-tab-flower"
        type="button"
        role="tab"
        tabIndex={isSteven ? -1 : 0}
        aria-controls="character-panel"
        aria-selected={!isSteven}
        className={!isSteven ? "active" : ""}
        onClick={() => setActive("flower")}
      >FLOWER</button>
    </div></div>
  </div>;
}
