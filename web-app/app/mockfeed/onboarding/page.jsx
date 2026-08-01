"use client";

import React, { useState } from 'react';
import { ChevronLeft, ArrowRight, Check, FileText, Zap, MapPin, PartyPopper } from 'lucide-react';
import { FeedGradient } from '../../feed/components/popart';

const INDUSTRIES = ['IT & Software', 'Finance', 'Design', 'Marketing', 'Health', 'Crypto', 'AI / ML', 'E-commerce'];
const SKILLS = ['React', 'Python', 'ML / AI', 'Product', 'Growth', 'Design', 'Sales', 'Ops'];
const INTENTS = ['Co-founder', 'Network', 'Hiring', 'Investing', 'Mentorship', 'Friends'];
const STATUS = [
    { id: 'Employment', label: 'Employment', Icon: FileText },
    { id: 'Business / Startup', label: 'Business / Startup', Icon: Zap },
    { id: 'Freelance / Nomad', label: 'Freelance / Nomad', Icon: MapPin },
];
const STAGES = ['Idea / MVP', 'Scaling', 'Mature'];
const VIBES = ['Introvert', 'Ambivert', 'Extrovert'];
const TOTAL = 5;

const Tag = ({ active, onClick, children }) => (
    <button
        onClick={onClick}
        className={`px-4 py-2.5 font-black uppercase text-[11px] border-[3px] border-black rounded-full transition-all ${active ? 'bg-[#fde047] shadow-[3px_3px_0_#000] -translate-y-0.5' : 'bg-white hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#000]'}`}
    >
        {children}
    </button>
);

export default function MockOnboarding() {
    const [step, setStep] = useState(0);
    const [done, setDone] = useState(false);
    const [d, setD] = useState({ name: '', status: '', company: '', stage: '', industries: [], skills: [], vibe: '', pace: 5, ask: '', intents: [] });

    const set = (k, v) => setD(p => ({ ...p, [k]: v }));
    const toggle = (k, v) => setD(p => ({ ...p, [k]: p[k].includes(v) ? p[k].filter(x => x !== v) : [...p[k], v] }));

    const valid = [
        !!d.name.trim(),
        !!d.status,
        d.industries.length > 0 && d.skills.length > 0,
        !!d.vibe,
        true,
    ][step];

    const back = () => setStep(s => Math.max(0, s - 1));
    const next = () => (step === TOTAL - 1 ? setDone(true) : setStep(s => s + 1));

    if (done) {
        return (
            <div className="fixed inset-0 bg-[#fafafa] overflow-hidden font-sans">
                <FeedGradient tab="events" />
                <div className="relative z-10 h-full flex flex-col items-center justify-center p-8 text-center">
                    <div className="w-28 h-28 bg-[#fde047] border-[4px] border-black rounded-[2rem] flex items-center justify-center mb-8 shadow-[8px_8px_0_#000] rotate-3 animate-pop-float">
                        <PartyPopper size={52} className="text-black" />
                    </div>
                    <h1 className="text-5xl font-black uppercase tracking-tighter text-black mb-4 leading-none">Welcome,<br /><span className="text-[#e11d48]">{d.name || 'friend'}!</span></h1>
                    <p className="text-sm font-black text-gray-500 mb-12 max-w-xs leading-relaxed uppercase tracking-wide">Your profile's ready. Time to meet your first table.</p>
                    <button className="w-full max-w-xs py-4 bg-[#111827] text-white rounded-full font-black uppercase text-sm border-[4px] border-black shadow-[6px_6px_0_#fde047] hover:-translate-y-1 transition-all">Enter Tablr</button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-[#fafafa] overflow-hidden font-sans flex flex-col">
            <FeedGradient tab="events" />

            {/* Progress */}
            <div className="relative z-20 px-6 pt-12 pb-4 flex items-center justify-between">
                <div className="flex gap-1.5">
                    {Array.from({ length: TOTAL }).map((_, i) => (
                        <div key={i} className={`h-2 rounded-full border-[2px] border-black transition-all duration-300 ${step >= i ? 'w-9 bg-[#111827]' : 'w-3 bg-white'}`} />
                    ))}
                </div>
                <button onClick={() => { setStep(0); setD({ name: '', status: '', company: '', stage: '', industries: [], skills: [], vibe: '', pace: 5, ask: '', intents: [] }); }} className="text-[10px] font-black uppercase tracking-widest text-black/50 hover:text-[#e11d48] transition-colors">Start over</button>
            </div>

            {/* Content */}
            <div className="relative z-10 flex-1 overflow-y-auto hide-scrollbar px-6 pt-4 pb-32">
                <div className="max-w-lg mx-auto w-full">
                    {step === 0 && (
                        <>
                            <h2 className="text-5xl font-black uppercase tracking-tighter leading-[0.9] mb-3 text-black">What's your<br /><span className="text-[#e11d48]">name?</span></h2>
                            <p className="text-sm font-black text-gray-500 uppercase tracking-wide mb-8 border-l-[4px] border-black pl-3">This is how you'll show up at the table.</p>
                            <input
                                autoFocus value={d.name} onChange={e => set('name', e.target.value)} placeholder="e.g., Michael F."
                                className="w-full bg-white border-[4px] border-black rounded-[1.5rem] p-5 font-black uppercase text-lg outline-none focus:shadow-[6px_6px_0_#fde047] transition-all"
                            />
                        </>
                    )}

                    {step === 1 && (
                        <>
                            <h2 className="text-5xl font-black uppercase tracking-tighter leading-[0.9] mb-3 text-black">Current<br /><span className="text-[#e11d48]">status.</span></h2>
                            <p className="text-sm font-black text-gray-500 uppercase tracking-wide mb-8 border-l-[4px] border-black pl-3">Company, your own empire, or solo?</p>
                            <div className="grid grid-cols-3 gap-2.5 mb-6">
                                {STATUS.map(({ id, label, Icon }) => {
                                    const sel = d.status === id;
                                    return (
                                        <button key={id} onClick={() => { set('status', id); set('company', ''); set('stage', ''); }}
                                            className={`p-4 border-[3px] border-black rounded-2xl flex flex-col items-center text-center gap-2 transition-all ${sel ? 'bg-[#e11d48] text-white shadow-[5px_5px_0_#000] -translate-y-1' : 'bg-white text-black hover:shadow-[3px_3px_0_#000]'}`}>
                                            <Icon size={20} />
                                            <span className="font-black uppercase text-[9px] leading-tight">{label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                            {(d.status === 'Employment' || d.status === 'Business / Startup') && (
                                <div className="space-y-4">
                                    <input value={d.company} onChange={e => set('company', e.target.value)} placeholder={d.status === 'Employment' ? 'Where do you work?' : 'Project / company name'}
                                        className="w-full bg-white border-[3px] border-black rounded-[1.25rem] p-4 font-black uppercase text-base outline-none focus:shadow-[4px_4px_0_#fde047] transition-all" />
                                    {d.status === 'Business / Startup' && (
                                        <div className="flex flex-wrap gap-2">
                                            {STAGES.map(st => <Tag key={st} active={d.stage === st} onClick={() => set('stage', st)}>{st}</Tag>)}
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <h2 className="text-5xl font-black uppercase tracking-tighter leading-[0.9] mb-3 text-black">Industry<br /><span className="text-[#e11d48]">& skills.</span></h2>
                            <p className="text-sm font-black text-gray-500 uppercase tracking-wide mb-7 border-l-[4px] border-black pl-3">Pick what describes you best.</p>
                            <p className="font-black uppercase text-[10px] tracking-widest text-gray-400 mb-2">Industries</p>
                            <div className="flex flex-wrap gap-2 mb-7">
                                {INDUSTRIES.map(t => <Tag key={t} active={d.industries.includes(t)} onClick={() => toggle('industries', t)}>{t}</Tag>)}
                            </div>
                            <p className="font-black uppercase text-[10px] tracking-widest text-gray-400 mb-2">Skills</p>
                            <div className="flex flex-wrap gap-2">
                                {SKILLS.map(t => <Tag key={t} active={d.skills.includes(t)} onClick={() => toggle('skills', t)}>{t}</Tag>)}
                            </div>
                        </>
                    )}

                    {step === 3 && (
                        <>
                            <h2 className="text-5xl font-black uppercase tracking-tighter leading-[0.9] mb-3 text-black">Your<br /><span className="text-[#e11d48]">vibe.</span></h2>
                            <p className="text-sm font-black text-gray-500 uppercase tracking-wide mb-8 border-l-[4px] border-black pl-3">How do you do social energy?</p>
                            <div className="flex flex-col gap-3 mb-8">
                                {VIBES.map(v => {
                                    const sel = d.vibe === v;
                                    return (
                                        <button key={v} onClick={() => set('vibe', v)}
                                            className={`w-full rounded-[1.5rem] border-[3px] border-black px-5 py-4 flex items-center justify-between transition-all ${sel ? 'bg-[#fde047] shadow-[5px_5px_0_#000] -translate-y-0.5' : 'bg-white shadow-[4px_4px_0_#000] hover:-translate-y-0.5'}`}>
                                            <span className="font-black uppercase text-lg tracking-tighter text-black">{v}</span>
                                            <span className={`w-7 h-7 rounded-full border-[3px] border-black flex items-center justify-center ${sel ? 'bg-[#e11d48]' : 'bg-white'}`}>{sel && <Check size={14} className="text-white" strokeWidth={4} />}</span>
                                        </button>
                                    );
                                })}
                            </div>
                            <p className="font-black uppercase text-[10px] tracking-widest text-gray-400 mb-3">Work pace · {d.pace}/10</p>
                            <input type="range" min="1" max="10" value={d.pace} onChange={e => set('pace', Number(e.target.value))} className="w-full accent-[#e11d48]" />
                        </>
                    )}

                    {step === 4 && (
                        <>
                            <h2 className="text-5xl font-black uppercase tracking-tighter leading-[0.9] mb-3 text-black">What are you<br /><span className="text-[#e11d48]">looking for?</span></h2>
                            <p className="text-sm font-black text-gray-500 uppercase tracking-wide mb-7 border-l-[4px] border-black pl-3">Optional — helps us seat you right.</p>
                            <textarea value={d.ask} onChange={e => set('ask', e.target.value)} rows={3} placeholder="e.g., a technical co-founder and sharp operators in AI."
                                className="w-full bg-white border-[3px] border-black rounded-[1.5rem] p-4 font-bold text-base outline-none focus:shadow-[4px_4px_0_#fde047] transition-all resize-none mb-6" />
                            <div className="flex flex-wrap gap-2">
                                {INTENTS.map(t => <Tag key={t} active={d.intents.includes(t)} onClick={() => toggle('intents', t)}>{t}</Tag>)}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="relative z-20 px-6 pb-8 pt-3 flex items-center justify-between gap-4">
                <button onClick={back} disabled={step === 0} className="w-12 h-12 bg-white border-[3px] border-black rounded-full flex items-center justify-center shadow-[3px_3px_0_#000] hover:-translate-y-0.5 transition-all disabled:opacity-30 disabled:pointer-events-none shrink-0">
                    <ChevronLeft size={22} strokeWidth={3} />
                </button>
                <button onClick={next} disabled={!valid}
                    className="flex-1 py-4 bg-[#fde047] text-black rounded-full font-black uppercase text-sm tracking-widest border-[3px] border-black shadow-[5px_5px_0_#000] hover:-translate-y-0.5 transition-all flex justify-center items-center gap-2.5 disabled:opacity-40 disabled:pointer-events-none">
                    {step === TOTAL - 1 ? 'Finish' : 'Continue'} <ArrowRight size={18} strokeWidth={3} />
                </button>
            </div>
        </div>
    );
}
