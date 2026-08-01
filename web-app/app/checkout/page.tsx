"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Check, Loader2, Sparkles } from 'lucide-react';
import { API_URL, getUserId } from '../lib/api';

// Billing stub (Phase 1): no real payment yet — selecting a plan just grants
// the tier/quota via /subscription/purchase. Stripe wiring comes later.
const PLANS = [
  { tier: 'Starter', price: 'Free', quota: 1, accent: '#38bdf8', perks: ['1 curated dinner / month (first is free)', 'Access to the social layer', 'Stay connected with people you meet'] },
  { tier: 'Core Membership', price: '$19/mo', quota: 1, accent: '#e11d48', perks: ['1 curated dinner / month', 'Good matching for what you\'re building', 'Priority over free users'] },
  { tier: 'Premium', price: '$29/mo', quota: 2, accent: '#fde047', perks: ['2 curated dinners / month', '5x better matching quality', 'Quarterly meetups + top priority'] },
];

export default function CheckoutPage() {
  const router = useRouter();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  // ТЕСТ: всё бесплатно — показываем «Free» вместо цены.
  const FREE = process.env.NEXT_PUBLIC_FREE_MODE === 'true';

  const purchase = async (tier: string) => {
    const userId = getUserId();
    if (!userId) { router.push('/registration?mode=login'); return; }
    setLoadingTier(tier);
    try {
      const res = await fetch(`${API_URL}/subscription/purchase`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, tier }),
      });
      if (res.ok) router.push('/feed/events');
      else alert('Could not update plan.');
    } catch (e) { console.error(e); }
    finally { setLoadingTier(null); }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] pb-16">
      <div className="px-5 pt-10 pb-4 flex items-center gap-3 border-b-[3px] border-black bg-white">
        <button onClick={() => router.back()} className="w-10 h-10 bg-white border-[3px] border-black rounded-full flex items-center justify-center shadow-[2px_2px_0_#000]"><ChevronLeft size={20} strokeWidth={3} /></button>
        <h2 className="font-black uppercase text-lg">Upgrade your plan</h2>
      </div>

      <div className="max-w-lg mx-auto px-6 pt-8">
        <span className="bg-[#fde047] border-[3px] border-black font-black uppercase text-[10px] px-3 py-1.5 shadow-[3px_3px_0_#000] inline-flex items-center gap-1 mb-4"><Sparkles size={12} /> Dev billing — no charge yet</span>
        <h1 className="text-4xl font-black uppercase tracking-tighter text-[#111827] leading-none mb-8">More tables,<br />more circle.</h1>

        <div className="space-y-5">
          {PLANS.map(p => (
            <div key={p.tier} className="bg-white border-[3px] border-black rounded-3xl p-6 shadow-[6px_6px_0_#111827]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-black uppercase text-xl">{p.tier}</h3>
                <span className="font-black uppercase text-lg" style={{ color: p.accent === '#fde047' ? '#111827' : p.accent }}>{FREE ? 'Free' : p.price}</span>
              </div>
              <ul className="space-y-2 mb-6">
                {p.perks.map(perk => (
                  <li key={perk} className="flex items-center gap-2 font-bold text-sm text-gray-700">
                    <span className="w-5 h-5 rounded-md border-2 border-black flex items-center justify-center" style={{ background: p.accent }}><Check size={12} strokeWidth={4} className="text-black" /></span>
                    {perk}
                  </li>
                ))}
              </ul>
              <button onClick={() => purchase(p.tier)} disabled={loadingTier === p.tier} className="w-full py-3.5 rounded-2xl font-black uppercase text-sm border-[3px] border-black shadow-[4px_4px_0_#000] hover:-translate-y-1 transition-all flex items-center justify-center gap-2 disabled:opacity-50" style={{ background: p.accent, color: '#111827' }}>
                {loadingTier === p.tier ? <Loader2 className="animate-spin" size={18} /> : `Choose ${p.tier}`}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
