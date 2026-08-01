import React, { useState } from 'react';
import { Plus, Trash2, Loader2, X, Pencil, Utensils, CheckCircle2 } from 'lucide-react';
import { adminFetch } from '../utils/adminFetch';
import { CITIES } from '../../constants/cities';

// Ресторан цепляется отдельным окном; pool_tags авто-генерятся при матчинге.
const EMPTY = {
    title: '', city: 'Toronto, Canada', event_date: '', start_time: '19:00:00', type: 'dinner',
    required_tier: 'Starter', status: 'open',
};

export const EventsTab = ({ events, refresh }: { events: any[]; refresh: () => void }) => {
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<any>(EMPTY);
    const [saving, setSaving] = useState(false);

    const openCreate = () => { setEditingId(null); setForm(EMPTY); setShowForm(true); };
    const openEdit = (ev: any) => {
        setEditingId(ev.id);
        setForm({ ...EMPTY, ...ev });
        setShowForm(true);
    };

    const save = async () => {
        if (!form.title || !form.event_date) { alert('Title and date are required'); return; }
        setSaving(true);
        const body = JSON.stringify(form);
        if (editingId) {
            await adminFetch(`/admin/events/${editingId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body });
        } else {
            await adminFetch('/admin/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
        }
        setSaving(false); setShowForm(false); setForm(EMPTY); setEditingId(null); refresh();
    };

    const setStatus = async (id: string, status: string) => {
        await adminFetch(`/admin/events/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
        refresh();
    };

    const del = async (id: string) => {
        if (!confirm('Delete this event?')) return;
        await adminFetch(`/admin/events/${id}`, { method: 'DELETE' });
        refresh();
    };

    const stage = (ev: any) => ev.is_matched_final
        ? { label: 'Final · confirmed', cls: 'bg-[#34d399]' }
        : ev.is_matched_primary
            ? { label: 'Primary seated', cls: 'bg-[#38bdf8] text-white' }
            : { label: 'Open pool', cls: 'bg-gray-200 text-gray-600' };

    const field = "w-full bg-[#fafafa] border-[3px] border-black rounded-xl px-4 py-3 font-bold outline-none focus:border-[#e11d48]";

    return (
        <div className="animate-in fade-in duration-300">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-4xl font-black uppercase tracking-tighter mb-1">Events</h1>
                    <p className="font-bold text-gray-500 uppercase text-xs tracking-widest">{events.length} total</p>
                </div>
                <button onClick={() => (showForm ? setShowForm(false) : openCreate())} className="flex items-center gap-2 bg-[#e11d48] text-white px-5 py-3 rounded-xl font-black uppercase text-sm border-[3px] border-black shadow-[4px_4px_0_#111827] hover:-translate-y-1 transition-all">
                    {showForm ? <X size={18} /> : <Plus size={18} />} {showForm ? 'Close' : 'New event'}
                </button>
            </div>

            {showForm && (
                <div className="bg-white border-[4px] border-black rounded-[2rem] p-6 shadow-[8px_8px_0_#fde047] mb-8 grid sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="sm:col-span-2 font-black uppercase text-sm">{editingId ? `Editing: ${editingId}` : 'New event'}</div>
                    <input className={field} placeholder="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                    <select className={field} value={form.city} onChange={e => setForm({ ...form, city: e.target.value })}>{CITIES.map(c => <option key={c}>{c}</option>)}</select>
                    <input className={field} type="date" value={form.event_date} onChange={e => setForm({ ...form, event_date: e.target.value })} />
                    <input className={field} type="time" step={1} value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} />
                    <select className={field} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                        <option value="dinner">Dinner</option><option value="brunch">Brunch</option><option value="sport">Sport</option><option value="activity">Activity</option>
                    </select>
                    <select className={field} value={form.required_tier} onChange={e => setForm({ ...form, required_tier: e.target.value })}>
                        <option>Starter</option><option>Core Membership</option><option>Premium</option>
                    </select>
                    <div className="flex gap-4 items-center sm:col-span-2 font-black uppercase text-xs">
                        <button onClick={save} disabled={saving} className="ml-auto bg-[#111827] text-white px-6 py-3 rounded-xl font-black uppercase text-sm border-[3px] border-black shadow-[4px_4px_0_#e11d48] disabled:opacity-50 flex items-center gap-2">
                            {saving ? <Loader2 size={16} className="animate-spin" /> : (editingId ? 'Save changes' : 'Create event')}
                        </button>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-[2rem] border-[4px] border-black shadow-[8px_8px_0_#111827] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b-[4px] border-black bg-[#111827] text-white font-black uppercase text-xs">
                                <th className="p-4">Event</th><th className="p-4">Date</th><th className="p-4">RSVPs</th>
                                <th className="p-4">Restaurant</th><th className="p-4">Stage</th><th className="p-4">Status</th><th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {events.length === 0 ? (
                                <tr><td colSpan={7} className="p-8 text-center font-bold text-gray-400 uppercase">No events</td></tr>
                            ) : events.map(ev => {
                                const st = stage(ev);
                                return (
                                    <tr key={ev.id} className="border-b-2 border-gray-100 hover:bg-gray-50">
                                        <td className="p-4">
                                            <div className="font-black text-sm uppercase">{ev.title}</div>
                                            <div className="text-[10px] font-bold text-gray-400 uppercase">{ev.city || '—'} · {ev.required_tier}</div>
                                        </td>
                                        <td className="p-4 font-bold text-sm">{ev.event_date}<div className="text-[10px] text-gray-400">{ev.start_time}</div></td>
                                        <td className="p-4 font-black">{ev.rsvp_count || 0}</td>
                                        <td className="p-4">
                                            {ev.restaurant_name
                                                ? <span className="inline-flex items-center gap-1 text-xs font-bold"><CheckCircle2 size={14} className="text-[#34d399]" /> {ev.restaurant_name}</span>
                                                : <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-gray-400"><Utensils size={13} /> Not set</span>}
                                        </td>
                                        <td className="p-4"><span className={`px-2 py-1 text-[10px] font-black uppercase border-2 border-black rounded ${st.cls}`}>{st.label}</span></td>
                                        <td className="p-4">
                                            <select className="bg-white border-2 border-black p-1.5 rounded-lg font-bold text-xs uppercase" value={ev.status} onChange={e => setStatus(ev.id, e.target.value)}>
                                                <option value="open">open</option><option value="closed">closed</option><option value="passed">passed</option>
                                            </select>
                                        </td>
                                        <td className="p-4 text-right whitespace-nowrap">
                                            <button onClick={() => openEdit(ev)} className="text-gray-400 hover:text-[#38bdf8] mr-3"><Pencil size={17} /></button>
                                            <button onClick={() => del(ev.id)} className="text-gray-400 hover:text-[#e11d48]"><Trash2 size={18} /></button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
