import React, { useEffect, useState } from 'react';
import { Loader2, Check, X, ShieldAlert } from 'lucide-react';
import { adminFetch } from '../utils/adminFetch';

export const ModerationTab = () => {
    const [reports, setReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        try {
            const res = await adminFetch(`/admin/moderation/reports?status=open`);
            const data = await res.json();
            if (data.status === 'success') setReports(data.reports || []);
        } finally { setLoading(false); }
    };
    useEffect(() => { load(); }, []);

    const resolve = async (id: string, status: 'reviewed' | 'dismissed') => {
        setBusy(id);
        await adminFetch(`/admin/moderation/reports/${id}`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
        });
        setReports(prev => prev.filter(r => r.id !== id));
        setBusy(null);
    };

    return (
        <div className="animate-in fade-in duration-300">
            <h1 className="text-4xl font-black uppercase tracking-tighter mb-1">Reports</h1>
            <p className="font-bold text-gray-500 uppercase text-xs tracking-widest mb-8">Open moderation flags from event feedback</p>

            {loading ? (
                <div className="flex justify-center p-10"><Loader2 className="animate-spin text-[#e11d48]" size={36} /></div>
            ) : reports.length === 0 ? (
                <div className="bg-white border-[4px] border-dashed border-gray-300 rounded-[2rem] p-12 text-center">
                    <ShieldAlert size={40} className="mx-auto text-gray-300 mb-3" />
                    <p className="font-black uppercase text-gray-400">All clear — no open reports</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {reports.map(r => (
                        <div key={r.id} className="bg-white border-[4px] border-black rounded-[2rem] p-6 shadow-[6px_6px_0_#e11d48]">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <div className="font-black uppercase text-sm">{r.reviewer?.name || r.reviewer?.user_id || 'Anonymous'}</div>
                                    <div className="text-[11px] font-bold text-gray-400 uppercase">Event {r.event_id} · rating {r.rating ?? '—'}/5 · {r.created_at?.slice(0, 10)}</div>
                                </div>
                                <div className="flex gap-2">
                                    <button disabled={busy === r.id} onClick={() => resolve(r.id, 'reviewed')} className="flex items-center gap-1 border-[3px] border-black px-3 py-2 rounded-xl font-black text-xs uppercase bg-[#34d399] shadow-[3px_3px_0_#000]"><Check size={14} /> Resolve</button>
                                    <button disabled={busy === r.id} onClick={() => resolve(r.id, 'dismissed')} className="flex items-center gap-1 border-[3px] border-black px-3 py-2 rounded-xl font-black text-xs uppercase bg-white"><X size={14} /> Dismiss</button>
                                </div>
                            </div>
                            <p className="bg-[#fafafa] border-2 border-black rounded-xl p-4 font-medium text-sm">{r.moderation_note}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
