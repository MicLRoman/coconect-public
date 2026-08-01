"use client";

import React, { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { API_URL, setUserId, setToken } from "../lib/api";
import { useLanguage } from "../lib/LanguageContext";
import { normalizeLinkedInUrl } from "../lib/utils";

const WA_NUMBER = process.env.NEXT_PUBLIC_WA_NUMBER || "17407301419";

type Phase = "form" | "parsing" | "done";

export default function OnboardingPage() {
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [linkedin, setLinkedin] = useState("");
    const [phase, setPhase] = useState<Phase>("form");
    const [error, setError] = useState<string | null>(null);

    const { t: globalT } = useLanguage();
    const t = globalT.onboarding;
    const isValid = !!name.trim() && !!phone.trim() && !!linkedin.trim();
    const waLink = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(t.waMsg(name))}`;

    async function submit() {
        setError(null);
        if (!isValid) { setError(t.fillAll); return; }
        setPhase("parsing");
        try {
            const normalizedLi = normalizeLinkedInUrl(linkedin);
            // LinkedIn-парсинг best-effort: если не вышло (лимит/приватный) — продолжаем
            // без GIVE, заполнится в кабинете.
            let liProfile: any = {};
            try {
                const liRes = await fetch("/api/linkedin", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ query: normalizedLi }),
                });
                const liData = await liRes.json();
                if (liRes.ok) liProfile = liData.profile ?? liData;
                else console.warn("LinkedIn parse skipped:", liData?.error);
            } catch (e) {
                console.warn("LinkedIn parse failed, continuing:", e);
            }

            const res = await fetch(`${API_URL}/onboarding/web_start`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: name.trim(),
                    phone: phone.trim(),
                    linkedin_url: normalizedLi,
                    linkedin_profile: liProfile,
                    lang: "en",
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.detail || t.saveErr);

            if (data.user_id) setUserId(data.user_id);
            setToken(data.token);
            setPhase("done");
        } catch (err) {
            setError(err instanceof Error ? err.message : t.oops);
            setPhase("form");
        }
    }

    if (phase === "done") {
        return (
            <div className="min-h-screen bg-[#fafafa] font-sans flex items-center justify-center px-4 sm:px-6">
                <div className="max-w-2xl w-full animate-in fade-in duration-500">
                    <h2 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tighter uppercase mb-4 text-[#111827]">
                        {t.doneA} <span className="text-[#22c55e]">{t.doneB}</span>
                    </h2>
                    <p className="text-sm sm:text-lg text-gray-900 font-medium mb-10 border-l-[4px] border-[#22c55e] pl-4">{t.doneSub}</p>
                    <a href={waLink} className="inline-flex items-center gap-3 bg-[#22c55e] text-black px-8 sm:px-10 py-4 sm:py-5 rounded-full font-black uppercase text-base sm:text-lg border-2 sm:border-[3px] border-black shadow-[6px_6px_0_#111827] hover:-translate-y-1 transition-all active:translate-y-0">
                        {t.waBtn} <ArrowRight size={18} />
                    </a>
                    <p className="text-xs sm:text-sm text-gray-500 mt-6 font-medium">{t.hint(phone)}</p>
                </div>
            </div>
        );
    }

    const busy = phase === "parsing";
    return (
        <div className="min-h-screen bg-[#fafafa] font-sans flex items-center justify-center px-4 sm:px-6 py-12">
            <div className="max-w-2xl w-full animate-in fade-in duration-500">
                <div className="flex items-center justify-between mb-6 sm:mb-8">
                    <div className="text-3xl font-black tracking-tighter">coconect:</div>
                </div>

                <h2 className="text-3xl sm:text-4xl md:text-6xl font-black tracking-tighter uppercase mb-3 sm:mb-4 text-[#111827]">
                    {t.h1a} <span className="text-[#38bdf8]">{t.h1b}</span>
                </h2>
                <p className="text-sm sm:text-lg text-gray-900 font-medium mb-8 sm:mb-10 border-l-[3px] sm:border-l-[4px] border-[#38bdf8] pl-3 sm:pl-4">{t.sub}</p>

                <div className="space-y-5">
                    <Field label={t.name}>
                        <input type="text" autoFocus placeholder={t.namePh} value={name}
                            onChange={(e) => setName(e.target.value)} disabled={busy} className={inputCls} />
                    </Field>
                    <Field label={t.phone}>
                        <input type="tel" placeholder={t.phonePh} value={phone}
                            onChange={(e) => setPhone(e.target.value)} disabled={busy} className={inputCls} />
                    </Field>
                    <Field label={t.linkedin}>
                        <input type="url" placeholder={t.liPh} value={linkedin}
                            onChange={(e) => setLinkedin(e.target.value)} disabled={busy}
                            onKeyDown={(e) => { if (e.key === "Enter" && isValid) submit(); }} className={inputCls} />
                    </Field>
                </div>

                {error && (
                    <div className="mt-6 bg-[#fee2e2] border-2 border-[#ef4444] rounded-xl p-3.5 text-sm font-bold text-[#991b1b]">{error}</div>
                )}

                <div className="mt-10 sm:mt-14 flex justify-end">
                    <button disabled={!isValid || busy} onClick={submit}
                        className="bg-[#38bdf8] text-black px-7 sm:px-10 py-3.5 sm:py-5 rounded-full font-black uppercase text-base sm:text-lg flex items-center gap-2 sm:gap-3 border-2 sm:border-[3px] border-black shadow-[4px_4px_0_#111827] sm:shadow-[6px_6px_0_#111827] hover:-translate-y-1 transition-all disabled:opacity-50 active:translate-y-0">
                        {busy ? (<><Loader2 size={18} className="animate-spin" /> {t.parsing}</>) : (<>{t.cont} <ArrowRight size={18} /></>)}
                    </button>
                </div>
            </div>
        </div>
    );
}

const inputCls =
    "w-full bg-white border-2 sm:border-[3px] border-black rounded-xl sm:rounded-2xl p-3.5 sm:p-5 font-medium text-base sm:text-lg outline-none focus:shadow-[4px_4px_0_#38bdf8] sm:focus:shadow-[6px_6px_0_#38bdf8] transition-all disabled:opacity-50";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="font-black uppercase text-xs sm:text-sm mb-2 block">{label}</label>
            {children}
        </div>
    );
}
