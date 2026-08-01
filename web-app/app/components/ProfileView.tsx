"use client";

import React from 'react';
import { Briefcase, GraduationCap, Target, Activity, LogOut, MapPin, ChevronDown, Star } from 'lucide-react';
import { Section, Chip, Field, EditButton, CHIP_COLORS } from '../feed/components/popart';

const TIER_PERKS: Record<string, string[]> = {
    "Starter": ["1 curated dinner / month", "Access to the network", "Post-event reconnect"],
    "Core Membership": ["2 experiences / month", "Activities + quarterly city meetup", "Priority over waitlist", "Reconnect system"],
    "Premium": ["4 experiences / month", "Special formats", "Priority seating", "All Core perks"],
};

interface ProfileViewProps {
    user: any;
    onEdit: () => void;
    onLogout: () => void;
    onManagePlan: () => void;
}

export function ProfileView({ user, onEdit, onLogout, onManagePlan }: ProfileViewProps) {
    const tier = user.subscription_tier || 'Starter';
    const quota = user.events_quota ?? 1;
    const used = user.events_used ?? 0;
    const remaining = Math.max(0, quota - used);
    const formats: string[] = user.available_formats || ['Dinners'];
    const perks = TIER_PERKS[tier] || TIER_PERKS['Starter'];
    const domains: string[] = user.domains || [];
    const skills: string[] = user.hard_skills || [];
    const langs: string[] = user.languages || [];
    const exp: string[] = user.experience_level || [];
    const intents: string[] = user.intents || [];
    const status = user.current_status || {};
    const battery = user.social_battery || '';
    const pace = user.pace ?? 5;
    const initials = (user.name || '?').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
    const hasCareer = (status.type || status.company_name) || user.education || domains.length || skills.length || exp.length;

    return (
        <div className="space-y-7 relative z-10 w-full max-w-lg mx-auto">
            <h2 className="text-4xl sm:text-5xl font-black uppercase tracking-tighter text-black drop-shadow-[2px_2px_0_#fff]">Profile</h2>

            {/* ===== IDENTITY ===== */}
            <div className="bg-white border-[4px] border-black rounded-[2.5rem] p-5 shadow-[8px_8px_0_#000] flex items-center gap-4">
                {user.avatar
                    ? <img src={user.avatar} alt="avatar" className="w-24 h-24 rounded-[2rem] border-[4px] border-black bg-gray-200 object-cover shrink-0 shadow-[6px_6px_0_#000] rotate-3" />
                    : <div className="w-24 h-24 rounded-[2rem] border-[4px] border-black bg-[#fde047] text-black flex items-center justify-center font-black text-3xl shrink-0 shadow-[6px_6px_0_#000] rotate-3">{initials}</div>}
                <div className="flex-1 min-w-0">
                    <h3 className="text-3xl font-black uppercase tracking-tighter leading-none text-black">
                        {user.name}{user.age ? <span className="text-[#e11d48]"> {user.age}</span> : ''}
                    </h3>
                    <div className="mt-3 flex items-center justify-between gap-3">
                        {(user.city || user.district) ? (
                            <button onClick={onEdit} className="inline-flex items-center gap-2 bg-[#fde047] pl-3 pr-2 py-1.5 border-[3px] border-black rounded-full shadow-[3px_3px_0_#000] hover:-translate-y-0.5 active:translate-y-0 transition-all">
                                <MapPin size={14} className="text-black" />
                                <span className="font-black text-[11px] text-black uppercase tracking-widest">{user.city}{user.district ? ` · ${user.district}` : ''}</span>
                                <ChevronDown size={14} className="text-black" strokeWidth={3} />
                            </button>
                        ) : <div />}
                        <EditButton onClick={onEdit} />
                    </div>
                </div>
            </div>

            {/* ===== MEMBERSHIP ===== */}
            <Section title="Membership" emoji="⭐" ribbon="bg-[#e11d48]">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-[#111827] text-[#fde047] border-[3px] border-black rounded-full font-black uppercase text-sm px-4 py-1.5 shadow-[2px_2px_0_#000] inline-flex items-center gap-1.5">
                        {tier === 'Premium' && <Star size={14} fill="#fde047" className="text-[#fde047]" />}{tier}
                    </span>
                    {user.has_penalty
                        ? <span className="bg-[#e11d48] text-white border-[3px] border-black rounded-full font-black uppercase text-[11px] px-3 py-1.5 shadow-[2px_2px_0_#000]">Penalty</span>
                        : <span className="bg-[#4ade80] text-black border-[3px] border-black rounded-full font-black uppercase text-[11px] px-3 py-1.5 shadow-[2px_2px_0_#000]">Active</span>}
                </div>

                <Field label="Events Available">
                    <div className="flex items-center gap-3">
                        <span className="text-3xl font-black tracking-tighter text-black">{remaining} <span className="text-gray-300">/ {quota}</span></span>
                        <div className="flex gap-1.5">
                            {Array.from({ length: Math.max(quota, 1) }).map((_, i) => (
                                <div key={i} className={`w-7 h-7 rounded-lg border-[3px] border-black ${i < remaining ? 'bg-[#fde047] shadow-[2px_2px_0_#000]' : 'bg-gray-100'}`} />
                            ))}
                        </div>
                    </div>
                </Field>

                <Field label="Your Plan Includes">
                    <div className="space-y-2.5">
                        {perks.map(item => (
                            <div key={item} className="flex items-center gap-2.5">
                                <span className="w-5 h-5 bg-[#4ade80] border-[2px] border-black rounded-md flex items-center justify-center shrink-0">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="text-black"><path d="M20 6 9 17l-5-5" /></svg>
                                </span>
                                <span className="font-black uppercase text-xs text-black">{item}</span>
                            </div>
                        ))}
                    </div>
                </Field>

                <button onClick={onManagePlan} className="w-full bg-[#fde047] text-black py-3.5 rounded-full font-black uppercase text-sm border-[4px] border-black shadow-[4px_4px_0_#000] hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#000] transition-all">
                    Manage plan
                </button>
            </Section>

            {/* ===== CAREER ===== */}
            {hasCareer && (
                <Section title="Career" emoji="💼" ribbon="bg-[#38bdf8]" onEdit={onEdit}>
                    {(status.type || status.company_name) && (
                        <Field label="Status">
                            <div className="flex items-start gap-2.5">
                                <Briefcase size={18} className="text-black mt-0.5 shrink-0" />
                                <span className="font-black uppercase text-sm text-black leading-snug">
                                    {(status.type || '').replace('_', ' / ')}{status.company_name ? ` · ${status.company_name}` : ''}{status.stage ? ` (${status.stage})` : ''}
                                </span>
                            </div>
                        </Field>
                    )}
                    {user.education && (
                        <Field label="Education">
                            <div className="flex items-start gap-2.5">
                                <GraduationCap size={18} className="text-black mt-0.5 shrink-0" />
                                <span className="font-black uppercase text-sm text-black leading-snug">{user.education}</span>
                            </div>
                        </Field>
                    )}
                    {domains.length > 0 && (
                        <Field label="Industries">
                            <div className="flex flex-wrap gap-2">{domains.map((t: string, i: number) => <Chip key={t} color={CHIP_COLORS[i % CHIP_COLORS.length]}>{t}</Chip>)}</div>
                        </Field>
                    )}
                    {skills.length > 0 && (
                        <Field label="Skills">
                            <div className="flex flex-wrap gap-2">{skills.map((t: string, i: number) => <Chip key={t} color={CHIP_COLORS[i % CHIP_COLORS.length]}>{t}</Chip>)}</div>
                        </Field>
                    )}
                    {exp.length > 0 && (
                        <Field label="Level">
                            <div className="flex flex-wrap gap-2">{exp.map((t: string) => <Chip key={t} color="bg-[#111827]" text="text-white">{t}</Chip>)}</div>
                        </Field>
                    )}
                </Section>
            )}

            {/* ===== VIBE & ASK ===== */}
            <Section title="Vibe & Ask" emoji="✨" ribbon="bg-[#c084fc]" onEdit={onEdit}>
                {battery && (
                    <Field label="Vibe">
                        <div className="inline-flex items-center gap-2"><Chip color="bg-[#fb7185]">{battery}</Chip></div>
                    </Field>
                )}
                <Field label="Work pace">
                    <div className="flex items-center gap-2">
                        <Activity size={16} className="text-black shrink-0" />
                        <div className="flex-1 h-4 bg-gray-100 border-[3px] border-black rounded-full overflow-hidden">
                            <div className="h-full bg-[#e11d48]" style={{ width: `${(pace / 10) * 100}%` }} />
                        </div>
                    </div>
                </Field>
                {langs.length > 0 && (
                    <Field label="Languages">
                        <div className="flex flex-wrap gap-2">{langs.map((t: string, i: number) => <Chip key={t} color={CHIP_COLORS[i % CHIP_COLORS.length]}>{t}</Chip>)}</div>
                    </Field>
                )}
                {(user.custom_request_raw || intents.length > 0) && (
                    <Field label="Looking For">
                        {user.custom_request_raw && (
                            <div className="bg-[#fde047] border-[3px] border-black rounded-[1.5rem] p-4 shadow-[3px_3px_0_#000] mb-3">
                                <p className="font-black uppercase text-sm text-black leading-snug flex gap-1.5"><Target size={16} className="shrink-0 mt-0.5" /> “{user.custom_request_raw}”</p>
                            </div>
                        )}
                        <div className="flex flex-wrap gap-2">{intents.map((t: string) => <Chip key={t} color="bg-[#38bdf8]">{t.replace('intent:', '').replace('_', ' ')}</Chip>)}</div>
                    </Field>
                )}
                <Field label="Available Formats">
                    <div className="flex flex-wrap gap-2">{formats.map((t: string, i: number) => <Chip key={t} color={CHIP_COLORS[i % CHIP_COLORS.length]}>{t}</Chip>)}</div>
                </Field>
            </Section>

            <button onClick={onLogout} className="w-full bg-white border-[4px] border-black py-4 rounded-full font-black uppercase text-sm text-[#e11d48] shadow-[6px_6px_0_#000] flex items-center justify-center gap-2 hover:-translate-y-0.5 transition-all">
                <LogOut size={18} strokeWidth={2.5} /> Log Out
            </button>
        </div>
    );
}
