import os
import shutil
import instaloader
from colorama import Fore

# Whisper Import
try:
    import whisper
    WHISPER_AVAILABLE = True
except ImportError:
    WHISPER_AVAILABLE = False
    print(f"{Fore.YELLOW}⚠️ openai-whisper library not found.")

class MediaLoader:
    def __init__(self, session_cookies=None, session_headers=None):
        self.L = instaloader.Instaloader()
        self.L.download_pictures = True
        self.L.download_video_thumbnails = False
        self.L.download_geotags = False
        self.L.download_comments = False
        self.L.save_metadata = False
        self.L.compress_json = False

        # Sync session if provided
        if session_cookies:
            for k, v in session_cookies.items():
                self.L.context._session.cookies.set(k, v)
        if session_headers:
            for k, v in session_headers.items():
                self.L.context._session.headers.update({k: v})

        self.whisper_model = None
        if WHISPER_AVAILABLE:
            print(f"{Fore.CYAN}⏳ Loading Whisper model (Base)...")
            try:
                self.whisper_model = whisper.load_model("base")
                print(f"{Fore.GREEN}✅ Whisper ready.")
            except Exception as e:
                print(f"{Fore.RED}Whisper Error: {e}")

    def download_post(self, shortcode, target_folder_abs, is_video=True):
        print(f"   ⬇️ Downloading (Instaloader)...")
        original_cwd = os.getcwd()
        caption_from_loader = None
        final_path = None
        
        try:
            tmp_dir_name = f"temp_{shortcode}"
            tmp_dir_abs = os.path.join(target_folder_abs, tmp_dir_name)
            if os.path.exists(tmp_dir_abs): shutil.rmtree(tmp_dir_abs)
            os.makedirs(tmp_dir_abs)
            
            os.chdir(target_folder_abs)
            post = instaloader.Post.from_shortcode(self.L.context, shortcode)
            if post.caption: caption_from_loader = post.caption

            self.L.download_post(post, target=tmp_dir_name)
            
            target_ext = ".mp4" if is_video else ".jpg"
            final_path = os.path.join(target_folder_abs, f"{shortcode}{target_ext}")
            found = False
            
            if os.path.exists(tmp_dir_name):
                for f in os.listdir(tmp_dir_name):
                    if f.endswith(target_ext):
                        src = os.path.join(tmp_dir_name, f)
                        if os.path.exists(final_path): os.remove(final_path)
                        os.rename(src, final_path)
                        found = True
                        break
                os.chdir(target_folder_abs)
                shutil.rmtree(tmp_dir_name)
            
            if not found: final_path = None
            
        except Exception as e:
            print(f"{Fore.RED}   Instaloader Error: {e}")
            final_path = None
        finally:
            os.chdir(original_cwd)
        
        return final_path, caption_from_loader

    def transcribe(self, filepath):
        if not self.whisper_model or not filepath or not os.path.exists(filepath):
            return None
        try:
            print(f"   🎙️ Transcribing...")
            res = self.whisper_model.transcribe(filepath, fp16=False)
            return res["text"].strip()
        except Exception as e:
            print(f"{Fore.RED}   Whisper Error: {e}")
            return None