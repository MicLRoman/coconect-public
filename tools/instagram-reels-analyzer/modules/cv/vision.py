import cv2
import re
import pytesseract
from .config import DEEPFACE_AVAILABLE

if DEEPFACE_AVAILABLE:
    from deepface import DeepFace

def get_ocr_text(frame):
    """Извлекает текст с кадра"""
    try:
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        # config for sparse text
        text = pytesseract.image_to_string(gray, lang='rus+eng', config='--psm 6')
        clean_text = re.sub(r'[^\w\s]', '', text).strip()
        words = [w.lower() for w in clean_text.split() if len(w) > 3]
        return words
    except: return []

def detect_faces_deep(frame):
    """
    Возвращает: кол-во лиц, макс. размер лица (ratio), эмоции (список), возраст, пол
    """
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(gray, 1.1, 4)
    
    res = {
        'count': len(faces),
        'max_ratio': 0.0,
        'emotions': [],
        'ages': [],
        'genders': []
    }
    
    if len(faces) > 0:
        h_frame = frame.shape[0]
        largest = max(faces, key=lambda r: r[2]*r[3])
        res['max_ratio'] = largest[3] / h_frame
        
        # DeepFace (Heavy operation)
        if DEEPFACE_AVAILABLE:
            try:
                analysis = DeepFace.analyze(frame, actions=['age', 'gender', 'emotion'], 
                                            enforce_detection=False, detector_backend='opencv', silent=True)
                # DeepFace может вернуть список или dict
                if isinstance(analysis, list):
                    for face in analysis:
                        if face.get('face_confidence', 1) > 0.4:
                            res['emotions'].append(face['dominant_emotion'])
                            res['ages'].append(face['age'])
                            res['genders'].append(face['dominant_gender'])
                elif isinstance(analysis, dict):
                     res['emotions'].append(analysis['dominant_emotion'])
                     res['ages'].append(analysis['age'])
                     res['genders'].append(analysis['dominant_gender'])
            except: pass
            
    return res