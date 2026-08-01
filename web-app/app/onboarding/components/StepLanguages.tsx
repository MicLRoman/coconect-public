import React from 'react';
import { ArrowRight, MessageCircle } from 'lucide-react';
import { LANGUAGES_LIST } from '../constants';

export const StepLanguages = ({ formData, toggleLanguage, onNext, onBack }: any) => {
    const isValid = formData.basic_info.languages.length > 0;
    return (
        <div className="max-w-4xl w-full mx-auto animate-in fade-in duration-500 mt-6 sm:mt-10 px-1">
            <h2 className="text-3xl sm:text-4xl md:text-6xl font-black tracking-tighter uppercase mb-3 sm:mb-4 text-[#111827]">Languages <span className="text-[#38bdf8]">you speak.</span></h2>
            <p className="text-sm sm:text-lg text-gray-900 font-medium mb-8 sm:mb-12 border-l-[3px] sm:border-l-[4px] border-[#38bdf8] pl-3 sm:pl-4">We only seat you with people you can actually talk to.</p>

            <div>
                <label className="font-black uppercase text-xs sm:text-sm mb-2 sm:mb-3 block flex items-center gap-2"><MessageCircle size={16} /> Pick all that apply</label>
                <div className="flex flex-wrap gap-2 sm:gap-3">
                    {LANGUAGES_LIST.map(lang => (
                        <button key={lang} onClick={() => toggleLanguage(lang)} className={`px-3.5 sm:px-5 py-2 sm:py-3 font-black uppercase text-[10px] sm:text-xs border-2 sm:border-[3px] border-black rounded-lg sm:rounded-xl transition-all ${formData.basic_info.languages.includes(lang) ? 'bg-[#111827] text-white shadow-[3px_3px_0_#38bdf8] sm:shadow-[4px_4px_0_#38bdf8] -translate-y-1' : 'bg-white text-gray-800 hover:text-black hover:shadow-[3px_3px_0_#000] sm:hover:shadow-[4px_4px_0_#000]'}`}>{lang}</button>
                    ))}
                </div>
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
