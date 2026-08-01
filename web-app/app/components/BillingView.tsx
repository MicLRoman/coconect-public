"use client";

import React, { useState } from "react";
import { Loader2, Check, Zap } from "lucide-react";
import { API_URL } from "../lib/api";

const PLANS: Record<string, { price: string; perks: string[] }> = {
    Starter: { price: "Free", perks: ["1 curated dinner / month (first is free)", "Access to the social layer", "Stay connected with people you meet"] },
    "Core Membership": { price: "$19 / mo", perks: ["1 curated dinner / month", "Good matching for what you're building", "Priority over free users"] },
    Premium: { price: "$29 / mo", perks: ["2 curated dinners / month", "5x better matching quality", "Quarterly meetups + top priority"] },
};

export function BillingView({ user, uid }: { user: any; uid: string }) {
    const tier: string = user?.subscription_tier || "Starter";
    const quota: number = user?.events_quota ?? 1;
    const used: number = user?.events_used ?? 0;
    const remaining = Math.max(0, quota - used);
    const formats: string[] = user?.available_formats || ["Dinners"];
    const [busy, setBusy] = useState<string | null>(null);
    const [promo, setPromo] = useState("");
    const [redeeming, setRedeeming] = useState(false);
    // ТЕСТ: всё бесплатно — прячем цены/покупки, показываем Unlimited.
    const FREE = process.env.NEXT_PUBLIC_FREE_MODE === 'true';

    async function checkout(type: "extra_event" | "upgrade", plan?: string) {
        setBusy(type + (plan || ""));
        try {
            const res = await fetch(`${API_URL}/billing/checkout`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_id: uid, type, plan, promo: promo.trim() || undefined }),
            });
            const d = await res.json();
            if (d.url) window.location.href = d.url;
            else alert(d.detail || "Payments are being set up — coming soon.");
        } catch {
            alert("Could not start checkout. Try again.");
        } finally {
            setBusy(null);
        }
    }

    async function redeemPromo() {
        const code = promo.trim().toUpperCase();
        if (!code) { alert("Enter a promo code first."); return; }
        setRedeeming(true);
        try {
            const res = await fetch(`${API_URL}/billing/redeem-promo`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code }),
            });
            const d = await res.json();
            if (res.ok && d.ok) {
                const until = d.expires_at
                    ? ` until ${new Date(d.expires_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`
                    : "";
                alert(`🎉 Code applied — you're on ${d.tier}${until}!`);
                window.location.reload();
            } else {
                alert(d.detail || "That code didn't work.");
            }
        } catch {
            alert("Could not apply the code. Try again.");
        } finally {
            setRedeeming(false);
        }
    }

    return (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200 relative z-10">
            <h2 className="text-4xl sm:text-5xl font-black uppercase tracking-tighter text-black drop-shadow-[2px_2px_0_#fff]">Billing</h2>

            {/* current plan + quota */}
            <div className="bg-white border-[4px] border-black rounded-[2rem] p-5 shadow-[8px_8px_0_#000]">
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <div className="text-[11px] font-black uppercase tracking-widest text-gray-400">Current plan</div>
                        <div className="text-2xl font-black uppercase tracking-tighter">{tier}</div>
                    </div>
                    <div className="text-right">
                        <div className="text-[11px] font-black uppercase tracking-widest text-gray-400">This month</div>
                        <div className="text-2xl font-black">{FREE ? "Unlimited" : <>{remaining}<span className="text-gray-400 text-base">/{quota}</span> left</>}</div>
                    </div>
                </div>
                {/* quota bar */}
                <div className="h-3 w-full bg-[#fafafa] border-2 border-black rounded-full overflow-hidden">
                    <div className="h-full bg-[#fde047]" style={{ width: `${quota ? (remaining / quota) * 100 : 0}%` }} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                    {formats.map((f) => (
                        <span key={f} className="text-[10px] font-black uppercase bg-[#fafafa] border-2 border-black rounded-full px-2.5 py-1">{f}</span>
                    ))}
                </div>
                {!FREE && user?.events_reset_at && (
                    <div className="mt-3 text-[11px] font-black uppercase tracking-widest text-gray-400">
                        Dinners refill on {new Date(user.events_reset_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </div>
                )}
                {!FREE && remaining === 0 && (
                    <div className="mt-4 bg-[#fff7cc] border-2 border-black rounded-xl p-3 text-sm font-bold">
                        You've used your dinners this month. Buy an extra seat or upgrade 👇
                    </div>
                )}
            </div>

            {/* buy extra event (скрыто в бесплатном режиме) */}
            {!FREE && (
                <button onClick={() => checkout("extra_event")} disabled={!!busy}
                    className="w-full flex items-center justify-center gap-2 bg-[#e11d48] text-white py-4 rounded-2xl font-black uppercase text-sm border-[3px] border-black shadow-[6px_6px_0_#111827] hover:-translate-y-1 transition-all disabled:opacity-50">
                    {busy === "extra_event" ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />}
                    Buy an extra dinner — $20
                </button>
            )}

            {/* plans (скрыто в бесплатном режиме) */}
            {!FREE && (
            <div className="space-y-4">
                <div className="text-[11px] font-black uppercase tracking-widest text-gray-400 mt-2">Upgrade your plan</div>
                {Object.entries(PLANS).map(([name, p]) => {
                    const current = name === tier;
                    return (
                        <div key={name} className={`border-[4px] border-black rounded-[2rem] p-5 shadow-[6px_6px_0_#000] ${current ? "bg-[#fde047]" : "bg-white"}`}>
                            <div className="flex items-center justify-between">
                                <div className="text-xl font-black uppercase tracking-tighter">{name}</div>
                                <div className="font-black">{FREE ? "Free" : p.price}</div>
                            </div>
                            <ul className="mt-3 space-y-1.5">
                                {p.perks.map((perk) => (
                                    <li key={perk} className="flex items-center gap-2 text-sm font-medium"><Check size={15} /> {perk}</li>
                                ))}
                            </ul>
                            {!current && name !== "Starter" && (
                                <button onClick={() => checkout("upgrade", name)} disabled={!!busy}
                                    className="mt-4 w-full bg-[#111827] text-white py-3 rounded-full font-black uppercase text-xs border-[3px] border-black shadow-[4px_4px_0_#000] hover:-translate-y-0.5 transition-all disabled:opacity-50">
                                    {busy === "upgrade" + name ? "…" : `Get ${name}`}
                                </button>
                            )}
                            {current && <div className="mt-4 text-center text-[11px] font-black uppercase tracking-widest text-black/50">Your current plan</div>}
                        </div>
                    );
                })}
            </div>
            )}

            {/* промокод + покупка подписки в самом низу страницы */}
            <div className="bg-white border-[4px] border-black rounded-[2rem] p-5 shadow-[8px_8px_0_#000] space-y-3">
                <div className="text-[11px] font-black uppercase tracking-widest text-gray-400">Have a promo code?</div>
                <div className="flex gap-2">
                    <input
                        value={promo}
                        onChange={(e) => setPromo(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") redeemPromo(); }}
                        placeholder="Enter promo code"
                        className="flex-1 min-w-0 bg-[#fafafa] border-[3px] border-black rounded-xl px-4 py-3 font-bold text-sm uppercase tracking-wide outline-none focus:bg-[#fde047]/40 transition-colors"
                    />
                    <button
                        onClick={redeemPromo}
                        disabled={redeeming || !promo.trim()}
                        className="shrink-0 flex items-center justify-center gap-2 bg-[#111827] text-white px-5 rounded-xl font-black uppercase text-sm border-[3px] border-black shadow-[4px_4px_0_#e11d48] hover:-translate-y-0.5 transition-all disabled:opacity-50"
                    >
                        {redeeming ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                        Apply
                    </button>
                </div>

                <div className="pt-1 text-[11px] font-black uppercase tracking-widest text-gray-400">Or pay with card</div>
                <button
                    onClick={() => checkout("upgrade", tier === "Starter" ? "Core Membership" : "Premium")}
                    disabled={!!busy}
                    className="w-full flex items-center justify-center gap-2 bg-[#e11d48] text-white py-4 rounded-2xl font-black uppercase text-sm border-[3px] border-black shadow-[6px_6px_0_#111827] hover:-translate-y-1 transition-all disabled:opacity-50"
                >
                    {busy?.startsWith("upgrade") ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />}
                    Get a subscription
                </button>
            </div>

            <p className="text-center text-[11px] text-gray-400 font-medium pb-2">{FREE ? "Everything's free during beta 🥂" : "First dinner is on us 🥂 · secure payments by Stripe"}</p>
        </div>
    );
}
