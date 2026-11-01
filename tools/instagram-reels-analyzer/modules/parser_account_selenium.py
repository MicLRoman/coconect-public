import os
from colorama import init
from .ig_bot.driver import InstagramDriver
from .ig_bot.loader import MediaLoader
from .ig_bot.core import InstagramCore

init(autoreset=True)

class InstagramAccountParser:
    def __init__(self):
        self.driver_manager = InstagramDriver()
        self.loader = MediaLoader() # Whisper initializes here
        self.core = None

    def run(self, username, limit, session_path):
        # 1. Setup Driver
        if not self.driver_manager.setup():
            return
        
        # 2. Login
        self.driver_manager.check_login()
        
        # 3. Setup Session
        session_path = os.path.abspath(session_path)
        if not os.path.exists(session_path): os.makedirs(session_path)
        
        # Sync cookies to instaloader
        try:
            cookies = {c['name']: c['value'] for c in self.driver_manager.driver.get_cookies()}
            self.loader = MediaLoader(session_cookies=cookies) # Re-init loader with auth
        except: pass

        # 4. Initialize Core Logic
        self.core = InstagramCore(self.driver_manager.driver, self.loader, session_path)

        # 5. EXECUTE PIPELINE
        try:
            # A. Profile
            self.core.parse_profile(username)
            
            # B. Feed (Photos)
            self.core.parse_feed(username, limit)
            
            # C. Reels (Videos)
            self.core.parse_reels(username, limit)
            
        finally:
            self.close()

    def close(self):
        self.driver_manager.close()