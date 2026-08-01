"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ChevronLeft, MapPin, Clock, ArrowRight, XCircle, Lock, Check, CheckCircle2, Loader2, AlertTriangle, Star } from 'lucide-react';
import { formatTimeLeft } from '../../../utils/time';
import { API_URL, getUserId } from '../../../lib/api';
import { Chip, CHIP_COLORS } from '../../components/popart';

export default function EventDetailPage() {
    const router = useRouter();
    const { id: eventId } = useParams<{ id: string }>();
    const [d, setD] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [acting, setActing] = useState(false);

    const load = async () => {
        try {
            const res = await fetch(`${API_URL}/events/${eventId}/details?user_id=${getUserId()}`);
            if (res.ok) setD(await res.json());
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };
    useEffect(() => { load(); }, [eventId]);

    if (loading) return <div className="min-h-[100dvh] flex items-center justify-center relative z-10"><Loader2 className="animate-spin text-[#e11d48]" size={40} /></div>;
    if (!d || !d.event) return (
        <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-4 relative z-10">
            <p className="font-black uppercase">Event not found</p>
            <button onClick={() => router.back()} className="font-black text-[#e11d48] underline uppercase text-sm">Back</button>
        </div>
    );

    const ev = d.event;
    const isUpcoming = d.is_rsvped;
    const h = d.hours_until ?? 999;
    const group = d.group || [];

    const join = () => {
        if (d.has_penalty) { router.push('/feed/penalty'); return; }
        router.push(`/feed/events/join/${eventId}/1`);
    };

    const cancel = async () => {
        if (h < 24 && !confirm('Warning: canceling now incurs a penalty. Proceed?')) return;
        setActing(true);
        try {
            const res = await fetch(`${API_URL}/events/${eventId}/cancel`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: getUserId() }),
            });
            const data = await res.json().catch(() => ({}));
            if (data.penalty) alert('Late cancellation — a penalty was applied.');
            router.back();
        } finally { setActing(false); }
    };

    return (
        <div className="min-h-[100dvh] relative z-10 pb-44">
            <div className="max-w-lg mx-auto px-5 pt-5">
                {/* Header — glass bar */}
                <div className="sticky top-2 z-30 mb-9">
                    <div className="bg-white/55 backdrop-blur-xl border-[3px] border-black rounded-[2rem] pl-2 pr-3 py-2 shadow-[5px_5px_0_#000] flex items-center gap-3">
                        <button onClick={() => router.back()} className="w-10 h-10 bg-white border-[3px] border-black rounded-full flex items-center justify-center shadow-[2px_2px_0_#000] hover:-translate-y-0.5 transition-all shrink-0">
                            <ChevronLeft size={20} strokeWidth={3} />
                        </button>
                        <h2 className="font-black uppercase text-lg tracking-tight">{isUpcoming ? 'Your Pool' : 'Pool Details'}</h2>
                        {isUpcoming && (
                            <span className="ml-auto bg-[#4ade80] border-[3px] border-black rounded-full font-black uppercase text-[10px] px-3 py-1.5 shadow-[2px_2px_0_#000] inline-flex items-center gap-1">
                                <Check size={12} strokeWidth={4} /> You're in
                            </span>
                        )}
                    </div>
                </div>

                {/* Title + chips */}
                <h1 className="text-5xl font-black uppercase tracking-tighter leading-[0.9] mb-4 text-black">{ev.title}</h1>
                <div className="flex flex-wrap gap-2 mb-7">
                    <span className="bg-[#fde047] border-[3px] border-black rounded-full font-black uppercase text-[10px] px-3 py-1.5 shadow-[2px_2px_0_#000]">{ev.event_date}</span>
                    <span className="bg-white border-[3px] border-black rounded-full font-black uppercase text-[10px] px-3 py-1.5 shadow-[2px_2px_0_#000] inline-flex items-center gap-1.5"><Clock size={12} strokeWidth={3} /> {ev.start_time}</span>
                    {ev.city && <span className="bg-white border-[3px] border-black rounded-full font-black uppercase text-[10px] px-3 py-1.5 shadow-[2px_2px_0_#000]">{ev.city}</span>}
                </div>

                {/* Penalty warning (open pool) */}
                {!isUpcoming && d.has_penalty && (
                    <div className="bg-[#111827] text-white p-5 rounded-[2rem] border-[4px] border-black mb-7 shadow-[6px_6px_0_#000] flex items-center gap-4">
                        <AlertTriangle size={26} className="shrink-0 text-[#fb7185]" />
                        <p className="text-xs font-black uppercase tracking-wide">Settle your penalty before joining a new dinner.</p>
                    </div>
                )}

                {/* UPCOMING: location + table */}
                {isUpcoming && (
                    <>
                        {d.location_revealed ? (
                            <div className="relative pt-3 mb-8">
                                <div className="absolute -top-1 left-5 z-10 bg-[#e11d48] text-white font-black uppercase text-xs px-4 py-2 rounded-full border-[3px] border-white shadow-[4px_4px_0_#000] -rotate-2">📍 Location Revealed</div>
                                <div className="bg-[#111827] text-white border-[4px] border-black rounded-[2.5rem] p-6 pt-9 shadow-[10px_10px_0_#fde047] relative overflow-hidden">
                                    <div className="absolute top-0 right-0 bg-[#e11d48] text-white text-[10px] font-black uppercase px-3 py-1.5 border-b-[3px] border-l-[3px] border-black rounded-bl-2xl">{formatTimeLeft(h)}</div>
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 bg-[#e11d48] border-[3px] border-black rounded-full flex items-center justify-center shrink-0 shadow-[3px_3px_0_#000] animate-pop-float">
                                            <MapPin size={22} className="text-white" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Tonight's spot</p>
                                            <h3 className="font-black uppercase text-2xl leading-none tracking-tighter">{d.location_name}</h3>
                                            <p className="text-xs font-bold text-gray-400 uppercase mt-1.5">{d.location_address}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white border-[4px] border-black rounded-[2rem] p-5 mb-8 shadow-[6px_6px_0_#000] flex items-center gap-4">
                                <Lock size={24} className="text-gray-400 shrink-0" />
                                <div><h4 className="font-black uppercase text-sm">Location locked</h4><p className="text-[11px] font-black uppercase text-gray-500 tracking-wide">Revealed 12h before — {formatTimeLeft(h)}</p></div>
                            </div>
                        )}

                        <div className="relative pt-3">
                            <div className="absolute -top-1 left-5 z-10 bg-[#38bdf8] text-black font-black uppercase text-xs px-4 py-2 rounded-full border-[3px] border-black shadow-[4px_4px_0_#000] -rotate-2">🍽 Your Table</div>
                            <div className="bg-white border-[4px] border-black rounded-[2.5rem] p-5 pt-9 shadow-[8px_8px_0_#000]">
                                {d.group_revealed && group.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {group.map((p: any, i: number) => <Chip key={p.user_id || i} color={CHIP_COLORS[i % CHIP_COLORS.length]}>{p.name || p.headline || p.role || 'Tablemate'}</Chip>)}
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex flex-wrap gap-2">
                                            {(ev.pool_tags || []).map((t: string, i: number) => <Chip key={t} color={CHIP_COLORS[i % CHIP_COLORS.length]}>{t}</Chip>)}
                                        </div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-4">Names revealed 24h before</p>
                                    </>
                                )}
                            </div>
                        </div>
                    </>
                )}

                {/* PAST EVENT: User Feedback */}
                {h < 0 && d.review && (
                    <div className="relative pt-3 mt-8">
                        <div className="absolute -top-1 left-5 z-10 bg-[#3b82f6] text-white font-black uppercase text-xs px-4 py-2 rounded-full border-[3px] border-white shadow-[4px_4px_0_#000] -rotate-2">
                            ⭐ Your Feedback
                        </div>
                        <div className="bg-white border-[4px] border-black rounded-[2.5rem] p-6 pt-9 shadow-[8px_8px_0_#000] space-y-6">
                            
                            <div>
                                <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2">Overall Rating</p>
                                <div className="flex gap-1">
                                    {[1, 2, 3, 4, 5].map(s => (
                                        <Star key={s} size={24} className={d.review.rating >= s ? 'text-[#fde047] fill-[#fde047]' : 'text-gray-200'} />
                                    ))}
                                </div>
                            </div>

                            {d.review.moderation_note && (
                                <div>
                                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2">Your Note</p>
                                    <p className="font-bold text-sm bg-gray-50 border-[2px] border-black rounded-xl p-3">{d.review.moderation_note}</p>
                                </div>
                            )}

                            <div>
                                <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-3">Tablemates</p>
                                <div className="space-y-3">
                                    {group.filter((u: any) => d.review.liked_users?.includes(u.user_id)).length > 0 && (
                                        <div>
                                            <p className="text-xs font-black uppercase text-black mb-2 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#34d399]"></span> Would meet again</p>
                                            <div className="flex flex-wrap gap-2">
                                                {group.filter((u: any) => d.review.liked_users?.includes(u.user_id)).map((u: any) => <Chip key={u.user_id} color="bg-white">{u.name}</Chip>)}
                                            </div>
                                        </div>
                                    )}
                                    {group.filter((u: any) => !d.review.liked_users?.includes(u.user_id) && !d.review.disliked_users?.includes(u.user_id)).length > 0 && (
                                        <div className="mt-4">
                                            <p className="text-xs font-black uppercase text-black mb-2 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#9ca3af]"></span> Neutral</p>
                                            <div className="flex flex-wrap gap-2">
                                                {group.filter((u: any) => !d.review.liked_users?.includes(u.user_id) && !d.review.disliked_users?.includes(u.user_id)).map((u: any) => <Chip key={u.user_id} color="bg-white">{u.name}</Chip>)}
                                            </div>
                                        </div>
                                    )}
                                    {group.filter((u: any) => d.review.disliked_users?.includes(u.user_id)).length > 0 && (
                                        <div className="mt-4">
                                            <p className="text-xs font-black uppercase text-black mb-2 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#fb7185]"></span> Pass</p>
                                            <div className="flex flex-wrap gap-2">
                                                {group.filter((u: any) => d.review.disliked_users?.includes(u.user_id)).map((u: any) => <Chip key={u.user_id} color="bg-gray-200" text="text-gray-500">{u.name}</Chip>)}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                        </div>
                    </div>
                )}

                {/* OPEN POOL: tags + description */}
                {!isUpcoming && (
                    <>
                        {ev.pool_tags?.length > 0 && (
                            <div className="relative pt-3 mb-7">
                                <div className="absolute -top-1 left-5 z-10 bg-[#e11d48] text-white font-black uppercase text-xs px-4 py-2 rounded-full border-[3px] border-white shadow-[4px_4px_0_#000] -rotate-2">🔥 In the pool</div>
                                <div className="bg-white border-[4px] border-black rounded-[2.5rem] p-5 pt-9 shadow-[8px_8px_0_#000]">
                                    <div className="flex flex-wrap gap-2">
                                        {ev.pool_tags.map((t: string, i: number) => <Chip key={t} color={CHIP_COLORS[i % CHIP_COLORS.length]}>{t}</Chip>)}
                                    </div>
                                </div>
                            </div>
                        )}
                        {ev.description && <p className="text-sm font-bold text-gray-700 leading-relaxed px-1">{ev.description}</p>}
                    </>
                )}
            </div>

            {/* Actions — glass bar */}
            {h >= 0 ? (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-lg px-5 z-30">
                    <div className="bg-white/55 backdrop-blur-xl border-[3px] border-black rounded-[2.25rem] p-3 shadow-[8px_8px_0_#000] space-y-2.5">
                        {!isUpcoming ? (
                            <button onClick={join} className="w-full bg-[#e11d48] text-white py-4 rounded-full font-black uppercase text-base border-[3px] border-black shadow-[4px_4px_0_#000] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2">
                                Join the pool <ArrowRight size={18} strokeWidth={3} />
                            </button>
                        ) : (
                            <>
                                {!d.is_confirmed && (
                                    <button onClick={() => router.push(`/feed/events/confirm/${eventId}`)} className="w-full bg-[#4ade80] text-black py-4 rounded-full font-black uppercase text-sm border-[3px] border-black shadow-[4px_4px_0_#000] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2">
                                        <CheckCircle2 size={20} strokeWidth={2.5} /> Confirm attendance
                                    </button>
                                )}
                                <button onClick={cancel} disabled={acting} className="w-full bg-white/80 text-gray-500 py-3 rounded-full font-black uppercase text-xs border-[3px] border-gray-300 hover:border-[#e11d48] hover:text-[#e11d48] transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                                    {acting ? <Loader2 className="animate-spin" size={16} /> : <><XCircle size={16} /> Cancel RSVP</>}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            ) : (
                !d.review && (
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-lg px-5 z-30">
                        <div className="bg-white/55 backdrop-blur-xl border-[3px] border-black rounded-[2.25rem] p-3 shadow-[8px_8px_0_#000] space-y-2.5">
                            <button onClick={() => router.push(`/feedback/${eventId}`)} className="w-full bg-[#e11d48] text-white py-4 rounded-full font-black uppercase text-base border-[3px] border-black shadow-[4px_4px_0_#000] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2">
                                Leave feedback <ArrowRight size={18} strokeWidth={3} />
                            </button>
                        </div>
                    </div>
                )
            )}
        </div>
    );
}
