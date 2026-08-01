import React from 'react';
import { ArrowRight } from 'lucide-react';

export const StepAge = ({ formData, updateBasic, onNext, onBack }: any) => {
    const ageNum = parseInt(formData.basic_info.age, 10);
    const isValid = !isNaN(ageNum) && ageNum >= 18 && ageNum <= 100;
    const tooYoung = formData.basic_info.age && !isNaN(ageNum) && ageNum < 18;

    return (
        <div className="max-w-4xl w-full mx-auto animate-in fade-in duration-500 mt-6 sm:mt-10 px-1">
            <h2 className="text-3xl sm:text-4xl md:text-6xl font-black tracking-tighter uppercase mb-3 sm:mb-4 text-[#111827]">How old <span className="text-[#e11d48]">are you?</span></h2>
            <p className="text-sm sm:text-lg text-gray-900 font-medium mb-8 sm:mb-12 border-l-[3px] sm:border-l-[4px] border-[#e11d48] pl-3 sm:pl-4">We balance tables by age. 18+ only.</p>

            <div>
                <label className="font-black uppercase text-xs sm:text-sm mb-2 sm:mb-3 block">Age</label>
                <input
                    type="number" inputMode="numeric" autoFocus placeholder="e.g., 28" min={18} max={100}
                    value={formData.basic_info.age}
                    onChange={(e) => updateBasic('age', e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && isValid) onNext(); }}
                    className="w-full bg-white border-2 sm:border-[3px] border-black rounded-xl sm:rounded-2xl p-3.5 sm:p-5 font-medium text-base sm:text-lg outline-none focus:shadow-[4px_4px_0_#e11d48] sm:focus:shadow-[6px_6px_0_#e11d48] transition-all"
                />
                {tooYoung && <p className="mt-3 font-black uppercase text-xs text-[#e11d48]">You must be 18 or older.</p>}
            </div>

            <div className="mt-10 sm:mt-16 flex justify-between items-center">
                <button onClick={onBack} className="text-gray-800 font-bold uppercase text-sm hover:text-black">← Back</button>
                <button disabled={!isValid} onClick={onNext} className="bg-[#e11d48] text-white px-7 sm:px-10 py-3.5 sm:py-5 rounded-full font-black uppercase text-base sm:text-lg flex items-center gap-2 sm:gap-3 border-2 sm:border-[3px] border-black shadow-[4px_4px_0_#111827] sm:shadow-[6px_6px_0_#111827] hover:-translate-y-1 transition-all disabled:opacity-50 active:translate-y-0">
                    Next <ArrowRight size={18} />
                </button>
            </div>
        </div>
    );
};
