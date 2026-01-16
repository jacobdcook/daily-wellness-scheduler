"""
Weight Tracking Engine - Track weight, calculate TDEE/BMR, manage weight goals
"""
import json
import os
from datetime import datetime, date, timedelta
from typing import Dict, List, Optional, Any
from pydantic import BaseModel

class WeightEntry(BaseModel):
    """Weight entry"""
    id: str
    user_id: str
    date: str  # YYYY-MM-DD format
    weight_kg: float
    weight_lbs: Optional[float] = None  # Calculated from kg
    body_fat_percent: Optional[float] = None
    notes: Optional[str] = None
    timestamp: str  # ISO format datetime

class WeightGoal(BaseModel):
    """User's weight goal"""
    user_id: str
    goal_type: str  # "lose", "maintain", "gain"
    current_weight_kg: float
    target_weight_kg: Optional[float] = None
    target_date: Optional[str] = None  # YYYY-MM-DD
    weekly_change_kg: Optional[float] = None  # e.g., -0.5 for losing 0.5kg/week
    activity_level: str = "moderate"  # sedentary, light, moderate, active, very_active
    gender: str = "male"  # male, female
    age: int = 30
    height_cm: float = 170.0
    updated_at: str

def get_weight_entries_filepath(user_id: str) -> str:
    """Get filepath for user's weight entries"""
    user_dir = os.path.join("data", user_id)
    os.makedirs(user_dir, exist_ok=True)
    return os.path.join(user_dir, "weight_entries.json")

def get_weight_goals_filepath(user_id: str) -> str:
    """Get filepath for user's weight goals"""
    user_dir = os.path.join("data", user_id)
    os.makedirs(user_dir, exist_ok=True)
    return os.path.join(user_dir, "weight_goals.json")

def load_weight_entries(user_id: str, days: int = 365) -> List[Dict[str, Any]]:
    """Load weight entries"""
    filepath = get_weight_entries_filepath(user_id)
    
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
                print(f"Error parsing date for weight entry: {e}")
                continue
        
        # Sort by date (newest first)
        filtered_entries.sort(key=lambda x: x.get("date", ""), reverse=True)
        return filtered_entries
    except Exception as e:
        print(f"Error loading weight entries for {user_id}: {e}")
        return []

def save_weight_entry(user_id: str, entry: WeightEntry) -> bool:
    """Save a weight entry"""
    filepath = get_weight_entries_filepath(user_id)
    
    # Load existing entries
    existing_entries = load_weight_entries(user_id, days=365*10)  # Load all
    
    # Check if entry with this ID already exists
    for i, e in enumerate(existing_entries):
        if e.get("id") == entry.id:
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
        print(f"Error saving weight entry for {user_id}: {e}")
        return False

def delete_weight_entry(user_id: str, entry_id: str) -> bool:
    """Delete a weight entry"""
    filepath = get_weight_entries_filepath(user_id)
    
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
        print(f"Error deleting weight entry for {user_id}: {e}")
        return False

def calculate_bmr(weight_kg: float, height_cm: float, age: int, gender: str) -> float:
    """Calculate Basal Metabolic Rate using Mifflin-St Jeor Equation"""
    if gender.lower() == "male":
        bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age + 5
    else:  # female
        bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age - 161
    return bmr

def calculate_tdee(bmr: float, activity_level: str) -> float:
    """Calculate Total Daily Energy Expenditure"""
    activity_multipliers = {
        "sedentary": 1.2,      # Little or no exercise
        "light": 1.375,        # Light exercise 1-3 days/week
        "moderate": 1.55,      # Moderate exercise 3-5 days/week
        "active": 1.725,       # Hard exercise 6-7 days/week
        "very_active": 1.9     # Very hard exercise, physical job
    }
    multiplier = activity_multipliers.get(activity_level.lower(), 1.55)
    return bmr * multiplier

def calculate_calorie_target(goal: Dict[str, Any], current_weight_kg: float) -> Dict[str, Any]:
    """Calculate calorie target based on weight goal"""
    height_cm = goal.get("height_cm", 170.0)
    age = goal.get("age", 30)
    gender = goal.get("gender", "male")
    activity_level = goal.get("activity_level", "moderate")
    goal_type = goal.get("goal_type", "maintain")
    
    # Calculate BMR and TDEE
    bmr = calculate_bmr(current_weight_kg, height_cm, age, gender)
    tdee = calculate_tdee(bmr, activity_level)
    
    # Adjust based on goal
    weekly_change_kg = goal.get("weekly_change_kg")
    if weekly_change_kg is None:
        # Default weekly changes
        if goal_type == "lose":
            weekly_change_kg = -0.5  # Lose 0.5kg per week
        elif goal_type == "gain":
            weekly_change_kg = 0.25  # Gain 0.25kg per week
        else:  # maintain
            weekly_change_kg = 0.0
    
    # 1kg = ~7700 calories, so weekly change in calories = weekly_change_kg * 7700
    # Daily adjustment = weekly_change / 7
    daily_adjustment = (weekly_change_kg * 7700) / 7
    target_calories = tdee + daily_adjustment
    
    return {
        "bmr": round(bmr, 1),
        "tdee": round(tdee, 1),
        "target_calories": round(target_calories, 1),
        "weekly_change_kg": weekly_change_kg,
        "daily_adjustment": round(daily_adjustment, 1)
    }

def load_weight_goals(user_id: str) -> Optional[Dict[str, Any]]:
    """Load user's weight goals"""
    filepath = get_weight_goals_filepath(user_id)
    
    if os.path.exists(filepath):
        try:
            with open(filepath, "r") as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading weight goals for {user_id}: {e}")
    
    return None

def save_weight_goals(user_id: str, goals: Dict[str, Any]) -> bool:
    """Save user's weight goals"""
    filepath = get_weight_goals_filepath(user_id)
    
    # Add updated_at timestamp
    goals["updated_at"] = datetime.now().isoformat()
    goals["user_id"] = user_id
    
    try:
        with open(filepath, "w") as f:
            json.dump(goals, f, indent=2)
        return True
    except Exception as e:
        print(f"Error saving weight goals for {user_id}: {e}")
        return False

def get_latest_weight(user_id: str) -> Optional[float]:
    """Get user's latest weight entry"""
    entries = load_weight_entries(user_id, days=365)
    if entries:
        return entries[0].get("weight_kg")
    return None

def get_weight_stats(user_id: str, days: int = 30) -> Dict[str, Any]:
    """Get weight statistics"""
    entries = load_weight_entries(user_id, days=days)
    
    if not entries:
        return {
            "entries_count": 0,
            "latest_weight": None,
            "weight_change": None,
            "average_weight": None,
            "trend": None
        }
    
    # Sort by date (oldest first for trend calculation)
    sorted_entries = sorted(entries, key=lambda x: x.get("date", ""))
    
    latest_weight = sorted_entries[-1].get("weight_kg")
    oldest_weight = sorted_entries[0].get("weight_kg")
    weight_change = latest_weight - oldest_weight if len(sorted_entries) > 1 else 0
    average_weight = sum(e.get("weight_kg", 0) for e in sorted_entries) / len(sorted_entries)
    
    # Determine trend
    if len(sorted_entries) >= 7:  # Need at least 7 entries for trend
        recent_avg = sum(e.get("weight_kg", 0) for e in sorted_entries[-7:]) / 7
        older_avg = sum(e.get("weight_kg", 0) for e in sorted_entries[:7]) / 7
        trend = "down" if recent_avg < older_avg else "up" if recent_avg > older_avg else "stable"
    else:
        trend = "stable"
    
    return {
        "entries_count": len(entries),
        "latest_weight": round(latest_weight, 1),
        "weight_change": round(weight_change, 1),
        "average_weight": round(average_weight, 1),
        "trend": trend
    }

