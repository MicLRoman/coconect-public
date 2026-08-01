import { MapPin } from 'lucide-react';

export const Upcoming = ({ event, onClick }: { event: any, onClick: () => void }) => {
    if (!event) return null;
    return (
        <div onClick={onClick} className="relative mt-8 group cursor-pointer">
            <div className="relative z-10 transition-transform group-hover:-translate-y-1">
                <div className="absolute -top-5 right-4 sm:right-8 bg-black text-white font-black uppercase text-[10px] sm:text-xs px-5 py-2.5 border-[3px] border-white rounded-full shadow-[4px_4px_0_#000] rotate-6 z-20 group-hover:rotate-12 transition-transform">
                    Your Match
                </div>

                <div className="bg-white border-[4px] border-black rounded-[3rem] p-6 sm:p-8 shadow-[10px_10px_0_#000]">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="bg-[#fde047] text-black font-black uppercase text-[10px] px-3 py-1 rounded-full border-[3px] border-black shadow-[2px_2px_0_#000]">
                            Main Event
                        </span>
                    </div>

                    <h2 className="text-4xl sm:text-5xl font-black uppercase leading-[0.9] mb-5 text-black tracking-tighter">{event.title}</h2>

                    <div className="bg-black text-white inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-black text-sm uppercase mb-6">
                        {event.date}, {event.time}
                    </div>

                    <div className="bg-[#fafafa] border-[4px] border-black rounded-[2rem] p-4 shadow-[6px_6px_0_#000] relative">
                        <div className="absolute -left-3 sm:-left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-[#e11d48] border-[3px] border-black rounded-full flex items-center justify-center shadow-[2px_2px_0_#000] animate-pop-float">
                            <MapPin size={20} className="text-white" />
                        </div>
                        <div className="pl-8 sm:pl-10">
                            <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Location Revealed</p>
                            <p className="font-black uppercase text-sm sm:text-base leading-tight text-black">
                                {event.restaurant || 'TBA'}
                                {event.address && <><br /><span className="text-[#e11d48]">{event.address}</span></>}
                            </p>
                        </div>
                    </div>

                    <div className="mt-6">
                        <button className="w-full bg-[#fde047] text-black py-4 rounded-full font-black uppercase text-sm border-[4px] border-black shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none transition-all pointer-events-none">
                            View Details
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
