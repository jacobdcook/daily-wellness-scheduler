from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
from typing import Dict, List
from .models import UserSettings, ScheduledItem
from .scheduler_engine import SupplementScheduler

app = FastAPI(title="Daily Wellness Scheduler API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development, allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    return {"status": "ok"}

@app.post("/generate-schedule", response_model=Dict[str, List[ScheduledItem]])
async def generate_schedule(settings: UserSettings):
    try:
        scheduler = SupplementScheduler(settings)
        # Generate for 6 weeks starting today
        start_date = datetime.now()
        schedule = scheduler.generate_schedule(start_date, weeks=6)
        return schedule
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
