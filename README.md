# Daily Wellness Scheduler

A comprehensive web-based application for managing your daily wellness routine, including supplements, nutrition tracking, meal planning, habits, tasks, sleep tracking, and more.

## Features

- **Smart Scheduling**: Automatically generates schedules based on meal times, workout days, and study blocks
- **Nutrition Tracking**: Track meals, calories, macros, and get health insights using Nutri-Score and NOVA badges
- **Food Database**: Searchable database with barcode scanning and photo recognition
- **Meal Planning**: Create meal templates and plan your meals in advance
- **Habit Tracking**: Build and track daily habits with streak tracking
- **Task Management**: Organize tasks with recurring patterns and templates
- **Sleep Tracking**: Monitor sleep patterns and quality
- **Water Tracking**: Track daily water intake with reminders
- **Health Metrics**: Track weight, body measurements, and other health data
- **AI Coach**: Get personalized wellness coaching and insights
- **Social Features**: Connect with friends, share progress, and participate in challenges
- **Analytics Dashboard**: Comprehensive analytics and progress visualization
- **Mobile-Ready**: Progressive Web App (PWA) that works on mobile devices
- **Self-Hostable**: Use Cloudflare Tunnel to access from anywhere

## Tech Stack

- **Backend**: Python 3.10+, FastAPI, Uvicorn
- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **Database**: JSON-based file storage (can be migrated to SQL later)

## Prerequisites

- Python 3.10 or higher
- Node.js 18 or higher
- npm or yarn
- (Optional) Cloudflared for self-hosting/tunneling

---

## Installation & Setup

### Windows Instructions

1. **Install Python**
   - Download Python 3.10+ from [python.org](https://www.python.org/downloads/)
   - During installation, check "Add Python to PATH"
   - Verify installation:
     ```powershell
     python --version
     ```

2. **Install Node.js**
   - Download Node.js 18+ from [nodejs.org](https://nodejs.org/)
   - Install with default settings
   - Verify installation:
     ```powershell
     node --version
     npm --version
     ```

3. **Clone or Navigate to Project**
   ```powershell
   cd daily-wellness-scheduler
   ```

4. **Install Backend Dependencies**
   ```powershell
   pip install -r requirements.txt
   ```
   
   If you encounter issues, you may need to use `pip3` instead:
   ```powershell
   pip3 install -r requirements.txt
   ```

5. **Install Frontend Dependencies**
   ```powershell
   cd frontend
   npm install
   cd ..
   ```

6. **Start the Application**
   
   **Option 1: Using the launcher script (Recommended)**
   ```powershell
   python start_app.py
   ```
   
   This will automatically:
   - Start the backend server on `http://localhost:8000`
   - Start the frontend dev server on `http://localhost:3000`
   - Open your browser to `http://localhost:3000`

   **Option 2: Manual start**
   
   Terminal 1 (Backend):
   ```powershell
   python -m backend.main
   ```
   
   Terminal 2 (Frontend):
   ```powershell
   cd frontend
   npm run dev -- --webpack
   ```

7. **Access the Application**
   - Open your browser and navigate to `http://localhost:3000`
   - The backend API will be accessible at `http://localhost:8000`

---

### Linux Instructions

1. **Install Python**
   ```bash
   # Ubuntu/Debian
   sudo apt update
   sudo apt install python3 python3-pip python3-venv
   
   # Fedora/RHEL
   sudo dnf install python3 python3-pip
   
   # Arch Linux
   sudo pacman -S python python-pip
   ```
   
   Verify installation:
   ```bash
   python3 --version
   pip3 --version
   ```

2. **Install Node.js**
   ```bash
   # Using NodeSource repository (recommended for latest version)
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Or using snap
   sudo snap install node --classic
   
   # Or using nvm (Node Version Manager)
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   source ~/.bashrc
   nvm install 18
   nvm use 18
   ```
   
   Verify installation:
   ```bash
   node --version
   npm --version
   ```

3. **Clone or Navigate to Project**
   ```bash
   cd daily-wellness-scheduler
   ```

4. **Install Backend Dependencies**
   ```bash
   pip3 install -r requirements.txt
   ```
   
   **Note**: You may want to use a virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

5. **Install Frontend Dependencies**
   ```bash
   cd frontend
   npm install
   cd ..
   ```

6. **Start the Application**
   
   **Option 1: Using the launcher script (Recommended)**
   ```bash
   python3 start_app.py
   ```
   
   **Option 2: Manual start**
   
   Terminal 1 (Backend):
   ```bash
   python3 -m backend.main
   ```
   
   Terminal 2 (Frontend):
   ```bash
   cd frontend
   npm run dev -- --webpack
   ```

7. **Access the Application**
   - Open your browser and navigate to `http://localhost:3000`
   - The backend API will be accessible at `http://localhost:8000`

---

## Optional: Food Database Setup

The app includes a local food database for nutrition tracking. The large food database files are **not included** in the git repository to keep it lightweight.

### Downloading the Food Database (Optional)

If you want to use the food photo recognition and barcode scanning features, you can download the food database:

**Option 1: Download OpenFoodFacts Database (Recommended)**

The app includes a script to download the OpenFoodFacts database:

```bash
# Windows
python backend/download_openfoodfacts.py

# Linux
python3 backend/download_openfoodfacts.py
```

This will download the latest OpenFoodFacts product database to `data/openfoodfacts_products.jsonl.gz`.

**Option 2: Manual Download**

1. Visit [OpenFoodFacts](https://world.openfoodfacts.org/data)
2. Download the products JSONL file
3. Place it in the `data/` directory as `openfoodfacts_products.jsonl.gz`

**Note:** The food database is large (several GB compressed). The app will work without it, but food barcode scanning and photo recognition will be limited.

---

## Self-Hosting with Cloudflare Tunnel

To access your app from your phone or any device outside your local network, you can use Cloudflare Tunnel.

### Windows

1. **Download Cloudflared**
   - The project includes `cloudflared.exe` in the root directory
   - Or download from [cloudflare.com/products/tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)

2. **Start the Application First**
   ```powershell
   python start_app.py
   ```
   Wait until both backend and frontend are running.

3. **Start Cloudflare Tunnel (in a new terminal)**
   ```powershell
   python start_cloudflare_tunnel.py
   ```
   
   Or manually:
   ```powershell
   .\cloudflared.exe tunnel --url http://localhost:3000
   ```

4. **Copy the Public URL**
   - Cloudflare will generate a public URL like `https://xxxx-xxxx.trycloudflare.com`
   - Copy this URL and use it on your phone or any device
   - The URL will be active as long as the tunnel is running

### Linux

1. **Install Cloudflared**
   ```bash
   # Using package manager
   # Ubuntu/Debian
   curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
   sudo dpkg -i cloudflared.deb
   
   # Or download binary directly
   wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
   chmod +x cloudflared-linux-amd64
   sudo mv cloudflared-linux-amd64 /usr/local/bin/cloudflared
   ```

2. **Start the Application First**
   ```bash
   python3 start_app.py
   ```
   Wait until both backend and frontend are running.

3. **Start Cloudflare Tunnel (in a new terminal)**
   ```bash
   python3 start_cloudflare_tunnel.py
   ```
   
   Or manually:
   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```

4. **Copy the Public URL**
   - Cloudflare will generate a public URL like `https://xxxx-xxxx.trycloudflare.com`
   - Copy this URL and use it on your phone or any device
   - The URL will be active as long as the tunnel is running

**Important Notes:**
- The tunnel URL changes each time you restart it
- Keep both the app and tunnel running to maintain access
- The tunnel is temporary and will close when you stop the script (Ctrl+C)
- For a permanent tunnel, set up a Cloudflare account and configure a named tunnel

---

## Configuration

### First Time Setup

1. **Sign Up / Login**
   - Create an account when you first access the app
   - Or log in with existing credentials

2. **Configure Settings**
   - Click the Settings icon (gear) in the app
   - Set your wake time, bed time, and dinner time
   - Configure meal patterns (Breakfast/Lunch/Dinner times)
   - Set fasting window and intensity if applicable
   - Configure workout schedule
   - Set notification preferences

3. **Add Items to Schedule**
   - Use "Add Custom Item" to add supplements, tasks, or habits
   - Or let the AI suggest a schedule based on your settings
   - Edit any item by clicking the pencil icon

### Data Storage

All user data is stored locally in the `data/` directory:
- Each user has their own subdirectory: `data/username@domain.domain/`
- Schedules, progress, settings, and all data is saved automatically
- Data persists between app restarts

---

## Development

### Project Structure

```
daily-wellness-scheduler/
├── backend/              # FastAPI Python backend
│   ├── main.py          # API endpoints
│   ├── models.py        # Data models
│   ├── scheduler_engine.py  # Core scheduling logic
│   └── ...              # Various engines (nutrition, habits, etc.)
├── frontend/            # Next.js React frontend
│   ├── app/            # Next.js app directory (pages & routes)
│   ├── src/            # Source files (components, utils)
│   └── public/         # Static assets
├── data/               # User data (auto-generated)
├── start_app.py        # Launcher script
├── start_cloudflare_tunnel.py  # Cloudflare tunnel script
├── requirements.txt    # Python dependencies
└── README.md          # This file
```

### Running in Development Mode

The app runs in development mode by default:
- Frontend: Hot-reload enabled, accessible at `http://localhost:3000`
- Backend: Auto-reload enabled, accessible at `http://localhost:8000`

### Building for Production

**Frontend:**
```bash
cd frontend
npm run build
npm start
```

**Backend:**
```bash
# Use a production ASGI server like gunicorn
pip install gunicorn
gunicorn backend.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

---

## Troubleshooting

### Port Already in Use

If you get an error that port 3000 or 8000 is already in use:

**Windows:**
```powershell
# Find process using port 3000
netstat -ano | findstr :3000

# Find process using port 8000
netstat -ano | findstr :8000

# Kill process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

**Linux:**
```bash
# Find process using port 3000
lsof -i :3000

# Find process using port 8000
lsof -i :8000

# Kill process (replace PID with actual process ID)
kill -9 <PID>
```

Or use the provided script:
```bash
python3 kill_ports.py
```

### Module Not Found Errors

**Backend:**
```bash
# Make sure you're in the project root
pip install -r requirements.txt
```

**Frontend:**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### CORS Errors

The backend is configured to allow CORS from all origins. If you still see CORS errors, make sure:
- Backend is running on port 8000
- Frontend is configured to proxy `/backend` requests correctly

### Cloudflare Tunnel Not Working

1. Make sure the app is running first (ports 3000 and 8000)
2. Check that cloudflared executable has execute permissions (Linux):
   ```bash
   chmod +x cloudflared
   ```
3. Try manually running cloudflared:
   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```

---

## Features Overview

### Core Features
- **Schedule Management**: Create, edit, and manage your daily wellness schedule
- **Progress Tracking**: Mark items as complete and track your daily progress
- **Multiple Views**: Today, Week, and 6-Week views for different planning horizons

### Nutrition Features
- Food logging with searchable database
- Barcode scanning for quick food entry
- Photo recognition for meals
- Nutrition insights (Nutri-Score, NOVA badges)
- Meal templates and meal planning
- Shopping list generation

### Wellness Features
- Habit tracking with streaks
- Task management with recurring patterns
- Sleep tracking and analysis
- Water intake tracking
- Weight and health metrics tracking
- AI-powered coaching and insights

### Social Features
- Friend connections
- Progress sharing
- Challenges and competitions
- Community feed

---

## Support

For issues, questions, or contributions:
- Check the project documentation in the various `.md` files
- Review the backend and frontend code comments
- Ensure all dependencies are installed correctly

---

## License

Personal use only.

---

## Notes

- The app uses JSON file storage for simplicity. For production, consider migrating to a proper database (PostgreSQL, SQLite, etc.)
- Cloudflare Tunnel URLs are temporary and change on each restart
- All data is stored locally - make regular backups of the `data/` directory
- The app is a Progressive Web App (PWA) and can be installed on mobile devices
