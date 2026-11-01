import os
import sys
import contextlib

# --- CONTEXT MANAGER ---
@contextlib.contextmanager
def suppress_output():
    with open(os.devnull, "w") as devnull:
        old_stdout = sys.stdout; old_stderr = sys.stderr
        try:
            sys.stdout = devnull; sys.stderr = devnull
            yield
        finally:
            sys.stdout = old_stdout; sys.stderr = old_stderr

# --- IMPORTS CHECK ---
AUDIO_AVAILABLE = False
try:
    with suppress_output():
        try: from moviepy import VideoFileClip
        except ImportError: from moviepy.editor import VideoFileClip
    AUDIO_AVAILABLE = True
except ImportError: pass

SHAZAM_AVAILABLE = False
try:
    from shazamio import Shazam
    SHAZAM_AVAILABLE = True
except ImportError: pass

DEEPFACE_AVAILABLE = False
try:
    from deepface import DeepFace
    os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2' 
    DEEPFACE_AVAILABLE = True
except ImportError: pass

SCENEDETECT_AVAILABLE = False
SCENEDETECT_V6 = False
try:
    from scenedetect import SceneManager
    from scenedetect.detectors import ContentDetector
    try:
        from scenedetect import open_video
        SCENEDETECT_V6 = True
    except ImportError:
        from scenedetect import VideoManager
        SCENEDETECT_V6 = False
    SCENEDETECT_AVAILABLE = True
except ImportError: pass

import pytesseract
# pytesseract.pytesseract.tesseract_cmd = r'Путь_к_tesseract_если_надо'