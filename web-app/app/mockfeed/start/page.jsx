"use client";

import React, { useState } from 'react';
import { ArrowRight, ChevronRight, Users, UtensilsCrossed, PartyPopper } from 'lucide-react';
import { FeedGradient } from '../../feed/components/popart';

const SLIDES = [
    {
        Icon: Users, bg: '#e11d48', fg: '#ffffff',
        title: ['Your circle,', 'IRL.'],
        description: "No swiping, no endless DMs. We seat you at small dinners with people actually worth meeting.",
    },
    {
        Icon: UtensilsCrossed, bg: '#38bdf8', fg: '#111827',
        title: ['Curated', 'tables.'],
        description: "Dinners and activities matched to your work, skills, and what you're looking for right now.",
    },
    {
        Icon: PartyPopper, bg: '#fde047', fg: '#111827',
        title: ['We handle', 'the rest.'],
        description: "We pick the group, book the spot, and reveal it 24h before. You just show up.",
    },
];

export default function MockStart() {
    const [slide, setSlide] = useState(0);
    const isLast = slide === SLIDES.length - 1;
    const s = SLIDES[slide];
    const Icon = s.Icon;

    return (
        <div className="fixed inset-0 bg-[#fafafa] flex flex-col font-sans overflow-hidden">
            <FeedGradient tab="events" />

            {/* Progress + skip */}
            <div className="relative z-20 px-6 pt-12 pb-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    {SLIDES.map((_, idx) => (
                        <div key={idx} className={`h-2.5 rounded-full border-[2px] border-black transition-all duration-300 ${slide === idx ? 'w-9 bg-[#fde047]' : slide > idx ? 'w-4 bg-black' : 'w-2.5 bg-white'}`} />
                    ))}
                </div>
                <button onClick={() => setSlide(SLIDES.length - 1)} className="text-[10px] uppercase font-black tracking-widest text-black/50 hover:text-black transition-colors py-2 pl-4">Skip</button>
            </div>

            {/* Brutalist visual */}
            <div className="relative z-10 flex-1 flex items-center justify-center px-6">
                <div
                    key={slide}
                    className="w-56 h-56 sm:w-64 sm:h-64 rounded-[2.5rem] border-[5px] border-black flex items-center justify-center shadow-[12px_12px_0_#000] rotate-3 animate-pop-float"
                    style={{ background: s.bg }}
                >
                    <Icon size={96} style={{ color: s.fg }} strokeWidth={2.5} />
                </div>
            </div>

            {/* Content */}
            <div className="relative z-20 px-6 pb-[max(2rem,env(safe-area-inset-bottom))]">
                <span className="text-3xl font-black tracking-tighter text-black block mb-5">tablr:</span>

                <div key={slide} className="mb-8">
                    <h1 className="text-5xl sm:text-6xl font-black uppercase text-black leading-[0.9] tracking-tighter mb-4">{s.title[0]}<br />{s.title[1]}</h1>
                    <p className="text-sm sm:text-base font-bold text-gray-600 leading-relaxed max-w-sm">{s.description}</p>
                </div>

                <button
                    onClick={() => (isLast ? null : setSlide(p => p + 1))}
                    className="w-full py-4 bg-[#e11d48] text-white rounded-full font-black text-xs uppercase tracking-[0.2em] border-[4px] border-black shadow-[6px_6px_0_#000] hover:-translate-y-1 transition-all active:translate-y-0 flex items-center justify-center gap-2"
                >
                    {isLast ? 'Get started' : 'Next'}
                    {isLast ? <ArrowRight size={16} strokeWidth={3} /> : <ChevronRight size={18} strokeWidth={3} />}
                </button>

                <div className="mt-5 text-center">
                    <button className="text-xs font-black uppercase tracking-wide text-black/60 hover:text-black transition-colors">
                        Already have an account? <span className="underline underline-offset-4">Log in</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
