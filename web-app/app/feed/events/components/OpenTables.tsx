import { Clock, Lock, Utensils, Dumbbell, Sparkles } from 'lucide-react';

const tierValue: Record<string, number> = { "Starter": 1, "Core Membership": 2, "Premium": 3, "Ultra": 4 };

// We don't get an explicit event "type" from the API, so guess an icon/accent
// from the title + description to give each pool a distinct floating badge.
const guessType = (ev: any) => {
    const t = `${ev.title} ${ev.desc || ''}`.toLowerCase();
    if (/(padel|match|run|sport|tennis|gym|hike|climb|active|pad)/.test(t)) return { Icon: Dumbbell, color: '#4ade80' };
    if (/(dinner|brunch|lunch|breakfast|food|supper|table|wine)/.test(t)) return { Icon: Utensils, color: '#c084fc' };
    return { Icon: Sparkles, color: '#38bdf8' };
};

const PoolTags = ({ tags, dim }: { tags: string[]; dim?: boolean }) => (
    <div className={`absolute -top-3 right-6 flex items-center z-30 pointer-events-none ${dim ? 'opacity-50 grayscale' : ''}`}>
        {tags.slice(0, 2).map((tag, i) => (
            <div key={i} className={`px-4 py-1.5 border-[3px] border-black rounded-full flex items-center justify-center ${i === 0 ? 'bg-[#e11d48] text-white z-30' : 'bg-[#fde047] text-black z-20 -ml-1'}`}>
                <span className="font-black uppercase text-[9px] sm:text-[10px] tracking-widest whitespace-nowrap">{tag}</span>
            </div>
        ))}
    </div>
);

export const OpenTables = ({ events, userTierVal, onSelect }: { events: any[], userTierVal: number, onSelect: (ev: any) => void }) => {
    return (
        <div className="relative pt-2">
            <div className="inline-block bg-black text-white font-black uppercase text-sm px-6 py-3 rounded-full border-[3px] border-white shadow-[4px_4px_0_#000] -rotate-2 mb-2 ml-2">
                Explore Pools 🌊
            </div>

            <div className="space-y-8 pt-4">
                {events.map((ev) => {
                    const { Icon, color } = guessType(ev);
                    const evTierVal = tierValue[ev.requiredTier] || 1;
                    const isLocked = evTierVal > userTierVal;
                    const isPremium = ev.requiredTier === 'Premium';
                    const tags: string[] = ev.poolTags || [];

                    if (isLocked) {
                        return (
                            <div key={ev.id} onClick={() => (window.location.href = '/checkout')} className="relative group cursor-pointer mt-4">
                                <div className="absolute -top-3 left-6 z-30 pointer-events-none flex items-center justify-center w-12 h-12 rounded-full border-[3px] border-black shadow-[3px_3px_0_#000] rotate-[-5deg] animate-pop-float" style={{ backgroundColor: color }}>
                                    <Icon size={20} className="text-black" />
                                </div>
                                {tags.length > 0 && <PoolTags tags={tags} dim />}
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-16 h-16 bg-gray-200 border-[4px] border-black rounded-full flex items-center justify-center shadow-[4px_4px_0_#000] group-hover:scale-110 transition-transform">
                                    <Lock size={28} className="text-black" />
                                </div>
                                <div className="bg-gray-100 border-[4px] border-black border-dashed rounded-[2.5rem] p-6 opacity-70 pointer-events-none flex flex-col relative z-10">
                                    <h3 className="text-3xl font-black uppercase leading-none mt-3 tracking-tighter text-gray-500">{ev.title}</h3>
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        <span className="bg-white border-[3px] border-black rounded-full font-black uppercase text-[10px] px-3 py-1.5 text-gray-600 shadow-[2px_2px_0_#000]">{ev.date}, {ev.time}</span>
                                    </div>
                                    <button className="w-full bg-gray-300 text-gray-500 py-4 rounded-full font-black uppercase text-sm border-[4px] border-gray-400 mt-5">
                                        {ev.requiredTier} Only
                                    </button>
                                </div>
                            </div>
                        );
                    }

                    const dark = isPremium;
                    return (
                        <div key={ev.id} onClick={() => onSelect(ev)} className="relative group cursor-pointer mt-4">
                            <div className="absolute -top-3 left-6 z-30 pointer-events-none flex items-center justify-center w-12 h-12 rounded-full border-[3px] border-black shadow-[3px_3px_0_#000] rotate-[-5deg] animate-pop-float" style={{ backgroundColor: color }}>
                                <Icon size={20} className="text-black" />
                            </div>
                            {tags.length > 0 && <PoolTags tags={tags} />}
                            <div className={`border-[4px] border-black rounded-[2.5rem] p-6 sm:p-7 group-hover:-translate-y-1 transition-all flex flex-col relative z-10 overflow-hidden ${dark ? 'bg-[#111827] shadow-[8px_8px_0_#fde047] group-hover:shadow-[12px_12px_0_#fde047]' : 'bg-white shadow-[8px_8px_0_#000] group-hover:shadow-[12px_12px_0_#000]'}`}>
                                {dark && <div className="absolute -right-10 -top-10 w-40 h-40 bg-[#fde047] rounded-full blur-[60px] opacity-20 pointer-events-none" />}
                                <h3 className={`text-3xl font-black uppercase leading-none mt-3 tracking-tighter relative z-10 ${dark ? 'text-white' : 'text-black'}`}>{ev.title}</h3>
                                <div className="mt-4 flex flex-wrap gap-2 relative z-10">
                                    <span className="bg-white border-[3px] border-black rounded-full font-black uppercase text-[10px] px-3 py-1.5 text-black shadow-[2px_2px_0_#000] inline-flex items-center gap-1.5">
                                        <Clock size={12} strokeWidth={3} /> {ev.date}, {ev.time}
                                    </span>
                                </div>
                                {ev.desc && <p className={`text-xs font-bold mt-4 mb-5 leading-relaxed flex-1 relative z-10 ${dark ? 'text-gray-300' : 'text-gray-500'}`}>{ev.desc}</p>}
                                <button className="w-full bg-[#fde047] text-black py-4 rounded-full font-black uppercase text-sm border-[4px] border-black shadow-[4px_4px_0_#000] hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#000] hover:bg-[#fef08a] transition-all mt-auto relative z-10 pointer-events-none">
                                    {dark ? 'View Premium Pool' : 'Sign up'}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
