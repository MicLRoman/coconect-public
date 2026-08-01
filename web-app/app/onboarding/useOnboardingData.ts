import { useState, useEffect, useCallback } from 'react';
import { FormDataProps, INITIAL_FORM_DATA } from './types';

export function useOnboardingData() {
    const [formData, setFormData] = useState<FormDataProps>(INITIAL_FORM_DATA);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const saved = sessionStorage.getItem('tablr_onboarding_draft');

        if (saved && saved !== "undefined" && saved !== "null") {
            try {
                const parsed = JSON.parse(saved);

                // ГАРАНТИЯ СТРУКТУРЫ: Склеиваем дефолт с кэшем
                setFormData({
                    ...INITIAL_FORM_DATA,
                    ...parsed,
                    basic_info: { ...INITIAL_FORM_DATA.basic_info, ...(parsed.basic_info || {}) },
                    gives: { ...INITIAL_FORM_DATA.gives, ...(parsed.gives || {}) },
                    asks: { ...INITIAL_FORM_DATA.asks, ...(parsed.asks || {}) }
                });
            } catch (e) {
                console.error("Failed to parse onboarding draft. Resetting...");
                sessionStorage.removeItem('tablr_onboarding_draft');
            }
        }
        setIsLoaded(true);
    }, []);

    // Функция для обновления состояния и синхронизации с кэшем
    const updateState = useCallback((updater: (prev: FormDataProps) => FormDataProps) => {
        setFormData(prev => {
            const next = updater(prev);
            sessionStorage.setItem('tablr_onboarding_draft', JSON.stringify(next));
            return next;
        });
    }, []);

    // Хелпер для полной замены объекта (нужен для StepAsk)
    const setFullFormData = (data: any) => {
        updateState((prev) => {
            // Проверка на функцию (если передаем prev => ...)[cite: 1]
            const next = typeof data === 'function' ? data(prev) : data;
            return next;
        });
    };

    const updateBasic = (field: string, value: any) => {
        updateState(prev => ({
            ...prev,
            basic_info: { ...prev.basic_info, [field]: value }
        }));
    };

    const toggleLanguage = (lang: string) => {
        updateState(prev => {
            const langs = prev.basic_info.languages;
            const newLangs = langs.includes(lang) ? langs.filter(l => l !== lang) : [...langs, lang];
            return { ...prev, basic_info: { ...prev.basic_info, languages: newLangs } };
        });
    };

    const updateGive = (field: string, value: any) => {
        updateState(prev => ({
            ...prev,
            gives: { ...prev.gives, [field]: value }
        }));
    };

    const toggleExperience = (id: string) => {
        updateState(prev => {
            const current = prev.gives.experience_level;
            const next = current.includes(id) ? current.filter(x => x !== id) : [...current, id];
            return { ...prev, gives: { ...prev.gives, experience_level: next.slice(0, 2) } };
        });
    };

    const toggleIndustry = (ind: string) => {
        updateState(prev => {
            const current = prev.gives.industry;
            const next = current.includes(ind) ? current.filter(x => x !== ind) : [...current, ind];
            return { ...prev, gives: { ...prev.gives, industry: next.slice(0, 3), hard_skills: [] } };
        });
    };

    const toggleSkill = (skill: string) => {
        updateState(prev => {
            const current = prev.gives.hard_skills;
            const next = current.includes(skill) ? current.filter(s => s !== skill) : [...current, skill];
            return { ...prev, gives: { ...prev.gives, hard_skills: next } };
        });
    };

    const updateStatus = (field: string, value: any) => {
        updateState(prev => ({
            ...prev,
            gives: {
                ...prev.gives,
                current_status: { ...prev.gives.current_status, [field]: value }
            }
        }));
    };

    const updateWorkStyle = (field: string, value: any) => {
        updateState(prev => ({
            ...prev,
            gives: {
                ...prev.gives,
                work_style: { ...prev.gives.work_style, [field]: value }
            }
        }));
    };

    return {
        formData, isLoaded, setFullFormData: (data: any) => updateState(() => data),
        updateBasic, toggleLanguage, updateGive, toggleExperience,
        toggleIndustry, toggleSkill, updateStatus, updateWorkStyle
    };
}