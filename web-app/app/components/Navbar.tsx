"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { useLanguage } from "../lib/LanguageContext";
import { useSignupOpen } from "./HeroSignupChat";
import { WhatsAppIcon } from "./WhatsAppIcon";

export default function Navbar() {
  const { t } = useLanguage();
  const { open, variant, waLink } = useSignupOpen();
  const [menuOpen, setMenuOpen] = useState(false);

  // Вариант B — WhatsApp-first: CTA становится «Text me» (без попапа).
  const isB = variant === "b";

  const links = [
    { href: "#network", label: t.nav.experiences },
    { href: "#how-it-works", label: t.nav.howItWorks },
    { href: "#about", label: t.nav.about },
    { href: "#pricing", label: t.nav.pricing },
    { href: "#faq", label: t.nav.faq },
  ];

  return (
    <>
      {/* Мобильное лого — отдельный fixed-слой поверх страницы.
          mix-blend-difference + белый текст = инверсия САМИХ БУКВ по фону:
          над светлым hero буквы чёрные, над тёмными секциями — белые. Без плашки.
          Внутри <nav> не сработает: fixed+z-50 создаёт стек-контекст, и блендинг
          замкнулся бы на прозрачном фоне навбара, а не на контенте страницы.
          pointer-events-none на слое — чтобы он не перехватывал клики у кнопок справа. */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 h-20 px-6 flex items-center pointer-events-none mix-blend-difference">
        <div className="max-w-7xl w-full mx-auto">
          <button
            type="button"
            className="font-black text-white text-3xl tracking-tighter cursor-pointer pointer-events-auto"
            onClick={() => window.scrollTo(0, 0)}
            aria-label="coconect home"
          >
            coconect:
          </button>
        </div>
      </div>

    <nav className="fixed top-0 w-full z-50 md:bg-white/50 md:backdrop-blur-xl md:border-b md:border-black/5 transition-all duration-300 px-6">
      <div className="max-w-7xl w-full mx-auto h-20 flex items-center justify-between">
        {/* На мобиле невидимо (буквы рисует слой выше), но держит место — кнопки остаются справа. */}
        <button
          type="button"
          className="invisible md:visible font-black text-black text-3xl tracking-tighter cursor-pointer"
          onClick={() => window.scrollTo(0, 0)}
          aria-label="coconect home"
        >
          coconect:
        </button>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8 font-black uppercase text-xs tracking-widest text-black">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="hover:text-[#e11d48] transition-colors">{l.label}</a>
          ))}

          {isB ? (
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 bg-[#25D366] text-white px-5 py-2.5 rounded-full border-[2px] border-black shadow-[3px_3px_0px_0px_#111827] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_#111827] transition-all uppercase font-black text-xs"
            >
              <WhatsAppIcon size={14} /> Text me
            </a>
          ) : (
            <button onClick={open} className="bg-[#e11d48] text-white px-5 py-2.5 rounded-full border-[2px] border-black shadow-[3px_3px_0px_0px_#111827] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_#111827] transition-all uppercase font-black text-xs">Signup</button>
          )}
        </div>

        {/* Mobile: Text me (v=b) + hamburger */}
        <div className="md:hidden flex items-center gap-2">
          {isB && (
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 bg-[#25D366] text-white px-3.5 py-2 rounded-full border-[2px] border-black shadow-[2px_2px_0px_0px_#111827] active:translate-y-[1px] uppercase font-black text-[11px]"
            >
              <WhatsAppIcon size={13} /> Text me
            </a>
          )}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-white border-[2px] border-black shadow-[3px_3px_0px_0px_#111827] active:translate-y-[1px]"
          >
            {menuOpen ? <X size={20} className="text-black" /> : <Menu size={20} className="text-black" />}
          </button>
        </div>
      </div>

      {/* Mobile menu panel */}
      {menuOpen && (
        <div className="md:hidden absolute left-0 right-0 top-20 bg-white border-b-[3px] border-black shadow-[0_8px_0_rgba(0,0,0,0.06)] animate-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col px-5 py-4 gap-1 font-black uppercase text-sm tracking-widest text-black">
            {links.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setMenuOpen(false)} className="py-3 border-b-[2px] border-black/10 hover:text-[#e11d48] transition-colors">{l.label}</a>
            ))}
            {isB ? (
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMenuOpen(false)}
                className="mt-3 flex items-center justify-center gap-2 bg-[#25D366] text-white px-5 py-3 rounded-full border-[2px] border-black shadow-[3px_3px_0px_0px_#111827] uppercase font-black text-xs"
              >
                <WhatsAppIcon size={16} /> Text me on WhatsApp
              </a>
            ) : (
              <button
                onClick={() => { setMenuOpen(false); open(); }}
                className="mt-3 bg-[#e11d48] text-white px-5 py-3 rounded-full border-[2px] border-black shadow-[3px_3px_0px_0px_#111827] uppercase font-black text-xs"
              >
                Signup
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
    </>
  );
}
