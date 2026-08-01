import React from 'react';
import { ArrowRight, Globe, MapPin, MessageCircle } from 'lucide-react';
import { CITIES, LANGUAGES_LIST } from '../constants';
import { getNeighborhoodsForCity } from '../../constants/cities';

export const StepBasicInfo = ({ formData, updateBasic, toggleLanguage, onNext }: any) => {
    const isValid = formData.basic_info.name && formData.basic_info.city && formData.basic_info.languages.length > 0;
    const neighborhoods = getNeighborhoodsForCity(formData.basic_info.city);
    return (
        <div className="max-w-4xl w-full mx-auto animate-in fade-in duration-500 mt-6 sm:mt-10 px-1">
            <h2 className="text-3xl sm:text-4xl md:text-6xl font-black tracking-tighter uppercase mb-3 sm:mb-4 text-[#111827]">Basic <span className="text-[#38bdf8]">Info.</span></h2>
            <p className="text-sm sm:text-lg text-gray-900 font-medium mb-8 sm:mb-12 border-l-[3px] sm:border-l-[4px] border-[#38bdf8] pl-3 sm:pl-4">The foundation for local matching.</p>

            <div className="space-y-5 sm:space-y-8">
                <div>
                    <label className="font-black uppercase text-xs sm:text-sm mb-2 sm:mb-3 block">Name</label>
                    <input type="text" placeholder="e.g., Alex" value={formData.basic_info.name} onChange={(e) => updateBasic('name', e.target.value)} className="w-full bg-white border-2 sm:border-[3px] border-black rounded-xl sm:rounded-2xl p-3.5 sm:p-5 font-medium text-base sm:text-lg outline-none focus:shadow-[4px_4px_0_#38bdf8] sm:focus:shadow-[6px_6px_0_#38bdf8] transition-all" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                        <label className="font-black uppercase text-xs sm:text-sm mb-2 sm:mb-3 block flex items-center gap-2"><Globe size={16} /> City</label>
                        <select value={formData.basic_info.city} onChange={(e) => { updateBasic('city', e.target.value); updateBasic('neighborhood', ""); }} className="w-full bg-white border-2 sm:border-[3px] border-black rounded-xl sm:rounded-2xl p-3.5 sm:p-5 font-medium text-base sm:text-lg outline-none focus:shadow-[4px_4px_0_#38bdf8] sm:focus:shadow-[6px_6px_0_#38bdf8] transition-all appearance-none">
                            <option value="" disabled>Select a city...</option>
                            {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    {neighborhoods.length > 0 && (
                        <div>
                            <label className="font-black uppercase text-xs sm:text-sm mb-2 sm:mb-3 block flex items-center gap-2"><MapPin size={16} /> Neighborhood</label>
                            <select value={formData.basic_info.neighborhood} onChange={(e) => updateBasic('neighborhood', e.target.value)} className="w-full bg-white border-2 sm:border-[3px] border-black rounded-xl sm:rounded-2xl p-3.5 sm:p-5 font-medium text-base sm:text-lg outline-none focus:shadow-[4px_4px_0_#38bdf8] sm:focus:shadow-[6px_6px_0_#38bdf8] transition-all appearance-none">
                                <option value="" disabled>Select a neighborhood...</option>
                                {neighborhoods.map(n => <option key={n} value={n}>{n}</option>)}
                            </select>
                        </div>
                    )}
                </div>

                <div>
                    <label className="font-black uppercase text-xs sm:text-sm mb-2 sm:mb-3 block flex items-center gap-2"><MessageCircle size={16} /> Languages</label>
                    <div className="flex flex-wrap gap-2 sm:gap-3">
                        {LANGUAGES_LIST.map(lang => (
                            <button key={lang} onClick={() => toggleLanguage(lang)} className={`px-3.5 sm:px-5 py-2 sm:py-3 font-black uppercase text-[10px] sm:text-xs border-2 sm:border-[3px] border-black rounded-lg sm:rounded-xl transition-all ${formData.basic_info.languages.includes(lang) ? 'bg-[#111827] text-white shadow-[3px_3px_0_#38bdf8] sm:shadow-[4px_4px_0_#38bdf8] -translate-y-1' : 'bg-white text-gray-800 hover:text-black hover:shadow-[3px_3px_0_#000] sm:hover:shadow-[4px_4px_0_#000]'}`}>{lang}</button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="mt-10 sm:mt-16 flex justify-end">
                <button disabled={!isValid} onClick={onNext} className="bg-[#38bdf8] text-black px-7 sm:px-10 py-3.5 sm:py-5 rounded-full font-black uppercase text-base sm:text-lg flex items-center gap-2 sm:gap-3 border-2 sm:border-[3px] border-black shadow-[4px_4px_0_#111827] sm:shadow-[6px_6px_0_#111827] hover:-translate-y-1 hover:shadow-[6px_6px_0_#111827] sm:hover:shadow-[8px_8px_0_#111827] transition-all disabled:opacity-50 active:translate-y-0">
                    Next <ArrowRight size={18} />
                </button>
            </div>
        </div>
    );
};