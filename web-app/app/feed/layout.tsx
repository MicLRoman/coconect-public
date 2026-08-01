"use client";

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { API_URL, getUserId } from '../lib/api';
import { FeedGradient, NavHome, NavNetwork, NavAlerts, NavProfile } from './components/popart';

export default function FeedLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [unread, setUnread] = useState(0);

    const active = pathname.includes('/feed/connections') ? 'connections'
        : pathname.includes('/feed/profile') ? 'profile'
            : 'events';

    // Footer shows only on the main tab screens + the event detail page.
    // Flows/forms (penalty, profile edit, join/confirm steps) get NO footer.
    const hideFooter =
        pathname.startsWith('/feed/icebreakers') ||
        pathname.startsWith('/feed/penalty') ||
        pathname.startsWith('/feed/profile/edit') ||
        // any event sub-page (detail / join / confirm) — keep footer only on the list
        pathname.startsWith('/feed/events/');

    // Refresh the unread badge whenever the route changes.
    useEffect(() => {
        const uid = getUserId();
        if (!uid) return;
        fetch(`${API_URL}/users/${uid}/notifications/unread-count`)
            .then(r => r.ok ? r.json() : { count: 0 })
            .then(d => setUnread(d.count || 0))
            .catch(() => {});
    }, [pathname]);

    const tabs = [
        { key: 'events', href: '/feed/events', icon: NavHome, bg: 'bg-[#fde047]', color: 'text-black' },
        { key: 'connections', href: '/feed/connections', icon: NavNetwork, bg: 'bg-[#111827]', color: 'text-white' },
        { key: 'profile', href: '/feed/profile', icon: NavProfile, bg: 'bg-white', color: 'text-black' },
    ];

    return (
        <div className="w-full max-w-lg mx-auto bg-[#fafafa] min-h-[100dvh] relative shadow-2xl overflow-hidden font-sans">
            <style>{`
                .hide-scrollbar::-webkit-scrollbar { display: none; }
                .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>

            {/* Animated gradient — persists across tabs, shifts per route */}
            <FeedGradient tab={active} />

            <div className="relative z-10 h-full">{children}</div>

            {!hideFooter && (
            <div className="fixed bottom-6 left-6 right-6 z-50 pointer-events-none">
                <div className="max-w-md mx-auto bg-white/80 backdrop-blur-md border-[4px] border-black rounded-[2.5rem] p-2 flex justify-between items-center shadow-[8px_8px_0_#000] pointer-events-auto">
                    {tabs.map(t => {
                        const Icon = t.icon;
                        const isActive = active === t.key;
                        return (
                            <button
                                key={t.key}
                                onClick={() => router.push(t.href)}
                                className={`relative flex items-center justify-center w-[30%] h-14 rounded-[2rem] transition-all ${isActive ? `${t.bg} border-[3px] border-black` : 'hover:bg-gray-100'}`}
                            >
                                <div className="relative">
                                    <Icon active={isActive} className={`w-7 h-7 ${isActive ? t.color : 'text-gray-500'}`} />
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
            )}
        </div>
    );
}
