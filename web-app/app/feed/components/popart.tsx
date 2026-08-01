"use client";

import React from 'react';

/* ============================================================
   Shared pop-art / neo-brutalist building blocks for the feed.
   Used across events / connections / notifications / profile so
   every tab shares one visual language.
   ============================================================ */

// ---- Custom bottom-nav icons -------------------------------------------------

export const NavHome = ({ active, className = "" }: { active?: boolean; className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M4 21V9l8-5 8 5v12" fill={active ? "currentColor" : "none"} />
        <rect x="9" y="13" width="6" height="8" fill={active ? "#fff" : "none"} stroke={active ? "none" : "currentColor"} strokeWidth="2.5" />
    </svg>
);

export const NavNetwork = ({ active, className = "" }: { active?: boolean; className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polygon points="12 6 6 17 18 17" />
        <circle cx="12" cy="6" r="3" fill={active ? "currentColor" : "#fff"} stroke="currentColor" />
        <circle cx="6" cy="17" r="3" fill={active ? "currentColor" : "#fff"} stroke="currentColor" />
        <circle cx="18" cy="17" r="3" fill={active ? "currentColor" : "#fff"} stroke="currentColor" />
    </svg>
);

export const NavAlerts = ({ active, className = "" }: { active?: boolean; className?: string }) => (
    <svg viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
);

export const NavProfile = ({ active, className = "" }: { active?: boolean; className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="8" r="4" fill={active ? "currentColor" : "none"} />
        <path d="M4 21 a8 8 0 0 1 16 0" fill={active ? "currentColor" : "none"} />
    </svg>
);

// ---- Animated gradient background -------------------------------------------
// Same blobs everywhere, nudged to a different spot per tab. Lives behind the
// feed content (in the layout) so it persists & shifts smoothly on navigation.

const GRADIENT_SHIFT: Record<string, string> = {
    events: 'translate3d(0%, 0%, 0)',
    connections: 'translate3d(-18%, 14%, 0)',
    alerts: 'translate3d(16%, -12%, 0)',
    profile: 'translate3d(-12%, -16%, 0)',
};

export const FeedGradient = ({ tab }: { tab: string }) => (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden mix-blend-multiply opacity-40">
        <div
            className="absolute inset-[-25%] transition-transform duration-[1200ms] ease-in-out will-change-transform"
            style={{ transform: GRADIENT_SHIFT[tab] || GRADIENT_SHIFT.events }}
        >
            <div className="gblob absolute -top-20 -left-20 w-[60vh] h-[60vh] bg-[#fde047] rounded-full blur-[100px]" style={{ animationDelay: '0s' }} />
            <div className="gblob absolute top-[20%] -right-20 w-[70vh] h-[70vh] bg-[#e11d48] rounded-full blur-[120px]" style={{ animationDelay: '-4s' }} />
            <div className="gblob absolute bottom-[-10%] left-[10%] w-[60vh] h-[60vh] bg-[#ea580c] rounded-full blur-[120px]" style={{ animationDelay: '-8s' }} />
            <div className="gblob absolute top-[60%] right-[30%] w-[40vh] h-[40vh] bg-[#fde047] rounded-full blur-[100px]" style={{ animationDelay: '-2s' }} />
        </div>
    </div>
);

// ---- Small UI primitives -----------------------------------------------------

export const CHIP_COLORS = ['bg-[#fde047]', 'bg-[#38bdf8]', 'bg-[#4ade80]', 'bg-[#c084fc]', 'bg-[#fb7185]'];

export const Chip = ({ children, color = 'bg-white', text = 'text-black' }:
    { children: React.ReactNode; color?: string; text?: string }) => (
    <span className={`${color} ${text} border-[3px] border-black rounded-full font-black uppercase text-[10px] sm:text-[11px] px-3 py-1.5 shadow-[2px_2px_0_#000] whitespace-nowrap`}>
        {children}
    </span>
);

export const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
        <p className="font-black uppercase text-[10px] tracking-widest text-gray-400 mb-2">{label}</p>
        {children}
    </div>
);

const Pencil = ({ size = 15, className = "" }: { size?: number; className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
);

export const EditButton = ({ onClick, className = "" }: { onClick?: () => void; className?: string }) => (
    <button onClick={onClick} className={`w-9 h-9 bg-[#fde047] border-[3px] border-black rounded-full flex items-center justify-center shadow-[3px_3px_0_#000] hover:-translate-y-0.5 active:translate-y-0 transition-all shrink-0 ${className}`}>
        <Pencil className="text-black" />
    </button>
);

// Section card with a tilted ribbon title + optional edit pencil
export const Section = ({ title, emoji, ribbon = 'bg-black', onEdit, children }:
    { title: string; emoji?: string; ribbon?: string; onEdit?: () => void; children: React.ReactNode }) => (
    <div className="relative pt-3">
        <div className={`absolute -top-1 left-5 z-10 ${ribbon} text-white font-black uppercase text-xs px-4 py-2 rounded-full border-[3px] border-white shadow-[4px_4px_0_#000] -rotate-2`}>
            {emoji ? `${emoji} ` : ''}{title}
        </div>
        {onEdit && <EditButton onClick={onEdit} className="absolute -top-1 right-5 z-20" />}
        <div className="bg-white border-[4px] border-black rounded-[2.5rem] p-6 sm:p-7 pt-9 shadow-[8px_8px_0_#000] space-y-5 relative z-0">
            {children}
        </div>
    </div>
);
