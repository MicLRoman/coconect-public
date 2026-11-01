import os
import json
import pandas as pd
from datetime import datetime
import shutil

# --- ИМПОРТ МОДУЛЕЙ ---
from modules.reels_parser_account_selenium import InstagramAccountParser
from modules.reels_analyzer_cv import analyze_video
from modules.visualizer import create_dashboard # <--- НОВЫЙ ИМПОРТ

# --- КОНФИГУРАЦИЯ ---
TARGET_ACCOUNTS = [
    # "starbucks",
    # "bluebottle", 
    # "dunkin",
    # "nottebuyer"
    # "copiculture"
    "zubyzaden"
]
VIDEOS_TO_PARSE = 40  # Количество последних видео для анализа

# Папки
BASE_STORAGE_DIR = "storage"
RESULTS_DIR = "results"

class CompetitiveAnalysisPipeline:
    def __init__(self):
        self.setup_directories()

    def setup_directories(self):
        """Создает базовую структуру папок"""
        if not os.path.exists(BASE_STORAGE_DIR):
            os.makedirs(BASE_STORAGE_DIR)
        if not os.path.exists(RESULTS_DIR):
            os.makedirs(RESULTS_DIR)

    def create_session_folder(self, account_name):
        """Создает папку под конкретный аккаунт с датой"""
        date_str = datetime.now().strftime("%Y-%m-%d")
        
        # УБИРАЕМ '@' из имени папки
        clean_name = account_name.replace('@', '')
        folder_name = f"{clean_name}_{date_str}"
        
        full_path = os.path.join(BASE_STORAGE_DIR, folder_name)
        return os.path.abspath(full_path)

    def collect_metadata(self, session_path, shortcode):
        """Собирает все текстовые данные (JSON, Описание, Транскрипт)"""
        meta = {}
        
        # 1. Читаем JSON паспорт
        json_path = os.path.join(session_path, f"{shortcode}.json")
        if os.path.exists(json_path):
            with open(json_path, 'r', encoding='utf-8') as f:
                meta = json.load(f)
        else:
            meta = {"views": 0, "likes": 0, "comments": 0, "date": "Unknown"}

        # 2. Читаем Описание
        desc_path = os.path.join(session_path, f"{shortcode}.txt")
        if os.path.exists(desc_path):
            with open(desc_path, 'r', encoding='utf-8') as f:
                meta['caption'] = f.read().strip()
        else:
            meta['caption'] = ""

        # 3. Читаем Транскрипт
        tr_path = os.path.join(session_path, f"{shortcode}_tr.txt")
        if os.path.exists(tr_path):
            with open(tr_path, 'r', encoding='utf-8') as f:
                meta['transcript'] = f.read().strip()
        else:
            meta['transcript'] = ""
            
        return meta

    def run_cycle(self):
        print(f"\n🚀 ЗАПУСК АНАЛИЗА КОНКУРЕНТОВ")
        print(f"🎯 Аккаунты: {TARGET_ACCOUNTS}")
        print(f"🎞️ Глубина: {VIDEOS_TO_PARSE} видео на каждый")
        
        all_data_rows = []

        # --- ЭТАП 1: ПАРСИНГ ---
        for account in TARGET_ACCOUNTS:
            print(f"\n--- [1/2] Обработка аккаунта: {account} ---")
            
            # Создаем папку (если нет)
            session_path = self.create_session_folder(account)
            if not os.path.exists(session_path):
                os.makedirs(session_path)
            
            # Запускаем парсер
            parser = InstagramAccountParser()
            try:
                parser.run(account, VIDEOS_TO_PARSE, session_path)
            except Exception as e:
                print(f"❌ Ошибка парсинга {account}: {e}")
                pass

            # --- ЭТАП 2: АНАЛИЗ ---
            print(f"--- [2/2] Анализ контента (CV + Audio): {account} ---")
            
            if not os.path.exists(session_path):
                print("   ⚠️ Папка не найдена, пропускаем анализ.")
                continue

            video_files = [f for f in os.listdir(session_path) if f.endswith('.mp4')]
            
            if not video_files:
                print("   ⚠️ Видео не найдены в папке.")

            for vid_file in video_files:
                vid_path = os.path.join(session_path, vid_file)
                shortcode = os.path.splitext(vid_file)[0]
                
                # 1. Сбор метаданных
                meta = self.collect_metadata(session_path, shortcode)
                meta['account'] = account
                meta['filename'] = vid_file
                
                # 2. CV Анализ
                try:
                    cv_metrics = analyze_video(vid_path)
                    if cv_metrics:
                        full_row = {**meta, **cv_metrics}
                        all_data_rows.append(full_row)
                        print(f"   ✨ Данные собраны: {shortcode}")
                except Exception as e:
                    print(f"   ⚠️ Ошибка CV анализа {vid_file}: {e}")

        # --- ЭТАП 3: ФИНАЛЬНЫЙ ОТЧЕТ И ВИЗУАЛИЗАЦИЯ ---
        if all_data_rows:
            date_str = datetime.now().strftime("%Y-%m-%d_%H-%M")
            
            # Создаем папку результатов для этого запуска
            run_result_dir = os.path.join(RESULTS_DIR, f"CompetitorAnalysis_{date_str}")
            os.makedirs(run_result_dir, exist_ok=True)
            
            # Сохраняем CSV
            df = pd.DataFrame(all_data_rows)
            
            # Добавляем расчетные метрики (ER)
            if 'views' in df.columns and 'likes' in df.columns:
                 # views+1 чтобы не делить на ноль
                 df['ER'] = ((pd.to_numeric(df['likes'], errors='coerce').fillna(0) + 
                              pd.to_numeric(df['comments'], errors='coerce').fillna(0)) / 
                             (pd.to_numeric(df['views'], errors='coerce').fillna(0) + 1)) * 100
                 df['ER'] = df['ER'].round(2)

            cols = ['account', 'date', 'likes', 'views', 'ER', 'avg_motion', 'temp_type', 'shot_type', 'caption', 'transcript', 'music_track']
            for c in df.columns:
                if c not in cols:
                    cols.append(c)
            df = df[cols]
            
            csv_path = os.path.join(run_result_dir, "all_competitors_trends.csv")
            df.to_csv(csv_path, index=False)
            
            print(f"\n✅ ОТЧЕТ ГОТОВ: {csv_path}")
            
            # --- ЗАПУСК ВИЗУАЛИЗАЦИИ ---
            print("\n📊 Запуск генерации графиков...")
            create_dashboard(csv_path) # <--- Вызов функции из модуля
            
            # Генерация промпта для LLM
            self.generate_trend_prompt(df, run_result_dir)

        else:
            print("\n❌ Данные не собраны.")

    def generate_trend_prompt(self, df, output_dir):
        """Генерирует промпт для выявления трендов по всем конкурентам"""
        txt_path = os.path.join(output_dir, "LLM_Trend_Request.txt")
        
        with open(txt_path, 'w', encoding='utf-8') as f:
            f.write("ТВОЯ РОЛЬ: Аналитик трендов в Social Media (Instagram Reels).\n")
            f.write(f"ЗАДАЧА: Проанализируй данные по {len(TARGET_ACCOUNTS)} конкурентам и выяви текущие мета-тренды.\n\n")
            
            f.write("=== АГРЕГИРОВАННЫЕ ДАННЫЕ ===\n")
            
            for account in df['account'].unique():
                acc_df = df[df['account'] == account]
                f.write(f"\n🔎 АККАУНТ: {account}\n")
                
                # Топ-3 видео по лайкам
                # Убедимся, что лайки числовые
                if 'likes' in acc_df.columns:
                    acc_df['likes'] = pd.to_numeric(acc_df['likes'], errors='coerce').fillna(0)
                    top_videos = acc_df.sort_values(by='likes', ascending=False).head(3)
                else:
                    top_videos = acc_df.head(3)
                
                for _, row in top_videos.iterrows():
                    f.write(f"   - TOP VIDEO (Date: {row.get('date')}, Likes: {row.get('likes')}, Views: {row.get('views')}): \n")
                    f.write(f"     Motion: {row.get('avg_motion')} | Shot: {row.get('shot_type')} | Temp: {row.get('temp_type')} | Color: {row.get('dom_color')}\n")
                    f.write(f"     Music: {row.get('music_track')}\n")
                    f.write(f"     Hook/Text: {str(row.get('caption'))[:100]}...\n")
                    f.write(f"     Transcript Topic: {str(row.get('keywords'))}\n")
            
            f.write("\n=== ВОПРОСЫ К АНАЛИЗУ ===\n")
            f.write("1. Visual Patterns: Какие цвета и планы (крупный/общий) сейчас доминируют в топе?\n")
            f.write("2. Audio: Используется ли популярная музыка или разговорный жанр (ASMR/Voiceover)?\n")
            f.write("3. Content: О чем говорят в транскриптах успешных видео?\n")
            f.write("4. Dynamics: Какой монтаж побеждает — быстрый (High Motion) или медленный (Low Motion)?\n")

        print(f"🧠 Промпт для нейросети сохранен: {txt_path}")

if __name__ == "__main__":
    pipeline = CompetitiveAnalysisPipeline()
    pipeline.run_cycle()