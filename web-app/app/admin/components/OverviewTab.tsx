import React from 'react';
import { Users, Crown, Calendar, Ticket, Link2, ShieldAlert } from 'lucide-react';

const Stat = ({ label, value, icon: Icon, shadow }: any) => (
    <div className={`bg-white p-6 rounded-[2rem] border-[4px] border-black ${shadow}`}>
        <div className="flex justify-between items-start mb-3">
            <h3 className="font-black uppercase text-xs text-gray-500 tracking-widest">{label}</h3>
            <Icon size={22} className="text-black" />
        </div>
        <p className="text-5xl font-black text-[#111827]">{value ?? 0}</p>
    </div>
);

export const OverviewTab = ({ stats, events, setActiveTab }: any) => (
    <div className="animate-in fade-in duration-300">
        <h1 className="text-4xl font-black uppercase tracking-tighter mb-1">Overview</h1>
        <p className="font-bold text-gray-500 uppercase text-xs tracking-widest mb-8">System at a glance</p>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
            <Stat label="Total Users" value={stats.totalUsers} icon={Users} shadow="shadow-[6px_6px_0_#38bdf8]" />
            <Stat label="Premium" value={stats.premiumMembers} icon={Crown} shadow="shadow-[6px_6px_0_#fde047]" />
            <Stat label="Subscribers" value={stats.activeSubscribers} icon={Ticket} shadow="shadow-[6px_6px_0_#e11d48]" />
            <Stat label="Events" value={stats.totalEvents} icon={Calendar} shadow="shadow-[6px_6px_0_#111827]" />
            <Stat label="Connections" value={stats.totalConnections} icon={Link2} shadow="shadow-[6px_6px_0_#34d399]" />
            <Stat label="Open Reports" value={stats.openModeration} icon={ShieldAlert} shadow="shadow-[6px_6px_0_#e11d48]" />
        </div>

        <div className="bg-white rounded-[2rem] border-[4px] border-black shadow-[8px_8px_0_#111827] overflow-hidden">
            <div className="p-5 border-b-[4px] border-black bg-gray-50 flex justify-between items-center">
                <h2 className="font-black uppercase">Upcoming events</h2>
                <button onClick={() => setActiveTab('events')} className="font-black uppercase text-xs text-[#e11d48] hover:underline">Manage →</button>
            </div>
            <div className="divide-y-2 divide-gray-100">
                {(events || []).slice(0, 6).map((ev: any) => (
                    <div key={ev.id} className="p-4 flex items-center justify-between">
                        <div>
                            <div className="font-black uppercase text-sm">{ev.title}</div>
                            <div className="text-[11px] font-bold text-gray-400 uppercase">{ev.event_date} · {ev.city || '—'} · {ev.rsvp_count || 0} RSVPs</div>
                        </div>
                        <span className={`px-3 py-1 text-[10px] font-black uppercase border-2 border-black rounded-lg ${ev.status === 'open' ? 'bg-[#34d399]' : 'bg-gray-200'}`}>{ev.status}</span>
                    </div>
                ))}
                {(!events || events.length === 0) && <div className="p-8 text-center font-bold text-gray-400 uppercase text-sm">No events yet</div>}
            </div>
        </div>
    </div>
);
