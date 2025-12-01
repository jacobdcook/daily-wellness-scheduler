# Daily Wellness Scheduler

A web-based application for managing your daily supplement, electrolyte, and wellness schedule.

## Features

- **Smart Scheduling**: Automatically generates a schedule based on your meal times, workout days, and study blocks
- **Persistent & Editable**: Your schedule is saved automatically. You can manually edit any item's time, dose, or notes
- **Custom Items**: Add your own custom events or supplements to the schedule
- **Fasting Support**: Built-in fasting mode (Light/Strict) that adjusts supplement timing around your feeding window
- **Pushbullet Notifications**: Get real-time alerts to your phone/PC when it's time to take a supplement
- **Mobile Responsive**: Full web interface that works on desktop and mobile devices
- **Progress Tracking**: Check off items as you go. Progress is saved daily
- **Multiple Views**:
    - **Today**: Focused daily checklist with progress bar
    - **Week**: 7-day overview
    - **6-Week**: Long-term planning view

## Quick Start

### Prerequisites
- Python 3.10 or higher
- Node.js 18 or higher

### Installation

1. Install backend dependencies:
    ```bash
    pip install fastapi uvicorn pydantic python-multipart requests
    ```

2. Install frontend dependencies:
    ```bash
    cd frontend
    npm install
    cd ..
    ```

3. Start the application:
    ```bash
    python start_app.py
    ```
    
    The app will open automatically at http://localhost:3000

## Configuration

Use the Settings panel (gear icon) to configure:
- Wake/Bed/Dinner times
- Meal patterns (Breakfast/Lunch/Dinner)
- Fasting Window & Intensity
- Workout Schedule
- Pushbullet API Key

You can add custom items by clicking "Add Custom Item" to add one-off or recurring items. To edit an existing item, click the pencil icon on any scheduled item. If you change your core settings significantly, use the "Regenerate Schedule" button in settings to rebuild your plan.

## Project Structure

- `backend/`: FastAPI Python application
    - `main.py`: API endpoints
    - `scheduler_engine.py`: Core scheduling logic
    - `models.py`: Pydantic data models
- `frontend/`: Next.js React application
    - `app/page.tsx`: Main dashboard
    - `src/components/`: UI components (Modals, Views, Settings)
- `start_app.py`: Launcher script that starts both backend and frontend
- `daily_wellness_scheduler.py`: Original Tkinter desktop version (legacy)

## Notifications

To enable Pushbullet notifications:
1. Get an API Key from [Pushbullet.com](https://www.pushbullet.com/)
2. Enter it in the Settings panel
3. The app will check for upcoming supplements every minute and send alerts

## Data Storage

All data is stored locally in the `.local_private/` directory:
- `settings.json`: Your configuration
- `progress.json`: Daily completion status
- `schedule.json`: The generated and edited schedule
- `pushbullet_key.txt`: Your API key

## License

Personal use only.
