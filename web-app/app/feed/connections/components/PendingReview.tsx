import React from 'react';
import { Check, X } from 'lucide-react';

export const PendingReview = ({ events, onFeedback }: any) => {
    // Защита 1: Если ивентов вообще нет, ничего не рисуем
    if (!events || events.length === 0) return null;

    return (
        <div className="space-y-6">
            <h2 className="text-sm font-black uppercase tracking-widest text-[#e11d48] flex items-center gap-2">
                Pending Review
                <span className="bg-[#e11d48] text-white text-[10px] px-2 py-0.5 rounded-full border-[1.5px] border-black shadow-[1.5px_1.5px_0_#000]">
                    Action Required
                </span>
            </h2>

            {/* Защита 2: events.map защищен проверкой выше, но можно добавить events?.map */}
            {events?.map((ev: any) => (
                <div key={ev.id} className="bg-[#111827] text-white p-6 rounded-[2rem] border-[4px] border-black shadow-[8px_8px_0_#e11d48]">
                    <h3 className="font-black uppercase text-xl mb-1">{ev.title}</h3>
                    <p className="text-xs font-bold text-gray-400 mb-6">{ev.event_date} • {ev.restaurant_name}</p>

                    <div className="space-y-4">
                        {/* Защита 3: Если ev.peers === undefined, используем пустой массив [] */}
                        {(ev.peers || []).map((person: any) => (
                            <div key={person.user_id} className="bg-white text-black p-4 rounded-2xl border-[3px] border-black flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <img
                                        src={`https://i.pravatar.cc/100?u=${person.user_id}`}
                                        className="w-10 h-10 rounded-full border-[2px] border-black"
                                        alt="avatar"
                                    />
                                    <div>
                                        <h4 className="font-black uppercase leading-none">{person.name}</h4>
                                        <p className="text-[9px] font-bold text-gray-500 uppercase mt-1">
                                            {/* Защита 4: Защищаем hard_skills перед join */}
                                            {(person.hard_skills || []).slice(0, 2).join(' • ')}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => onFeedback(person.user_id, ev.id, 'no')}
                                        className="w-10 h-10 bg-gray-100 rounded-full border-[2px] border-black flex items-center justify-center hover:bg-[#111827] hover:text-white transition-colors"
                                    >
                                        <X size={18} strokeWidth={3} />
                                    </button>
                                    <button
                                        onClick={() => onFeedback(person.user_id, ev.id, 'yes')}
                                        className="w-10 h-10 bg-[#34d399] rounded-full border-[2px] border-black flex items-center justify-center shadow-[2px_2px_0_#000] hover:-translate-y-0.5 transition-transform"
                                    >
                                        <Check size={18} strokeWidth={4} />
                                    </button>
                                </div>
                            </div>
                        ))}

                        {/* Если массив peers оказался пустым, показываем заглушку */}
                        {(!ev.peers || ev.peers.length === 0) && (
                            <div className="text-center py-4 border-[2px] border-dashed border-gray-600 rounded-xl text-gray-400 text-xs font-bold uppercase">
                                No participants to review.
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};