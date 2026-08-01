import React from 'react';
import { ArrowRight } from 'lucide-react';

export const StepName = ({ formData, updateBasic, onNext, onBack }: any) => {
    const isValid = !!formData.basic_info.name?.trim();
    return (
        <div className="max-w-4xl w-full mx-auto animate-in fade-in duration-500 mt-6 sm:mt-10 px-1">
            <h2 className="text-3xl sm:text-4xl md:text-6xl font-black tracking-tighter uppercase mb-3 sm:mb-4 text-[#111827]">What's your <span className="text-[#38bdf8]">name?</span></h2>
            <p className="text-sm sm:text-lg text-gray-900 font-medium mb-8 sm:mb-12 border-l-[3px] sm:border-l-[4px] border-[#38bdf8] pl-3 sm:pl-4">How should we introduce you at the table.</p>

            <div>
                <label className="font-black uppercase text-xs sm:text-sm mb-2 sm:mb-3 block">First name</label>
                <input
                    type="text" autoFocus placeholder="e.g., Alex"
                    value={formData.basic_info.name}
                    onChange={(e) => updateBasic('name', e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && isValid) onNext(); }}
                    className="w-full bg-white border-2 sm:border-[3px] border-black rounded-xl sm:rounded-2xl p-3.5 sm:p-5 font-medium text-base sm:text-lg outline-none focus:shadow-[4px_4px_0_#38bdf8] sm:focus:shadow-[6px_6px_0_#38bdf8] transition-all"
                />
            </div>

            <div className="mt-10 sm:mt-16 flex justify-between items-center">
                <button onClick={onBack} className="text-gray-800 font-bold uppercase text-sm hover:text-black">← Back</button>
                <button disabled={!isValid} onClick={onNext} className="bg-[#38bdf8] text-black px-7 sm:px-10 py-3.5 sm:py-5 rounded-full font-black uppercase text-base sm:text-lg flex items-center gap-2 sm:gap-3 border-2 sm:border-[3px] border-black shadow-[4px_4px_0_#111827] sm:shadow-[6px_6px_0_#111827] hover:-translate-y-1 transition-all disabled:opacity-50 active:translate-y-0">
                    Next <ArrowRight size={18} />
                </button>
            </div>
        </div>
    );
};
