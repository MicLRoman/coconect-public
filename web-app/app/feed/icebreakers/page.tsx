"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';

// For now Icebreakers is just a curated list of prompts to spark conversation at
// the table. Later this can grow into something interactive (shuffle, save,
// per-table sets, etc.) — keep the data shape simple until then.
const ICEBREAKERS: { emoji: string; tint: string; title: string; questions: string[] }[] = [
    {
        emoji: '🔥', tint: 'bg-pop-rose', title: 'Warm up',
        questions: [
            "What's the best thing that happened to you this week?",
            "If tonight had a soundtrack, what's the first song?",
            "What made you say yes to coming out tonight?",
        ],
    },
    {
        emoji: '🧠', tint: 'bg-pop-sky', title: 'Go deeper',
        questions: [
            "What's something you changed your mind about recently?",
            "What are you weirdly good at that never comes up?",
            "What's a belief you hold that most people disagree with?",
        ],
    },
    {
        emoji: '🚀', tint: 'bg-pop-lavender', title: 'Dreams & plans',
        questions: [
            "If money wasn't a thing, what would you be building?",
            "Where do you want to be living in five years?",
            "What's a skill you'd master if you had a free year?",
        ],
    },
    {
        emoji: '😂', tint: 'bg-pop-lemon', title: 'Just for fun',
        questions: [
            "What's the most unhinged thing in your camera roll right now?",
            "Most overrated food — go.",
            "What fictional world would you actually move to?",
        ],
    },
];

export default function IcebreakersPage() {
    const router = useRouter();

    return (
        <div className="min-h-[100dvh] pb-16 relative z-10">
            {/* Header pill */}
            <div className="px-4 sm:px-5 pt-10 sm:pt-12 pb-2 sticky top-0 z-20">
                <div className="bg-white border-[4px] border-black rounded-[2rem] px-3 py-2.5 shadow-[6px_6px_0_#000] flex items-center gap-3">
                    <button onClick={() => router.back()} className="w-10 h-10 bg-white border-[3px] border-black rounded-full flex items-center justify-center shadow-[2px_2px_0_#000] hover:-translate-y-0.5 transition-all shrink-0">
                        <ChevronLeft size={20} strokeWidth={3} />
                    </button>
                    <div className="min-w-0">
                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest leading-none mb-1">Cheat sheet for tonight</p>
                        <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tighter text-[#111827] leading-none truncate">Icebreakers 🧊</h1>
                    </div>
                </div>
            </div>

            <div className="px-5 pt-4 space-y-9">
                {ICEBREAKERS.map((group, gi) => (
                    <div key={group.title} className="relative pt-3">
                        {/* Section ribbon */}
                        <div className={`absolute -top-1 left-4 z-10 bg-pop-dark text-white font-black uppercase text-xs px-4 py-2 rounded-[1.25rem] border-[3px] border-white shadow-[4px_4px_0_#000] ${gi % 2 ? 'rotate-2' : '-rotate-2'}`}>
                            {group.emoji} {group.title}
                        </div>

                        <div className="bg-white border-[4px] border-black rounded-[2.5rem] p-4 pt-9 shadow-[10px_10px_0_#000] space-y-4">
                            {group.questions.map((q, qi) => (
                                <div key={q} className={`${group.tint} border-[3px] border-black rounded-[1.5rem] p-4 shadow-[4px_4px_0_#000] flex items-start gap-3 ${(gi + qi) % 2 ? 'rotate-[0.6deg]' : '-rotate-[0.6deg]'}`}>
                                    <span className="w-8 h-8 bg-white border-[2px] border-black rounded-full flex items-center justify-center shrink-0 font-black text-sm shadow-[2px_2px_0_#000]">
                                        {qi + 1}
                                    </span>
                                    <p className="font-black uppercase text-sm leading-snug text-black pt-0.5">{q}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                <p className="text-center text-[10px] font-black uppercase tracking-widest text-black/40 pt-2">
                    More coming soon ✨
                </p>
            </div>
        </div>
    );
}
