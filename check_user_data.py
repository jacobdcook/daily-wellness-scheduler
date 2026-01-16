#!/usr/bin/env python3
"""
Check if user data exists and show what's there
"""
import os
import json
import sys

BASE_DATA_DIR = "data"

def check_user_data(user_id: str):
    """Check if user data exists"""
    safe_id = "".join(c for c in user_id if c.isalnum() or c in ('-', '_', '@', '.'))
    user_dir = os.path.join(BASE_DATA_DIR, safe_id)
    
    print(f"Checking data for user: {user_id}")
    print(f"User directory: {user_dir}")
    print(f"Directory exists: {os.path.exists(user_dir)}\n")
    
    if not os.path.exists(user_dir):
        print("❌ User directory does not exist!")
        print("   This means the user has no data stored yet.")
        return False
    
    files_to_check = {
        "schedule.json": "Schedule",
        "tasks.json": "Tasks",
        "settings.json": "Settings",
        "progress.json": "Progress",
        "recurring_patterns.json": "Recurring Patterns"
    }
    
    found_any = False
    for filename, label in files_to_check.items():
        filepath = os.path.join(user_dir, filename)
        exists = os.path.exists(filepath)
        size = 0
        if exists:
            size = os.path.getsize(filepath)
            try:
                with open(filepath, 'r') as f:
                    data = json.load(f)
                    if isinstance(data, dict):
                        count = len(data)
                    elif isinstance(data, list):
                        count = len(data)
                    else:
                        count = 1
                    print(f"✅ {label}: EXISTS ({size} bytes, {count} items)")
                    found_any = True
            except Exception as e:
                print(f"⚠️  {label}: EXISTS but ERROR reading: {e}")
        else:
            print(f"❌ {label}: NOT FOUND")
    
    if not found_any:
        print("\n❌ No data files found for this user!")
        print("   The schedule and tasks may have been lost or never created.")
    else:
        print("\n✅ Some data files exist. The data should be recoverable.")
    
    return found_any

if __name__ == "__main__":
    user_id = sys.argv[1] if len(sys.argv) > 1 else "jacob@jacob.jacob"
    check_user_data(user_id)

