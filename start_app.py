import subprocess
import time
import webbrowser
import os
import sys

def main():
    print("🚀 Starting Daily Wellness Scheduler Web App...")
    
    # Get current directory
    cwd = os.getcwd()
    
    # Start Backend
    print("Starting Backend (FastAPI)...")
    backend_process = subprocess.Popen(
        [sys.executable, "-m", "backend.main"],
        cwd=cwd,
        shell=True
    )
    
    # Start Frontend
    print("Starting Frontend (Next.js)...")
    frontend_cwd = os.path.join(cwd, "frontend")
    
    # Use 'npm.cmd' on Windows
    npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
    
    frontend_process = subprocess.Popen(
        [npm_cmd, "run", "dev"],
        cwd=frontend_cwd,
        shell=True
    )
    
    print("\nWaiting for servers to start...")
    time.sleep(5)
    
    print("Opening browser...")
    webbrowser.open("http://localhost:3000")
    
    print("\n✅ App is running!")
    print("Press Ctrl+C to stop both servers.")
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nStopping servers...")
        backend_process.terminate()
        frontend_process.terminate()
        sys.exit(0)

if __name__ == "__main__":
    main()
