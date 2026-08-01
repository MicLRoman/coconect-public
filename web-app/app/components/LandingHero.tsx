"use client";

import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Users } from 'lucide-react';
import { WhatsAppIcon } from './WhatsAppIcon';
import { API_URL } from '../lib/api';

// Хвост эллипса флоучарта, начиная от node1 (Provide Request) — общий для обоих режимов.
const FLOW_FROM_NODE1 = "C 120 150, 350 80, 550 80 C 800 80, 860 350, 860 600 C 860 800, 750 850, 550 850";

const PlaceCard = ({ bg, title, subtitle }: { bg: string, title: string, subtitle: string }) => (
    <div className="w-[184px] shrink-0 h-full relative p-3 flex flex-col justify-end bg-gray-100 rounded-xl overflow-hidden mx-1 border-[2px] border-black">
        <img src={bg} loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover" alt={title} draggable="false" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent z-10 pointer-events-none"></div>
        <div className="relative z-20 font-black text-white uppercase drop-shadow-md text-sm">{title}</div>
        <div className="relative z-20 font-bold text-[8px] text-[#fde047] uppercase">{subtitle}</div>
    </div>
);

import { useLanguage } from '../lib/LanguageContext';
import HeroSignupChat, { useSignupOpen } from './HeroSignupChat';

// Flowchart презентационный: подсветкой/циклом нод (1..4) рулит родитель (LandingHero).
// ctaPrefix (вариант B) — измеренный в координатах viewBox отрезок «кнопка → node1»,
// который приклеивается ПЕРЕД хвостом эллипса, давая ОДИН непрерывный <path>
// (кнопка → node1 → node2 → node3 → node4) с единым бегущим пунктиром.
const AnimatedFlowchart = ({ isNodeActive, setHoveredNode, svgRef, ctaPrefix }: {
    isNodeActive: (id: number) => boolean;
    setHoveredNode: (id: number | null) => void;
    svgRef?: React.Ref<SVGSVGElement>;
    ctaPrefix?: string | null;
}) => {
    const pathD = ctaPrefix
        ? `${ctaPrefix} ${FLOW_FROM_NODE1}`   // префикс заканчивается на "120 400" (node1)
        : `M 120 400 ${FLOW_FROM_NODE1}`;
    return (
        <div className="absolute inset-0 w-full h-full pointer-events-none z-20">
            {/* Unified viewBox for perfect scaling.
        Node Coordinates (Adjusted to avoid vertical overlap):
        1: (12%, 40%) -> 120, 400  (Moved slightly Higher)
        2: (55%, 8%)  -> 550, 80
        3: (86%, 60%) -> 860, 600  (Moved slightly Lefter)
        4: (55%, 85%) -> 550, 850
      */}
            <svg ref={svgRef} className="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 1000 1000">
                <path
                    d={pathD}
                    fill="none"
                    stroke="#111827"
                    strokeWidth="4"
                    strokeDasharray="8,8"
                    className="animate-[dash_40s_linear_infinite] opacity-30"
                />
            </svg>

            {/* Node 1: Provide Request */}
            <div
                className={`absolute top-[40%] left-[12%] -translate-x-1/2 -translate-y-1/2 pointer-events-auto group ${isNodeActive(1) ? 'z-50' : 'z-40'}`}
                onMouseEnter={() => setHoveredNode(1)} onMouseLeave={() => setHoveredNode(null)}
            >
                <div className="bg-white border-[3px] border-black shadow-[4px_4px_0px_0px_#fde047] px-5 py-3 rounded-2xl cursor-crosshair transition-transform hover:-translate-y-1">
                    <p className="font-black text-black uppercase text-sm whitespace-nowrap">1. Provide Request</p>
                </div>
                <div className={`absolute top-full left-1/2 -translate-x-1/2 mt-4 bg-white border-[3px] border-black shadow-[6px_6px_0px_0px_#e11d48] p-4 rounded-2xl w-[250px] transition-all duration-300 origin-top ${isNodeActive(1) ? 'opacity-100 scale-100' : 'opacity-0 scale-50 pointer-events-none'}`}>
                    <p className="text-xs text-gray-500 font-bold uppercase mb-2">Matching your goals...</p>
                    <p className="text-[#e11d48] text-sm font-mono border-r-2 border-[#e11d48] whitespace-nowrap overflow-hidden inline-block animate-[landing-typing_2s_steps(30,end),blink_0.75s_step-end_infinite]">
                        Need a CTO in London...
                    </p>
                </div>
            </div>

            {/* Node 2: Connect */}
            <div
                className={`absolute top-[8%] left-[55%] -translate-x-1/2 -translate-y-1/2 pointer-events-auto group ${isNodeActive(2) ? 'z-50' : 'z-40'}`}
                onMouseEnter={() => setHoveredNode(2)} onMouseLeave={() => setHoveredNode(null)}
            >
                <div className="bg-white border-[3px] border-black shadow-[4px_4px_0px_0px_#e11d48] px-5 py-3 rounded-2xl cursor-crosshair transition-transform hover:-translate-y-1">
                    <p className="font-black text-black uppercase text-sm whitespace-nowrap">2. Connect</p>
                </div>
                {/* Popup shifted slightly to the left from previous position */}
                <div className={`absolute top-full left-[5%] mt-4 bg-white border-[3px] border-black shadow-[6px_6px_0px_0px_#fde047] p-5 rounded-2xl w-[280px] transition-all duration-300 origin-top-left ${isNodeActive(2) ? 'opacity-100 scale-100' : 'opacity-0 scale-50 pointer-events-none'}`}>
                    <div className="flex flex-col items-center">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-10 h-10 rounded-full border-[2px] border-black bg-blue-500 flex items-center justify-center animate-bounce shadow-[2px_2px_0_#000]"><Users size={16} color="white" /></div>
                            <div className="h-[2px] w-12 bg-black overflow-hidden relative"><div className="absolute top-0 left-0 w-full h-full bg-[#e11d48] animate-[swipeRight_1s_linear_infinite]"></div></div>
                            <div className="w-10 h-10 rounded-full border-[2px] border-black bg-yellow-400 flex items-center justify-center animate-bounce shadow-[2px_2px_0_#000]" style={{ animationDelay: '0.2s' }}><Users size={16} color="black" /></div>
                        </div>
                        <p className="text-xs text-center font-bold text-black">Algorithm aligns your interests in real-time to ensure every conversation at the table actually matters.</p>
                    </div>
                </div>
            </div>

            {/* Node 3: Pick a Place */}
            <div
                className={`absolute top-[60%] left-[86%] -translate-x-1/2 -translate-y-1/2 pointer-events-auto group ${isNodeActive(3) ? 'z-50' : 'z-40'}`}
                onMouseEnter={() => setHoveredNode(3)} onMouseLeave={() => setHoveredNode(null)}
            >
                <div className="bg-white border-[3px] border-black shadow-[4px_4px_0px_0px_#fde047] px-5 py-3 rounded-2xl cursor-crosshair transition-transform hover:-translate-y-1">
                    <p className="font-black text-black uppercase text-sm whitespace-nowrap">3. Get Invitation</p>
                </div>
                {/* Opens to the left to avoid clipping */}
                <div className={`absolute right-full top-1/2 -translate-y-1/2 mr-4 bg-white border-[3px] border-black shadow-[6px_6px_0px_0px_#e11d48] py-2 rounded-2xl w-[220px] h-[160px] transition-all duration-300 origin-right overflow-hidden ${isNodeActive(3) ? 'opacity-100 scale-100' : 'opacity-0 scale-50 pointer-events-none'}`}>
                    <div className="flex h-full w-max animate-[marquee_10s_linear_infinite]">
                        <PlaceCard bg="https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=400&q=80" title="Ritz Restaurant" subtitle="High-End" />
                        <PlaceCard bg="https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?auto=format&fit=crop&w=400&q=80" title="Golf Club" subtitle="Casual Meeting" />
                        <PlaceCard bg="https://images.unsplash.com/photo-1572116469696-31de0f17cc34?auto=format&fit=crop&w=400&q=80" title="VIP Lounge" subtitle="Late Night" />
                        <PlaceCard bg="https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=400&q=80" title="Ritz Restaurant" subtitle="High-End" />
                        <PlaceCard bg="https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?auto=format&fit=crop&w=400&q=80" title="Golf Club" subtitle="Casual Meeting" />
                        <PlaceCard bg="https://images.unsplash.com/photo-1572116469696-31de0f17cc34?auto=format&fit=crop&w=400&q=80" title="VIP Lounge" subtitle="Late Night" />
                    </div>
                </div>
            </div>

            {/* Node 4: Connect & Build */}
            <div
                className={`absolute top-[85%] left-[55%] -translate-x-1/2 -translate-y-1/2 pointer-events-auto bg-white border-[4px] border-black shadow-[8px_8px_0px_0px_#111827] px-6 py-4 rounded-3xl transition-all cursor-pointer z-50 flex items-center gap-6 ${isNodeActive(4) ? 'scale-110' : 'scale-90 rotate-2'}`}
                onMouseEnter={() => setHoveredNode(4)} onMouseLeave={() => setHoveredNode(null)}
            >
                <div className="relative flex items-end gap-2">
                    <span className="text-4xl animate-[bounce_2s_ease-in-out_infinite]">🧑‍💻</span>
                    <div className={`absolute -top-6 -left-4 bg-[#fde047] border-[2px] border-black text-black font-black text-[10px] uppercase px-2 py-1 rounded-xl rounded-bl-none shadow-[2px_2px_0_#000] transition-opacity duration-300 ${isNodeActive(4) ? 'opacity-100' : 'opacity-0'}`}>
                        Let's Build?
                    </div>
                </div>

                <div className="flex gap-1">
                    <div className="w-2 h-2 bg-black rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-black rounded-full animate-pulse delay-75"></div>
                    <div className="w-2 h-2 bg-black rounded-full animate-pulse delay-150"></div>
                </div>

                <div className="relative flex items-end gap-2">
                    <span className="text-4xl animate-[bounce_2.1s_ease-in-out_infinite]">👩‍💼</span>
                    <div className={`absolute -top-6 -right-2 bg-[#e11d48] border-[2px] border-black text-white font-black text-[10px] uppercase px-2 py-1 rounded-xl rounded-br-none shadow-[2px_2px_0_#000] transition-opacity duration-300 delay-300 ${isNodeActive(4) ? 'opacity-100' : 'opacity-0'}`}>
                        I'm in!
                    </div>
                </div>
            </div>
        </div>
    );
};

// Вариант B: WhatsApp-first CTA вместо чата — QR (слева, десктоп) + кнопка «Text me».
// `active` подсвечивает кнопку как шаг 0 цикла флоучарта (перед «Provide Request»).
const HERO_MSG = "Hey! 👋 Ready to meet some cool people?";

// Превью-чат под кнопкой скрыт: его текст перенесён в описание hero.
// Не удаляем — вернуть можно, поставив true (реальный поиск остаётся рабочим).
const SHOW_MOBILE_PREVIEW_CHAT = false;

// Мобильный превью-чат под кнопкой (демо + РЕАЛЬНЫЙ поиск): бот спрашивает кого найти →
// пишешь → идёт реальный поиск по зареганным юзерам (анонимно, read-only) → показываем
// статусы + «N уже в приложении, join?» → дубль Text me. Бэк недоступен/пусто → фолбэк.
type Sample = { role: string; tagline: string; city: string };
function HeroMobileChat({ waLink }: { waLink: string }) {
    const [query, setQuery] = useState("");
    const [phase, setPhase] = useState<'idle' | 'scanning' | 'done'>('idle');
    const [result, setResult] = useState<{ total: number; samples: Sample[] } | null>(null);
    const base = waLink.split('?')[0];
    const waWith = (t: string) => `${base}?text=${encodeURIComponent(t)}`;

    const submit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        const q = query.trim();
        if (!q || phase === 'scanning') return;
        setPhase('scanning');
        setResult(null);
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 4500);
        let data: { total: number; samples: Sample[] } | null = null;
        try {
            const [res] = await Promise.all([
                fetch(`${API_URL}/discovery/preview`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query: q }),
                    signal: ctrl.signal,
                }).then((r) => (r.ok ? r.json() : null)),
                new Promise((r) => setTimeout(r, 1700)),   // мин. время «scanning»
            ]);
            if (res && Array.isArray(res.samples)) data = res;
        } catch { /* timeout / network → фолбэк */ }
        clearTimeout(timer);
        setResult(data ?? { total: 0, samples: [] });
        setPhase('done');
    };

    const bot = "self-start max-w-[92%] bg-white text-black border-[3px] border-black rounded-3xl rounded-tl-md px-5 py-3.5 text-lg font-bold leading-snug shadow-[4px_4px_0_#111827]";
    const enter = "animate-in fade-in slide-in-from-bottom-4 duration-500";
    const found = result?.samples ?? [];
    const total = result?.total ?? 0;

    return (
        <div className="lg:hidden w-full mt-6 flex flex-col gap-3">
            <div className={`${bot} ${enter}`} style={{ animationDelay: '0.8s' }}>
                Every Saturday we run dinners for founders & builders. Small tables, people you'd actually want to meet.
            </div>
            <div className={`${bot} ${enter}`} style={{ animationDelay: '1.6s' }}>
                Tell me who you'd love to find and I'll match you 👇
            </div>

            {/* Реальное поле ввода — отправка запускает реальный поиск */}
            <form onSubmit={submit} className={`self-end w-full max-w-[92%] ${enter}`} style={{ animationDelay: '2.4s' }}>
                <div className="flex items-center gap-2 bg-[#fde047] border-[3px] border-black rounded-3xl rounded-tr-md pl-5 pr-2 py-2 shadow-[4px_4px_0_#111827]">
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="e.g. a technical co-founder…"
                        enterKeyHint="search"
                        className="flex-1 min-w-0 bg-transparent outline-none text-lg font-bold text-black placeholder:text-black/45"
                    />
                    <button type="submit" aria-label="Search" className="shrink-0 w-11 h-11 rounded-full bg-black flex items-center justify-center active:scale-95 transition-transform">
                        <ArrowRight size={20} className="text-white" />
                    </button>
                </div>
            </form>

            {/* Пока ищем — статус + скелетон-шаблон */}
            {phase === 'scanning' && (
                <>
                    <div className={`${bot} ${enter}`}>Scanning who&apos;s already in, anonymously 🔍</div>
                    {[0, 1, 2].map((i) => (
                        <div key={i} className="self-start w-[80%] h-12 rounded-3xl rounded-tl-md bg-white/10 border-[3px] border-white/10 animate-pulse" style={{ animationDelay: `${i * 120}ms` }} />
                    ))}
                </>
            )}

            {/* Результаты (реальные, анонимные) или фолбэк */}
            {phase === 'done' && (
                <>
                    {found.length > 0 ? (
                        <>
                            <div className={`${bot} ${enter}`}>Found people already in for this Saturday 👇</div>
                            {found.map((s, i) => (
                                <div key={i} className={`${bot} ${enter}`} style={{ animationDelay: `${120 + i * 120}ms` }}>
                                    🧑‍💻 {s.role}{s.tagline ? ` · ${s.tagline}` : ''}{s.city ? ` · ${s.city}` : ''}
                                </div>
                            ))}
                            <div className={`${bot} ${enter}`} style={{ animationDelay: `${120 + found.length * 120}ms` }}>
                                {total} {total === 1 ? 'match' : 'matches'} already in the app, some booked for this Saturday 👀 Want to join?
                            </div>
                        </>
                    ) : (
                        <div className={`${bot} ${enter}`}>
                            We&apos;ve already got founders, operators &amp; investors in for this Saturday 👀 Want in?
                        </div>
                    )}
                    <a
                        href={waWith(query.trim() || "Hi! I'd love to join the Saturday dinners 🙌")}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`self-start w-full max-w-[92%] flex items-center justify-center gap-2.5 bg-[#25D366] text-white font-black uppercase text-base px-6 py-4 rounded-2xl border-[3px] border-black shadow-[4px_4px_0_#111827] ${enter}`}
                        style={{ animationDelay: '200ms' }}
                    >
                        <WhatsAppIcon size={20} /> Text me on WhatsApp <ArrowRight size={20} />
                    </a>
                </>
            )}
        </div>
    );
}

function HeroWaCta({ waLink, active, setHoveredNode, buttonRef }: { waLink: string; active: boolean; setHoveredNode: (id: number | null) => void; buttonRef?: React.Ref<HTMLAnchorElement> }) {
    const qr = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=0&data=${encodeURIComponent(waLink)}`;
    return (
        <div className="w-full mt-2">
            <div className="flex items-center gap-5 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* QR + подпись — только на десктопе и первым (слева). На мобиле юзер уже в телефоне. */}
                <div className="hidden lg:flex shrink-0 flex-col items-center gap-2">
                    <a
                        href={waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center bg-white border-[3px] border-black rounded-2xl p-2.5 shadow-[4px_4px_0_#111827] hover:-translate-y-1 transition-transform"
                        title="Scan to open WhatsApp 📱"
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={qr} alt="Scan to open WhatsApp" width={128} height={128} className="w-32 h-32 rounded-lg bg-white" />
                    </a>
                    <span className="max-w-[10rem] text-[11px] font-light leading-tight text-gray-500 text-center">
                        Scan to text us on WhatsApp
                    </span>
                </div>

                {/* Кнопка Text me. На десктопе «дышит» на своём шаге цикла + всплывает сообщение.
                    На мобиле статична — ниже свой превью-чат. */}
                <div className="relative">
                    <a
                        ref={buttonRef}
                        href={waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        onMouseEnter={() => setHoveredNode(0)}
                        onMouseLeave={() => setHoveredNode(null)}
                        className={`relative inline-flex items-center justify-center gap-2.5 bg-[#25D366] text-white font-black uppercase text-sm md:text-base px-6 py-4 md:py-5 rounded-2xl border-[3px] border-black shadow-[4px_4px_0_#111827] transition-shadow duration-300 ${active ? 'lg:animate-[hero-btn-bounce_1.1s_ease-in-out_infinite] lg:shadow-[8px_8px_0_#111827]' : ''}`}
                    >
                        <WhatsAppIcon size={20} className="shrink-0" />
                        Text me on WhatsApp
                        <ArrowRight size={20} className="shrink-0" />
                    </a>

                    {/* Десктопное всплывающее сообщение (на мобиле — свой чат ниже) */}
                    <div
                        className={`hidden lg:block absolute left-1 top-full mt-3 origin-top-left pointer-events-none transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${active ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-1 scale-90'}`}
                        aria-hidden="true"
                    >
                        <div className="inline-block bg-white text-black border-[2px] border-black rounded-2xl rounded-tl-sm px-3.5 py-2 text-xs font-bold shadow-[2px_2px_0_#111827] whitespace-nowrap">
                            {HERO_MSG}
                        </div>
                    </div>
                </div>
            </div>

            {/* Мобильный превью-чат под кнопкой (скрыт — текст ушёл в описание hero) */}
            {SHOW_MOBILE_PREVIEW_CHAT && <HeroMobileChat waLink={waLink} />}
        </div>
    );
}

// Соц-пруф внизу hero: витрина логотипов стартапов, откуда приходят гости.
// Пока текстовые вордмарки-плейсхолдеры (без ассетов) — заменить на реальные SVG.
const STARTUP_LOGOS = ['Stripe', 'Notion', 'Vercel', 'Linear', 'Ramp', 'Figma', 'Retool', 'Deel', 'Mercury', 'Supabase', 'Brex', 'Rippling'];
function HeroLogos() {
    // Каждая «половина» = список ×2, чтобы даже на широком экране перекрывать вьюпорт без пустот.
    // Две одинаковые половины + сдвиг marquee на -50% = бесшовная бесконечная лента.
    const half = [...STARTUP_LOGOS, ...STARTUP_LOGOS];
    return (
        <section className="bg-[#fafafa] py-6 md:py-7 shrink-0">
            <p className="text-center text-[11px] md:text-xs font-black uppercase tracking-[0.2em] text-gray-400 mb-5 md:mb-6 px-6">
                Builders from teams like
            </p>
            <div className="overflow-hidden">
                <div className="flex w-max items-center animate-[marquee_45s_linear_infinite]">
                    {[0, 1].map((rep) => (
                        <div key={rep} className="flex items-center shrink-0" aria-hidden={rep === 1}>
                            {half.map((n, i) => (
                                <span key={i} className="mx-6 md:mx-9 text-xl md:text-2xl font-black tracking-tight text-gray-300 select-none whitespace-nowrap">
                                    {n}
                                </span>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

// Заголовок: «MEET YOUR NEXT» + последнее слово листается (co-founder → investor → …).
const TITLE_WORDS = ['Co-Founder.', 'Investor.', 'First Hire.', 'Friend.'];

export default function LandingHero() {
    const roles = ['founders', 'operators', 'builders'];
    const [roleIndex, setRoleIndex] = useState(0);
    const [titleIndex, setTitleIndex] = useState(0);
    const { t } = useLanguage();
    const { variant, waLink } = useSignupOpen();
    const isB = variant === 'b';

    // Цикл флоучарта. В варианте B шаг 0 — это кнопка «Text me»: пока она активна,
    // кнопка «дышит» и под ней всплывает сообщение; затем 1 (Provide Request) → 2 → 3 → 4
    // и снова к кнопке. Hover по кнопке (node 0) или ноде ставит цикл на паузу и держит подсветку.
    const [hoveredNode, setHoveredNode] = useState<number | null>(null);
    const [activeIndex, setActiveIndex] = useState(1);
    useEffect(() => { setActiveIndex(isB ? 0 : 1); }, [isB]);
    useEffect(() => {
        if (hoveredNode !== null) return;
        const min = isB ? 0 : 1;
        const interval = setInterval(() => {
            setActiveIndex((prev) => (prev >= 4 ? min : prev + 1));
        }, 3000);
        return () => clearInterval(interval);
    }, [hoveredNode, isB]);
    const isNodeActive = (id: number) => hoveredNode === id || (hoveredNode === null && activeIndex === id);
    const ctaActive = isB && isNodeActive(0);

    // Единая линия «кнопка → node1»: меряем реальные позиции кнопки и SVG флоучарта
    // и строим префикс пути в координатах viewBox (0..1000). Пересчёт на ресайзе.
    const buttonRef = useRef<HTMLAnchorElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const [ctaPrefix, setCtaPrefix] = useState<string | null>(null);
    useEffect(() => {
        if (!isB) { setCtaPrefix(null); return; }
        const compute = () => {
            const svg = svgRef.current, btn = buttonRef.current;
            if (!svg || !btn) return;
            const s = svg.getBoundingClientRect(), b = btn.getBoundingClientRect();
            if (!s.width || !s.height) return;            // флоучарт скрыт (< lg) — линии нет
            const ax = b.right - 6;                        // выходим из правой части кнопки
            const ay = b.top + b.height * 0.75;            // касаемся ПОНИЖЕ
            const vbx = ((ax - s.left) / s.width) * 1000;  // preserveAspectRatio=none → линейно
            const vby = ((ay - s.top) / s.height) * 1000;
            const c1x = vbx + (120 - vbx) * 0.62;          // контроль сильно к node1 → глубже изгиб
            const c2y = 400 + (vby - 400) * 0.66;          // в node1 строго вертикально (снизу), длиннее подъём
            setCtaPrefix(`M ${vbx.toFixed(1)} ${vby.toFixed(1)} C ${c1x.toFixed(1)} ${vby.toFixed(1)}, 120 ${c2y.toFixed(1)}, 120 400`);
        };
        compute();
        const ro = new ResizeObserver(compute);
        if (svgRef.current) ro.observe(svgRef.current);
        const t = setTimeout(compute, 400);               // добор после подгрузки шрифтов/QR
        window.addEventListener('resize', compute);
        return () => { ro.disconnect(); clearTimeout(t); window.removeEventListener('resize', compute); };
    }, [isB]);

    useEffect(() => {
        const interval = setInterval(() => {
            setRoleIndex((prev) => (prev + 1) % roles.length);
        }, 1000);
        return () => clearInterval(interval);
    }, [roles.length]);

    useEffect(() => {
        const interval = setInterval(() => {
            setTitleIndex((prev) => (prev + 1) % TITLE_WORDS.length);
        }, 2200);
        return () => clearInterval(interval);
    }, []);

    return (
        <div id="hero" data-anim className="min-h-screen flex flex-col overflow-x-clip border-b-[4px] border-black bg-[#fafafa]">
            {/* Main Hero Content */}
            <section className="flex-1 relative pt-32 pb-8 px-6 overflow-visible flex flex-col justify-center">
                {/* Static soft glow. Dropped animate-pulse + mix-blend-multiply and
                    halved the blur radius on mobile: animating/compositing a 600px
                    blur-[120px] blend-mode element was a heavy per-frame repaint,
                    worst on mobile GPUs. Visually near-identical. */}
                <div className="absolute top-1/4 -left-32 w-[600px] h-[600px] bg-[#fde047]/40 rounded-full blur-[70px] md:blur-[120px] pointer-events-none"></div>
                <div className="absolute top-1/3 right-0 w-[500px] h-[500px] bg-[#e11d48]/30 rounded-full blur-[70px] md:blur-[120px] pointer-events-none"></div>

                <div className="max-w-7xl mx-auto w-full relative z-30 flex flex-col lg:flex-row items-start gap-12 lg:gap-20">

                    {/* Изменили классы центрирования для мобильных экранов: убрали items-center и text-center */}
                    <div className="w-full lg:w-1/2 relative z-30 flex flex-col items-start text-left">

                        <h1 className="text-[min(13vw,3.75rem)] md:text-6xl lg:text-[3.75rem] xl:text-[4.5rem] font-black tracking-tighter text-black leading-[0.9] mb-6 mt-10 lg:mt-0 uppercase">
                            Meet Your<br />Next<br />
                            {/* Ролик: активное слово на месте, предыдущее уезжает ВВЕРХ, следующее
                                ждёт снизу. clip-path режет только сверху/снизу — вправо слово не обрезается. */}
                            <span className="block mt-2 relative leading-none" style={{ clipPath: 'inset(0 -100% 0 0)' }}>
                                {/* невидимый плейсхолдер задаёт высоту строки (самое широкое слово) */}
                                <span className="invisible whitespace-nowrap">First Hire.</span>
                                {TITLE_WORDS.map((word, i) => {
                                    const isActive = i === titleIndex;
                                    const isPrev = i === (titleIndex - 1 + TITLE_WORDS.length) % TITLE_WORDS.length;
                                    const pos = isActive
                                        ? 'translate-y-0 opacity-100'
                                        : isPrev
                                            ? '-translate-y-full opacity-0'
                                            : 'translate-y-full opacity-0';
                                    return (
                                        <span
                                            key={word}
                                            className={`absolute left-0 top-0 whitespace-nowrap text-transparent bg-clip-text bg-gradient-to-r from-[#e11d48] to-[#f59e0b] transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${pos}`}
                                        >
                                            {word}
                                        </span>
                                    );
                                })}
                            </span>
                        </h1>

                        {isB ? (
                        <p className="text-lg md:text-xl text-black font-medium mb-10 leading-relaxed max-w-xl">
                            Every seat at your table is picked from what you asked for: people who can fund it, build it, or run it. One dinner, this Saturday.
                        </p>
                        ) : (
                        <p className="text-lg md:text-xl text-black font-medium mb-10 leading-relaxed max-w-xl">
                            {t.hero.meetAmbitious}{' '}
                            <span className="relative inline-grid grid-cols-1 grid-rows-1 align-baseline font-black text-xl md:text-xl">
                                {/* Невидимый плейсхолдер с увеличенным размером "operators" и легким отступом pr-0.5 предотвращает обрезание "s" */}
                                <span className="invisible col-start-1 row-start-1 pointer-events-none pr-0.5">operators</span>

                                {/* Абсолютный контейнер скрывает текст, который вылетает за пределы, не ломая baseline */}
                                <span className="absolute inset-0 overflow-hidden">
                                    {roles.map((role, index) => {
                                        const isActive = index === roleIndex;
                                        const isPrevious = index === (roleIndex - 1 + roles.length) % roles.length;

                                        let positionClass = 'opacity-0 translate-y-full';
                                        if (isActive) positionClass = 'opacity-100 translate-y-0';
                                        else if (isPrevious) positionClass = 'opacity-0 -translate-y-full';

                                        return (
                                            <span
                                                key={role}
                                                className={`absolute inset-0 transition-transform duration-300 ${positionClass}`}
                                            >
                                                {role}
                                            </span>
                                        )
                                    })}
                                </span>
                            </span>{' '}
                            {t.hero.inRealLife}
                        </p>
                        )}

                        {/* v=b: WhatsApp-first CTA (QR + Text me). Иначе — интерактивный чат. */}
                        {isB ? <HeroWaCta waLink={waLink} active={ctaActive} setHoveredNode={setHoveredNode} buttonRef={buttonRef} /> : <HeroSignupChat />}
                    </div>

                    {/* Добавлены классы сдвига: lg:translate-x-8 xl:translate-x-16 2xl:translate-x-24 */}
                    <div className="w-full lg:w-1/2 h-[400px] md:h-[600px] relative z-20 mt-4 lg:mt-0 hidden lg:block lg:translate-x-8 xl:translate-x-16 2xl:translate-x-24 transition-transform duration-500">
                        <AnimatedFlowchart isNodeActive={isNodeActive} setHoveredNode={setHoveredNode} svgRef={svgRef} ctaPrefix={isB ? ctaPrefix : null} />
                    </div>
                </div>
            </section>

            {/* TICKER BANNER — скрыт по просьбе (не удалён). Вернуть: убрать `hidden`. */}
            <section className="hidden bg-[#111827] text-white py-4 overflow-hidden flex whitespace-nowrap border-t-[4px] border-black shrink-0 relative z-40">
                {/* Добавлен класс w-max и продублирован массив 4 раза, чтобы покрывать ультра-широкие экраны без разрывов */}
                <div className="animate-[marquee_20s_linear_infinite] flex items-center gap-8 text-[10px] md:text-sm font-black tracking-widest uppercase w-max">
                    {Array(4).fill(0).map((_, i) => (
                        <React.Fragment key={i}>
                            <span>Founders</span> <span className="text-[#e11d48]">♦</span>
                            <span>Investors</span> <span className="text-[#e11d48]">♦</span>
                            <span>Developers</span> <span className="text-[#e11d48]">♦</span>
                            <span>Entrepreneurs</span> <span className="text-[#e11d48]">♦</span>
                            <span>Mentors</span> <span className="text-[#e11d48]">♦</span>
                            <span>Operators</span> <span className="text-[#e11d48]">♦</span>
                            <span>Product Leads</span> <span className="text-[#e11d48]">♦</span>
                            <span>Engineers</span> <span className="text-[#e11d48]">♦</span>
                        </React.Fragment>
                    ))}
                </div>
            </section>

            {/* Соц-пруф: логотипы стартапов внизу hero */}
            <HeroLogos />
        </div>
    );
}