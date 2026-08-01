import React from 'react';
import { ArrowRight } from 'lucide-react';
import { INDUSTRIES, SKILLS_MAP } from '../constants';

export const StepIndustrySkills = ({ formData, toggleIndustry, toggleSkill, onNext, onBack }: any) => {
    const maxSkills = formData.gives.industry.length === 1 ? 3 : formData.gives.industry.length === 2 ? 5 : 7;
    return (
        <div className="max-w-4xl w-full mx-auto animate-in fade-in duration-500 mt-6 sm:mt-10 px-1">
            <h2 className="text-3xl sm:text-4xl md:text-6xl font-black tracking-tighter uppercase mb-3 sm:mb-4 text-[#111827]">Industry & <span className="text-white bg-black px-2">Skills.</span></h2>

            <div className="mb-6 sm:mb-10">
                <label className="font-black uppercase text-xs sm:text-sm block mb-3 sm:mb-4">1. Industries (Max 3)</label>
                <div className="flex flex-wrap gap-2 sm:gap-3">
                    {INDUSTRIES.map(ind => {
                        const isSelected = formData.gives.industry.includes(ind);
                        const isDisabled = !isSelected && formData.gives.industry.length >= 3;
                        return (
                            <button key={ind} onClick={() => !isDisabled && toggleIndustry(ind)} className={`px-3.5 sm:px-5 py-2 sm:py-3 font-black uppercase text-[10px] sm:text-sm border-2 sm:border-[3px] border-black rounded-lg sm:rounded-xl transition-all ${isSelected ? 'bg-[#fde047] text-black shadow-[3px_3px_0_#111827] -translate-y-1' : isDisabled ? 'bg-gray-100 opacity-60' : 'bg-white hover:shadow-[3px_3px_0_#000]'}`}>{ind}</button>
                        );
                    })}
                </div>
            </div>

            {formData.gives.industry.length > 0 && (
                <div className="mb-6 sm:mb-10">
                    <label className="font-black uppercase text-xs sm:text-sm block mb-3 sm:mb-4">2. Core Skills (Max {maxSkills})</label>
                    <div className="flex flex-wrap gap-2 sm:gap-3">
                        {formData.gives.industry.flatMap((ind: string) => SKILLS_MAP[ind as keyof typeof SKILLS_MAP] || []).map((skill: string) => {
                            const isSelected = formData.gives.hard_skills.includes(skill);
                            return (
                                <button key={skill} onClick={() => toggleSkill(skill)} disabled={!isSelected && formData.gives.hard_skills.length >= maxSkills} className={`px-3 sm:px-4 py-1.5 sm:py-2 font-black uppercase text-[10px] sm:text-xs border-[2px] border-black rounded-lg transition-all ${isSelected ? 'bg-[#111827] text-white shadow-[2px_2px_0_#e11d48] -translate-y-0.5' : 'bg-white disabled:opacity-40 hover:shadow-[2px_2px_0_#000]'}`}>{skill}</button>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="mt-10 sm:mt-16 flex justify-between items-center">
                <button onClick={onBack} className="text-gray-800 font-bold uppercase text-sm hover:text-black">← Back</button>
                <button disabled={formData.gives.industry.length === 0 || formData.gives.hard_skills.length === 0} onClick={onNext} className="bg-[#111827] text-[#fde047] px-7 sm:px-10 py-3.5 sm:py-5 rounded-full font-black uppercase text-base sm:text-lg flex items-center gap-2 sm:gap-3 border-2 sm:border-[3px] border-black shadow-[4px_4px_0_#e11d48] hover:-translate-y-1 transition-all disabled:opacity-50 active:translate-y-0">
                    Continue <ArrowRight size={18} />
                </button>
            </div>
        </div>
    );
};