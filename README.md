# Daily Wellness Scheduler

A modern, web-based application to manage your daily supplement, electrolyte, and wellness schedule.

## ✨ Features

-   **Smart Scheduling**: Automatically generates a schedule based on your meal times, workout days, and study blocks.
-   **Persistent & Editable**: Your schedule is saved automatically. You can manually edit any item's time, dose, or notes.
-   **Custom Items**: Add your own custom events or supplements to the schedule.
-   **Fasting Support**: Built-in fasting mode (Light/Strict) that adjusts supplement timing around your feeding window.
-   **Pushbullet Notifications**: Get real-time alerts to your phone/PC when it's time to take a supplement.
-   **Mobile Responsive**: Full web interface that works great on desktop and mobile.
-   **Progress Tracking**: Check off items as you go. Progress is saved daily.
-   **Multiple Views**:
    -   **Today**: Focused daily checklist with progress bar.
    -   **Week**: 7-day overview.
    -   **6-Week**: Long-term planning view.

## 🚀 Quick Start

### Prerequisites
-   Python 3.10+
-   Node.js 18+ (for the frontend)

### Running the App

1.  **Install Backend Dependencies**:
    ```bash
    pip install fastapi uvicorn pydantic python-multipart requests
    ```

2.  **Install Frontend Dependencies**:
    ```bash
    cd frontend
    npm install
    cd ..
    ```

3.  **Start the Application**:
    This single script launches both the FastAPI backend and Next.js frontend:
    ```bash
    python start_app.py
    ```
    
    The app will open automatically at **http://localhost:3000**.

## 🛠 Configuration

-   **Settings Panel**: Click the gear icon to configure:
    -   Wake/Bed/Dinner times
    -   Meal patterns (Breakfast/Lunch/Dinner)
    -   Fasting Window & Intensity
    -   Workout Schedule
    -   Pushbullet API Key
-   **Custom Items**: Click "Add Custom Item" to add one-off or recurring items.
-   **Editing**: Click the pencil icon on any item to modify it.
-   **Regenerate**: If you change your core settings significantly, use the "Regenerate Schedule" button in settings to rebuild your plan.

## 📂 Project Structure

-   **`backend/`**: FastAPI Python application (API, Logic, Persistence).
    -   `main.py`: API endpoints.
    -   `scheduler_engine.py`: Core scheduling logic.
    -   `models.py`: Pydantic data models.
-   **`frontend/`**: Next.js React application (UI).
    -   `app/page.tsx`: Main dashboard.
    -   `src/components/`: UI components (Modals, Views, Settings).
-   **`start_app.py`**: Launcher script.
-   **`daily_wellness_scheduler.py`**: (Legacy) Original Tkinter desktop version.

## 🔔 Notifications

To enable notifications:
1.  Get an API Key from [Pushbullet.com](https://www.pushbullet.com/).
2.  Enter it in the Settings panel.
3.  The app will check for upcoming supplements every minute and send alerts.

## 💾 Data Storage

All data is stored locally in the `.local_private/` directory:
-   `settings.json`: Your configuration.
-   `progress.json`: Daily completion status.
-   `schedule.json`: The generated and edited schedule.
-   `pushbullet_key.txt`: Your API key.

## 📜 License

Personal use only.
