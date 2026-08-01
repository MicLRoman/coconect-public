"use client";

import React, { useEffect, useState, useRef } from 'react';
import { Sparkles, MapPin, Check, MessageCircle, Link, Phone, ArrowRight, UserCircle2 } from 'lucide-react';
import { useSignupOpen } from './HeroSignupChat';

// --- v=b: одна переписка в WhatsApp, стилизованная под чистый чат (аватар + пузырь + время) ---
type ChatMsg = { from: 'user' | 'bot'; text?: string; photo?: string; time: string };
const CHAT: ChatMsg[] = [
    { from: 'user', text: "In for Saturday. Who's at the table?", time: '2:14 pm' },
    { from: 'bot', text: "People who can actually unblock you, not a random room. What are you building?", time: '2:14 pm' },
    { from: 'user', text: "Technical founder. Product's live, but I'm weak on go-to-market and I'm raising.", time: '2:15 pm' },
    { from: 'bot', text: "Then this is your table. Saturday, 7pm?", time: '2:15 pm' },
    { from: 'user', text: "Go on.", time: '2:16 pm' },
    { from: 'bot', text: "Picked for exactly that:\n• Maya, ex-Stripe GTM. Took revenue from zero.\n• Dan, angel who backs technical founders at seed.\n• Priya, brand marketing at Starbucks. Growth is her craft.\n📍 Soho House, 7pm", time: '2:16 pm' },
    { from: 'user', photo: "/howitworks.jpg", time: '11:31 pm' },
    { from: 'user', text: "That was unreal. Maya might be my GTM co-founder.", time: '11:32 pm' },
    { from: 'bot', text: "Knew it. Dan asked for your deck too 😏", time: '11:34 pm' },
    { from: 'bot', text: "Same seat next Saturday? It's yours.", time: '9:02 am' },
    { from: 'user', text: "100%.", time: '9:05 am' },
];
// Разделители-«пилюли» между сообщениями (индекс сообщения, перед которым вставить).
const DIVIDERS: Record<number, string> = { 0: 'today', 6: 'saturday night 🍷' };

// Заголовок секции — общие бейджи HOW / IT / WORKS (в v=b виден и на мобиле).
function HowBadges() {
    const badge = "inline-block px-2.5 py-1 md:px-3.5 md:py-1.5 border-[2px] md:border-[3px] border-black shadow-[2px_2px_0_#000] md:shadow-[4px_4px_0_#000] text-black";
    return (
        <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black uppercase tracking-tighter flex flex-nowrap items-center gap-1.5 md:gap-2.5 whitespace-nowrap">
            <span className={`${badge} bg-[#fde047] -rotate-3`}>HOW</span>
            <span className={`${badge} bg-[#38bdf8] rotate-2`}>IT</span>
            <span className={`${badge} bg-[#34d399] -rotate-2`}>WORKS</span>
        </h2>
    );
}

// v=b: одна строка чата — аватар + пузырь + таймстамп. Наши цвета (жёлтый свой / белый входящий),
// чисто, без рамок и градиентов. Стилистика — как в референсе (аватары по бокам, время под пузырём).
function ChatRow({ m }: { m: ChatMsg }) {
    const isUser = m.from === 'user';
    return (
        <div className={`flex items-start gap-2.5 shrink-0 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
            {isUser ? (
                <div className="w-9 h-9 rounded-full shrink-0 grid place-items-center border-[2px] border-black bg-[#e11d48] text-white text-[10px] font-black">
                    You
                </div>
            ) : (
                <div className="w-9 h-9 rounded-full shrink-0 overflow-hidden border-[2px] border-black bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/favicon.svg" alt="coconect" className="w-full h-full object-cover" />
                </div>
            )}
            <div className={`flex flex-col gap-1 max-w-[82%] ${isUser ? 'items-end' : 'items-start'}`}>
                <div className={`${isUser ? 'bg-[#fde047] rounded-tr-md' : 'bg-white rounded-tl-md'} ${m.photo ? 'p-1.5' : 'px-4 py-2.5'} text-[#111827] rounded-2xl text-sm md:text-[15px] font-bold leading-snug whitespace-pre-line`}>
                    {m.photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.photo} alt="" className="rounded-xl w-40 md:w-44 h-52 md:h-60 object-cover" />
                    ) : m.text}
                </div>
                <span className="text-[10px] text-gray-500 font-semibold px-1">{m.time}</span>
            </div>
        </div>
    );
}

export default function HowItWorks() {
    const { variant } = useSignupOpen();
    // Вариант B — WhatsApp-first: шаг 1 теперь «напиши в WhatsApp», а не форма на сайте.
    const isB = variant === 'b';
    const containerRef = useRef<HTMLDivElement>(null);
    const [scrollProgress, setScrollProgress] = useState(0);

    // --- Обработчик скролла ---
    useEffect(() => {
        const handleScroll = () => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const windowHeight = window.innerHeight;

            const totalScrollable = rect.height - windowHeight;
            const scrolled = -rect.top;

            let progress = scrolled / totalScrollable;
            progress = Math.max(0, Math.min(1, progress));
            setScrollProgress(progress);
        };

        window.addEventListener('scroll', handleScroll);
        handleScroll();
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // --- Данные шагов ---
    // Дефолт (a/c): сбор базы на сайте → добор в WhatsApp.
    const stepsDefault = [
        {
            num: '01',
            title: 'Basic Info Input.',
            desc: 'Share your basic info (Name, Phone, LinkedIn) directly on our website. We parse your profile automatically.',
            color: 'text-[#fde047]',
            accent: '#fde047'
        },
        {
            num: '02',
            title: 'Request.',
            desc: 'We\'ll message you on WhatsApp to learn exactly who you want to meet, what you\'re building, and your availability.',
            color: 'text-[#38bdf8]',
            accent: '#38bdf8'
        },
        {
            num: '03',
            title: 'Smart Match.',
            desc: 'We use your goals, availability, and social fit to bring together people who create value for one another.',
            color: 'text-[#e11d48]',
            accent: '#e11d48'
        },
        {
            num: '04',
            title: 'Show up.',
            desc: 'We handle the group, the venue, and the icebreaker topics. You just show up and meet ambitious people in person.',
            color: 'text-[#34d399]',
            accent: '#34d399'
        }
    ];

    // Вариант B: WhatsApp-first. 4 шага = 4 стадии одной переписки в WhatsApp
    // (без «алгоритма»): рассказал запрос → узнал свой стол → пришёл на ужин → продолжаем.
    const stepsA = [
        {
            num: '01',
            title: 'Tell us what you want.',
            desc: 'Tap the button and chat with us on WhatsApp. Who you want to meet, what you\'re building, when you\'re free. No forms.',
            color: 'text-[#fde047]',
            accent: '#fde047'
        },
        {
            num: '02',
            title: 'Meet your table.',
            desc: 'We match you and text you exactly who\'s coming. Names, roles, and why you\'ll click. No black box.',
            color: 'text-[#38bdf8]',
            accent: '#38bdf8'
        },
        {
            num: '03',
            title: 'Show up.',
            desc: 'One dinner: 5-6 builders, a hand-picked spot. We handle the table and the icebreakers. You just show up.',
            color: 'text-[#e11d48]',
            accent: '#e11d48'
        },
        {
            num: '04',
            title: 'Keep going.',
            desc: 'The best connections don\'t end at dessert. Come back next Saturday, we\'ll save you a seat.',
            color: 'text-[#34d399]',
            accent: '#34d399'
        }
    ];

    const steps = isB ? stepsA : stepsDefault;

    // Активный шаг (0..N-1) — число шагов зависит от варианта (B слил первые два).
    const activeStepIndex = Math.min(steps.length - 1, Math.floor(scrollProgress * (steps.length - 0.01)));

    // ---------- Вариант B: переписка потоком + закреплённые анимированные шаги ----------
    if (isB) {
        return (
            <section id="how-it-works" data-anim className="bg-[#111827] border-b-[4px] border-black relative scroll-mt-20">
                <div ref={containerRef} className="relative w-full">
                    <div className="max-w-7xl mx-auto px-6 md:flex md:gap-12 lg:gap-20 md:items-start">

                        {/* ЛЕВАЯ ЧАСТЬ: заголовок (всегда) + закреплённые шаги (только десктоп) */}
                        <div className="md:w-[42%] md:sticky md:top-0 md:h-screen flex flex-col justify-center md:justify-start pt-14 md:pt-[16vh] pb-6 md:pb-0">
                            <HowBadges />

                            {/* Прогресс-бар шагов — десктоп */}
                            <div className="hidden md:block h-1.5 w-44 bg-white/10 rounded-full mt-9 overflow-hidden">
                                <div className="h-full bg-[#fde047] rounded-full transition-all duration-300" style={{ width: `${scrollProgress * 100}%` }}></div>
                            </div>

                            {/* Анимированные шаги — только десктоп (на мобиле историю ведёт сама переписка) */}
                            <div className="hidden md:block relative h-[220px] mt-10">
                                {steps.map((step, idx) => {
                                    const isActive = idx === activeStepIndex;
                                    const isPast = idx < activeStepIndex;
                                    return (
                                        <div key={idx} className={`absolute inset-0 flex flex-col justify-start transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isActive ? 'opacity-100 translate-y-0' : isPast ? 'opacity-0 -translate-y-8 pointer-events-none' : 'opacity-0 translate-y-8 pointer-events-none'}`}>
                                            <div className={`font-mono text-xs lg:text-sm font-black mb-2 ${step.color}`}>
                                                STEP {step.num}
                                            </div>
                                            <h3 className="text-2xl lg:text-3xl xl:text-4xl font-black uppercase tracking-tighter text-white mb-3 leading-[0.95]">
                                                {step.title}
                                            </h3>
                                            <p className="text-sm lg:text-base text-gray-300 font-medium border-l-[3px] pl-4 max-w-sm leading-relaxed" style={{ borderColor: step.accent }}>
                                                {step.desc}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* ПРАВАЯ ЧАСТЬ: переписка — статичный поток, без внутреннего окна/скролла/обрезки */}
                        <div className="md:w-[58%] flex flex-col gap-3.5 pt-6 pb-24 md:pt-[16vh] md:pb-[20vh]">
                            {CHAT.map((m, i) => (
                                <React.Fragment key={i}>
                                    {DIVIDERS[i] && (
                                        <div className="self-center bg-white/10 text-gray-300 text-[10px] font-bold uppercase tracking-[0.15em] px-3 py-1 rounded-full my-1">
                                            {DIVIDERS[i]}
                                        </div>
                                    )}
                                    <ChatRow m={m} />
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                </div>
            </section>
        );
    }

    // ---------- Вариант a/c: закреплённый экран + кроссфейд мокапов (без изменений) ----------
    // Индексы визуалов для дефолта (a/c).
    const iChat = 1;    // WhatsApp-разговор
    const iMatch = 2;   // движок мэтчинга
    const iShow = 3;    // ужин / show up
    const vis = (myStep: number) =>
        activeStepIndex === myStep ? 'opacity-100 scale-100 z-20'
            : activeStepIndex > myStep ? 'opacity-0 scale-90 -translate-y-8 md:-translate-y-20 z-0 pointer-events-none'
                : 'opacity-0 scale-110 translate-y-8 md:translate-y-20 z-0 pointer-events-none';

    return (
        <section id="how-it-works" data-anim className="bg-[#111827] border-b-[4px] border-black relative scroll-mt-20">

            {/* Контейнер для скролла — 4 шага. */}
            <div ref={containerRef} className="h-[240vh] w-full relative">

                <div className="sticky top-0 h-[100dvh] flex flex-col md:flex-row items-center justify-center max-w-7xl mx-auto px-6 gap-0 md:gap-16 overflow-hidden pt-20 pb-6 md:pb-10">

                    {/* ЛЕВАЯ ЧАСТЬ: Текстовый контент */}
                    <div className="w-full md:w-1/2 flex flex-col justify-center relative h-[190px] sm:h-[220px] md:h-[450px] md:flex-1 z-20">

                        <div className={`absolute -top-8 sm:-top-10 md:-top-16 lg:-top-14 left-0 md:left-16 lg:left-24 z-40 flex transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${activeStepIndex === 0 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-8 md:-translate-y-12 pointer-events-none'}`}>
                            <h2 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-black uppercase tracking-tighter flex flex-nowrap items-center gap-1.5 sm:gap-2 md:gap-3 whitespace-nowrap">
                                <span className="inline-block px-2.5 py-1 sm:px-3 sm:py-1.5 md:px-4 md:py-2 bg-[#fde047] text-black border-[2px] md:border-[3px] border-black shadow-[2px_2px_0_#000] sm:shadow-[4px_4px_0_#000] -rotate-3 transition-transform hover:rotate-0 hover:scale-105 duration-300">
                                    HOW
                                </span>
                                <span className="inline-block px-2.5 py-1 sm:px-3 sm:py-1.5 md:px-4 md:py-2 bg-[#38bdf8] text-black border-[2px] md:border-[3px] border-black shadow-[2px_2px_0_#000] sm:shadow-[4px_4px_0_#000] rotate-2 transition-transform hover:rotate-0 hover:scale-105 duration-300">
                                    IT
                                </span>
                                <span className="inline-block px-2.5 py-1 sm:px-3 sm:py-1.5 md:px-4 md:py-2 bg-[#34d399] text-black border-[2px] md:border-[3px] border-black shadow-[2px_2px_0_#000] sm:shadow-[4px_4px_0_#000] -rotate-2 transition-transform hover:rotate-0 hover:scale-105 duration-300">
                                    WORKS
                                </span>
                            </h2>
                        </div>

                        {/* Прогресс-бар */}
                        <div className="absolute left-0 md:left-0 lg:left-4 top-[15%] bottom-[15%] w-1.5 bg-gray-800 rounded-full hidden md:block z-30">
                            <div
                                className="w-full bg-[#fde047] rounded-full transition-all duration-300"
                                style={{ height: `${(scrollProgress) * 100}%` }}
                            ></div>
                        </div>

                        {steps.map((step, idx) => {
                            const isActive = idx === activeStepIndex;
                            const isPast = idx < activeStepIndex;

                            return (
                                <div key={idx} className={`absolute inset-0 flex flex-col justify-start pt-11 sm:pt-14 md:justify-center md:pt-0 w-full pl-0 md:pl-16 lg:pl-24 transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isActive ? 'opacity-100 translate-y-0' : isPast ? 'opacity-0 -translate-y-8 md:-translate-y-12 pointer-events-none' : 'opacity-0 translate-y-8 md:translate-y-12 pointer-events-none'}`}>
                                    <div className={`font-mono text-sm md:text-2xl font-black mb-1 md:mb-2 ${step.color} drop-shadow-[1px_1px_0_rgba(0,0,0,1)]`}>
                                        STEP {step.num}
                                    </div>
                                    <h2 className="text-4xl sm:text-5xl md:text-5xl lg:text-6xl xl:text-[4.5rem] font-black uppercase tracking-tighter text-white mb-2 md:mb-6 leading-[0.95] max-w-[95%]">
                                        {step.title}
                                    </h2>
                                    <p className="text-sm md:text-xl text-gray-300 font-medium border-l-[3px] md:border-l-[4px] pl-3 md:pl-5 max-w-md leading-relaxed" style={{ borderColor: step.accent }}>
                                        {step.desc}
                                    </p>
                                </div>
                            );
                        })}
                    </div>

                    {/* ПРАВАЯ ЧАСТЬ: UI Мокапы */}
                    <div className="w-full md:w-1/2 relative flex-1 min-h-[300px] sm:min-h-[320px] md:h-[500px] z-10 flex items-start md:items-center justify-center mt-40 sm:mt-20 md:mt-0">

                        {/* Визуал 1: веб-чат (шаг «Basic Info») */}
                        <div className={`absolute transition-all duration-1000 ease-[cubic-bezier(0.34,1.56,0.64,1)] w-full max-w-[320px] md:max-w-[380px] bg-[#fafafa] border-[3px] md:border-[4px] border-black rounded-[1.5rem] md:rounded-[2rem] p-4 md:p-6 shadow-[12px_12px_0_#fde047] md:shadow-[16px_16px_0_#fde047] flex flex-col ${vis(0)}`}>
                            <div className="flex flex-col space-y-4 w-full">
                                <div className="flex justify-start">
                                    <div className="bg-white border-[3px] border-black rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%] font-bold text-xs shadow-[3px_3px_0_#111827]">
                                        Hi! 👋 Let's get to know each other. What is your name?
                                    </div>
                                </div>
                                <div className="flex justify-end animate-seq-typing">
                                    <div className="bg-[#fde047] text-black border-[3px] border-black rounded-2xl rounded-tr-sm px-4 py-3 max-w-[85%] font-bold text-xs shadow-[3px_3px_0_#111827]">
                                        Alex
                                    </div>
                                </div>
                                <div className="flex justify-start animate-seq-user-reply">
                                    <div className="bg-white border-[3px] border-black rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%] font-bold text-xs shadow-[3px_3px_0_#111827]">
                                        Nice to meet you, Alex! Drop your LinkedIn URL so we can build your profile automatically.
                                    </div>
                                </div>
                                <div className="mt-4 flex gap-2">
                                    <div className="flex-1 bg-white border-[3px] border-black rounded-full px-3 py-2 flex items-center shadow-[3px_3px_0_#111827]">
                                        <div className="w-2 h-4 bg-black animate-pulse"></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Визуал 2: WhatsApp на телефоне — «расскажи, чего хочешь» */}
                        <div className={`absolute transition-all duration-1000 ease-[cubic-bezier(0.34,1.56,0.64,1)] w-full max-w-[260px] md:max-w-[300px] ${vis(iChat)}`}>
                            {/* Рамка телефона */}
                            <div className="relative bg-black rounded-[2.4rem] md:rounded-[3rem] pt-5 md:pt-6 px-2 pb-2 md:px-2.5 md:pb-2.5 border-[3px] md:border-[4px] border-black shadow-[12px_12px_0_#38bdf8] md:shadow-[16px_16px_0_#38bdf8]">
                                {/* динамик */}
                                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-1.5 md:w-20 md:h-2 bg-white/25 rounded-full z-10"></div>
                                {/* Экран */}
                                <div className="relative rounded-[1.8rem] md:rounded-[2.4rem] overflow-hidden bg-[#e5ddd5] flex flex-col">

                                    {/* WA Header */}
                                    <div className="bg-[#075e54] text-white px-4 py-3 border-b-[3px] border-black flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-[#fde047] border-[2px] border-black flex items-center justify-center font-black text-black text-xs">c:</div>
                                        <div>
                                            <div className="font-bold text-sm leading-none">coconect</div>
                                            <div className="text-[10px] text-white/80 mt-0.5">online</div>
                                        </div>
                                    </div>

                                    {/* WA Messages */}
                                    <div className="p-4 flex flex-col space-y-3 relative h-56 bg-[#e5ddd5]" style={{ backgroundImage: "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')", backgroundBlendMode: 'overlay', opacity: 0.9 }}>
                                        <div className="flex justify-start animate-wa-1">
                                            <div className="bg-white text-black rounded-lg rounded-tl-sm px-3 py-2 max-w-[85%] text-xs shadow-[1px_1px_2px_rgba(0,0,0,0.2)] font-medium">
                                                Hi Alex! Tell me, what are you currently working on and who are you looking to meet?
                                            </div>
                                        </div>
                                        <div className="flex justify-end animate-wa-2">
                                            <div className="bg-[#dcf8c6] text-black rounded-lg rounded-tr-sm px-3 py-2 max-w-[85%] text-xs shadow-[1px_1px_2px_rgba(0,0,0,0.2)] font-medium">
                                                I'm building a fintech startup and I really need to find a CTO in London. 🚀
                                            </div>
                                        </div>
                                        <div className="flex justify-start animate-wa-3">
                                            <div className="bg-white text-black rounded-lg rounded-tl-sm px-3 py-2 max-w-[85%] text-xs shadow-[1px_1px_2px_rgba(0,0,0,0.2)] font-medium">
                                                Got it! I've added your request. We'll start matching you for the upcoming dinners.
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Визуал 3: Алгоритм Мэтчинга */}
                        <div className={`absolute transition-all duration-1000 ease-[cubic-bezier(0.34,1.56,0.64,1)] w-full max-w-[320px] md:max-w-[380px] bg-[#111827] border-[3px] md:border-[4px] border-black rounded-[1.5rem] md:rounded-[2rem] p-4 md:p-5 shadow-[12px_12px_0_#e11d48] md:shadow-[16px_16px_0_#e11d48] flex flex-col text-white ${vis(iMatch)}`}>
                            <div className="flex items-center justify-between mb-3 md:mb-4">
                                <h4 className="font-black text-lg md:text-xl uppercase text-white flex items-center gap-1.5 md:gap-2">
                                    <Sparkles size={18} className="text-[#e11d48] md:w-5 md:h-5" /> Engine
                                </h4>
                                <span className="bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 md:px-2 md:py-1 rounded text-[9px] md:text-[10px] font-mono font-bold">MATH.CALC()</span>
                            </div>

                            <div className="relative w-full h-24 md:h-32 bg-gray-900 border-[2px] border-gray-800 rounded-lg md:rounded-xl mb-3 md:mb-4 overflow-hidden">
                                <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(#374151 1px, transparent 1px)', backgroundSize: '16px 16px' }}></div>
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 md:w-4 md:h-4 bg-[#e11d48] rounded-full border-[2px] border-black shadow-[0_0_10px_#e11d48] md:shadow-[0_0_15px_#e11d48] z-10"></div>
                                <div className="absolute top-[20%] left-[20%] w-2 h-2 md:w-3 md:h-3 bg-[#fde047] rounded-full border border-black animate-cluster-1"></div>
                                <div className="absolute bottom-[20%] right-[20%] w-2 h-2 md:w-3 md:h-3 bg-[#38bdf8] rounded-full border border-black animate-cluster-2"></div>
                                <div className="absolute top-[30%] right-[25%] w-2 h-2 md:w-3 md:h-3 bg-[#34d399] rounded-full border border-black animate-cluster-3"></div>
                            </div>

                            <div className="bg-black border-[2px] border-gray-800 p-2 md:p-3 rounded-lg md:rounded-xl mb-3 md:mb-4 font-mono text-[9px] md:text-xs text-center text-gray-300">
                                <span className="text-white">Score</span> = (<span className="text-[#38bdf8]">α · V_sim</span>) + (<span className="text-[#fde047]">β · Ctx</span>) + (<span className="text-[#34d399]">γ · Vibe</span>)
                            </div>

                            <div className="space-y-1.5 md:space-y-2 font-mono text-[9px] md:text-[10px]">
                                <div className="flex justify-between items-center bg-gray-900 p-1.5 md:p-2 rounded border border-gray-800">
                                    <span className="text-white">Ask/Give Vector</span>
                                    <span className="text-[#38bdf8] font-bold">+35%</span>
                                </div>
                                <div className="flex justify-between items-center bg-gray-900 p-1.5 md:p-2 rounded border border-gray-800">
                                    <span className="text-white">Role Match (CTO)</span>
                                    <span className="text-[#fde047] font-bold">+20%</span>
                                </div>
                                <div className="flex justify-between items-center bg-gray-900 p-1.5 md:p-2 rounded border border-gray-800">
                                    <span className="text-white">Location: London</span>
                                    <span className="text-[#34d399] font-bold">+25%</span>
                                </div>
                            </div>
                        </div>

                        {/* Визуал 4: Real Life */}
                        <div className={`absolute transition-all duration-1000 ease-[cubic-bezier(0.34,1.56,0.64,1)] w-full max-w-[320px] md:max-w-[380px] aspect-square bg-[#fafafa] border-[3px] md:border-[4px] border-black rounded-[1.5rem] md:rounded-[2rem] p-1.5 md:p-2 shadow-[12px_12px_0_#34d399] md:shadow-[16px_16px_0_#34d399] flex flex-col ${vis(iShow)}`}>
                            <div className="relative w-full h-full rounded-[1.25rem] md:rounded-[1.5rem] border-[3px] border-black overflow-hidden bg-gray-200">
                                <img
                                    src="https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80&w=600&auto=format&fit=crop"
                                    alt="Curated Dinner"
                                    className="w-full h-full object-cover grayscale opacity-90 mix-blend-multiply"
                                />

                                <div className="absolute bottom-3 left-3 right-3 md:bottom-4 md:left-4 md:right-4 bg-white/95 backdrop-blur-sm border-[3px] border-black p-2.5 md:p-3 rounded-lg md:rounded-xl shadow-[4px_4px_0_#000]">
                                    <div className="flex justify-between items-center mb-1.5 md:mb-2">
                                        <span className="font-black uppercase text-xs md:text-sm flex items-center gap-1 text-black">
                                            <MapPin size={14} className="text-[#e11d48] md:w-4 md:h-4" /> Soho House
                                        </span>
                                        <span className="bg-[#fde047] text-black font-bold text-[9px] md:text-[10px] px-1.5 py-0.5 md:px-2 md:py-1 rounded uppercase border-[2px] border-black">London</span>
                                    </div>
                                    <div className="flex -space-x-2">
                                        <img src="https://i.pravatar.cc/150?img=11" width={32} height={32} loading="lazy" decoding="async" alt="" className="w-7 h-7 md:w-8 md:h-8 rounded-full border-[2px] border-black" />
                                        <img src="https://i.pravatar.cc/150?img=5" width={32} height={32} loading="lazy" decoding="async" alt="" className="w-7 h-7 md:w-8 md:h-8 rounded-full border-[2px] border-black" />
                                        <img src="https://i.pravatar.cc/150?img=33" width={32} height={32} loading="lazy" decoding="async" alt="" className="w-7 h-7 md:w-8 md:h-8 rounded-full border-[2px] border-black" />
                                        <img src="https://i.pravatar.cc/150?img=12" width={32} height={32} loading="lazy" decoding="async" alt="" className="w-7 h-7 md:w-8 md:h-8 rounded-full border-[2px] border-black" />
                                        <div className="w-7 h-7 md:w-8 md:h-8 rounded-full border-[2px] border-black bg-[#111827] text-white flex items-center justify-center font-bold text-[10px] md:text-xs">+1</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </section>
    );
}
