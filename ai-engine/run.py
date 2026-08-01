import os
import sys
import asyncio
import uvicorn

# We must set this policy BEFORE uvicorn builds its own internal event loops
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

if __name__ == "__main__":
    # host из env: 0.0.0.0 в Docker/прод, можно переопределить локально.
    # Reload MUST be False. Multiprocessing wipes out the event loop policy!
    uvicorn.run("main:app", host=os.getenv("HOST", "0.0.0.0"), port=int(os.getenv("PORT", "8001")), reload=False)
