"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { useSignupOpen } from "./HeroSignupChat";

export default function StickyCTA() {
  const { open, variant } = useSignupOpen();
  const [hidden, setHidden] = useState(false);

  // Вариант B (WhatsApp-first): закреплённой кнопки нет вообще — ни на десктопе, ни на мобиле.
  const isB = variant === "b";

  useEffect(() => {
    const sections = document.querySelectorAll(".register-section");
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          } else {
            entry.target.classList.remove("is-visible");
          }
        }
        setHidden(
          document.querySelectorAll(".register-section.is-visible").length > 0
        );
      },
      { threshold: 0.1 }
    );

    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  if (isB) return null;

  return (
    <div
      className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-40 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
        hidden
          ? "opacity-0 translate-y-20 pointer-events-none"
          : "opacity-100 translate-y-0"
      }`}
    >
      <button
        onClick={open}
        className="bg-[#e11d48] text-white px-8 md:px-10 py-4 md:py-5 rounded-full font-black uppercase text-sm md:text-lg border-[4px] border-black shadow-[6px_6px_0_#111827] hover:-translate-y-1 hover:shadow-[8px_8px_0_#111827] transition-all flex items-center gap-3 whitespace-nowrap"
      >
        SIGN UP <ArrowRight size={20} />
      </button>
    </div>
  );
}
