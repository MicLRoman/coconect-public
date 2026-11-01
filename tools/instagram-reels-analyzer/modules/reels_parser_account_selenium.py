import time
import pandas as pd
import random
import os
import json
import shutil
import requests
import warnings
import instaloader
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from webdriver_manager.chrome import ChromeDriverManager
from colorama import Fore, Style, init

init(autoreset=True)
warnings.filterwarnings("ignore")

# Попытка импорта Whisper
try:
    import whisper
    WHISPER_AVAILABLE = True
except ImportError:
    WHISPER_AVAILABLE = False
    print(f"{Fore.YELLOW}⚠️ Библиотека openai-whisper не найдена.")

class InstagramAccountParser:
    def __init__(self):
        self.driver = None
        self.session = requests.Session()
        
        # Возвращаем Instaloader для скачивания
        self.L = instaloader.Instaloader()
        self.L.download_pictures = False
        self.L.download_video_thumbnails = False
        self.L.download_geotags = False
        self.L.download_comments = False
        self.L.save_metadata = False
        self.L.compress_json = False

        if WHISPER_AVAILABLE:
            print(f"{Fore.CYAN}⏳ Загрузка модели Whisper (Base)...")
            try:
                self.whisper_model = whisper.load_model("base")
                print(f"{Fore.GREEN}✅ Whisper готов.")
            except Exception as e:
                print(f"{Fore.RED}Ошибка Whisper: {e}")
                self.whisper_model = None
        else:
            self.whisper_model = None

    def setup_driver(self):
        print(f"{Fore.CYAN}--- Запуск Chrome Driver ---")
        options = Options()
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-blink-features=AutomationControlled")
        options.add_experimental_option("excludeSwitches", ["enable-automation"])
        options.add_argument("--mute-audio")
        
        # Профиль браузера
        current_dir = os.getcwd()
        profile_dir = os.path.join(current_dir, "chrome_data", "bot_profile")
        if not os.path.exists(profile_dir):
            os.makedirs(profile_dir)
            
        options.add_argument(f"user-data-dir={profile_dir}")
        
        try:
            self.driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)
            return True
        except Exception as e:
            print(f"\n{Fore.RED}КРИТИЧЕСКАЯ ОШИБКА ДРАЙВЕРА: {e}")
            return False

    def check_login(self):
        print(f"{Fore.CYAN}Проверка сессии Instagram...")
        self.driver.get("https://www.instagram.com/")
        time.sleep(5)
        
        if 'Log In' in self.driver.page_source:
             print(f"\n{Fore.RED}🛑 ВЫ НЕ ЗАЛОГИНЕНЫ!")
             print(f"{Fore.YELLOW}👉 Войдите в аккаунт в браузере, затем нажмите ENTER здесь.")
             input()
        else:
             print(f"{Fore.GREEN}✅ Вход успешен.")
        
        self._sync_cookies()

    def _sync_cookies(self):
        """Синхронизируем куки из браузера в Instaloader и requests"""
        try:
            selenium_cookies = self.driver.get_cookies()
            for cookie in selenium_cookies:
                self.session.cookies.set(cookie['name'], cookie['value'])
                # Важно: передаем куки в Instaloader, чтобы он не ловил 403
                self.L.context._session.cookies.set(cookie['name'], cookie['value'])
            
            user_agent = self.driver.execute_script("return navigator.userAgent;")
            self.session.headers.update({"User-Agent": user_agent})
            self.L.context._session.headers.update({"User-Agent": user_agent})
        except: pass

    def _parse_metric_text(self, text):
        if not text: return 0
        text = str(text).upper().replace(',', '.')
        try:
            clean_text = ''.join(c for c in text if c.isdigit() or c in ['.', 'K', 'M'])
            if not clean_text: return 0
            
            multiplier = 1
            if 'K' in clean_text:
                multiplier = 1000
                clean_text = clean_text.replace('K', '')
            elif 'M' in clean_text:
                multiplier = 1_000_000
                clean_text = clean_text.replace('M', '')
            
            return int(float(clean_text) * multiplier)
        except:
            return 0

    def _get_caption_from_page(self):
        """Пытается достать описание через Selenium (если Instaloader не справится)"""
        caption = ""
        # 1. Meta-тег og:title (Самый надежный)
        # Формат: "Name (@user) on Instagram: "Caption text...""
        try:
            meta_title = self.driver.find_element(By.XPATH, "//meta[@property='og:title']").get_attribute("content")
            if " on Instagram: " in meta_title:
                parts = meta_title.split(" on Instagram: ", 1)
                if len(parts) > 1:
                    raw_cap = parts[1].strip()
                    # Убираем кавычки вокруг, если они есть
                    if raw_cap.startswith('"') and raw_cap.endswith('"'):
                        caption = raw_cap[1:-1]
                    else:
                        caption = raw_cap
        except: pass

        # 2. H1 (Устаревший, но иногда работает)
        if not caption:
            try:
                caption = self.driver.find_element(By.XPATH, "//h1").text
            except: pass
            
        return caption

    def download_video(self, shortcode, target_folder_abs):
        """
        Скачивает видео и возвращает (путь, описание_из_instaloader)
        """
        print(f"   ⬇️ Скачивание (Instaloader)...")
        original_cwd = os.getcwd()
        caption_from_loader = None
        
        try:
            tmp_dir_name = f"temp_{shortcode}"
            tmp_dir_abs = os.path.join(target_folder_abs, tmp_dir_name)
            
            if os.path.exists(tmp_dir_abs):
                shutil.rmtree(tmp_dir_abs)
            os.makedirs(tmp_dir_abs)
            
            os.chdir(target_folder_abs)
            
            # Получаем объект поста, чтобы скачать и заодно взять описание
            post = instaloader.Post.from_shortcode(self.L.context, shortcode)
            
            # Пытаемся сохранить описание из Instaloader (оно точнее)
            if post.caption:
                caption_from_loader = post.caption

            self.L.download_post(post, target=tmp_dir_name)
            
            final_path = os.path.join(target_folder_abs, f"{shortcode}.mp4")
            found = False
            
            if os.path.exists(tmp_dir_name):
                for f in os.listdir(tmp_dir_name):
                    if f.endswith(".mp4"):
                        src = os.path.join(tmp_dir_name, f)
                        if os.path.exists(final_path): os.remove(final_path)
                        os.rename(src, final_path)
                        found = True
                        break
                
                os.chdir(target_folder_abs)
                shutil.rmtree(tmp_dir_name)
            
            if found:
                return final_path, caption_from_loader
            return None, caption_from_loader

        except Exception as e:
            print(f"{Fore.RED}   Ошибка Instaloader: {e}")
            return None, caption_from_loader
        finally:
            os.chdir(original_cwd)

    def run(self, username, limit, session_path):
        if not self.driver:
            if not self.setup_driver(): return
        
        self.check_login()
        session_path = os.path.abspath(session_path)

        print(f"\n{Fore.MAGENTA}=== ПАРСИНГ: {username} ===")
        print(f"📂 Папка: {session_path}")

        url = f"https://www.instagram.com/{username}/reels/"
        self.driver.get(url)
        time.sleep(5)
        
        scrolls = int(limit / 12) + 1
        print(f"🔄 Скроллим ленту...")
        body = self.driver.find_element(By.TAG_NAME, 'body')
        for _ in range(scrolls):
            body.send_keys(Keys.PAGE_DOWN)
            time.sleep(1.5)

        reels_map = {} 
        anchors = self.driver.find_elements(By.XPATH, "//a[contains(@href, '/reel/')]")
        
        for a in anchors:
            href = a.get_attribute('href')
            shortcode = href.split('/reel/')[1].replace('/', '')
            
            try:
                text_content = a.text or a.get_attribute("innerText")
                views = self._parse_metric_text(text_content)
                reels_map[shortcode] = {"href": href, "views": views}
            except:
                reels_map[shortcode] = {"href": href, "views": 0}
            
            if len(reels_map) >= limit:
                break
        
        print(f"{Fore.CYAN}Найдено видео: {len(reels_map)}")

        count = 0
        for shortcode, data in reels_map.items():
            count += 1
            href = data['href']
            views_grid = data['views']
            
            print(f"\n🎥 [{count}/{len(reels_map)}] {shortcode} | Views: {views_grid}")
            
            try:
                json_path = os.path.join(session_path, f"{shortcode}.json")
                if os.path.exists(json_path):
                    print(f"   ⚠️ Пропуск (уже есть).")
                    continue

                self.driver.get(href)
                time.sleep(random.uniform(4, 7))

                # --- Метрики ---
                likes, comments, shares = self._get_metrics_from_page()
                
                # --- Текст поста (Caption) - Стратегия 1: Selenium ---
                caption = self._get_caption_from_page()
                
                # --- Дата ---
                date_posted = "Unknown"
                try:
                    time_el = self.driver.find_elements(By.TAG_NAME, "time")[-1]
                    date_posted = time_el.get_attribute("datetime")
                except: pass
                
                # --- СКАЧИВАНИЕ (INSTALOADER) ---
                # Теперь возвращает и описание, если Instaloader смог его достать
                video_local_path, loader_caption = self.download_video(shortcode, session_path)

                # Если Instaloader вернул описание, оно приоритетнее (так как API отдает полный текст)
                if loader_caption:
                    caption = loader_caption

                # --- ТРАНСКРИБАЦИЯ ---
                transcript_text = ""
                if video_local_path and os.path.exists(video_local_path) and self.whisper_model:
                    print(f"   🎙️ Транскрибация...")
                    try:
                        res = self.whisper_model.transcribe(video_local_path, fp16=False)
                        transcript_text = res["text"].strip()
                    except Exception as e:
                        print(f"{Fore.RED}   Ошибка Whisper: {e}")
                elif not video_local_path:
                    print(f"{Fore.RED}   ❌ Видео не скачалось, транскрипт невозможен.")

                # --- СОХРАНЕНИЕ ---
                metadata = {
                    "shortcode": shortcode,
                    "link": href,
                    "date": date_posted,
                    "likes": likes,
                    "comments": comments,
                    "shares": shares,
                    "views": views_grid,
                    "duration_sec": 0
                }
                
                with open(json_path, "w", encoding="utf-8") as f:
                    json.dump(metadata, f, indent=4, ensure_ascii=False)
                
                desc_path = os.path.join(session_path, f"{shortcode}.txt")
                with open(desc_path, "w", encoding="utf-8") as f:
                    f.write(str(caption) if caption else "")
                
                if transcript_text:
                    tr_path = os.path.join(session_path, f"{shortcode}_tr.txt")
                    with open(tr_path, "w", encoding="utf-8") as f:
                        f.write(transcript_text)

                print(f"   ✅ Готово: {shortcode}")

            except Exception as e:
                print(f"{Fore.RED}   Ошибка обработки: {e}")
                continue
        
        print(f"\n{Fore.GREEN}🎉 Парсинг завершен!")
        self.close()

    def _get_metrics_from_page(self):
        likes = 0
        comments = 0
        shares = 0
        try:
            labels = ["Like", "Нравится", "like", "нравится", "Toggle Like", 
                      "Comment", "Комментировать", "Share", "Поделиться"]
            xpath_query = "//*[" + " or ".join([f"contains(@aria-label, '{l}')" for l in labels]) + "]"
            elements = self.driver.find_elements(By.XPATH, xpath_query)
            
            for el in elements:
                try:
                    txt = el.text or el.get_attribute("textContent")
                    val = self._parse_metric_text(txt)
                    if val == 0:
                        try:
                            parent_btn = el.find_element(By.XPATH, "./ancestor::*[@role='button'][1]")
                            txt = parent_btn.text or parent_btn.get_attribute("textContent")
                            val = self._parse_metric_text(txt)
                        except: pass

                    label = el.get_attribute("aria-label").lower()
                    if "like" in label or "нравится" in label:
                        if likes == 0 and val > 0: likes = val
                    elif "comment" in label or "комментировать" in label:
                        if comments == 0 and val > 0: comments = val
                    elif "share" in label or "поделиться" in label:
                        if shares == 0 and val > 0: shares = val
                except: continue
        except Exception as e: pass

        if likes > 0 or comments > 0:
             print(f"   🔹 Найдены метрики (Aria): L:{likes} C:{comments} S:{shares}")

        if likes == 0 and comments == 0:
            try:
                buttons = self.driver.find_elements(By.XPATH, "//span[@role='button']")
                numeric_vals = []
                for btn in buttons:
                    txt = btn.text or btn.get_attribute("textContent")
                    val = self._parse_metric_text(txt)
                    if val > 0: numeric_vals.append(val)
                
                if len(numeric_vals) >= 1: likes = numeric_vals[0]
                if len(numeric_vals) >= 2: comments = numeric_vals[1]
                if len(numeric_vals) >= 3: shares = numeric_vals[2]
                
                if likes > 0:
                    print(f"   🔹 Найдены метрики (Structure): L:{likes} C:{comments} S:{shares}")
            except: pass

        if likes == 0:
            try:
                meta = self.driver.find_element(By.XPATH, "//meta[@property='og:description']").get_attribute("content")
                if meta and "Likes" in meta:
                    likes_part = meta.split("Likes")[0].strip().split()[-1]
                    likes = self._parse_metric_text(likes_part)
                    print(f"   🔹 Найдены метрики (Meta): L:{likes}")
            except: pass
            
        return likes, comments, shares

    def close(self):
        if self.driver:
            try: self.driver.quit()
            except: pass