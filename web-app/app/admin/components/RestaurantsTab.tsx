import React, { useState } from 'react';
import { Plus, Trash2, Loader2, Utensils, Pencil, X, Table } from 'lucide-react';
import { adminFetch } from '../utils/adminFetch';
import { CITIES, getNeighborhoodsForCity } from '../../constants/cities';

const EMPTY = { name: '', city: 'London', neighborhood: '', address: '', budget_level: '$$', tables_count: 1 };

export const RestaurantsTab = ({ restaurants, refresh }: { restaurants: any[]; refresh: () => void }) => {
    const [form, setForm] = useState<any>(EMPTY);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const save = async () => {
        if (!form.name) { alert('Name required'); return; }
        setSaving(true);
        const body = JSON.stringify({ ...form, tables_count: parseInt(form.tables_count) || 1 });
        if (editingId) {
            await adminFetch(`/admin/restaurants/${editingId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body });
        } else {
            await adminFetch('/admin/restaurants', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
        }
        setSaving(false); setForm(EMPTY); setEditingId(null); refresh();
    };

    const edit = (r: any) => { setEditingId(r.id); setForm({ ...EMPTY, ...r, tables_count: r.tables_count || 1 }); window.scrollTo({ top: 0, behavior: 'smooth' }); };
    const del = async (id: string) => { if (!confirm('Delete restaurant?')) return; await adminFetch(`/admin/restaurants/${id}`, { method: 'DELETE' }); if (editingId === id) { setEditingId(null); setForm(EMPTY); } refresh(); };

    const field = "w-full bg-[#fafafa] border-[3px] border-black rounded-xl px-4 py-3 font-bold outline-none focus:border-[#e11d48]";
    const hoods = getNeighborhoodsForCity(form.city);

    return (
        <div className="animate-in fade-in duration-300">
            <h1 className="text-4xl font-black uppercase tracking-tighter mb-1">Restaurants</h1>
            <p className="font-bold text-gray-500 uppercase text-xs tracking-widest mb-8">Venues you assign to seated tables</p>

            <div className="bg-white border-[4px] border-black rounded-[2rem] p-6 shadow-[8px_8px_0_#fde047] mb-8 grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 flex items-center justify-between">
                    <span className="font-black uppercase text-sm">{editingId ? 'Edit restaurant' : 'Add restaurant'}</span>
                    {editingId && <button onClick={() => { setEditingId(null); setForm(EMPTY); }} className="text-gray-400 hover:text-black flex items-center gap-1 font-black uppercase text-xs"><X size={14} /> Cancel</button>}
                </div>
                <input className={field} placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                <input className={field} placeholder="Address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
                <select className={field} value={form.city} onChange={e => setForm({ ...form, city: e.target.value, neighborhood: '' })}>{CITIES.map(c => <option key={c}>{c}</option>)}</select>
                <select className={field} value={form.neighborhood} onChange={e => setForm({ ...form, neighborhood: e.target.value })}>
                    <option value="">Any neighborhood</option>
                    {hoods.map(h => <option key={h}>{h}</option>)}
                </select>
                <select className={field} value={form.budget_level} onChange={e => setForm({ ...form, budget_level: e.target.value })}>
                    <option value="$">$</option><option value="$$">$$</option><option value="$$$">$$$</option>
                </select>
                <div>
                    <label className="font-black uppercase text-[10px] text-gray-500 mb-1 block">Tables available</label>
                    <input className={field} type="number" min={1} value={form.tables_count} onChange={e => setForm({ ...form, tables_count: e.target.value })} />
                </div>
                <button onClick={save} disabled={saving} className="sm:col-span-2 bg-[#111827] text-white px-6 py-3 rounded-xl font-black uppercase text-sm border-[3px] border-black shadow-[4px_4px_0_#e11d48] flex items-center justify-center gap-2 disabled:opacity-50">
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <><Plus size={16} /> {editingId ? 'Save changes' : 'Add restaurant'}</>}
                </button>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {restaurants.length === 0 && <div className="col-span-full text-center py-10 font-bold text-gray-400 uppercase border-[3px] border-dashed border-gray-300 rounded-3xl">No restaurants yet</div>}
                {restaurants.map(r => (
                    <div key={r.id} className="bg-white border-[3px] border-black rounded-2xl p-5 shadow-[4px_4px_0_#38bdf8] relative">
                        <div className="absolute top-3 right-3 flex gap-2">
                            <button onClick={() => edit(r)} className="text-gray-300 hover:text-[#38bdf8]"><Pencil size={15} /></button>
                            <button onClick={() => del(r.id)} className="text-gray-300 hover:text-[#e11d48]"><Trash2 size={16} /></button>
                        </div>
                        <div className="w-10 h-10 bg-[#fde047] border-2 border-black rounded-xl flex items-center justify-center mb-3"><Utensils size={18} /></div>
                        <h3 className="font-black uppercase text-base leading-tight">{r.name}</h3>
                        <p className="text-[11px] font-bold text-gray-400 uppercase">{r.city || '—'}{r.neighborhood ? ` · ${r.neighborhood}` : ''} · {r.budget_level || ''}</p>
                        {r.address && <p className="text-xs font-medium text-gray-500 mt-1">{r.address}</p>}
                        <div className="mt-3 inline-flex items-center gap-1.5 bg-gray-100 border-2 border-black rounded-lg px-2.5 py-1 text-[10px] font-black uppercase"><Table size={12} /> {r.tables_count ?? 1} table{(r.tables_count ?? 1) === 1 ? '' : 's'}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};
