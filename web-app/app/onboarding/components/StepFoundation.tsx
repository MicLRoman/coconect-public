import React from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

export const StepFoundation = ({ formData, updateGive, toggleExperience, onNext, onBack }: any) => (
    <div className="max-w-4xl w-full mx-auto animate-in fade-in duration-500 mt-6 sm:mt-10 px-1">
        <h2 className="text-3xl sm:text-4xl md:text-6xl font-black tracking-tighter uppercase mb-3 sm:mb-4 text-[#111827]">Your <span className="text-[#e11d48]">Foundation.</span></h2>
        <div className="space-y-6 sm:space-y-10">
            <div>
                <label className="font-black uppercase text-xs sm:text-sm mb-2 sm:mb-3 block">University / Alma Mater</label>
                <input
                    type="text"
                    placeholder="e.g., Stanford University, 2024"
                    value={formData.gives.education}
                    onChange={(e) => updateGive('education', e.target.value)}
                    className="w-full bg-white border-2 sm:border-[3px] border-black rounded-xl sm:rounded-2xl p-3.5 sm:p-5 font-medium text-base sm:text-lg outline-none focus:shadow-[4px_4px_0_#fde047] sm:focus:shadow-[6px_6px_0_#fde047] transition-all"
                />
            </div>
            <div>
                <label className="font-black uppercase text-xs sm:text-sm block mb-3 sm:mb-4">Focus / Level (Select up to 2)</label>
                <div className="grid grid-cols-2 md:grid-cols-2 gap-3 sm:gap-4">
                    {[
                        { id: "Beginner", label: "Learning / Portfolio" },
                        { id: "Middle", label: "Practice / Execution" },
                        { id: "Senior", label: "Architecture / Leadership" },
                        { id: "Executive", label: "Strategy / Hiring" }
                    ].map(level => {
                        const isSelected = formData.gives.experience_level.includes(level.id);
                        const isDisabled = !isSelected && formData.gives.experience_level.length >= 2;
                        return (
                            <div
                                key={level.id}
                                onClick={() => !isDisabled && toggleExperience(level.id)}
                                className={`p-3.5 sm:p-5 border-2 sm:border-[3px] border-black rounded-xl sm:rounded-2xl transition-all flex justify-between items-center ${isSelected ? 'bg-[#111827] text-white shadow-[4px_4px_0_#e11d48] sm:shadow-[6px_6px_0_#e11d48] -translate-y-1 cursor-pointer' : isDisabled ? 'bg-gray-100 opacity-60' : 'bg-white hover:shadow-[3px_3px_0_#000] sm:hover:shadow-[4px_4px_0_#000] cursor-pointer'}`}
                            >
                                <h3 className="font-black uppercase text-xs sm:text-base">{level.label}</h3>
                                {isSelected && <CheckCircle2 size={18} className="text-[#fde047] shrink-0 ml-2" />}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
        <div className="mt-10 sm:mt-16 flex justify-between items-center">
            <button onClick={onBack} className="text-gray-800 font-bold uppercase text-sm hover:text-black">← Back</button>
            <button
                disabled={!formData.gives.education || formData.gives.experience_level.length === 0}
                onClick={onNext}
                className="bg-[#e11d48] text-white px-7 sm:px-10 py-3.5 sm:py-5 rounded-full font-black uppercase text-base sm:text-lg flex items-center gap-2 sm:gap-3 border-2 sm:border-[3px] border-black shadow-[4px_4px_0_#111827] sm:shadow-[6px_6px_0_#111827] hover:-translate-y-1 hover:shadow-[6px_6px_0_#111827] sm:hover:shadow-[8px_8px_0_#111827] transition-all disabled:opacity-50 active:translate-y-0"
            >
                Continue <ArrowRight size={18} />
            </button>
        </div>
    </div>
);