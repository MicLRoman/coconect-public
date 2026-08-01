"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { API_URL, getUserId } from '../../lib/api';
import { ProfileView } from '../../components/ProfileView';



export default function FeedProfile() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [notLoggedIn, setNotLoggedIn] = useState(false);

    useEffect(() => {
        const fetchUser = async () => {
            const realUserId = getUserId();
            if (!realUserId) { setNotLoggedIn(true); setIsLoading(false); return; }
            try {
                const res = await fetch(`${API_URL}/users/${realUserId}`);
                const data = await res.json();
                if (data.status === 'success') setUser(data.user);
            } catch (err) {
                console.error("Failed to fetch user:", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchUser();
    }, []);

    const logout = () => {
        localStorage.removeItem('coconect_user_id');
        router.push('/');
    };

    const edit = () => router.push('/feed/profile/edit');

    if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-[#e11d48]" size={40} /></div>;

    if (notLoggedIn || !user) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center px-8 text-center gap-6">
                <h2 className="text-2xl font-black uppercase tracking-tighter">You're not logged in</h2>
                <button onClick={() => router.push('/registration?mode=login')} className="bg-[#e11d48] text-white px-8 py-4 rounded-full font-black uppercase text-sm border-[3px] border-black shadow-[6px_6px_0_#111827] hover:-translate-y-1 transition-all">Log in</button>
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-28 px-5 pt-12 relative z-10 flex flex-col items-center">
            <ProfileView 
                user={user} 
                onEdit={edit} 
                onLogout={logout} 
                onManagePlan={() => router.push('/checkout')} 
            />
        </div>
    );
}
