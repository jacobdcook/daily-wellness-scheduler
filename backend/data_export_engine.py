"""
Data Export & Import Engine
Handles exporting user data in various formats and importing from other apps
"""
import json
import os
import csv
from datetime import datetime, date, timedelta
from typing import Dict, List, Optional, Any
from io import StringIO
import base64

def get_user_data_directory(user_id: str) -> str:
    """Get user's data directory"""
    user_dir = os.path.join("data", user_id)
    os.makedirs(user_dir, exist_ok=True)
    return user_dir

def export_all_user_data(user_id: str) -> Dict[str, Any]:
    """Export all user data in a structured format"""
    user_dir = get_user_data_directory(user_id)
    
    # Load all data files
    data = {
        "export_metadata": {
            "user_id": user_id,
            "export_date": datetime.now().isoformat(),
            "version": "1.0"
        },
        "nutrition": {},
        "recipes": {},
        "meal_plans": {},
        "meal_templates": {},
        "favorite_meals": {},
        "weight": {},
        "schedule": {},
        "settings": {},
        "goals": {}
    }
    
    # Nutrition entries
    nutrition_file = os.path.join(user_dir, "nutrition_entries.json")
    if os.path.exists(nutrition_file):
        try:
            with open(nutrition_file, "r") as f:
                data["nutrition"]["entries"] = json.load(f)
        except Exception as e:
            data["nutrition"]["error"] = str(e)
    
    # Nutrition goals
    goals_file = os.path.join(user_dir, "nutrition_goals.json")
    if os.path.exists(goals_file):
        try:
            with open(goals_file, "r") as f:
                data["goals"]["nutrition"] = json.load(f)
        except Exception as e:
            data["goals"]["error"] = str(e)
    
    # Recipes
    recipes_file = os.path.join(user_dir, "recipes.json")
    if os.path.exists(recipes_file):
        try:
            with open(recipes_file, "r") as f:
                data["recipes"]["user_recipes"] = json.load(f)
        except Exception as e:
            data["recipes"]["error"] = str(e)
    
    # Meal plans
    meal_plan_file = os.path.join(user_dir, "meal_plan.json")
    if os.path.exists(meal_plan_file):
        try:
            with open(meal_plan_file, "r") as f:
                data["meal_plans"] = json.load(f)
        except Exception as e:
            data["meal_plans"]["error"] = str(e)
    
    # Meal templates
    meal_templates_file = os.path.join(user_dir, "meal_templates.json")
    if os.path.exists(meal_templates_file):
        try:
            with open(meal_templates_file, "r") as f:
                data["meal_templates"] = json.load(f)
        except Exception as e:
            data["meal_templates"]["error"] = str(e)
    
    # Favorite meals
    favorites_file = os.path.join(user_dir, "favorite_meals.json")
    if os.path.exists(favorites_file):
        try:
            with open(favorites_file, "r") as f:
                data["favorite_meals"] = json.load(f)
        except Exception as e:
            data["favorite_meals"]["error"] = str(e)
    
    # Weight entries
    weight_file = os.path.join(user_dir, "weight_entries.json")
    if os.path.exists(weight_file):
        try:
            with open(weight_file, "r") as f:
                data["weight"]["entries"] = json.load(f)
        except Exception as e:
            data["weight"]["error"] = str(e)
    
    # Weight goals
    weight_goals_file = os.path.join(user_dir, "weight_goals.json")
    if os.path.exists(weight_goals_file):
        try:
            with open(weight_goals_file, "r") as f:
                data["weight"]["goals"] = json.load(f)
        except Exception as e:
            pass
    
    # Schedule
    schedule_file = os.path.join(user_dir, "schedule.json")
    if os.path.exists(schedule_file):
        try:
            with open(schedule_file, "r") as f:
                data["schedule"] = json.load(f)
        except Exception as e:
            data["schedule"]["error"] = str(e)
    
    # Settings
    settings_file = os.path.join(user_dir, "settings.json")
    if os.path.exists(settings_file):
        try:
            with open(settings_file, "r") as f:
                settings_data = json.load(f)
                # Remove sensitive data
                if "pushbullet_api_key" in settings_data:
                    settings_data["pushbullet_api_key"] = "***REDACTED***"
                data["settings"] = settings_data
        except Exception as e:
            data["settings"]["error"] = str(e)
    
    return data

def export_nutrition_csv(user_id: str, start_date: Optional[str] = None, end_date: Optional[str] = None) -> str:
    """Export nutrition entries as CSV"""
    user_dir = get_user_data_directory(user_id)
    nutrition_file = os.path.join(user_dir, "nutrition_entries.json")
    
    if not os.path.exists(nutrition_file):
        return ""
    
    try:
        with open(nutrition_file, "r") as f:
            entries = json.load(f)
    except Exception:
        return ""
    
    # Filter by date range if provided
    if start_date or end_date:
        filtered_entries = []
        for entry in entries:
            entry_date = entry.get("date", "")
            if start_date and entry_date < start_date:
                continue
            if end_date and entry_date > end_date:
                continue
            filtered_entries.append(entry)
        entries = filtered_entries
    
    # Create CSV
    output = StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow([
        "Date", "Meal Type", "Food Name", "Brand", "Quantity", "Unit",
        "Calories", "Protein (g)", "Carbs (g)", "Fats (g)", "Fiber (g)", "Sugar (g)", "Sodium (mg)"
    ])
    
    # Rows
    for entry in entries:
        food_item = entry.get("food_item", {})
        nutrition = entry.get("nutrition", {})
        writer.writerow([
            entry.get("date", ""),
            entry.get("meal_type", ""),
            food_item.get("name", ""),
            food_item.get("brand", ""),
            entry.get("quantity", ""),
            entry.get("unit", ""),
            nutrition.get("calories", 0),
            nutrition.get("protein", 0),
            nutrition.get("carbs", 0),
            nutrition.get("fats", 0),
            nutrition.get("fiber", 0) or "",
            nutrition.get("sugar", 0) or "",
            nutrition.get("sodium", 0) or "",
        ])
    
    return output.getvalue()

def export_weight_csv(user_id: str) -> str:
    """Export weight entries as CSV"""
    user_dir = get_user_data_directory(user_id)
    weight_file = os.path.join(user_dir, "weight_entries.json")
    
    if not os.path.exists(weight_file):
        return ""
    
    try:
        with open(weight_file, "r") as f:
            entries = json.load(f)
    except Exception:
        return ""
    
    output = StringIO()
    writer = csv.writer(output)
    
    writer.writerow(["Date", "Weight (kg)", "Body Fat %", "Muscle Mass (kg)", "Notes"])
    
    for entry in entries:
        writer.writerow([
            entry.get("date", ""),
            entry.get("weight_kg", ""),
            entry.get("body_fat_percent", "") or "",
            entry.get("muscle_mass_kg", "") or "",
            entry.get("notes", "") or "",
        ])
    
    return output.getvalue()

def export_recipes_json(user_id: str) -> List[Dict[str, Any]]:
    """Export user recipes as JSON"""
    user_dir = get_user_data_directory(user_id)
    recipes_file = os.path.join(user_dir, "recipes.json")
    
    if not os.path.exists(recipes_file):
        return []
    
    try:
        with open(recipes_file, "r") as f:
            return json.load(f)
    except Exception:
        return []

def export_meal_plan_json(user_id: str, week_start: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Export meal plan as JSON"""
    user_dir = get_user_data_directory(user_id)
    meal_plan_file = os.path.join(user_dir, "meal_plan.json")
    
    if not os.path.exists(meal_plan_file):
        return None
    
    try:
        with open(meal_plan_file, "r") as f:
            plan = json.load(f)
            if week_start and plan.get("week_start") != week_start:
                return None
            return plan
    except Exception:
        return None

def import_myfitnesspal_csv(csv_content: str, user_id: str) -> Dict[str, Any]:
    """Import nutrition data from MyFitnessPal CSV export"""
    from .nutrition_engine import FoodEntry, FoodItem, save_nutrition_entry
    import uuid
    
    results = {
        "imported": 0,
        "skipped": 0,
        "errors": []
    }
    
    try:
        reader = csv.DictReader(StringIO(csv_content))
        
        for row in reader:
            try:
                # MyFitnessPal CSV format: Date, Meal, Food, Calories, Carbs, Fat, Protein, Sodium, Sugar
                date_str = row.get("Date", "").strip()
                meal_type = row.get("Meal", "").strip().lower()
                food_name = row.get("Food", "").strip()
                calories = float(row.get("Calories", 0) or 0)
                carbs = float(row.get("Carbs", 0) or 0)
                fat = float(row.get("Fat", 0) or 0)
                protein = float(row.get("Protein", 0) or 0)
                sodium = float(row.get("Sodium", 0) or 0)
                sugar = float(row.get("Sugar", 0) or 0)
                
                if not date_str or not food_name:
                    results["skipped"] += 1
                    continue
                
                # Map meal types
                meal_type_map = {
                    "breakfast": "breakfast",
                    "lunch": "lunch",
                    "dinner": "dinner",
                    "snacks": "snack",
                    "snack": "snack"
                }
                meal_type = meal_type_map.get(meal_type, "snack")
                
                # Create food item
                food_item = FoodItem(
                    id=f"mfp_{uuid.uuid4().hex[:8]}",
                    name=food_name,
                    brand=None,
                    serving_size="1 serving",
                    calories=calories,
                    protein=protein,
                    carbs=carbs,
                    fats=fat,
                    sodium=sodium if sodium > 0 else None,
                    sugar=sugar if sugar > 0 else None,
                    source="myfitnesspal_import"
                )
                
                # Create entry
                entry = FoodEntry(
                    id=str(uuid.uuid4()),
                    user_id=user_id,
                    date=date_str,
                    meal_type=meal_type,
                    food_item=food_item,
                    quantity=1.0,
                    unit="serving",
                    nutrition={
                        "calories": calories,
                        "protein": protein,
                        "carbs": carbs,
                        "fats": fat,
                        "sodium": sodium if sodium > 0 else None,
                        "sugar": sugar if sugar > 0 else None,
                    },
                    timestamp=datetime.now().isoformat()
                )
                
                save_nutrition_entry(entry, user_id)
                results["imported"] += 1
                
            except Exception as e:
                results["errors"].append(f"Error importing row: {str(e)}")
                results["skipped"] += 1
        
    except Exception as e:
        results["errors"].append(f"CSV parsing error: {str(e)}")
    
    return results

def import_cronometer_csv(csv_content: str, user_id: str) -> Dict[str, Any]:
    """Import nutrition data from Cronometer CSV export"""
    from .nutrition_engine import FoodEntry, FoodItem, save_nutrition_entry
    import uuid
    
    results = {
        "imported": 0,
        "skipped": 0,
        "errors": []
    }
    
    try:
        reader = csv.DictReader(StringIO(csv_content))
        
        for row in reader:
            try:
                # Cronometer format varies, try common fields
                date_str = row.get("Date", "").strip() or row.get("date", "").strip()
                food_name = row.get("Food", "").strip() or row.get("food", "").strip()
                calories = float(row.get("Energy (kcal)", 0) or row.get("Calories", 0) or 0)
                protein = float(row.get("Protein (g)", 0) or row.get("Protein", 0) or 0)
                carbs = float(row.get("Carbohydrate (g)", 0) or row.get("Carbs", 0) or 0)
                fat = float(row.get("Fat (g)", 0) or row.get("Fat", 0) or 0)
                
                if not date_str or not food_name:
                    results["skipped"] += 1
                    continue
                
                # Default to snack if no meal type
                meal_type = row.get("Meal", "").strip().lower() or "snack"
                
                food_item = FoodItem(
                    id=f"cron_{uuid.uuid4().hex[:8]}",
                    name=food_name,
                    brand=None,
                    serving_size="1 serving",
                    calories=calories,
                    protein=protein,
                    carbs=carbs,
                    fats=fat,
                    source="cronometer_import"
                )
                
                entry = FoodEntry(
                    id=str(uuid.uuid4()),
                    user_id=user_id,
                    date=date_str,
                    meal_type=meal_type,
                    food_item=food_item,
                    quantity=1.0,
                    unit="serving",
                    nutrition={
                        "calories": calories,
                        "protein": protein,
                        "carbs": carbs,
                        "fats": fat,
                    },
                    timestamp=datetime.now().isoformat()
                )
                
                save_nutrition_entry(entry, user_id)
                results["imported"] += 1
                
            except Exception as e:
                results["errors"].append(f"Error importing row: {str(e)}")
                results["skipped"] += 1
        
    except Exception as e:
        results["errors"].append(f"CSV parsing error: {str(e)}")
    
    return results

def import_generic_json(json_data: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    """Import data from generic JSON format (our own export format)"""
    results = {
        "imported": {
            "nutrition": 0,
            "recipes": 0,
            "weight": 0,
            "settings": 0
        },
        "skipped": 0,
        "errors": []
    }
    
    try:
        # Import nutrition entries
        if "nutrition" in json_data and "entries" in json_data["nutrition"]:
            from .nutrition_engine import FoodEntry, FoodItem, save_nutrition_entry
            
            for entry_data in json_data["nutrition"]["entries"]:
                try:
                    food_item_data = entry_data.get("food_item", {})
                    food_item = FoodItem(**food_item_data)
                    entry = FoodEntry(**entry_data)
                    entry.user_id = user_id  # Ensure correct user_id
                    save_nutrition_entry(entry, user_id)
                    results["imported"]["nutrition"] += 1
                except Exception as e:
                    results["errors"].append(f"Error importing nutrition entry: {str(e)}")
                    results["skipped"] += 1
        
        # Import recipes
        if "recipes" in json_data and "user_recipes" in json_data["recipes"]:
            from .recipe_engine import save_user_recipes, load_user_recipes
            
            existing_recipes = load_user_recipes(user_id)
            imported_recipes = json_data["recipes"]["user_recipes"]
            
            # Merge recipes (avoid duplicates by name)
            existing_names = {r.get("name", "").lower() for r in existing_recipes}
            new_recipes = [r for r in imported_recipes if r.get("name", "").lower() not in existing_names]
            
            all_recipes = existing_recipes + new_recipes
            save_user_recipes(user_id, all_recipes)
            results["imported"]["recipes"] = len(new_recipes)
        
        # Import weight entries
        if "weight" in json_data and "entries" in json_data["weight"]:
            from .weight_engine import WeightEntry, save_weight_entry
            
            for entry_data in json_data["weight"]["entries"]:
                try:
                    entry = WeightEntry(**entry_data)
                    entry.user_id = user_id
                    save_weight_entry(entry, user_id)
                    results["imported"]["weight"] += 1
                except Exception as e:
                    results["errors"].append(f"Error importing weight entry: {str(e)}")
                    results["skipped"] += 1
        
        # Import settings (optional, user should review)
        if "settings" in json_data:
            # Settings import is optional and should be reviewed by user
            results["imported"]["settings"] = 1  # Mark as available but not auto-imported
        
    except Exception as e:
        results["errors"].append(f"JSON import error: {str(e)}")
    
    return results

def create_backup(user_id: str) -> Dict[str, Any]:
    """Create a complete backup of user data"""
    data = export_all_user_data(user_id)
    
    # Add backup metadata
    data["backup_metadata"] = {
        "backup_date": datetime.now().isoformat(),
        "backup_type": "full",
        "version": "1.0"
    }
    
    return data

def restore_backup(user_id: str, backup_data: Dict[str, Any]) -> Dict[str, Any]:
    """Restore user data from backup"""
    results = {
        "restored": {
            "nutrition": 0,
            "recipes": 0,
            "weight": 0,
            "settings": False
        },
        "errors": []
    }
    
    try:
        # Restore nutrition entries
        if "nutrition" in backup_data and "entries" in backup_data["nutrition"]:
            from .nutrition_engine import FoodEntry, FoodItem, save_nutrition_entry
            
            user_dir = get_user_data_directory(user_id)
            nutrition_file = os.path.join(user_dir, "nutrition_entries.json")
            
            # Backup existing file
            if os.path.exists(nutrition_file):
                backup_file = nutrition_file + f".backup.{datetime.now().timestamp()}"
                import shutil
                shutil.copy2(nutrition_file, backup_file)
            
            # Restore entries
            for entry_data in backup_data["nutrition"]["entries"]:
                try:
                    food_item_data = entry_data.get("food_item", {})
                    food_item = FoodItem(**food_item_data)
                    entry = FoodEntry(**entry_data)
                    entry.user_id = user_id
                    save_nutrition_entry(entry, user_id)
                    results["restored"]["nutrition"] += 1
                except Exception as e:
                    results["errors"].append(f"Error restoring nutrition entry: {str(e)}")
        
        # Restore recipes
        if "recipes" in backup_data and "user_recipes" in backup_data["recipes"]:
            from .recipe_engine import save_user_recipes
            
            save_user_recipes(user_id, backup_data["recipes"]["user_recipes"])
            results["restored"]["recipes"] = len(backup_data["recipes"]["user_recipes"])
        
        # Restore weight entries
        if "weight" in backup_data and "entries" in backup_data["weight"]:
            from .weight_engine import WeightEntry, save_weight_entry
            
            for entry_data in backup_data["weight"]["entries"]:
                try:
                    entry = WeightEntry(**entry_data)
                    entry.user_id = user_id
                    save_weight_entry(entry, user_id)
                    results["restored"]["weight"] += 1
                except Exception as e:
                    results["errors"].append(f"Error restoring weight entry: {str(e)}")
        
        # Restore settings (with user confirmation)
        if "settings" in backup_data and backup_data["settings"]:
            results["restored"]["settings"] = True
            # Settings restoration should be done manually by user
        
    except Exception as e:
        results["errors"].append(f"Restore error: {str(e)}")
    
    return results

