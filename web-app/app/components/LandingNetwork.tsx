"use client";

import React, { useRef, useState, useEffect } from 'react';
import LazyVideo from './LazyVideo';

// --- COMPONENT: MINI PROFILE FOR NETWORK GRID ---
const MiniProfile = ({ img, name, role, roleColor, top, left, right, bottom }: { img: string, name: string, role: string, roleColor: string, top?: string, left?: string, right?: string, bottom?: string }) => (
  <div
    className="absolute flex items-center gap-2 md:gap-3 hover:-translate-y-2 transition-transform z-30 group/profile"
    style={{ top, left, right, bottom }}
  >
    <img src={`https://i.pravatar.cc/150?img=${img}`} width={64} height={64} loading="lazy" decoding="async" draggable="false" alt="" className="w-10 h-10 md:w-16 md:h-16 rounded-full border-[2px] md:border-[3px] border-black shadow-[2px_2px_0_#000] md:shadow-[4px_4px_0_#000] object-cover bg-white group-hover/profile:scale-110 transition-transform select-none pointer-events-none" />
    <div className="bg-white border-[2px] md:border-[3px] border-black rounded-lg md:rounded-xl px-2 py-1 md:px-3 md:py-2 shadow-[2px_2px_0_#000] md:shadow-[4px_4px_0_#000] select-none pointer-events-none">
      <h4 className="font-black text-[10px] md:text-sm uppercase leading-none mb-1 text-black whitespace-nowrap">{name}</h4>
      <p className={`font-bold text-[7px] md:text-[10px] uppercase whitespace-nowrap ${roleColor}`}>{role}</p>
    </div>
  </div>
);

type Profile = { img: string; name: string; role: string; roleColor: string; top?: string; left?: string; right?: string; bottom?: string };

// --- SCENES DATA ---
// Пока у нас только ужины (каждую субботу) — три реальных клипа с самих ужинов.
// Аватарки-плейсхолдеры убраны: на реальном видео и так живые люди.
type Attendee = { name: string; role: string; flex: string };
const scenesData: {
  id: number; videoSrc: string; tag: string; title: string;
  location: string; attendees: Attendee[]; more: number;
  bgGradient: string; shadow: string; rotation: string; profiles: Profile[];
}[] = [
  {
    id: 1,
    videoSrc: "/videos/dinner1.mp4",
    tag: "Every Saturday",
    title: "Curated Dinners",
    location: "Alo",
    attendees: [
      { name: "Almer Kunst", role: "Co-founder & CTO", flex: "50K+ students · Learnable" },
      { name: "Vadim Lidich", role: "Managing Partner", flex: "Private-credit fund" },
      { name: "Ojas Singh", role: "Software Engineer", flex: "Ex-Finni Health · YC W23" },
    ],
    more: 0,
    bgGradient: "from-red-900 to-orange-800",
    shadow: "shadow-[8px_8px_0_#e11d48] md:shadow-[12px_12px_0_#e11d48]",
    rotation: "rotate-[-4deg]",
    profiles: []
  },
  {
    id: 2,
    videoSrc: "/videos/dinner2.mp4",
    tag: "The Table",
    title: "Your Kind of People",
    location: "Byblos",
    attendees: [
      { name: "Areeb Naeem", role: "Founder", flex: "1M users · UofT Governor" },
      { name: "Conor Bradshaw", role: "Partnerships @ Brex", flex: "Built 1st startup at 16" },
      { name: "Adam Tarsky", role: "M&A Analyst", flex: "Ex-KPMG · $70M RE PE" },
    ],
    more: 3,
    bgGradient: "from-blue-900 to-purple-900",
    shadow: "shadow-[8px_8px_0_#38bdf8] md:shadow-[12px_12px_0_#38bdf8]",
    rotation: "rotate-[3deg]",
    profiles: []
  },
  {
    id: 3,
    videoSrc: "/videos/dinner3.mp4",
    tag: "The Vibe",
    title: "Real Conversations",
    location: "Piano Piano",
    attendees: [
      { name: "George Atuan, CFA", role: "Founder · CFA", flex: "Ex-Kraft Heinz FP&A" },
      { name: "Ilya Shumov", role: "M&A / PE", flex: "Ex-Head of IB, top-5 bank" },
      { name: "Ulyana Bogdanova", role: "CS @ UniMilan", flex: "Yale YGS · Olympics '26" },
    ],
    more: 1,
    bgGradient: "from-emerald-900 to-teal-800",
    shadow: "shadow-[8px_8px_0_#fde047] md:shadow-[12px_12px_0_#fde047]",
    rotation: "rotate-[-2deg]",
    profiles: []
  },
  {
    id: 4,
    videoSrc: "/videos/dinner4.mp4",
    tag: "The Afters",
    title: "It Doesn't End at Dinner",
    location: "Aloette",
    attendees: [
      { name: "Mikhail Shchegolev", role: "Product & Tech Lead", flex: "+126% in one month (quant)" },
      { name: "Dmitrii Bronnikov", role: "PE Analyst · Founder", flex: "Won Harvard Crimson comp" },
      { name: "Fares Elhelali", role: "Growth Lead", flex: "Top 50 Under 18 · 2× TEDx" },
    ],
    more: 0,
    bgGradient: "from-amber-900 to-orange-800",
    shadow: "shadow-[8px_8px_0_#34d399] md:shadow-[12px_12px_0_#34d399]",
    rotation: "rotate-[3deg]",
    profiles: []
  }
];

// --- Теги гостей поверх видео (стекло: статус + «форсажный» факт) ---
// Хаотичный разброс позиций (с лёгким наклоном) — свой на каждую карточку.
// 4-я позиция = тег «…ещё» (три точки); есть только у карточек 1, 3, 4.
const TAG_LAYOUT: Record<number, string[]> = {
  1: ['top-[32%] -left-1 -rotate-3', 'top-[55%] -right-1 rotate-3', 'bottom-[6%] left-0 rotate-2', 'bottom-[26%] -right-1 -rotate-2'],
  2: ['top-[35%] -left-1 rotate-2', 'top-[60%] -right-1 -rotate-3', 'bottom-[7%] left-0 rotate-1'],
  3: ['top-[32%] -right-1 rotate-3', 'top-[55%] -left-1 -rotate-3', 'bottom-[6%] right-0 rotate-2', 'bottom-[26%] -left-1 -rotate-2'],
  4: ['top-[33%] -left-1 -rotate-2', 'top-[57%] -right-1 rotate-3', 'bottom-[7%] left-0 rotate-2', 'bottom-[25%] -right-1 -rotate-3'],
};
function AttendeeTag({ attendee }: { attendee: Attendee }) {
  return (
    <div className="bg-black/55 backdrop-blur-md border border-white/15 rounded-xl px-3 py-2 select-none max-w-[13rem]">
      <div className="font-black text-[11px] md:text-xs uppercase text-white leading-tight">{attendee.role}</div>
      <div className="font-bold text-[9px] md:text-[10px] uppercase text-[#fde047] leading-tight mt-1">{attendee.flex}</div>
    </div>
  );
}
// «…и другие» — слово мелким шрифтом в том же стеклянном стиле.
function MoreTag() {
  return (
    <div className="bg-black/55 backdrop-blur-md border border-white/15 rounded-full px-4 py-2 select-none leading-none">
      <span className="font-bold text-[9px] md:text-[10px] uppercase tracking-wide text-white/70">+ others</span>
    </div>
  );
}

export default function LandingNetwork() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // --- БЛОКИРОВКА ОСИ (Анти-залипание скролла на тачпаде) ---
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let scrollTimeout: ReturnType<typeof setTimeout>;

    const handleWheel = (e: WheelEvent) => {
      // Если горизонтальный скролл уже заблокирован для текущего свайпа, просто продлеваем таймер
      if (el.style.overflowX === 'hidden') {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          el.style.overflowX = ''; // возвращаем как было
        }, 250);
        return;
      }

      // Если пользователь делает вертикальный скролл (страницы) больше, чем горизонтальный
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        el.style.overflowX = 'hidden'; // Моментально отключаем горизонтальный скролл контейнера
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          el.style.overflowX = ''; // Возвращаем возможность горизонтального скролла через 250мс после остановки
        }, 250);
      }
    };

    // passive: true означает, что мы не блокируем нативный скролл страницы, а только "слушаем"
    el.addEventListener('wheel', handleWheel, { passive: true });
    return () => {
      el.removeEventListener('wheel', handleWheel);
      clearTimeout(scrollTimeout);
    };
  }, []);
  // -----------------------------------------------------------

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    if (scrollRef.current) {
      setStartX(e.pageX - scrollRef.current.offsetLeft);
      setScrollLeft(scrollRef.current.scrollLeft);
    }
  };

  const handleMouseLeaveOrUp = () => setIsDragging(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 1;
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  return (
    <section id="network" data-anim className="min-h-[90dvh] pt-24 pb-6 flex flex-col justify-center bg-[#111827] relative z-20 overflow-hidden border-t-[4px] border-black scroll-mt-20">
      {/* pl совпадает с левой границей контента hero (max-w-7xl): max(1.5rem, (100vw-80rem)/2) */}
      <div className="pl-[max(1.5rem,calc((100vw-80rem)/2))] pr-6 w-full mb-6 md:mb-10 pointer-events-none shrink-0">
        <h2 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tighter uppercase text-white leading-[0.9]">
          Our past<br />meetups.
        </h2>
      </div>

      <div
        ref={scrollRef}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeaveOrUp}
        onMouseUp={handleMouseLeaveOrUp}
        onMouseMove={handleMouseMove}
        className={`flex overflow-x-auto overflow-y-hidden gap-10 md:gap-10 pl-[max(1.5rem,calc((100vw-80rem)/2))] pr-8 md:pr-24 py-8 hide-scrollbar items-center select-none flex-1 overscroll-x-contain ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      >
        {scenesData.map((scene) => (
          <div key={scene.id} className="shrink-0 w-[84vw] sm:w-[58vw] md:w-[34vw] lg:w-[24vw] max-w-[360px] h-[64vh] md:h-[68vh] min-h-[480px] md:min-h-[460px] max-h-[680px] relative flex items-center justify-center">

            {/* Внутренняя карточка */}
            <div className={`relative w-full h-full p-4 md:p-6 rounded-[2rem] md:rounded-[3rem] bg-gradient-to-br ${scene.bgGradient} border-[3px] md:border-[4px] border-black ${scene.shadow} ${scene.rotation} lg:hover:rotate-0 transition-transform duration-500 z-10 flex flex-col items-center justify-center`}>

              {/* Header */}
              <div className="absolute top-6 left-6 md:top-8 md:left-8 z-30 pointer-events-none pr-16 text-left">
                <span className="bg-[#111827] text-[#fde047] font-black text-[10px] md:text-xs uppercase px-2 py-1 border-[2px] border-black shadow-[2px_2px_0_#000] inline-block mb-2 tracking-widest">
                  {scene.tag}
                </span>
                <h3 className="font-black text-2xl md:text-3xl text-white uppercase leading-none drop-shadow-md">
                  {scene.title}
                </h3>
              </div>

              {/* Central Video */}
              <div className="relative w-[88%] h-[84%] md:w-[86%] md:h-[82%] mt-12 rounded-[1.5rem] md:rounded-[2rem] border-[3px] md:border-[4px] border-black overflow-hidden shadow-[6px_6px_0_#000] md:shadow-[8px_8px_0_#000] z-20 bg-black pointer-events-none">
                <LazyVideo
                  src={scene.videoSrc}
                  className="absolute inset-0 w-full h-full object-cover opacity-80"
                />
              </div>

              {/* Теги гостей — поверх видео и ВЫХОДЯТ за его края (дети карточки, не видео → без обрезки). */}
              {scene.attendees.slice(0, 3).map((a, i) => (
                <div key={i} className={`absolute z-30 max-w-[62%] pointer-events-none ${TAG_LAYOUT[scene.id]?.[i] ?? ''}`}>
                  <AttendeeTag attendee={a} />
                </div>
              ))}
              {TAG_LAYOUT[scene.id]?.[3] && (
                <div className={`absolute z-30 pointer-events-none ${TAG_LAYOUT[scene.id][3]}`}>
                  <MoreTag />
                </div>
              )}

            </div>
          </div>
        ))}

        {/* Coming soon — намёк, что ужинами не ограничимся (справа в конце ленты) */}
        <div className="shrink-0 w-[64vw] sm:w-[46vw] md:w-[27vw] lg:w-[19vw] max-w-[300px] h-[64vh] md:h-[68vh] min-h-[480px] md:min-h-[460px] max-h-[680px] relative flex items-center justify-center">
          <div className="relative w-full h-full rounded-[2rem] md:rounded-[3rem] border-[3px] md:border-[4px] border-dashed border-white/25 rotate-[2deg] flex flex-col items-center justify-center text-center px-6">
            <span className="text-5xl md:text-6xl mb-4 opacity-80">🧭</span>
            <h3 className="font-black text-2xl md:text-3xl text-white/80 uppercase leading-none">Coming<br />soon…</h3>
            <p className="mt-3 text-xs md:text-sm text-white/40 font-medium max-w-[15rem] leading-relaxed">
              Padel, saunas, new cities — more ways to meet your people are on the way.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}