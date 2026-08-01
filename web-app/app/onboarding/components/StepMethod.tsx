import React from 'react';
import { ArrowRight, FileText } from 'lucide-react';
import { LinkedinIcon } from '../constants';

export const StepMethod = ({ onSelectManual, onSelectResume, onSelectLinkedin }: any) => (
    <div className="max-w-xl w-full bg-white border-[3px] sm:border-[4px] border-black p-5 sm:p-8 md:p-12 rounded-[1.5rem] sm:rounded-[2rem] shadow-[8px_8px_0px_0px_#111827] sm:shadow-[12px_12px_0px_0px_#111827] mx-auto mt-10 sm:mt-20 animate-in fade-in zoom-in-95">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tighter mb-1 sm:mb-2 text-[#111827]">Calibration.</h1>
        <p className="text-gray-800 font-bold uppercase text-[10px] sm:text-xs tracking-widest mb-6 sm:mb-10">Choose upload method</p>
        <div className="space-y-3 sm:space-y-4">
            <button onClick={onSelectLinkedin} className="w-full flex items-center justify-between p-3.5 sm:p-5 border-2 sm:border-[3px] border-black bg-white rounded-xl sm:rounded-2xl hover:-translate-y-1 hover:shadow-[4px_4px_0_#0a66c2] sm:hover:shadow-[6px_6px_0_#0a66c2] transition-all group active:translate-y-0">
                <div className="flex items-center gap-3 sm:gap-4 text-[#0a66c2]">
                    <LinkedinIcon size={18} />
                    <span className="font-black uppercase text-sm sm:text-base text-black">Import via LinkedIn</span>
                </div>
                <ArrowRight size={18} className="text-[#0a66c2] group-hover:translate-x-1 transition-transform" />
            </button>
            <button onClick={onSelectResume} className="w-full flex items-center justify-between p-3.5 sm:p-5 border-2 sm:border-[3px] border-black bg-[#fde047] rounded-xl sm:rounded-2xl hover:-translate-y-1 hover:shadow-[4px_4px_0_#111827] sm:hover:shadow-[6px_6px_0_#111827] transition-all group active:translate-y-0">
                <div className="flex items-center gap-3 sm:gap-4 text-[#111827]">
                    <FileText size={18} />
                    <span className="font-black uppercase text-sm sm:text-base">Upload Resume (.PDF)</span>
                </div>
                <ArrowRight size={18} className="text-[#111827] group-hover:translate-x-1 transition-transform" />
            </button>
            <button onClick={onSelectManual} className="w-full flex items-center justify-between p-3.5 sm:p-5 border-2 sm:border-[3px] border-black bg-white rounded-xl sm:rounded-2xl hover:-translate-y-1 hover:shadow-[4px_4px_0_#e11d48] sm:hover:shadow-[6px_6px_0_#e11d48] transition-all group active:translate-y-0">
                <div className="flex items-center gap-3 sm:gap-4 text-[#111827]">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 border-2 border-black rounded-full flex items-center justify-center font-black text-xs sm:text-sm shadow-[2px_2px_0_#000]">M</div>
                    <span className="font-black uppercase text-sm sm:text-base">Deep Calibration (Manual)</span>
                </div>
                <ArrowRight size={18} className="text-[#111827] group-hover:translate-x-1 transition-transform" />
            </button>
        </div>
    </div>
);