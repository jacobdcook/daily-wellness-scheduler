"""
Habits Engine - Track daily habits, streaks, and completion rates
"""
import json
import os
from datetime import datetime, date, timedelta
from typing import Dict, List, Optional, Any
from pydantic import BaseModel

class Habit(BaseModel):
    """Habit definition"""
    id: str
    name: str
    description: Optional[str] = None
    color: str = "#3B82F6"  # Default blue
    icon: Optional[str] = None
    reminder_time: Optional[str] = None  # HH:MM format
    reminder_enabled: bool = False
    created_at: str
    enabled: bool = True

class HabitEntry(BaseModel):
    """Daily habit completion entry"""
    id: str
    habit_id: str
    date: str  # YYYY-MM-DD format
    completed: bool
    notes: Optional[str] = None
    timestamp: str  # ISO format datetime

class HabitStats(BaseModel):
    """Statistics for a habit"""
    habit_id: str
    total_days: int
    completed_days: int
    completion_rate: float
    current_streak: int
    longest_streak: int
    last_completed: Optional[str] = None

def get_habits_filepath(user_id: str) -> str:
    """Get filepath for user's habits"""
    user_dir = os.path.join("data", user_id)
    os.makedirs(user_dir, exist_ok=True)
    return os.path.join(user_dir, "habits.json")

def get_habit_entries_filepath(user_id: str) -> str:
    """Get filepath for user's habit entries"""
    user_dir = os.path.join("data", user_id)
    os.makedirs(user_dir, exist_ok=True)
    return os.path.join(user_dir, "habit_entries.json")

def load_habits(user_id: str) -> List[Dict[str, Any]]:
    """Load all habits for a user"""
    filepath = get_habits_filepath(user_id)
    
    if not os.path.exists(filepath):
        return []
    
    try:
        with open(filepath, "r") as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading habits for {user_id}: {e}")
        return []

def save_habits(user_id: str, habits: List[Dict[str, Any]]):
    """Save habits list"""
    filepath = get_habits_filepath(user_id)
    
    try:
        with open(filepath, "w") as f:
            json.dump(habits, f, indent=2)
    except Exception as e:
        print(f"Error saving habits for {user_id}: {e}")

def load_habit_entries(user_id: str, habit_id: Optional[str] = None, days: int = 90) -> List[Dict[str, Any]]:
    """Load habit entries, optionally filtered by habit_id and date range"""
    filepath = get_habit_entries_filepath(user_id)
    
    if not os.path.exists(filepath):
        return []
    
    try:
        with open(filepath, "r") as f:
            all_entries = json.load(f)
        
        # Filter by habit_id if specified
        if habit_id:
            all_entries = [e for e in all_entries if e.get("habit_id") == habit_id]
        
        # Filter by date range
        cutoff_date = date.today() - timedelta(days=days)
        filtered_entries = []
        for entry in all_entries:
            try:
                entry_date_str = entry.get("date", "")
                # Handle both ISO format (with time) and date-only format
                if "T" in entry_date_str:
                    entry_date = datetime.fromisoformat(entry_date_str).date()
                else:
                    entry_date = datetime.strptime(entry_date_str, "%Y-%m-%d").date()
                if entry_date >= cutoff_date:
                    filtered_entries.append(entry)
            except Exception as e:
                print(f"Error parsing date for entry: {e}")
                continue
        
        # Sort by date (newest first)
        filtered_entries.sort(key=lambda x: x.get("date", ""), reverse=True)
        return filtered_entries
    except Exception as e:
        print(f"Error loading habit entries for {user_id}: {e}")
        return []

def save_habit_entry(user_id: str, entry: HabitEntry) -> bool:
    """Save a habit entry"""
    filepath = get_habit_entries_filepath(user_id)
    
    # Load existing entries
    existing_entries = load_habit_entries(user_id, days=365*10)  # Load all
    
    # Check if entry for this habit and date already exists
    for i, e in enumerate(existing_entries):
        if e.get("habit_id") == entry.habit_id and e.get("date") == entry.date:
            # Update existing entry
            existing_entries[i] = entry.model_dump()
            break
    else:
        # Add new entry
        existing_entries.append(entry.model_dump())
    
    # Save back
    try:
        with open(filepath, "w") as f:
            json.dump(existing_entries, f, indent=2)
        return True
    except Exception as e:
        print(f"Error saving habit entry for {user_id}: {e}")
        return False

def calculate_habit_stats(user_id: str, habit_id: str, days: int = 90) -> Dict[str, Any]:
    """Calculate statistics for a habit"""
    entries = load_habit_entries(user_id, habit_id=habit_id, days=days)
    
    if not entries:
        return {
            "habit_id": habit_id,
            "total_days": 0,
            "completed_days": 0,
            "completion_rate": 0.0,
            "current_streak": 0,
            "longest_streak": 0,
            "last_completed": None
        }
    
    # Sort entries by date (oldest first for streak calculation)
    entries.sort(key=lambda x: x.get("date", ""))
    
    completed_entries = [e for e in entries if e.get("completed", False)]
    total_days = len(entries)
    completed_days = len(completed_entries)
    completion_rate = (completed_days / total_days * 100) if total_days > 0 else 0.0
    
    # Calculate current streak (from today backwards)
    current_streak = 0
    today = date.today()
    check_date = today
    
    # Check if today is completed
    today_str = today.isoformat()
    today_entry = next((e for e in entries if e.get("date") == today_str), None)
    
    if today_entry and today_entry.get("completed"):
        current_streak = 1
        check_date = today - timedelta(days=1)
        
        # Count backwards
        while True:
            check_date_str = check_date.isoformat()
            check_entry = next((e for e in entries if e.get("date") == check_date_str), None)
            if check_entry and check_entry.get("completed"):
                current_streak += 1
                check_date -= timedelta(days=1)
            else:
                break
    else:
        # Check backwards from yesterday
        check_date = today - timedelta(days=1)
        while True:
            check_date_str = check_date.isoformat()
            check_entry = next((e for e in entries if e.get("date") == check_date_str), None)
            if check_entry and check_entry.get("completed"):
                current_streak += 1
                check_date -= timedelta(days=1)
            else:
                break
    
    # Calculate longest streak
    longest_streak = 0
    temp_streak = 0
    for entry in entries:
        if entry.get("completed", False):
            temp_streak += 1
            longest_streak = max(longest_streak, temp_streak)
        else:
            temp_streak = 0
    
    # Get last completed date
    last_completed = None
    if completed_entries:
        last_completed = completed_entries[-1].get("date")
    
    return {
        "habit_id": habit_id,
        "total_days": total_days,
        "completed_days": completed_days,
        "completion_rate": round(completion_rate, 1),
        "current_streak": current_streak,
        "longest_streak": longest_streak,
        "last_completed": last_completed
    }

def get_today_habits_status(user_id: str) -> Dict[str, bool]:
    """Get today's completion status for all habits"""
    today_str = date.today().isoformat()
    entries = load_habit_entries(user_id, days=1)
    
    today_entries = {e.get("habit_id"): e.get("completed", False) for e in entries if e.get("date") == today_str}
    return today_entries

