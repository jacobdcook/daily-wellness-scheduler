# Daily Wellness Scheduler - Web App

This is the modernized Web Application version of the Daily Wellness Scheduler.

## Features
- **Mobile Friendly**: Responsive design works on phones and desktops.
- **Modern UI**: Clean, card-based interface with "Sweaty" vs "Light" day toggle.
- **FastAPI Backend**: Robust Python backend reusing the original scheduling logic.
- **Next.js Frontend**: Fast, interactive React-based UI.

## How to Run

### Option 1: One-Click Start (Recommended)
Run the helper script:
```bash
python start_app.py
```
This will start both the backend and frontend servers and open your browser.

### Option 2: Manual Start

1. **Start Backend**:
   ```bash
   python -m backend.main
   ```
   (Runs on http://localhost:8000)

2. **Start Frontend**:
   Open a new terminal:
   ```bash
   cd frontend
   npm run dev
   ```
   (Runs on http://localhost:3000)

## Architecture
- `backend/`: Python FastAPI application
- `frontend/`: Next.js TypeScript application
- `daily_wellness_scheduler.py`: Original legacy script (kept for reference)
