"use client";

import React, { useState } from 'react';
import { ChevronLeft, MapPin, Clock, Check, XCircle, CheckCircle2 } from 'lucide-react';
import { FeedGradient, Chip, CHIP_COLORS } from '../../feed/components/popart';

const EVENT = {
    title: 'Curated Dinner',
    date: 'Today',
    time: '19:00',
    city: 'London',
    countdown: 'in 3h 20m',
    location: { name: 'Dishoom Soho', address: '22 Kingly St, Carnaby' },
    players: ['Founder', 'Product Lead', 'Angel Investor', 'ML Engineer', 'Designer', 'Growth Lead'],
};

export default function MockEvent() {
    const [confirmed, setConfirmed] = useState(false);

    return (
        <div className="fixed inset-0 bg-[#fafafa] overflow-hidden font-sans">
            <FeedGradient tab="events" />

            <div className="relative z-10 h-full overflow-y-auto hide-scrollbar max-w-lg mx-auto px-5 pt-5 pb-44">
                {/* Header — glass bar */}
                <div className="sticky top-2 z-30 mb-9">
                    <div className="bg-white/55 backdrop-blur-xl border-[3px] border-black rounded-[2rem] pl-2 pr-3 py-2 shadow-[5px_5px_0_#000] flex items-center gap-3">
                        <button className="w-10 h-10 bg-white border-[3px] border-black rounded-full flex items-center justify-center shadow-[2px_2px_0_#000] hover:-translate-y-0.5 transition-all shrink-0">
                            <ChevronLeft size={20} strokeWidth={3} />
                        </button>
                        <h2 className="font-black uppercase text-lg tracking-tight">Your Pool</h2>
                        <span className="ml-auto bg-[#4ade80] border-[3px] border-black rounded-full font-black uppercase text-[10px] px-3 py-1.5 shadow-[2px_2px_0_#000] inline-flex items-center gap-1">
                            <Check size={12} strokeWidth={4} /> You're in
                        </span>
                    </div>
                </div>

                {/* Title + chips */}
                <h1 className="text-5xl font-black uppercase tracking-tighter leading-[0.9] mb-4 text-black">{EVENT.title}</h1>
                <div className="flex flex-wrap gap-2 mb-7">
                    <span className="bg-[#fde047] border-[3px] border-black rounded-full font-black uppercase text-[10px] px-3 py-1.5 shadow-[2px_2px_0_#000]">{EVENT.date}</span>
                    <span className="bg-white border-[3px] border-black rounded-full font-black uppercase text-[10px] px-3 py-1.5 shadow-[2px_2px_0_#000] inline-flex items-center gap-1.5"><Clock size={12} strokeWidth={3} /> {EVENT.time}</span>
                    <span className="bg-white border-[3px] border-black rounded-full font-black uppercase text-[10px] px-3 py-1.5 shadow-[2px_2px_0_#000]">{EVENT.city}</span>
                </div>

                {/* Location revealed (dark) */}
                <div className="relative pt-3 mb-8">
                    <div className="absolute -top-1 left-5 z-10 bg-[#e11d48] text-white font-black uppercase text-xs px-4 py-2 rounded-full border-[3px] border-white shadow-[4px_4px_0_#000] -rotate-2">
                        📍 Location Revealed
                    </div>
                    <div className="bg-[#111827] text-white border-[4px] border-black rounded-[2.5rem] p-6 pt-9 shadow-[10px_10px_0_#fde047] relative overflow-hidden">
                        <div className="absolute top-0 right-0 bg-[#e11d48] text-white text-[10px] font-black uppercase px-3 py-1.5 border-b-[3px] border-l-[3px] border-black rounded-bl-2xl">{EVENT.countdown}</div>
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-[#e11d48] border-[3px] border-black rounded-full flex items-center justify-center shrink-0 shadow-[3px_3px_0_#000] animate-pop-float">
                                <MapPin size={22} className="text-white" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Tonight's spot</p>
                                <h3 className="font-black uppercase text-2xl leading-none tracking-tighter">{EVENT.location.name}</h3>
                                <p className="text-xs font-bold text-gray-400 uppercase mt-1.5">{EVENT.location.address}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Your table — player tags only */}
                <div className="relative pt-3">
                    <div className="absolute -top-1 left-5 z-10 bg-[#38bdf8] text-black font-black uppercase text-xs px-4 py-2 rounded-full border-[3px] border-black shadow-[4px_4px_0_#000] -rotate-2">
                        🍽 Your Table
                    </div>
                    <div className="bg-white border-[4px] border-black rounded-[2.5rem] p-5 pt-9 shadow-[8px_8px_0_#000]">
                        <div className="flex flex-wrap gap-2">
                            {EVENT.players.map((t, i) => <Chip key={t} color={CHIP_COLORS[i % CHIP_COLORS.length]}>{t}</Chip>)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Fixed actions — glass bar */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-lg px-5 z-30">
                <div className="bg-white/55 backdrop-blur-xl border-[3px] border-black rounded-[2.25rem] p-3 shadow-[8px_8px_0_#000] space-y-2.5">
                    <button
                        onClick={() => setConfirmed(true)}
                        className={`w-full py-4 rounded-full font-black uppercase text-sm border-[3px] border-black shadow-[4px_4px_0_#000] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 ${confirmed ? 'bg-[#111827] text-[#4ade80]' : 'bg-[#4ade80] text-black'}`}
                    >
                        <CheckCircle2 size={20} strokeWidth={2.5} /> {confirmed ? "Attendance confirmed" : "Confirm attendance"}
                    </button>
                    <button className="w-full bg-white/80 text-gray-500 py-3 rounded-full font-black uppercase text-xs border-[3px] border-gray-300 hover:border-[#e11d48] hover:text-[#e11d48] transition-all flex items-center justify-center gap-2">
                        <XCircle size={16} /> Cancel RSVP
                    </button>
                </div>
            </div>
        </div>
    );
}
