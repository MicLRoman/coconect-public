import re

def parse_metric_text(text):
    """Преобразует строки типа '1.5K', '1M' в числа."""
    if not text: return 0
    text = str(text).upper().replace(',', '.')
    try:
        clean_text = ''.join(c for c in text if c.isdigit() or c in ['.', 'K', 'M'])
        if not clean_text: return 0
        
        multiplier = 1
        if 'K' in clean_text:
            multiplier = 1000
            clean_text = clean_text.replace('K', '')
        elif 'M' in clean_text:
            multiplier = 1_000_000
            clean_text = clean_text.replace('M', '')
        
        return int(float(clean_text) * multiplier)
    except:
        return 0