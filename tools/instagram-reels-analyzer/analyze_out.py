import pandas as pd
import numpy as np

# 1. Загрузка и первичная обработка
try:
    df = pd.read_csv("C:/PROGA/SMM/results/BrandAudit_2026-02-17_18-46/brand_audit_data.csv")
    
    # Конвертация даты
    df['date'] = pd.to_datetime(df['date'])
    df['hour'] = df['date'].dt.hour
    df['day_of_week'] = df['date'].dt.day_name()
    
    # Фильтрация только видео (так как анализируем Reels)
    videos = df[df['media_type'] == 'video'].copy()
    
    # Заполнение пропусков нулями для числовых метрик
    numeric_cols = ['views', 'likes', 'comments', 'duration_cv', 'avg_motion', 'cuts_per_min', 'face_pct', 'avg_blur']
    videos[numeric_cols] = videos[numeric_cols].fillna(0)

except Exception as e:
    print(f"Ошибка загрузки данных: {e}")
    # Создаем фиктивный датафрейм для демонстрации, если файл не считается
    videos = pd.DataFrame()

def generate_insight_report(df):
    if df.empty:
        return "Нет данных для анализа."

    print("--- 🧠 AGENCY_OS: DEEP CONTENT AUDIT ---")
    print(f"Анализируемый аккаунт: {df['account'].iloc[0]}")
    print(f"Всего роликов проанализировано: {len(df)}")
    print("-" * 40)

    # 1. АНАЛИЗ "HUMAN TOUCH" (Влияние лица в кадре)
    with_face = df[df['face_pct'] > 10]['views'].mean()
    no_face = df[df['face_pct'] <= 10]['views'].mean()
    
    print("1. HUMAN FACTOR (Люди в кадре):")
    if with_face > no_face:
        lift = ((with_face - no_face) / no_face) * 100
        print(f"✅ Видео с людьми набирают на {lift:.1f}% больше просмотров.")
        print(f"   (Ср. просмотры с лицом: {with_face:.0f} vs Без: {no_face:.0f})")
    else:
        print("⚠️ Лицо в кадре НЕ гарантирует просмотры. Возможно, проблема в харизме или качестве съемки.")

    print("-" * 40)

    # 2. АНАЛИЗ ДИНАМИКИ (Motion & Cuts)
    high_motion = df[df['avg_motion'] > df['avg_motion'].median()]['views'].mean()
    low_motion = df[df['avg_motion'] <= df['avg_motion'].median()]['views'].mean()
    
    print("2. DYNAMICS (Динамика видео):")
    if high_motion > low_motion:
        print(f"✅ Динамичные видео залетают лучше (Avg Views: {high_motion:.0f}).")
        print("   Рекомендация: Больше движения в кадре, меньше статики.")
    else:
        print("ℹ️ Статичные видео работают не хуже. Возможно, это эстетика/атмосфера.")

    # Корреляция склеек
    corr_cuts = df['cuts_per_min'].corr(df['views'])
    print(f"   Корреляция частоты монтажа и просмотров: {corr_cuts:.2f}")
    if corr_cuts > 0.3:
        print("   👉 Чем чаще монтаж, тем больше просмотров (Клиповое мышление).")
    
    print("-" * 40)

    # 3. ТЕХНИЧЕСКОЕ КАЧЕСТВО (Blur)
    blur_issues = df[df['avg_blur'] > 20] # Условный порог размытия
    if not blur_issues.empty:
        print(f"3. QUALITY RED FLAGS:")
        print(f"⚠️ {len(blur_issues)} видео имеют высокий уровень размытия (Blur > 20).")
        print("   Это убивает удержание. Протрите камеру или настройте фокус.")
    else:
        print("3. QUALITY: Техническое качество картинки в норме.")

    print("-" * 40)

    # 4. ЛУЧШЕЕ ВРЕМЯ (Heatmap упрощенно)
    best_hour = df.groupby('hour')['views'].median().idxmax()
    print(f"4. TIMING:")
    print(f"   Лучшее время для постинга (по медиане просмотров): {best_hour}:00")

    print("-" * 40)
    
    # 5. ТОП КОНТЕНТ (Деконструкция успеха)
    top_video = df.loc[df['views'].idxmax()]
    print("🏆 BEST PERFORMING VIDEO:")
    print(f"   Дата: {top_video['date'].date()}")
    print(f"   Просмотры: {top_video['views']}")
    print(f"   Длительность: {top_video['duration_cv']} сек")
    print(f"   Эмоция AI: {top_video['ai_emotion']}")
    print(f"   Описание: {str(top_video['caption'])[:50]}...")

# Запуск анализа
if not videos.empty:
    generate_insight_report(videos)
else:
    print("Не удалось загрузить видео из файла.")