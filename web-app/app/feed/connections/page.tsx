"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, UserCheck } from 'lucide-react';
import { PendingReview } from './components/PendingReview';
import { API_URL, getUserId } from '../../lib/api';
import { Chip, CHIP_COLORS } from '../components/popart';

export default function FeedConnections() {
    const router = useRouter();
    const [confirmedMatches, setConfirmedMatches] = useState<any[]>([]);
    const [pastEvents, setPastEvents] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    const userId = getUserId();

    const loadData = async () => {
        if (!userId) return;
        try {
            // 1. Загружаем ивенты (оттуда возьмем past_events)
            const feedRes = await fetch(`${API_URL}/events/feed?user_id=${userId}`);
            const feedData = await feedRes.json();
            setPastEvents(feedData.past_events || []);

            // 2. Загружаем только подтвержденных (Matches)
            const matchesRes = await fetch(`${API_URL}/matches/confirmed?user_id=${userId}`);
            const matchesData = await matchesRes.json();
            setConfirmedMatches(matchesData.matches || []);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { loadData(); }, [userId]);

    // ЛОКАЛЬНЫЙ ПОИСК ТОЛЬКО ПО СВОИМ КОНТАКТАМ
    const filteredConnections = confirmedMatches.filter(person =>
        person.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        person.hard_skills?.some((s: string) => s.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="min-h-screen pb-28 px-5 pt-12 space-y-6 relative z-10">
            <h2 className="text-4xl sm:text-5xl font-black uppercase tracking-tighter text-black drop-shadow-[2px_2px_0_#fff]">Network</h2>

            {/* 1. ОТЗЫВЫ О ПРОШЕДШИХ ВСТРЕЧАХ */}
            {pastEvents.length > 0 && (
                <PendingReview
                    events={pastEvents}
                    onFeedback={async (tId: string, eId: string, status: string) => {
                        await fetch(`${API_URL}/matches/feedback`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ user_id: userId, target_id: tId, event_id: eId, status })
                        });
                        loadData(); // Обновляем списки
                    }}
                />
            )}

            {/* 2. ПОИСК ВНУТРИ ПОДТВЕРЖДЕННЫХ */}
            <div className="relative">
                <input
                    type="text"
                    placeholder="Search your connections..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white border-[4px] border-black p-4 pl-12 rounded-[1.5rem] font-black uppercase text-sm shadow-[6px_6px_0_#000] focus:translate-x-1 focus:translate-y-1 focus:shadow-[2px_2px_0_#000] transition-all outline-none"
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-black" size={20} strokeWidth={3} />
            </div>

            {/* 3. СПИСОК КОНТАКТОВ */}
            <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-black flex items-center gap-2">
                    <UserCheck size={16} strokeWidth={3} /> Confirmed Connections
                </h3>

                <div className="grid gap-5">
                    {filteredConnections.length > 0 ? filteredConnections.map(person => {
                        const subtitle = person.role || person.headline || person.current_status?.company_name || '';
                        return (
                            <div
                                key={person.user_id}
                                onClick={() => {
                                    const targetId = person.user_id || person.id;
                                    router.push(`/profile/${targetId}`);
                                }}
                                className="bg-white border-[4px] border-black rounded-[2.5rem] p-5 sm:p-6 shadow-[8px_8px_0_#000] hover:-translate-y-1 hover:shadow-[10px_10px_0_#000] transition-all cursor-pointer"
                            >
                                <div className="flex items-center gap-4">
                                    <img src={person.avatar || `https://i.pravatar.cc/100?u=${person.user_id}`} className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-[3px] border-black object-cover bg-gray-200 shrink-0 shadow-[4px_4px_0_#000]" />
                                    <div className="min-w-0">
                                        <h3 className="font-black uppercase text-xl sm:text-2xl leading-none tracking-tighter text-black truncate">{person.name}</h3>
                                        {subtitle && <p className="font-black text-[11px] sm:text-xs text-gray-600 uppercase mt-2 tracking-widest truncate">{subtitle}</p>}
                                    </div>
                                </div>
                                {person.hard_skills?.length > 0 && (
                                    <div className="mt-5 flex flex-wrap gap-2">
                                        {person.hard_skills.slice(0, 3).map((s: string, i: number) => (
                                            <Chip key={s} color={CHIP_COLORS[i % CHIP_COLORS.length]}>{s}</Chip>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    }) : (
                        <div className="text-center py-10 font-black uppercase text-sm text-black/50 bg-white/60 border-[3px] border-dashed border-black rounded-[2rem]">
                            {searchQuery ? "No matches in your network" : "No connections yet. Go to events!"}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}