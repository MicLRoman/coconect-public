import React from 'react';
import { ArrowRight, FileText, Zap, MapPin } from 'lucide-react';

export const StepStatus = ({ formData, updateStatus, onNext, onBack }: any) => {
    const statusType = formData.gives.current_status.type;

    return (
        <div className="max-w-4xl w-full mx-auto animate-in fade-in duration-500 mt-6 sm:mt-10 px-1">
            <h2 className="text-3xl sm:text-4xl md:text-6xl font-black tracking-tighter uppercase mb-3 sm:mb-4 text-[#111827]">
                Current <span className="text-[#fde047] bg-black px-2">Status.</span>
            </h2>
            <p className="text-sm sm:text-lg text-gray-900 font-medium mb-8 sm:mb-12 border-l-[3px] sm:border-l-[4px] border-black pl-3 sm:pl-4">
                Do you work for a company, build your empire, or fly solo?
            </p>

            <div className="space-y-6 sm:space-y-10">
                <div className="grid grid-cols-3 gap-2 sm:gap-4">
                    {[
                        { id: "Employment", label: "Employment", icon: <FileText size={20} /> },
                        { id: "Business_Startup", label: "Business / Startup", icon: <Zap size={20} /> },
                        { id: "Freelance_Nomad", label: "Freelance / Nomad", icon: <MapPin size={20} /> }
                    ].map(status => (
                        <div
                            key={status.id}
                            onClick={() => {
                                updateStatus('type', status.id);
                                updateStatus('company_name', "");
                                updateStatus('stage', "");
                            }}
                            className={`p-3 sm:p-6 border-2 sm:border-[3px] border-black rounded-xl sm:rounded-2xl cursor-pointer transition-all flex flex-col items-center text-center gap-1.5 sm:gap-3 ${statusType === status.id ? 'bg-[#e11d48] text-white shadow-[4px_4px_0_#111827] sm:shadow-[6px_6px_0_#111827] -translate-y-1' : 'bg-white text-gray-900 hover:shadow-[3px_3px_0_#000] sm:hover:shadow-[4px_4px_0_#000] hover:text-black'}`}
                        >
                            {status.icon}
                            <span className="font-black uppercase text-[9px] sm:text-sm leading-tight">{status.label}</span>
                        </div>
                    ))}
                </div>

                {/* Показываем только если выбран Employment */}
                {statusType === 'Employment' && (
                    <div className="animate-in slide-in-from-top-4 fade-in duration-300">
                        <label className="font-black uppercase text-xs sm:text-sm mb-2 sm:mb-3 block">Where do you work?</label>
                        <input
                            type="text"
                            placeholder="e.g., Google, Local agency..."
                            value={formData.gives.current_status.company_name}
                            onChange={(e) => updateStatus('company_name', e.target.value)}
                            className="w-full bg-white border-2 sm:border-[3px] border-black rounded-xl sm:rounded-2xl p-3.5 sm:p-5 font-medium text-base sm:text-lg outline-none focus:shadow-[4px_4px_0_#fde047] sm:focus:shadow-[6px_6px_0_#fde047] transition-all"
                        />
                    </div>
                )}

                {/* Показываем если выбран Business/Startup */}
                {statusType === 'Business_Startup' && (
                    <div className="animate-in slide-in-from-top-4 fade-in duration-300 space-y-4 sm:space-y-6">
                        <div>
                            <label className="font-black uppercase text-xs sm:text-sm mb-2 sm:mb-3 block">Project / Company Name</label>
                            <input
                                type="text"
                                placeholder="e.g., Tablr"
                                value={formData.gives.current_status.company_name}
                                onChange={(e) => updateStatus('company_name', e.target.value)}
                                className="w-full bg-white border-2 sm:border-[3px] border-black rounded-xl sm:rounded-2xl p-3 sm:p-4 font-medium text-base sm:text-lg outline-none focus:shadow-[3px_3px_0_#111827] sm:focus:shadow-[4px_4px_0_#111827] transition-all"
                            />
                        </div>
                        <div>
                            <label className="font-black uppercase text-xs sm:text-sm mb-2 sm:mb-3 block">Current Stage</label>
                            <div className="flex flex-wrap gap-2 sm:gap-3">
                                {["Idea / MVP", "Scaling", "Mature Business"].map(stage => (
                                    <button
                                        key={stage}
                                        onClick={() => updateStatus('stage', stage)}
                                        className={`px-3.5 sm:px-5 py-2 sm:py-3 font-black uppercase text-[10px] sm:text-xs border-2 sm:border-[3px] border-black rounded-lg sm:rounded-xl transition-all ${formData.gives.current_status.stage === stage ? 'bg-[#111827] text-[#fde047]' : 'bg-white text-gray-800 hover:shadow-[3px_3px_0_#000] hover:text-black'}`}
                                    >
                                        {stage}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="mt-10 sm:mt-16 flex justify-between items-center">
                <button onClick={onBack} className="text-gray-800 font-bold uppercase text-sm hover:text-black">← Back</button>
                <button
                    disabled={!statusType}
                    onClick={onNext}
                    className="bg-[#fde047] text-black px-7 sm:px-10 py-3.5 sm:py-5 rounded-full font-black uppercase text-base sm:text-lg flex items-center gap-2 sm:gap-3 border-2 sm:border-[3px] border-black shadow-[4px_4px_0_#111827] sm:shadow-[6px_6px_0_#111827] hover:-translate-y-1 transition-all disabled:opacity-50 active:translate-y-0"
                >
                    Continue <ArrowRight size={18} />
                </button>
            </div>
        </div>
    );
};