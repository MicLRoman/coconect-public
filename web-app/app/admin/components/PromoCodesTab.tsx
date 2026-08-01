import React, { useState } from 'react';
import { Plus, Trash2, Loader2, Ticket, Crown } from 'lucide-react';
import { adminFetch } from '../utils/adminFetch';

const TIERS = ['Starter', 'Core Membership', 'Premium'];
// value = duration_days sent to the API ('' = forever / no expiry)
const DURATIONS = [
    { label: 'Forever', value: '' },
    { label: '1 month', value: '30' },
    { label: '3 months', value: '90' },
    { label: '6 months', value: '180' },
    { label: '12 months', value: '365' },
];
const durationLabel = (days: number | null | undefined) =>
    days == null ? 'Forever' : `${Math.round(days / 30)} mo`;
const EMPTY = { code: '', subscription_tier: 'Core Membership', max_uses: '', duration_days: '' };

export const PromoCodesTab = ({ promoCodes, refresh }: { promoCodes: any[]; refresh: () => void }) => {
    const [form, setForm] = useState<any>(EMPTY);
    const [saving, setSaving] = useState(false);

    const save = async () => {
        const code = (form.code || '').trim().toUpperCase();
        if (!code) { alert('Code required'); return; }
        setSaving(true);
        const body = JSON.stringify({
            code,
            subscription_tier: form.subscription_tier,
            max_uses: form.max_uses === '' ? null : parseInt(form.max_uses),
            duration_days: form.duration_days === '' ? null : parseInt(form.duration_days),
        });
        const res = await adminFetch('/admin/promo-codes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
        setSaving(false);
        if (!res.ok) { const d = await res.json().catch(() => ({})); alert(d.detail || 'Failed to create code'); return; }
        setForm(EMPTY); refresh();
    };

    const del = async (id: string) => { if (!confirm('Delete promo code?')) return; await adminFetch(`/admin/promo-codes/${id}`, { method: 'DELETE' }); refresh(); };

    const field = "w-full bg-[#fafafa] border-[3px] border-black rounded-xl px-4 py-3 font-bold outline-none focus:border-[#e11d48]";

    return (
        <div className="animate-in fade-in duration-300">
            <h1 className="text-4xl font-black uppercase tracking-tighter mb-1">Promo Codes</h1>
            <p className="font-bold text-gray-500 uppercase text-xs tracking-widest mb-8">Grant subscription tiers via code</p>

            <div className="bg-white border-[4px] border-black rounded-[2rem] p-6 shadow-[8px_8px_0_#fde047] mb-8 grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 font-black uppercase text-sm">Add promo code</div>
                <div>
                    <label className="font-black uppercase text-[10px] text-gray-500 mb-1 block">Code</label>
                    <input className={`${field} uppercase tracking-wider`} placeholder="WELCOME2026" value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} />
                </div>
                <div>
                    <label className="font-black uppercase text-[10px] text-gray-500 mb-1 block">Subscription</label>
                    <select className={field} value={form.subscription_tier} onChange={e => setForm({ ...form, subscription_tier: e.target.value })}>
                        {TIERS.map(t => <option key={t}>{t}</option>)}
                    </select>
                </div>
                <div>
                    <label className="font-black uppercase text-[10px] text-gray-500 mb-1 block">Max uses <span className="text-gray-300">(empty = ∞)</span></label>
                    <input className={field} type="number" min={1} placeholder="Unlimited" value={form.max_uses} onChange={e => setForm({ ...form, max_uses: e.target.value })} />
                </div>
                <div>
                    <label className="font-black uppercase text-[10px] text-gray-500 mb-1 block">Duration <span className="text-gray-300">(how long the tier lasts)</span></label>
                    <select className={field} value={form.duration_days} onChange={e => setForm({ ...form, duration_days: e.target.value })}>
                        {DURATIONS.map(d => <option key={d.label} value={d.value}>{d.label}</option>)}
                    </select>
                </div>
                <button onClick={save} disabled={saving} className="sm:col-span-2 bg-[#111827] text-white px-6 py-3 rounded-xl font-black uppercase text-sm border-[3px] border-black shadow-[4px_4px_0_#e11d48] flex items-center justify-center gap-2 disabled:opacity-50">
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <><Plus size={16} /> Add promo code</>}
                </button>
            </div>

            <div className="bg-white border-[4px] border-black rounded-[2rem] overflow-hidden">
                <div className="grid grid-cols-[1.4fr_1.4fr_0.9fr_0.9fr_auto] gap-3 px-6 py-3 bg-[#111827] text-white font-black uppercase text-[11px] tracking-widest">
                    <span>Code</span>
                    <span>Subscription</span>
                    <span>Uses</span>
                    <span>Duration</span>
                    <span></span>
                </div>
                {promoCodes.length === 0 && <div className="px-6 py-10 text-center font-bold text-gray-400 uppercase">No promo codes yet</div>}
                {promoCodes.map(p => (
                    <div key={p.id} className="grid grid-cols-[1.4fr_1.4fr_0.9fr_0.9fr_auto] gap-3 px-6 py-4 border-t-[3px] border-black items-center">
                        <span className="font-black uppercase tracking-wider text-lg">{p.code}</span>
                        <span className="inline-flex items-center gap-1.5 font-black uppercase text-xs"><Crown size={14} className="text-[#fde047]" /> {p.subscription_tier}</span>
                        <span className="font-bold text-sm">{p.used_count ?? 0}{p.max_uses != null ? ` / ${p.max_uses}` : ' / ∞'}</span>
                        <span className="font-bold text-sm">{durationLabel(p.duration_days)}</span>
                        <button onClick={() => del(p.id)} className="text-gray-300 hover:text-[#e11d48] justify-self-end"><Trash2 size={18} /></button>
                    </div>
                ))}
            </div>
        </div>
    );
};
