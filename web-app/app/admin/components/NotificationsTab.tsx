"use client";

import React, { useState } from 'react';
import { Bell, Send, Loader2, MessageSquare, Smartphone } from 'lucide-react';
import { adminFetch } from '../utils/adminFetch';

export const NotificationsTab = () => {
    const [text, setText] = useState('');
    const [audience, setAudience] = useState<'all' | 'event' | 'user'>('all');
    const [ref, setRef] = useState('');
    const [channel, setChannel] = useState<'in_app' | 'sms'>('in_app');
    const [sending, setSending] = useState(false);
    const [result, setResult] = useState<any>(null);

    const send = async () => {
        if (!text.trim()) return;
        setSending(true);
        setResult(null);
        try {
            const res = await adminFetch('/admin/notifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, audience, ref: ref || null, channel }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Failed');
            setResult({ ok: true, ...data });
            if (data.channel === 'in_app') setText('');
        } catch (e: any) {
            setResult({ ok: false, error: e.message });
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="animate-in fade-in duration-300 max-w-2xl">
            <h1 className="text-4xl font-black uppercase tracking-tighter mb-1">Notifications</h1>
            <p className="font-bold text-gray-500 uppercase text-xs tracking-widest mb-8">Broadcast to members</p>

            <div className="bg-white border-[4px] border-black rounded-[2rem] p-6 sm:p-8 shadow-[8px_8px_0_#111827] space-y-6">
                {/* Channel */}
                <div>
                    <label className="font-black uppercase text-xs mb-2 block">Channel</label>
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => setChannel('in_app')} className={`p-3 border-[3px] border-black rounded-xl font-black uppercase text-xs flex items-center justify-center gap-2 transition-all ${channel === 'in_app' ? 'bg-[#38bdf8] text-white shadow-[3px_3px_0_#000]' : 'bg-white'}`}>
                            <MessageSquare size={16} /> In-app
                        </button>
                        <button onClick={() => setChannel('sms')} className={`p-3 border-[3px] border-black rounded-xl font-black uppercase text-xs flex items-center justify-center gap-2 transition-all ${channel === 'sms' ? 'bg-[#fde047] shadow-[3px_3px_0_#000]' : 'bg-white'}`}>
                            <Smartphone size={16} /> SMS <span className="text-[9px] opacity-60">(stub)</span>
                        </button>
                    </div>
                    {channel === 'sms' && (
                        <p className="text-[11px] font-bold text-[#e11d48] uppercase tracking-wide mt-2">SMS not connected yet — messages are logged only, not delivered.</p>
                    )}
                </div>

                {/* Audience */}
                <div>
                    <label className="font-black uppercase text-xs mb-2 block">Audience</label>
                    <div className="grid grid-cols-3 gap-3">
                        {(['all', 'event', 'user'] as const).map(a => (
                            <button key={a} onClick={() => setAudience(a)} className={`p-3 border-[3px] border-black rounded-xl font-black uppercase text-xs transition-all ${audience === a ? 'bg-[#111827] text-white shadow-[3px_3px_0_#e11d48]' : 'bg-white'}`}>
                                {a === 'all' ? 'Everyone' : a === 'event' ? 'By event' : 'Single user'}
                            </button>
                        ))}
                    </div>
                    {audience !== 'all' && (
                        <input
                            value={ref} onChange={e => setRef(e.target.value)}
                            placeholder={audience === 'event' ? 'event_id (e.g. ev_tonight)' : 'user_id (e.g. michael_super_admin)'}
                            className="w-full mt-3 bg-[#fafafa] border-[3px] border-black rounded-xl px-4 py-3 font-bold text-sm outline-none focus:border-[#38bdf8] shadow-[3px_3px_0_#000]"
                        />
                    )}
                </div>

                {/* Text */}
                <div>
                    <label className="font-black uppercase text-xs mb-2 block">Message</label>
                    <textarea
                        value={text} onChange={e => setText(e.target.value)} rows={4}
                        placeholder="Your table is confirmed for tonight..."
                        className="w-full bg-[#fafafa] border-[3px] border-black rounded-xl px-4 py-3 font-bold text-sm outline-none focus:border-[#e11d48] shadow-[3px_3px_0_#000]"
                    />
                </div>

                <button onClick={send} disabled={sending || !text.trim()} className="w-full py-4 bg-[#e11d48] text-white rounded-2xl font-black uppercase text-sm border-[3px] border-black shadow-[5px_5px_0_#111827] hover:-translate-y-1 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                    {sending ? <Loader2 className="animate-spin" size={18} /> : <><Send size={18} /> Send</>}
                </button>

                {result && (
                    result.ok ? (
                        <div className="bg-[#34d399] border-[3px] border-black rounded-xl p-4 font-black uppercase text-xs">
                            {result.channel === 'sms'
                                ? `SMS stub: ${result.recipients} recipients, ${result.delivered} delivered (none — provider not connected).`
                                : `Sent in-app to ${result.delivered} of ${result.recipients} members.`}
                        </div>
                    ) : (
                        <div className="bg-red-100 border-[3px] border-red-500 text-red-700 rounded-xl p-4 font-bold text-sm">{result.error}</div>
                    )
                )}
            </div>
        </div>
    );
};
