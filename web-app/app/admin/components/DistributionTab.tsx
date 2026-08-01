import React, { useState } from 'react';
import { Loader2, Play, RefreshCw, Check, Users, Wand2, Utensils, Plus, AlertTriangle, ArrowRightLeft } from 'lucide-react';
import { adminFetch } from '../utils/adminFetch';

export const DistributionTab = ({ events, restaurants }: { events: any[]; restaurants: any[] }) => {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [tables, setTables] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [running, setRunning] = useState(false);
    const [autoRunning, setAutoRunning] = useState(false);
    const [tmin, setTmin] = useState(5);
    const [tmax, setTmax] = useState(6);
    const [pending, setPending] = useState<Record<string, string>>({});
    const [unseated, setUnseated] = useState<any[]>([]);
    const [moving, setMoving] = useState<string | null>(null);

    const selectedEvent = events.find(e => e.id === selectedId);
    const cityRestaurants = restaurants.filter(r => !selectedEvent?.city || r.city === selectedEvent.city);

    const capOf = (rId: string) => restaurants.find(r => r.id === rId)?.tables_count ?? 1;
    // How many tables (in this event) are already assigned to each restaurant.
    const usedOf = (rId: string) => tables.filter(t => t.restaurant_id === rId).length;

    const loadTables = async (eventId: string) => {
        setSelectedId(eventId); setLoading(true); setTables([]); setPending({}); setUnseated([]);
        try {
            const res = await adminFetch(`/admin/events/${eventId}/tables`);
            const data = await res.json();
            if (data.status === 'success') { setTables(data.tables || []); setUnseated(data.unseated || []); }
        } finally { setLoading(false); }
    };

    // Ручная пересадка гостя БЕЗ уведомления (лочит рассадку на бэке). table_id='' => снять со стола.
    const moveSeat = async (rsvpId: string, tableId: string) => {
        if (!selectedId) return;
        setMoving(rsvpId);
        try {
            const res = await adminFetch(`/admin/rsvps/${rsvpId}/table`, {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ table_id: tableId || null }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok) await loadTables(selectedId);
            else alert(data.detail || 'Could not move guest');
        } finally { setMoving(null); }
    };

    const addTable = async () => {
        if (!selectedId) return;
        const res = await adminFetch(`/admin/events/${selectedId}/tables`, { method: 'POST' });
        if (res.ok) await loadTables(selectedId);
        else alert('Could not add table');
    };

    // Подпись стола для дропдауна пересадки.
    const tableLabel = (t: any, idx: number) => `Table #${t.table_number || idx + 1}`;

    // Маленький контрол «переместить за стол / снять» для одного гостя.
    const MoveControl = ({ rsvpId, currentTableId }: { rsvpId?: string; currentTableId: string | null }) => {
        if (!rsvpId) return null;
        return (
            <select
                value={currentTableId || ''}
                disabled={moving === rsvpId}
                onChange={e => moveSeat(rsvpId, e.target.value)}
                title="Move to table"
                className="ml-auto shrink-0 bg-white border-2 border-black rounded-lg px-2 py-1 text-[10px] font-black uppercase outline-none focus:border-[#e11d48] disabled:opacity-50"
            >
                <option value="">— Unseated —</option>
                {tables.map((t, idx) => (
                    <option key={t.id} value={t.id}>{tableLabel(t, idx)}</option>
                ))}
            </select>
        );
    };

    const runMatch = async (final: boolean) => {
        if (!selectedId) return;
        if (!confirm(final ? 'Run FINAL seating (confirmed guests only)?' : 'Run seating for all guests?')) return;
        setRunning(true);
        try {
            const res = await adminFetch(`/admin/events/${selectedId}/match`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ table_size_min: tmin, table_size_max: tmax, final }),
            });
            const data = await res.json();
            if (res.ok) { alert(`Seated ${data.seated} into ${data.tables} table(s), overflow ${data.overflow}.`); await loadTables(selectedId); }
            else alert(data.detail || 'Seating failed');
        } finally { setRunning(false); }
    };

    const assign = async (tableId: string, restaurantId: string): Promise<boolean> => {
        const res = await adminFetch(`/admin/tables/${tableId}/restaurant`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ restaurant_id: restaurantId || null }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
            const r = restaurants.find(x => x.id === restaurantId);
            setTables(prev => prev.map(t => t.id === tableId ? { ...t, restaurant_id: restaurantId || null, restaurant_name: r?.name || null } : t));
            setPending(prev => { const n = { ...prev }; delete n[tableId]; return n; });
            return true;
        }
        alert(data.detail || 'Could not assign');
        return false;
    };

    // First-fit auto-distribution honoring each restaurant's tables_count.
    const autoAssign = async () => {
        if (!cityRestaurants.length) { alert('No restaurants in this city yet.'); return; }
        setAutoRunning(true);
        try {
            const usage: Record<string, number> = {};
            tables.forEach(t => { if (t.restaurant_id) usage[t.restaurant_id] = (usage[t.restaurant_id] || 0) + 1; });
            for (const t of tables) {
                if (t.restaurant_id) continue;
                const pick = cityRestaurants.find(r => (usage[r.id] || 0) < (r.tables_count ?? 1));
                if (!pick) { alert('Ran out of restaurant capacity — add more venues or raise tables_count.'); break; }
                const ok = await assign(t.id, pick.id);
                if (ok) usage[pick.id] = (usage[pick.id] || 0) + 1;
            }
        } finally { setAutoRunning(false); }
    };

    const fieldBox = "w-16 px-2 py-2 rounded-lg bg-white border-[3px] border-black font-black text-center";
    const assignedCount = tables.filter(t => t.restaurant_id).length;

    return (
        <div className="animate-in fade-in duration-300">
            <h1 className="text-4xl font-black uppercase tracking-tighter mb-1">Seating</h1>
            <p className="font-bold text-gray-500 uppercase text-xs tracking-widest mb-6">Run the matcher &amp; assign restaurants to tables</p>

            {/* Controls */}
            <div className="bg-white border-[4px] border-black rounded-[2rem] p-5 shadow-[6px_6px_0_#111827] mb-8 flex flex-wrap items-center gap-4">
                <span className="font-black uppercase text-xs tracking-widest">Table size</span>
                <input type="number" min={2} max={10} value={tmin} onChange={e => setTmin(parseInt(e.target.value || '5'))} className={fieldBox} />
                <span className="font-black">–</span>
                <input type="number" min={2} max={12} value={tmax} onChange={e => setTmax(parseInt(e.target.value || '6'))} className={fieldBox} />
                <div className="flex-1" />
                {selectedId && (
                    <div className="flex flex-wrap gap-2">
                        <button disabled={running} onClick={() => runMatch(false)} className="flex items-center gap-2 bg-[#111827] text-white px-4 py-2.5 rounded-xl font-black text-xs uppercase border-[3px] border-black shadow-[3px_3px_0_#000] disabled:opacity-50">
                            {running ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />} Seat all
                        </button>
                        <button disabled={running} onClick={() => runMatch(true)} className="flex items-center gap-2 bg-[#e11d48] text-white px-4 py-2.5 rounded-xl font-black text-xs uppercase border-[3px] border-black shadow-[3px_3px_0_#000] disabled:opacity-50">
                            <RefreshCw size={14} /> Final
                        </button>
                        {tables.length > 0 && (
                            <button disabled={autoRunning} onClick={autoAssign} className="flex items-center gap-2 bg-[#fde047] text-black px-4 py-2.5 rounded-xl font-black text-xs uppercase border-[3px] border-black shadow-[3px_3px_0_#000] disabled:opacity-50">
                                {autoRunning ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />} Auto-assign venues
                            </button>
                        )}
                        {tables.length > 0 && (
                            <button onClick={addTable} className="flex items-center gap-2 bg-white text-black px-4 py-2.5 rounded-xl font-black text-xs uppercase border-[3px] border-black shadow-[3px_3px_0_#000]">
                                <Plus size={14} /> Add table
                            </button>
                        )}
                    </div>
                )}
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Event list */}
                <div className="space-y-3">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Pick an event</h3>
                    {events.map(ev => (
                        <button key={ev.id} onClick={() => loadTables(ev.id)} className={`w-full p-4 rounded-2xl border-[3px] text-left transition-all ${selectedId === ev.id ? 'border-black bg-white shadow-[4px_4px_0_#e11d48]' : 'border-gray-200 bg-white hover:border-black'}`}>
                            <div className="font-black uppercase text-sm">{ev.title}</div>
                            <div className="text-[11px] font-bold text-gray-400 uppercase">{ev.event_date} · {ev.city || '—'} · {ev.rsvp_count || 0} RSVPs</div>
                        </button>
                    ))}
                    {events.length === 0 && <p className="text-sm font-bold text-gray-400 uppercase">No events</p>}

                    {/* Venue capacity overview */}
                    {selectedId && cityRestaurants.length > 0 && (
                        <div className="mt-6 bg-white border-[3px] border-black rounded-2xl p-4 shadow-[4px_4px_0_#38bdf8]">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-1"><Utensils size={12} /> Venue capacity ({selectedEvent?.city})</h3>
                            <div className="space-y-1.5">
                                {cityRestaurants.map(r => {
                                    const used = usedOf(r.id); const cap = r.tables_count ?? 1; const full = used >= cap;
                                    return (
                                        <div key={r.id} className="flex items-center justify-between text-xs font-bold">
                                            <span className="truncate">{r.name}</span>
                                            <span className={`font-black ${full ? 'text-[#e11d48]' : 'text-[#34d399]'}`}>{used}/{cap}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Tables */}
                <div className="lg:col-span-2">
                    {!selectedId ? (
                        <div className="min-h-[260px] flex items-center justify-center border-[3px] border-dashed border-gray-300 rounded-[2rem] text-center font-black uppercase text-gray-400">Pick an event to load tables</div>
                    ) : loading ? (
                        <div className="flex justify-center p-10"><Loader2 className="animate-spin text-[#e11d48]" size={36} /></div>
                    ) : tables.length === 0 ? (
                        <div className="min-h-[260px] flex flex-col items-center justify-center border-[3px] border-dashed border-gray-300 rounded-[2rem] text-center p-8">
                            <p className="font-black uppercase text-gray-500 mb-1">No tables yet</p>
                            <p className="text-sm font-medium text-gray-400">Hit <span className="font-black">Seat all</span> above to assemble tables.</p>
                        </div>
                    ) : (
                        <>
                            <p className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-3">{tables.length} tables · {assignedCount} with a venue</p>

                            {/* «Где мимо» — активные гости без стола: посади их вручную */}
                            {unseated.length > 0 && (
                                <div className="bg-[#fff7ed] border-[3px] border-[#e11d48] rounded-[2rem] p-5 mb-5 shadow-[5px_5px_0_#e11d48]">
                                    <h3 className="flex items-center gap-2 text-sm font-black uppercase text-[#e11d48] mb-3"><AlertTriangle size={16} /> {unseated.length} unseated guest(s)</h3>
                                    <div className="grid sm:grid-cols-2 gap-2">
                                        {unseated.map((m: any, i: number) => {
                                            const u = m.user || {};
                                            return (
                                                <div key={m.rsvp_id || i} className="flex items-center gap-3 bg-white border-2 border-black rounded-xl px-3 py-2">
                                                    {u.avatar ? <img src={u.avatar} className="w-9 h-9 rounded-lg border-2 border-black object-cover" /> : <div className="w-9 h-9 rounded-lg bg-[#111827] text-white border-2 border-black flex items-center justify-center font-black text-sm">{(u.name || '?')[0]}</div>}
                                                    <div className="min-w-0">
                                                        <div className="font-black uppercase text-sm truncate">{u.name}</div>
                                                        <div className="text-[10px] font-bold uppercase text-gray-500 truncate">{(u.domains || [])[0] || (u.hard_skills || [])[0] || 'Member'}</div>
                                                    </div>
                                                    <MoveControl rsvpId={m.rsvp_id} currentTableId={null} />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-5">
                                {tables.map((t, idx) => {
                                    const sel = pending[t.id] !== undefined ? pending[t.id] : (t.restaurant_id || '');
                                    const dirty = pending[t.id] !== undefined && pending[t.id] !== (t.restaurant_id || '');
                                    return (
                                        <div key={t.id} className="bg-white border-[3px] border-black rounded-[2rem] p-6 shadow-[5px_5px_0_#38bdf8]">
                                            <div className="flex justify-between items-center mb-4">
                                                <h3 className="text-xl font-black uppercase">Table #{t.table_number || idx + 1}</h3>
                                                <span className="flex items-center gap-1 bg-black text-white px-3 py-1.5 rounded-full text-[10px] font-black uppercase"><Users size={12} /> {t.users?.length || 0}</span>
                                            </div>
                                            <div className="flex gap-2 mb-4">
                                                <select value={sel} onChange={e => setPending(p => ({ ...p, [t.id]: e.target.value }))} className="flex-1 bg-[#fafafa] border-[3px] border-black rounded-xl px-4 py-3 font-bold outline-none focus:border-[#e11d48]">
                                                    <option value="">+ Assign restaurant {selectedEvent?.city ? `in ${selectedEvent.city}` : ''}</option>
                                                    {cityRestaurants.map(r => {
                                                        const used = usedOf(r.id); const cap = r.tables_count ?? 1;
                                                        const full = used >= cap && r.id !== (t.restaurant_id || '');
                                                        return <option key={r.id} value={r.id} disabled={full}>{r.name}{r.neighborhood ? ` (${r.neighborhood})` : ''} · {r.budget_level || ''} · {used}/{cap}{full ? ' — full' : ''}</option>;
                                                    })}
                                                </select>
                                                {dirty && <button onClick={() => assign(t.id, pending[t.id])} className="bg-[#34d399] border-[3px] border-black px-4 rounded-xl font-black text-xs uppercase flex items-center gap-1 shadow-[3px_3px_0_#000]"><Check size={16} /> Save</button>}
                                            </div>
                                            <div className="grid sm:grid-cols-2 gap-2">
                                                {(t.members || (t.users || []).map((u: any) => ({ user: u }))).map((m: any, i: number) => {
                                                    const u = m.user || m;
                                                    return (
                                                    <div key={m.rsvp_id || u.user_id || i} className="flex items-center gap-3 bg-[#fafafa] border-2 border-black rounded-xl px-3 py-2">
                                                        {u.avatar ? <img src={u.avatar} className="w-9 h-9 rounded-lg border-2 border-black object-cover" /> : <div className="w-9 h-9 rounded-lg bg-[#111827] text-white border-2 border-black flex items-center justify-center font-black text-sm">{(u.name || '?')[0]}</div>}
                                                        <div className="min-w-0">
                                                            <div className="font-black uppercase text-sm truncate">{u.name}</div>
                                                            <div className="text-[10px] font-bold uppercase text-gray-500 truncate">{(u.domains || [])[0] || (u.hard_skills || [])[0] || 'Member'}</div>
                                                        </div>
                                                        <MoveControl rsvpId={m.rsvp_id} currentTableId={t.id} />
                                                    </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
