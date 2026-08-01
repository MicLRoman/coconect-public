"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ChevronLeft, CheckCircle2, Loader2, CalendarCheck, Users } from 'lucide-react';
import { API_URL, getUserId } from '../../../../lib/api';

export default function ConfirmAttendance() {
  const router = useRouter();
  const { id: eventId } = useParams<{ id: string }>();

  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/events/${eventId}/details?user_id=${getUserId()}`);
        if (res.ok) setDetails(await res.json());
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [eventId]);

  const confirm = async () => {
    setSubmitting(true);
    try {
      await fetch(`${API_URL}/events/${eventId}/confirm`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: getUserId() }),
      });
      setDone(true);
    } catch (e) { console.error(e); }
    finally { setSubmitting(false); }
  };

  if (loading) return <div className="fixed inset-0 flex items-center justify-center bg-[#fafafa]"><Loader2 className="animate-spin text-[#e11d48]" size={40} /></div>;

  if (done || details?.is_confirmed) {
    return (
      <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center p-8 text-center bg-[#fafafa]">
        <div className="w-28 h-28 bg-[#34d399] border-[4px] border-black rounded-[2rem] flex items-center justify-center mb-8 shadow-[8px_8px_0_#111827] -rotate-3">
          <CheckCircle2 size={52} className="text-black" />
        </div>
        <h1 className="text-5xl font-black uppercase tracking-tighter text-[#111827] mb-4 leading-none">See you there!</h1>
        <p className="text-sm font-bold text-gray-500 mb-12 max-w-xs uppercase tracking-wide leading-relaxed">Your seat is locked. We'll send the exact spot 12h before.</p>
        <button onClick={() => router.back()} className="w-full max-w-xs py-4 bg-[#111827] text-white rounded-2xl font-black uppercase text-sm border-[3px] border-black shadow-[6px_6px_0_#34d399] hover:-translate-y-1 transition-all">Back to pools</button>
      </div>
    );
  }

  const ev = details?.event || {};

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-[#fafafa]">
      <div className="px-5 pt-10 pb-4 flex items-center gap-3 border-b-[3px] border-black">
        <button onClick={() => router.back()} className="w-10 h-10 bg-white border-[3px] border-black rounded-full flex items-center justify-center shadow-[2px_2px_0_#000]"><ChevronLeft size={20} strokeWidth={3} /></button>
        <h2 className="font-black uppercase text-lg">Confirm attendance</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pt-8 pb-36 max-w-lg mx-auto w-full">
        <div className="w-16 h-16 bg-[#fde047] border-[3px] border-black rounded-2xl flex items-center justify-center mb-6 shadow-[4px_4px_0_#000]"><CalendarCheck size={30} className="text-black" /></div>
        <h1 className="text-4xl font-black uppercase tracking-tighter text-[#111827] leading-none mb-3">Are you<br />coming?</h1>
        <p className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-8">Confirm so we can lock your seat and finalize the table.</p>

        <div className="bg-white p-5 rounded-3xl border-[3px] border-black shadow-[4px_4px_0_#000] mb-4">
          <h3 className="font-black uppercase text-lg leading-none mb-2">{ev.title}</h3>
          <div className="flex flex-wrap gap-2">
            <span className="bg-[#fde047] border-2 border-black font-black uppercase text-[10px] px-3 py-1.5 shadow-[2px_2px_0_#000]">{ev.event_date}</span>
            <span className="bg-white border-2 border-black font-black uppercase text-[10px] px-3 py-1.5 shadow-[2px_2px_0_#000]">{ev.start_time}</span>
          </div>
        </div>

        {details?.group_revealed && details.group?.length > 0 && (
          <div className="bg-white p-5 rounded-3xl border-[3px] border-black shadow-[4px_4px_0_#38bdf8]">
            <h3 className="font-black uppercase text-sm mb-3 flex items-center gap-2 text-[#38bdf8]"><Users size={16} /> {details.group.length} at your table</h3>
            <div className="flex flex-wrap gap-2">
              {details.group.map((p: any, i: number) => (
                <div key={p.user_id || i} className="w-10 h-10 rounded-lg bg-[#111827] text-white border-2 border-black flex items-center justify-center font-black text-sm">{(p.name || p.role || p.headline || '?')[0]}</div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 w-full px-5 pb-8 pt-6 bg-gradient-to-t from-[#fafafa] via-[#fafafa] to-transparent">
        <div className="max-w-lg mx-auto">
          <button onClick={confirm} disabled={submitting} className="w-full py-4 bg-[#34d399] text-black rounded-2xl font-black uppercase text-sm tracking-widest border-[3px] border-black shadow-[6px_6px_0_#111827] hover:-translate-y-1 transition-all flex justify-center items-center gap-2.5 disabled:opacity-50">
            {submitting ? <Loader2 className="animate-spin" size={18} /> : <><CheckCircle2 size={18} /> I'll be there</>}
          </button>
        </div>
      </div>
    </div>
  );
}
