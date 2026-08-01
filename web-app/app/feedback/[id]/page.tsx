"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ChevronLeft, Star, Check, X, Loader2, Heart, Sparkles } from 'lucide-react';
import { API_URL, getUserId } from '../../lib/api';

export default function FeedbackPage() {
  const router = useRouter();
  const { id: eventId } = useParams<{ id: string }>();

  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const [rating, setRating] = useState(0);
  // user_id -> 'yes' | 'no' | undefined
  const [votes, setVotes] = useState<Record<string, 'yes' | 'no'>>({});
  const [note, setNote] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/events/${eventId}/candidates?user_id=${getUserId()}`);
        if (res.ok) {
          const data = await res.json();
          setCandidates(data.candidates || []);
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [eventId]);

  const setVote = (uid: string, v: 'yes' | 'no') =>
    setVotes(prev => ({ ...prev, [uid]: prev[uid] === v ? undefined as any : v }));

  const submit = async () => {
    setSubmitting(true);
    try {
      const liked = Object.entries(votes).filter(([, v]) => v === 'yes').map(([k]) => k);
      const disliked = Object.entries(votes).filter(([, v]) => v === 'no').map(([k]) => k);
      await fetch(`${API_URL}/events/${eventId}/reviews`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewer_id: getUserId(), rating,
          liked_users: liked, disliked_users: disliked,
          moderation_note: note,
        }),
      });
      setDone(true);
    } catch (e) { console.error(e); }
    finally { setSubmitting(false); }
  };

  if (loading) return <div className="fixed inset-0 flex items-center justify-center bg-[#fafafa]"><Loader2 className="animate-spin text-[#e11d48]" size={40} /></div>;

  if (done) {
    return (
      <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center p-8 text-center bg-[#fafafa]">
        <div className="w-28 h-28 bg-[#e11d48] border-[4px] border-black rounded-[2rem] flex items-center justify-center mb-8 shadow-[8px_8px_0_#111827] rotate-3">
          <Sparkles size={52} className="text-white" />
        </div>
        <h1 className="text-5xl font-black uppercase tracking-tighter text-[#111827] mb-4 leading-none">Thanks!</h1>
        <p className="text-sm font-bold text-gray-500 mb-12 max-w-xs uppercase tracking-wide leading-relaxed">The people you kept are now in your connections.</p>
        <button onClick={() => router.push('/feed/connections')} className="w-full max-w-xs py-4 bg-[#111827] text-white rounded-2xl font-black uppercase text-sm border-[3px] border-black shadow-[6px_6px_0_#e11d48] hover:-translate-y-1 transition-all">See connections</button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-[#fafafa]">
      <div className="px-5 pt-10 pb-4 flex items-center gap-3 border-b-[3px] border-black">
        <button onClick={() => router.push('/feed/events')} className="w-10 h-10 bg-white border-[3px] border-black rounded-full flex items-center justify-center shadow-[2px_2px_0_#000]"><ChevronLeft size={20} strokeWidth={3} /></button>
        <h2 className="font-black uppercase text-lg">Rate the night</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pt-8 pb-40 max-w-lg mx-auto w-full">
        {/* Stars */}
        <h1 className="text-3xl font-black uppercase tracking-tighter text-[#111827] leading-none mb-2">How was it?</h1>
        <p className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-5">Rate the overall evening</p>
        <div className="flex gap-2 mb-10">
          {[1, 2, 3, 4, 5].map(s => (
            <button key={s} onClick={() => setRating(s)} className={`w-14 h-14 rounded-2xl border-[3px] border-black flex items-center justify-center transition-all ${rating >= s ? 'bg-[#fde047] shadow-[3px_3px_0_#000] -translate-y-0.5' : 'bg-white'}`}>
              <Star size={24} className={rating >= s ? 'text-black fill-black' : 'text-gray-400'} />
            </button>
          ))}
        </div>

        {/* Tablemates */}
        <h2 className="text-2xl font-black uppercase tracking-tighter text-[#111827] leading-none mb-2 flex items-center gap-2"><Heart size={20} className="text-[#e11d48]" /> Keep in touch?</h2>
        <p className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-5">A mutual yes unlocks the connection</p>

        <div className="flex flex-col gap-3">
          {candidates.length === 0 && (
            <div className="text-center py-8 font-bold text-gray-400 border-[3px] border-dashed border-gray-300 rounded-3xl uppercase text-sm">No tablemates found for this event.</div>
          )}
          {candidates.map((p, i) => {
            const v = votes[p.user_id];
            return (
              <div key={p.user_id || i} className="flex items-center gap-3 bg-white border-[3px] border-black rounded-2xl px-4 py-3 shadow-[3px_3px_0_#000]">
                <div className="w-11 h-11 rounded-xl bg-[#111827] text-white border-2 border-black flex items-center justify-center font-black">{(p.name || '?')[0]}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-black uppercase text-sm truncate">{p.name}</div>
                  <div className="text-[10px] font-bold uppercase text-gray-500 truncate">{(p.domains || [])[0] || (p.hard_skills || [])[0] || 'Member'}</div>
                </div>
                <button onClick={() => setVote(p.user_id, 'no')} className={`w-10 h-10 rounded-xl border-[2px] border-black flex items-center justify-center transition-all ${v === 'no' ? 'bg-[#111827] text-white' : 'bg-white text-gray-400'}`}><X size={18} strokeWidth={3} /></button>
                <button onClick={() => setVote(p.user_id, 'yes')} className={`w-10 h-10 rounded-xl border-[2px] border-black flex items-center justify-center transition-all ${v === 'yes' ? 'bg-[#34d399] text-black shadow-[2px_2px_0_#000]' : 'bg-white text-gray-400'}`}><Check size={18} strokeWidth={3} /></button>
              </div>
            );
          })}
        </div>

        <textarea
          value={note} onChange={e => setNote(e.target.value)}
          placeholder="Anything we should know? (optional, private)"
          className="w-full mt-6 bg-white border-[3px] border-black rounded-2xl px-4 py-3 font-bold text-sm outline-none focus:border-[#e11d48] shadow-[3px_3px_0_#000] min-h-[80px]"
        />
      </div>

      <div className="fixed bottom-0 left-0 w-full px-5 pb-8 pt-6 bg-gradient-to-t from-[#fafafa] via-[#fafafa] to-transparent">
        <div className="max-w-lg mx-auto">
          <button onClick={submit} disabled={submitting || rating === 0} className="w-full py-4 bg-[#e11d48] text-white rounded-2xl font-black uppercase text-sm tracking-widest border-[3px] border-black shadow-[6px_6px_0_#111827] hover:-translate-y-1 transition-all flex justify-center items-center gap-2.5 disabled:opacity-40 disabled:pointer-events-none">
            {submitting ? <Loader2 className="animate-spin" size={18} /> : 'Submit feedback'}
          </button>
        </div>
      </div>
    </div>
  );
}
