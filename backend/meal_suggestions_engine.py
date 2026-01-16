"""
Meal Suggestions Engine - AI-powered meal suggestions based on goals, preferences, and logged foods
"""
import json
import os
from datetime import datetime, date, timedelta
from typing import Dict, List, Optional, Any
from pydantic import BaseModel

class MealSuggestion(BaseModel):
    """AI-generated meal suggestion"""
    food_item_id: str
    food_name: str
    brand: Optional[str] = None
    calories: float
    protein: float
    carbs: float
    fats: float
    serving_size: str
    reason: str  # Why this was suggested
    confidence: float  # 0-1, how confident we are this fits user's preferences
    source: str = "usda"  # "usda", "recipe", "favorite", "local"
    recipe_id: Optional[str] = None  # If this is a recipe suggestion
    is_recipe: bool = False  # Whether this is a recipe or single food
    macro_fit_score: float = 0.0  # How well it fits macro needs (0-1)
    meal_combination: Optional[List[Dict[str, Any]]] = None  # For complete meal suggestions

class FavoriteMeal(BaseModel):
    """User's favorite meal"""
    id: str
    user_id: str
    name: str
    food_entries: List[Dict[str, Any]]  # List of food items in this meal
    total_calories: float
    total_protein: float
    total_carbs: float
    total_fats: float
    meal_type: str  # breakfast, lunch, dinner, snack
    created_at: str
    times_logged: int = 0

class MealPlan(BaseModel):
    """Weekly meal plan"""
    user_id: str
    week_start: str  # YYYY-MM-DD
    meals: Dict[str, Dict[str, List[Dict[str, Any]]]]  # {date: {meal_type: [food_entries]}}
    created_at: str
    updated_at: str

def get_favorite_meals_filepath(user_id: str) -> str:
    """Get filepath for user's favorite meals"""
    user_dir = os.path.join("data", user_id)
    os.makedirs(user_dir, exist_ok=True)
    return os.path.join(user_dir, "favorite_meals.json")

def get_meal_plan_filepath(user_id: str) -> str:
    """Get filepath for user's meal plan"""
    user_dir = os.path.join("data", user_id)
    os.makedirs(user_dir, exist_ok=True)
    return os.path.join(user_dir, "meal_plan.json")

def load_favorite_meals(user_id: str) -> List[Dict[str, Any]]:
    """Load user's favorite meals"""
    filepath = get_favorite_meals_filepath(user_id)
    
    if not os.path.exists(filepath):
        return []
    
    try:
        with open(filepath, "r") as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading favorite meals for {user_id}: {e}")
        return []

def save_favorite_meal(user_id: str, meal: FavoriteMeal) -> bool:
    """Save a favorite meal"""
    filepath = get_favorite_meals_filepath(user_id)
    favorites = load_favorite_meals(user_id)
    
    # Check if meal with this ID exists
    for i, f in enumerate(favorites):
        if f.get("id") == meal.id:
            favorites[i] = meal.model_dump()
            break
    else:
        favorites.append(meal.model_dump())
    
    try:
        with open(filepath, "w") as f:
            json.dump(favorites, f, indent=2)
        return True
    except Exception as e:
        print(f"Error saving favorite meal for {user_id}: {e}")
        return False

def delete_favorite_meal(user_id: str, meal_id: str) -> bool:
    """Delete a favorite meal"""
    filepath = get_favorite_meals_filepath(user_id)
    favorites = load_favorite_meals(user_id)
    
    favorites = [f for f in favorites if f.get("id") != meal_id]
    
    try:
        with open(filepath, "w") as f:
            json.dump(favorites, f, indent=2)
        return True
    except Exception as e:
        print(f"Error deleting favorite meal for {user_id}: {e}")
        return False

def load_meal_plan(user_id: str, week_start: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Load user's meal plan"""
    filepath = get_meal_plan_filepath(user_id)
    
    if not os.path.exists(filepath):
        return None
    
    try:
        with open(filepath, "r") as f:
            plan = json.load(f)
            if week_start and plan.get("week_start") != week_start:
                return None
            return plan
    except Exception as e:
        print(f"Error loading meal plan for {user_id}: {e}")
        return None

def save_meal_plan(user_id: str, plan: MealPlan) -> bool:
    """Save meal plan"""
    filepath = get_meal_plan_filepath(user_id)
    
    try:
        with open(filepath, "w") as f:
            json.dump(plan.model_dump(), f, indent=2)
        return True
    except Exception as e:
        print(f"Error saving meal plan for {user_id}: {e}")
        return False

def analyze_user_preferences(user_id: str, days: int = 30) -> Dict[str, Any]:
    """Analyze user's food logging patterns to learn preferences"""
    from .nutrition_engine import load_nutrition_entries
    
    entries = load_nutrition_entries(user_id, days=days)
    
    # Count food frequency
    food_counts = {}
    meal_type_preferences = {"breakfast": {}, "lunch": {}, "dinner": {}, "snack": {}}
    total_calories_by_meal = {"breakfast": 0, "lunch": 0, "dinner": 0, "snack": 0}
    meal_counts = {"breakfast": 0, "lunch": 0, "dinner": 0, "snack": 0}
    
    for entry in entries:
        food_name = entry.get("food_item", {}).get("name", "")
        meal_type = entry.get("meal_type", "snack")
        calories = entry.get("nutrition", {}).get("calories", 0)
        
        # Count food frequency
        if food_name:
            food_counts[food_name] = food_counts.get(food_name, 0) + 1
        
        # Track meal type preferences
        if food_name:
            if food_name not in meal_type_preferences[meal_type]:
                meal_type_preferences[meal_type][food_name] = 0
            meal_type_preferences[meal_type][food_name] += 1
        
        # Track average calories per meal
        total_calories_by_meal[meal_type] += calories
        meal_counts[meal_type] += 1
    
    # Calculate averages
    avg_calories_by_meal = {}
    for meal_type in meal_type_preferences:
        if meal_counts[meal_type] > 0:
            avg_calories_by_meal[meal_type] = total_calories_by_meal[meal_type] / meal_counts[meal_type]
        else:
            avg_calories_by_meal[meal_type] = 0
    
    # Get top foods
    top_foods = sorted(food_counts.items(), key=lambda x: x[1], reverse=True)[:20]
    
    return {
        "top_foods": [food for food, count in top_foods],
        "meal_type_preferences": meal_type_preferences,
        "avg_calories_by_meal": avg_calories_by_meal,
        "total_entries": len(entries)
    }

def analyze_macro_gaps(
    user_id: str,
    date_str: str,
    goals: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """Analyze what macros the user needs more of"""
    from .nutrition_engine import calculate_daily_summary, load_nutrition_goals
    
    if not goals:
        goals = load_nutrition_goals(user_id) or {}
    
    summary = calculate_daily_summary(user_id, date_str)
    
    if not summary:
        return {
            "needs_protein": True,
            "needs_carbs": True,
            "needs_fats": True,
            "protein_gap": goals.get("protein_grams", 100) if goals else 100,
            "carbs_gap": goals.get("carbs_grams", 200) if goals else 200,
            "fats_gap": goals.get("fats_grams", 65) if goals else 65,
        }
    
    goal_protein = goals.get("protein_grams", 0) if goals else 0
    goal_carbs = goals.get("carbs_grams", 0) if goals else 0
    goal_fats = goals.get("fats_grams", 0) if goals else 0
    
    current_protein = summary.get("total_protein", 0)
    current_carbs = summary.get("total_carbs", 0)
    current_fats = summary.get("total_fats", 0)
    
    # Calculate gaps (what's still needed)
    protein_gap = max(0, goal_protein - current_protein) if goal_protein > 0 else 0
    carbs_gap = max(0, goal_carbs - current_carbs) if goal_carbs > 0 else 0
    fats_gap = max(0, goal_fats - current_fats) if goal_fats > 0 else 0
    
    # Determine what's most needed (percentage of goal remaining)
    protein_percent = (current_protein / goal_protein * 100) if goal_protein > 0 else 100
    carbs_percent = (current_carbs / goal_carbs * 100) if goal_carbs > 0 else 100
    fats_percent = (current_fats / goal_fats * 100) if goal_fats > 0 else 100
    
    return {
        "needs_protein": protein_percent < 80,  # Less than 80% of goal
        "needs_carbs": carbs_percent < 80,
        "needs_fats": fats_percent < 80,
        "protein_gap": protein_gap,
        "carbs_gap": carbs_gap,
        "fats_gap": fats_gap,
        "protein_percent": protein_percent,
        "carbs_percent": carbs_percent,
        "fats_percent": fats_percent,
    }

def calculate_macro_fit_score(
    suggestion: Dict[str, Any],
    macro_gaps: Dict[str, Any],
    target_calories: float
) -> float:
    """Calculate how well a suggestion fits the user's macro needs (0-1)"""
    score = 0.0
    factors = 0
    
    # Calorie fit (within 20% of target is good)
    cal_diff = abs(suggestion["calories"] - target_calories) / target_calories if target_calories > 0 else 1
    cal_score = max(0, 1 - (cal_diff / 0.2))  # Perfect if within 20%
    score += cal_score * 0.3
    factors += 0.3
    
    # Protein fit
    if macro_gaps.get("needs_protein") and suggestion["protein"] > 0:
        protein_score = min(1.0, suggestion["protein"] / max(macro_gaps.get("protein_gap", 1), 1))
        score += protein_score * 0.3
        factors += 0.3
    
    # Carbs fit
    if macro_gaps.get("needs_carbs") and suggestion["carbs"] > 0:
        carbs_score = min(1.0, suggestion["carbs"] / max(macro_gaps.get("carbs_gap", 1), 1))
        score += carbs_score * 0.2
        factors += 0.2
    
    # Fats fit
    if macro_gaps.get("needs_fats") and suggestion["fats"] > 0:
        fats_score = min(1.0, suggestion["fats"] / max(macro_gaps.get("fats_gap", 1), 1))
        score += fats_score * 0.2
        factors += 0.2
    
    # Normalize by factors used
    return score / factors if factors > 0 else 0.5

def generate_meal_suggestions(
    user_id: str,
    meal_type: str,
    remaining_calories: float,
    remaining_protein: Optional[float] = None,
    remaining_carbs: Optional[float] = None,
    remaining_fats: Optional[float] = None,
    limit: int = 10,
    date_str: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Generate AI-powered meal suggestions with goal-based recommendations"""
    from .nutrition_engine import load_nutrition_entries, load_nutrition_goals
    from .recipe_engine import load_user_recipes, search_recipes
    import requests
    import os
    from dotenv import load_dotenv
    from datetime import datetime
    
    load_dotenv()
    
    if not date_str:
        date_str = datetime.now().strftime("%Y-%m-%d")
    
    # Load user goals
    goals = load_nutrition_goals(user_id)
    
    # Analyze macro gaps
    macro_gaps = analyze_macro_gaps(user_id, date_str, goals)
    
    # Analyze user preferences
    preferences = analyze_user_preferences(user_id, days=30)
    
    # Get user's top foods
    top_foods = preferences.get("top_foods", [])
    
    # Get food counts for reasoning
    food_counts = {}
    for entry in load_nutrition_entries(user_id, days=30):
        food_name = entry.get("food_item", {}).get("name", "") or entry.get("food_name", "")
        if food_name:
            food_counts[food_name] = food_counts.get(food_name, 0) + 1
    
    # Ensure we have a reasonable target (at least 200 calories)
    if remaining_calories <= 0:
        remaining_calories = goals.get("daily_calories", 2000) if goals else 2000
    
    # Calculate target calories for this meal (distribute remaining calories)
    meal_calorie_targets = {
        "breakfast": 0.25,  # 25% of daily calories
        "lunch": 0.35,      # 35% of daily calories
        "dinner": 0.35,     # 35% of daily calories
        "snack": 0.05       # 5% of daily calories
    }
    
    target_calories = remaining_calories * meal_calorie_targets.get(meal_type, 0.25)
    target_calories = max(target_calories, 200)  # Minimum 200 calories
    target_calories = min(target_calories, remaining_calories)  # Don't exceed remaining
    
    suggestions = []
    
    # 1. PRIORITY: Suggest recipes from user's collection
    for food_name in top_foods[:5]:  # Top 5 foods
        try:
            usda_api_key = os.getenv("USDA_API_KEY")
            url = "https://api.nal.usda.gov/fdc/v1/foods/search"
            params = {
                "query": food_name,
                "pageSize": 5
            }
            if usda_api_key:
                params["api_key"] = usda_api_key
            
            response = requests.get(url, params=params, timeout=5)
            if response.status_code == 200:
                data = response.json()
                for item in data.get("foods", [])[:1]:  # Take first match
                    nutrients = {}
                    for n in item.get("foodNutrients", []):
                        nutrient_name = n.get("nutrientName", "")
                        value = n.get("value", 0)
                        if value:
                            nutrients[nutrient_name] = value
                    
                    calories = nutrients.get("Energy", 0) or nutrients.get("Energy (Atwater General Factors)", 0)
                    
                    # Check if it fits remaining calories
                    if calories <= target_calories * 1.5:  # Allow some flexibility
                        macro_fit = calculate_macro_fit_score({
                            "calories": calories,
                            "protein": nutrients.get("Protein", 0),
                            "carbs": nutrients.get("Carbohydrate, by difference", 0),
                            "fats": nutrients.get("Total lipid (fat)", 0),
                        }, macro_gaps, target_calories)
                        
                        # Build reason
                        reasons = [f"You've logged this {food_counts.get(food_name, 0)} times"]
                        if macro_gaps.get("needs_protein") and nutrients.get("Protein", 0) > 15:
                            reasons.append("high protein")
                        if calories <= target_calories * 1.1:
                            reasons.append("fits your goals")
                        
                        suggestions.append({
                            "food_item_id": str(item.get("fdcId", "")),
                            "food_name": item.get("description", food_name),
                            "brand": item.get("brandOwner"),
                            "calories": round(calories, 1),
                            "protein": round(nutrients.get("Protein", 0), 1),
                            "carbs": round(nutrients.get("Carbohydrate, by difference", 0), 1),
                            "fats": round(nutrients.get("Total lipid (fat)", 0), 1),
                            "serving_size": "100g",
                            "serving_weight_grams": 100.0,
                            "reason": " • ".join(reasons),
                            "confidence": 0.8,
                            "source": "usda",
                            "is_recipe": False,
                            "macro_fit_score": macro_fit,
                        })
                        if len(suggestions) >= limit:
                            break
        except Exception as e:
            print(f"Error searching for food {food_name}: {e}")
            continue
    
    # If we don't have enough suggestions, try API search with meal-specific terms
    if len(suggestions) < limit:
            meal_search_terms = {
                "breakfast": ["eggs", "oatmeal", "yogurt", "cereal", "toast"],
                "lunch": ["chicken", "salad", "sandwich", "rice", "pasta"],
                "dinner": ["salmon", "beef", "vegetables", "quinoa", "potato"],
                "snack": ["apple", "banana", "nuts", "cheese", "crackers"]
            }
            
            search_terms = meal_search_terms.get(meal_type, ["food"])
            
            for term in search_terms[:3]:  # Try first 3 terms
                try:
                    usda_api_key = os.getenv("USDA_API_KEY")
                    url = "https://api.nal.usda.gov/fdc/v1/foods/search"
                    params = {
                        "query": term,
                        "pageSize": 5
                    }
                    if usda_api_key:
                        params["api_key"] = usda_api_key
                    
                    response = requests.get(url, params=params, timeout=5)
                    if response.status_code == 200:
                        data = response.json()
                        for item in data.get("foods", [])[:2]:  # Take first 2 matches
                            nutrients = {}
                            for n in item.get("foodNutrients", []):
                                nutrient_name = n.get("nutrientName", "")
                                value = n.get("value", 0)
                                if value:
                                    nutrients[nutrient_name] = value
                            
                            calories = nutrients.get("Energy", 0) or nutrients.get("Energy (Atwater General Factors)", 0)
                            
                            # Check if it fits remaining calories
                            if calories <= target_calories * 1.5:
                                food_name = item.get("description", term)
                                # Skip if already suggested
                                if any(s["food_name"] == food_name for s in suggestions):
                                    continue
                                
                                macro_fit = calculate_macro_fit_score({
                                    "calories": calories,
                                    "protein": nutrients.get("Protein", 0),
                                    "carbs": nutrients.get("Carbohydrate, by difference", 0),
                                    "fats": nutrients.get("Total lipid (fat)", 0),
                                }, macro_gaps, target_calories)
                                
                                # Build reason based on macro needs
                                reasons = [f"Popular {meal_type} option"]
                                if macro_gaps.get("needs_protein") and nutrients.get("Protein", 0) > 20:
                                    reasons.append("high protein")
                                elif macro_gaps.get("needs_carbs") and nutrients.get("Carbohydrate, by difference", 0) > 30:
                                    reasons.append("good carbs")
                                elif macro_gaps.get("needs_fats") and nutrients.get("Total lipid (fat)", 0) > 10:
                                    reasons.append("healthy fats")
                                
                                suggestions.append({
                                    "food_item_id": str(item.get("fdcId", "")),
                                    "food_name": food_name,
                                    "brand": item.get("brandOwner"),
                                    "calories": round(calories, 1),
                                    "protein": round(nutrients.get("Protein", 0), 1),
                                    "carbs": round(nutrients.get("Carbohydrate, by difference", 0), 1),
                                    "fats": round(nutrients.get("Total lipid (fat)", 0), 1),
                                    "serving_size": "100g",
                                    "serving_weight_grams": 100.0,
                                    "reason": " • ".join(reasons) if len(reasons) > 1 else reasons[0],
                                    "confidence": 0.6,
                                    "source": "usda",
                                    "is_recipe": False,
                                    "macro_fit_score": macro_fit,
                                })
                                if len(suggestions) >= limit:
                                    break
                except Exception as e:
                    print(f"Error searching for {term}: {e}")
                    continue
                
                if len(suggestions) >= limit:
                    break
    
    # 4. Add macro-targeted suggestions if we need more
    if len(suggestions) < limit and macro_gaps.get("needs_protein"):
        # Search for high-protein foods
        high_protein_terms = {
            "breakfast": ["greek yogurt", "eggs", "protein shake", "cottage cheese"],
            "lunch": ["chicken breast", "tuna", "turkey", "lentils"],
            "dinner": ["salmon", "lean beef", "chicken", "tofu"],
            "snack": ["protein bar", "nuts", "cheese", "jerky"]
        }
        
        for term in high_protein_terms.get(meal_type, [])[:2]:
            if len(suggestions) >= limit:
                break
            try:
                usda_api_key = os.getenv("USDA_API_KEY")
                url = "https://api.nal.usda.gov/fdc/v1/foods/search"
                params = {"query": term, "pageSize": 3}
                if usda_api_key:
                    params["api_key"] = usda_api_key
                
                response = requests.get(url, params=params, timeout=5)
                if response.status_code == 200:
                    data = response.json()
                    for item in data.get("foods", [])[:1]:
                        nutrients = {}
                        for n in item.get("foodNutrients", []):
                            if n.get("value"):
                                nutrients[n.get("nutrientName", "")] = n.get("value")
                        
                        calories = nutrients.get("Energy", 0) or nutrients.get("Energy (Atwater General Factors)", 0)
                        protein = nutrients.get("Protein", 0)
                        
                        if protein > 15 and calories <= target_calories * 1.5:
                            food_name = item.get("description", term)
                            if any(s["food_name"] == food_name for s in suggestions):
                                continue
                            
                            macro_fit = calculate_macro_fit_score({
                                "calories": calories,
                                "protein": protein,
                                "carbs": nutrients.get("Carbohydrate, by difference", 0),
                                "fats": nutrients.get("Total lipid (fat)", 0),
                            }, macro_gaps, target_calories)
                            
                            suggestions.append({
                                "food_item_id": str(item.get("fdcId", "")),
                                "food_name": food_name,
                                "brand": item.get("brandOwner"),
                                "calories": round(calories, 1),
                                "protein": round(protein, 1),
                                "carbs": round(nutrients.get("Carbohydrate, by difference", 0), 1),
                                "fats": round(nutrients.get("Total lipid (fat)", 0), 1),
                                "serving_size": "100g",
                                "serving_weight_grams": 100.0,
                                "reason": f"High protein ({round(protein, 1)}g) to meet your goals",
                                "confidence": 0.7,
                                "source": "usda",
                                "is_recipe": False,
                                "macro_fit_score": macro_fit,
                            })
            except Exception as e:
                print(f"Error searching for high-protein food {term}: {e}")
                continue
    
    # Sort by combined score (confidence + macro_fit)
    for s in suggestions:
        s["combined_score"] = (s["confidence"] * 0.6) + (s.get("macro_fit_score", 0.5) * 0.4)
    
    suggestions = sorted(suggestions, key=lambda x: x.get("combined_score", 0), reverse=True)
    
    # Filter by remaining macros if provided
    if remaining_protein is not None:
        suggestions = [s for s in suggestions if s["protein"] <= remaining_protein * 1.5]
    if remaining_carbs is not None:
        suggestions = [s for s in suggestions if s["carbs"] <= remaining_carbs * 1.5]
    if remaining_fats is not None:
        suggestions = [s for s in suggestions if s["fats"] <= remaining_fats * 1.5]
    
    # Remove combined_score before returning
    for s in suggestions:
        s.pop("combined_score", None)
    
    return suggestions[:limit]

def generate_shopping_list(user_id: str, week_start: str) -> List[Dict[str, Any]]:
    """Generate shopping list from meal plan"""
    plan = load_meal_plan(user_id, week_start)
    
    if not plan:
        return []
    
    # Collect all unique food items from meal plan
    food_items = {}
    
    for date, meals in plan.get("meals", {}).items():
        for meal_type, entries in meals.items():
            for entry in entries:
                food_item = entry.get("food_item", {})
                food_name = food_item.get("name", "")
                
                if food_name:
                    if food_name not in food_items:
                        food_items[food_name] = {
                            "name": food_name,
                            "brand": food_item.get("brand"),
                            "quantity": 0,
                            "unit": "serving"
                        }
                    food_items[food_name]["quantity"] += entry.get("quantity", 1)
    
    return list(food_items.values())

