"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Loader2, Calendar, Users, Sparkles } from 'lucide-react';
import { API_URL, getUserId } from '../../lib/api';

const KIND_ICON: Record<string, any> = { event: Calendar, match: Users, system: Sparkles, info: Bell };
const KIND_COLOR: Record<string, string> = { event: '#fde047', match: '#38bdf8', system: '#34d399', info: '#e11d48' };

export default function NotificationsPage() {
    const router = useRouter();
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const uid = getUserId();
        if (!uid) { router.push('/registration?mode=login'); return; }
        (async () => {
            try {
                const res = await fetch(`${API_URL}/users/${uid}/notifications`);
                if (res.ok) setItems((await res.json()).notifications || []);
                await fetch(`${API_URL}/users/${uid}/notifications/read-all`, { method: 'PATCH' });
            } catch { /* ignore */ }
            finally { setLoading(false); }
        })();
    }, [router]);

    const timeAgo = (iso: string) => {
        if (!iso) return '';
        const diff = (Date.now() - new Date(iso).getTime()) / 1000;
        if (diff < 60) return 'just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
    };

    return (
        <div className="min-h-screen pb-28 px-5 pt-12 space-y-5 relative z-10">
            <h2 className="text-4xl sm:text-5xl font-black uppercase tracking-tighter text-black drop-shadow-[2px_2px_0_#fff] flex items-center gap-3">
                Alerts <Bell size={32} strokeWidth={2.5} className="text-black" />
            </h2>

            <div className="space-y-4">
                {loading ? (
                    <div className="flex justify-center py-16"><Loader2 className="animate-spin text-[#e11d48]" size={32} /></div>
                ) : items.length === 0 ? (
                    <div className="text-center py-20 font-black text-black/50 uppercase text-sm bg-white/60 border-[3px] border-dashed border-black rounded-[2rem]">
                        <Bell size={36} className="mx-auto text-black/40 mb-3" />
                        No alerts yet
                    </div>
                ) : (
                    items.map(n => {
                        const Icon = KIND_ICON[n.kind] || Bell;
                        const color = KIND_COLOR[n.kind] || '#e11d48';
                        return (
                            <div key={n.id} className={`p-5 rounded-[2rem] border-[4px] border-black shadow-[6px_6px_0_#000] flex gap-4 items-start hover:-translate-y-0.5 transition-all ${n.is_read ? 'bg-white' : 'bg-[#fef9c3]'}`}>
                                <div className="w-11 h-11 rounded-full border-[3px] border-black flex items-center justify-center shrink-0 shadow-[2px_2px_0_#000]" style={{ background: color }}>
                                    <Icon size={20} className="text-black" strokeWidth={2.5} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-black uppercase text-sm text-black leading-snug">{n.text}</p>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-2">{timeAgo(n.created_at)}</p>
                                </div>
                                {!n.is_read && <span className="w-3 h-3 bg-[#e11d48] rounded-full border-[2px] border-black shrink-0 mt-1" />}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
