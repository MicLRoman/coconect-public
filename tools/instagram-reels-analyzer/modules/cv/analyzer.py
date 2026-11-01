import cv2
import os
import numpy as np
from collections import Counter

from .config import *
from .utils import *
from .audio import *
from .vision import *
from .scenes import *

def analyze_static_image(filepath_or_frame):
    """Анализ одного изображения (для фото-постов или аватарки)"""
    if isinstance(filepath_or_frame, str):
        if not os.path.exists(filepath_or_frame): return None
        frame = cv2.imread(filepath_or_frame)
    else:
        frame = filepath_or_frame

    if frame is None: return None
    
    # Basic CV
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    colors = get_dominant_colors(frame, k=3)
    blur = cv2.Laplacian(gray, cv2.CV_64F).var()
    entropy = calc_entropy(gray)
    
    # AI
    ai_res = detect_faces_deep(frame)
    words = get_ocr_text(frame)
    
    return {
        'dom_colors': colors,
        'quality_blur': round(blur, 1),
        'quality_entropy': round(entropy, 2),
        'face_count': ai_res['count'],
        'emotions': ai_res['emotions'],
        'ages': ai_res['ages'],
        'genders': ai_res['genders'],
        'ocr_words': words,
        'text_pct': 100 if words else 0 # Для статики: есть текст или нет
    }

def analyze_video(filepath):
    filename = os.path.basename(filepath)
    if not os.path.exists(filepath): return None

    # --- 1. Audio Analysis ---
    music_track = get_music_info(filepath)
    avg_vol, max_vol, silence = analyze_audio_track(filepath)

    # --- 2. Video Scanning ---
    cap = cv2.VideoCapture(filepath)
    if not cap.isOpened(): return None

    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration = total_frames / fps if fps > 0 else 0

    # Metrics Accumulators
    motion_scores = []
    blur_scores = []
    face_ratios = []
    
    # Aggregators
    all_colors = []
    all_words = []
    all_emotions = []
    all_ages = []
    all_genders = []
    
    # Text Presence Tracking
    text_frames_count = 0
    total_ocr_checks = 0

    # Hook Analysis (0-3 sec)
    hook_motion_vals = []
    
    prev_frame = None
    processed_count = 0
    frame_step = 10  # Skip frames for speed
    
    # Smart intervals
    ocr_interval = int(fps) if fps > 0 else 30 # Once per sec
    ai_interval = int(fps * 3) if fps > 0 else 90 # Once per 3 sec

    while True:
        ret, frame = cap.read()
        if not ret: break
        
        curr_sec = processed_count * frame_step / fps if fps else 0

        if processed_count % frame_step == 0:
            h, w, _ = frame.shape
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            
            # --- Technical Metrics ---
            blur = cv2.Laplacian(gray, cv2.CV_64F).var()
            blur_scores.append(blur)
            
            # --- Motion ---
            mot = 0
            if prev_frame is not None:
                diff = cv2.absdiff(prev_frame, gray)
                mot = np.mean(diff)
                motion_scores.append(mot)
                if curr_sec <= 3.0: hook_motion_vals.append(mot)
            prev_frame = gray

            # --- Simple Face Detection ---
            face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
            faces_rects = face_cascade.detectMultiScale(gray, 1.1, 4)
            if len(faces_rects) > 0:
                largest = max(faces_rects, key=lambda r: r[2]*r[3])
                face_ratios.append(largest[3]/h)
            else:
                face_ratios.append(0)

            # --- Heavy AI Tasks ---
            
            # 1. Colors
            if processed_count % (frame_step * 5) == 0:
                all_colors.extend(get_dominant_colors(frame, k=2))
            
            # 2. OCR (Считаем процент кадров с текстом)
            if processed_count % ocr_interval == 0:
                total_ocr_checks += 1
                words_on_frame = get_ocr_text(frame)
                if words_on_frame:
                    text_frames_count += 1
                    all_words.extend(words_on_frame)
                
            # 3. DeepFace
            if processed_count % ai_interval == 0:
                 ai_res = detect_faces_deep(frame)
                 all_emotions.extend(ai_res['emotions'])
                 all_ages.extend(ai_res['ages'])
                 all_genders.extend(ai_res['genders'])
        
        processed_count += 1
    cap.release()

    # --- 3. Cuts Analysis ---
    cut_timestamps, num_cuts = detect_cuts(filepath)
    hook_cuts = len([c for c in cut_timestamps if c <= 3.0])

    # --- 4. Final Aggregation ---
    
    # Averages
    avg_motion = np.mean(motion_scores) if motion_scores else 0
    avg_blur = np.mean(blur_scores) if blur_scores else 0
    hook_impact = np.mean(hook_motion_vals) if hook_motion_vals else 0
    
    # Percentages
    frames_with_face = sum(1 for r in face_ratios if r > 0)
    total_analyzed = len(face_ratios)
    face_pct = (frames_with_face / total_analyzed * 100) if total_analyzed else 0
    
    text_pct = (text_frames_count / total_ocr_checks * 100) if total_ocr_checks > 0 else 0
    
    avg_face_size = np.mean([r for r in face_ratios if r > 0]) if frames_with_face else 0
    
    # Shot Type
    if avg_face_size > 0.35: shot_type = "Close-up (Крупный)"
    elif avg_face_size > 0.15: shot_type = "Medium (Средний)"
    elif avg_face_size > 0: shot_type = "Wide (Общий)"
    else: shot_type = "No Face"
    
    # Content Type (В процентах, как ты просил)
    content_desc = f"Face: {int(face_pct)}% | Text: {int(text_pct)}%"

    # AI Summaries
    top_colors = Counter(all_colors).most_common(3)
    palette = ", ".join([c[0] for c in top_colors])
    dom_color = top_colors[0][0] if top_colors else "#000000"
    
    keywords = ", ".join([w[0] for w in Counter(all_words).most_common(7)]) # Топ-7 слов
    
    dom_emotion = Counter(all_emotions).most_common(1)[0][0] if all_emotions else "Neutral"
    avg_age = int(np.mean(all_ages)) if all_ages else 0
    dom_gender = Counter(all_genders).most_common(1)[0][0] if all_genders else "Unknown"

    return {
        'filename': filename,
        'duration_cv': round(duration, 1),
        'music_track': music_track,
        'vol_avg': avg_vol,
        'silence_pct': silence,
        
        # Visuals
        'avg_motion': round(avg_motion, 1),
        'avg_blur': round(avg_blur, 1),
        'dom_color': dom_color,
        'palette': palette,
        
        # Structure
        'cuts_per_min': round(num_cuts / (duration/60), 1) if duration > 0 else 0,
        'hook_motion': round(hook_impact, 1),
        'hook_cuts': hook_cuts,
        
        # Content
        'shot_type': shot_type,
        'face_pct': round(face_pct, 1),
        'text_pct': round(text_pct, 1),
        'content_type': content_desc,  # ТЕПЕРЬ ТУТ ПРОЦЕНТЫ
        'ocr_keywords': keywords,
        
        # AI Person
        'ai_emotion': dom_emotion,
        'ai_age': avg_age,
        'ai_gender': dom_gender
    }