"use client";

import React, { useState, useRef } from 'react';
import { NotificationsHeader } from '../../feed/events/components/NotificationsHeader';

const MOCK_USER = {
    city: "London",
    tier: "Premium", // Уровень 3
    eventsQuota: 2,
    eventsUsed: 1,
};

const MOCK_UPCOMING = [
    {
        id: 'up1',
        title: 'Curated Dinner',
        date: 'Today',
        time: '19:00',
        restaurant: 'Dishoom Soho',
        address: '22 Kingly St, Carnaby, London',
        table: 'Table 4',
        poolTags: ['CTO', 'Founder', 'Investor', 'Product'],
        desc: 'Your upcoming curated dinner. Get ready to meet your matches!',
        isRSVPed: true,
    },
    {
        id: 'up2',
        title: 'Curated Dinner',
        date: 'Today',
        time: '19:00',
        restaurant: 'Dishoom Soho',
        address: '22 Kingly St, Carnaby, London',
        table: 'Table 4',
        poolTags: ['CTO', 'Founder', 'Investor', 'Product'],
        desc: 'Your upcoming curated dinner. Get ready to meet your matches!',
        isRSVPed: true,
    },
    {
        id: 'up3',
        title: 'Curated Dinner',
        date: 'Today',
        time: '19:00',
        restaurant: 'Dishoom Soho',
        address: '22 Kingly St, Carnaby, London',
        table: 'Table 4',
        poolTags: ['CTO', 'Founder', 'Investor', 'Product'],
        desc: 'Your upcoming curated dinner. Get ready to meet your matches!',
        isRSVPed: true,
    }


];

const MOCK_OPEN_EVENTS = [
    {
        id: 'ev2',
        type: 'sport',
        title: 'Padel Match',
        date: 'Next Saturday',
        time: '11:00',
        city: 'London',
        requiredTier: 'Starter', // Базовый уровень
        poolTags: ['Ex-Google', 'SaaS Builder', 'Crypto Trader'],
        desc: 'Active networking on the court. We play 2x2, switch partners, and after the game go grab coffee and discuss projects.'
    },
    {
        id: 'ev3',
        type: 'dinner',
        title: 'Private Founder Brunch',
        date: 'Saturday, Nov 2',
        time: '12:00',
        city: 'London',
        requiredTier: 'Premium', // Премиум уровень (РАЗБЛОКИРОВАН для нас)
        poolTags: ['Series A', 'VC Partner', 'Ex-Unicorn'],
        desc: 'High-level brunch for established founders and active investors. Premium tables only.'
    },
    {
        id: 'ev4',
        type: 'dinner',
        title: 'Secret Investor Dinner',
        date: 'Sunday, Nov 10',
        time: '20:00',
        city: 'London',
        requiredTier: 'Ultra', // Выдуманный ультра-уровень (ЗАБЛОКИРОВАН для нас)
        poolTags: ['Whale', 'Hedge Fund', 'Family Office'],
        desc: 'Invite only. Extremely limited capacity.'
    }
];

const MOCK_PAST = [
    { id: 'pe1', title: 'Saturday Dinner', date: 'Oct 19', people: 4 }
];

const ChevronDownIcon = ({ size = 24, className = "" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="m6 9 6 6 6-6" />
    </svg>
);

const IconSport = ({ size = 24, className = "" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a14.5 14.5 0 0 0 0 20M2 12h20" />
    </svg>
);

const IconDinner = ({ size = 24, className = "" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
        <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
        <line x1="6" y1="1" x2="6" y2="4" />
        <line x1="10" y1="1" x2="10" y2="4" />
        <line x1="14" y1="1" x2="14" y2="4" />
    </svg>
);
const LockIcon = ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
);
const MapPinIcon = ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
);
const ArrowRightIcon = ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
);
const CheckIcon = ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M20 6 9 17l-5-5" /></svg>
);
const PencilIcon = ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
);

// Small round edit (pencil) button used on every profile block
const EditButton = ({ className = "" }) => (
    <button className={`w-9 h-9 bg-[#fde047] border-[3px] border-black rounded-full flex items-center justify-center shadow-[3px_3px_0_#000] hover:-translate-y-0.5 active:translate-y-0 transition-all shrink-0 ${className}`}>
        <PencilIcon size={15} className="text-black" />
    </button>
);
const GraduationIcon = ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></svg>
);
const BriefcaseIcon = ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="20" height="14" x="2" y="7" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>
);

// Pop-art chip
const Chip = ({ children, color = 'bg-white', text = 'text-black' }) => (
    <span className={`${color} ${text} border-[3px] border-black rounded-full font-black uppercase text-[10px] sm:text-[11px] px-3 py-1.5 shadow-[2px_2px_0_#000]`}>
        {children}
    </span>
);

// Labeled block inside a profile section
const Field = ({ label, children }) => (
    <div>
        <p className="font-black uppercase text-[10px] tracking-widest text-gray-400 mb-2">{label}</p>
        {children}
    </div>
);

// Section card with a tilted ribbon title + an edit pencil
const Section = ({ title, emoji, ribbon = 'bg-black', children }) => (
    <div className="relative pt-3">
        <div className={`absolute -top-1 left-5 z-10 ${ribbon} text-white font-black uppercase text-xs px-4 py-2 rounded-full border-[3px] border-white shadow-[4px_4px_0_#000] -rotate-2`}>
            {emoji} {title}
        </div>
        <EditButton className="absolute -top-1 right-5 z-20" />
        <div className="bg-white border-[4px] border-black rounded-[2.5rem] p-6 sm:p-7 pt-9 shadow-[8px_8px_0_#000] space-y-5 relative z-0">
            {children}
        </div>
    </div>
);

// 1. Иконка Home (Портал/Клуб - кастомный нео-брутализм)
const IconHome = ({ active, className }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M4 21V9l8-5 8 5v12" fill={active ? "currentColor" : "none"} />
        <rect x="9" y="13" width="6" height="8" fill={active ? "#fff" : "none"} stroke={active ? "none" : "currentColor"} strokeWidth="2.5" />
    </svg>
);

// 2. Иконка Alerts (Угловатый баббл с восклицательным знаком -> Bell)
const IconAlerts = ({ active, className }) => (
    <svg viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
);

// 3. Иконка Network (Связанные узлы/граф)
const IconNetwork = ({ active, className }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polygon points="12 6 6 17 18 17" />
        <circle cx="12" cy="6" r="3" fill={active ? "currentColor" : "#fff"} stroke="currentColor" />
        <circle cx="6" cy="17" r="3" fill={active ? "currentColor" : "#fff"} stroke="currentColor" />
        <circle cx="18" cy="17" r="3" fill={active ? "currentColor" : "#fff"} stroke="currentColor" />
    </svg>
);

// 4. Иконка Profile (контур человечка — голова + плечи)
const IconProfile = ({ active, className }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="8" r="4" fill={active ? "currentColor" : "none"} />
        <path d="M4 21 a8 8 0 0 1 16 0" fill={active ? "currentColor" : "none"} />
    </svg>
);

// Кастомный Кубик Льда / Китайская коробочка (Cheat Sheet)
const NeoIceCube = () => (
    <svg viewBox="0 0 100 100" className="w-16 h-16 drop-shadow-[4px_4px_0_rgba(0,0,0,1)] group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-300 shrink-0">
        <path d="M10 75 Q20 55 45 65 T85 65 Q100 75 80 85 T40 95 Q0 90 10 75 Z" fill="#1f2937" />
        <line x1="30" y1="35" x2="15" y2="20" stroke="#1f2937" strokeWidth="6" strokeLinecap="round" />
        <line x1="45" y1="30" x2="35" y2="10" stroke="#1f2937" strokeWidth="6" strokeLinecap="round" />
        <line x1="70" y1="35" x2="85" y2="20" stroke="#1f2937" strokeWidth="6" strokeLinecap="round" />
        <line x1="55" y1="30" x2="65" y2="10" stroke="#1f2937" strokeWidth="6" strokeLinecap="round" />
        <polygon points="50,25 70,35 50,45 30,35" fill="#ffffff" stroke="#1f2937" strokeWidth="6" strokeLinejoin="round" />
        <polygon points="50,85 30,75 30,35 50,45" fill="#ffffff" stroke="#1f2937" strokeWidth="6" strokeLinejoin="round" />
        <polygon points="50,85 70,75 70,35 50,45" fill="#ffffff" stroke="#1f2937" strokeWidth="6" strokeLinejoin="round" />
        <line x1="56" y1="56" x2="64" y2="46" stroke="#1f2937" strokeWidth="6" strokeLinecap="round" />
        <line x1="56" y1="72" x2="64" y2="62" stroke="#1f2937" strokeWidth="6" strokeLinecap="round" />
        <path d="M43 68 Q47 74 47 77 A4 4 0 0 1 39 77 Q39 74 43 68 Z" fill="#0ea5e9" />
        <path d="M35 50 Q39 56 39 59 A4 4 0 0 1 31 59 Q31 56 35 50 Z" fill="#0ea5e9" />
    </svg>
);

// Кастомная Горящая Спичка ("Keep your matches")
const NeoMatch = () => (
    <svg viewBox="0 0 100 100" className="w-14 h-14 md:w-16 md:h-16 drop-shadow-[4px_4px_0_rgba(0,0,0,1)] group-hover:scale-110 group-hover:rotate-12 transition-transform duration-300 shrink-0">
        <g transform="rotate(45 50 50)">
            <line x1="50" y1="50" x2="50" y2="90" stroke="#1f2937" strokeWidth="16" strokeLinecap="round" />
            <line x1="50" y1="50" x2="50" y2="90" stroke="#fcd34d" strokeWidth="8" strokeLinecap="round" />
            <path d="M 50 15 C 70 35 70 65 50 65 C 30 65 30 35 50 15 Z" fill="#fde047" stroke="#1f2937" strokeWidth="6" strokeLinejoin="round" />
            <circle cx="50" cy="50" r="10" fill="#e11d48" stroke="#1f2937" strokeWidth="6" />
        </g>
        <path d="M 25 20 L 28 28 L 36 31 L 28 34 L 25 42 L 22 34 L 14 31 L 22 28 Z" fill="#38bdf8" stroke="#1f2937" strokeWidth="4" strokeLinejoin="round" />
    </svg>
);



const OpenTables = ({ events, userTierVal, isNetworkActive, onToggle, isOpen }) => {
    const tierValue = { "Starter": 1, "Core Membership": 2, "Premium": 3, "Ultra": 4 };

    return (
        <div className={`relative w-full h-full flex flex-col backdrop-blur-md border-[4px] border-b-0 border-black rounded-t-[3rem] shadow-[0_-15px_40px_rgba(0,0,0,0.15)] ${isNetworkActive ? 'bg-[#111827]/95' : 'bg-[#fafafa]/95'}`}>
            <div className="absolute -top-4 left-6 md:left-1/2 md:-translate-x-1/2 bg-black text-white font-black uppercase text-sm px-8 py-3 rounded-full border-[4px] border-white shadow-[6px_6px_0_#000] -rotate-2 z-20">
                Explore Pools 🌊
            </div>

            <button onClick={onToggle} className="absolute -top-4 right-6 w-12 h-12 bg-[#fde047] text-black rounded-full border-[4px] border-black flex items-center justify-center cursor-pointer shadow-[4px_4px_0_#000] hover:-translate-y-1 active:translate-y-0 transition-transform z-30">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d={isOpen ? "M12 5v14M19 12l-7 7-7-7" : "M12 19V5M5 12l7-7 7 7"} />
                </svg>
            </button>

            <div className="flex-1 overflow-y-auto hide-scrollbar pt-16 pb-32 px-6">
                <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
                    {events.map((ev) => {
                        const evTierVal = tierValue[ev.requiredTier] || 1;
                        const isLocked = evTierVal > userTierVal;
                        const isPremium = ev.requiredTier === 'Premium';

                        let IconComponent = MapPinIcon;
                        let typeColor = 'bg-[#38bdf8]';
                        if (ev.type === 'sport') {
                            IconComponent = IconSport;
                            typeColor = '#4ade80';
                        } else if (ev.type === 'dinner') {
                            IconComponent = IconDinner;
                            typeColor = '#c084fc';
                        }

                        if (isLocked) {
                            return (
                                <div key={ev.id} className="relative group cursor-not-allowed mt-4">
                                    <div className="absolute -top-3 left-6 z-30 pointer-events-none flex items-center justify-center w-12 h-12 rounded-full border-[3px] border-black shadow-[3px_3px_0_#000] rotate-[-5deg] animate-pop-float" style={{ backgroundColor: typeColor }}>
                                        <IconComponent size={20} className="text-black" />
                                    </div>
                                    <div className="absolute -top-3 right-6 flex items-center z-30 pointer-events-none opacity-50 grayscale">
                                        {ev.poolTags && ev.poolTags.slice(0, 2).map((tag, i) => (
                                            <div key={i} className={`px-4 py-1.5 border-[3px] border-black rounded-full flex items-center justify-center ${i === 0 ? 'bg-[#fde047] text-black z-30' : 'bg-white text-black z-20 -ml-1'}`}>
                                                <span className="font-black uppercase text-[9px] sm:text-[10px] tracking-widest">{tag}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-16 h-16 bg-gray-200 border-[4px] border-black rounded-full flex items-center justify-center shadow-[4px_4px_0_#000] transition-transform">
                                        <LockIcon size={28} className="text-black" />
                                    </div>
                                    <div className="bg-gray-100 border-[4px] border-black border-dashed rounded-[2.5rem] p-6 sm:p-8 opacity-60 pointer-events-none h-full min-h-[250px] flex flex-col relative z-10">
                                        <h3 className="text-3xl sm:text-4xl font-black uppercase leading-none mt-4 tracking-tighter text-gray-500">{ev.title}</h3>
                                        <div className="mt-4 flex flex-wrap gap-2">
                                            <span className="bg-white border-[3px] border-black rounded-full font-black uppercase text-[10px] px-3 py-1.5 text-gray-600 shadow-[2px_2px_0_#000]">{ev.date}, {ev.time}</span>
                                        </div>
                                        <p className="text-xs font-bold text-gray-400 mt-4 mb-6 leading-relaxed flex-1">
                                            {ev.desc}
                                        </p>
                                        <button className="w-full bg-gray-300 text-gray-500 py-4 rounded-full font-black uppercase text-sm border-[4px] border-gray-400 mt-auto">
                                            {ev.requiredTier} Only
                                        </button>
                                    </div>
                                </div>
                            );
                        }

                        if (isPremium) {
                            return (
                                <div key={ev.id} className="relative group cursor-pointer mt-4">
                                    <div className="absolute -top-3 left-6 z-30 pointer-events-none flex items-center justify-center w-12 h-12 rounded-full border-[3px] border-black shadow-[3px_3px_0_#000] rotate-[-5deg] animate-pop-float" style={{ backgroundColor: typeColor }}>
                                        <IconComponent size={20} className="text-black" />
                                    </div>
                                    <div className="absolute -top-3 right-6 flex items-center z-30 pointer-events-none">
                                        {ev.poolTags && ev.poolTags.slice(0, 2).map((tag, i) => (
                                            <div key={i} className={`px-4 py-1.5 border-[3px] border-black rounded-full flex items-center justify-center ${i === 0 ? 'bg-[#fde047] text-black z-30' : 'bg-white text-black z-20 -ml-1'}`}>
                                                <span className="font-black uppercase text-[9px] sm:text-[10px] tracking-widest">{tag}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="bg-[#111827] border-[4px] border-black rounded-[2.5rem] p-6 sm:p-8 shadow-[8px_8px_0_#fde047] group-hover:-translate-y-1 group-hover:shadow-[12px_12px_0_#fde047] transition-all h-full min-h-[250px] flex flex-col relative z-10 overflow-hidden">
                                        <div className="absolute inset-0 rounded-[2.2rem] pointer-events-none z-0">
                                            <div className="absolute -right-10 -top-10 w-40 h-40 bg-[#fde047] rounded-full blur-[60px] opacity-20 pointer-events-none"></div>
                                        </div>
                                        <h3 className="text-3xl sm:text-4xl font-black uppercase leading-none mt-2 tracking-tighter text-white relative z-10">{ev.title}</h3>
                                        <div className="mt-4 flex flex-wrap gap-2 relative z-10">
                                            <span className="bg-white border-[3px] border-black rounded-full font-black uppercase text-[10px] px-3 py-1.5 text-black shadow-[2px_2px_0_#000]">{ev.date}, {ev.time}</span>
                                        </div>
                                        <p className="text-xs font-bold text-gray-300 mt-4 mb-6 leading-relaxed flex-1 relative z-10">
                                            {ev.desc}
                                        </p>
                                        <button className="w-full bg-[#fde047] text-black py-4 rounded-full font-black uppercase text-sm border-[4px] border-black shadow-[4px_4px_0_#000] hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#000] hover:bg-[#fef08a] transition-all mt-auto relative z-10">
                                            View Premium Pool
                                        </button>
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <div key={ev.id} className="relative group cursor-pointer mt-4">
                                <div className="absolute -top-3 left-6 z-30 pointer-events-none flex items-center justify-center w-12 h-12 rounded-full border-[3px] border-black shadow-[3px_3px_0_#000] rotate-[-5deg] animate-pop-float" style={{ backgroundColor: typeColor }}>
                                    <IconComponent size={20} className="text-black" />
                                </div>
                                <div className="absolute -top-3 right-6 flex items-center z-30 pointer-events-none">
                                    {ev.poolTags && ev.poolTags.slice(0, 2).map((tag, i) => (
                                        <div key={i} className={`px-4 py-1.5 border-[3px] border-black rounded-full flex items-center justify-center ${i === 0 ? 'bg-[#e11d48] text-white z-30' : 'bg-[#fde047] text-black z-20 -ml-1'}`}>
                                            <span className="font-black uppercase text-[9px] sm:text-[10px] tracking-widest">{tag}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="bg-white border-[4px] border-black rounded-[2.5rem] p-6 sm:p-8 shadow-[8px_8px_0_#000] group-hover:-translate-y-1 group-hover:shadow-[12px_12px_0_#000] transition-all h-full min-h-[250px] flex flex-col relative z-10">
                                    <h3 className="text-3xl sm:text-4xl font-black uppercase leading-none mt-4 tracking-tighter text-black">{ev.title}</h3>
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        <span className="bg-[#fafafa] border-[3px] border-black rounded-full font-black uppercase text-[10px] px-3 py-1.5 shadow-[2px_2px_0_#000] text-black">{ev.date}, {ev.time}</span>
                                    </div>
                                    <p className="text-xs font-bold text-gray-500 mt-4 mb-6 leading-relaxed flex-1">
                                        {ev.desc}
                                    </p>
                                    <button className="w-full bg-[#fde047] text-black py-4 rounded-full font-black uppercase text-sm border-[4px] border-black shadow-[4px_4px_0_#000] hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#000] hover:bg-[#fef08a] transition-all mt-auto">
                                        Sign up
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

const Upcoming = ({ event }) => {
    if (!event) return null;
    return (
        <div className="relative mt-8 group cursor-pointer">
            <div className="relative z-10 transition-transform group-hover:-translate-y-1">

                <div className="absolute -top-5 right-4 sm:right-8 bg-black text-white font-black uppercase text-[10px] sm:text-xs px-5 py-2.5 border-[3px] border-white rounded-full shadow-[4px_4px_0_#000] rotate-6 z-20 group-hover:rotate-12 transition-transform">
                    Your Match
                </div>

                <div className="bg-white border-[4px] border-black rounded-[3rem] p-6 sm:p-8 shadow-[10px_10px_0_#000]">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="bg-[#fde047] text-black font-black uppercase text-[10px] px-3 py-1 rounded-full border-[3px] border-black shadow-[2px_2px_0_#000]">
                            Main Event
                        </span>
                    </div>

                    <h2 className="text-4xl sm:text-5xl font-black uppercase leading-[0.9] mb-5 text-black tracking-tighter">{event.title}</h2>

                    <div className="bg-black text-white inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-black text-sm uppercase mb-6 border-[3px] border-transparent">
                        {event.date}, {event.time}
                    </div>

                    <div className="bg-[#fafafa] border-[4px] border-black rounded-[2rem] p-4 shadow-[6px_6px_0_#000] relative">
                        <div className="absolute -left-3 sm:-left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-[#e11d48] border-[3px] border-black rounded-full flex items-center justify-center shadow-[2px_2px_0_#000] animate-pop-float">
                            <MapPinIcon size={20} className="text-white" />
                        </div>
                        <div className="pl-8 sm:pl-10">
                            <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Location Revealed</p>
                            <p className="font-black uppercase text-sm sm:text-base leading-tight text-black">{event.restaurant}<br /><span className="text-[#e11d48]">{event.table}</span></p>
                        </div>
                    </div>
                    
                    <div className="mt-6">
                        <button className="w-full bg-[#fde047] text-black py-4 rounded-full font-black uppercase text-sm border-[4px] border-black shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-[0px_0px_0_#000] transition-all">
                            View Details
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const BottomNav = ({ activeTab, setActiveTab }) => {
    const tabs = [
        { key: 'feed', icon: IconHome, color: 'text-black', bg: 'bg-[#fde047]' },
        { key: 'network', icon: IconNetwork, color: 'text-white', bg: 'bg-[#111827]' },
        { key: 'alerts', icon: IconAlerts, color: 'text-white', bg: 'bg-[#e11d48]', badge: 1 },
        { key: 'profile', icon: IconProfile, color: 'text-black', bg: 'bg-white' },
    ];

    return (
        <div className="fixed bottom-6 left-6 right-6 z-50 pointer-events-none">
            <div className="max-w-md mx-auto bg-transparent backdrop-blur-md border-[4px] border-black rounded-[2.5rem] p-2 flex justify-between items-center shadow-[8px_8px_0_#000] pointer-events-auto">
                {tabs.map(t => {
                    const isActive = activeTab === t.key;
                    const Icon = t.icon;
                    return (
                        <button
                            key={t.key}
                            onClick={() => setActiveTab(t.key)}
                            className={`relative flex items-center justify-center w-[22%] h-14 transition-all rounded-[2rem] ${isActive ? `${t.bg} border-[3px] border-black` : 'hover:bg-gray-100'}`}
                        >
                            <div className="relative">
                                <Icon className={`w-7 h-7 ${isActive ? t.color : 'text-gray-500'}`} active={isActive} />
                                {t.badge && (
                                    <span className="absolute -top-2 -right-3 w-5 h-5 bg-[#e11d48] border-[2px] border-black rounded-full flex items-center justify-center text-white text-[9px] font-black shadow-[2px_2px_0_#000]">
                                        {t.badge}
                                    </span>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

const NetworkTab = () => {
    const connections = [
        { id: 'c1', name: 'Dmitrii B.', role: 'Co-Founder @ Tablr', avatar: '15', skills: ['React', 'Python', 'Startups'] },
        { id: 'c2', name: 'Anna G.', role: 'Product Marketing Lead', avatar: '26', skills: ['Go-to-Market', 'B2B SaaS'] },
        { id: 'c3', name: 'James W.', role: 'Angel Investor', avatar: '33', skills: ['Seed', 'FinTech'] }
    ];
    return (
        <div className="flex-1 overflow-y-auto hide-scrollbar pt-[120px] pb-[100px] px-6 space-y-6 relative z-10">
            <h2 className="text-4xl sm:text-5xl font-black uppercase tracking-tighter mb-8 text-black drop-shadow-[2px_2px_0_#fff]">Network</h2>
            {connections.map(conn => (
                <div key={conn.id} className="bg-white border-[4px] border-black rounded-[2.5rem] p-6 sm:p-7 shadow-[8px_8px_0_#000] hover:-translate-y-1 hover:shadow-[10px_10px_0_#000] transition-all cursor-pointer">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-[3px] border-black bg-gray-200 overflow-hidden shrink-0 shadow-[4px_4px_0_#000]">
                            <img src={`https://i.pravatar.cc/150?img=${conn.avatar}`} alt="Avatar" className="w-full h-full object-cover" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-black uppercase text-xl sm:text-2xl leading-none tracking-tighter text-black truncate">{conn.name}</h3>
                            <p className="font-black text-[11px] sm:text-xs text-gray-600 uppercase mt-2 tracking-widest">{conn.role}</p>
                        </div>
                    </div>
                    {conn.skills?.length > 0 && (
                        <div className="mt-5 flex flex-wrap gap-2">
                            {conn.skills.slice(0, 3).map((skill, i) => (
                                <span key={skill} className={`${['bg-[#fde047]', 'bg-[#38bdf8]', 'bg-[#4ade80]'][i % 3]} border-[3px] border-black rounded-full font-black uppercase text-[10px] px-3 py-1.5 text-black shadow-[2px_2px_0_#000]`}>
                                    {skill}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

const AlertsTab = () => {
    const alerts = [
        { id: 'a1', title: 'New Match!', desc: 'A new person matched with you from the Saturday dinner.', color: 'bg-[#38bdf8]' },
        { id: 'a2', title: 'Event Reminder', desc: 'Your Curated Dinner is tomorrow at 19:00.', color: 'bg-white' },
        { id: 'a3', title: 'Tier Upgraded', desc: 'Welcome to Premium! You now have access to exclusive pools.', color: 'bg-[#4ade80]' }
    ];
    return (
        <div className="flex-1 overflow-y-auto hide-scrollbar pt-[120px] pb-[100px] px-6 space-y-6 relative z-10">
            <h2 className="text-4xl sm:text-5xl font-black uppercase tracking-tighter mb-8 text-black drop-shadow-[2px_2px_0_#fff]">Alerts</h2>
            {alerts.map(al => (
                <div key={al.id} className={`${al.color} border-[4px] border-black rounded-[2.5rem] p-6 sm:p-8 shadow-[8px_8px_0_#000] hover:-translate-y-1 transition-all cursor-pointer`}>
                    <div className="flex items-center gap-4 mb-3">
                        <div className="w-3 h-3 bg-[#e11d48] rounded-full border-[2px] border-black animate-pulse" />
                        <h3 className="font-black uppercase text-2xl leading-none tracking-tighter text-black">{al.title}</h3>
                    </div>
                    <p className="font-bold text-sm text-black leading-relaxed">{al.desc}</p>
                </div>
            ))}
        </div>
    );
};

const MOCK_PROFILE = {
    name: 'Michael F.', age: 29, location: 'London · Soho', avatar: '68',
    tier: 'Premium', status: 'Active',
    eventsAvailable: 2, eventsQuota: 4,
    planIncludes: ['4 experiences / month', 'Special formats', 'Priority seating', 'All Core perks'],
    career: {
        status: 'Business / Startup · Tablr (Scaling)',
        education: 'Imperial College London',
        industries: ['IT & Software'],
        skills: ['React', 'Python', 'ML / AI'],
        level: ['Senior', 'Executive'],
    },
    vibe: {
        personality: ['Extrovert'],
        languages: ['English', 'Russian'],
        lookingForText: 'Looking for a technical co-founder and sharp operators in AI.',
        lookingForTags: ['cofounder', 'network'],
        formats: ['Dinners', 'Activities', 'Quarterly City Meetup', 'Special Formats'],
    },
};

const CHIP_COLORS = ['bg-[#fde047]', 'bg-[#38bdf8]', 'bg-[#4ade80]', 'bg-[#c084fc]', 'bg-[#fb7185]'];

const ProfileTab = () => {
    const p = MOCK_PROFILE;
    return (
        <div className="flex-1 overflow-y-auto hide-scrollbar pt-[120px] pb-[120px] px-6 space-y-7 relative z-10">
            <h2 className="text-4xl sm:text-5xl font-black uppercase tracking-tighter text-black drop-shadow-[2px_2px_0_#fff]">Profile</h2>

            {/* ===== IDENTITY ===== */}
            <div className="bg-white border-[4px] border-black rounded-[2.5rem] p-5 sm:p-6 shadow-[8px_8px_0_#000] flex items-center gap-4">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-[2rem] border-[4px] border-black bg-gray-200 overflow-hidden shrink-0 shadow-[6px_6px_0_#000] rotate-3">
                    <img src={`https://i.pravatar.cc/150?img=${p.avatar}`} alt="Avatar" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter leading-none text-black">
                        {p.name} <span className="text-[#e11d48]">{p.age}</span>
                    </h3>
                    <button className="mt-3 inline-flex items-center gap-2 bg-[#fde047] pl-3 pr-2 py-1.5 border-[3px] border-black rounded-full shadow-[3px_3px_0_#000] hover:-translate-y-0.5 active:translate-y-0 transition-all">
                        <MapPinIcon size={14} className="text-black" />
                        <span className="font-black text-[11px] text-black uppercase tracking-widest">{p.location}</span>
                        <ChevronDownIcon size={14} className="text-black" />
                    </button>
                </div>
                <EditButton />
            </div>

            {/* ===== MEMBERSHIP ===== */}
            <Section title="Membership" emoji="⭐" ribbon="bg-[#e11d48]">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-[#111827] text-[#fde047] border-[3px] border-black rounded-full font-black uppercase text-sm px-4 py-1.5 shadow-[2px_2px_0_#000]">{p.tier}</span>
                    <span className="bg-[#4ade80] border-[3px] border-black rounded-full font-black uppercase text-[11px] px-3 py-1.5 text-black shadow-[2px_2px_0_#000]">{p.status}</span>
                </div>

                <Field label="Events Available">
                    <div className="flex items-center gap-3">
                        <span className="text-3xl font-black tracking-tighter text-black">{p.eventsAvailable} <span className="text-gray-300">/ {p.eventsQuota}</span></span>
                        <div className="flex gap-1.5">
                            {Array.from({ length: p.eventsQuota }).map((_, i) => (
                                <div key={i} className={`w-7 h-7 rounded-lg border-[3px] border-black ${i < p.eventsAvailable ? 'bg-[#fde047] shadow-[2px_2px_0_#000]' : 'bg-gray-100'}`} />
                            ))}
                        </div>
                    </div>
                </Field>

                <Field label="Your Plan Includes">
                    <div className="space-y-2.5">
                        {p.planIncludes.map(item => (
                            <div key={item} className="flex items-center gap-2.5">
                                <span className="w-5 h-5 bg-[#4ade80] border-[2px] border-black rounded-md flex items-center justify-center shrink-0"><CheckIcon size={12} className="text-black" /></span>
                                <span className="font-black uppercase text-xs text-black">{item}</span>
                            </div>
                        ))}
                    </div>
                </Field>

                <button className="w-full bg-[#fde047] text-black py-3.5 rounded-full font-black uppercase text-sm border-[4px] border-black shadow-[4px_4px_0_#000] hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#000] transition-all">
                    Manage plan
                </button>
            </Section>

            {/* ===== CAREER ===== */}
            <Section title="Career" emoji="💼" ribbon="bg-[#38bdf8]">
                <Field label="Status">
                    <div className="flex items-start gap-2.5">
                        <BriefcaseIcon size={18} className="text-black mt-0.5 shrink-0" />
                        <span className="font-black uppercase text-sm text-black leading-snug">{p.career.status}</span>
                    </div>
                </Field>
                <Field label="Education">
                    <div className="flex items-start gap-2.5">
                        <GraduationIcon size={18} className="text-black mt-0.5 shrink-0" />
                        <span className="font-black uppercase text-sm text-black leading-snug">{p.career.education}</span>
                    </div>
                </Field>
                <Field label="Industries">
                    <div className="flex flex-wrap gap-2">{p.career.industries.map((t, i) => <Chip key={t} color={CHIP_COLORS[i % CHIP_COLORS.length]}>{t}</Chip>)}</div>
                </Field>
                <Field label="Skills">
                    <div className="flex flex-wrap gap-2">{p.career.skills.map((t, i) => <Chip key={t} color={CHIP_COLORS[i % CHIP_COLORS.length]}>{t}</Chip>)}</div>
                </Field>
                <Field label="Level">
                    <div className="flex flex-wrap gap-2">{p.career.level.map(t => <Chip key={t} color="bg-[#111827]" text="text-white">{t}</Chip>)}</div>
                </Field>
            </Section>

            {/* ===== VIBE & ASK ===== */}
            <Section title="Vibe & Ask" emoji="✨" ribbon="bg-[#c084fc]">
                <Field label="Personality">
                    <div className="flex flex-wrap gap-2">{p.vibe.personality.map(t => <Chip key={t} color="bg-[#fb7185]">{t}</Chip>)}</div>
                </Field>
                <Field label="Languages">
                    <div className="flex flex-wrap gap-2">{p.vibe.languages.map((t, i) => <Chip key={t} color={CHIP_COLORS[i % CHIP_COLORS.length]}>{t}</Chip>)}</div>
                </Field>
                <Field label="Looking For">
                    <div className="bg-[#fde047] border-[3px] border-black rounded-[1.5rem] p-4 shadow-[3px_3px_0_#000] mb-3">
                        <p className="font-black uppercase text-sm text-black leading-snug">“{p.vibe.lookingForText}”</p>
                    </div>
                    <div className="flex flex-wrap gap-2">{p.vibe.lookingForTags.map(t => <Chip key={t} color="bg-[#38bdf8]">{t}</Chip>)}</div>
                </Field>
                <Field label="Available Formats">
                    <div className="flex flex-wrap gap-2">{p.vibe.formats.map((t, i) => <Chip key={t} color={CHIP_COLORS[i % CHIP_COLORS.length]}>{t}</Chip>)}</div>
                </Field>
            </Section>
        </div>
    );
};

// Each tab nudges the whole gradient to a different spot — same colors, new mood.
const GRADIENT_SHIFT = {
    feed: 'translate3d(0%, 0%, 0)',
    network: 'translate3d(-18%, 14%, 0)',
    alerts: 'translate3d(16%, -12%, 0)',
    profile: 'translate3d(-12%, -16%, 0)',
};

export default function FeedEvents() {
    const [activeTab, setActiveTab] = useState('feed');
    const [isTableOpen, setIsTableOpen] = useState(false);
    const scrollRef = useRef(null);
    const userTierVal = MOCK_USER.tier === 'Premium' ? 3 : 1;
    const isNetworkActive = activeTab === 'network';

    const handleScroll = (e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        setIsTableOpen(scrollHeight - scrollTop - clientHeight < 10);
    };

    const toggleTable = () => {
        if (!scrollRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
        const isAtBottom = scrollHeight - scrollTop - clientHeight < 10;
        if (isAtBottom) {
            scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            scrollRef.current.scrollTo({ top: scrollHeight, behavior: 'smooth' });
        }
    };

    return (
        <div className="fixed inset-0 flex flex-col font-sans selection:bg-[#e11d48] selection:text-white bg-[#fafafa] text-black">
            {/* Animated gradient background — same blobs everywhere, shifted per tab */}
            <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden mix-blend-multiply opacity-40">
                <div
                    className="absolute inset-[-25%] transition-transform duration-[1200ms] ease-in-out will-change-transform"
                    style={{ transform: GRADIENT_SHIFT[activeTab] || GRADIENT_SHIFT.feed }}
                >
                    <div className="gblob absolute -top-20 -left-20 w-[60vh] h-[60vh] bg-[#fde047] rounded-full blur-[100px]" style={{ animationDelay: '0s' }}></div>
                    <div className="gblob absolute top-[20%] -right-20 w-[70vh] h-[70vh] bg-[#e11d48] rounded-full blur-[120px]" style={{ animationDelay: '-4s' }}></div>
                    <div className="gblob absolute bottom-[-10%] left-[10%] w-[60vh] h-[60vh] bg-[#ea580c] rounded-full blur-[120px]" style={{ animationDelay: '-8s' }}></div>
                    <div className="gblob absolute top-[60%] right-[30%] w-[40vh] h-[40vh] bg-[#fde047] rounded-full blur-[100px]" style={{ animationDelay: '-2s' }}></div>
                </div>
            </div>

            <style>{`
                .hide-scrollbar::-webkit-scrollbar { display: none; }
                .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; -webkit-overflow-scrolling: touch; overscroll-behavior-y: contain; }
                .animate-pop-float { animation: float 4s ease-in-out infinite; }
                @keyframes float { 0%, 100% { transform: translateY(0px) rotate(0deg); } 50% { transform: translateY(-5px) rotate(2deg); } }
                .gblob { animation: gblob-drift 20s ease-in-out infinite; will-change: transform; }
                @keyframes gblob-drift {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    33%      { transform: translate(7%, -9%) scale(1.12); }
                    66%      { transform: translate(-9%, 7%) scale(0.92); }
                }
                @media (prefers-reduced-motion: reduce) { .gblob { animation: none; } }
                .animate-fly { animation: fly 3s ease-in-out infinite; }
                @keyframes fly { 0%, 100% { transform: translateY(0px) rotate(6deg); } 50% { transform: translateY(-8px) rotate(8deg); } }
                .typing-dot { animation: typing 1.4s infinite ease-in-out both; }
                .typing-dot:nth-child(1) { animation-delay: -0.32s; }
                .typing-dot:nth-child(2) { animation-delay: -0.16s; }
                .typing-dot:nth-child(3) { animation-delay: 0s; }
                @keyframes typing { 0%, 80%, 100% { transform: scale(0.6) translateY(0); opacity: 0.4; } 40% { transform: scale(1) translateY(-4px); opacity: 1; } }
            `}</style>

            <div className="absolute top-0 left-0 right-0 z-20 pointer-events-none">
                <div className="pointer-events-auto">
                    <NotificationsHeader
                        city={MOCK_USER.city}
                        tier={MOCK_USER.tier}
                        eventsQuota={MOCK_USER.eventsQuota}
                        eventsRemaining={Math.max(0, MOCK_USER.eventsQuota - MOCK_USER.eventsUsed)}
                        cities={["London", "New York", "Dubai"]}
                        onChangeCity={(c) => console.log("Changed city to", c)}
                    />
                </div>
            </div>

            {activeTab === 'feed' && (
                <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto relative z-10 hide-scrollbar pt-[160px]">
                <div className="sticky bottom-[100px] z-0 max-w-2xl mx-auto px-6 space-y-8 pb-12">

                    {/* 1. ICEBREAKERS BANNER (Гигантский лед) */}
                    {MOCK_UPCOMING.length > 0 && (
                        <div onClick={() => console.log("Открытие подсказок и тем для разговора")} className="w-full bg-[#fde047] p-5 sm:p-6 rounded-[2.5rem] border-[4px] border-black shadow-[8px_8px_0_#000] cursor-pointer rotate-[1deg] animate-pop-float group">
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex-1 bg-white border-[3px] border-black rounded-[2rem] px-5 py-3 sm:py-4 shadow-[4px_4px_0_#000] -rotate-2">
                                    <h3 className="font-black uppercase text-xl sm:text-2xl leading-none mb-1 text-black tracking-tighter">Cheat Sheet</h3>
                                    <p className="text-[10px] sm:text-[11px] font-black text-gray-600 uppercase tracking-widest leading-snug">
                                        Not sure how to start?
                                    </p>
                                </div>
                                <div className="bg-[#fde047] border-[3px] sm:border-[4px] border-black rounded-[1.2rem] sm:rounded-2xl rounded-bl-none px-4 py-3 sm:py-4 shadow-[4px_4px_0_#000] rotate-6 shrink-0 relative animate-fly flex items-center justify-center min-w-[60px] sm:min-w-[70px]">
                                    <div className="flex items-center gap-1">
                                        <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-black rounded-full typing-dot" />
                                        <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-black rounded-full typing-dot" />
                                        <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-black rounded-full typing-dot" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 2. RATE THE NIGHT BANNER */}
                    {MOCK_PAST.map(ev => (
                        <div key={ev.id} className="w-full bg-[#e11d48] p-5 sm:p-6 rounded-[2.5rem] border-[4px] border-black shadow-[8px_8px_0_#000] cursor-pointer rotate-[-1deg] animate-pop-float group" style={{ animationDelay: '0.5s' }}>
                            <div className="flex items-center gap-5">
                                <div className="flex-1">
                                    <h3 className="font-black uppercase text-2xl leading-none mb-1 text-white drop-shadow-[2px_2px_0_#000] tracking-tighter">Rate the night</h3>
                                    <p className="text-[11px] font-black text-[#fde047] uppercase tracking-widest leading-snug drop-shadow-[1px_1px_0_#000]">
                                        Keep your matches
                                    </p>
                                </div>
                                <ArrowRightIcon size={28} className="text-white shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" />
                            </div>
                        </div>
                    ))}

                    {/* UPCOMING MATCHES */}
                    <div className="space-y-8 z-20 relative">
                        {MOCK_UPCOMING.map(ev => (
                            <Upcoming key={ev.id} event={ev} />
                        ))}
                    </div>

                </div> {/* END sticky section */}

                {/* OPEN POOLS (Wider block sliding over) */}
                <div className="relative z-10 h-[calc(100dvh-125px)]">
                    <OpenTables events={MOCK_OPEN_EVENTS} userTierVal={userTierVal} isNetworkActive={isNetworkActive} onToggle={toggleTable} isOpen={isTableOpen} />
                </div>
            </div>
            )}
            
            {activeTab === 'network' && <NetworkTab />}
            {activeTab === 'alerts' && <AlertsTab />}
            {activeTab === 'profile' && <ProfileTab />}

            {/* FLOATING NAVBAR */}
            <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>
    );
}