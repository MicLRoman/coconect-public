import asyncio
import numpy as np
from .config import AUDIO_AVAILABLE, SHAZAM_AVAILABLE, suppress_output

if SHAZAM_AVAILABLE:
    from shazamio import Shazam
if AUDIO_AVAILABLE:
    try: from moviepy import VideoFileClip
    except: from moviepy.editor import VideoFileClip

async def recognize_song_async(filepath):
    shazam = Shazam()
    try:
        with suppress_output():
            out = await shazam.recognize(filepath)
        track = out.get('track', {})
        if track: return f"{track.get('subtitle', 'Unknown')} - {track.get('title', 'Unknown')}"
    except: pass
    return "Not Found"

def get_music_info(filepath):
    if not SHAZAM_AVAILABLE: return "Not Installed"
    try: return asyncio.run(recognize_song_async(filepath))
    except: return "Error"

def analyze_audio_track(filepath):
    if not AUDIO_AVAILABLE: return 0, 0, 0
    
    with suppress_output():
        try:
            clip = VideoFileClip(filepath)
            if clip.audio is None: 
                clip.close(); return 0, 0, 0
            
            # Читаем аудио как массив
            chunk = clip.audio.to_soundarray(fps=22050)
            if chunk is None or len(chunk) == 0: 
                clip.close(); return 0, 0, 100
                
            # Громкость (RMS)
            loudness = np.sqrt((chunk**2).mean())
            max_peak = np.max(np.abs(chunk))
            
            # Тишина (< 1%)
            is_silent = np.max(np.abs(chunk), axis=1) < 0.01
            silence_pct = np.mean(is_silent) * 100
            
            clip.close()
            return round(loudness, 3), round(max_peak, 3), round(silence_pct, 1)
        except: return 0, 0, 0