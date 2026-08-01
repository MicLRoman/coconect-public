"use client";

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { RefreshCcw } from 'lucide-react';

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();

    // Определяем, на каком мы шаге, чтобы закрасить прогресс-бар
    const stepsMap = ['/method', '/name', '/age', '/city', '/languages', '/foundation', '/industry-skills', '/status', '/work-vibe', '/ask'];

    // Если мы на титульном экране (просто /onboarding), прячем хедер
    if (pathname === '/onboarding') {
        return <>{children}</>;
    }

    // Считаем прогресс (от 0 до 6)
    const currentStepIndex = stepsMap.findIndex(path => pathname.includes(path));

    const handleRestart = () => {
        if (window.confirm("Вы уверены, что хотите начать сначала?")) {
            sessionStorage.removeItem('tablr_onboarding_draft');
            router.push('/onboarding');
        }
    };

    return (
        <div className="min-h-screen bg-[#fafafa] font-sans pb-20">
            <header className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6 flex items-center justify-between z-50 relative">
                <div className="flex gap-1.5 sm:gap-2">
                    {stepsMap.map((_, i) => (
                        <div key={i} className={`h-1.5 sm:h-2 rounded-full transition-all duration-300 ${currentStepIndex >= i ? 'bg-[#111827] w-7 sm:w-10 shadow-[2px_2px_0px_0px_#fde047]' : 'bg-gray-200 w-3 sm:w-4'}`} />
                    ))}
                </div>
                <button onClick={handleRestart} className="text-gray-400 hover:text-[#e11d48] transition-colors flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider">
                    <RefreshCcw size={14} /> <span className="hidden sm:inline">Start Over</span>
                </button>
            </header>

            {/* Сюда будут подгружаться сами страницы шагов */}
            <main className="px-4 sm:px-6">{children}</main>
        </div>
    );
}