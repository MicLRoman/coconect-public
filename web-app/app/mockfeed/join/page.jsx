"use client";

import React, { useState } from 'react';
import { ChevronLeft, X, MapPin, Wallet, Utensils, Check, PartyPopper } from 'lucide-react';
import { FeedGradient } from '../../feed/components/popart';

const STEPS = [
    {
        key: 'area', label: 'Area', icon: MapPin, accent: 'bg-[#e11d48]',
        kicker: 'Step 1 · Location', title: ['Where\'s', 'best for you?'], sub: 'Pick an area in London',
        options: [
            { label: 'Soho', sub: 'Central & lively' },
            { label: 'Shoreditch', sub: 'Creative crowd' },
            { label: 'Mayfair', sub: 'Upscale' },
            { label: 'Anywhere', sub: 'No preference' },
        ],
    },
    {
        key: 'budget', label: 'Budget', icon: Wallet, accent: 'bg-[#38bdf8]',
        kicker: 'Step 2 · Budget', title: ['Your', 'budget'], sub: "We'll pick a spot that fits everyone",
        options: [
            { label: '$ (Under 30)', sub: 'Easy-going' },
            { label: '$$ (Under 70)', sub: 'Balanced' },
            { label: '$$$ (No limit)', sub: 'Premium' },
        ],
    },
    {
        key: 'diet', label: 'Diet', icon: Utensils, accent: 'bg-[#c084fc]',
        kicker: 'Step 3 · Diet', title: ['Any food', 'restrictions?'], sub: "We'll brief the restaurant ahead",
        options: [
            { label: 'No restrictions', sub: 'Anything works' },
            { label: 'Vegetarian', sub: 'No meat' },
            { label: 'Vegan', sub: 'Plant-based only' },
            { label: 'Gluten-free', sub: 'GF menu' },
        ],
    },
];

export default function MockJoin() {
    const [stepIndex, setStepIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [done, setDone] = useState(false);

    const step = STEPS[stepIndex];
    const Icon = step.icon;
    const selected = answers[step.key];
    const isLast = stepIndex === STEPS.length - 1;

    const back = () => setStepIndex(i => Math.max(0, i - 1));

    // Picking an option advances the wizard (no bottom CTA).
    const pick = (label) => {
        setAnswers(a => ({ ...a, [step.key]: label }));
        setTimeout(() => {
            if (isLast) setDone(true);
            else setStepIndex(i => i + 1);
        }, 180);
    };

    // ---- Success screen ----
    if (done) {
        return (
            <div className="fixed inset-0 bg-[#fafafa] overflow-hidden font-sans">
                <FeedGradient tab="events" />
                <div className="relative z-10 h-full flex flex-col items-center justify-center p-8 text-center">
                    <div className="w-28 h-28 bg-[#4ade80] border-[4px] border-black rounded-[2rem] flex items-center justify-center mb-8 shadow-[8px_8px_0_#000] rotate-3 animate-pop-float">
                        <PartyPopper size={52} className="text-black" />
                    </div>
                    <span className="bg-[#fde047] border-[3px] border-black font-black uppercase text-[11px] px-4 py-1.5 mb-6 shadow-[3px_3px_0_#000] rounded-full">
                        You're in the pool
                    </span>
                    <h1 className="text-6xl font-black uppercase tracking-tighter text-black mb-4 leading-none">You're in!</h1>
                    <p className="text-sm font-black text-gray-500 mb-12 max-w-xs leading-relaxed uppercase tracking-wide">
                        We'll reveal your table and the exact spot 24h before.
                    </p>
                    <button className="w-full max-w-xs py-4 bg-[#111827] text-white rounded-full font-black uppercase text-sm border-[4px] border-black shadow-[6px_6px_0_#e11d48] hover:-translate-y-1 transition-all">
                        Back to pools
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-[#fafafa] overflow-hidden font-sans flex flex-col">
            <FeedGradient tab="events" />

            {/* Header — glass bar with step pills */}
            <div className="relative z-20 px-5 pt-10 pb-3">
                <div className="bg-white/55 backdrop-blur-xl border-[3px] border-black rounded-[2rem] px-2.5 py-2 shadow-[5px_5px_0_#000] flex items-center justify-between gap-2">
                    <button onClick={back} className="w-10 h-10 bg-white border-[3px] border-black rounded-full flex items-center justify-center shadow-[2px_2px_0_#000] shrink-0">
                        <ChevronLeft size={20} strokeWidth={3} />
                    </button>
                    <div className="flex items-center gap-1.5">
                        {STEPS.map((s, idx) => {
                            const active = idx === stepIndex;
                            const doneStep = idx < stepIndex;
                            const SIcon = s.icon;
                            return (
                                <div key={s.key} className={`flex items-center gap-1.5 h-8 rounded-full border-[3px] border-black overflow-hidden transition-all ${active ? `${s.accent} px-3` : doneStep ? 'bg-[#4ade80] px-2' : 'bg-white px-2'}`}>
                                    {doneStep ? <Check size={12} strokeWidth={4} className="text-black" /> : <SIcon size={12} className={active ? 'text-white' : 'text-black'} />}
                                    {active && <span className="text-[10px] font-black uppercase text-white whitespace-nowrap">{s.label}</span>}
                                </div>
                            );
                        })}
                    </div>
                    <button className="w-10 h-10 bg-white border-[3px] border-black rounded-full flex items-center justify-center shadow-[2px_2px_0_#000] shrink-0">
                        <X size={18} strokeWidth={3} />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="relative z-10 flex-1 overflow-y-auto hide-scrollbar px-5 pt-6 pb-12">
                <div className="max-w-lg mx-auto w-full" key={step.key}>
                    <p className="text-[11px] font-black uppercase tracking-[0.25em] mb-3 text-[#e11d48]">{step.kicker}</p>
                    <h2 className="text-5xl font-black uppercase tracking-tighter text-black leading-[0.9] mb-3">{step.title[0]}<br />{step.title[1]}</h2>
                    <p className="text-sm font-black text-gray-500 uppercase tracking-wide mb-8">{step.sub}</p>

                    <div className="flex flex-col gap-3">
                        {step.options.map(opt => {
                            const sel = selected === opt.label;
                            return (
                                <button
                                    key={opt.label}
                                    onClick={() => pick(opt.label)}
                                    className={`w-full text-left rounded-[1.5rem] border-[3px] border-black px-5 py-4 flex items-center justify-between transition-all ${sel ? 'bg-[#fde047] shadow-[5px_5px_0_#000] -translate-y-0.5' : 'bg-white shadow-[4px_4px_0_#000] hover:-translate-y-0.5'}`}
                                >
                                    <div className="flex items-center gap-3.5">
                                        <div className={`w-11 h-11 rounded-[1rem] border-[3px] border-black flex items-center justify-center shrink-0 ${sel ? 'bg-black text-[#fde047]' : 'bg-[#fafafa] text-black'}`}>
                                            <Icon size={18} />
                                        </div>
                                        <div>
                                            <div className="font-black uppercase text-base text-black tracking-tighter">{opt.label}</div>
                                            {opt.sub && <div className="text-[11px] font-black uppercase tracking-widest text-gray-500">{opt.sub}</div>}
                                        </div>
                                    </div>
                                    <div className={`w-7 h-7 rounded-full border-[3px] border-black flex items-center justify-center shrink-0 ${sel ? 'bg-[#e11d48]' : 'bg-white'}`}>
                                        {sel && <Check size={14} className="text-white" strokeWidth={4} />}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

        </div>
    );
}
