"""
Water Tracker Engine
Handles water intake tracking, goals, and reminders
"""
import json
import os
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional

def get_water_data_filepath(user_id: str) -> str:
    """Get path to water tracking data file"""
    user_dir = os.path.join("data", user_id)
    os.makedirs(user_dir, exist_ok=True)
    return os.path.join(user_dir, "water_tracker.json")

def load_water_settings(user_id: str) -> Dict[str, Any]:
    """Load user's water tracking settings"""
    filepath = get_water_data_filepath(user_id)
    if os.path.exists(filepath):
        try:
            with open(filepath, "r") as f:
                data = json.load(f)
                return data.get("settings", {})
        except:
            pass
    
    # Default settings
    return {
        "daily_goal_oz": 64,  # 8 cups = 64 oz
        "daily_goal_ml": 1920,  # ~2 liters
        "unit": "oz",  # "oz" or "ml"
        "reminders_enabled": True,
        "reminder_interval_hours": 2,  # Remind every 2 hours
        "reminder_start_time": "08:00",  # Start reminders at 8 AM
        "reminder_end_time": "20:00",  # End reminders at 8 PM
        "glass_size_oz": 8,  # Standard glass size
        "glass_size_ml": 240
    }

def save_water_settings(user_id: str, settings: Dict[str, Any]):
    """Save user's water tracking settings"""
    filepath = get_water_data_filepath(user_id)
    data = {}
    if os.path.exists(filepath):
        try:
            with open(filepath, "r") as f:
                data = json.load(f)
        except:
            pass
    
    data["settings"] = settings
    with open(filepath, "w") as f:
        json.dump(data, f, indent=2)

def load_water_intake(user_id: str, date: Optional[str] = None) -> Dict[str, Any]:
    """Load water intake for a specific date (defaults to today)"""
    if date is None:
        date = datetime.now().strftime("%Y-%m-%d")
    
    filepath = get_water_data_filepath(user_id)
    data = {}
    if os.path.exists(filepath):
        try:
            with open(filepath, "r") as f:
                data = json.load(f)
        except:
            pass
    
    intake_data = data.get("intake", {}).get(date, {
        "entries": [],
        "total_oz": 0.0,
        "total_ml": 0.0,
        "goal_met": False
    })
    
    return intake_data

def save_water_intake(user_id: str, amount: float, unit: str, date: Optional[str] = None):
    """Record water intake"""
    if date is None:
        date = datetime.now().strftime("%Y-%m-%d")
    
    filepath = get_water_data_filepath(user_id)
    data = {}
    if os.path.exists(filepath):
        try:
            with open(filepath, "r") as f:
                data = json.load(f)
        except:
            pass
    
    if "intake" not in data:
        data["intake"] = {}
    
    if date not in data["intake"]:
        data["intake"][date] = {
            "entries": [],
            "total_oz": 0.0,
            "total_ml": 0.0,
            "goal_met": False
        }
    
    # Convert to both units
    if unit == "oz":
        amount_oz = amount
        amount_ml = amount * 29.5735
    else:  # ml
        amount_ml = amount
        amount_oz = amount / 29.5735
    
    entry = {
        "amount_oz": round(amount_oz, 2),
        "amount_ml": round(amount_ml, 2),
        "unit": unit,
        "timestamp": datetime.now().isoformat(),
        "time": datetime.now().strftime("%H:%M")
    }
    
    data["intake"][date]["entries"].append(entry)
    data["intake"][date]["total_oz"] = round(data["intake"][date]["total_oz"] + amount_oz, 2)
    data["intake"][date]["total_ml"] = round(data["intake"][date]["total_ml"] + amount_ml, 2)
    
    # Check if goal is met
    settings = load_water_settings(user_id)
    goal = settings.get("daily_goal_oz", 64) if settings.get("unit") == "oz" else settings.get("daily_goal_ml", 1920)
    current = data["intake"][date]["total_oz"] if settings.get("unit") == "oz" else data["intake"][date]["total_ml"]
    data["intake"][date]["goal_met"] = current >= goal
    
    with open(filepath, "w") as f:
        json.dump(data, f, indent=2)
    
    return entry

def get_water_stats(user_id: str, days: int = 30) -> Dict[str, Any]:
    """Get water intake statistics"""
    filepath = get_water_data_filepath(user_id)
    data = {}
    if os.path.exists(filepath):
        try:
            with open(filepath, "r") as f:
                data = json.load(f)
        except:
            pass
    
    settings = load_water_settings(user_id)
    unit = settings.get("unit", "oz")
    goal = settings.get("daily_goal_oz", 64) if unit == "oz" else settings.get("daily_goal_ml", 1920)
    
    intake_data = data.get("intake", {})
    today = datetime.now().strftime("%Y-%m-%d")
    
    # Calculate stats
    total_days = 0
    goal_met_days = 0
    total_intake = 0.0
    current_streak = 0
    longest_streak = 0
    temp_streak = 0
    
    # Get dates in reverse chronological order
    dates = sorted(intake_data.keys(), reverse=True)
    
    for date_str in dates[:days]:
        day_data = intake_data[date_str]
        total = day_data["total_oz"] if unit == "oz" else day_data["total_ml"]
        
        if total > 0:
            total_days += 1
            total_intake += total
            
            if day_data["goal_met"]:
                goal_met_days += 1
                temp_streak += 1
                longest_streak = max(longest_streak, temp_streak)
            else:
                temp_streak = 0
    
    # Calculate current streak (consecutive days with goal met, starting from today)
    for date_str in sorted(intake_data.keys(), reverse=True):
        if date_str > today:
            continue
        day_data = intake_data.get(date_str, {})
        if day_data.get("goal_met", False):
            current_streak += 1
        else:
            break
    
    avg_daily = total_intake / total_days if total_days > 0 else 0.0
    goal_completion_rate = (goal_met_days / total_days * 100) if total_days > 0 else 0.0
    
    return {
        "total_days_tracked": total_days,
        "goal_met_days": goal_met_days,
        "goal_completion_rate": round(goal_completion_rate, 1),
        "average_daily_intake": round(avg_daily, 2),
        "current_streak": current_streak,
        "longest_streak": longest_streak,
        "daily_goal": goal,
        "unit": unit
    }

def get_next_water_reminder_time(user_id: str) -> Optional[str]:
    """Calculate the next time a water reminder should be sent"""
    settings = load_water_settings(user_id)
    
    if not settings.get("reminders_enabled", True):
        return None
    
    now = datetime.now()
    start_time_str = settings.get("reminder_start_time", "08:00")
    end_time_str = settings.get("reminder_end_time", "20:00")
    interval_hours = settings.get("reminder_interval_hours", 2)
    
    # Parse start and end times
    start_hour, start_min = map(int, start_time_str.split(":"))
    end_hour, end_min = map(int, end_time_str.split(":"))
    
    start_time = now.replace(hour=start_hour, minute=start_min, second=0, microsecond=0)
    end_time = now.replace(hour=end_hour, minute=end_min, second=0, microsecond=0)
    
    # If we're before start time today, first reminder is at start time
    if now < start_time:
        return start_time.isoformat()
    
    # If we're after end time, first reminder is at start time tomorrow
    if now >= end_time:
        return (start_time + timedelta(days=1)).isoformat()
    
    # Calculate next reminder time
    # Find how many intervals have passed since start time
    elapsed = now - start_time
    intervals_passed = int(elapsed.total_seconds() / (interval_hours * 3600))
    next_reminder = start_time + timedelta(hours=(intervals_passed + 1) * interval_hours)
    
    # If next reminder is after end time, move to tomorrow
    if next_reminder > end_time:
        next_reminder = start_time + timedelta(days=1)
    
    return next_reminder.isoformat()

