import cv2
import numpy as np
import os
import re
import sys
import contextlib
import asyncio 
from collections import Counter, defaultdict

# Импорты SceneDetect с обработкой версий
from scenedetect import SceneManager
from scenedetect.detectors import ContentDetector
try:
    # Новая версия (v0.6+)
    from scenedetect import open_video
    SCENEDETECT_V6 = True
except ImportError:
    # Старая версия
    from scenedetect import VideoManager
    SCENEDETECT_V6 = False

import pytesseract

# --- КОНТЕКСТ ДЛЯ ПОДАВЛЕНИЯ ШУМА (FFMPEG LOGS) ---
@contextlib.contextmanager
def suppress_output():
    """Глушит stdout и stderr внутри блока"""
    with open(os.devnull, "w") as devnull:
        old_stdout = sys.stdout
        old_stderr = sys.stderr
        try:
            sys.stdout = devnull
            sys.stderr = devnull
            yield
        finally:
            sys.stdout = old_stdout
            sys.stderr = old_stderr

# --- БЛОК ИМПОРТА БИБЛИОТЕК ---

# 1. MoviePy для анализа громкости
try:
    with suppress_output(): # Глушим шум при импорте
        try:
            from moviepy import VideoFileClip
        except ImportError:
            from moviepy.editor import VideoFileClip
    AUDIO_AVAILABLE = True
except ImportError:
    AUDIO_AVAILABLE = False
    print("⚠️ Библиотека moviepy не найдена. Анализ громкости будет пропущен.")

# 2. ShazamIO для распознавания музыки
try:
    from shazamio import Shazam
    SHAZAM_AVAILABLE = True
except ImportError:
    SHAZAM_AVAILABLE = False
    print("⚠️ Библиотека shazamio не найдена. Распознавание треков будет пропущено.")

# Настройки Tesseract (если нужно, можно раскомментировать и указать путь)
# pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

# --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---

async def recognize_song_async(filepath):
    """Асинхронная функция для запроса к Shazam"""
    shazam = Shazam()
    try:
        # Глушим ffmpeg внутри shazamio
        with suppress_output():
            out = await shazam.recognize(filepath)
        track = out.get('track', {})
        if track:
            title = track.get('title', 'Unknown')
            subtitle = track.get('subtitle', 'Unknown')
            return f"{subtitle} - {title}"
    except Exception:
        pass
    return "Not Found"

def get_music_info(filepath):
    """Обертка для запуска асинхронного Shazam в синхронном коде"""
    if not SHAZAM_AVAILABLE:
        return "Not Installed"
    
    try:
        return asyncio.run(recognize_song_async(filepath))
    except Exception as e:
        return "Error"

def get_dominant_colors(frame, k=3):
    """
    Определяет k доминирующих цветов кадра используя K-Means.
    Возвращает список hex-кодов.
    """
    resized = cv2.resize(frame, (150, 150))
    data = np.float32(resized).reshape((-1, 3))
    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 10, 1.0)
    ret, label, center = cv2.kmeans(data, k, None, criteria, 10, cv2.KMEANS_RANDOM_CENTERS)
    center = np.uint8(center)
    hex_colors = []
    counts = Counter(label.flatten())
    sorted_centers = [center[i] for i in sorted(counts, key=counts.get, reverse=True)]
    for color in sorted_centers:
        hex_code = "#{:02x}{:02x}{:02x}".format(color[2], color[1], color[0])
        hex_colors.append(hex_code)
    return hex_colors

def calc_entropy(img_gray):
    """Считает энтропию (сложность) изображения."""
    hist = cv2.calcHist([img_gray], [0], None, [256], [0, 256])
    hist /= hist.sum() + 1e-7 
    hist = hist[hist > 0]
    return -np.sum(hist * np.log2(hist))

def analyze_audio_track(filepath):
    """Анализ аудиодорожки через moviepy"""
    if not AUDIO_AVAILABLE:
        return 0, 0, 0
    
    # Глушим вывод moviepy/ffmpeg
    with suppress_output():
        try:
            clip = VideoFileClip(filepath)
            audio = clip.audio
            if audio is None:
                clip.close()
                return 0, 0, 0
                
            try:
                sound_array = audio.to_soundarray(fps=22050)
            except AttributeError:
                clip.close()
                return 0, 0, 0
            
            if sound_array is not None and len(sound_array) > 0:
                loudness = np.sqrt((sound_array**2).mean())
                max_peak = np.max(np.abs(sound_array))
                
                silence_thresh = 0.01
                is_silent = np.max(np.abs(sound_array), axis=1) < silence_thresh
                silence_pct = np.mean(is_silent) * 100
            else:
                loudness, max_peak, silence_pct = 0, 0, 100
                
            clip.close()
            return round(loudness, 3), round(max_peak, 3), round(silence_pct, 1)
            
        except Exception:
            return 0, 0, 0

def detect_scenes_safe(filepath):
    """Обертка для SceneDetect, поддерживающая старую и новую версии"""
    cut_timestamps = []
    num_cuts = 0
    
    try:
        scene_manager = SceneManager()
        scene_manager.add_detector(ContentDetector(threshold=30.0))
        
        if SCENEDETECT_V6:
            # Новый способ (v0.6+)
            video = open_video(filepath)
            scene_manager.detect_scenes(video)
        else:
            # Старый способ (Deprecated)
            # Глушим warning о депрекации
            with suppress_output():
                video_manager = VideoManager([filepath])
                video_manager.set_downscale_factor()
                video_manager.start()
                scene_manager.detect_scenes(frame_source=video_manager)
        
        scene_list = scene_manager.get_scene_list()
        cut_timestamps = [scene[0].get_seconds() for scene in scene_list]
        num_cuts = len(scene_list)
        
    except Exception as e:
        pass
        
    return cut_timestamps, num_cuts

def analyze_video(filepath):
    """
    ГЛАВНАЯ ФУНКЦИЯ МОДУЛЯ.
    Принимает путь к файлу .mp4
    Возвращает словарь (dict) с CV-метриками.
    """
    filename = os.path.basename(filepath)
    # print(f"🔬 CV-Анализ: {filename}...", end=" ", flush=True)

    # 1. АУДИО И МУЗЫКА
    music_track = get_music_info(filepath)
    avg_volume, max_volume, silence_pct = analyze_audio_track(filepath)

    cap = cv2.VideoCapture(filepath)
    if not cap.isOpened():
        print(f"❌ Ошибка открытия: {filename}")
        return None

    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration_sec = total_frames / fps if fps > 0 else 0
    
    # Инициализация
    prev_frame = None
    motion_scores = [] 
    faces_detected_frames = 0
    text_detected_frames = 0
    
    blur_scores = []
    saturation_scores = []
    contrast_scores = [] 
    entropy_scores = []  
    temp_scores = []     
    
    all_colors = [] 
    face_sizes = [] 
    
    timeline_data = defaultdict(lambda: {'motion': [], 'blur': [], 'sat': []})
    all_detected_words = []
    
    ocr_interval = int(fps) if fps > 0 else 30
    color_interval = int(fps) * 2 if fps > 0 else 60 
    
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

    frame_step = 10 
    processed_frames = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        current_sec = int(processed_frames / (fps if fps else 30) * frame_step)

        if processed_frames % frame_step == 0:
            frame_height = frame.shape[0]
            
            # --- PRE-PROCESSING ---
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
            
            # --- METRICS ---
            blur_val = cv2.Laplacian(gray, cv2.CV_64F).var()
            blur_scores.append(blur_val)
            
            sat_val = np.mean(hsv[:, :, 1])
            saturation_scores.append(sat_val)

            contrast_val = gray.std()
            contrast_scores.append(contrast_val)

            entropy_val = calc_entropy(gray)
            entropy_scores.append(entropy_val)

            b_channel = frame[:,:,0].mean()
            r_channel = frame[:,:,2].mean()
            temp_val = r_channel - b_channel 
            temp_scores.append(temp_val)

            timeline_data[current_sec]['blur'].append(blur_val)
            timeline_data[current_sec]['sat'].append(sat_val)

            motion_val = 0
            if prev_frame is not None:
                frame_diff = cv2.absdiff(prev_frame, gray)
                motion_val = np.mean(frame_diff)
                motion_scores.append(motion_val)
                timeline_data[current_sec]['motion'].append(motion_val)
            prev_frame = gray

            faces = face_cascade.detectMultiScale(gray, 1.1, 4)
            if len(faces) > 0:
                faces_detected_frames += 1
                largest_face = max(faces, key=lambda rect: rect[2] * rect[3])
                face_ratio = largest_face[3] / frame_height
                face_sizes.append(face_ratio)

            # OCR
            if processed_frames % ocr_interval == 0:
                try:
                    text = pytesseract.image_to_string(gray, lang='rus+eng', config='--psm 6')
                    clean_text = re.sub(r'[^\w\s]', '', text).strip()
                    if len(clean_text) > 3:
                        text_detected_frames += 1
                        words = [w.lower() for w in clean_text.split() if len(w) > 3]
                        all_detected_words.extend(words)
                except Exception:
                    pass
            
            # COLORS
            if processed_frames % color_interval == 0:
                dom_colors = get_dominant_colors(frame, k=2)
                all_colors.extend(dom_colors)

        processed_frames += 1

    cap.release()

    # --- ДЕТЕКЦИЯ СКЛЕЕК (через безопасную функцию) ---
    cut_timestamps, num_cuts = detect_scenes_safe(filepath)

    # --- АГРЕГАЦИЯ ---
    def get_avg_in_range(metric_name, start_sec, end_sec):
        values = []
        for s in range(start_sec, end_sec + 1):
            if s in timeline_data:
                values.extend(timeline_data[s][metric_name])
        return np.mean(values) if values else 0

    hook_motion = get_avg_in_range('motion', 0, 3)
    hook_cuts = len([t for t in cut_timestamps if t <= 3.0])
    
    avg_motion = np.mean(motion_scores) if motion_scores else 0
    avg_blur = np.mean(blur_scores) if blur_scores else 0
    avg_sat = np.mean(saturation_scores) if saturation_scores else 0
    avg_contrast = np.mean(contrast_scores) if contrast_scores else 0
    avg_entropy = np.mean(entropy_scores) if entropy_scores else 0
    avg_temp = np.mean(temp_scores) if temp_scores else 0
    
    if avg_temp > 10: temp_type = "Warm (Теплый)"
    elif avg_temp < -10: temp_type = "Cold (Холодный)"
    else: temp_type = "Neutral (Нейтральный)"

    avg_face_size = np.mean(face_sizes) if face_sizes else 0
    if avg_face_size > 0.35: shot_type = "Close-up (Крупный)"
    elif avg_face_size > 0.15: shot_type = "Medium (Средний)"
    elif avg_face_size > 0: shot_type = "Wide (Общий)"
    else: shot_type = "No Face"

    top_colors = Counter(all_colors).most_common(3)
    dom_color_hex = top_colors[0][0] if top_colors else "#000000"
    palette_str = ", ".join([c[0] for c in top_colors])

    motion_timeline_str = []
    for s in sorted(timeline_data.keys()):
        val = np.mean(timeline_data[s]['motion']) if timeline_data[s]['motion'] else 0
        motion_timeline_str.append(f"{val:.1f}")
    
    checked_frames_count = processed_frames // frame_step
    face_pct = (faces_detected_frames / checked_frames_count * 100) if checked_frames_count > 0 else 0
    text_pct = (text_detected_frames / duration_sec * 100) if duration_sec > 0 else 0
    
    top_words = Counter(all_detected_words).most_common(3)
    top_words_str = ", ".join([w[0] for w in top_words])
    cuts_per_min = (num_cuts / (duration_sec / 60)) if duration_sec > 0 else 0

    # print(f"✅ Готово")

    return {
        'filename': filename,
        'duration_cv': round(duration_sec, 1), # Добавил суффикс _cv, чтобы не путать с инстой
        'music_track': music_track, 
        'vol_avg': avg_volume,       
        'vol_max': max_volume,       
        'silence_pct': silence_pct,  
        'cuts_per_min': round(cuts_per_min, 1),
        'avg_motion': round(avg_motion, 1),
        'avg_blur': round(avg_blur, 1),    
        'avg_contrast': round(avg_contrast, 1), 
        'avg_entropy': round(avg_entropy, 2),   
        'avg_sat': round(avg_sat, 1),
        'temp_type': temp_type,     
        'dom_color': dom_color_hex,
        'palette': palette_str,
        'hook_motion': round(hook_motion, 1),
        'hook_cuts': hook_cuts,
        'shot_type': shot_type,
        'face_pct': round(face_pct, 1),
        'text_pct': round(text_pct, 1),
        'keywords': top_words_str,
        'motion_timeline': ",".join(motion_timeline_str)
    }

# Для теста модуля (если запускать напрямую)
if __name__ == "__main__":
    # Простейший тест: ищем любой mp4 в текущей папке или в storage
    test_file = None
    for root, dirs, files in os.walk("."):
        for f in files:
            if f.endswith(".mp4"):
                test_file = os.path.join(root, f)
                break
        if test_file: break
    
    if test_file:
        print(f"🧪 Тестовый запуск на файле: {test_file}")
        res = analyze_video(test_file)
        print("Результат:", res)
    else:
        print("⚠️ Нет .mp4 файлов для теста.")