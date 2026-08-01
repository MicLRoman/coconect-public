"use client";

import React, { useState, useEffect } from 'react';
import { Search, UserCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { API_URL } from '../lib/api';
import { Chip, CHIP_COLORS } from '../feed/components/popart';
import { Avatar } from './Avatar';

// Теги длиннее этого просто не показываем — длинные («SHARED SKILLS: SOFTWARE
// DEVELOPMENT, TENSORFLOW…», «INFORMATION TECHNOLOGY INFRASTRUCTURE») ломали вёрстку
// карточки (раздували её за край экрана) и перегружали её.
const MAX_TAG_LEN = 22;

interface ConnectionsViewProps {
    userId: string;
}

export function ConnectionsView({ userId }: ConnectionsViewProps) {
    const router = useRouter();
    const [confirmedMatches, setConfirmedMatches] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");

    const loadData = async () => {
        if (!userId) return;
        try {
            const matchesRes = await fetch(`${API_URL}/matches/confirmed?user_id=${userId}`);
            const matchesData = await matchesRes.json();
            setConfirmedMatches(matchesData.matches || []);
        } catch (err) {
            console.error("Failed to load connections:", err);
        }
    };

    useEffect(() => { loadData(); }, [userId]);

    const filteredConnections = confirmedMatches.filter(person =>
        person.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        person.hard_skills?.some((s: string) => s.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="space-y-6 w-full max-w-lg mx-auto relative z-10">
            <h2 className="text-4xl sm:text-5xl font-black uppercase tracking-tighter text-black drop-shadow-[2px_2px_0_#fff]">Network</h2>

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

            <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-black flex items-center gap-2">
                    <UserCheck size={16} strokeWidth={3} /> Confirmed Connections
                </h3>

                <div className="grid grid-cols-1 gap-5">
                    {filteredConnections.length > 0 ? filteredConnections.map(person => {
                        const subtitle = person.role || person.headline || person.current_status?.company_name || '';
                        const skills = (person.hard_skills || []).filter((s: string) => s && s.length <= MAX_TAG_LEN).slice(0, 3);
                        const whys = (person.why || []).filter((w: string) => w && w.length <= MAX_TAG_LEN).slice(0, 3);
                        return (
                            <div
                                key={person.user_id}
                                onClick={() => {
                                    const targetId = person.user_id || person.id;
                                    router.push(`/profile/${targetId}`);
                                }}
                                className="min-w-0 bg-white border-[4px] border-black rounded-[2.5rem] p-5 sm:p-6 shadow-[8px_8px_0_#000] hover:-translate-y-1 hover:shadow-[10px_10px_0_#000] transition-all cursor-pointer"
                            >
                                <div className="flex items-center gap-4 min-w-0">
                                    <Avatar
                                        src={person.avatar}
                                        name={person.name}
                                        textClass="text-xl sm:text-2xl"
                                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-[3px] border-black shrink-0 shadow-[4px_4px_0_#000]"
                                    />
                                    <div className="min-w-0">
                                        <h3 className="font-black uppercase text-xl sm:text-2xl leading-none tracking-tighter text-black truncate">{person.name}</h3>
                                        {subtitle && <p className="font-black text-[11px] sm:text-xs text-gray-600 uppercase mt-2 tracking-widest truncate">{subtitle}</p>}
                                    </div>
                                </div>
                                {skills.length > 0 && (
                                    <div className="mt-5 flex flex-wrap gap-2">
                                        {skills.map((s: string, i: number) => (
                                            <Chip key={s} color={CHIP_COLORS[i % CHIP_COLORS.length]}>{s}</Chip>
                                        ))}
                                    </div>
                                )}
                                {whys.length > 0 && (
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {whys.map((w: string, i: number) => (
                                            <span key={i} className="whitespace-nowrap text-[10px] font-black uppercase tracking-wide bg-[#fde047] border-2 border-black rounded-full px-2.5 py-1">{w}</span>
                                        ))}
                                    </div>
                                )}
                                {person.icebreaker && (
                                    <div className="mt-4 bg-[#fafafa] border-2 border-black rounded-xl px-3 py-2 text-sm font-medium text-gray-800">
                                        💬 {person.icebreaker}
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
