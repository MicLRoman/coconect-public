"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, Briefcase, GraduationCap, Target, Activity, MapPin, Star, ChevronLeft } from 'lucide-react';
import { API_URL } from '../../../lib/api';
import { Section, Chip, Field, CHIP_COLORS } from '../../components/popart';

export default function DynamicProfile() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`${API_URL}/users/${id}`)
            .then(res => res.json())
            .then(data => setUser(data.user || data))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) return <div className="min-h-screen flex items-center justify-center relative z-10"><Loader2 className="animate-spin text-[#e11d48]" size={40} /></div>;

    if (!user) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center px-8 text-center gap-6 relative z-10">
                <h2 className="text-2xl font-black uppercase tracking-tighter">Profile not found</h2>
                <button onClick={() => router.back()} className="bg-[#111827] text-white px-8 py-4 rounded-full font-black uppercase text-sm border-[3px] border-black shadow-[6px_6px_0_#000] hover:-translate-y-1 transition-all">Go back</button>
            </div>
        );
    }

    const tier = user.subscription_tier || 'Starter';
    const formats: string[] = user.available_formats || [];
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
    const hasVibe = battery || langs.length || user.custom_request_raw || intents.length || formats.length;

    return (
        <div className="min-h-screen pb-28 px-5 pt-12 space-y-7 relative z-10">
            <button onClick={() => router.back()} className="w-11 h-11 bg-white border-[3px] border-black rounded-full flex items-center justify-center shadow-[4px_4px_0_#000] hover:-translate-y-0.5 active:translate-y-0 transition-all">
                <ChevronLeft size={22} strokeWidth={3} className="text-black" />
            </button>

            {/* ===== IDENTITY (read-only) ===== */}
            <div className="bg-white border-[4px] border-black rounded-[2.5rem] p-5 shadow-[8px_8px_0_#000] flex items-center gap-4">
                {user.avatar
                    ? <img src={user.avatar} alt="avatar" className="w-24 h-24 rounded-[2rem] border-[4px] border-black bg-gray-200 object-cover shrink-0 shadow-[6px_6px_0_#000] rotate-3" />
                    : <div className="w-24 h-24 rounded-[2rem] border-[4px] border-black bg-[#fde047] text-black flex items-center justify-center font-black text-3xl shrink-0 shadow-[6px_6px_0_#000] rotate-3">{initials}</div>}
                <div className="flex-1 min-w-0">
                    <h3 className="text-3xl font-black uppercase tracking-tighter leading-none text-black">
                        {user.name}{user.age ? <span className="text-[#e11d48]"> {user.age}</span> : ''}
                    </h3>
                    {(user.city || user.district) && (
                        <div className="mt-3 inline-flex items-center gap-2 bg-[#fde047] px-3 py-1.5 border-[3px] border-black rounded-full shadow-[3px_3px_0_#000]">
                            <MapPin size={14} className="text-black" />
                            <span className="font-black text-[11px] text-black uppercase tracking-widest">{user.city}{user.district ? ` · ${user.district}` : ''}</span>
                        </div>
                    )}
                    <div className="mt-2">
                        <span className="bg-[#111827] text-[#fde047] border-[3px] border-black rounded-full font-black uppercase text-[11px] px-3 py-1 shadow-[2px_2px_0_#000] inline-flex items-center gap-1.5">
                            {tier === 'Premium' && <Star size={12} fill="#fde047" className="text-[#fde047]" />}{tier}
                        </span>
                    </div>
                </div>
            </div>

            {/* ===== CAREER ===== */}
            {hasCareer && (
                <Section title="Career" emoji="💼" ribbon="bg-[#38bdf8]">
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
                            <div className="flex flex-wrap gap-2">{domains.map((t, i) => <Chip key={t} color={CHIP_COLORS[i % CHIP_COLORS.length]}>{t}</Chip>)}</div>
                        </Field>
                    )}
                    {skills.length > 0 && (
                        <Field label="Skills">
                            <div className="flex flex-wrap gap-2">{skills.map((t, i) => <Chip key={t} color={CHIP_COLORS[i % CHIP_COLORS.length]}>{t}</Chip>)}</div>
                        </Field>
                    )}
                    {exp.length > 0 && (
                        <Field label="Level">
                            <div className="flex flex-wrap gap-2">{exp.map(t => <Chip key={t} color="bg-[#111827]" text="text-white">{t}</Chip>)}</div>
                        </Field>
                    )}
                </Section>
            )}

            {/* ===== VIBE & ASK ===== */}
            {hasVibe && (
                <Section title="Vibe & Ask" emoji="✨" ribbon="bg-[#c084fc]">
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
                            <div className="flex flex-wrap gap-2">{langs.map((t, i) => <Chip key={t} color={CHIP_COLORS[i % CHIP_COLORS.length]}>{t}</Chip>)}</div>
                        </Field>
                    )}
                    {(user.custom_request_raw || intents.length > 0) && (
                        <Field label="Looking For">
                            {user.custom_request_raw && (
                                <div className="bg-[#fde047] border-[3px] border-black rounded-[1.5rem] p-4 shadow-[3px_3px_0_#000] mb-3">
                                    <p className="font-black uppercase text-sm text-black leading-snug flex gap-1.5"><Target size={16} className="shrink-0 mt-0.5" /> “{user.custom_request_raw}”</p>
                                </div>
                            )}
                            <div className="flex flex-wrap gap-2">{intents.map(t => <Chip key={t} color="bg-[#38bdf8]">{t.replace('intent:', '').replace('_', ' ')}</Chip>)}</div>
                        </Field>
                    )}
                    {formats.length > 0 && (
                        <Field label="Available Formats">
                            <div className="flex flex-wrap gap-2">{formats.map((t, i) => <Chip key={t} color={CHIP_COLORS[i % CHIP_COLORS.length]}>{t}</Chip>)}</div>
                        </Field>
                    )}
                </Section>
            )}
        </div>
    );
}
