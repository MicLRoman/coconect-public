import React from 'react';
import { ArrowRight } from 'lucide-react';

export const StepTitle = ({ onStart }: { onStart: () => void }) => (
    <div className="min-h-screen bg-[#fafafa] flex flex-col items-center justify-center p-6 selection:bg-[#e11d48] selection:text-white">
        <div className="max-w-4xl text-center space-y-6 md:space-y-8 animate-[fadeIn_0.5s_ease_out]">
            <h1 className="text-4xl sm:text-5xl md:text-8xl font-black tracking-tighter uppercase text-[#111827] leading-[0.9]">
                Find your reason <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#e11d48] to-[#fde047]">
                    to get rich.
                </span>
            </h1>
            <p className="text-base sm:text-lg md:text-2xl font-bold text-gray-500 max-w-2xl mx-auto px-2">
                High-signal networking for builders, founders, and relentless achievers.
            </p>
            <button
                onClick={onStart}
                className="mt-8 md:mt-12 bg-[#111827] text-white px-8 sm:px-12 py-4 sm:py-6 rounded-2xl font-black uppercase text-lg sm:text-2xl border-[3px] sm:border-[4px] border-black shadow-[6px_6px_0px_0px_#e11d48] sm:shadow-[8px_8px_0px_0px_#e11d48] hover:-translate-y-1 hover:shadow-[10px_10px_0px_0px_#e11d48] sm:hover:shadow-[12px_12px_0px_0px_#e11d48] transition-all inline-flex items-center gap-3 sm:gap-4 active:translate-y-0 active:shadow-[4px_4px_0px_0px_#e11d48]"
            >
                Start the Journey <ArrowRight size={24} className="sm:w-7 sm:h-7" />
            </button>
        </div>
    </div>
);