import os

file_path = "app/onboarding/page.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

replacements = {
    # Step 10
    "Загрузите ваше Резюме": "Upload your Resume",
    "ИИ извлечет ваш вектор": "AI will extract your vector",
    "Парсинг Документа...": "Parsing Document...",
    "Анализ опыта и навыков": "Analyzing experience and skills",
    "Кликните или перетащите файл сюда": "Click or drag file here",
    
    # Step 11
    "Резюме Обработано": "Resume Processed",
    "Опыт <span className=\"text-[#e11d48]\">Синхронизирован.</span>": "Experience <span className=\"text-[#e11d48]\">Synchronized.</span>",
    "Отлично, мы успешно извлекли ваш профессиональный бэкграунд из файла.<br />": "Great, we have successfully extracted your professional background from the file.<br />",
    "<span className=\"text-gray-500 font-bold text-base block mt-2\">Теперь заполним базовую информацию для поиска подходящих людей.</span>": "<span className=\"text-gray-500 font-bold text-base block mt-2\">Now let's fill in basic info to find matching people.</span>",
    "Продолжить": "Continue",
    "← Назад": "← Back",
    
    # Step 20
    "Синхронизация...": "Syncing...",
    "Парсинг профиля LinkedIn": "Parsing LinkedIn profile",
    
    # Step 21
    "LinkedIn Подключен": "LinkedIn Connected",
    "Опыт <span className=\"text-[#0a66c2]\">Синхронизирован.</span>": "Experience <span className=\"text-[#0a66c2]\">Synchronized.</span>",
    "Мы успешно извлекли ваш профессиональный профиль из LinkedIn.<br />": "We have successfully extracted your professional profile from LinkedIn.<br />",
    "<span className=\"text-gray-500 font-bold text-base block mt-2\">Теперь заполним базовую информацию для локального мэтчинга.</span>": "<span className=\"text-gray-500 font-bold text-base block mt-2\">Now let's fill in basic info for local matching.</span>",
    
    # Step 1
    "Базовая <span className=\"text-[#38bdf8]\">Информация.</span>": "Basic <span className=\"text-[#38bdf8]\">Information.</span>",
    "Фундамент для локального мэтчинга и комфортного общения.": "The foundation for local matching and comfortable networking.",
    "Имя": "Name",
    "Например: Alex": "e.g., Alex",
    "Город": "City",
    "Выберите город...": "Select a city...",
    "Район": "Neighborhood",
    "Выберите район...": "Select a neighborhood...",
    "Языки общения": "Spoken Languages",
    "Дальше": "Next",
    
    # Step 2
    "Ваш <span className=\"text-[#e11d48]\">Фундамент.</span>": "Your <span className=\"text-[#e11d48]\">Foundation.</span>",
    "Нетворк выпускников дает огромный буст к взаимной полезности. Расскажите, где вы учились и на чем сфокусированы.": "Alumni networks provide a huge boost to mutual utility. Tell us where you studied and what your focus is.",
    "Университет / Альма-матер": "University / Alma Mater",
    "Например: Stanford University, 2024": "e.g., Stanford University, 2024",
    "На чем вы сфокусированы сейчас?": "What are you focused on right now?",
    "(Выберите до 2)": "(Select up to 2)",
    "Обучение / Портфолио": "Learning / Portfolio",
    "Впитываю знания": "Absorbing knowledge",
    "Практика / Исполнение": "Practice / Execution",
    "Глубоко в процессах": "Deep in processes",
    "Архитектура / Лидерство": "Architecture / Leadership",
    "Веду команду": "Leading the team",
    "Стратегия / Найм": "Strategy / Hiring",
    "Смотрю глобально": "Looking globally",
    
    # Step 3
    "Факт 01: The Anti-Flex": "Fact 01: The Anti-Flex",
    "80% людей в приложениях для нетворкинга<br />": "80% of people on networking apps<br />",
    "страдают <span className=\"text-[#e11d48]\">синдромом самозванца.</span>": "suffer from <span className=\"text-[#e11d48]\">imposter syndrome.</span>",
    "\"Нас не волнуют ваши раздутые должности. Нам важен ваш реальный вайб. Снимите маску. Будьте собой.\"": "\"We don't care about inflated job titles. We care about your real vibe. Drop the mask. Be yourself.\"",
    "Пропустить": "Skip",
    
    # Step 4
    "Индустрия & <span className=\"text-white bg-black px-2\">Навыки.</span>": "Industry & <span className=\"text-white bg-black px-2\">Skills.</span>",
    "Выберите ваши домены (Максимум 3). Затем выберите ключевые хард-скиллы.": "Select your domains (Max 3). Then choose key hard skills.",
    "1. Выберите индустрии": "1. Select industries",
    "(Выберите до 3)": "(Select up to 3)",
    "2. Выберите навыки": "2. Select skills",
    "(Выберите до {maxSkills})": "(Select up to {maxSkills})",
    
    # Step 5
    "Текущий <span className=\"text-[#fde047] bg-black px-2\">Статус.</span>": "Current <span className=\"text-[#fde047] bg-black px-2\">Status.</span>",
    "Вы работаете на компанию, строите свою империю или находитесь в свободном полете?": "Do you work for a company, build your empire, or fly solo?",
    "Найм / Работа": "Employment",
    "Свой Бизнес / Стартап": "Business / Startup",
    "Фриланс / Номад": "Freelance / Nomad",
    "Где вы работаете?": "Where do you work?",
    "Например: Google, Локальное агентство...": "e.g., Google, Local agency...",
    "Название Проекта / Компании": "Project / Company Name",
    "Например: Tablr": "e.g., Tablr",
    "Текущая Стадия": "Current Stage",
    "Идея / MVP": "Idea / MVP",
    "Масштабирование": "Scaling",
    "Зрелый бизнес": "Mature Business",
    
    # Step 6
    "Рабочий <span className=\"text-transparent bg-clip-text bg-gradient-to-r from-[#e11d48] to-[#f59e0b]\">Вайб.</span>": "Working <span className=\"text-transparent bg-clip-text bg-gradient-to-r from-[#e11d48] to-[#f59e0b]\">Vibe.</span>",
    "Мы избегаем неловких пауз и доминирования в беседах. Расскажите, как вы взаимодействуете в социуме.": "We avoid awkward silences and conversation hogs. Tell us how you interact socially.",
    "Социальная Батарейка": "Social Battery",
    "Интроверт": "Introvert",
    "Слушаю больше, говорю по делу": "Listen more, speak to the point",
    "Амбиверт": "Ambivert",
    "Адаптивен, идеальный мост": "Adaptive, perfect bridge",
    "Экстраверт": "Extrovert",
    "Провайдер энергии и айсбрейкер": "Energy provider & icebreaker",
    "Темп Работы": "Work Pace",
    "Спокойно / Методично": "Calm / Methodical",
    "Скорость / Хаос": "Speed / Chaos",
    
    # Step 7
    "Ваш <span className=\"text-[#e11d48]\">Запрос.</span>": "Your <span className=\"text-[#e11d48]\">Ask.</span>",
    "Напишите, что вам нужно своими словами, или воспользуйтесь быстрыми подсказками ИИ.": "Write what you need in your own words, or use AI quick prompts.",
    "Например: Ищу кофаундера с техническим бэкграундом для запуска FinTech проекта...": "e.g., Looking for a technical co-founder to launch a FinTech project...",
    "Генератор запросов (Quick Taps)": "Request Generator (Quick Taps)",
    "Запуск Движка": "Start Engine",
    
    # Step 8
    "Инициализация<br />": "Initializing<br />",
    "<span className=\"text-transparent bg-clip-text bg-gradient-to-r from-[#e11d48] to-[#fde047]\">Движка Мэтчинга.</span>": "<span className=\"text-transparent bg-clip-text bg-gradient-to-r from-[#e11d48] to-[#fde047]\">Matching Engine.</span>",
    "Анализ векторов...": "Analyzing vectors...",
    "Матрица контекста...": "Context matrix...",
    "Синхронизация вайба...": "Vibe synchronization...",
    "Проверка взаимности...": "Reciprocity check..."
}

for k, v in replacements.items():
    content = content.replace(k, v)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Done translating!")
