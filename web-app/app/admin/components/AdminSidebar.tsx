import React from 'react';
import { Activity, Calendar, LayoutDashboard, Utensils, Users, ShieldAlert, Bell, Ticket, Filter, LogOut } from 'lucide-react';

export const navItems = [
    { id: 'overview', name: 'Overview', icon: Activity },
    { id: 'funnel', name: 'Funnel', icon: Filter },
    { id: 'events', name: 'Events', icon: Calendar },
    { id: 'distribution', name: 'Seating', icon: LayoutDashboard },
    { id: 'restaurants', name: 'Restaurants', icon: Utensils },
    { id: 'users', name: 'Guests', icon: Users },
    { id: 'moderation', name: 'Reports', icon: ShieldAlert },
    { id: 'notifications', name: 'Notify', icon: Bell },
    { id: 'promo', name: 'Promo', icon: Ticket },
];

export const AdminSidebar = ({ activeTab, setActiveTab, onLogout }: { activeTab: string; setActiveTab: (t: string) => void; onLogout: () => void }) => (
    <div className="w-64 bg-white border-r-[4px] border-black flex-col hidden md:flex">
        <div className="p-7 border-b-[4px] border-black">
            <span className="text-3xl font-black tracking-tighter text-black">tablr<span className="text-[#e11d48]">.</span></span>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1">Admin Console</p>
        </div>
        <div className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
            {navItems.map(item => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-black uppercase text-xs tracking-wide border-[3px] transition-all ${active ? 'bg-[#111827] text-white border-black shadow-[4px_4px_0_#e11d48] -translate-y-0.5' : 'bg-white text-gray-500 border-transparent hover:border-black'}`}
                    >
                        <Icon size={18} strokeWidth={active ? 3 : 2} /> {item.name}
                    </button>
                );
            })}
        </div>
        <div className="p-4 border-t-[4px] border-black">
            <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-black uppercase text-xs border-[3px] border-black bg-white hover:bg-gray-100 shadow-[3px_3px_0_#000]">
                <LogOut size={16} /> Log out
            </button>
        </div>
    </div>
);
