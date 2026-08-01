export type Lang = 'en' | 'ru';
export type Dictionary = typeof dictionaries.en;

export const dictionaries = {
    en: {
        nav: {
            about: "About Us",
            experiences: "Experiences",
            howItWorks: "How It Works",
            pricing: "Pricing",
            faq: "FAQ",
        },
        hero: {
            builtFor: "Built for Builders",
            stopNetworking: "Your Next",
            networking: "Co-Founder",
            startBuilding: "Is One",
            relationships: "Dinner Away.",
            meetAmbitious: "Meet ambitious",
            inRealLife: "in real life through curated dinners and activities. We find the people you need, in the places you love.",
            chatBot: {
                msg1: "Hey! 👋 Ready to meet the right people? Tell me what you're looking for.",
                msg2: "Need a CTO in London...",
                msg3: "Got it. I've matched you with 3 great candidates. Dinner this Saturday at the Ritz?",
                msg4: "I'm in! 👩‍💼",
                headerName: "coconect:",
                headerStatus: "usually replies instantly",
            }
        },
        signup: {
            title: "Let's get acquainted",
            msg1: "Hi! 👋 Let's get to know each other. What is your name?",
            name: "What is your name?",
            namePh: "Write your full name",
            phone: "Phone (same as WhatsApp)",
            phonePh: "+1 555 123 4567",
            linkedin: "LinkedIn",
            linkedinPh: "linkedin.com/in/your-name",
            errorAll: "Please fill out all three fields — start with your name.",
            errorGeneric: "Something went wrong.",
            continue: "Continue",
            creating: "Creating...",
            doneHeader: "Profile created",
            doneSub: "The final step is a couple of questions in WhatsApp: who are you looking for. Tap the button and write to us.",
            waBtn: "Continue in WhatsApp",
            waMsg: (name: string) => `Hi! This is ${name || "me"}, continuing Coconect onboarding.`,
            hint: (phone: string) => `Note: message us from the same number you entered (${phone}).`
        },
        onboarding: {
            h1a: "Network", h1b: "right.",
            sub: "Name, phone and a LinkedIn link — we'll handle the rest. Then we continue in WhatsApp.",
            name: "Name", phone: "Phone (same as WhatsApp)", linkedin: "LinkedIn",
            namePh: "e.g., Alex", phonePh: "+1 555 123 4567", liPh: "linkedin.com/in/your-name",
            cont: "Continue", parsing: "Parsing LinkedIn…",
            fillAll: "Fill in all three fields.", liErr: "Couldn't parse LinkedIn.",
            saveErr: "Failed to save profile.", oops: "Something went wrong.",
            doneA: "Profile", doneB: "ready.",
            doneSub: "Last step — a couple of questions in WhatsApp: who you're looking for. Tap the button and message us.",
            waBtn: "Continue in WhatsApp", waMsg: (n: string) => `Hi! This is ${n || "me"}, continuing Coconect onboarding.`,
            hint: (p: string) => `Note: message us from the same number you entered (${p}).`,
        }
    },
    ru: {
        nav: {
            about: "О нас",
            experiences: "События",
            howItWorks: "Как это работает",
            pricing: "Тарифы",
            faq: "FAQ",
        },
        hero: {
            builtFor: "Создано для созидателей",
            stopNetworking: "Твой будущий",
            networking: "Кофаундер",
            startBuilding: "В одном",
            relationships: "ужине от тебя.",
            meetAmbitious: "Встречай амбициозных",
            inRealLife: "вживую на кураторских ужинах и активностях. Мы находим нужных людей в местах, которые вам нравятся.",
            chatBot: {
                msg1: "Привет! 👋 Готов познакомиться с нужными людьми? Расскажи, кого ты ищешь.",
                msg2: "Нужен CTO в Лондоне...",
                msg3: "Понял. Я нашел 3 отличных кандидатов. Ужин в эту субботу в Ritz?",
                msg4: "Я в деле! 👩‍💼",
                headerName: "coconect:",
                headerStatus: "обычно отвечает сразу",
            }
        },
        signup: {
            title: "Давай знакомиться",
            msg1: "Привет! 👋 Давай знакомиться. Как тебя зовут?",
            name: "Как тебя зовут?",
            namePh: "Напиши своё имя",
            phone: "Телефон (как в WhatsApp)",
            phonePh: "+7 961 402 67 20",
            linkedin: "LinkedIn",
            linkedinPh: "linkedin.com/in/your-name",
            errorAll: "Заполни все три поля — начни с имени.",
            errorGeneric: "Что-то пошло не так.",
            continue: "Продолжить",
            creating: "Создаём...",
            doneHeader: "Профиль создан",
            doneSub: "Последний шаг — пара вопросов в WhatsApp: кого ты ищешь. Жми и напиши нам.",
            waBtn: "Продолжить в WhatsApp",
            waMsg: (name: string) => `Привет! Это ${name || "я"}, продолжаю онбординг Coconect.`,
            hint: (phone: string) => `Пиши с того же номера (${phone}).`
        },
        onboarding: {
            h1a: "Знакомься", h1b: "правильно.",
            sub: "Имя, телефон и ссылка на LinkedIn — остальное соберём сами. Дальше продолжим в WhatsApp.",
            name: "Имя", phone: "Телефон (тот же, что в WhatsApp)", linkedin: "LinkedIn",
            namePh: "например, Alex", phonePh: "+7 961 402 67 20", liPh: "linkedin.com/in/your-name",
            cont: "Продолжить", parsing: "Парсим LinkedIn…",
            fillAll: "Заполни все три поля.", liErr: "Не удалось распарсить LinkedIn.",
            saveErr: "Ошибка сохранения профиля.", oops: "Что-то пошло не так.",
            doneA: "Профиль", doneB: "готов.",
            doneSub: "Последний шаг — пара вопросов в WhatsApp: кого ты ищешь. Жми кнопку и напиши нам.",
            waBtn: "Продолжить в WhatsApp", waMsg: (n: string) => `Привет! Это ${n || "я"}, продолжаю онбординг Coconect.`,
            hint: (p: string) => `Важно: пиши с того же номера, что указал (${p}).`,
        }
    }
} as const;
