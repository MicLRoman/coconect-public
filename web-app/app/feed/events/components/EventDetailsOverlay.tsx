"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, MapPin, Flame, ArrowRight, XCircle, Users, Lock, CheckCircle2, Loader2 } from 'lucide-react';
import { RoleBadge } from '../../data';
import { getHoursLeft, formatTimeLeft } from '../../../utils/time';
import { API_URL, getUserId } from '../../../lib/api';

export const EventDetailsOverlay = ({ event, onClose, onCancelRSVP, onJoin }: any) => {
    const router = useRouter();
    const isUpcoming = event?.isRSVPed;
    const hoursLeft = getHoursLeft(event?.date, event?.time);

    const [details, setDetails] = useState<any>(null);
    const [loadingDetails, setLoadingDetails] = useState(isUpcoming);

    useEffect(() => {
        if (!isUpcoming) return;
        (async () => {
            try {
                const res = await fetch(`${API_URL}/events/${event.id}/details?user_id=${getUserId()}`);
                if (res.ok) setDetails(await res.json());
            } catch (e) { console.error(e); }
            finally { setLoadingDetails(false); }
        })();
    }, [event?.id, isUpcoming]);

    if (!event) return null;

    const group = details?.group || [];
    const locationRevealed = details?.location_revealed;
    const groupRevealed = details?.group_revealed;

    return (
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-[100dvh] bg-[#fafafa] z-[100] overflow-y-auto hide-scrollbar flex flex-col">
            <div className="sticky top-0 z-20 bg-[#fafafa]/95 backdrop-blur-md px-4 sm:px-6 pt-10 sm:pt-12 pb-3 sm:pb-4 flex items-center gap-3 sm:gap-4 border-b-[3px] border-black shadow-[0_4px_0_#111827]">
                <button onClick={onClose} className="w-9 h-9 sm:w-10 sm:h-10 bg-white border-2 sm:border-[3px] border-black rounded-full flex items-center justify-center hover:bg-gray-200 shadow-[2px_2px_0_#000]">
                    <ChevronLeft size={18} strokeWidth={3} />
                </button>
                <h2 className="font-black uppercase text-lg sm:text-xl">{isUpcoming ? "Your Pool" : "Pool Details"}</h2>
            </div>

            <div className="p-4 sm:p-6 flex-1 flex flex-col animate-in fade-in duration-300">
                <h1 className="text-2xl sm:text-4xl font-black uppercase tracking-tighter text-[#111827] leading-none mb-3 sm:mb-4">{event.title}</h1>

                <div className="flex flex-wrap gap-2 mb-6">
                    <span className="bg-[#fde047] border-[2px] border-black font-black uppercase text-[10px] px-3 py-1.5 shadow-[2px_2px_0_#000]">{event.date}</span>
                    <span className="bg-white border-[2px] border-black font-black uppercase text-[10px] px-3 py-1.5 shadow-[2px_2px_0_#000]">{event.time}</span>
                    {event.city && <span className="bg-white border-[2px] border-black font-black uppercase text-[10px] px-3 py-1.5 shadow-[2px_2px_0_#000]">{event.city}</span>}
                </div>

                {isUpcoming && loadingDetails && (
                    <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-[#e11d48]" size={28} /></div>
                )}

                {/* LOCATION — revealed < 12h */}
                {isUpcoming && !loadingDetails && (
                    locationRevealed ? (
                        <div className="bg-[#111827] text-white p-5 rounded-2xl border-[3px] border-black mb-6 shadow-[4px_4px_0_#fde047] relative overflow-hidden">
                            <div className="absolute top-0 right-0 bg-[#e11d48] text-white text-[9px] font-black uppercase px-2 py-1 border-b-[2px] border-l-[2px] border-black">{formatTimeLeft(hoursLeft)}</div>
                            <h4 className="font-black uppercase text-xs mb-3 text-gray-400">Location confirmed</h4>
                            <div className="flex items-start gap-3">
                                <MapPin size={20} className="text-[#e11d48] shrink-0 mt-1" />
                                <div>
                                    <h4 className="font-black uppercase text-lg leading-tight text-white">{details.location_name}</h4>
                                    <p className="text-xs font-bold text-gray-400">{details.location_address}</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white p-5 rounded-2xl border-[3px] border-black mb-6 shadow-[4px_4px_0_#000] flex items-center gap-3">
                            <Lock size={20} className="text-gray-400 shrink-0" />
                            <div>
                                <h4 className="font-black uppercase text-sm">Location locked</h4>
                                <p className="text-xs font-bold text-gray-500">Revealed 12h before — {formatTimeLeft(hoursLeft)}</p>
                            </div>
                        </div>
                    )
                )}

                {/* GROUP — revealed < 24h */}
                {isUpcoming && !loadingDetails && (
                    <div className="bg-white p-5 rounded-3xl border-[3px] border-black shadow-[4px_4px_0_#38bdf8] mb-6">
                        <h3 className="font-black uppercase text-sm mb-4 flex items-center gap-2 text-[#38bdf8]"><Users size={16} /> Your table</h3>
                        {groupRevealed && group.length > 0 ? (
                            <div className="flex flex-col gap-2">
                                {group.map((p: any, i: number) => (
                                    <div key={p.user_id || i} className="flex items-center gap-3 border-[2px] border-black rounded-xl px-3 py-2 bg-[#fafafa]">
                                        <div className="w-9 h-9 rounded-lg bg-[#111827] text-white border-2 border-black flex items-center justify-center font-black text-sm">{(p.name || p.role || p.headline || '?')[0]}</div>
                                        <div className="min-w-0">
                                            <div className="font-black uppercase text-sm truncate">{p.name || p.headline || p.role || 'Tablemate'}</div>
                                            <div className="text-[10px] font-bold uppercase text-gray-500 truncate">{(p.company ? p.company + ' · ' : '') + ((p.domains || [])[0] || (p.hard_skills || [])[0] || 'Member')}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Group reveals 24h before the dinner.</p>
                        )}
                    </div>
                )}

                {/* OPEN POOL — tags + join */}
                {!isUpcoming && event.poolTags?.length > 0 && (
                    <div className="mb-6 bg-white p-5 rounded-3xl border-[3px] border-black shadow-[4px_4px_0_#e11d48]">
                        <h3 className="font-black uppercase text-sm mb-4 flex items-center gap-2 text-[#e11d48]"><Flame size={16} /> In the pool for this day:</h3>
                        <div className="flex flex-wrap gap-2">
                            {event.poolTags.map((tag: string, idx: number) => {
                                const colors = ["text-[#e11d48]", "text-[#38bdf8]", "text-[#34d399]"];
                                return <RoleBadge key={idx} role={tag} color={colors[idx % colors.length]} />;
                            })}
                        </div>
                    </div>
                )}

                {event.desc && !isUpcoming && (
                    <p className="text-sm font-medium text-gray-700 mb-6 leading-relaxed">{event.desc}</p>
                )}

                {/* ACTIONS */}
                <div className="sticky bottom-4 sm:bottom-6 mt-auto pt-6 space-y-3 z-50">
                    {!isUpcoming ? (
                        <button onClick={onJoin} className="w-full bg-[#e11d48] text-white py-4 rounded-full font-black uppercase text-base border-[3px] border-black shadow-[4px_4px_0_#000] hover:-translate-y-1 transition-all flex items-center justify-center gap-2">
                            JOIN THE POOL <ArrowRight size={18} />
                        </button>
                    ) : (
                        <>
                            {!details?.is_confirmed && (
                                <button onClick={() => router.push(`/feed/events/confirm/${event.id}`)} className="w-full bg-[#34d399] text-black py-4 rounded-full font-black uppercase text-sm border-[3px] border-black shadow-[4px_4px_0_#000] hover:-translate-y-1 transition-all flex items-center justify-center gap-2">
                                    <CheckCircle2 size={18} /> Confirm attendance
                                </button>
                            )}
                            <button onClick={() => { if (hoursLeft < 24 && !confirm("Warning: canceling now incurs a penalty. Proceed?")) return; onCancelRSVP(); }} className="w-full bg-white text-gray-500 py-3.5 rounded-full font-black uppercase text-xs border-[3px] border-gray-300 hover:border-[#e11d48] hover:text-[#e11d48] transition-all flex items-center justify-center gap-2">
                                <XCircle size={16} /> Cancel RSVP
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
