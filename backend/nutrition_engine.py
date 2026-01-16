"""
Nutrition Engine - Track calories, macros, and food intake
Phase 32: Core Nutrition Tracking
"""
import json
import os
from datetime import datetime, date, timedelta
from typing import Dict, List, Optional, Any
from pydantic import BaseModel

class FoodItem(BaseModel):
    """Food item from nutrition database"""
    id: str  # External API food ID (e.g., Nutritionix nix_item_id)
    name: str
    brand: Optional[str] = None
    barcode: Optional[str] = None
    serving_size: str  # e.g., "1 medium", "100g"
    serving_weight_grams: Optional[float] = None
    calories: float  # per serving
    protein: float  # grams per serving
    carbs: float  # grams per serving
    fats: float  # grams per serving
    fiber: Optional[float] = None
    sugar: Optional[float] = None
    sodium: Optional[float] = None
    source: str = "nutritionix"  # API source

class FoodEntry(BaseModel):
    """Food entry logged by user"""
    id: str
    user_id: str
    date: str  # YYYY-MM-DD format
    meal_type: str  # breakfast, lunch, dinner, snack
    food_item: FoodItem
    quantity: float  # number of servings or grams
    unit: str  # "serving", "gram", "oz", "cup", "piece", etc.
    nutrition: Dict[str, Optional[float]]  # Calculated nutrition for this entry (fiber, sugar, sodium can be None)
    timestamp: str  # ISO format datetime

class NutritionGoal(BaseModel):
    """User's nutrition goals"""
    user_id: str
    daily_calories: float = 2000.0
    protein_grams: Optional[float] = None
    carbs_grams: Optional[float] = None
    fats_grams: Optional[float] = None
    protein_percent: Optional[float] = None  # % of calories
    carbs_percent: Optional[float] = None  # % of calories
    fats_percent: Optional[float] = None  # % of calories
    activity_level: str = "moderate"  # sedentary, light, moderate, active, very_active
    goal: str = "maintain"  # lose, maintain, gain
    updated_at: str

class NutritionSummary(BaseModel):
    """Daily nutrition summary"""
    date: str
    total_calories: float
    total_protein: float
    total_carbs: float
    total_fats: float
    total_fiber: Optional[float] = None
    total_sugar: Optional[float] = None
    total_sodium: Optional[float] = None
    goal_calories: float
    calories_remaining: float
    protein_percent: float  # % of goal
    carbs_percent: float  # % of goal
    fats_percent: float  # % of goal
    meal_breakdown: Dict[str, float]  # calories per meal type

def get_nutrition_entries_filepath(user_id: str) -> str:
    """Get filepath for user's nutrition entries"""
    user_dir = os.path.join("data", user_id)
    os.makedirs(user_dir, exist_ok=True)
    return os.path.join(user_dir, "nutrition_entries.json")

def get_nutrition_goals_filepath(user_id: str) -> str:
    """Get filepath for user's nutrition goals"""
    user_dir = os.path.join("data", user_id)
    os.makedirs(user_dir, exist_ok=True)
    return os.path.join(user_dir, "nutrition_goals.json")

def load_nutrition_entries(user_id: str, date_str: Optional[str] = None, days: int = 30) -> List[Dict[str, Any]]:
    """Load nutrition entries, optionally filtered by date"""
    filepath = get_nutrition_entries_filepath(user_id)
    
    if not os.path.exists(filepath):
        return []
    
    try:
        with open(filepath, "r") as f:
            all_entries = json.load(f)
        
        # Filter by date if specified
        if date_str:
            all_entries = [e for e in all_entries if e.get("date") == date_str]
        else:
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
                    print(f"Error parsing date for nutrition entry: {e}")
                    continue
            all_entries = filtered_entries
        
        # Sort by timestamp (newest first)
        all_entries.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
        return all_entries
    except Exception as e:
        print(f"Error loading nutrition entries for {user_id}: {e}")
        return []

def save_nutrition_entry(user_id: str, entry: FoodEntry) -> bool:
    """Save a nutrition entry"""
    filepath = get_nutrition_entries_filepath(user_id)
    
    # Load existing entries
    existing_entries = load_nutrition_entries(user_id, days=365*10)  # Load all
    
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
        print(f"Error saving nutrition entry for {user_id}: {e}")
        return False

def delete_nutrition_entry(user_id: str, entry_id: str) -> bool:
    """Delete a nutrition entry"""
    filepath = get_nutrition_entries_filepath(user_id)
    
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
        print(f"Error deleting nutrition entry for {user_id}: {e}")
        return False

def calculate_entry_nutrition(food_item: FoodItem, quantity: float, unit: str) -> Dict[str, Optional[float]]:
    """Calculate nutrition for a food entry based on quantity and unit"""
    # Convert quantity to servings
    if unit == "serving":
        servings = quantity
    elif unit == "gram" and food_item.serving_weight_grams:
        servings = quantity / food_item.serving_weight_grams
    elif unit == "oz" and food_item.serving_weight_grams:
        servings = (quantity * 28.35) / food_item.serving_weight_grams  # oz to grams
    else:
        # Default to servings if conversion not possible
        servings = quantity
    
    # Build nutrition dict, only including fields that have values
    nutrition: Dict[str, Optional[float]] = {
        "calories": round(food_item.calories * servings, 1),
        "protein": round(food_item.protein * servings, 1),
        "carbs": round(food_item.carbs * servings, 1),
        "fats": round(food_item.fats * servings, 1),
    }
    
    # Add optional fields only if they exist
    if food_item.fiber is not None:
        nutrition["fiber"] = round(food_item.fiber * servings, 1)
    if food_item.sugar is not None:
        nutrition["sugar"] = round(food_item.sugar * servings, 1)
    if food_item.sodium is not None:
        nutrition["sodium"] = round(food_item.sodium * servings, 1)
    
    return nutrition

def calculate_daily_summary(user_id: str, date_str: str) -> Optional[Dict[str, Any]]:
    """Calculate daily nutrition summary"""
    entries = load_nutrition_entries(user_id, date_str=date_str)
    goals = load_nutrition_goals(user_id)
    
    # Calculate totals
    total_calories = 0.0
    total_protein = 0.0
    total_carbs = 0.0
    total_fats = 0.0
    total_fiber = 0.0
    total_sugar = 0.0
    total_sodium = 0.0
    meal_breakdown = {"breakfast": 0.0, "lunch": 0.0, "dinner": 0.0, "snack": 0.0}
    
    for entry in entries:
        nutrition = entry.get("nutrition", {})
        total_calories += nutrition.get("calories", 0)
        total_protein += nutrition.get("protein", 0)
        total_carbs += nutrition.get("carbs", 0)
        total_fats += nutrition.get("fats", 0)
        total_fiber += nutrition.get("fiber", 0) or 0
        total_sugar += nutrition.get("sugar", 0) or 0
        total_sodium += nutrition.get("sodium", 0) or 0
        
        meal_type = entry.get("meal_type", "snack")
        meal_breakdown[meal_type] = meal_breakdown.get(meal_type, 0) + nutrition.get("calories", 0)
    
    # Get goals
    goal_calories = goals.get("daily_calories", 2000.0) if goals else 2000.0
    goal_protein = goals.get("protein_grams") if goals else None
    goal_carbs = goals.get("carbs_grams") if goals else None
    goal_fats = goals.get("fats_grams") if goals else None
    
    # Calculate percentages
    calories_remaining = goal_calories - total_calories
    protein_percent = (total_protein / goal_protein * 100) if goal_protein else 0
    carbs_percent = (total_carbs / goal_carbs * 100) if goal_carbs else 0
    fats_percent = (total_fats / goal_fats * 100) if goal_fats else 0
    
    return {
        "date": date_str,
        "total_calories": round(total_calories, 1),
        "total_protein": round(total_protein, 1),
        "total_carbs": round(total_carbs, 1),
        "total_fats": round(total_fats, 1),
        "total_fiber": round(total_fiber, 1) if total_fiber > 0 else None,
        "total_sugar": round(total_sugar, 1) if total_sugar > 0 else None,
        "total_sodium": round(total_sodium, 1) if total_sodium > 0 else None,
        "goal_calories": goal_calories,
        "calories_remaining": round(calories_remaining, 1),
        "protein_percent": round(protein_percent, 1) if goal_protein else None,
        "carbs_percent": round(carbs_percent, 1) if goal_carbs else None,
        "fats_percent": round(fats_percent, 1) if goal_fats else None,
        "meal_breakdown": meal_breakdown
    }

def load_nutrition_goals(user_id: str) -> Optional[Dict[str, Any]]:
    """Load user's nutrition goals"""
    filepath = get_nutrition_goals_filepath(user_id)
    
    if os.path.exists(filepath):
        try:
            with open(filepath, "r") as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading nutrition goals for {user_id}: {e}")
    
    return None

def save_nutrition_goals(user_id: str, goals: Dict[str, Any]) -> bool:
    """Save user's nutrition goals"""
    filepath = get_nutrition_goals_filepath(user_id)
    
    # Add updated_at timestamp
    goals["updated_at"] = datetime.now().isoformat()
    goals["user_id"] = user_id
    
    try:
        with open(filepath, "w") as f:
            json.dump(goals, f, indent=2)
        return True
    except Exception as e:
        print(f"Error saving nutrition goals for {user_id}: {e}")
        return False

# --- BMR/TDEE Calculation Functions ---

def calculate_bmr(weight_kg: float, height_cm: float, age: int, gender: str) -> float:
    """
    Calculate Basal Metabolic Rate using Mifflin-St Jeor equation
    
    Args:
        weight_kg: Weight in kilograms
        height_cm: Height in centimeters
        age: Age in years
        gender: "male", "female", or "other" (uses male formula for "other")
    
    Returns:
        BMR in calories per day
    """
    if weight_kg <= 0 or height_cm <= 0 or age <= 0:
        raise ValueError("Weight, height, and age must be positive numbers")
    
    gender_lower = gender.lower()
    if gender_lower in ["male", "m"]:
        # Men: BMR = 10 × weight(kg) + 6.25 × height(cm) - 5 × age + 5
        bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age + 5
    elif gender_lower in ["female", "f"]:
        # Women: BMR = 10 × weight(kg) + 6.25 × height(cm) - 5 × age - 161
        bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age - 161
    else:
        # For "other" or unknown, use male formula
        bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age + 5
    
    return round(bmr, 1)

def get_activity_multipliers() -> Dict[str, float]:
    """Get activity level multipliers for TDEE calculation - matches MyFitnessPal"""
    return {
        "sedentary": 1.2,           # Little/no exercise
        "light": 1.375,             # Light exercise 1-3 days/week
        "moderate": 1.55,           # Moderate exercise 3-5 days/week
        "active": 1.725,            # Hard exercise 6-7 days/week
        "very_active": 1.9          # Very hard exercise, physical job
    }

def calculate_tdee(bmr: float, activity_level: str) -> float:
    """
    Calculate Total Daily Energy Expenditure
    
    Args:
        bmr: Basal Metabolic Rate in calories
        activity_level: Activity level string (sedentary, lightly_active, etc.)
    
    Returns:
        TDEE in calories per day
    """
    if bmr <= 0:
        raise ValueError("BMR must be a positive number")
    
    multipliers = get_activity_multipliers()
    activity_lower = activity_level.lower().replace(" ", "_")
    
    # Handle variations in naming - matches MyFitnessPal activity levels
    activity_map = {
        "sedentary": "sedentary",
        "light": "light",
        "lightly": "light",
        "lightly_active": "light",
        "moderate": "moderate",
        "moderately": "moderate",
        "moderately_active": "moderate",
        "active": "active",
        "very": "very_active",
        "very_active": "very_active",
        "extra": "very_active",
        "extra_active": "very_active"
    }
    
    mapped_level = activity_map.get(activity_lower, "moderately_active")
    multiplier = multipliers.get(mapped_level, 1.55)  # Default to moderate
    
    tdee = bmr * multiplier
    return round(tdee, 1)

def calculate_calorie_target(tdee: float, goal_type: str, target_rate_lbs_per_week: float = 0) -> float:
    """
    Calculate calorie target based on goal type
    
    Args:
        tdee: Total Daily Energy Expenditure in calories
        goal_type: "lose", "maintain", or "gain"
        target_rate_lbs_per_week: Target weight change rate (lbs per week)
    
    Returns:
        Target calories per day
    """
    if tdee <= 0:
        raise ValueError("TDEE must be a positive number")
    
    goal_lower = goal_type.lower()
    
    if goal_lower in ["lose", "loss", "weight_loss"]:
        # Lose weight: TDEE - (target_rate × 500)
        # 1 lb/week = 500 cal/day deficit
        adjustment = target_rate_lbs_per_week * 500
        target = tdee - adjustment
        # Don't go below 1200 calories (safety limit)
        return round(max(target, 1200), 1)
    elif goal_lower in ["gain", "weight_gain", "bulk"]:
        # Gain weight: TDEE + (target_rate × 500)
        adjustment = target_rate_lbs_per_week * 500
        target = tdee + adjustment
        return round(target, 1)
    else:
        # Maintain weight: TDEE (no adjustment)
        return round(tdee, 1)

def get_macro_presets() -> Dict[str, Dict[str, float]]:
    """Get macro distribution presets (percentages of calories)"""
    return {
        "balanced": {
            "protein_percent": 30,
            "carbs_percent": 40,
            "fats_percent": 30
        },
        "high_protein": {
            "protein_percent": 40,
            "carbs_percent": 30,
            "fats_percent": 30
        },
        "keto": {
            "protein_percent": 25,
            "carbs_percent": 5,
            "fats_percent": 70
        },
        "low_carb": {
            "protein_percent": 35,
            "carbs_percent": 20,
            "fats_percent": 45
        },
        "high_carb": {
            "protein_percent": 20,
            "carbs_percent": 60,
            "fats_percent": 20
        }
    }

def calculate_macro_targets(calories: float, macro_preset: str) -> Dict[str, float]:
    """
    Calculate macro targets in grams based on calorie target and preset
    
    Args:
        calories: Target daily calories
        macro_preset: Preset name (balanced, high_protein, keto, etc.)
    
    Returns:
        Dictionary with protein_grams, carbs_grams, fats_grams, and percentages
    """
    if calories <= 0:
        raise ValueError("Calories must be a positive number")
    
    presets = get_macro_presets()
    preset_lower = macro_preset.lower().replace(" ", "_")
    
    # Handle variations in naming
    preset_map = {
        "balanced": "balanced",
        "balance": "balanced",
        "high_protein": "high_protein",
        "highprotein": "high_protein",
        "protein": "high_protein",
        "keto": "keto",
        "ketogenic": "keto",
        "low_carb": "low_carb",
        "lowcarb": "low_carb",
        "high_carb": "high_carb",
        "highcarb": "high_carb"
    }
    
    mapped_preset = preset_map.get(preset_lower, "balanced")
    preset = presets.get(mapped_preset, presets["balanced"])
    
    # Calculate grams
    # Protein: 4 calories per gram
    # Carbs: 4 calories per gram
    # Fats: 9 calories per gram
    
    protein_calories = calories * (preset["protein_percent"] / 100)
    carbs_calories = calories * (preset["carbs_percent"] / 100)
    fats_calories = calories * (preset["fats_percent"] / 100)
    
    protein_grams = protein_calories / 4
    carbs_grams = carbs_calories / 4
    fats_grams = fats_calories / 9
    
    return {
        "protein_grams": round(protein_grams, 1),
        "carbs_grams": round(carbs_grams, 1),
        "fats_grams": round(fats_grams, 1),
        "protein_percent": round(preset["protein_percent"], 1),
        "carbs_percent": round(preset["carbs_percent"], 1),
        "fats_percent": round(preset["fats_percent"], 1)
    }

def _parse_date(date_str: str) -> Optional[date]:
    """Parse date string to date object, handling various formats"""
    try:
        if "T" in date_str:
            return datetime.fromisoformat(date_str).date()
        return datetime.strptime(date_str, "%Y-%m-%d").date()
    except Exception:
        return None

def _get_entries_in_range(user_id: str, start_date: Optional[date] = None, end_date: Optional[date] = None) -> List[Dict[str, Any]]:
    """Get entries within a date range"""
    # Load all entries (we'll filter by date range)
    all_entries = load_nutrition_entries(user_id, days=365*10)  # Load all
    
    if not start_date and not end_date:
        return all_entries
    
    filtered = []
    for entry in all_entries:
        entry_date_str = entry.get("date", "")
        entry_date = _parse_date(entry_date_str)
        if not entry_date:
            continue
        
        if start_date and entry_date < start_date:
            continue
        if end_date and entry_date > end_date:
            continue
        
        filtered.append(entry)
    
    return filtered

def get_calorie_trends(user_id: str, days: int = 30, start_date: Optional[str] = None, end_date: Optional[str] = None) -> List[Dict[str, Any]]:
    """Get daily calorie trends over time"""
    start = _parse_date(start_date) if start_date else (date.today() - timedelta(days=days))
    end = _parse_date(end_date) if end_date else date.today()
    
    entries = _get_entries_in_range(user_id, start, end)
    
    # Group by date
    daily_totals = {}
    for entry in entries:
        entry_date_str = entry.get("date", "")
        entry_date = _parse_date(entry_date_str)
        if not entry_date:
            continue
        
        date_key = entry_date_str.split("T")[0] if "T" in entry_date_str else entry_date_str
        if date_key not in daily_totals:
            daily_totals[date_key] = 0.0
        
        nutrition = entry.get("nutrition", {})
        daily_totals[date_key] += nutrition.get("calories", 0)
    
    # Convert to list sorted by date
    trends = [{"date": d, "calories": round(cal, 1)} for d, cal in sorted(daily_totals.items())]
    return trends

def get_macro_trends(user_id: str, days: int = 30, start_date: Optional[str] = None, end_date: Optional[str] = None) -> List[Dict[str, Any]]:
    """Get daily macro trends over time"""
    start = _parse_date(start_date) if start_date else (date.today() - timedelta(days=days))
    end = _parse_date(end_date) if end_date else date.today()
    
    entries = _get_entries_in_range(user_id, start, end)
    
    # Group by date
    daily_totals = {}
    for entry in entries:
        entry_date_str = entry.get("date", "")
        entry_date = _parse_date(entry_date_str)
        if not entry_date:
            continue
        
        date_key = entry_date_str.split("T")[0] if "T" in entry_date_str else entry_date_str
        if date_key not in daily_totals:
            daily_totals[date_key] = {"protein": 0.0, "carbs": 0.0, "fats": 0.0}
        
        nutrition = entry.get("nutrition", {})
        daily_totals[date_key]["protein"] += nutrition.get("protein", 0)
        daily_totals[date_key]["carbs"] += nutrition.get("carbs", 0)
        daily_totals[date_key]["fats"] += nutrition.get("fats", 0)
    
    # Convert to list sorted by date
    trends = [
        {
            "date": d,
            "protein": round(totals["protein"], 1),
            "carbs": round(totals["carbs"], 1),
            "fats": round(totals["fats"], 1)
        }
        for d, totals in sorted(daily_totals.items())
    ]
    return trends

def get_most_logged_foods(user_id: str, days: int = 30, limit: int = 10, start_date: Optional[str] = None, end_date: Optional[str] = None) -> List[Dict[str, Any]]:
    """Get most frequently logged foods"""
    start = _parse_date(start_date) if start_date else (date.today() - timedelta(days=days))
    end = _parse_date(end_date) if end_date else date.today()
    
    entries = _get_entries_in_range(user_id, start, end)
    
    # Count foods and sum calories
    food_counts = {}
    food_calories = {}
    
    for entry in entries:
        food_item = entry.get("food_item", {})
        food_name = food_item.get("name", "Unknown")
        nutrition = entry.get("nutrition", {})
        calories = nutrition.get("calories", 0)
        
        if food_name not in food_counts:
            food_counts[food_name] = 0
            food_calories[food_name] = []
        
        food_counts[food_name] += 1
        food_calories[food_name].append(calories)
    
    # Calculate averages and sort
    most_logged = []
    for food_name, count in food_counts.items():
        avg_calories = sum(food_calories[food_name]) / len(food_calories[food_name]) if food_calories[food_name] else 0
        most_logged.append({
            "name": food_name,
            "count": count,
            "avg_calories": round(avg_calories, 1)
        })
    
    # Sort by count (descending) and limit
    most_logged.sort(key=lambda x: x["count"], reverse=True)
    return most_logged[:limit]

def get_meal_type_averages(user_id: str, days: int = 30, start_date: Optional[str] = None, end_date: Optional[str] = None) -> Dict[str, float]:
    """Get average calories per meal type"""
    start = _parse_date(start_date) if start_date else (date.today() - timedelta(days=days))
    end = _parse_date(end_date) if end_date else date.today()
    
    entries = _get_entries_in_range(user_id, start, end)
    
    meal_totals = {"breakfast": [], "lunch": [], "dinner": [], "snack": []}
    
    for entry in entries:
        meal_type = entry.get("meal_type", "snack")
        if meal_type not in meal_totals:
            meal_type = "snack"
        
        nutrition = entry.get("nutrition", {})
        calories = nutrition.get("calories", 0)
        meal_totals[meal_type].append(calories)
    
    # Calculate averages
    averages = {}
    for meal_type, calories_list in meal_totals.items():
        if calories_list:
            averages[meal_type] = round(sum(calories_list) / len(calories_list), 1)
        else:
            averages[meal_type] = 0.0
    
    return averages

def get_nutrition_patterns(user_id: str, days: int = 30, start_date: Optional[str] = None, end_date: Optional[str] = None) -> Dict[str, Any]:
    """Get nutrition patterns and insights"""
    start = _parse_date(start_date) if start_date else (date.today() - timedelta(days=days))
    end = _parse_date(end_date) if end_date else date.today()
    
    entries = _get_entries_in_range(user_id, start, end)
    
    if not entries:
        return {
            "dinner_percentage": 0,
            "protein_percentage": 0,
            "avg_daily_calories": 0,
            "total_days": 0
        }
    
    # Calculate daily totals
    daily_totals = {}
    meal_totals = {"breakfast": 0.0, "lunch": 0.0, "dinner": 0.0, "snack": 0.0}
    total_calories = 0.0
    total_protein = 0.0
    total_carbs = 0.0
    total_fats = 0.0
    
    for entry in entries:
        entry_date_str = entry.get("date", "")
        date_key = entry_date_str.split("T")[0] if "T" in entry_date_str else entry_date_str
        
        if date_key not in daily_totals:
            daily_totals[date_key] = 0.0
        
        nutrition = entry.get("nutrition", {})
        calories = nutrition.get("calories", 0)
        daily_totals[date_key] += calories
        total_calories += calories
        total_protein += nutrition.get("protein", 0)
        total_carbs += nutrition.get("carbs", 0)
        total_fats += nutrition.get("fats", 0)
        
        meal_type = entry.get("meal_type", "snack")
        if meal_type in meal_totals:
            meal_totals[meal_type] += calories
    
    # Calculate patterns
    days_count = len(daily_totals)
    avg_daily_calories = total_calories / days_count if days_count > 0 else 0
    
    # Dinner percentage
    dinner_percentage = (meal_totals["dinner"] / total_calories * 100) if total_calories > 0 else 0
    
    # Protein percentage (of total calories)
    protein_calories = total_protein * 4  # 4 calories per gram
    protein_percentage = (protein_calories / total_calories * 100) if total_calories > 0 else 0
    
    return {
        "dinner_percentage": round(dinner_percentage, 1),
        "protein_percentage": round(protein_percentage, 1),
        "avg_daily_calories": round(avg_daily_calories, 1),
        "total_days": days_count
    }

def get_weekly_summaries(user_id: str, weeks: int = 4, start_date: Optional[str] = None, end_date: Optional[str] = None) -> List[Dict[str, Any]]:
    """Get weekly aggregated summaries"""
    if start_date:
        start = _parse_date(start_date)
    else:
        # Calculate start date based on weeks
        start = date.today() - timedelta(weeks=weeks)
    
    end = _parse_date(end_date) if end_date else date.today()
    
    entries = _get_entries_in_range(user_id, start, end)
    
    # Group by week (Monday to Sunday)
    weekly_data = {}
    
    for entry in entries:
        entry_date_str = entry.get("date", "")
        entry_date = _parse_date(entry_date_str)
        if not entry_date:
            continue
        
        # Get Monday of the week
        days_since_monday = entry_date.weekday()
        week_start = entry_date - timedelta(days=days_since_monday)
        week_key = week_start.strftime("%Y-%m-%d")
        
        if week_key not in weekly_data:
            weekly_data[week_key] = {
                "week_start": week_key,
                "calories": 0.0,
                "protein": 0.0,
                "carbs": 0.0,
                "fats": 0.0,
                "days_logged": set()
            }
        
        nutrition = entry.get("nutrition", {})
        weekly_data[week_key]["calories"] += nutrition.get("calories", 0)
        weekly_data[week_key]["protein"] += nutrition.get("protein", 0)
        weekly_data[week_key]["carbs"] += nutrition.get("carbs", 0)
        weekly_data[week_key]["fats"] += nutrition.get("fats", 0)
        weekly_data[week_key]["days_logged"].add(entry_date_str.split("T")[0] if "T" in entry_date_str else entry_date_str)
    
    # Convert to list and calculate averages
    summaries = []
    for week_key, data in sorted(weekly_data.items()):
        days_count = len(data["days_logged"])
        summaries.append({
            "week_start": week_key,
            "total_calories": round(data["calories"], 1),
            "avg_daily_calories": round(data["calories"] / days_count, 1) if days_count > 0 else 0,
            "total_protein": round(data["protein"], 1),
            "total_carbs": round(data["carbs"], 1),
            "total_fats": round(data["fats"], 1),
            "days_logged": days_count
        })
    
    return summaries

def calculate_nutrition_stats(user_id: str, days: int = 30, start_date: Optional[str] = None, end_date: Optional[str] = None) -> Dict[str, Any]:
    """Calculate comprehensive nutrition statistics over time"""
    # Use new analytics functions
    calorie_trends = get_calorie_trends(user_id, days, start_date, end_date)
    macro_trends = get_macro_trends(user_id, days, start_date, end_date)
    most_logged_foods = get_most_logged_foods(user_id, days, 10, start_date, end_date)
    meal_averages = get_meal_type_averages(user_id, days, start_date, end_date)
    patterns = get_nutrition_patterns(user_id, days, start_date, end_date)
    weekly_summaries = get_weekly_summaries(user_id, 4, start_date, end_date)
    
    # Calculate date range
    start = _parse_date(start_date) if start_date else (date.today() - timedelta(days=days))
    end = _parse_date(end_date) if end_date else date.today()
    
    # Calculate basic stats from trends
    days_tracked = len(calorie_trends)
    avg_calories = sum(t["calories"] for t in calorie_trends) / days_tracked if days_tracked > 0 else 0
    avg_protein = sum(t["protein"] for t in macro_trends) / len(macro_trends) if macro_trends else 0
    avg_carbs = sum(t["carbs"] for t in macro_trends) / len(macro_trends) if macro_trends else 0
    avg_fats = sum(t["fats"] for t in macro_trends) / len(macro_trends) if macro_trends else 0
    
    return {
        "calorie_trends": calorie_trends,
        "macro_trends": macro_trends,
        "most_logged_foods": most_logged_foods,
        "meal_averages": meal_averages,
        "patterns": patterns,
        "weekly_summaries": weekly_summaries,
        "date_range": {
            "start": start.strftime("%Y-%m-%d"),
            "end": end.strftime("%Y-%m-%d")
        },
        # Keep backward compatibility
        "days_tracked": days_tracked,
        "average_calories": round(avg_calories, 1) if days_tracked > 0 else None,
        "average_protein": round(avg_protein, 1) if macro_trends else None,
        "average_carbs": round(avg_carbs, 1) if macro_trends else None,
        "average_fats": round(avg_fats, 1) if macro_trends else None,
        "total_days": days
    }

