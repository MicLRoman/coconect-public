"use client";

import Image from 'next/image';
import DmitriyPhoto from '../../public/photos/Dmitriy.png';

import React, { useState, useEffect, useRef } from 'react';

// Финальный блок = манифест «зачем». Ценность уже раскрыта выше (Experiences + How It Works),
// здесь добиваем верой: доверие → возможности, с фаундерским quote как героем секции.
export default function App() {
    const fullQuote = "We built coconect because meeting people who matter shouldn't feel random or forced. Real relationships start with trust, shared values, and a real table. That's what we set out to build.";
    const [quoteText, setQuoteText] = useState("");
    const [started, setStarted] = useState(false);
    const sectionRef = useRef<HTMLElement>(null);

    // Печать запускаем, когда секция реально попала в кадр (иначе внизу страницы
    // эффект отработал бы до того, как юзер до него доскроллит).
    useEffect(() => {
        const el = sectionRef.current;
        if (!el) return;
        const io = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    setStarted(true);
                    io.disconnect();
                }
            },
            { threshold: 0.25 }
        );
        io.observe(el);
        return () => io.disconnect();
    }, []);

    useEffect(() => {
        if (!started) return;
        let i = 0;
        const interval = setInterval(() => {
            i++;
            setQuoteText(fullQuote.slice(0, i));
            if (i >= fullQuote.length) clearInterval(interval);
        }, 26);
        return () => clearInterval(interval);
    }, [started]);

    const done = quoteText.length >= fullQuote.length;

    return (
        <div className="flex flex-col w-full min-h-screen border-b-[4px] border-black bg-[#e11d48]">
            {/* Keyframes (animate-mod-*, animate-cursor) live in globals.css */}
            <section
                id="about"
                ref={sectionRef}
                data-anim
                className="bg-[#e11d48] text-white relative z-30 overflow-hidden scroll-mt-20 flex-1 flex flex-col justify-center pt-24 pb-20 md:pt-28 md:pb-28"
            >
                <div className="max-w-5xl mx-auto px-6 md:px-12 w-full flex flex-col items-start">

                    {/* Бейджи: анти-нетворкинг вера */}
                    <div className="flex flex-row flex-wrap sm:flex-nowrap items-center gap-3 md:gap-4 mb-7 md:mb-9 animate-mod-1">
                        <span className="bg-black text-[#fde047] font-black uppercase text-xs sm:text-sm md:text-base px-4 md:px-5 py-2 md:py-2.5 border-[2px] border-black shadow-[2px_2px_0_#000] md:shadow-[3px_3px_0_#000] rotate-[-2deg] whitespace-nowrap">
                            No DMs.
                        </span>
                        <span className="bg-black text-[#38bdf8] font-black uppercase text-xs sm:text-sm md:text-base px-4 md:px-5 py-2 md:py-2.5 border-[2px] border-black shadow-[2px_2px_0_#000] md:shadow-[3px_3px_0_#000] rotate-[1deg] whitespace-nowrap">
                            No Swiping.
                        </span>
                        <span className="hidden sm:inline-block bg-black text-[#34d399] font-black uppercase text-xs sm:text-sm md:text-base px-4 md:px-5 py-2 md:py-2.5 border-[2px] border-black shadow-[2px_2px_0_#000] md:shadow-[3px_3px_0_#000] rotate-[-1deg] whitespace-nowrap">
                            No awkward small talk.
                        </span>
                    </div>

                    {/* Тайтл-манифест */}
                    <h3 className="text-5xl md:text-6xl lg:text-[5.5rem] font-black uppercase tracking-tighter text-white drop-shadow-[4px_4px_0_#000] leading-[0.9] mb-6 md:mb-8 animate-mod-1">
                        Trust is the real<br />
                        <span className="text-[#fde047]">network.</span>
                    </h3>

                    {/* Бой-стейтмент: зачем (доверие → возможности) */}
                    <p className="text-lg md:text-2xl font-medium leading-relaxed text-white/90 max-w-3xl mb-6 md:mb-8 animate-mod-2">
                        Jobs, investors, co-founders. They come from people who already trust you, not from a cold pitch. So instead of networking, we sit you at a table of people who actually matter to each other.
                    </p>

                    {/* Лозунг */}
                    <div className="inline-block bg-black text-[#34d399] px-4 py-3 rounded-xl uppercase tracking-widest text-base md:text-xl font-black border-[3px] border-black shadow-[4px_4px_0_#000] rotate-[-2deg] hover:rotate-0 transition-transform cursor-default animate-mod-2">
                        Human first, professional second.
                    </div>

                    {/* Манифест-quote — герой блока */}
                    <figure className="mt-14 md:mt-20 w-full animate-mod-3">
                        <blockquote className="text-2xl md:text-4xl lg:text-[2.75rem] font-black leading-[1.15] text-white max-w-4xl min-h-[6rem] md:min-h-[9rem]">
                            <span className="text-[#fde047]">&ldquo;</span>
                            {quoteText}
                            {done && <span className="text-[#fde047]">&rdquo;</span>}
                            {!done && <span className="inline-block w-[3px] md:w-[4px] h-[0.85em] bg-[#fde047] ml-1 align-middle animate-cursor" />}
                        </blockquote>

                        <figcaption className="mt-7 md:mt-8 flex items-center gap-4">
                            <Image
                                src={DmitriyPhoto}
                                width={96}
                                height={96}
                                placeholder="blur"
                                className="w-14 h-14 md:w-16 md:h-16 rounded-full border-[3px] border-black object-cover bg-gray-200 shrink-0"
                                alt="Dmitrii B., Co-Founder of coconect"
                            />
                            <div className="flex flex-col">
                                <div className="font-black text-base md:text-lg text-white uppercase leading-none">Dmitrii B.</div>
                                <div className="text-xs md:text-sm font-bold text-white/70 uppercase tracking-wider mt-1">Co-Founder, coconect</div>
                            </div>
                            <a
                                href="https://www.linkedin.com/in/dmitrii-bronnikov-704b383b3/"
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="Dmitrii on LinkedIn"
                                className="ml-1 w-9 h-9 flex items-center justify-center bg-black text-white rounded-lg border-[2px] border-black shadow-[3px_3px_0_#000] hover:-translate-y-1 transition-all shrink-0"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                                </svg>
                            </a>
                        </figcaption>
                    </figure>

                </div>
            </section>
        </div>
    );
}
