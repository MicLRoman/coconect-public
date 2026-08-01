import React from 'react';
import { ArrowRight } from 'lucide-react';

const QUICK_TAPS = {
    "🚀 Career": [
        { label: "Top-tier company insights", text: "I want to learn about the inner workings of top companies and understand how to get in." },
        { label: "Looking for a mentor", text: "Looking for an experienced mentor for professional growth." }
    ],
    "💡 Startups": [
        { label: "Looking for a co-founder", text: "Looking for a co-founder or partners to launch a joint project." },
        { label: "Brainstorm ideas", text: "Want to brainstorm ideas and discuss market trends." }
    ],
    "👋 Network & Social": [
        { label: "Just moved", text: "I recently moved, want to find local friends and join the community." },
        { label: "Just networking", text: "No strict goals, just want to meet cool people and grab a coffee." }
    ]
};

export const StepAsk = ({ formData, setFormData, onFinish, onBack }: any) => {

    const currentValue = formData?.asks?.custom_request_raw || "";

    // 1. Добавляем текст, напрямую используя текущий formData
    const appendToAsk = (text: string) => {
        const newText = currentValue.trim() ? `${currentValue} ${text}` : text;

        setFormData({
            ...formData,
            asks: {
                ...(formData?.asks || {}),
                custom_request_raw: newText
            }
        });
    };

    return (
        <div className="max-w-4xl w-full mx-auto animate-in fade-in duration-500 mt-6 sm:mt-10 px-1">
            <h2 className="text-3xl sm:text-4xl md:text-6xl font-black tracking-tighter uppercase mb-3 sm:mb-4 text-[#111827]">
                Your <span className="text-[#e11d48]">Ask.</span>
            </h2>
            <p className="text-sm sm:text-lg text-gray-900 font-medium mb-8 sm:mb-12 border-l-[3px] sm:border-l-[4px] border-black pl-3 sm:pl-4">
                Write what you need in your own words, or use AI quick prompts.
            </p>

            {/* 2. Обновляем текст при вводе с клавиатуры */}
            <textarea
                className="w-full h-32 sm:h-40 bg-white border-[3px] sm:border-[4px] border-black rounded-2xl sm:rounded-3xl p-4 sm:p-6 font-medium text-base sm:text-lg outline-none focus:border-[#e11d48] transition-colors shadow-[5px_5px_0px_0px_#000] sm:shadow-[8px_8px_0px_0px_#000] resize-none mb-6 sm:mb-8 placeholder:text-gray-400"
                placeholder="e.g., Looking for a technical co-founder to launch a FinTech project..."
                value={currentValue}
                onChange={(e) => setFormData({
                    ...formData,
                    asks: {
                        ...(formData?.asks || {}),
                        custom_request_raw: e.target.value
                    }
                })}
            ></textarea>

            <div className="mb-6 sm:mb-10">
                <h3 className="font-black uppercase text-xs sm:text-sm mb-3 sm:mb-4 text-[#111827]">Request Generator (Quick Taps)</h3>
                <div className="space-y-3 sm:space-y-4">
                    {Object.entries(QUICK_TAPS).map(([category, taps]) => (
                        <div key={category} className="bg-gray-100 border-[2px] border-black rounded-xl p-3 sm:p-4">
                            <h4 className="text-[10px] sm:text-xs font-bold text-gray-800 uppercase mb-2 sm:mb-3 tracking-widest">{category}</h4>
                            <div className="flex flex-wrap gap-1.5 sm:gap-2">
                                {taps.map(tap => (
                                    <button
                                        key={tap.label}
                                        onClick={() => appendToAsk(tap.text)}
                                        className="px-2.5 sm:px-4 py-1.5 sm:py-2 bg-white border-[2px] border-black rounded-lg text-[9px] sm:text-[11px] font-black uppercase text-[#111827] shadow-[2px_2px_0_#000] hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#000] transition-all active:translate-y-0"
                                    >
                                        * [{tap.label}]
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="mt-6 sm:mt-8 flex justify-between items-center">
                <button onClick={onBack} className="text-gray-800 font-bold uppercase text-sm hover:text-black">← Back</button>
                <button onClick={onFinish} className="bg-[#10b981] text-white px-7 sm:px-10 py-3.5 sm:py-5 rounded-full font-black uppercase text-base sm:text-lg flex items-center gap-2 sm:gap-3 border-2 sm:border-[3px] border-black shadow-[4px_4px_0_#111827] sm:shadow-[6px_6px_0_#111827] hover:-translate-y-1 transition-all active:translate-y-0">
                    Complete Profile <ArrowRight size={18} />
                </button>
            </div>
        </div>
    );
};