"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { Send, X, Check } from "lucide-react";
import { API_URL, setUserId, setToken } from "../lib/api";
import { useLanguage } from "../lib/LanguageContext";

import { normalizeLinkedInUrl } from "../lib/utils";
import { saveLeadStep } from "../actions/saveLead";
import { registerVariant } from "../lib/analytics";
import { CITIES } from "../constants/cities";

const WA_NUMBER = process.env.NEXT_PUBLIC_WA_NUMBER || "17407301419";

// Города с запущенным флоу. Остальным — баннер «зови друзей».
const APPROVED_CITIES = ["toronto"];
const isApprovedCity = (c: string) =>
    APPROVED_CITIES.some((a) => c.trim().toLowerCase().includes(a));

// ----------------------------------------------------------------------------
//  A/B/C-тест воронки:
//    a — как было: сайт собирает базу → добор (ASK) в WhatsApp
//    b — сразу в WhatsApp: сайт только приветствует и ведёт в WA
//    c — всё на сайте: база + ASK-онбординг прямо в этом чате
//  ?v=a|b|c в URL переопределяет (для кампаний/тестов), иначе — ДЕФОЛТ B.
//  Вариант пишется в каждый шаг лида.
// ----------------------------------------------------------------------------
type Variant = "a" | "b" | "c";
const VARIANT_KEY = "coconect_ab_variant";
const DEFAULT_VARIANT: Variant = "b";

function pickVariant(): Variant {
    try {
        const q = (new URLSearchParams(window.location.search).get("v") || "").toLowerCase();
        if (q === "a" || q === "b" || q === "c") {
            localStorage.setItem(VARIANT_KEY, q);
            return q;
        }
        // Без ?v= — всегда дефолтная версия B (A/B-раздача выключена).
        return DEFAULT_VARIANT;
    } catch {
        return DEFAULT_VARIANT;
    }
}

// waCompact — компактная подача WA-ссылки (вариант B): кнопка «Text me in WhatsApp»
// + маленький QR справа, вместо большого QR под кнопкой.
type Msg = { from: "bot" | "user"; text: string; link?: string; waCompact?: boolean };
// firstName -> lastName -> searching (auto) -> pick | manual -> phone -> city -> (parsing | blocked) -> done
// вариант c: ... -> parsing -> onboard (ASK-диалог на сайте) -> done
type Step = "firstName" | "lastName" | "searching" | "pick" | "manual" | "phone" | "city" | "blocked" | "parsing" | "onboard" | "done";

type Candidate = {
    id: string;
    name: string;
    headline: string;
    location: string;
    photoUrl: string;
    profileUrl: string;
};

type Draft = { firstName: string; lastName: string; phone: string; linkedin: string; city: string };

// ----------------------------------------------------------------------------
//  Общий контекст чата: hero и попап рендерят ОДНО состояние (прогресс не
//  теряется, если закрыть попап — он остаётся виден в hero, и наоборот).
// ----------------------------------------------------------------------------
type ChatCtx = {
    messages: Msg[];
    step: Step;
    input: string;
    setInput: (v: string) => void;
    draft: Draft;
    candidates: Candidate[];
    selected: Candidate | null;
    botTyping: boolean;
    handleSend: () => void;
    handleCitySelect: (c: string) => void;
    pickCandidate: (c: Candidate) => void;
    repickProfile: () => void;
    noneOfThese: () => void;
    busy: boolean;
    showInput: boolean;
    placeholder: string;
    shareWa: string;
    shareX: string;
    // A/B/C-вариант и общая WA-ссылка (для «Text me» кнопок вне чата).
    variant: Variant | null;
    waLink: string;
    // popup
    isOpen: boolean;
    openPopup: () => void;
    closePopup: () => void;
};

const Ctx = createContext<ChatCtx | null>(null);
const useChat = (): ChatCtx => {
    const c = useContext(Ctx);
    if (!c) throw new Error("SignupChatProvider is missing");
    return c;
};
// Лёгкий хук для CTA-кнопок (Navbar / StickyCTA / hero / how-it-works):
// даёт открытие попапа, текущий A/B/C-вариант и общую WhatsApp-ссылку.
export const useSignupOpen = () => {
    const c = useContext(Ctx);
    return {
        open: c ? c.openPopup : () => { },
        variant: c ? c.variant : null,
        waLink: c ? c.waLink : `https://wa.me/${WA_NUMBER}`,
    };
};

export function SignupChatProvider({ children }: { children: React.ReactNode }) {
    const { t } = useLanguage();

    const [messages, setMessages] = useState<Msg[]>([]);
    const [step, setStep] = useState<Step>("firstName");
    const [input, setInput] = useState("");
    const [draft, setDraft] = useState<Draft>({ firstName: "", lastName: "", phone: "", linkedin: "", city: "" });
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [selected, setSelected] = useState<Candidate | null>(null);  // выбранный/авто-подобранный профиль (остаётся на экране)
    const [botTyping, setBotTyping] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    // A/B/C-вариант: назначаем только на клиенте (URL/localStorage), до этого — null.
    const [variant, setVariant] = useState<Variant | null>(null);
    // lk-токен из web_start — им авторизуются ходы ASK-онбординга (вариант c).
    const webTokenRef = useRef<string>("");
    useEffect(() => {
        const v = pickVariant();
        setVariant(v);
        registerVariant(v);   // тот же a|b|c уезжает в PostHog ко всем событиям
    }, []);

    // Stable id so every step updates the same lead row (capture drop-offs).
    const [leadId] = useState(() =>
        typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `lead_${Date.now()}_${Math.random().toString(36).slice(2)}`
    );
    function logLead(patch: { step: string; firstName?: string; lastName?: string; linkedin?: string; phone?: string; city?: string }) {
        void saveLeadStep({ leadId, variant: variant ?? undefined, ...patch }).catch(() => { });
    }

    // Первая последовательность бота — как только известен вариант.
    // Визит (вершина воронки) логируем здесь же, уже с вариантом.
    // Вариант B теперь WhatsApp-first: в hero рендерится QR + «Text me» (без чата),
    // поэтому здесь никакой диалог не запускаем — только логируем визит.
    useEffect(() => {
        if (!variant || messages.length > 0) return;
        logLead({ step: "visit" });
        if (variant === "b") return;
        setBotTyping(true);
        const id = setTimeout(() => {
            setBotTyping(false);
            // Варианты A и C: обычный онбординг-чат (имя → LinkedIn → телефон → город).
            setMessages([{ from: "bot", text: "Hey! I'm the CoConnect assistant 👋 I bring founders and builders together for small, curated dinners - usually 5–6 people." }]);
            simulateBot("Ready to get started? What's your full name?", 1200);
        }, 1200);
        return () => clearTimeout(id);
    }, [variant]); // eslint-disable-line react-hooks/exhaustive-deps

    // Сборка профиля может быть долгой — каждые 10с «я ещё тут».
    useEffect(() => {
        if (step !== "parsing") return;
        const lines = [
            "Still on it — building your profile ✨",
            "Hang tight, pulling everything together 🔍",
            "Almost there, just a few more seconds 🙌",
        ];
        let i = 0;
        const id = setInterval(() => {
            setMessages((m) => [...m, { from: "bot", text: lines[i % lines.length] }]);
            i++;
        }, 10000);
        return () => clearInterval(id);
    }, [step]);

    function simulateBot(text: string, delay: number, link?: string, waCompact?: boolean) {
        setBotTyping(true);
        setTimeout(() => {
            setBotTyping(false);
            setMessages((m) => [...m, { from: "bot", text, link, waCompact }]);
        }, delay);
    }

    async function checkReturning(
        body: { linkedin_url?: string; phone?: string }
    ): Promise<{ exists: boolean; name?: string; onboarding_completed?: boolean }> {
        try {
            const res = await fetch(`${API_URL}/onboarding/check`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            if (!res.ok) return { exists: false };
            return await res.json();
        } catch {
            return { exists: false };
        }
    }

    function showAlreadyRegistered(name?: string) {
        const fn = name ? ", " + name.split(" ")[0] : "";
        const waLink = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(t.signup.waMsg(name || ""))}`;
        setStep("done");
        simulateBot(
            `Looks like you're already registered${fn} 🤔 Either you mixed something up, or just message us on WhatsApp and we'll sort it out 👇`,
            900,
            waLink
        );
    }

    // Один ход ASK-онбординга на сайте (вариант c) — то же ядро, что в WhatsApp.
    async function webTurn(message: string): Promise<{ reply: string; done: boolean; lk?: string } | null> {
        try {
            const res = await fetch(`${API_URL}/onboarding/web_turn`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token: webTokenRef.current, message }),
            });
            if (!res.ok) return null;
            return await res.json();
        } catch {
            return null;
        }
    }

    async function handleOnboardTurn(text: string) {
        setBotTyping(true);
        const out = await webTurn(text);
        setBotTyping(false);
        if (!out) {
            simulateBot("Hmm, hiccup on my side — mind saying that again? 🙏", 600);
            return;
        }
        if (out.done) {
            setStep("done");
            logLead({ step: "onboarded" });
            if (out.reply) simulateBot(out.reply, 700);
            simulateBot(
                "You're all set 🎉 Here's your space — upcoming dinners, your connections and profile 👇",
                out.reply ? 1800 : 700,
                out.lk
            );
            return;
        }
        if (out.reply) simulateBot(out.reply, 700);
    }

    async function handleSend() {
        const text = input.trim();
        if (!text || step === "parsing" || step === "done" || step === "searching") return;
        setInput("");
        setMessages((m) => [...m, { from: "user", text }]);

        if (step === "onboard") {
            await handleOnboardTurn(text);
            return;
        }

        if (step === "firstName") {
            const parts = text.split(/\s+/).filter(Boolean);
            if (parts.length >= 2) {
                const fn = parts[0];
                const ln = parts.slice(1).join(" ");
                const next = { ...draft, firstName: fn, lastName: ln };
                setDraft(next);
                logLead({ step: "name", firstName: fn });
                logLead({ step: "surname", lastName: ln });
                await runSearch(fn, ln);
                return;
            }
            setDraft((d) => ({ ...d, firstName: text }));
            logLead({ step: "name", firstName: text });
            setStep("lastName");
            simulateBot(`Hey, ${text} 🙌 and your last name?`, 1000);
            return;
        }
        if (step === "lastName") {
            const next = { ...draft, lastName: text };
            setDraft(next);
            logLead({ step: "surname", lastName: text });
            await runSearch(next.firstName, next.lastName);
            return;
        }
        if (step === "pick") {
            // Юзер набрал цифру нужного профиля из списка тёзок.
            const n = parseInt(text.replace(/[^\d]/g, ""), 10);
            if (!n || n < 1 || n > candidates.length) {
                simulateBot(`Just the number of the one that's you — 1–${candidates.length} 🙏 (or tap a card above)`, 700);
                return;
            }
            await chooseCandidate(candidates[n - 1], true);  // auto=true: «цифра» уже как пузырь-выбор
            return;
        }
        if (step === "manual") {
            const normalizedUrl = normalizeLinkedInUrl(text);
            setDraft((d) => ({ ...d, linkedin: normalizedUrl }));
            logLead({ step: "linkedin", linkedin: normalizedUrl });
            const dup = await checkReturning({ linkedin_url: normalizedUrl });
            if (dup.exists) { showAlreadyRegistered(dup.name); return; }
            setStep("phone");
            simulateBot("Perfect. Last thing — your phone number *with country code* (same as WhatsApp, e.g. +1 416 555 0123)?", 1000);
            return;
        }
        if (step === "phone") {
            setDraft((d) => ({ ...d, phone: text }));
            logLead({ step: "phone", phone: text });
            const dup = await checkReturning({ phone: text });
            if (dup.exists) { showAlreadyRegistered(dup.name); return; }
            setStep("city");
            simulateBot("Last one — which city are you in?", 1000);
            return;
        }
        if (step === "city") {
            const next = { ...draft, city: text };
            setDraft(next);
            logLead({ step: "city", city: text });
            if (isApprovedCity(text)) {
                setStep("parsing");
                simulateBot("Building your profile... 🔍", 800);
                await finish(next);
            } else {
                setStep("blocked");
                simulateBot(`We're not live in ${text} yet — but you can change that 👇`, 900);
            }
        }
    }

    async function runSearch(firstName: string, lastName: string) {
        setStep("searching");
        simulateBot("Cool, let me find you on LinkedIn real quick 🔍", 600);
        try {
            const res = await fetch("/api/linkedin/search", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ firstName, lastName }),
            });
            const data = await res.json();
            const found: Candidate[] = res.ok && Array.isArray(data.candidates) ? data.candidates : [];
            if (found.length === 1) {
                // Однозначное совпадение — юзер уже назвал имя, не заставляем тапать: берём сразу.
                setCandidates(found);
                simulateBot("Found you on LinkedIn 👇", 700);
                await chooseCandidate(found[0], true);
            } else if (found.length > 1) {
                // Несколько тёзок — показываем пронумерованный список и просим написать цифру
                // (или тапнуть). Печатать цифру интуитивнее — юзер и так уже печатал.
                setCandidates(found);
                setStep("pick");
                simulateBot(`Found ${found.length} people with a similar name 👇 Which one's you? Reply with the number (1–${found.length}) — or just tap it.`, 900);
            } else {
                setStep("manual");
                simulateBot("Hmm, couldn't find you automatically. Paste your LinkedIn URL and we'll take it from there 🙏", 900);
            }
        } catch {
            setStep("manual");
            simulateBot("Search hiccup — just paste your LinkedIn URL and we'll continue 🙏", 900);
        }
    }

    async function handleCitySelect(selectedCity: string) {
        if (step !== "city") return;
        setInput("");
        setMessages((m) => [...m, { from: "user", text: selectedCity }]);
        const next = { ...draft, city: selectedCity };
        setDraft(next);
        logLead({ step: "city", city: selectedCity });
        if (isApprovedCity(selectedCity)) {
            setStep("parsing");
            simulateBot("Building your profile... 🔍", 800);
            await finish(next);
        } else {
            setStep("blocked");
            simulateBot(`We're not live in ${selectedCity} yet — but you can change that 👇`, 900);
        }
    }

    // Единая логика выбора кандидата. auto=true — подобрали за юзера (он уже назвал имя),
    // без user-пузыря «That's me»; карточку показываем закреплённой (см. SelectedProfileCard).
    async function chooseCandidate(c: Candidate, auto = false) {
        setSelected(c);
        setDraft((d) => ({ ...d, linkedin: c.profileUrl }));
        logLead({ step: "linkedin", linkedin: c.profileUrl });
        if (!auto) setMessages((m) => [...m, { from: "user", text: `That's me — ${c.name}` }]);
        const dup = await checkReturning({ linkedin_url: c.profileUrl });
        if (dup.exists) { showAlreadyRegistered(dup.name); return; }
        setStep("phone");
        simulateBot(
            (auto ? "Got you 🙌 " : "Got it! ") +
            "Last thing — your phone number *with country code* (same as WhatsApp, e.g. +1 416 555 0123)?",
            1000
        );
    }

    async function pickCandidate(c: Candidate) {
        if (step !== "pick") return;
        await chooseCandidate(c, false);
    }

    function repickProfile() {
        if (candidates.length === 0) return;
        setDraft((d) => ({ ...d, linkedin: "" }));
        setStep("pick");
        simulateBot("No worries — which one is actually you? 👇", 700);
    }

    function noneOfThese() {
        if (step !== "pick") return;
        setMessages((m) => [...m, { from: "user", text: "I'm not here" }]);
        setSelected(null);
        setCandidates([]);
        setStep("manual");
        simulateBot("No worries — paste your LinkedIn URL and we'll build it from that 👇", 800);
    }

    async function finish(data: Draft) {
        const fullName = `${data.firstName} ${data.lastName}`.trim();
        try {
            let liProfile: any = {};
            try {
                const liRes = await fetch("/api/linkedin", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ query: data.linkedin }),
                });
                const liData = await liRes.json();
                if (liRes.ok) liProfile = liData.profile ?? liData;
            } catch (e) {
                console.warn("LinkedIn parse failed, continuing:", e);
            }

            const res = await fetch(`${API_URL}/onboarding/web_start`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: fullName,
                    phone: data.phone,
                    city: data.city,
                    linkedin_url: data.linkedin,
                    linkedin_profile: liProfile,
                    variant: variant ?? undefined,
                }),
            });
            const out = await res.json();
            if (!res.ok) throw new Error(out?.detail || t.signup.errorGeneric);
            if (out.user_id) setUserId(out.user_id);
            setToken(out.token);
            logLead({ step: "done" });

            if (variant === "c") {
                // Вариант C: не уводим в WhatsApp — ASK-онбординг продолжается прямо здесь.
                webTokenRef.current = out.token || "";
                setStep("onboard");
                setBotTyping(true);
                const first = await webTurn("");   // пустой ход = персональный опенер
                setBotTyping(false);
                if (first?.reply) {
                    simulateBot("Profile's up ✅ Now the fun part — a few quick questions so we can build your perfect table 🙌", 600);
                    simulateBot(first.reply, 2000);
                } else {
                    // ядро диалога недоступно → фолбэк на добор в WhatsApp (как вариант a)
                    setStep("done");
                    const waLink = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(t.signup.waMsg(fullName))}`;
                    setMessages(m => [...m, { from: "bot", text: t.signup.doneHeader }]);
                    simulateBot(t.signup.doneSub, 1000, waLink);
                }
                return;
            }

            setStep("done");
            const waLink = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(
                t.signup.waMsg(fullName)
            )}`;

            setBotTyping(true);
            setTimeout(() => {
                setBotTyping(false);
                setMessages(m => [...m, { from: "bot", text: t.signup.doneHeader }]);
                simulateBot(t.signup.doneSub, 1000, waLink);
            }, 1500);

        } catch (e) {
            setStep("phone");
            simulateBot((e instanceof Error ? e.message : t.signup.errorGeneric) + " Please send your phone number again 🙏", 1000);
        }
    }

    const busy = step === "parsing" || step === "searching" || botTyping;
    const showInput = step === "firstName" || step === "lastName" || step === "pick" || step === "manual" || step === "phone" || step === "city" || step === "onboard";
    const placeholder =
        messages.length < 1 ? ""
            : step === "firstName" ? "John Smith"
                : step === "lastName" ? "Smith"
                    : step === "pick" ? "1"
                        : step === "manual" ? t.signup.linkedinPh
                            : step === "phone" ? t.signup.phonePh
                                : step === "city" ? "Toronto"
                                    : step === "onboard" ? "Type your answer…"
                                        : "";

    const siteUrl = typeof window !== "undefined" ? window.location.origin : "https://coconect.app";
    const inviteText = "Join me on Coconect, curated dinners with founders & builders.";
    const shareWa = `https://wa.me/?text=${encodeURIComponent(inviteText + " " + siteUrl)}`;
    const shareX = `https://twitter.com/intent/tweet?text=${encodeURIComponent(inviteText)}&url=${encodeURIComponent(siteUrl)}`;
    // Общая WA-ссылка для «Text me» CTA вне чата (hero/navbar/sticky в варианте B).
    const waLink = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent("Hey! I want to join the dinners 🙌")}`;

    const value: ChatCtx = {
        messages, step, input, setInput, draft, candidates, selected, botTyping,
        handleSend, handleCitySelect, pickCandidate, repickProfile, noneOfThese,
        busy, showInput, placeholder, shareWa, shareX,
        variant, waLink,
        isOpen, openPopup: () => setIsOpen(true), closePopup: () => setIsOpen(false),
    };

    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// ----------------------------------------------------------------------------
//  Презентационный чат (читает общий контекст). Один и тот же в hero и попапе.
// ----------------------------------------------------------------------------
function ChatBody({ topGap = true }: { topGap?: boolean }) {
    const c = useChat();
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
        }
    }, [c.input]);

    return (
        <div className={`w-full max-w-xl flex flex-col ${topGap ? "mt-16" : ""} space-y-4`}>

            {c.messages.map((m, i) => (
                <Bubble key={i} msg={m} />
            ))}

            {c.botTyping && (
                <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2">
                    <div className="bg-white border-[3px] border-black rounded-2xl rounded-tl-sm px-5 py-4 shadow-[4px_4px_0_#111827]">
                        <div className="flex gap-1.5 items-center h-4">
                            <div className="w-2.5 h-2.5 rounded-full bg-black animate-bounce"></div>
                            <div className="w-2.5 h-2.5 rounded-full bg-black animate-bounce delay-75"></div>
                            <div className="w-2.5 h-2.5 rounded-full bg-black animate-bounce delay-150"></div>
                        </div>
                    </div>
                </div>
            )}

            {!c.botTyping && c.step === "pick" && c.candidates.length > 0 && (
                <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2">
                    {c.candidates.map((cand, i) => (
                        <button
                            key={cand.id}
                            onClick={() => c.pickCandidate(cand)}
                            className="flex items-center gap-3 text-left bg-white border-[3px] border-black rounded-2xl p-3 shadow-[4px_4px_0_#111827] hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#111827] transition-all"
                        >
                            <div className="w-7 h-7 shrink-0 rounded-full bg-[#fde047] border-[2px] border-black flex items-center justify-center font-black text-sm text-black">
                                {i + 1}
                            </div>
                            {cand.photoUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={cand.photoUrl}
                                    alt={cand.name}
                                    className="w-14 h-14 rounded-xl border-[2px] border-black object-cover bg-gray-100 shrink-0"
                                    referrerPolicy="no-referrer"
                                />
                            ) : (
                                <div className="w-14 h-14 rounded-xl border-[2px] border-black bg-[#fde047] flex items-center justify-center font-black text-lg text-black shrink-0">
                                    {cand.name.charAt(0).toUpperCase()}
                                </div>
                            )}
                            <div className="min-w-0">
                                <div className="font-black text-sm text-[#111827] truncate">{cand.name}</div>
                                {cand.headline && <div className="font-bold text-xs text-gray-700 line-clamp-2">{cand.headline}</div>}
                                {cand.location && <div className="font-bold text-[11px] text-gray-400 truncate">{cand.location}</div>}
                            </div>
                        </button>
                    ))}
                    <button
                        onClick={c.noneOfThese}
                        className="self-start text-xs font-black uppercase text-gray-500 underline underline-offset-4 hover:text-black transition-colors mt-1"
                    >
                        None of these — paste my link
                    </button>
                </div>
            )}

            {!c.botTyping && c.step === "blocked" && (
                <div className="bg-white border-[3px] border-black rounded-2xl p-5 shadow-[4px_4px_0_#111827] animate-in fade-in slide-in-from-bottom-2">
                    <div className="font-black uppercase text-sm mb-1">Not enough people in {c.draft.city || "your city"} yet</div>
                    <p className="font-bold text-sm text-gray-600 mb-4">Coconect runs where there&apos;s a crowd. Invite a few friends and we&apos;ll launch in your city 🚀</p>
                    <div className="flex flex-wrap gap-2">
                        <a href={c.shareWa} target="_blank" rel="noopener noreferrer" className="bg-[#22c55e] text-black px-4 py-2.5 rounded-full font-black uppercase text-xs border-[3px] border-black shadow-[3px_3px_0_#111827] hover:-translate-y-0.5 transition-all">Invite on WhatsApp</a>
                        <a href={c.shareX} target="_blank" rel="noopener noreferrer" className="bg-black text-white px-4 py-2.5 rounded-full font-black uppercase text-xs border-[3px] border-black shadow-[3px_3px_0_#111827] hover:-translate-y-0.5 transition-all">Share on X</a>
                    </div>
                </div>
            )}

            {!c.botTyping && c.selected && c.step !== "pick" && (
                <SelectedProfileCard
                    cand={c.selected}
                    onRepick={c.repickProfile}
                    canRepick={c.candidates.length > 0 && (c.step === "phone" || c.step === "city")}
                />
            )}

            {!c.botTyping && c.showInput && c.messages.length >= 1 && (
                <div className="flex justify-end animate-in fade-in slide-in-from-bottom-2 relative">
                    <div className="relative w-full max-w-[85%]">
                        {c.step === "city" && c.input.trim().length > 0 && (
                            <div className="absolute bottom-full right-0 mb-3 w-full bg-white border-[3px] border-black rounded-2xl shadow-[4px_4px_0_#111827] overflow-hidden flex flex-col z-10 animate-in fade-in slide-in-from-bottom-2">
                                {CITIES.filter(city => city.toLowerCase().includes(c.input.trim().toLowerCase())).map(city => (
                                    <button
                                        key={city}
                                        onClick={() => c.handleCitySelect(city)}
                                        className="text-left px-5 py-3 font-bold text-sm text-black hover:bg-[#fde047] hover:pl-6 transition-all border-b-[2px] border-black/10 last:border-b-0"
                                    >
                                        {city}
                                    </button>
                                ))}
                            </div>
                        )}
                        <textarea
                            ref={textareaRef}
                            value={c.input}
                            onChange={(e) => c.setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    c.handleSend();
                                }
                            }}
                            placeholder={c.placeholder}
                            disabled={c.busy}
                            rows={1}
                            className="block w-full bg-[#fde047] text-black border-[3px] border-black rounded-3xl rounded-tr-sm pl-5 pr-14 py-3.5 font-bold text-sm shadow-[4px_4px_0_#111827] outline-none resize-none overflow-hidden placeholder:text-black/60 focus:bg-[#facc15] transition-colors focus:shadow-[6px_6px_0_#111827] disabled:opacity-50"
                        />
                        <button
                            onClick={c.handleSend}
                            disabled={c.busy || !c.input.trim()}
                            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white border-[2px] border-black flex items-center justify-center hover:bg-gray-100 transition-all disabled:opacity-40"
                            aria-label="Send"
                        >
                            <Send size={16} className="text-black ml-0.5" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// Hero-вариант (как раньше, default export — LandingHero его импортирует).
export default function HeroSignupChat() {
    return <ChatBody />;
}

// Попап с тем же чатом (общее состояние через контекст).
export function SignupPopup() {
    const { isOpen, closePopup } = useChat();
    if (!isOpen) return null;
    return (
        <div
            className="fixed inset-0 z-[100] flex items-end md:items-center justify-center md:bg-black/60 md:backdrop-blur-sm animate-in fade-in duration-200 p-0 md:p-6"
            onClick={closePopup}
        >
            {/* Мобайл — пузырьки чата «плавают» над тёплым полупрозрачным градиентом (как hero),
                с тёмным виньетированием по краям; десктоп — белая карточка по центру. */}
            <div
                className="relative w-full h-[100dvh] md:w-auto md:max-w-md md:h-[88vh] flex flex-col overflow-hidden
                    bg-gradient-to-b from-[#fef3c7]/90 via-[#fafafa]/90 to-[#fde2e7]/90
                    shadow-[inset_0_0_110px_35px_rgba(0,0,0,0.22)]
                    md:border-[4px] md:border-black md:rounded-3xl md:shadow-[inset_0_0_110px_35px_rgba(0,0,0,0.22),10px_10px_0_#000]
                    animate-in slide-in-from-bottom-10 md:zoom-in-95 duration-300 ease-out will-change-transform"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={closePopup}
                    aria-label="Close"
                    className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-white border-[3px] border-black flex items-center justify-center shadow-[3px_3px_0_#111827] hover:rotate-90 transition-transform"
                >
                    <X size={20} className="text-black" />
                </button>
                {/* Тап по пустому месту (вне сообщений) закрывает попап */}
                <div
                    className="relative z-10 flex-1 overflow-y-auto px-5 pt-16 pb-10 md:pt-14 md:pb-6 md:w-[26rem]"
                    onClick={closePopup}
                >
                    <div onClick={(e) => e.stopPropagation()}>
                        <ChatBody topGap={false} />
                    </div>
                </div>
            </div>
        </div>
    );
}

// Закреплённая карточка выбранного профиля — остаётся на экране после подбора/выбора,
// с зелёной галочкой; «Not you?» ведёт обратно к списку (если есть из чего выбирать).
function SelectedProfileCard({ cand, onRepick, canRepick }: { cand: Candidate; onRepick: () => void; canRepick: boolean }) {
    return (
        <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2">
            <div className="relative flex items-center gap-3 bg-white border-[3px] border-black rounded-2xl p-3 shadow-[4px_4px_0_#111827]">
                <div className="absolute -top-2.5 -right-2.5 w-7 h-7 rounded-full bg-[#22c55e] border-[2px] border-black flex items-center justify-center shadow-[2px_2px_0_#111827]">
                    <Check size={15} className="text-black" strokeWidth={3} />
                </div>
                {cand.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={cand.photoUrl}
                        alt={cand.name}
                        className="w-14 h-14 rounded-xl border-[2px] border-black object-cover bg-gray-100 shrink-0"
                        referrerPolicy="no-referrer"
                    />
                ) : (
                    <div className="w-14 h-14 rounded-xl border-[2px] border-black bg-[#fde047] flex items-center justify-center font-black text-lg text-black shrink-0">
                        {cand.name.charAt(0).toUpperCase()}
                    </div>
                )}
                <div className="min-w-0">
                    <div className="font-black text-sm text-[#111827] truncate">{cand.name}</div>
                    {cand.headline && <div className="font-bold text-xs text-gray-700 line-clamp-2">{cand.headline}</div>}
                    {cand.location && <div className="font-bold text-[11px] text-gray-400 truncate">{cand.location}</div>}
                </div>
            </div>
            {canRepick && (
                <button
                    onClick={onRepick}
                    className="self-start text-xs font-black uppercase text-gray-500 underline underline-offset-4 hover:text-black transition-colors"
                >
                    ↩ Not you? Pick again
                </button>
            )}
        </div>
    );
}

// Компакт (вариант B): пузырь с текстом и кнопкой, QR — отдельной карточкой справа,
// РОВНО по высоте пузыря. Высоту меряем ResizeObserver'ом (CSS aspect-ratio во флексе
// схлопывался в 0 / растягивал ряд). На мобиле QR прячем — юзер уже на телефоне.
function CompactWaBubble({ text, link }: { text: string; link: string }) {
    const bubbleRef = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState(0);

    useEffect(() => {
        const el = bubbleRef.current;
        if (!el) return;
        const measure = () => setSize(el.offsetHeight);
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    return (
        <div className="flex justify-start gap-3 animate-in fade-in slide-in-from-bottom-2">
            <div
                ref={bubbleRef}
                className="bg-white text-[#111827] border-[3px] border-black rounded-3xl rounded-tl-sm px-5 py-3.5 flex-1 min-w-0 font-bold text-sm shadow-[4px_4px_0_#111827] whitespace-pre-wrap self-start"
            >
                {text}
                <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 flex items-center justify-center gap-2 bg-[#22c55e] text-black font-black uppercase text-xs py-3 px-4 rounded-2xl border-[3px] border-black shadow-[4px_4px_0_#111827] hover:-translate-y-1 transition-all"
                >
                    Text me in WhatsApp →
                </a>
            </div>
            {size > 0 && (
                <div
                    className="hidden sm:flex shrink-0 items-center justify-center bg-white border-[3px] border-black rounded-2xl p-2 shadow-[4px_4px_0_#111827]"
                    style={{ width: size, height: size }}
                    title="Scan with your phone 📱"
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=0&data=${encodeURIComponent(link)}`}
                        alt="Scan to open WhatsApp"
                        className="w-full h-full rounded-lg bg-white"
                    />
                </div>
            )}
        </div>
    );
}

function Bubble({ msg }: { msg: Msg }) {
    if (msg.from === "user") {
        return (
            <div className="flex justify-end animate-in fade-in slide-in-from-bottom-2">
                <div className="bg-[#fde047] text-black border-[3px] border-black rounded-3xl rounded-tr-sm px-5 py-3.5 max-w-[85%] font-bold text-sm shadow-[4px_4px_0_#111827] whitespace-pre-wrap">
                    {msg.text}
                </div>
            </div>
        );
    }
    const isWa = !!msg.link && /wa\.me|whatsapp/i.test(msg.link);
    const compact = isWa && !!msg.waCompact;

    if (compact && msg.link) {
        return <CompactWaBubble text={msg.text} link={msg.link} />;
    }

    return (
        <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2">
            <div className="bg-white text-[#111827] border-[3px] border-black rounded-3xl rounded-tl-sm px-5 py-3.5 max-w-[85%] font-bold text-sm shadow-[4px_4px_0_#111827] whitespace-pre-wrap">
                {msg.text}
                {msg.link && (
                    <a
                        href={msg.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 flex items-center justify-center gap-2 bg-[#22c55e] text-black font-black uppercase text-xs py-3 px-5 rounded-2xl border-[3px] border-black shadow-[4px_4px_0_#111827] hover:-translate-y-1 transition-all"
                    >
                        {isWa ? "Continue in WhatsApp →" : "Open my dashboard →"}
                    </a>
                )}
                {isWa && (
                    <div className="mt-4 flex flex-col items-center gap-2 bg-[#fafafa] border-[3px] border-black rounded-2xl p-4 shadow-[4px_4px_0_#111827]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=0&data=${encodeURIComponent(msg.link!)}`}
                            alt="Scan to open WhatsApp"
                            width={180}
                            height={180}
                            className="w-[180px] h-[180px] rounded-lg bg-white"
                        />
                        <span className="font-black uppercase text-[11px] text-gray-500 tracking-wide text-center">
                            Or scan with your phone 📱
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
