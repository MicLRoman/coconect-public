import os
import json
import pandas as pd
import numpy as np
from datetime import datetime
from collections import Counter

# --- ИМПОРТ МОДУЛЕЙ ---
from modules.parser_account_selenium import InstagramAccountParser
from modules.analyzer_cv import analyze_video, analyze_static_image
from modules.visualizer import create_dashboard

# --- КОНФИГУРАЦИЯ ---
TARGET_ACCOUNTS = [
#   "coffee.yes.rostov",
  "ivakhaaaa",
]

ITEMS_TO_PARSE = 50  # Сколько постов анализировать

# Папки
BASE_STORAGE_DIR = "storage"
RESULTS_DIR = "results"

class BrandAuditPipeline:
    def __init__(self):
        self.setup_directories()

    def setup_directories(self):
        if not os.path.exists(BASE_STORAGE_DIR): os.makedirs(BASE_STORAGE_DIR)
        if not os.path.exists(RESULTS_DIR): os.makedirs(RESULTS_DIR)

    def create_session_folder(self, account_name):
        date_str = datetime.now().strftime("%Y-%m-%d")
        clean_name = account_name.replace('@', '')
        folder_name = f"{clean_name}_{date_str}"
        full_path = os.path.join(BASE_STORAGE_DIR, folder_name)
        return os.path.abspath(full_path)

    def flatten_image_metrics(self, img_metrics, filename):
        """Превращает сырые данные анализатора фото в формат общей таблицы"""
        if not img_metrics: return {}
        
        # Colors
        top_colors = img_metrics.get('dom_colors', [])[:3]
        dom_color_hex = top_colors[0] if top_colors else "#000000"
        palette_str = ", ".join(top_colors)
        
        # AI Stats
        emotions = img_metrics.get('emotions', [])
        dom_emotion = Counter(emotions).most_common(1)[0][0] if emotions else "Unknown"
        
        ages = img_metrics.get('ages', [])
        avg_age = int(np.mean(ages)) if ages else 0
        
        genders = img_metrics.get('genders', [])
        dom_gender = Counter(genders).most_common(1)[0][0] if genders else "Unknown"
        
        # OCR
        words = img_metrics.get('ocr_words', [])
        keywords = ", ".join(words[:5])
        
        text_pct = img_metrics.get('text_pct', 0)
        face_count = img_metrics.get('face_count', 0)
        face_pct = 100 if face_count > 0 else 0

        return {
            'filename': filename,
            'media_type': 'image',
            'duration_cv': 0,
            'music_track': "N/A",
            'vol_avg': 0,
            'avg_motion': 0, 
            'avg_blur': img_metrics.get('quality_blur', 0),
            'dom_color': dom_color_hex,
            'palette': palette_str,
            'shot_type': "Photo",
            'face_pct': face_pct,
            'text_pct': text_pct,
            'content_type': f"Face: {face_pct}% | Text: {text_pct}%",
            'ai_emotion': dom_emotion,
            'ai_age': avg_age,
            'ai_gender': dom_gender,
            'ocr_keywords': keywords
        }

    def run_cycle(self):
        print(f"\n🚀 ЗАПУСК КОМПЛЕКСНОГО АУДИТА БРЕНДА")
        print(f"🎯 Аккаунты: {TARGET_ACCOUNTS}")
        
        all_data_rows = []
        profile_summaries = {}

        for account in TARGET_ACCOUNTS:
            print(f"\n--- [1/2] Парсинг профиля и ленты: {account} ---")
            
            session_path = self.create_session_folder(account)
            if not os.path.exists(session_path): os.makedirs(session_path)
            
            # 1. ЗАПУСК ПАРСЕРА
            parser = InstagramAccountParser()
            try:
                parser.run(account, ITEMS_TO_PARSE, session_path)
            except Exception as e:
                print(f"❌ Ошибка парсинга {account}: {e}")

            # 2. АНАЛИЗ ПРОФИЛЯ
            print(f"--- [2/2] Анализ контента (CV + AI): {account} ---")
            
            profile_info = {}
            profile_json = os.path.join(session_path, "profile_info.json")
            if os.path.exists(profile_json):
                with open(profile_json, 'r', encoding='utf-8') as f:
                    profile_info = json.load(f)
            
            avatar_path = os.path.join(session_path, "profile_pic.jpg")
            if os.path.exists(avatar_path):
                av_metrics = analyze_static_image(avatar_path)
                if av_metrics:
                    profile_info['avatar_colors'] = ", ".join(av_metrics['dom_colors'][:3])
            
            profile_summaries[account] = profile_info

            # 3. АНАЛИЗ КОНТЕНТА
            files = os.listdir(session_path)
            media_files = [f for f in files if (f.endswith('.mp4') or f.endswith('.jpg')) and f != "profile_pic.jpg"]
            
            for filename in media_files:
                shortcode = os.path.splitext(filename)[0]
                file_path = os.path.join(session_path, filename)
                
                # Метаданные
                meta = {"views": 0, "likes": 0, "caption": "", "date": "Unknown", "transcript": ""}
                
                json_path = os.path.join(session_path, f"{shortcode}.json")
                txt_path = os.path.join(session_path, f"{shortcode}.txt")
                tr_path = os.path.join(session_path, f"{shortcode}_tr.txt") # Транскрипт!
                
                if os.path.exists(json_path):
                    with open(json_path, 'r', encoding='utf-8') as f:
                        meta.update(json.load(f))
                if os.path.exists(txt_path):
                    with open(txt_path, 'r', encoding='utf-8') as f:
                        meta['caption'] = f.read().strip()
                if os.path.exists(tr_path):
                    with open(tr_path, 'r', encoding='utf-8') as f:
                        meta['transcript'] = f.read().strip() # Читаем транскрипт

                # CV Анализ
                cv_metrics = {}
                try:
                    if filename.endswith(".mp4"):
                        cv_metrics = analyze_video(file_path)
                        if cv_metrics: cv_metrics['media_type'] = 'video'
                    elif filename.endswith(".jpg"):
                        raw_metrics = analyze_static_image(file_path)
                        cv_metrics = self.flatten_image_metrics(raw_metrics, filename)
                except Exception as e:
                    print(f"   ⚠️ Ошибка анализа {filename}: {e}")

                if cv_metrics:
                    full_row = {**meta, **cv_metrics, 'account': account}
                    all_data_rows.append(full_row)
                    print(f"   ✨ Обработано: {shortcode} | {full_row.get('content_type', 'N/A')}")

        # --- ЭТАП 3: ОТЧЕТЫ ---
        if all_data_rows:
            date_str = datetime.now().strftime("%Y-%m-%d_%H-%M")
            run_result_dir = os.path.join(RESULTS_DIR, f"BrandAudit_{date_str}")
            os.makedirs(run_result_dir, exist_ok=True)
            
            # CSV
            df = pd.DataFrame(all_data_rows)
            # ER Calculation
            if 'likes' in df.columns and 'views' in df.columns:
                 df['ER_View'] = ((pd.to_numeric(df['likes'], errors='coerce').fillna(0) + 
                                   pd.to_numeric(df['comments'], errors='coerce').fillna(0)) / 
                                  (pd.to_numeric(df['views'], errors='coerce').fillna(0) + 1)) * 100
                 df['ER_View'] = df['ER_View'].round(2)

            # Reorder columns
            cols_order = ['account', 'media_type', 'date', 'likes', 'views', 'ER_View', 
                          'content_type', 'caption', 'transcript', 'ocr_keywords']
            final_cols = [c for c in cols_order if c in df.columns] + [c for c in df.columns if c not in cols_order]
            df = df[final_cols]
            
            csv_path = os.path.join(run_result_dir, "brand_audit_data.csv")
            df.to_csv(csv_path, index=False)
            print(f"\n✅ Таблица данных: {csv_path}")
            
            # Dashboard
            # try:
            #     create_dashboard(csv_path)
            # except: pass
            
            # LLM Prompt
            self.generate_audit_prompt(df, profile_summaries, run_result_dir)
        else:
            print("\n❌ Нет данных для отчета.")

    def generate_audit_prompt(self, df, profiles, output_dir):
        txt_path = os.path.join(output_dir, "LLM_Brand_Audit_Request.txt")
        with open(txt_path, 'w', encoding='utf-8') as f:
            f.write("ТВОЯ РОЛЬ: Бренд-стратег и Digital-аналитик.\n")
            f.write("ЗАДАЧА: Провести аудит визуальной стратегии и контента на основе данных.\n\n")
            
            for acc, info in profiles.items():
                f.write(f"=== ПРОФИЛЬ: {acc} ===\n")
                f.write(f"Stats: {info.get('posts', 0)} posts, {info.get('followers', 0)} followers.\n")
                f.write(f"Bio: {info.get('bio', 'N/A')}\n")
                
                acc_df = df[df['account'] == acc]
                if acc_df.empty: continue
                
                f.write(f"Контент: {len(acc_df)} постов проанализировано.\n")
                f.write(f"Доминирующая эмоция: {acc_df['ai_emotion'].mode()[0] if 'ai_emotion' in acc_df else 'N/A'}\n")
                
                f.write("\n--- ТОП-3 УСПЕШНЫХ ПОСТА (по лайкам) ---\n")
                top = acc_df.sort_values(by='likes', ascending=False).head(3)
                for _, row in top.iterrows():
                    f.write(f"\n[{row.get('media_type', '').upper()}] Likes: {row.get('likes')} | ER: {row.get('ER_View')}%\n")
                    f.write(f"Visual: {row.get('content_type')} | Shot: {row.get('shot_type')}\n")
                    f.write(f"Colors: {row.get('palette')} | Emotion: {row.get('ai_emotion')}\n")
                    f.write(f"Key Elements (OCR): {row.get('ocr_keywords')}\n")
                    f.write(f"Caption: {str(row.get('caption', ''))[:200]}...\n")
                    if row.get('transcript'):
                        f.write(f"TRANSCRIPT: {str(row.get('transcript'))[:300]}...\n")
                f.write("\n")

            f.write("=== ВОПРОСЫ ДЛЯ СТРАТЕГИИ ===\n")
            f.write("1. О чем говорят в видео (Transcript)? Какие ключевые сообщения транслирует бренд?\n")
            f.write("2. Visual Hook: Как бренд удерживает внимание (Motion, Cuts, Faces)?\n")
            f.write("3. Соответствует ли контент заявленной аудитории и Bio?\n")
            f.write("4. Дай 3 конкретные рекомендации по улучшению Reels.\n")

        print(f"🧠 Промпт для стратегии готов: {txt_path}")

if __name__ == "__main__":
    pipeline = BrandAuditPipeline()
    pipeline.run_cycle()