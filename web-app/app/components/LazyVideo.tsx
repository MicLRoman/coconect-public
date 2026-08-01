"use client";

import React, { useEffect, useRef, useState } from "react";

type LazyVideoProps = {
  src: string;
  className?: string;
  poster?: string;
};

/**
 * Renders a muted autoplay <video> but only fetches/plays it once the element
 * scrolls near the viewport. In the horizontal Experiences carousel most cards
 * start off-screen, so this defers loading ~3 of 4 clips on first paint.
 */
export default function LazyVideo({ src, className, poster }: LazyVideoProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(true);
            observer.disconnect();
            break;
          }
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={wrapRef} className="absolute inset-0">
      <video
        autoPlay
        loop
        muted
        playsInline
        preload="none"
        poster={poster}
        className={className}
      >
        {active && <source src={src} type="video/mp4" />}
      </video>
    </div>
  );
}
