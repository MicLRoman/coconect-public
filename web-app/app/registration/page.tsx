"use client";

import React, { useState, Suspense } from 'react';
import { ArrowRight, Shield, Phone, KeyRound, Loader2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { API_URL, setUserId, setToken } from '../lib/api';

function RegisterInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const mode = (searchParams.get('mode') as 'login' | 'signup') || 'signup';

  const [stage, setStage] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accent = mode === 'signup' ? '#e11d48' : '#38bdf8';

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/auth/send_code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      if (!res.ok) throw new Error('Could not send the code. Check the number.');
      setStage('code');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const ingestOnboarding = async (): Promise<string | null> => {
    const raw = sessionStorage.getItem('tablr_onboarding_complete')
      || sessionStorage.getItem('tablr_onboarding_draft');
    if (!raw) return null;
    const o = JSON.parse(raw);

    const payload = {
      phone,
      user_profile: {
        basic_info: {
          name: o.basic_info?.name || '',
          age: o.basic_info?.age ? parseInt(o.basic_info.age, 10) : null,
          city: o.basic_info?.city || '',
          district: o.basic_info?.neighborhood || '',
          languages: o.basic_info?.languages || [],
          phone,
        },
        gives: {
          education: o.gives?.education || '',
          experience_level: o.gives?.experience_level || [],
          industry: o.gives?.industry || [],
          hard_skills: o.gives?.hard_skills || [],
          current_status: o.gives?.current_status || { type: '', company_name: '', stage: '' },
          work_style: o.gives?.work_style || { pace: 5, social_battery: '' },
        },
        asks: { custom_request_raw: o.asks?.custom_request_raw || '' },
      },
    };

    const res = await fetch(`${API_URL}/smart_ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to sync your profile with the engine.');
    const data = await res.json();
    setToken(data.token);
    sessionStorage.removeItem('tablr_onboarding_complete');
    sessionStorage.removeItem('tablr_onboarding_draft');
    return data.user_id;
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/auth/verify_code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      });
      if (!res.ok) throw new Error('Wrong code. Try again.');
      const data = await res.json();

      // Already has an account → log in.
      if (!data.is_new && data.user_id) {
        setToken(data.token);
        setUserId(data.user_id);
        router.push(data.onboarding_completed ? '/feed' : '/onboarding');
        return;
      }

      // New phone. Need onboarding answers to create the profile.
      const newId = await ingestOnboarding();
      if (newId) {
        setUserId(newId);
        router.push('/feed');
      } else {
        // No onboarding data yet → send them through onboarding first.
        router.push('/onboarding');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-6 selection:bg-[#e11d48] selection:text-white">
      <div className="w-full max-w-xl">
        <div className="inline-flex items-center gap-2 bg-black text-white px-4 py-2 rounded-full font-bold text-xs uppercase tracking-widest mb-6 shadow-[3px_3px_0px_0px_#fde047]">
          <Shield size={14} className="text-[#fde047]" /> Secure Gateway
        </div>

        <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase mb-4 text-[#111827] leading-[0.9]">
          {mode === 'signup' ? (
            <>Join<br /><span className="text-[#e11d48]">Network.</span></>
          ) : (
            <>Welcome<br /><span className="text-[#38bdf8]">Back.</span></>
          )}
        </h1>
        <p className="font-bold text-gray-500 mb-8 uppercase text-xs tracking-widest">
          {stage === 'phone' ? 'Verify with your phone number' : `Code sent to ${phone}`}
        </p>

        {error && (
          <div className="bg-red-100 border-2 border-red-500 text-red-700 p-4 rounded-xl font-bold mb-6">
            {error}
          </div>
        )}

        <form
          onSubmit={stage === 'phone' ? sendCode : verifyCode}
          className="bg-white border-[4px] border-black p-8 md:p-10 rounded-[2rem] shadow-[12px_12px_0px_0px_#111827]"
        >
          {stage === 'phone' ? (
            <div>
              <label className="font-black uppercase text-sm flex items-center gap-2 mb-2 text-[#111827]">
                <Phone size={16} /> Phone Number
              </label>
              <input
                type="tel" required autoFocus
                className="w-full bg-[#fafafa] text-black border-[3px] border-black rounded-xl px-5 py-4 font-bold text-lg outline-none focus:border-[#e11d48] transition-colors shadow-[4px_4px_0px_0px_#000]"
                placeholder="+1 (555) 000-0000"
                value={phone}
                onChange={e => setPhone(e.target.value)}
              />
            </div>
          ) : (
            <div>
              <label className="font-black uppercase text-sm flex items-center gap-2 mb-2 text-[#111827]">
                <KeyRound size={16} /> Verification Code
              </label>
              <input
                type="text" inputMode="numeric" required autoFocus maxLength={6}
                className="w-full bg-[#fafafa] text-black border-[3px] border-black rounded-xl px-5 py-4 font-black text-3xl tracking-[0.5em] text-center outline-none focus:border-[#38bdf8] transition-colors shadow-[4px_4px_0px_0px_#000]"
                placeholder="0000"
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
              />
              <p className="text-xs font-bold text-gray-400 mt-3 uppercase tracking-wide">
                Dev mode: any code works (try <span className="text-black">0000</span>).
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            style={{ background: accent }}
            className="w-full mt-10 py-5 text-white font-black uppercase text-xl rounded-2xl border-[4px] border-black shadow-[8px_8px_0px_0px_#111827] hover:-translate-y-1 transition-all flex items-center justify-between px-8 disabled:opacity-70"
          >
            {isSubmitting ? 'Working...' : (stage === 'phone' ? 'Send Code' : 'Verify & Enter')}
            {isSubmitting ? <Loader2 size={24} className="animate-spin" /> : <ArrowRight size={24} />}
          </button>

          {stage === 'code' && (
            <button
              type="button"
              onClick={() => { setStage('phone'); setCode(''); setError(null); }}
              className="w-full mt-4 py-2 font-black uppercase text-xs text-gray-400 hover:text-black"
            >
              ← Change number
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#fafafa]"><Loader2 className="animate-spin text-[#e11d48]" size={40} /></div>}>
      <RegisterInner />
    </Suspense>
  );
}
