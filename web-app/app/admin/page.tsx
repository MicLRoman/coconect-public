"use client";

import React, { useState, useEffect } from 'react';
import { Shield, ArrowRight, Loader2 } from 'lucide-react';
import { API_URL } from '../lib/api';
import { adminFetch, getAdminToken, setAdminToken, clearAdminToken } from './utils/adminFetch';
import { AdminSidebar, navItems } from './components/AdminSidebar';
import { OverviewTab } from './components/OverviewTab';
import { FunnelTab } from './components/FunnelTab';
import { EventsTab } from './components/EventsTab';
import { DistributionTab } from './components/DistributionTab';
import { RestaurantsTab } from './components/RestaurantsTab';
import { UsersTab } from './components/UsersTab';
import { ModerationTab } from './components/ModerationTab';
import { NotificationsTab } from './components/NotificationsTab';
import { PromoCodesTab } from './components/PromoCodesTab';

export default function AdminPage() {
    const [authed, setAuthed] = useState(false);
    const [checking, setChecking] = useState(true);
    const [login, setLogin] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const [activeTab, setActiveTab] = useState('overview');
    const [events, setEvents] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [restaurants, setRestaurants] = useState<any[]>([]);
    const [promoCodes, setPromoCodes] = useState<any[]>([]);
    const [stats, setStats] = useState<any>({});

    useEffect(() => { setAuthed(!!getAdminToken()); setChecking(false); }, []);

    const refreshEvents = async () => { const r = await adminFetch('/admin/events'); const d = await r.json(); if (d.status === 'success') setEvents(d.events || []); };
    const refreshUsers = async () => { const r = await adminFetch('/admin/users'); const d = await r.json(); if (d.status === 'success') setUsers(d.users || []); };
    const refreshRestaurants = async () => { const r = await adminFetch('/admin/restaurants'); const d = await r.json(); if (d.status === 'success') setRestaurants(d.restaurants || []); };
    const refreshStats = async () => { const r = await adminFetch('/admin/stats'); const d = await r.json(); if (d.status === 'success') setStats(d.stats || {}); };
    const refreshPromoCodes = async () => { const r = await adminFetch('/admin/promo-codes'); const d = await r.json(); if (d.status === 'success') setPromoCodes(d.promo_codes || []); };

    useEffect(() => {
        if (!authed) return;
        refreshEvents(); refreshUsers(); refreshRestaurants(); refreshStats(); refreshPromoCodes();
    }, [authed]);

    const doLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            const res = await fetch(`${API_URL}/admin/login`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ login, password }),
            });
            const data = await res.json();
            if (res.ok && data.token) { setAdminToken(data.token); setAuthed(true); }
            else setError(data.detail || 'Invalid credentials');
        } catch { setError('Connection error'); }
    };

    const logout = () => { clearAdminToken(); setAuthed(false); };

    if (checking) return <div className="min-h-screen flex items-center justify-center bg-[#fafafa]"><Loader2 className="animate-spin text-[#e11d48]" size={40} /></div>;

    if (!authed) {
        return (
            <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-6 selection:bg-[#e11d48] selection:text-white">
                <form onSubmit={doLogin} className="w-full max-w-md">
                    <div className="inline-flex items-center gap-2 bg-black text-white px-4 py-2 rounded-full font-bold text-xs uppercase tracking-widest mb-6 shadow-[3px_3px_0_#fde047]">
                        <Shield size={14} className="text-[#fde047]" /> Admin Console
                    </div>
                    <h1 className="text-5xl font-black tracking-tighter uppercase mb-8 text-[#111827] leading-[0.9]">Tablr<br /><span className="text-[#e11d48]">Admin.</span></h1>
                    {error && <div className="bg-red-100 border-2 border-red-500 text-red-700 p-4 rounded-xl font-bold mb-6">{error}</div>}
                    <div className="bg-white border-[4px] border-black p-8 rounded-[2rem] shadow-[12px_12px_0_#111827] space-y-5">
                        <div>
                            <label className="font-black uppercase text-sm block mb-2">Login</label>
                            <input value={login} onChange={e => setLogin(e.target.value)} required placeholder="admin" className="w-full bg-[#fafafa] border-[3px] border-black rounded-xl px-5 py-4 font-bold text-lg outline-none focus:border-[#e11d48] shadow-[4px_4px_0_#000]" />
                        </div>
                        <div>
                            <label className="font-black uppercase text-sm block mb-2">Password</label>
                            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" className="w-full bg-[#fafafa] border-[3px] border-black rounded-xl px-5 py-4 font-bold text-lg outline-none focus:border-[#e11d48] shadow-[4px_4px_0_#000]" />
                        </div>
                        <button type="submit" className="w-full py-5 bg-[#e11d48] text-white font-black uppercase text-xl rounded-2xl border-[4px] border-black shadow-[8px_8px_0_#111827] hover:-translate-y-1 transition-all flex items-center justify-between px-8">
                            Enter <ArrowRight size={24} />
                        </button>
                    </div>
                </form>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#fafafa] text-[#111827] flex selection:bg-[#e11d48] selection:text-white">
            <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={logout} />
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                {/* Mobile nav */}
                <div className="md:hidden p-3 bg-white border-b-[3px] border-black flex gap-2 overflow-x-auto sticky top-0 z-20">
                    {navItems.map(item => (
                        <button key={item.id} onClick={() => setActiveTab(item.id)} className={`px-4 py-2 rounded-full font-black uppercase text-xs whitespace-nowrap border-2 border-black ${activeTab === item.id ? 'bg-[#111827] text-white' : 'bg-white text-gray-500'}`}>{item.name}</button>
                    ))}
                </div>
                <div className="flex-1 overflow-y-auto p-6 md:p-10 w-full max-w-6xl mx-auto">
                    {activeTab === 'overview' && <OverviewTab stats={stats} events={events} setActiveTab={setActiveTab} />}
                    {activeTab === 'funnel' && <FunnelTab />}
                    {activeTab === 'events' && <EventsTab events={events} refresh={() => { refreshEvents(); refreshStats(); }} />}
                    {activeTab === 'distribution' && <DistributionTab events={events} restaurants={restaurants} />}
                    {activeTab === 'restaurants' && <RestaurantsTab restaurants={restaurants} refresh={refreshRestaurants} />}
                    {activeTab === 'users' && <UsersTab users={users} refresh={() => { refreshUsers(); refreshStats(); }} />}
                    {activeTab === 'moderation' && <ModerationTab />}
                    {activeTab === 'notifications' && <NotificationsTab />}
                    {activeTab === 'promo' && <PromoCodesTab promoCodes={promoCodes} refresh={refreshPromoCodes} />}
                </div>
            </div>
        </div>
    );
}
