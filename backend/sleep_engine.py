"""
Sleep Engine - Track sleep duration, quality, and patterns
"""
import json
import os
from datetime import datetime, date, timedelta, time
from typing import Dict, List, Optional, Any
from pydantic import BaseModel

class SleepEntry(BaseModel):
    """Sleep entry for a specific night"""
    id: str
    date: str  # Date of the night (YYYY-MM-DD) - represents the night starting on this date
    bedtime: str  # HH:MM format
    wake_time: str  # HH:MM format
    sleep_duration_hours: float  # Calculated duration
    quality_rating: int  # 1-5 stars
    notes: Optional[str] = None
    timestamp: str  # ISO format datetime when entry was created/updated

class SleepSettings(BaseModel):
    """User sleep preferences"""
    target_sleep_hours: float = 8.0
    bedtime_reminder_enabled: bool = False
    bedtime_reminder_time: str = "22:00"  # HH:MM
    wake_reminder_enabled: bool = False
    wake_reminder_time: str = "07:00"  # HH:MM

def get_sleep_entries_filepath(user_id: str) -> str:
    """Get filepath for user's sleep entries"""
    user_dir = os.path.join("data", user_id)
    os.makedirs(user_dir, exist_ok=True)
    return os.path.join(user_dir, "sleep_entries.json")

def get_sleep_settings_filepath(user_id: str) -> str:
    """Get filepath for user's sleep settings"""
    user_dir = os.path.join("data", user_id)
    os.makedirs(user_dir, exist_ok=True)
    return os.path.join(user_dir, "sleep_settings.json")

def load_sleep_entries(user_id: str, days: int = 30) -> List[Dict[str, Any]]:
    """Load sleep entries for a user, filtered by date range"""
    filepath = get_sleep_entries_filepath(user_id)
    
    if not os.path.exists(filepath):
        return []
    
    try:
        with open(filepath, "r") as f:
            all_entries = json.load(f)
        
        # Filter by date range
        cutoff_date = date.today() - timedelta(days=days)
        filtered_entries = []
        for entry in all_entries:
            try:
                entry_date_str = entry.get("date", "")
                if "T" in entry_date_str:
                    entry_date = datetime.fromisoformat(entry_date_str).date()
                else:
                    entry_date = datetime.strptime(entry_date_str, "%Y-%m-%d").date()
                if entry_date >= cutoff_date:
                    filtered_entries.append(entry)
            except Exception as e:
                print(f"Error parsing date for sleep entry: {e}")
                continue
        
        # Sort by date (newest first)
        filtered_entries.sort(key=lambda x: x.get("date", ""), reverse=True)
        return filtered_entries
    except Exception as e:
        print(f"Error loading sleep entries for {user_id}: {e}")
        return []

def save_sleep_entry(user_id: str, entry: SleepEntry) -> bool:
    """Save a sleep entry"""
    filepath = get_sleep_entries_filepath(user_id)
    
    # Load existing entries
    existing_entries = load_sleep_entries(user_id, days=365*10)  # Load all
    
    # Check if entry for this date already exists
    for i, e in enumerate(existing_entries):
        if e.get("date") == entry.date:
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
        print(f"Error saving sleep entry for {user_id}: {e}")
        return False

def delete_sleep_entry(user_id: str, entry_id: str) -> bool:
    """Delete a sleep entry"""
    filepath = get_sleep_entries_filepath(user_id)
    
    if not os.path.exists(filepath):
        return False
    
    try:
        with open(filepath, "r") as f:
            entries = json.load(f)
        
        # Remove entry with matching ID
        entries = [e for e in entries if e.get("id") != entry_id]
        
        with open(filepath, "w") as f:
            json.dump(entries, f, indent=2)
        return True
    except Exception as e:
        print(f"Error deleting sleep entry for {user_id}: {e}")
        return False

def calculate_sleep_duration(bedtime: str, wake_time: str) -> float:
    """Calculate sleep duration in hours from bedtime and wake time"""
    try:
        # Parse times
        bed_hour, bed_min = map(int, bedtime.split(":"))
        wake_hour, wake_min = map(int, wake_time.split(":"))
        
        bed_time_obj = time(bed_hour, bed_min)
        wake_time_obj = time(wake_hour, wake_min)
        
        # Convert to datetime for calculation (using today as reference)
        bed_dt = datetime.combine(date.today(), bed_time_obj)
        wake_dt = datetime.combine(date.today(), wake_time_obj)
        
        # If wake time is earlier than bedtime, assume it's the next day
        if wake_dt <= bed_dt:
            wake_dt += timedelta(days=1)
        
        # Calculate duration
        duration = wake_dt - bed_dt
        return duration.total_seconds() / 3600.0  # Convert to hours
    except Exception as e:
        print(f"Error calculating sleep duration: {e}")
        return 0.0

def get_sleep_stats(user_id: str, days: int = 30) -> Dict[str, Any]:
    """Get sleep statistics"""
    entries = load_sleep_entries(user_id, days=days)
    
    if not entries:
        return {
            "total_nights": 0,
            "average_duration": None,
            "average_quality": None,
            "total_hours": 0,
            "best_quality_night": None,
            "longest_sleep": None,
            "shortest_sleep": None,
            "consistency_score": None
        }
    
    durations = [float(e.get("sleep_duration_hours", 0)) for e in entries if e.get("sleep_duration_hours")]
    qualities = [int(e.get("quality_rating", 0)) for e in entries if e.get("quality_rating")]
    
    # Calculate consistency (standard deviation of sleep duration)
    consistency_score = None
    if len(durations) > 1:
        avg_duration = sum(durations) / len(durations)
        variance = sum((d - avg_duration) ** 2 for d in durations) / len(durations)
        std_dev = variance ** 0.5
        # Consistency score: lower std_dev = higher consistency (scale 0-100)
        consistency_score = max(0, 100 - (std_dev * 10))
    
    # Find best quality night
    best_quality_night = None
    if qualities:
        max_quality = max(qualities)
        best_quality_night = next((e for e in entries if e.get("quality_rating") == max_quality), None)
    
    # Find longest and shortest sleep
    longest_sleep = None
    shortest_sleep = None
    if durations:
        max_duration = max(durations)
        min_duration = min(durations)
        longest_sleep = next((e for e in entries if abs(e.get("sleep_duration_hours", 0) - max_duration) < 0.1), None)
        shortest_sleep = next((e for e in entries if abs(e.get("sleep_duration_hours", 0) - min_duration) < 0.1), None)
    
    return {
        "total_nights": len(entries),
        "average_duration": sum(durations) / len(durations) if durations else None,
        "average_quality": sum(qualities) / len(qualities) if qualities else None,
        "total_hours": sum(durations),
        "best_quality_night": best_quality_night,
        "longest_sleep": longest_sleep,
        "shortest_sleep": shortest_sleep,
        "consistency_score": round(consistency_score, 1) if consistency_score is not None else None
    }

def load_sleep_settings(user_id: str) -> SleepSettings:
    """Load user's sleep settings"""
    filepath = get_sleep_settings_filepath(user_id)
    
    if os.path.exists(filepath):
        try:
            with open(filepath, "r") as f:
                data = json.load(f)
                return SleepSettings(**data)
        except Exception as e:
            print(f"Error loading sleep settings for {user_id}: {e}")
    
    return SleepSettings()

def save_sleep_settings(user_id: str, settings: SleepSettings):
    """Save user's sleep settings"""
    filepath = get_sleep_settings_filepath(user_id)
    
    try:
        with open(filepath, "w") as f:
            json.dump(settings.model_dump(), f, indent=2)
    except Exception as e:
        print(f"Error saving sleep settings for {user_id}: {e}")

