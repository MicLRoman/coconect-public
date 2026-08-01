FROM python:3.12-slim

WORKDIR /app

# Звонки (aiortc/av/websockets) на сервере не нужны — call_bridge ленивый,
# без них просто reject. Исключаем, чтобы образ был лёгкий и быстро собирался.
COPY requirements.txt .
RUN grep -ivE '^(aiortc|av|websockets)' requirements.txt > req.server.txt \
    && pip install --no-cache-dir -r req.server.txt

COPY . .

ENV HOST=0.0.0.0 PORT=8001
EXPOSE 8001

# run.py поднимает uvicorn + matching-демон (startup event).
CMD ["python", "run.py"]
