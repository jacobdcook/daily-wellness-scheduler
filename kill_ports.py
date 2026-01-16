#!/usr/bin/env python3
"""
Kill processes running on ports 8000 and 3000/3001
"""
import subprocess
import sys
import os

def kill_port(port):
    """Kill process running on a specific port"""
    try:
        if os.name == 'nt':  # Windows
            # Find process using the port
            result = subprocess.run(
                ['netstat', '-ano'],
                capture_output=True,
                text=True,
                check=True
            )
            
            # Find the PID for the port
            lines = result.stdout.split('\n')
            pid = None
            for line in lines:
                if f':{port}' in line and 'LISTENING' in line:
                    parts = line.split()
                    if len(parts) > 4:
                        pid = parts[-1]
                        break
            
            if pid:
                print(f"Killing process {pid} on port {port}...")
                subprocess.run(['taskkill', '/F', '/PID', pid], check=True)
                print(f"✅ Port {port} is now free")
                return True
            else:
                print(f"ℹ️  No process found on port {port}")
                return False
        else:  # Linux/Mac
            result = subprocess.run(
                ['lsof', '-ti', f':{port}'],
                capture_output=True,
                text=True
            )
            if result.stdout.strip():
                pid = result.stdout.strip()
                print(f"Killing process {pid} on port {port}...")
                subprocess.run(['kill', '-9', pid], check=True)
                print(f"✅ Port {port} is now free")
                return True
            else:
                print(f"ℹ️  No process found on port {port}")
                return False
    except subprocess.CalledProcessError as e:
        print(f"❌ Error killing port {port}: {e}")
        return False
    except FileNotFoundError:
        print(f"❌ Required command not found. Make sure you're on Windows with netstat/taskkill available.")
        return False

def main():
    ports = [8000, 3000, 3001]
    killed_any = False
    
    print("🔍 Checking for processes on ports 8000, 3000, and 3001...\n")
    
    for port in ports:
        if kill_port(port):
            killed_any = True
        print()
    
    if killed_any:
        print("✅ Done! Ports should now be free.")
    else:
        print("ℹ️  No processes were running on those ports.")
    
    return 0 if killed_any or True else 1

if __name__ == "__main__":
    sys.exit(main())

