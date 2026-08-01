"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, ChevronRight, Users, UtensilsCrossed, PartyPopper } from 'lucide-react';
import { getUserId } from '../lib/api';

const SLIDES = [
    {
        icon: Users,
        bg: '#e11d48', fg: '#ffffff',
        title: <>Your circle,<br />IRL.</>,
        description: "No swiping, no endless DMs. We seat you at small dinners with people actually worth meeting.",
    },
    {
        icon: UtensilsCrossed,
        bg: '#38bdf8', fg: '#111827',
        title: <>Curated<br />tables.</>,
        description: "Dinners and activities matched to your work, skills, and what you're looking for right now.",
    },
    {
        icon: PartyPopper,
        bg: '#fde047', fg: '#111827',
        title: <>We handle<br />the rest.</>,
        description: "We pick the group, book the spot, and reveal it 24h before. You just show up.",
    },
];

export default function StartPage() {
    const router = useRouter();
    const [slide, setSlide] = useState(0);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        if (getUserId()) { router.replace('/feed'); return; }
        setReady(true);
    }, [router]);

    if (!ready) return <div className="h-[100dvh] bg-[#111827]" />;

    const isLast = slide === SLIDES.length - 1;
    const s = SLIDES[slide];
    const Icon = s.icon;

    const next = () => (isLast ? router.push('/onboarding') : setSlide(p => p + 1));

    return (
        <div className="h-[100dvh] w-full bg-[#111827] flex flex-col font-sans selection:bg-[#e11d48] selection:text-white relative overflow-hidden">
            {/* Header: progress + skip */}
            <div className="relative z-20 px-6 pt-12 pb-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    {SLIDES.map((_, idx) => (
                        <div key={idx} className={`h-2 rounded-full border-2 border-black transition-all duration-300 ${slide === idx ? 'w-8 bg-[#fde047]' : slide > idx ? 'w-4 bg-white/70' : 'w-2 bg-white/30'}`} />
                    ))}
                </div>
                <button onClick={() => router.push('/onboarding')} className="text-[10px] uppercase font-black tracking-widest text-white/60 hover:text-white transition-colors py-2 pl-4">Skip</button>
            </div>

            {/* Big brutalist visual */}
            <div className="relative z-10 flex-1 flex items-center justify-center px-6">
                <div
                    key={slide}
                    className="w-56 h-56 sm:w-64 sm:h-64 rounded-[2.5rem] border-[5px] border-black flex items-center justify-center shadow-[12px_12px_0_#000] rotate-3 animate-in fade-in zoom-in-95 duration-500"
                    style={{ background: s.bg }}
                >
                    <Icon size={96} style={{ color: s.fg }} strokeWidth={2.5} />
                </div>
            </div>

            {/* Content */}
            <div className="relative z-20 px-6 pb-[max(2rem,env(safe-area-inset-bottom))]">
                <div className="flex items-center gap-2 mb-5">
                    <span className="text-3xl font-black tracking-tighter text-white">coconect:</span>
                </div>

                <div key={slide} className="mb-8 animate-in fade-in slide-in-from-right-4 duration-500">
                    <h1 className="text-4xl sm:text-5xl font-black uppercase text-white leading-[0.95] tracking-tighter mb-4">{s.title}</h1>
                    <p className="text-sm sm:text-base font-medium text-white/70 leading-relaxed max-w-sm">{s.description}</p>
                </div>

                <button
                    onClick={next}
                    className="w-full py-4 bg-[#e11d48] text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] border-[3px] border-black shadow-[6px_6px_0_#fde047] hover:-translate-y-1 transition-all active:translate-y-0 flex items-center justify-center gap-2"
                >
                    {isLast ? 'Get started' : 'Next'}
                    {isLast ? <ArrowRight size={16} /> : <ChevronRight size={18} />}
                </button>

                <div className="mt-5 text-center">
                    <button onClick={() => router.push('/registration?mode=login')} className="text-xs font-bold text-white/70 hover:text-white transition-colors">
                        Already have an account? <span className="underline underline-offset-4 decoration-white/30">Log in</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
