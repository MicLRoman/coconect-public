import time
import os
import json
import random
import re
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from colorama import Fore

# Если parse_metric_text есть в utils, можно оставить импорт, 
# но мы будем использовать локальный улучшенный метод.
try:
    from .utils import parse_metric_text
except ImportError:
    pass 

class InstagramCore:
    def __init__(self, driver, loader, session_path):
        self.driver = driver
        self.loader = loader
        self.session_path = session_path

    # --- HELPERS ---

    def _clean_number(self, text):
        """
        Парсит числа с запятыми (2,345), точками (1.5M) и буквами (K, M).
        Исправляет баг, когда '2,345' превращалось в '2'.
        """
        if not text: 
            return 0
        
        # Убираем все лишнее, оставляем цифры, точки, запятые и K/M
        text = str(text).strip().upper()
        
        # Множители
        multiplier = 1
        if 'K' in text:
            multiplier = 1000
            text = text.replace('K', '')
        elif 'M' in text:
            multiplier = 1000000
            text = text.replace('M', '')
        
        # Обработка разделителей
        # Сначала просто удаляем запятые, если они используются как разделитель тысяч (2,345)
        # Если строка содержит и точку и запятую (1,234.5), удаляем запятую.
        if ',' in text and '.' in text:
            text = text.replace(',', '') 
        elif ',' in text:
            # Если запятая - единственный разделитель.
            # В англ 2,345 = 2345. В некоторых странах 1,5 = 1.5.
            # Эвристика: если после запятой 3 цифры и конец строки - это тысячи.
            if re.search(r',\d{3}$', text):
                text = text.replace(',', '')
            else:
                # Иначе считаем это дробью и меняем на точку
                text = text.replace(',', '.') 
        
        # Удаляем все, что не цифра и не точка
        clean_text = re.sub(r'[^\d\.]', '', text)
        
        try:
            val = float(clean_text) * multiplier
            return int(val)
        except:
            return 0

    def _get_date_from_page(self):
        """Извлекает дату публикации из тега <time>."""
        try:
            time_elements = self.driver.find_elements(By.TAG_NAME, "time")
            if time_elements:
                return time_elements[-1].get_attribute("datetime")
        except: pass
        return "Unknown"

    def _get_metrics_from_page(self):
        """
        Считывает лайки, комменты, репосты И ПРОСМОТРЫ со страницы поста.
        Использует стратегию из reels_parser (Aria -> Buttons -> Meta) + логику Views для ленты.
        """
        likes, comments, shares, views = 0, 0, 0, 0
        
        # --- 1. VIEWS (Просмотры - Специфично для видео в ленте) ---
        # Эта часть оставляет поиск явного текста "views", так как в ленте это часто единственный способ узнать просмотры
        try:
            xpath_views = "//*[contains(text(), 'views') or contains(text(), 'просмотров') or contains(text(), 'воспроизведений')]"
            view_elements = self.driver.find_elements(By.XPATH, xpath_views)
            for el in view_elements:
                txt = el.text or el.get_attribute("textContent")
                # Фильтруем мусор, ищем только строки с цифрами
                if len(txt) < 50 and re.search(r'\d', txt):
                    val = self._clean_number(txt)
                    if val > views: views = val
        except: pass

        # --- 2. LIKES, COMMENTS, SHARES (Стратегия из reels_parser) ---
        
        # A. ARIA-LABELS (Поиск по кнопкам с подписями)
        try:
            labels = ["Like", "Нравится", "like", "нравится", "Toggle Like", 
                      "Comment", "Комментировать", "Share", "Поделиться"]
            xpath_query = "//*[" + " or ".join([f"contains(@aria-label, '{l}')" for l in labels]) + "]"
            elements = self.driver.find_elements(By.XPATH, xpath_query)
            
            for el in elements:
                try:
                    txt = el.text or el.get_attribute("textContent")
                    val = self._clean_number(txt)
                    
                    # Если текст пустой, проверяем родительскую кнопку (часто цифра внутри span, который внутри button)
                    if val == 0:
                        try:
                            parent_btn = el.find_element(By.XPATH, "./ancestor::*[@role='button'][1]")
                            txt_parent = parent_btn.text or parent_btn.get_attribute("textContent")
                            val = self._clean_number(txt_parent)
                        except: pass

                    label = el.get_attribute("aria-label").lower()
                    if "like" in label or "нравится" in label:
                        if likes == 0 and val > 0: likes = val
                    elif "comment" in label or "комментировать" in label:
                        if comments == 0 and val > 0: comments = val
                    elif "share" in label or "поделиться" in label:
                        if shares == 0 and val > 0: shares = val
                except: continue
        except: pass

        if likes > 0 or comments > 0:
             print(f"   🔹 Найдены метрики (Aria): L:{likes} C:{comments} S:{shares}")

        # B. BUTTONS STRUCTURE (Fallback: если Aria не сработала)
        # Ищет просто кнопки по порядку. Обычно: 1-я лайк, 2-я коммент, 3-я шер.
        if likes == 0 and comments == 0:
            try:
                buttons = self.driver.find_elements(By.XPATH, "//span[@role='button']")
                numeric_vals = []
                for btn in buttons:
                    txt = btn.text or btn.get_attribute("textContent")
                    val = self._clean_number(txt)
                    if val > 0: numeric_vals.append(val)
                
                if len(numeric_vals) >= 1: likes = numeric_vals[0]
                if len(numeric_vals) >= 2: comments = numeric_vals[1]
                if len(numeric_vals) >= 3: shares = numeric_vals[2]
                
                if likes > 0:
                    print(f"   🔹 Найдены метрики (Structure): L:{likes} C:{comments} S:{shares}")
            except: pass

        # C. META TAG (Последняя надежда для лайков)
        if likes == 0:
            try:
                meta = self.driver.find_element(By.XPATH, "//meta[@property='og:description']").get_attribute("content")
                if meta and "Likes" in meta:
                    # Формат: "1,234 Likes, 50 Comments - ..."
                    likes_part = meta.split("Likes")[0].strip().split()[-1]
                    likes = self._clean_number(likes_part)
                    print(f"   🔹 Найдены метрики (Meta): L:{likes}")
            except: pass

        # D. Fallback для Views (если просмотров не нашли, пробуем старый метод через "Liked by")
        if views == 0 and likes == 0:
            try:
                links = self.driver.find_elements(By.XPATH, "//a[contains(@href, 'liked_by')]")
                for link in links:
                    txt = link.text
                    val = self._clean_number(txt)
                    if "view" in txt.lower() or "просмотр" in txt.lower():
                        if val > views: views = val
                    else:
                        if val > likes: likes = val
            except: pass

        print(f"   📊 Metrics: L:{likes} C:{comments} V:{views}")
        return likes, comments, shares, views

    # --- PROFILE ---
    def parse_profile(self, username):
        print(f"{Fore.YELLOW}📊 Analyzing profile @{username}...")
        self.driver.get(f"https://www.instagram.com/{username}/")
        time.sleep(5)
        
        data = {"username": username, "followers": 0, "following": 0, "posts": 0, "bio": "", "avatar_path": ""}
        
        try:
            meta = self.driver.find_element(By.XPATH, "//meta[@property='og:description']").get_attribute("content")
            if meta:
                # Пример meta: "10K Followers, 200 Following, 50 Posts - ..."
                if m := re.search(r'([0-9\.,KM]+)\s+Followers', meta, re.I): 
                    data["followers"] = self._clean_number(m.group(1))
                if m := re.search(r'([0-9\.,KM]+)\s+Following', meta, re.I): 
                    data["following"] = self._clean_number(m.group(1))
                if m := re.search(r'([0-9\.,KM]+)\s+Posts', meta, re.I): 
                    data["posts"] = self._clean_number(m.group(1))
        except: pass

        # Fallback для подписчиков, если в мета не нашли (иногда верстка меняется)
        if data["followers"] == 0:
            try:
                # Ищем по ссылке на подписчиков
                el = self.driver.find_element(By.XPATH, f"//a[contains(@href, '/followers')]")
                # Берем текст внутри span (часто число обернуто в span)
                txt = el.get_attribute("innerText") 
                data["followers"] = self._clean_number(txt)
            except: pass

        try:
            header = self.driver.find_element(By.TAG_NAME, "header")
            lines = [l.strip() for l in header.text.split('\n') if l.strip()]
            clean = []
            junk = [r'^\d+.*posts$', r'^\d+.*followers$', r'^\d+.*following$', r'^follow$', r'^message$', username.lower()]
            for line in lines:
                if any(re.search(p, line.lower()) for p in junk): continue
                if re.match(r'^[\d,\.KM]+$', line): continue
                clean.append(line)
            data["bio"] = "\n".join(clean[:6])
        except: pass

        try:
            img = self.driver.find_element(By.XPATH, f"//header//img[contains(@alt, '{username}')]")
            src = img.get_attribute("src")
            p = os.path.join(self.session_path, "profile_pic.jpg")
            with open(p, "wb") as f: 
                import requests
                f.write(requests.get(src).content)
            data["avatar_path"] = "profile_pic.jpg"
        except: pass

        with open(os.path.join(self.session_path, "profile_info.json"), "w", encoding='utf-8') as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
        
        print(f"   👤 Profile parsed: {data['followers']} followers")

    # --- FEED (MIXED: Photos + Videos) ---
    def parse_feed(self, username, limit):
        print(f"\n{Fore.MAGENTA}=== PHASE 1: FEED (Scanning {limit} Posts) ===")
        self.driver.get(f"https://www.instagram.com/{username}/")
        time.sleep(5)
        
        collected_count = 0
        scrolls = 0
        processed = set()
        
        while collected_count < limit and scrolls < 7:
            self.driver.find_element(By.TAG_NAME, 'body').send_keys(Keys.PAGE_DOWN)
            time.sleep(2)
            scrolls += 1
            
            elements = self.driver.find_elements(By.XPATH, "//a[contains(@href, '/p/') or contains(@href, '/reel/')]")
            feed_links = []
            for el in elements:
                try:
                    href = el.get_attribute('href')
                    if href: feed_links.append(href)
                except: continue
            
            for href in feed_links:
                if collected_count >= limit: break
                shortcode = href.strip('/').split('/')[-1]
                if shortcode in processed: continue
                processed.add(shortcode)
                
                print(f"\n📦 Analyzing: {shortcode}")
                json_path = os.path.join(self.session_path, f"{shortcode}.json")
                
                if os.path.exists(json_path):
                     with open(json_path, 'r') as f:
                        data = json.load(f)
                        if data.get('downloaded'): 
                            collected_count += 1
                            print("   ⚠️ Already downloaded.")
                            continue

                try:
                    self.driver.get(href)
                    time.sleep(random.uniform(3, 5))
                    
                    is_video = False
                    if self.driver.find_elements(By.TAG_NAME, "video") or "/reel/" in href: is_video = True
                    
                    type_str = "video" if is_video else "image"
                    print(f"   📄 Type detected: {type_str.upper()}")
                    
                    # === СБОР МЕТРИК (Likes, Comments, Shares, VIEWS) ===
                    # Теперь этот метод внутри себя ищет Views для видео
                    likes, comments, shares, views = self._get_metrics_from_page()
                    date_posted = self._get_date_from_page()
                    
                    local_path, caption = self.loader.download_post(shortcode, self.session_path, is_video=is_video)
                    
                    if is_video and local_path:
                        transcription = self.loader.transcribe(local_path)
                        if transcription:
                             with open(os.path.join(self.session_path, f"{shortcode}_tr.txt"), "w", encoding="utf-8") as f:
                                f.write(transcription)

                    if local_path:
                        meta = {
                            "shortcode": shortcode, 
                            "type": type_str, 
                            "link": href,
                            "date": date_posted,
                            "likes": likes, 
                            "comments": comments,
                            "views": views, 
                            "caption_preview": str(caption)[:50] if caption else "", 
                            "downloaded": True
                        }
                        with open(json_path, "w", encoding="utf-8") as f: json.dump(meta, f, indent=4)
                        with open(os.path.join(self.session_path, f"{shortcode}.txt"), "w", encoding="utf-8") as f: f.write(str(caption) if caption else "")
                        
                        collected_count += 1
                        print(f"   ✅ Saved ({collected_count}/{limit})")
                        
                except Exception as e:
                    print(f"{Fore.RED}   Error: {e}")
            
            if collected_count < limit:
                # Возвращаемся в профиль для продолжения скролла
                self.driver.get(f"https://www.instagram.com/{username}/")
                time.sleep(2)

    # --- REELS (Grid only) ---
    def parse_reels(self, username, limit):
        print(f"\n{Fore.MAGENTA}=== PHASE 2: REELS (Videos Grid) ===")
        self.driver.get(f"https://www.instagram.com/{username}/reels/")
        time.sleep(5)
        
        # Скроллим немного, чтобы подгрузить побольше
        for _ in range(int(limit/6)+1):
            self.driver.find_element(By.TAG_NAME, 'body').send_keys(Keys.PAGE_DOWN)
            time.sleep(1.5)
            
        raw_elements = self.driver.find_elements(By.XPATH, "//a[contains(@href, '/reel/')]")
        reels_data = []
        for el in raw_elements:
            try:
                href = el.get_attribute('href')
                txt = el.get_attribute("innerText") # Обычно тут число просмотров на превьюшке (Grid View)
                reels_data.append({"href": href, "views": self._clean_number(txt)})
            except: continue
            
        print(f"{Fore.CYAN}Reels found: {len(reels_data)}")
        
        count = 0
        for item in reels_data:
            if count >= limit: break
            shortcode = item['href'].strip('/').split('/')[-1]
            count += 1
            print(f"\n🎬 [Reel {count}] {shortcode} | Views (Grid): {item['views']}")
            
            json_path = os.path.join(self.session_path, f"{shortcode}.json")
            if os.path.exists(json_path):
                try:
                    with open(json_path, 'r', encoding='utf-8') as f:
                        existing_data = json.load(f)
                    
                    if existing_data.get('downloaded', False):
                        # Если уже скачано (через Feed), просто обновляем просмотры из грида,
                        # так как в гриде данные могут быть свежее или точнее для Reels.
                        old_views = existing_data.get('views', 0)
                        grid_views = item['views']
                        
                        if grid_views > old_views:
                            existing_data['views'] = grid_views
                            with open(json_path, 'w', encoding='utf-8') as f:
                                json.dump(existing_data, f, indent=4, ensure_ascii=False)
                            print(f"   🔄 Updated views from grid: {old_views} -> {grid_views}")
                        else:
                            print("   ⏩ Skipping (Already downloaded)")
                        continue
                except: pass
                
            try:
                path, caption = self.loader.download_post(shortcode, self.session_path, is_video=True)
                transcription = self.loader.transcribe(path) if path else ""
                
                if transcription:
                    with open(os.path.join(self.session_path, f"{shortcode}_tr.txt"), "w", encoding="utf-8") as f:
                        f.write(transcription)
                
                self.driver.get(item['href'])
                time.sleep(3)
                likes, comments, shares, views_page = self._get_metrics_from_page()
                date_posted = self._get_date_from_page()
                
                # Используем views с грида (item['views']), если на странице не нашли, или наоборот (где больше)
                final_views = max(item['views'], views_page)
                
                meta = {
                    "shortcode": shortcode, "type": "video", "link": item['href'],
                    "date": date_posted,
                    "views": final_views, 
                    "likes": likes, "comments": comments,
                    "caption_preview": str(caption)[:50] if caption else "", "downloaded": True
                }
                
                with open(json_path, "w", encoding="utf-8") as f: json.dump(meta, f, indent=4)
                with open(os.path.join(self.session_path, f"{shortcode}.txt"), "w", encoding="utf-8") as f: f.write(str(caption) if caption else "")
                print("   ✅ Reel processed.")
                
            except Exception as e:
                print(f"{Fore.RED}   Error: {e}")