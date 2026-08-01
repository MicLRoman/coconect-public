"use client";

import { useEffect } from "react";

// Pauses CSS animations in heavy sections while they're off-screen. Each section
// opts in with `data-anim`; when it scrolls out of view we add `.anim-paused`
// (see globals.css) which sets animation-play-state: paused on the whole subtree.
// One observer for the whole page, zero layout impact — purely stops the
// compositor from animating things nobody can see.
export default function AnimationPauser() {
  useEffect(() => {
    const sections = document.querySelectorAll<HTMLElement>("[data-anim]");
    if (!sections.length || typeof IntersectionObserver === "undefined") return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          entry.target.classList.toggle("anim-paused", !entry.isIntersecting);
        }
      },
      { rootMargin: "300px" }
    );

    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);

  return null;
}
