# Этот файл - обертка для сохранения совместимости с main1.py
from .cv.analyzer import analyze_video, analyze_static_image

# Если в main1.py требуются какие-то специфичные импорты напрямую из analyzer_cv, 
# они теперь доступны через эту прокси.