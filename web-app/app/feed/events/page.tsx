"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { NotificationsHeader } from './components/NotificationsHeader';
import { Upcoming } from './components/Upcoming';
import { OpenTables } from './components/OpenTables';
import { Loader2, ArrowRight } from 'lucide-react';
import { API_URL, getUserId } from '../../lib/api';
import { CITIES } from '../../constants/cities';

export default function FeedEvents() {
    const router = useRouter();
    const [viewCity, setViewCity] = useState<string>('');
    const [userTier, setUserTier] = useState("Starter");
    const [quota, setQuota] = useState(1);
    const [used, setUsed] = useState(0);
    const [hasPenalty, setHasPenalty] = useState(false);
    const [openEvents, setOpenEvents] = useState<any[]>([]);
    const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
    const [pastEvents, setPastEvents] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const formatEvent = (ev: any) => ({
        id: ev.id, title: ev.title, date: ev.event_date, time: ev.start_time, city: ev.city,
        requiredTier: ev.required_tier, poolTags: ev.pool_tags || [],
        desc: ev.description, restaurant: ev.restaurant_name, address: ev.address,
        isRSVPed: ev.is_rsvped || false,
    });

    const fetchEvents = async () => {
        const userId = getUserId();
        if (!userId) return setIsLoading(false);
        try {
            const res = await fetch(`${API_URL}/events/feed?user_id=${userId}`);
            if (res.ok) {
                const data = await res.json();
                setViewCity(data.city);
                setUserTier(data.tier);
                setQuota(data.events_quota ?? 1);
                setUsed(data.events_used ?? 0);
                setHasPenalty(!!data.has_penalty);
                setOpenEvents((data.open_events || []).map(formatEvent));
                setUpcomingEvents((data.upcoming_events || []).map(formatEvent));
                setPastEvents((data.past_events || []).map(formatEvent));
            }
        } catch (err) { console.error(err); }
        finally { setIsLoading(false); }
    };

    useEffect(() => { fetchEvents(); }, []);

    // Changing the city in the header updates the user's home city in the DB.
    const changeCity = async (city: string) => {
        if (!city || city === viewCity) return;
        setViewCity(city);
        setIsLoading(true);
        try {
            await fetch(`${API_URL}/users/${getUserId()}`, {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ city }),
            });
        } catch { /* ignore */ }
        fetchEvents();
    };

    const open = (id: string) => router.push(`/feed/events/${id}`);

    if (isLoading) return <div className="min-h-screen flex items-center justify-center relative z-10"><Loader2 className="animate-spin text-[#e11d48]" size={40} /></div>;

    const tierValue = { "Starter": 1, "Core Membership": 2, "Premium": 3 };
    const userTierVal = tierValue[userTier as keyof typeof tierValue] || 1;

    return (
        <div className="flex flex-col min-h-screen pb-32 relative z-10">
            <NotificationsHeader
                city={viewCity || 'Your city'} cities={CITIES} onChangeCity={changeCity} subtitle="Build your circle"
                tier={userTier} eventsRemaining={Math.max(0, quota - used)} eventsQuota={quota}
            />

            <div className="px-5 pt-5 space-y-7">
                {/* Penalty banner — dark */}
                {hasPenalty && (
                    <button onClick={() => router.push('/feed/penalty')} className="w-full text-left bg-[#111827] p-5 sm:p-6 rounded-[2.5rem] border-[4px] border-black shadow-[8px_8px_0_#000] cursor-pointer rotate-[-1deg] animate-pop-float group flex items-center gap-5">
                        <div className="flex-1">
                            <h3 className="font-black uppercase text-2xl leading-none mb-1 text-white tracking-tighter">Penalty due</h3>
                            <p className="text-[11px] font-black text-[#fb7185] uppercase tracking-widest leading-snug">Settle to keep joining dinners</p>
                        </div>
                        <ArrowRight size={28} className="text-white shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" />
                    </button>
                )}

                {/* Icebreakers — "Cheat Sheet" banner with typing dots */}
                <div onClick={() => router.push('/feed/icebreakers')} className="w-full bg-[#fde047] p-5 sm:p-6 rounded-[2.5rem] border-[4px] border-black shadow-[8px_8px_0_#000] cursor-pointer rotate-[1deg] animate-pop-float group">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 bg-white border-[3px] border-black rounded-[2rem] px-5 py-3 sm:py-4 shadow-[4px_4px_0_#000] -rotate-2">
                            <h3 className="font-black uppercase text-xl sm:text-2xl leading-none mb-1 text-black tracking-tighter">Cheat Sheet</h3>
                            <p className="text-[10px] sm:text-[11px] font-black text-gray-600 uppercase tracking-widest leading-snug">Not sure how to start?</p>
                        </div>
                        <div className="bg-[#fde047] border-[3px] sm:border-[4px] border-black rounded-2xl rounded-bl-none px-4 py-3 sm:py-4 shadow-[4px_4px_0_#000] rotate-6 shrink-0 relative animate-fly flex items-center justify-center min-w-[60px] sm:min-w-[70px]">
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-black rounded-full typing-dot" />
                                <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-black rounded-full typing-dot" />
                                <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-black rounded-full typing-dot" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* PAST — rate your last dinner */}
                {pastEvents.map(ev => (
                    <button key={ev.id} onClick={() => router.push(`/feedback/${ev.id}`)} className="w-full text-left bg-[#e11d48] p-5 sm:p-6 rounded-[2.5rem] border-[4px] border-black shadow-[8px_8px_0_#000] cursor-pointer rotate-[-1deg] animate-pop-float group flex items-center gap-5">
                        <div className="flex-1 min-w-0">
                            <h3 className="font-black uppercase text-2xl leading-none mb-1 text-white drop-shadow-[2px_2px_0_#000] tracking-tighter">Rate the night</h3>
                            <p className="text-[11px] font-black text-[#fde047] uppercase tracking-widest leading-snug drop-shadow-[1px_1px_0_#000] truncate">{ev.title} · keep your matches</p>
                        </div>
                        <ArrowRight size={28} className="text-white shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" />
                    </button>
                ))}

                {/* UPCOMING */}
                {upcomingEvents.length > 0 && (
                    <div className="space-y-6">
                        {upcomingEvents.map(ev => <Upcoming key={ev.id} event={ev} onClick={() => open(ev.id)} />)}
                    </div>
                )}

                {/* OPEN POOLS */}
                {openEvents.length > 0 ? (
                    <OpenTables events={openEvents} userTierVal={userTierVal} onSelect={(ev: any) => open(ev.id)} />
                ) : (
                    <div className="text-center py-10 font-black uppercase text-sm text-black/50 bg-white/60 border-[3px] border-dashed border-black rounded-[2rem]">No open pools in {viewCity || 'this city'}.</div>
                )}
            </div>
        </div>
    );
}
