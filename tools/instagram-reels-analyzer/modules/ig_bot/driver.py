import os
import time
import requests
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
from colorama import Fore

class InstagramDriver:
    def __init__(self):
        self.driver = None
        self.session = requests.Session()

    def setup(self):
        print(f"{Fore.CYAN}--- Starting Chrome Driver ---")
        options = Options()
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-blink-features=AutomationControlled")
        options.add_experimental_option("excludeSwitches", ["enable-automation"])
        options.add_argument("--mute-audio")
        
        current_dir = os.getcwd()
        profile_dir = os.path.join(current_dir, "chrome_data", "bot_profile")
        if not os.path.exists(profile_dir):
            os.makedirs(profile_dir)
            
        options.add_argument(f"user-data-dir={profile_dir}")
        
        try:
            self.driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)
            return True
        except Exception as e:
            print(f"\n{Fore.RED}CRITICAL DRIVER ERROR: {e}")
            return False

    def check_login(self):
        print(f"{Fore.CYAN}Checking Instagram session...")
        self.driver.get("https://www.instagram.com/")
        time.sleep(5)
        
        if 'Log In' in self.driver.page_source:
             print(f"\n{Fore.RED}🛑 YOU ARE NOT LOGGED IN!")
             print(f"{Fore.YELLOW}👉 Log in to your account in the browser, then press ENTER here.")
             input()
        else:
             print(f"{Fore.GREEN}✅ Login successful.")
        
        self._sync_cookies()

    def _sync_cookies(self):
        try:
            selenium_cookies = self.driver.get_cookies()
            for cookie in selenium_cookies:
                self.session.cookies.set(cookie['name'], cookie['value'])
            
            user_agent = self.driver.execute_script("return navigator.userAgent;")
            self.session.headers.update({"User-Agent": user_agent})
        except: pass

    def close(self):
        if self.driver:
            try: self.driver.quit()
            except: pass