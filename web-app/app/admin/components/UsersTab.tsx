import React, { useState } from 'react';
import { adminFetch } from '../utils/adminFetch';
import { ChevronDown, ChevronUp } from 'lucide-react';

export const UsersTab = ({ users, refresh }: { users: any[]; refresh: () => void }) => {
    const [busy, setBusy] = useState<string | null>(null);
    const [expandedUser, setExpandedUser] = useState<string | null>(null);

    const setTier = async (userId: string, tier: string) => {
        if (!tier) return;
        setBusy(userId);
        await adminFetch(`/admin/users/${userId}/tier`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tier }),
        });
        await refresh();
        setBusy(null);
    };

    const clearPenalty = async (userId: string) => {
        setBusy(userId);
        await adminFetch(`/admin/users/${userId}/clear_penalty`, { method: 'POST' });
        await refresh();
        setBusy(null);
    };

    const toggleExpand = (userId: string) => {
        setExpandedUser(expandedUser === userId ? null : userId);
    };

    return (
        <div className="animate-in fade-in duration-300">
            <h1 className="text-4xl font-black uppercase tracking-tighter mb-1">Guests</h1>
            <p className="font-bold text-gray-500 uppercase text-xs tracking-widest mb-8">{users.length} users</p>

            <div className="bg-white rounded-[2rem] border-[4px] border-black shadow-[8px_8px_0_#111827] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b-[4px] border-black bg-[#111827] text-white font-black uppercase text-xs">
                                <th className="p-4 w-10"></th>
                                <th className="p-4">Name / City</th>
                                <th className="p-4">Tier</th>
                                <th className="p-4">Quota</th>
                                <th className="p-4">Flags</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.length === 0 ? (
                                <tr><td colSpan={6} className="p-8 text-center font-bold text-gray-400 uppercase">No users</td></tr>
                            ) : users.map(u => (
                                <React.Fragment key={u.user_id}>
                                    <tr 
                                        className="border-b-2 border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                                        onClick={() => toggleExpand(u.user_id)}
                                    >
                                        <td className="p-4 text-gray-400">
                                            {expandedUser === u.user_id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                        </td>
                                        <td className="p-4">
                                            <div className="font-black text-sm uppercase">{u.name || 'Unknown'}</div>
                                            <div className="font-bold text-[10px] text-gray-400 uppercase">{u.city || '—'} · {u.phone || 'no phone'}</div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-3 py-1 text-[10px] font-black uppercase border-2 border-black rounded-lg shadow-[2px_2px_0_#000] ${u.subscription_tier === 'Premium' ? 'bg-[#fde047]' : u.subscription_tier === 'Core Membership' ? 'bg-[#38bdf8] text-white' : 'bg-gray-200'}`}>{u.subscription_tier || 'None'}</span>
                                        </td>
                                        <td className="p-4 font-bold text-sm">{u.events_used || 0} / {u.events_quota || 0}</td>
                                        <td className="p-4">
                                            {u.has_penalty && <span className="px-2 py-1 text-[10px] font-black uppercase border-2 border-black rounded bg-[#e11d48] text-white">Penalty</span>}
                                        </td>
                                        <td className="p-4" onClick={e => e.stopPropagation()}>
                                            <div className="flex items-center gap-2 justify-end">
                                                {u.has_penalty && (
                                                    <button disabled={busy === u.user_id} onClick={() => clearPenalty(u.user_id)} className="border-2 border-black px-2 py-1.5 rounded-lg font-black text-[10px] uppercase bg-white hover:bg-gray-100">Clear penalty</button>
                                                )}
                                                <select className="bg-white border-2 border-black p-2 rounded-lg font-bold text-xs uppercase cursor-pointer" onChange={e => setTier(u.user_id, e.target.value)} value="">
                                                    <option value="" disabled>Tier</option>
                                                    <option value="Starter">Starter</option>
                                                    <option value="Core Membership">Core</option>
                                                    <option value="Premium">Premium</option>
                                                </select>
                                            </div>
                                        </td>
                                    </tr>
                                    {expandedUser === u.user_id && (
                                        <tr className="border-b-[4px] border-black bg-gray-50/50">
                                            <td colSpan={6} className="p-6">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm bg-white border-2 border-black rounded-xl p-6 shadow-[4px_4px_0_#000]">
                                                    <div>
                                                        <h3 className="font-black uppercase mb-4 text-[#e11d48] flex items-center gap-2">Registration & Basic Info</h3>
                                                        <div className="space-y-2">
                                                            <p><strong className="font-black uppercase text-xs">Onboarding:</strong> {u.onboarding_completed ? <span className="text-green-600 font-bold">Completed</span> : <span className="text-amber-500 font-bold">Pending</span>}</p>
                                                            <p><strong className="font-black uppercase text-xs">Phone:</strong> {u.phone || '—'}</p>
                                                            <p><strong className="font-black uppercase text-xs">Age:</strong> {u.age || '—'}</p>
                                                            <p><strong className="font-black uppercase text-xs">District:</strong> {u.district || '—'}</p>
                                                            <p><strong className="font-black uppercase text-xs">Languages:</strong> {u.languages?.join(', ') || '—'}</p>
                                                            <p><strong className="font-black uppercase text-xs">Education:</strong> {u.education || '—'}</p>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <h3 className="font-black uppercase mb-4 text-[#e11d48] flex items-center gap-2">Career & Skills</h3>
                                                        <div className="space-y-2">
                                                            <p><strong className="font-black uppercase text-xs">Domains:</strong> {u.domains?.join(', ') || '—'}</p>
                                                            <p><strong className="font-black uppercase text-xs">Experience:</strong> {u.experience_level?.join(', ') || '—'}</p>
                                                            <p><strong className="font-black uppercase text-xs">Hard Skills:</strong> {u.hard_skills?.join(', ') || '—'}</p>
                                                            <p><strong className="font-black uppercase text-xs">Status:</strong> {u.current_status ? `${u.current_status.type || ''} at ${u.current_status.company_name || 'N/A'} ${u.current_status.stage ? `(${u.current_status.stage})` : ''}` : '—'}</p>
                                                        </div>
                                                    </div>
                                                    <div className="col-span-1 md:col-span-2 border-t-2 border-dashed border-gray-300 pt-4 mt-2">
                                                        <h3 className="font-black uppercase mb-4 text-[#e11d48]">Preferences</h3>
                                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                                                            <p><strong className="font-black uppercase text-xs block">Pace:</strong> {u.pace ? `${u.pace} / 10` : '—'}</p>
                                                            <p><strong className="font-black uppercase text-xs block">Social Battery:</strong> {u.social_battery || '—'}</p>
                                                            <p><strong className="font-black uppercase text-xs block">Intents:</strong> {u.intents?.join(', ') || '—'}</p>
                                                        </div>
                                                        <div>
                                                            <strong className="font-black uppercase text-xs block mb-1">Custom Request:</strong>
                                                            <p className="text-gray-700 italic border-l-4 border-gray-200 pl-4 py-1 bg-gray-50/50">"{u.custom_request_raw || 'No custom request'}"</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

