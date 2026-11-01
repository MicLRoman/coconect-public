# Instagram Reels Analyzer

A standalone competitive-intelligence pipeline for Instagram Reels. For a list
of target accounts, it scrapes the most recent reels, runs computer-vision and
audio analysis over each video, and produces a CSV + dashboard + an LLM prompt
summarizing the detected trends.

This is a self-contained tool — it does not import from `ai-engine/` or the
rest of the repo, and it can be run on its own.

## What it does

1. **Scrape** — Selenium opens Instagram and collects the last N reels for each
   target account: video file, caption, likes / views / comments / date.
2. **Analyze** — for every downloaded reel:
   - OpenCV: average motion, shot type (close-up / medium / wide), dominant
     color, temporal type (static / dynamic).
   - OCR (`pytesseract`): on-screen text and hooks.
   - Optional: scene-cut detection (`scenedetect`), music identification
     (`shazamio`), face / emotion detection (`deepface`).
   - Transcript of the spoken audio (when available).
3. **Aggregate** — writes `all_competitors_trends.csv`, builds a dashboard of
   charts, and generates `LLM_Trend_Request.txt`, a ready-to-paste prompt
   asking an LLM to call out the current meta-trends across the accounts.

## Layout

```
tools/instagram-reels-analyzer/
├── main.py                 # pipeline entry point (CompetitiveAnalysisPipeline)
├── main1.py                # alternate entry point
├── analyze_out.py          # post-hoc analysis of a saved run
├── requirements.txt
└── modules/
    ├── reels_parser_account_selenium.py   # scrapes an account's reels
    ├── parser_account_selenium.py         # scrapes profile metadata
    ├── reels_analyzer_cv.py               # per-reel CV + audio analysis
    ├── analyzer_cv.py                     # legacy / profile-image analyzer
    ├── visualizer.py                      # chart / dashboard output
    ├── cv/                                # vision, scenes, audio, config
    └── ig_bot/                            # Selenium driver, media loader
```

Outputs land under `storage/<account>_<date>/` (raw media + per-reel JSON)
and `results/CompetitorAnalysis_<date>/` (CSV, charts, LLM prompt). Both
folders are gitignored.

## Install

Python 3.10+ recommended.

```bash
cd tools/instagram-reels-analyzer
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

System requirements:

- **Google Chrome** — Selenium drives it; `webdriver-manager` fetches the
  matching chromedriver automatically.
- **Tesseract** — used by `pytesseract` for on-screen OCR. On macOS:
  `brew install tesseract`. On Debian/Ubuntu: `sudo apt install tesseract-ocr`.

Optional (enable extra signals by uncommenting in `requirements.txt`):
`moviepy`, `shazamio`, `deepface`, `scenedetect`.

## Run

Edit `main.py` and set the accounts + depth:

```python
TARGET_ACCOUNTS = ["zubyzaden"]
VIDEOS_TO_PARSE = 40
```

Then:

```bash
python main.py
```

The first run opens a real Chrome window — you may need to log into Instagram
once so the scraper can see non-public reels; the session cookies are reused
on subsequent runs.

Results:

- `storage/<account>_<YYYY-MM-DD>/` — scraped reels, per-reel `.json`, `.txt`
  (caption), `_tr.txt` (transcript).
- `results/CompetitorAnalysis_<YYYY-MM-DD_HH-MM>/`
  - `all_competitors_trends.csv` — one row per reel, plus a computed ER column.
  - Dashboard charts.
  - `LLM_Trend_Request.txt` — prompt you can paste into an LLM to extract
    mega-trends across the sampled accounts.

## Notes

- Scraping Instagram at scale can violate their Terms of Service — use this
  for small-scale competitive research on accounts you have permission to
  analyze, respect rate limits, and never commit scraped media.
- The pipeline is intentionally tolerant of missing optional dependencies:
  each `*_AVAILABLE` flag in `modules/cv/config.py` gates a feature so you can
  install the minimum set and still get useful output.
