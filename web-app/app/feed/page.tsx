"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

// The feed is now route-based (events / connections / profile) with a shared
// bottom nav in layout.tsx. /feed just lands on the events tab.
export default function FeedPage() {
    const router = useRouter();
    useEffect(() => { router.replace('/feed/events'); }, [router]);
    return (
        <div className="min-h-[100dvh] flex items-center justify-center">
            <Loader2 className="animate-spin text-[#e11d48]" size={40} />
        </div>
    );
}
