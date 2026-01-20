# Linux Quick Start Guide

Complete guide to run the Daily Wellness Scheduler on Linux, including cloudflared tunnel setup for hosting.

## Quick Start (TLDR)

```bash
# 1. Install dependencies
sudo apt update
sudo apt install python3 python3-pip nodejs npm

# 2. Install Python packages
pip3 install -r requirements.txt

# 3. Install frontend packages
cd frontend && npm install && cd ..

# 4. Start the app
python3 start_app.py

# 5. In another terminal, start cloudflared tunnel
python3 start_cloudflare_tunnel.py
```

That's it! Your app is now accessible via the cloudflared URL.

---

## Full Setup Instructions

### Step 1: Install Prerequisites

**Python 3.10+**
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install python3 python3-pip python3-venv

# Fedora/RHEL
sudo dnf install python3 python3-pip

# Arch Linux
sudo pacman -S python python-pip
```

**Node.js 18+**
```bash
# Using NodeSource (recommended)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Or using snap
sudo snap install node --classic

# Or using nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18
```

**Verify:**
```bash
python3 --version  # Should be 3.10+
node --version     # Should be 18+
npm --version
```

### Step 2: Restore Your Data

If you're migrating from Windows, restore your backup:

```bash
# Navigate to project directory
cd daily-wellness-scheduler

# Restore data directory from USB backup
cp -r /path/to/usb/backup_data_*/data ./

# Restore users.json
cp /path/to/usb/backup_data_*/users.json ./

# Fix permissions (important!)
chmod -R 755 data/
chmod 644 users.json
```

See [BACKUP_MIGRATION_GUIDE.md](BACKUP_MIGRATION_GUIDE.md) for detailed migration steps.

### Step 3: Install Dependencies

**Backend (Python):**
```bash
# Option 1: Global install
pip3 install -r requirements.txt

# Option 2: Virtual environment (recommended)
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

**Frontend (Node.js):**
```bash
cd frontend
npm install
cd ..
```

### Step 4: Start the Application

**Option 1: Using the Launcher Script (Easiest)**
```bash
python3 start_app.py
```

This automatically:
- Starts backend on `http://localhost:8000`
- Starts frontend on `http://localhost:3000`
- Opens browser (if available)

**Option 2: Manual Start (Two Terminals)**

Terminal 1 (Backend):
```bash
python3 -m backend.main
```

Terminal 2 (Frontend):
```bash
cd frontend
npm run dev -- --webpack
```

**Verify it's running:**
- Open browser: `http://localhost:3000`
- Backend API: `http://localhost:8000`

---

## Setting Up Cloudflared Tunnel (For Hosting)

Cloudflared creates a public URL so you can access your app from anywhere (phone, other computers, etc.).

### Step 1: Install Cloudflared

```bash
# Method 1: Using package manager (Ubuntu/Debian)
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb

# Method 2: Download binary directly
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
chmod +x cloudflared-linux-amd64
sudo mv cloudflared-linux-amd64 /usr/local/bin/cloudflared

# Verify installation
cloudflared --version
```

### Step 2: Start Your App First

**Important:** The app must be running before starting the tunnel!

```bash
# Start the app in one terminal
python3 start_app.py

# Wait until you see:
# ✅ App is running!
# Backend: http://localhost:8000
# Frontend: http://localhost:3000
```

### Step 3: Start Cloudflared Tunnel

**In a NEW terminal window:**

```bash
# Option 1: Using the tunnel script (Easiest)
python3 start_cloudflare_tunnel.py

# Option 2: Manual command
cloudflared tunnel --url http://localhost:3000
```

**What you'll see:**
```
✅ TUNNEL CREATED SUCCESSFULLY!
🌍 Public URL: https://xxxx-xxxx.trycloudflare.com
```

**Copy that URL!** That's your public access URL.

### Step 4: Access Your App

- **On Linux**: Use the cloudflared URL in any browser
- **On Phone**: Use the cloudflared URL in mobile browser
- **On Other Computers**: Use the cloudflared URL

The URL works as long as:
- The app is running (`python3 start_app.py`)
- The tunnel is running (`python3 start_cloudflare_tunnel.py`)

---

## Running Both Services (Production Setup)

### Option 1: Two Separate Terminals

**Terminal 1 - App:**
```bash
python3 start_app.py
```

**Terminal 2 - Tunnel:**
```bash
python3 start_cloudflare_tunnel.py
```

### Option 2: Using Screen/Tmux (Keeps Running After Disconnect)

**Install screen:**
```bash
sudo apt install screen
```

**Start app in screen:**
```bash
screen -S wellness-app
python3 start_app.py
# Press Ctrl+A then D to detach
```

**Start tunnel in another screen:**
```bash
screen -S wellness-tunnel
python3 start_cloudflare_tunnel.py
# Press Ctrl+A then D to detach
```

**Reattach later:**
```bash
screen -r wellness-app    # Reattach app
screen -r wellness-tunnel # Reattach tunnel
```

### Option 3: Using Systemd Services (Professional Hosting)

This makes the app and tunnel start automatically on boot and keep running.

**Create app service:**
```bash
sudo nano /etc/systemd/system/wellness-app.service
```

Add this:
```ini
[Unit]
Description=Daily Wellness Scheduler App
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/path/to/daily-wellness-scheduler
ExecStart=/usr/bin/python3 start_app.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Create tunnel service:**
```bash
sudo nano /etc/systemd/system/wellness-tunnel.service
```

Add this:
```ini
[Unit]
Description=Cloudflare Tunnel for Wellness App
After=network.target wellness-app.service
Requires=wellness-app.service

[Service]
Type=simple
User=your-username
WorkingDirectory=/path/to/daily-wellness-scheduler
ExecStart=/usr/local/bin/cloudflared tunnel --url http://localhost:3000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Enable and start services:**
```bash
# Replace /path/to/daily-wellness-scheduler and your-username above first!

sudo systemctl daemon-reload
sudo systemctl enable wellness-app
sudo systemctl enable wellness-tunnel
sudo systemctl start wellness-app
sudo systemctl start wellness-tunnel

# Check status
sudo systemctl status wellness-app
sudo systemctl status wellness-tunnel

# View logs
sudo journalctl -u wellness-app -f
sudo journalctl -u wellness-tunnel -f
```

---

## Troubleshooting

### App Won't Start

**Problem:** `python3: command not found`
```bash
# Install Python
sudo apt install python3 python3-pip
```

**Problem:** `ModuleNotFoundError`
```bash
# Install dependencies
pip3 install -r requirements.txt
```

**Problem:** Port 3000 or 8000 already in use
```bash
# Find what's using the port
sudo lsof -i :3000
sudo lsof -i :8000

# Kill the process (replace PID)
kill -9 <PID>
```

### Cloudflared Won't Start

**Problem:** `cloudflared: command not found`
```bash
# Install cloudflared (see Step 1 above)
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
chmod +x cloudflared-linux-amd64
sudo mv cloudflared-linux-amd64 /usr/local/bin/cloudflared
```

**Problem:** "Connection refused" or can't connect to localhost:3000
- Make sure the app is running first
- Wait a few seconds after starting the app
- Check the app is actually on port 3000: `curl http://localhost:3000`

**Problem:** Tunnel URL doesn't work
- Make sure BOTH app and tunnel are running
- Check tunnel logs for errors
- Try restarting both services

### Permission Errors

**Problem:** Can't write to `data/` directory
```bash
# Fix permissions
chmod -R 755 data/
chmod 644 users.json
```

**Problem:** Can't start services as systemd
- Make sure you replaced `/path/to/daily-wellness-scheduler` with actual path
- Make sure you replaced `your-username` with your actual username
- Check file paths exist

---

## Production Hosting Tips

### 1. Use a Permanent Tunnel (Advanced)

The free tunnel URLs change each time. For a permanent URL:

1. Create Cloudflare account (free)
2. Create a named tunnel
3. Configure it in `~/.cloudflared/config.yml`
4. Run: `cloudflared tunnel run <tunnel-name>`

See: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/tunnel-guide/

### 2. Use Reverse Proxy (Nginx/Caddy)

Instead of cloudflared, you can use:
- **Nginx** with SSL certificate (Let's Encrypt)
- **Caddy** (automatic SSL)
- Point domain to your server

### 3. Keep It Running

- Use systemd (see Option 3 above)
- Use PM2 for Node.js processes
- Use supervisor for Python processes

### 4. Monitor Logs

```bash
# App logs
tail -f /path/to/app.log

# Systemd logs
sudo journalctl -u wellness-app -f
```

---

## Quick Reference Commands

```bash
# Start app
python3 start_app.py

# Start tunnel
python3 start_cloudflare_tunnel.py

# Stop app/tunnel
Ctrl+C (in the terminal running it)

# Check if app is running
curl http://localhost:3000

# Check if backend is running
curl http://localhost:8000

# Find process using port
sudo lsof -i :3000
sudo lsof -i :8000

# Fix permissions
chmod -R 755 data/
```

---

## Next Steps

- ✅ App running on Linux
- ✅ Tunnel running for public access
- 📖 See [SETUP_GUIDE.md](SETUP_GUIDE.md) for food database setup
- 📖 See [BACKUP_MIGRATION_GUIDE.md](BACKUP_MIGRATION_GUIDE.md) for data migration
- 📖 See [README.md](README.md) for full documentation

Good luck! 🚀
