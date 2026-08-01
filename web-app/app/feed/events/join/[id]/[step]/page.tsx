"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { MapPin, Wallet, Utensils, ChevronLeft, Loader2, Check, PartyPopper, X } from 'lucide-react';
import { API_URL, getUserId } from '../../../../../lib/api';
import { getNeighborhoodsForCity } from '../../../../../constants/cities';
import { FeedGradient } from '../../../../components/popart';

const STEP_META = [
  { icon: MapPin, label: 'Area', accent: 'bg-[#e11d48]' },
  { icon: Wallet, label: 'Budget', accent: 'bg-[#38bdf8]' },
  { icon: Utensils, label: 'Diet', accent: 'bg-[#c084fc]' },
];

const BUDGET_OPTIONS = [
  { label: '$ (Under 30)', sub: 'Easy-going' },
  { label: '$$ (Under 70)', sub: 'Balanced' },
  { label: '$$$ (No limit)', sub: 'Premium' },
];

const DIET_OPTIONS = [
  { label: 'No restrictions', sub: 'Anything works' },
  { label: 'Vegetarian', sub: 'No meat' },
  { label: 'Vegan', sub: 'Plant-based only' },
  { label: 'Gluten-free', sub: 'GF menu' },
];

export default function JoinEventStep() {
  const router = useRouter();
  const { id: eventId, step } = useParams<{ id: string; step: string }>();
  const currentStep = parseInt(step) || 1;

  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [neighborhoods, setNeighborhoods] = useState<string[]>([]);

  const [answers, setAnswers] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem(`join_env_${eventId}`);
      return saved ? JSON.parse(saved) : { budget: '$$ (Under 70)', diet: 'No restrictions', neighborhood: '' };
    }
    return { budget: '$$ (Under 70)', diet: 'No restrictions', neighborhood: '' };
  });
  const [tempSelection, setTempSelection] = useState('');

  useEffect(() => {
    if (currentStep === 1) setTempSelection(answers.neighborhood);
    if (currentStep === 2) setTempSelection(answers.budget);
    if (currentStep === 3) setTempSelection(answers.diet);
  }, [currentStep, answers]);

  useEffect(() => {
    const load = async () => {
      try {
        const userId = getUserId();
        const res = await fetch(`${API_URL}/events/${eventId}/details?user_id=${userId}`);
        const json = await res.json();
        if (json.status === 'success') {
          setEvent(json.event);
          const list = getNeighborhoodsForCity(json.event.city);
          setNeighborhoods(list);
          setAnswers((prev: any) => (!prev.neighborhood && list.length ? { ...prev, neighborhood: list[0] } : prev));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [eventId]);

  const askBudget = event?.ask_budget !== false;
  const askDiet = event?.ask_diet !== false;

  const finalize = async (finalAnswers: any) => {
    setActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/events/${eventId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: getUserId(), preferences: finalAnswers }),
      });
      if (res.ok) {
        sessionStorage.removeItem(`join_env_${eventId}`);
        router.push(`/feed/events/join/${eventId}/success`);
      } else if (res.status === 402 || res.status === 403) {
        router.push('/checkout');
      } else {
        alert('Could not join. Try again.');
        setActionLoading(false);
      }
    } catch (e) {
      console.error(e);
      setActionLoading(false);
    }
  };

  // Picking an option saves it and advances (no bottom CTA).
  const handleSelect = (value: string) => {
    setTempSelection(value);
    const field = currentStep === 1 ? 'neighborhood' : currentStep === 2 ? 'budget' : 'diet';
    const updated = { ...answers, [field]: value };
    setAnswers(updated);
    sessionStorage.setItem(`join_env_${eventId}`, JSON.stringify(updated));
    setTimeout(() => {
      if (currentStep === 1) {
        if (askBudget) router.push(`/feed/events/join/${eventId}/2`);
        else if (askDiet) router.push(`/feed/events/join/${eventId}/3`);
        else finalize(updated);
      } else if (currentStep === 2) {
        if (askDiet) router.push(`/feed/events/join/${eventId}/3`);
        else finalize(updated);
      } else {
        finalize(updated);
      }
    }, 180);
  };

  if ((loading || !event) && step !== 'success') {
    return (
      <div className="fixed inset-0 bg-[#fafafa] overflow-hidden">
        <FeedGradient tab="events" />
        <div className="relative z-10 h-full flex items-center justify-center"><Loader2 className="animate-spin text-[#e11d48]" size={40} /></div>
      </div>
    );
  }

  // ---- Success ----
  if (step === 'success') {
    return (
      <div className="fixed inset-0 z-[200] bg-[#fafafa] overflow-hidden font-sans">
        <FeedGradient tab="events" />
        <div className="relative z-10 h-full flex flex-col items-center justify-center p-8 text-center">
          <div className="w-28 h-28 bg-[#4ade80] border-[4px] border-black rounded-[2rem] flex items-center justify-center mb-8 shadow-[8px_8px_0_#000] rotate-3 animate-pop-float">
            <PartyPopper size={52} className="text-black" />
          </div>
          <span className="bg-[#fde047] border-[3px] border-black font-black uppercase text-[11px] px-4 py-1.5 mb-6 shadow-[3px_3px_0_#000] rounded-full">
            You're in the pool
          </span>
          <h1 className="text-6xl font-black uppercase tracking-tighter text-black mb-4 leading-none">You're in!</h1>
          <p className="text-sm font-black text-gray-500 mb-12 max-w-xs leading-relaxed uppercase tracking-wide">
            We'll reveal your table and the exact spot 24h before.
          </p>
          <button
            onClick={() => router.back()}
            className="w-full max-w-xs py-4 bg-[#111827] text-white rounded-full font-black uppercase text-sm border-[4px] border-black shadow-[6px_6px_0_#e11d48] hover:-translate-y-1 transition-all"
          >
            Back to pools
          </button>
        </div>
      </div>
    );
  }

  const kicker = currentStep === 1 ? 'Step 1 · Location' : currentStep === 2 ? 'Step 2 · Budget' : 'Step 3 · Diet';
  const title = currentStep === 1 ? ['Where\'s', 'best for you?'] : currentStep === 2 ? ['Your', 'budget'] : ['Any food', 'restrictions?'];
  const sub = currentStep === 1 ? `Pick an area in ${event.city || 'your city'}` : currentStep === 2 ? "We'll pick a spot that fits everyone" : "We'll brief the restaurant ahead";
  const StepIcon = STEP_META[currentStep - 1].icon;

  const options: { label: string; sub?: string }[] =
    currentStep === 1 ? (neighborhoods.length > 0 ? neighborhoods.map(n => ({ label: n })) : [{ label: 'Anywhere', sub: 'No preference' }])
      : currentStep === 2 ? BUDGET_OPTIONS
        : DIET_OPTIONS;

  return (
    <div className="fixed inset-0 z-[200] bg-[#fafafa] overflow-hidden font-sans flex flex-col">
      <FeedGradient tab="events" />

      {/* Header — glass bar with step pills */}
      <div className="relative z-20 px-5 pt-10 pb-3">
        <div className="bg-white/55 backdrop-blur-xl border-[3px] border-black rounded-[2rem] px-2.5 py-2 shadow-[5px_5px_0_#000] flex items-center justify-between gap-2">
          <button onClick={() => router.back()} className="w-10 h-10 bg-white border-[3px] border-black rounded-full flex items-center justify-center shadow-[2px_2px_0_#000] shrink-0">
            <ChevronLeft size={20} strokeWidth={3} />
          </button>
          <div className="flex items-center gap-1.5">
            {STEP_META.map((s, idx) => {
              const n = idx + 1;
              const active = currentStep === n;
              const done = currentStep > n;
              const SIcon = s.icon;
              return (
                <div key={n} className={`flex items-center gap-1.5 h-8 rounded-full border-[3px] border-black overflow-hidden transition-all ${active ? `${s.accent} px-3` : done ? 'bg-[#4ade80] px-2' : 'bg-white px-2'}`}>
                  {done ? <Check size={12} strokeWidth={4} className="text-black" /> : <SIcon size={12} className={active ? 'text-white' : 'text-black'} />}
                  {active && <span className="text-[10px] font-black uppercase text-white whitespace-nowrap">{s.label}</span>}
                </div>
              );
            })}
          </div>
          <button onClick={() => router.back()} className="w-10 h-10 bg-white border-[3px] border-black rounded-full flex items-center justify-center shadow-[2px_2px_0_#000] shrink-0">
            <X size={18} strokeWidth={3} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 overflow-y-auto hide-scrollbar px-5 pt-6 pb-12">
        <div className="max-w-lg mx-auto w-full">
          <p className="text-[11px] font-black uppercase tracking-[0.25em] mb-3 text-[#e11d48]">{kicker}</p>
          <h2 className="text-5xl font-black uppercase tracking-tighter text-black leading-[0.9] mb-3">{title[0]}<br />{title[1]}</h2>
          <p className="text-sm font-black text-gray-500 uppercase tracking-wide mb-8">{sub}</p>

          {actionLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="animate-spin text-[#e11d48]" size={36} /></div>
          ) : (
            <div className="flex flex-col gap-3">
              {options.map(opt => {
                const sel = tempSelection === opt.label;
                return (
                  <button
                    key={opt.label}
                    onClick={() => handleSelect(opt.label)}
                    className={`w-full text-left rounded-[1.5rem] border-[3px] border-black px-5 py-4 flex items-center justify-between transition-all ${sel ? 'bg-[#fde047] shadow-[5px_5px_0_#000] -translate-y-0.5' : 'bg-white shadow-[4px_4px_0_#000] hover:-translate-y-0.5'}`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className={`w-11 h-11 rounded-[1rem] border-[3px] border-black flex items-center justify-center shrink-0 ${sel ? 'bg-black text-[#fde047]' : 'bg-[#fafafa] text-black'}`}>
                        <StepIcon size={18} />
                      </div>
                      <div>
                        <div className="font-black uppercase text-base text-black tracking-tighter">{opt.label}</div>
                        {opt.sub && <div className="text-[11px] font-black uppercase tracking-widest text-gray-500">{opt.sub}</div>}
                      </div>
                    </div>
                    <div className={`w-7 h-7 rounded-full border-[3px] border-black flex items-center justify-center shrink-0 ${sel ? 'bg-[#e11d48]' : 'bg-white'}`}>
                      {sel && <Check size={14} className="text-white" strokeWidth={4} />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
