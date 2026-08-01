"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Check, X, Globe, Flame, Crown, Star, Sparkles } from 'lucide-react';

const TIER_BADGE: Record<string, { label: string; cls: string }> = {
    'Premium': { label: 'VIP', cls: 'bg-[#111827] text-[#fde047]' },
    'Core Membership': { label: 'PRO', cls: 'bg-[#111827] text-[#38bdf8]' },
    'Starter': { label: 'FREE', cls: 'bg-white text-black' },
};

const TIER_PERKS: Record<string, string[]> = {
    'Starter': ['1 curated dinner / month', 'Access to the network', 'Post-event reconnect'],
    'Core Membership': ['2 experiences / month', 'Activities + quarterly city meetup', 'Priority over waitlist'],
    'Premium': ['4 experiences / month', 'Special formats', 'Priority seating', 'All Core perks'],
};

type Modal = null | 'city' | 'bookings' | 'sub';

// Stable shell (module-level) so enter/exit animations don't re-trigger on re-render.
function ModalShell({ closing, onClose, shadow = '#e11d48', children }:
    { closing: boolean; onClose: () => void; shadow?: string; children: React.ReactNode }) {
    return (
        <div className="fixed inset-0 z-[130] flex items-center justify-center px-4" onClick={onClose}>
            <div className={`absolute inset-0 bg-black/50 backdrop-blur-sm duration-200 ${closing ? 'animate-out fade-out' : 'animate-in fade-in'}`} />
            <div
                onClick={e => e.stopPropagation()}
                style={{ boxShadow: `8px 8px 0 ${shadow}` }}
                className={`relative w-full max-w-md bg-[#fafafa] border-[4px] border-black rounded-[2rem] p-6 duration-300 ${closing ? 'animate-out fade-out slide-out-to-bottom-4' : 'animate-in fade-in slide-in-from-bottom-4'}`}
            >
                <button onClick={onClose} className="absolute top-5 right-5 w-9 h-9 bg-white border-[2px] border-black rounded-full flex items-center justify-center shadow-[2px_2px_0_#000] z-10 hover:-translate-y-0.5 transition-transform"><X size={18} strokeWidth={3} /></button>
                {children}
            </div>
        </div>
    );
}

export const NotificationsHeader = ({
    city = "London", subtitle = "Build your circle", cities = [], onChangeCity,
    tier = "Starter", eventsRemaining = 0, eventsQuota = 1
}: {
    city?: string; subtitle?: string; cities?: string[]; onChangeCity?: (c: string) => void;
    tier?: string; eventsRemaining?: number; eventsQuota?: number;
}) => {
    const router = useRouter();
    const [modal, setModal] = useState<Modal>(null);
    const [closing, setClosing] = useState(false);
    const pickable = onChangeCity && cities.length > 0;
    const badge = TIER_BADGE[tier] || TIER_BADGE['Starter'];
    const perks = TIER_PERKS[tier] || TIER_PERKS['Starter'];

    const open = (m: Modal) => { setClosing(false); setModal(m); };
    const close = () => {
        setClosing(true);
        setTimeout(() => { setModal(null); setClosing(false); }, 200);
    };
    const goto = (path: string) => { setModal(null); setClosing(false); router.push(path); };

    return (
        <>
            <div className="px-4 sm:px-5 pt-6 sm:pt-8 pb-4 z-20">
                <div className="bg-transparent backdrop-blur-md border-[4px] border-black rounded-[2rem] px-4 py-2.5 shadow-[6px_6px_0_#000] flex justify-between items-center gap-3">
                    <div className="min-w-0">
                        <p className="text-[9px] sm:text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none mb-1">{subtitle}</p>
                        <button onClick={() => pickable && open('city')} className={`flex items-center gap-2 group ${pickable ? '' : 'cursor-default'}`}>
                            <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tighter text-[#111827] truncate leading-none">{city}</h1>
                            {pickable && <span className="w-6 h-6 bg-pop-lemon border-[2px] border-black rounded-lg flex items-center justify-center shadow-[2px_2px_0_#000] group-hover:-translate-y-0.5 transition-all shrink-0"><ChevronDown size={14} strokeWidth={3} /></span>}
                        </button>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => open('bookings')} title="Bookings left" className="relative w-10 h-10 bg-white border-[3px] border-black rounded-full flex items-center justify-center shadow-[2px_2px_0_#000] hover:-translate-y-0.5 transition-all">
                            <Flame size={17} className="text-[#f59e0b]" />
                            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-pop-mint text-black border-2 border-black rounded-full text-[9px] font-black flex items-center justify-center">{eventsRemaining}</span>
                        </button>
                        <button onClick={() => open('sub')} title={tier} className={`h-10 px-3.5 border-[3px] border-black rounded-full font-black uppercase text-xs shadow-[2px_2px_0_#000] hover:-translate-y-0.5 transition-all ${badge.cls}`}>{badge.label}</button>
                    </div>
                </div>
            </div>

            {/* CITY */}
            {modal === 'city' && (
                <ModalShell closing={closing} onClose={close} shadow="#111827">
                    <h2 className="font-black uppercase text-xl flex items-center gap-2 mb-5"><Globe size={20} /> Choose your city</h2>
                    <div className="flex flex-col gap-2.5">
                        {cities.map(c => {
                            const active = c === city;
                            return (
                                <button key={c} onClick={() => { onChangeCity?.(c); close(); }}
                                    className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl border-[3px] border-black font-black uppercase text-base transition-all ${active ? 'bg-[#fde047] shadow-[4px_4px_0_#000] -translate-y-0.5' : 'bg-white hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#000]'}`}>
                                    {c}{active && <span className="w-6 h-6 rounded-full bg-[#e11d48] border-[2px] border-black flex items-center justify-center"><Check size={13} className="text-white" strokeWidth={4} /></span>}
                                </button>
                            );
                        })}
                    </div>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mt-4 text-center">Changing city updates your profile.</p>
                </ModalShell>
            )}

            {/* BOOKINGS */}
            {modal === 'bookings' && (
                <ModalShell closing={closing} onClose={close} shadow="#34d399">
                    <div className="flex flex-wrap gap-2 mb-5">
                        {Array.from({ length: Math.max(eventsQuota, 1) }).map((_, i) => (
                            <div key={i} className={`w-11 h-11 rounded-2xl border-[3px] border-black flex items-center justify-center ${i < eventsRemaining ? 'bg-[#f59e0b]' : 'bg-gray-100'}`}>
                                {i < eventsRemaining ? <Flame size={20} className="text-white" /> : null}
                            </div>
                        ))}
                    </div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter text-[#111827] leading-none mb-3">Your bookings</h2>
                    <p className="text-sm font-bold text-gray-600 leading-relaxed mb-6">
                        You have <span className="text-[#111827]">{eventsRemaining} of {eventsQuota}</span> bookings left this month. Go to more dinners and the algorithm learns your vibe and picks sharper tables.
                    </p>
                    <button onClick={() => goto('/checkout')} className="w-full py-3.5 bg-[#111827] text-white rounded-2xl font-black uppercase text-sm border-[3px] border-black shadow-[4px_4px_0_#34d399] hover:-translate-y-1 transition-all">Get more bookings</button>
                </ModalShell>
            )}

            {/* SUBSCRIPTION */}
            {modal === 'sub' && (
                <ModalShell closing={closing} onClose={close} shadow="#e11d48">
                    <div className="w-12 h-12 bg-[#fde047] border-[3px] border-black rounded-2xl flex items-center justify-center mb-4 shadow-[3px_3px_0_#000]">
                        {tier === 'Premium' ? <Star size={24} className="text-black" fill="#111827" /> : <Crown size={24} className="text-black" />}
                    </div>
                    <span className="inline-flex items-center gap-1 bg-[#111827] text-white px-3 py-1 rounded-full border-2 border-black font-black uppercase text-[10px] mb-3"><Sparkles size={11} /> {badge.label} plan</span>
                    <h2 className="text-3xl font-black uppercase tracking-tighter text-[#111827] leading-none mb-4">{tier}</h2>
                    <ul className="space-y-2 mb-5">
                        {perks.map(p => <li key={p} className="flex items-start gap-2 text-sm font-bold text-gray-700"><Check size={15} className="text-[#34d399] shrink-0 mt-0.5" strokeWidth={3} /> {p}</li>)}
                    </ul>
                    <div className="bg-white border-[3px] border-black rounded-2xl p-3 mb-5 flex items-center justify-between shadow-[3px_3px_0_#000]">
                        <span className="font-black uppercase text-xs text-gray-600">Bookings left</span>
                        <span className="font-black text-lg">{eventsRemaining} / {eventsQuota}</span>
                    </div>
                    <button onClick={() => goto('/checkout')} className="w-full py-3.5 bg-[#e11d48] text-white rounded-2xl font-black uppercase text-sm border-[3px] border-black shadow-[4px_4px_0_#111827] hover:-translate-y-1 transition-all">
                        {tier === 'Premium' ? 'Manage plan' : 'Upgrade plan'}
                    </button>
                </ModalShell>
            )}
        </>
    );
};
