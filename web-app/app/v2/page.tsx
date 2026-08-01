"use client";

import React, { useState, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '../lib/LanguageContext';

export default function V2Page() {
    return (
        <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-6">
            <HeroChat />
        </div>
    );
}

const HeroChat = () => {
    const { t } = useLanguage();
    const [step, setStep] = useState(0);

    useEffect(() => {
        const sequence = [
            { delay: 1000, next: 1 }, // Show first bot message
            { delay: 2000, next: 2 }, // Show typing indicator for user
            { delay: 1500, next: 3 }, // Show user message
            { delay: 1000, next: 4 }, // Show typing indicator for bot
            { delay: 2500, next: 5 }, // Show second bot message
            { delay: 2000, next: 6 }, // Show typing indicator for user
            { delay: 1000, next: 7 }, // Show final user message
        ];

        let currentTimeout: NodeJS.Timeout;

        const runSequence = (index: number) => {
            if (index >= sequence.length) {
                // Loop sequence
                currentTimeout = setTimeout(() => {
                    setStep(0);
                    runSequence(0);
                }, 5000);
                return;
            }
            
            currentTimeout = setTimeout(() => {
                setStep(sequence[index].next);
                runSequence(index + 1);
            }, sequence[index].delay);
        };

        runSequence(0);

        return () => clearTimeout(currentTimeout);
    }, []);

    const ChatBubble = ({ isBot, text, visible, typing }: { isBot: boolean, text?: string, visible: boolean, typing?: boolean }) => {
        if (!visible && !typing) return null;

        return (
            <div className={`flex w-full ${isBot ? 'justify-start' : 'justify-end'} mb-4 animate-in fade-in slide-in-from-bottom-4 duration-500`}>
                <div className={`max-w-[85%] px-5 py-3.5 border-[3px] border-black text-sm font-bold ${
                    isBot 
                        ? 'bg-white text-black rounded-3xl rounded-tl-sm shadow-[4px_4px_0_#fde047]' 
                        : 'bg-[#e11d48] text-white rounded-3xl rounded-tr-sm shadow-[4px_4px_0_#111827]'
                }`}>
                    {typing ? (
                        <div className="flex gap-1 items-center h-5">
                            <div className={`w-2 h-2 rounded-full animate-bounce ${isBot ? 'bg-black' : 'bg-white'}`}></div>
                            <div className={`w-2 h-2 rounded-full animate-bounce delay-75 ${isBot ? 'bg-black' : 'bg-white'}`}></div>
                            <div className={`w-2 h-2 rounded-full animate-bounce delay-150 ${isBot ? 'bg-black' : 'bg-white'}`}></div>
                        </div>
                    ) : text}
                </div>
            </div>
        );
    };

    return (
        <div className="relative w-full max-w-[400px] bg-[#fafafa] border-[4px] border-black rounded-[2.5rem] shadow-[12px_12px_0_#111827] overflow-hidden flex flex-col h-[520px] mx-auto z-40 transform lg:rotate-2 hover:rotate-0 transition-transform duration-500">
            {/* Chat Header */}
            <div className="bg-[#111827] text-white px-6 py-4 flex items-center gap-3 border-b-[4px] border-black shrink-0">
                <div className="w-10 h-10 rounded-full bg-[#fde047] border-[3px] border-black flex items-center justify-center font-black text-black text-sm shadow-[2px_2px_0_#e11d48]">c:</div>
                <div className="flex-1">
                    <div className="font-black tracking-tight leading-none text-lg">{t.hero.chatBot.headerName}</div>
                    <div className="text-xs text-white/60 font-bold mt-0.5 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                        {t.hero.chatBot.headerStatus}
                    </div>
                </div>
            </div>

            {/* Chat Messages Area */}
            <div className="flex-1 p-5 overflow-y-auto flex flex-col justify-end bg-gray-50/50 relative">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-[0.03] z-0 pointer-events-none" style={{ backgroundImage: 'linear-gradient(#111827 1px, transparent 1px), linear-gradient(90deg, #111827 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                
                <div className="relative z-10 w-full">
                    <ChatBubble isBot={true} text={t.hero.chatBot.msg1} visible={step >= 1} />
                    {step === 2 && <ChatBubble isBot={false} visible={true} typing={true} />}
                    <ChatBubble isBot={false} text={t.hero.chatBot.msg2} visible={step >= 3} />
                    {step === 4 && <ChatBubble isBot={true} visible={true} typing={true} />}
                    <ChatBubble isBot={true} text={t.hero.chatBot.msg3} visible={step >= 5} />
                    {step === 6 && <ChatBubble isBot={false} visible={true} typing={true} />}
                    <ChatBubble isBot={false} text={t.hero.chatBot.msg4} visible={step >= 7} />
                </div>
            </div>
            
            {/* Input Area */}
            <div className="p-4 bg-white border-t-[4px] border-black flex gap-3 shrink-0">
                <div className="flex-1 border-[3px] border-black rounded-full px-4 py-2.5 bg-gray-100 flex items-center opacity-50">
                    <span className="w-[2px] h-4 bg-black animate-pulse"></span>
                </div>
                <div className="w-12 h-12 bg-[#38bdf8] border-[3px] border-black rounded-full flex items-center justify-center shadow-[2px_2px_0_#111827]">
                    <ArrowRight size={20} strokeWidth={3} className="text-black" />
                </div>
            </div>
        </div>
    );
};
