"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, AlertTriangle, Loader2, CheckCircle2, CreditCard } from 'lucide-react';
import { API_URL, getUserId } from '../../lib/api';

const PENALTY_AMOUNT = '$15';

export default function PenaltyPage() {
    const router = useRouter();
    const [paying, setPaying] = useState(false);
    const [done, setDone] = useState(false);

    const pay = async () => {
        setPaying(true);
        try {
            const res = await fetch(`${API_URL}/users/${getUserId()}/pay-penalty`, { method: 'POST' });
            if (res.ok) setDone(true);
            else alert('Payment failed');
        } catch { alert('Payment failed'); }
        finally { setPaying(false); }
    };

    if (done) {
        return (
            <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-[#fafafa] px-8 text-center">
                <div className="w-28 h-28 bg-[#34d399] border-[4px] border-black rounded-[2rem] flex items-center justify-center mb-8 shadow-[8px_8px_0_#111827] -rotate-3">
                    <CheckCircle2 size={52} className="text-black" />
                </div>
                <h1 className="text-4xl font-black uppercase tracking-tighter text-[#111827] mb-3 leading-none">Penalty cleared</h1>
                <p className="text-sm font-bold text-gray-500 mb-12 max-w-xs uppercase tracking-wide">You're good to join dinners again.</p>
                <button onClick={() => router.push('/feed/events')} className="w-full max-w-xs py-4 bg-[#111827] text-white rounded-2xl font-black uppercase text-sm border-[3px] border-black shadow-[6px_6px_0_#34d399] hover:-translate-y-1 transition-all">Back to events</button>
            </div>
        );
    }

    return (
        <div className="min-h-[100dvh] bg-[#fafafa] pb-32">
            <div className="px-5 pt-10 pb-4 flex items-center gap-3 border-b-[3px] border-black bg-white">
                <button onClick={() => router.back()} className="w-10 h-10 bg-white border-[3px] border-black rounded-full flex items-center justify-center shadow-[2px_2px_0_#000]"><ChevronLeft size={20} strokeWidth={3} /></button>
                <h2 className="font-black uppercase text-lg">Settle penalty</h2>
            </div>

            <div className="px-6 pt-10 max-w-lg mx-auto">
                <div className="w-16 h-16 bg-[#e11d48] border-[3px] border-black rounded-2xl flex items-center justify-center mb-6 shadow-[4px_4px_0_#000]"><AlertTriangle size={30} className="text-white" /></div>
                <h1 className="text-4xl font-black uppercase tracking-tighter text-[#111827] leading-none mb-3">Late cancellation fee</h1>
                <p className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-8 leading-relaxed">
                    You cancelled a dinner less than 24h before it started. A small fee keeps tables reliable for everyone. Pay it to unlock joining again.
                </p>

                <div className="bg-white border-[3px] border-black rounded-3xl p-6 shadow-[6px_6px_0_#111827] flex items-center justify-between mb-2">
                    <span className="font-black uppercase text-sm text-gray-600">Amount due</span>
                    <span className="font-black text-3xl text-[#e11d48]">{PENALTY_AMOUNT}</span>
                </div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Dev mode — no real charge is made.</p>
            </div>

            <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg px-5 pb-8 pt-6 bg-gradient-to-t from-[#fafafa] via-[#fafafa] to-transparent">
                <button onClick={pay} disabled={paying} className="w-full py-4 bg-[#e11d48] text-white rounded-2xl font-black uppercase text-sm tracking-widest border-[3px] border-black shadow-[6px_6px_0_#111827] hover:-translate-y-1 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                    {paying ? <Loader2 className="animate-spin" size={18} /> : <><CreditCard size={18} /> Pay {PENALTY_AMOUNT} & unlock</>}
                </button>
            </div>
        </div>
    );
}
