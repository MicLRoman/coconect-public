"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { NotificationsHeader } from './components/NotificationsHeader';
import { Upcoming } from './components/Upcoming';
import { OpenTables } from './components/OpenTables';
import { Loader2, Star, ArrowRight, AlertTriangle } from 'lucide-react';
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

    if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-[#fafafa]"><Loader2 className="animate-spin text-[#e11d48]" size={40} /></div>;

    const tierValue = { "Starter": 1, "Core Membership": 2, "Premium": 3 };
    const userTierVal = tierValue[userTier as keyof typeof tierValue] || 1;

    return (
        <div className="flex flex-col min-h-screen bg-[#fafafa] pb-28 relative overflow-hidden">
            <NotificationsHeader
                city={viewCity || 'Your city'} cities={CITIES} onChangeCity={changeCity} subtitle="Build your circle"
                tier={userTier} eventsRemaining={Math.max(0, quota - used)} eventsQuota={quota}
            />

            <div className="px-6 pt-6 space-y-8">
                {/* Penalty banner */}
                {hasPenalty && (
                    <button onClick={() => router.push('/feed/penalty')} className="w-full text-left bg-[#e11d48] text-white p-5 rounded-3xl border-[4px] border-black shadow-[6px_6px_0_#111827] hover:-translate-y-1 transition-all flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <AlertTriangle size={26} className="shrink-0" />
                            <div><h3 className="font-black uppercase text-base leading-none">Penalty due</h3><p className="text-xs font-bold text-white/80 mt-1">You can't join dinners until it's settled.</p></div>
                        </div>
                        <ArrowRight size={22} className="shrink-0" />
                    </button>
                )}

                {/* PAST — rate your last dinner */}
                {pastEvents.map(ev => (
                    <button key={ev.id} onClick={() => router.push(`/feedback/${ev.id}`)} className="w-full text-left bg-[#111827] text-white p-5 rounded-3xl border-[4px] border-black shadow-[6px_6px_0_#fde047] hover:-translate-y-1 transition-all flex items-center justify-between">
                        <div>
                            <span className="bg-[#fde047] text-black border-2 border-black font-black uppercase text-[9px] px-2 py-1 inline-flex items-center gap-1 mb-2"><Star size={10} /> Rate the night</span>
                            <h3 className="font-black uppercase text-lg leading-none">{ev.title}</h3>
                            <p className="text-xs font-bold text-gray-400 mt-1">{ev.date} · keep the people you vibed with</p>
                        </div>
                        <ArrowRight size={22} className="text-[#fde047] shrink-0" />
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
                    <div className="text-center py-10 font-bold text-gray-400 border-[3px] border-dashed border-gray-300 rounded-3xl">No open pools in {viewCity || 'this city'}.</div>
                )}
            </div>
        </div>
    );
}
