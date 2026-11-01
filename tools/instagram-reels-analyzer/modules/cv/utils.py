import cv2
import numpy as np
from collections import Counter

def calc_entropy(img_gray):
    """Считает визуальную сложность кадра"""
    hist = cv2.calcHist([img_gray], [0], None, [256], [0, 256])
    hist /= hist.sum() + 1e-7 
    hist = hist[hist > 0]
    return -np.sum(hist * np.log2(hist))

def get_dominant_colors(frame, k=3):
    """Возвращает TOP-K цветов в формате HEX"""
    try:
        resized = cv2.resize(frame, (150, 150))
        data = np.float32(resized).reshape((-1, 3))
        criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 10, 1.0)
        ret, label, center = cv2.kmeans(data, k, None, criteria, 10, cv2.KMEANS_RANDOM_CENTERS)
        center = np.uint8(center)
        counts = Counter(label.flatten())
        sorted_centers = [center[i] for i in sorted(counts, key=counts.get, reverse=True)]
        return ["#{:02x}{:02x}{:02x}".format(c[2], c[1], c[0]) for c in sorted_centers]
    except: return []

def determine_temp(r_channel, b_channel):
    val = r_channel - b_channel
    if val > 10: return "Warm"
    if val < -10: return "Cold"
    return "Neutral"