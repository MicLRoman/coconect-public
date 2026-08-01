"use client";

import React, { createContext, useContext } from "react";
import { dictionaries, Lang, Dictionary } from "./dictionaries";

interface LanguageContextType {
    lang: Lang;
    setLang: (lang: Lang) => void;
    t: Dictionary;
}

const defaultLang: Lang = 'en';

const LanguageContext = createContext<LanguageContextType>({
    lang: defaultLang,
    setLang: () => {},
    t: dictionaries[defaultLang],
});

export const useLanguage = () => useContext(LanguageContext);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    // Только английский на сайте (решение 2026-06-18). Переключатель и авто-детект убраны.
    const lang: Lang = 'en';
    const setLang = (_newLang: Lang) => { /* no-op: English only */ };
    const t = dictionaries[lang];

    return (
        <LanguageContext.Provider value={{ lang, setLang, t }}>
            {children}
        </LanguageContext.Provider>
    );
}
