"use client";

import { useState } from "react";

export default function HeroCharacterTabs() {
  const [active, setActive] = useState<"steven" | "flower">("steven");
  const isSteven = active === "steven";

  return <div className="hero-character">
    <div className="character-tabs" role="tablist" aria-label="Character photo">
      <button
        type="button"
        role="tab"
        aria-selected={isSteven}
        className={isSteven ? "active" : ""}
        onClick={() => setActive("steven")}
      >STEVEN</button>
      <button
        type="button"
        role="tab"
        aria-selected={!isSteven}
        className={!isSteven ? "active" : ""}
        onClick={() => setActive("flower")}
      >FLOWER</button>
    </div>
    <div className="hero-photo" role="tabpanel">
      <img
        key={active}
        src={isSteven ? "/steven-drawing.png" : "/flower.png"}
        alt={isSteven ? "Steven's hand-drawn character" : "Flower, a cheerful tiger character in front of a castle"}
        className={isSteven ? "steven-drawing" : "flower-photo"}
      />
      <span aria-hidden="true">{isSteven ? "STEVEN · ORIGINAL" : "FLOWER · STEVEN"}</span>
    </div>
  </div>;
}
