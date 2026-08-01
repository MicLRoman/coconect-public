"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Loader2, Camera, Check } from 'lucide-react';
import { API_URL, getUserId } from '../../../lib/api';
import { CITIES, INDUSTRIES, SKILLS_MAP, LANGUAGES_LIST } from '../../../onboarding/constants';
import { getNeighborhoodsForCity } from '../../../constants/cities';

const EXP_LEVELS = ['Beginner', 'Middle', 'Senior', 'Executive'];
const BATTERY = ['Introvert', 'Ambivert', 'Extrovert'];
const STATUS_TYPES = [['Employment', 'Employment'], ['Business_Startup', 'Business / Startup'], ['Freelance_Nomad', 'Freelance / Nomad']];

// Resize an uploaded image to a small square JPEG data URL (no storage bucket needed).
function fileToAvatar(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const img = new Image();
            img.onload = () => {
                const size = 256;
                const c = document.createElement('canvas');
                c.width = size; c.height = size;
                const ctx = c.getContext('2d')!;
                const m = Math.min(img.width, img.height);
                ctx.drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, size, size);
                resolve(c.toDataURL('image/jpeg', 0.8));
            };
            img.onerror = reject;
            img.src = reader.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

export default function EditProfile() {
    const router = useRouter();
    const fileRef = useRef<HTMLInputElement>(null);
    const [form, setForm] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);

    useEffect(() => {
        const uid = getUserId();
        if (!uid) { router.push('/registration?mode=login'); return; }
        (async () => {
            const res = await fetch(`${API_URL}/users/${uid}`);
            const data = await res.json();
            const u = data.user || {};
            setForm({
                avatar: u.avatar || '',
                name: u.name || '', age: u.age || '', city: u.city || '', district: u.district || '',
                languages: u.languages || [], education: u.education || '',
                experience_level: u.experience_level || [], domains: u.domains || [], hard_skills: u.hard_skills || [],
                current_status: u.current_status || { type: '', company_name: '', stage: '' },
                pace: u.pace ?? 5, social_battery: u.social_battery || '',
                custom_request_raw: u.custom_request_raw || '',
            });
            setLoading(false);
        })();
    }, [router]);

    const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
    const toggle = (k: string, v: string, max?: number) => setForm((f: any) => {
        const cur: string[] = f[k] || [];
        let next = cur.includes(v) ? cur.filter(x => x !== v) : [...cur, v];
        if (max) next = next.slice(0, max);
        return { ...f, [k]: next };
    });
    const setStatus = (k: string, v: string) => setForm((f: any) => ({ ...f, current_status: { ...f.current_status, [k]: v } }));

    const onAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const dataUrl = await fileToAvatar(file);
            set('avatar', dataUrl); // optimistic preview
            setUploadingAvatar(true);
            const res = await fetch(`${API_URL}/users/${getUserId()}/avatar`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data_url: dataUrl }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok && data.url) set('avatar', data.url);
            else alert(data.detail || 'Upload failed');
        } catch { alert('Could not read image'); }
        finally { setUploadingAvatar(false); }
    };

    const save = async () => {
        setSaving(true);
        try {
            await fetch(`${API_URL}/users/${getUserId()}`, {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, age: form.age ? parseInt(form.age, 10) : null }),
            });
            router.push('/feed/profile');
        } catch { alert('Save failed'); } finally { setSaving(false); }
    };

    if (loading || !form) return <div className="min-h-[100dvh] flex items-center justify-center bg-[#fafafa]"><Loader2 className="animate-spin text-[#e11d48]" size={40} /></div>;

    const hoods = getNeighborhoodsForCity(form.city);
    const availableSkills: string[] = Array.from(new Set((form.domains || []).flatMap((d: string) => (SKILLS_MAP as any)[d] || [])));
    const field = "w-full bg-white border-[3px] border-black rounded-xl px-4 py-3 font-bold outline-none focus:border-[#e11d48] shadow-[3px_3px_0_#000]";
    const chip = (active: boolean) => `px-3.5 py-2 font-black uppercase text-[10px] border-[2px] border-black rounded-lg transition-all ${active ? 'bg-[#111827] text-white shadow-[3px_3px_0_#38bdf8] -translate-y-0.5' : 'bg-white text-gray-700 hover:shadow-[2px_2px_0_#000]'}`;

    return (
        <div className="min-h-[100dvh] bg-[#fafafa] pb-32">
            <div className="px-5 pt-10 pb-4 flex items-center gap-3 border-b-[3px] border-black bg-white sticky top-0 z-20">
                <button onClick={() => router.back()} className="w-10 h-10 bg-white border-[3px] border-black rounded-full flex items-center justify-center shadow-[2px_2px_0_#000]"><ChevronLeft size={20} strokeWidth={3} /></button>
                <h2 className="font-black uppercase text-lg">Edit profile</h2>
            </div>

            <div className="px-6 pt-8 space-y-7 max-w-lg mx-auto">
                {/* Avatar */}
                <div className="flex flex-col items-center gap-3">
                    <button onClick={() => fileRef.current?.click()} disabled={uploadingAvatar} className="relative group">
                        {form.avatar
                            ? <img src={form.avatar} className="w-28 h-28 rounded-full border-[4px] border-black object-cover shadow-[4px_4px_0_#e11d48]" />
                            : <div className="w-28 h-28 rounded-full border-[4px] border-black bg-[#fde047] flex items-center justify-center shadow-[4px_4px_0_#e11d48]"><Camera size={32} /></div>}
                        {uploadingAvatar && <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center"><Loader2 size={28} className="animate-spin text-white" /></div>}
                        <div className="absolute -bottom-1 -right-1 w-9 h-9 bg-[#e11d48] text-white border-[3px] border-black rounded-full flex items-center justify-center"><Camera size={15} /></div>
                    </button>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onAvatar} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Tap to change photo</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div><label className="font-black uppercase text-xs mb-2 block">Name</label><input className={field} value={form.name} onChange={e => set('name', e.target.value)} /></div>
                    <div><label className="font-black uppercase text-xs mb-2 block">Age</label><input className={field} type="number" value={form.age} onChange={e => set('age', e.target.value)} /></div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div><label className="font-black uppercase text-xs mb-2 block">City</label>
                        <select className={field} value={form.city} onChange={e => { set('city', e.target.value); set('district', ''); }}>
                            <option value="">Select…</option>{CITIES.map(c => <option key={c}>{c}</option>)}
                        </select>
                    </div>
                    <div><label className="font-black uppercase text-xs mb-2 block">Neighborhood</label>
                        <select className={field} value={form.district} onChange={e => set('district', e.target.value)} disabled={!hoods.length}>
                            <option value="">{hoods.length ? 'No preference' : '—'}</option>{hoods.map(h => <option key={h}>{h}</option>)}
                        </select>
                    </div>
                </div>

                <div><label className="font-black uppercase text-xs mb-2 block">Languages</label>
                    <div className="flex flex-wrap gap-2">{LANGUAGES_LIST.map(l => <button key={l} className={chip(form.languages.includes(l))} onClick={() => toggle('languages', l)}>{l}</button>)}</div>
                </div>

                <div><label className="font-black uppercase text-xs mb-2 block">Education</label><input className={field} value={form.education} onChange={e => set('education', e.target.value)} placeholder="University / Alma mater" /></div>

                <div><label className="font-black uppercase text-xs mb-2 block">Level (max 2)</label>
                    <div className="flex flex-wrap gap-2">{EXP_LEVELS.map(l => <button key={l} className={chip(form.experience_level.includes(l))} onClick={() => toggle('experience_level', l, 2)}>{l}</button>)}</div>
                </div>

                <div><label className="font-black uppercase text-xs mb-2 block">Industries (max 3)</label>
                    <div className="flex flex-wrap gap-2">{INDUSTRIES.map(i => <button key={i} className={chip(form.domains.includes(i))} onClick={() => { toggle('domains', i, 3); set('hard_skills', []); }}>{i}</button>)}</div>
                </div>

                {availableSkills.length > 0 && (
                    <div><label className="font-black uppercase text-xs mb-2 block">Skills</label>
                        <div className="flex flex-wrap gap-2">{availableSkills.map(s => <button key={s} className={chip(form.hard_skills.includes(s))} onClick={() => toggle('hard_skills', s)}>{s}</button>)}</div>
                    </div>
                )}

                <div><label className="font-black uppercase text-xs mb-2 block">Status</label>
                    <div className="grid grid-cols-3 gap-2 mb-3">{STATUS_TYPES.map(([id, label]) => <button key={id} className={chip(form.current_status.type === id)} onClick={() => setStatus('type', id)}>{label}</button>)}</div>
                    {(form.current_status.type === 'Employment' || form.current_status.type === 'Business_Startup') &&
                        <input className={field} placeholder="Company / project" value={form.current_status.company_name} onChange={e => setStatus('company_name', e.target.value)} />}
                    {form.current_status.type === 'Business_Startup' &&
                        <div className="flex flex-wrap gap-2 mt-2">{['Idea / MVP', 'Scaling', 'Mature Business'].map(s => <button key={s} className={chip(form.current_status.stage === s)} onClick={() => setStatus('stage', s)}>{s}</button>)}</div>}
                </div>

                <div><label className="font-black uppercase text-xs mb-2 block">Social battery</label>
                    <div className="flex gap-2">{BATTERY.map(b => <button key={b} className={chip(form.social_battery === b)} onClick={() => set('social_battery', b)}>{b}</button>)}</div>
                </div>

                <div><label className="font-black uppercase text-xs mb-2 block">Work pace · {form.pace}/10</label>
                    <input type="range" min={0} max={10} value={form.pace} onChange={e => set('pace', parseInt(e.target.value))} className="w-full accent-[#e11d48]" />
                </div>

                <div><label className="font-black uppercase text-xs mb-2 block">What you're looking for</label>
                    <textarea className={field} rows={3} value={form.custom_request_raw} onChange={e => set('custom_request_raw', e.target.value)} />
                </div>
            </div>

            <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg px-5 pb-8 pt-6 bg-gradient-to-t from-[#fafafa] via-[#fafafa] to-transparent">
                <button onClick={save} disabled={saving || uploadingAvatar} className="w-full py-4 bg-[#e11d48] text-white rounded-2xl font-black uppercase text-sm tracking-widest border-[3px] border-black shadow-[6px_6px_0_#111827] hover:-translate-y-1 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                    {saving ? <Loader2 className="animate-spin" size={18} /> : <><Check size={18} /> Save changes</>}
                </button>
            </div>
        </div>
    );
}
