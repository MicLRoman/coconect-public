import React from 'react';
import { ArrowRight } from 'lucide-react';

export const StepWorkVibe = ({ formData, updateWorkStyle, onNext, onBack }: any) => (
    <div className="max-w-4xl w-full mx-auto animate-in fade-in duration-500 mt-6 sm:mt-10 px-1">
        <h2 className="text-3xl sm:text-4xl md:text-6xl font-black tracking-tighter uppercase mb-3 sm:mb-4 text-[#111827]">Working <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#e11d48] to-[#f59e0b]">Vibe.</span></h2>

        <div className="space-y-8 sm:space-y-12">
            <div>
                <label className="font-black uppercase text-xs sm:text-sm mb-3 sm:mb-4 block">Social Battery</label>
                <div className="grid grid-cols-3 gap-2 sm:gap-4">
                    {['Introvert', 'Ambivert', 'Extrovert'].map(battery => (
                        <div key={battery} onClick={() => updateWorkStyle('social_battery', battery)} className={`p-3 sm:p-6 border-2 sm:border-[3px] border-black rounded-xl sm:rounded-2xl cursor-pointer transition-all flex flex-col items-center text-center ${formData.gives.work_style.social_battery === battery ? 'bg-[#111827] text-white shadow-[4px_4px_0_#e11d48] sm:shadow-[6px_6px_0_#e11d48] -translate-y-1' : 'bg-white hover:shadow-[3px_3px_0_#000] sm:hover:shadow-[4px_4px_0_#000]'}`}>
                            <h3 className="font-black uppercase text-xs sm:text-lg">{battery}</h3>
                        </div>
                    ))}
                </div>
            </div>
            <div>
                <div className="flex justify-between font-black uppercase text-xs sm:text-sm mb-2 sm:mb-3"><span>Work Pace</span><span className="text-[#e11d48]">{formData.gives.work_style.pace}/10</span></div>
                <input type="range" min="0" max="10" className="w-full appearance-none bg-gray-200 h-3 sm:h-4 border-[2px] border-black rounded-full outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-7 [&::-webkit-slider-thumb]:h-7 sm:[&::-webkit-slider-thumb]:w-8 sm:[&::-webkit-slider-thumb]:h-8 [&::-webkit-slider-thumb]:bg-[#fde047] [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-black [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer" value={formData.gives.work_style.pace} onChange={(e) => updateWorkStyle('pace', parseInt(e.target.value))} />
            </div>
        </div>

        <div className="mt-10 sm:mt-16 flex justify-between items-center">
            <button onClick={onBack} className="text-gray-800 font-bold uppercase text-sm hover:text-black">← Back</button>
            <button disabled={!formData.gives.work_style.social_battery} onClick={onNext} className="bg-[#e11d48] text-white px-7 sm:px-10 py-3.5 sm:py-5 rounded-full font-black uppercase text-base sm:text-lg flex items-center gap-2 sm:gap-3 border-2 sm:border-[3px] border-black shadow-[4px_4px_0_#111827] sm:shadow-[6px_6px_0_#111827] hover:-translate-y-1 transition-all disabled:opacity-50 active:translate-y-0">
                Continue <ArrowRight size={18} />
            </button>
        </div>
    </div>
);