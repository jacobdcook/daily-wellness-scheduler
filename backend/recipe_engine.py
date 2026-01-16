"""
Recipe Database & Meal Prep Engine
"""
import json
import os
from datetime import datetime, date, timedelta
from typing import Dict, List, Optional, Any
from pydantic import BaseModel

class Recipe(BaseModel):
    """Recipe model"""
    id: str
    name: str
    description: str
    cuisine: str
    difficulty: str  # "easy", "medium", "hard"
    prep_time_minutes: int
    cook_time_minutes: int
    total_time_minutes: int
    servings: int
    ingredients: List[Dict[str, Any]]  # [{name, quantity, unit, notes}]
    instructions: List[str]
    nutrition: Dict[str, float]  # {calories, protein, carbs, fats}
    tags: List[str]  # ["vegetarian", "vegan", "gluten-free", etc.]
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    created_by: str
    is_public: bool
    rating: float
    review_count: int
    created_at: str
    updated_at: str

class MealPlan(BaseModel):
    """Meal plan model"""
    id: str
    user_id: str
    week_start: str
    meals: Dict[str, List[Dict[str, Any]]]  # {date: [{meal_type, recipe_id, servings}]}
    created_at: str
    updated_at: str

class ShoppingList(BaseModel):
    """Shopping list model"""
    id: str
    user_id: str
    meal_plan_id: Optional[str] = None
    items: List[Dict[str, Any]]  # [{name, quantity, unit, category, checked}]
    created_at: str
    updated_at: str

def load_recipes() -> List[Dict[str, Any]]:
    """Load all recipes"""
    recipes_file = "data/recipes.json"
    if os.path.exists(recipes_file):
        try:
            with open(recipes_file, "r") as f:
                return json.load(f)
        except:
            pass
    return []

def save_recipes(recipes: List[Dict[str, Any]]):
    """Save all recipes"""
    recipes_file = "data/recipes.json"
    os.makedirs(os.path.dirname(recipes_file), exist_ok=True)
    with open(recipes_file, "w") as f:
        json.dump(recipes, f, indent=2)

def create_recipe(recipe_data: Dict[str, Any]) -> Recipe:
    """Create a new recipe"""
    total_time = recipe_data.get("prep_time_minutes", 0) + recipe_data.get("cook_time_minutes", 0)
    
    recipe = Recipe(
        id=f"recipe_{datetime.now().timestamp()}",
        name=recipe_data.get("name", "New Recipe"),
        description=recipe_data.get("description", ""),
        cuisine=recipe_data.get("cuisine", "general"),
        difficulty=recipe_data.get("difficulty", "medium"),
        prep_time_minutes=recipe_data.get("prep_time_minutes", 0),
        cook_time_minutes=recipe_data.get("cook_time_minutes", 0),
        total_time_minutes=total_time,
        servings=recipe_data.get("servings", 1),
        ingredients=recipe_data.get("ingredients", []),
        instructions=recipe_data.get("instructions", []),
        nutrition=recipe_data.get("nutrition", {"calories": 0, "protein": 0, "carbs": 0, "fats": 0}),
        tags=recipe_data.get("tags", []),
        image_url=recipe_data.get("image_url"),
        video_url=recipe_data.get("video_url"),
        created_by=recipe_data.get("created_by", ""),
        is_public=recipe_data.get("is_public", False),
        rating=0.0,
        review_count=0,
        created_at=datetime.now().isoformat(),
        updated_at=datetime.now().isoformat()
    )
    
    recipes = load_recipes()
    recipes.append(recipe.model_dump())
    save_recipes(recipes)
    
    return recipe

def search_recipes(
    query: Optional[str] = None,
    cuisine: Optional[str] = None,
    difficulty: Optional[str] = None,
    tags: Optional[List[str]] = None,
    max_prep_time: Optional[int] = None,
    min_rating: Optional[float] = None,
    limit: int = 50
) -> List[Dict[str, Any]]:
    """Search and filter recipes"""
    recipes = load_recipes()
    filtered = []
    
    for recipe in recipes:
        # Public recipes only (or user's own)
        if not recipe.get("is_public") and not recipe.get("created_by"):
            continue
        
        # Text search
        if query:
            query_lower = query.lower()
            if (query_lower not in recipe.get("name", "").lower() and
                query_lower not in recipe.get("description", "").lower() and
                not any(query_lower in ing.get("name", "").lower() for ing in recipe.get("ingredients", []))):
                continue
        
        # Filters
        if cuisine and recipe.get("cuisine") != cuisine:
            continue
        if difficulty and recipe.get("difficulty") != difficulty:
            continue
        if tags and not any(tag in recipe.get("tags", []) for tag in tags):
            continue
        if max_prep_time and recipe.get("prep_time_minutes", 0) > max_prep_time:
            continue
        if min_rating and recipe.get("rating", 0) < min_rating:
            continue
        
        filtered.append(recipe)
    
    # Sort by rating (descending)
    filtered.sort(key=lambda x: x.get("rating", 0), reverse=True)
    
    return filtered[:limit]

def get_recipe(recipe_id: str) -> Optional[Dict[str, Any]]:
    """Get a specific recipe"""
    recipes = load_recipes()
    for recipe in recipes:
        if recipe.get("id") == recipe_id:
            return recipe
    return None

def favorite_recipe(user_id: str, recipe_id: str) -> bool:
    """Add recipe to user's favorites"""
    favorites_file = f"data/{user_id}/recipe_favorites.json"
    os.makedirs(os.path.dirname(favorites_file), exist_ok=True)
    
    favorites = []
    if os.path.exists(favorites_file):
        try:
            with open(favorites_file, "r") as f:
                favorites = json.load(f)
        except:
            pass
    
    if recipe_id not in favorites:
        favorites.append(recipe_id)
        with open(favorites_file, "w") as f:
            json.dump(favorites, f, indent=2)
        return True
    return False

def get_favorite_recipes(user_id: str) -> List[Dict[str, Any]]:
    """Get user's favorite recipes"""
    favorites_file = f"data/{user_id}/recipe_favorites.json"
    favorites = []
    if os.path.exists(favorites_file):
        try:
            with open(favorites_file, "r") as f:
                favorites = json.load(f)
        except:
            pass
    
    recipes = load_recipes()
    favorite_recipes = [r for r in recipes if r.get("id") in favorites]
    return favorite_recipes

def load_user_recipes(user_id: str) -> List[Dict[str, Any]]:
    """Load user's custom recipes"""
    user_recipes_file = f"data/{user_id}/recipes.json"
    if os.path.exists(user_recipes_file):
        try:
            with open(user_recipes_file, "r") as f:
                return json.load(f)
        except:
            pass
    return []

def save_user_recipes(user_id: str, recipes: List[Dict[str, Any]]):
    """Save user's custom recipes"""
    user_recipes_file = f"data/{user_id}/recipes.json"
    os.makedirs(os.path.dirname(user_recipes_file), exist_ok=True)
    with open(user_recipes_file, "w") as f:
        json.dump(recipes, f, indent=2)

def get_user_recipes(user_id: str) -> List[Dict[str, Any]]:
    """Get user's custom recipes"""
    return load_user_recipes(user_id)

def save_user_recipe(user_id: str, recipe_data: Dict[str, Any]) -> Dict[str, Any]:
    """Save a user's custom recipe with auto-calculated nutrition"""
    # Validate required fields
    if not recipe_data.get("name"):
        raise ValueError("Recipe name is required")
    
    ingredients = recipe_data.get("ingredients", [])
    if not ingredients:
        raise ValueError("At least one ingredient is required")
    
    # Validate ingredients
    for ing in ingredients:
        if not ing.get("name"):
            raise ValueError("All ingredients must have a name")
        try:
            quantity = float(ing.get("quantity", 0))
            if quantity <= 0:
                raise ValueError("All ingredient quantities must be positive numbers")
        except (ValueError, TypeError):
            raise ValueError("All ingredient quantities must be valid numbers")
    
    # Calculate nutrition from ingredients
    nutrition = calculate_recipe_nutrition(ingredients)
    
    # Calculate total time
    prep_time = recipe_data.get("prep_time_minutes", 0)
    cook_time = recipe_data.get("cook_time_minutes", 0)
    total_time = prep_time + cook_time
    
    # Create recipe object
    recipe_id = recipe_data.get("id") or f"recipe_{datetime.now().timestamp()}_{user_id}"
    
    recipe = {
        "id": recipe_id,
        "name": recipe_data.get("name", "New Recipe"),
        "description": recipe_data.get("description", ""),
        "cuisine": recipe_data.get("cuisine", "general"),
        "difficulty": recipe_data.get("difficulty", "medium"),
        "prep_time_minutes": prep_time,
        "cook_time_minutes": cook_time,
        "total_time_minutes": total_time,
        "servings": recipe_data.get("servings", 1),
        "ingredients": ingredients,
        "instructions": recipe_data.get("instructions", []),
        "nutrition": nutrition,
        "tags": recipe_data.get("tags", []),
        "image_url": recipe_data.get("image_url"),
        "video_url": recipe_data.get("video_url"),
        "created_by": user_id,
        "is_public": recipe_data.get("is_public", False),
        "rating": 0.0,
        "review_count": 0,
        "created_at": recipe_data.get("created_at") or datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat()
    }
    
    # Load existing user recipes
    user_recipes = load_user_recipes(user_id)
    
    # Check if recipe already exists (update) or add new
    existing_index = None
    for i, r in enumerate(user_recipes):
        if r.get("id") == recipe_id:
            existing_index = i
            break
    
    if existing_index is not None:
        # Update existing recipe
        user_recipes[existing_index] = recipe
    else:
        # Add new recipe
        user_recipes.append(recipe)
    
    # Save user recipes
    save_user_recipes(user_id, user_recipes)
    
    return recipe

def update_user_recipe(user_id: str, recipe_id: str, recipe_data: Dict[str, Any]) -> Dict[str, Any]:
    """Update a user's recipe (only if user owns it)"""
    user_recipes = load_user_recipes(user_id)
    
    # Find recipe
    recipe_index = None
    for i, recipe in enumerate(user_recipes):
        if recipe.get("id") == recipe_id and recipe.get("created_by") == user_id:
            recipe_index = i
            break
    
    if recipe_index is None:
        raise ValueError("Recipe not found or you don't have permission to update it")
    
    # Validate required fields
    if "name" in recipe_data and not recipe_data.get("name"):
        raise ValueError("Recipe name cannot be empty")
    
    # Get existing recipe
    existing_recipe = user_recipes[recipe_index]
    
    # Update fields (preserve ID and created_by)
    updated_recipe = {**existing_recipe, **recipe_data}
    updated_recipe["id"] = recipe_id
    updated_recipe["created_by"] = user_id
    updated_recipe["updated_at"] = datetime.now().isoformat()
    
    # Recalculate nutrition if ingredients changed
    if "ingredients" in recipe_data:
        ingredients = recipe_data.get("ingredients", [])
        if not ingredients:
            raise ValueError("At least one ingredient is required")
        
        # Validate ingredients
        for ing in ingredients:
            if not ing.get("name"):
                raise ValueError("All ingredients must have a name")
            try:
                quantity = float(ing.get("quantity", 0))
                if quantity <= 0:
                    raise ValueError("All ingredient quantities must be positive numbers")
            except (ValueError, TypeError):
                raise ValueError("All ingredient quantities must be valid numbers")
        
        updated_recipe["nutrition"] = calculate_recipe_nutrition(ingredients)
    
    # Recalculate total time if prep/cook time changed
    if "prep_time_minutes" in recipe_data or "cook_time_minutes" in recipe_data:
        prep_time = updated_recipe.get("prep_time_minutes", 0)
        cook_time = updated_recipe.get("cook_time_minutes", 0)
        updated_recipe["total_time_minutes"] = prep_time + cook_time
    
    # Update in list
    user_recipes[recipe_index] = updated_recipe
    save_user_recipes(user_id, user_recipes)
    
    return updated_recipe

def delete_user_recipe(user_id: str, recipe_id: str) -> bool:
    """Delete a user's recipe (only if user owns it)"""
    user_recipes = load_user_recipes(user_id)
    
    # Find and remove recipe
    original_count = len(user_recipes)
    user_recipes = [r for r in user_recipes if not (r.get("id") == recipe_id and r.get("created_by") == user_id)]
    
    if len(user_recipes) < original_count:
        save_user_recipes(user_id, user_recipes)
        return True
    
    return False

def create_meal_plan(user_id: str, week_start: str, meals: Dict[str, List[Dict[str, Any]]]) -> MealPlan:
    """Create a meal plan"""
    meal_plan = MealPlan(
        id=f"mealplan_{datetime.now().timestamp()}",
        user_id=user_id,
        week_start=week_start,
        meals=meals,
        created_at=datetime.now().isoformat(),
        updated_at=datetime.now().isoformat()
    )
    
    meal_plan_file = f"data/{user_id}/meal_plans.json"
    os.makedirs(os.path.dirname(meal_plan_file), exist_ok=True)
    
    meal_plans = []
    if os.path.exists(meal_plan_file):
        try:
            with open(meal_plan_file, "r") as f:
                meal_plans = json.load(f)
        except:
            pass
    
    meal_plans.append(meal_plan.model_dump())
    with open(meal_plan_file, "w") as f:
        json.dump(meal_plans, f, indent=2)
    
    return meal_plan

def get_meal_plan(user_id: str, week_start: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Get user's meal plan for a week"""
    from datetime import datetime, timedelta
    
    if not week_start:
        today = date.today()
        days_since_monday = today.weekday()
        monday = today - timedelta(days=days_since_monday)
        week_start = monday.isoformat()
    
    meal_plan_file = f"data/{user_id}/meal_plans.json"
    if os.path.exists(meal_plan_file):
        try:
            with open(meal_plan_file, "r") as f:
                meal_plans = json.load(f)
                for plan in meal_plans:
                    if plan.get("week_start") == week_start:
                        return plan
        except:
            pass
    return None

def generate_shopping_list(user_id: str, meal_plan_id: Optional[str] = None, week_start: Optional[str] = None) -> ShoppingList:
    """Generate shopping list from meal plan"""
    meal_plan = None
    if meal_plan_id:
        meal_plan_file = f"data/{user_id}/meal_plans.json"
        if os.path.exists(meal_plan_file):
            try:
                with open(meal_plan_file, "r") as f:
                    meal_plans = json.load(f)
                    meal_plan = next((p for p in meal_plans if p.get("id") == meal_plan_id), None)
            except:
                pass
    elif week_start:
        meal_plan = get_meal_plan(user_id, week_start)
    
    if not meal_plan:
        return ShoppingList(
            id=f"shopping_{datetime.now().timestamp()}",
            user_id=user_id,
            items=[],
            created_at=datetime.now().isoformat(),
            updated_at=datetime.now().isoformat()
        )
    
    # Aggregate ingredients from all recipes in meal plan
    ingredient_map = {}  # {name: {quantity, unit, category}}
    
    for date_str, meals in meal_plan.get("meals", {}).items():
        for meal in meals:
            recipe_id = meal.get("recipe_id")
            servings = meal.get("servings", 1)
            
            if recipe_id:
                recipe = get_recipe(recipe_id)
                if recipe:
                    for ingredient in recipe.get("ingredients", []):
                        name = ingredient.get("name", "")
                        quantity = ingredient.get("quantity", 0) * servings
                        unit = ingredient.get("unit", "")
                        category = ingredient.get("category", "other")
                        
                        if name in ingredient_map:
                            # Aggregate quantities
                            existing = ingredient_map[name]
                            if existing["unit"] == unit:
                                existing["quantity"] += quantity
                            else:
                                # Keep separate if units differ
                                ingredient_map[f"{name} ({unit})"] = {
                                    "quantity": quantity,
                                    "unit": unit,
                                    "category": category
                                }
                        else:
                            ingredient_map[name] = {
                                "quantity": quantity,
                                "unit": unit,
                                "category": category
                            }
    
    # Convert to shopping list items
    items = []
    for name, data in ingredient_map.items():
        items.append({
            "name": name,
            "quantity": round(data["quantity"], 2),
            "unit": data["unit"],
            "category": data["category"],
            "checked": False
        })
    
    # Sort by category
    category_order = ["produce", "dairy", "meat", "pantry", "frozen", "other"]
    items.sort(key=lambda x: (
        category_order.index(x["category"]) if x["category"] in category_order else 999,
        x["name"]
    ))
    
    shopping_list = ShoppingList(
        id=f"shopping_{datetime.now().timestamp()}",
        user_id=user_id,
        meal_plan_id=meal_plan_id,
        items=items,
        created_at=datetime.now().isoformat(),
        updated_at=datetime.now().isoformat()
    )
    
    return shopping_list

def convert_to_grams(quantity: float, unit: str) -> float:
    """Convert quantity to grams based on unit
    
    Supported units:
    - Weight: g, kg, oz, lb
    - Volume: ml, l, cup, tbsp, tsp, fl oz
    - Count: piece, item (assumes 100g per piece/item)
    """
    unit_lower = unit.lower().strip()
    
    # Weight conversions
    if unit_lower in ["g", "gram", "grams"]:
        return quantity
    elif unit_lower in ["kg", "kilogram", "kilograms"]:
        return quantity * 1000.0
    elif unit_lower in ["oz", "ounce", "ounces"]:
        return quantity * 28.35  # 1 oz = 28.35g
    elif unit_lower in ["lb", "lbs", "pound", "pounds"]:
        return quantity * 453.592  # 1 lb = 453.592g
    
    # Volume conversions (approximate, varies by ingredient)
    # Using water density (1ml = 1g) as default
    elif unit_lower in ["ml", "milliliter", "milliliters"]:
        return quantity  # 1ml ≈ 1g for water
    elif unit_lower in ["l", "liter", "liters", "litre", "litres"]:
        return quantity * 1000.0
    elif unit_lower in ["cup", "cups"]:
        return quantity * 240.0  # 1 cup ≈ 240ml ≈ 240g
    elif unit_lower in ["tbsp", "tablespoon", "tablespoons"]:
        return quantity * 15.0  # 1 tbsp ≈ 15ml ≈ 15g
    elif unit_lower in ["tsp", "teaspoon", "teaspoons"]:
        return quantity * 5.0  # 1 tsp ≈ 5ml ≈ 5g
    elif unit_lower in ["fl oz", "fluid ounce", "fluid ounces"]:
        return quantity * 29.57  # 1 fl oz ≈ 29.57ml ≈ 29.57g
    
    # Count-based (assume 100g per piece/item - user should specify weight if known)
    elif unit_lower in ["piece", "pieces", "item", "items", "pcs", "pc"]:
        return quantity * 100.0  # Default assumption
    
    # Unknown unit - assume grams
    else:
        return quantity

def lookup_food_nutrition(food_name: str, food_id: Optional[str] = None) -> Optional[Dict[str, float]]:
    """Look up nutrition information for a food item from the local database
    
    Returns nutrition per 100g, or None if not found
    """
    from .food_database import search_local_database, load_food_database
    
    # Try by food_id first if provided
    if food_id:
        db = load_food_database()
        foods_dict = db.get("foods", {})
        if food_id in foods_dict:
            food = foods_dict[food_id]
            return {
                "calories": food.get("calories", 0.0),
                "protein": food.get("protein", 0.0),
                "carbs": food.get("carbs", 0.0),
                "fats": food.get("fats", 0.0),
                "fiber": food.get("fiber", 0.0),
                "sugar": food.get("sugar", 0.0),
                "sodium": food.get("sodium", 0.0),
                "serving_weight_grams": food.get("serving_weight_grams", 100.0)
            }
    
    # Try searching by name
    results = search_local_database(food_name, limit=5)
    if results:
        # Use first result (should be best match)
        food = results[0]
        return {
            "calories": food.get("calories", 0.0),
            "protein": food.get("protein", 0.0),
            "carbs": food.get("carbs", 0.0),
            "fats": food.get("fats", 0.0),
            "fiber": food.get("fiber", 0.0),
            "sugar": food.get("sugar", 0.0),
            "sodium": food.get("sodium", 0.0),
            "serving_weight_grams": food.get("serving_weight_grams", 100.0)
        }
    
    return None

def calculate_recipe_nutrition(ingredients: List[Dict[str, Any]]) -> Dict[str, float]:
    """Calculate nutrition from ingredients using the food database
    
    Each ingredient should have:
    - name: str (required)
    - quantity: float (required)
    - unit: str (required) - e.g., "g", "oz", "cup", "tbsp", "piece"
    - food_id: str (optional) - for more accurate lookup
    
    Returns total nutrition for the recipe
    """
    total_calories = 0.0
    total_protein = 0.0
    total_carbs = 0.0
    total_fats = 0.0
    total_fiber = 0.0
    total_sugar = 0.0
    total_sodium = 0.0
    
    missing_ingredients = []
    
    for ingredient in ingredients:
        name = ingredient.get("name", "").strip()
        quantity = float(ingredient.get("quantity", 0))
        unit = ingredient.get("unit", "g")
        food_id = ingredient.get("food_id")
        
        if not name or quantity <= 0:
            continue
        
        # Convert quantity to grams
        quantity_grams = convert_to_grams(quantity, unit)
        
        # Look up nutrition per 100g
        nutrition_per_100g = lookup_food_nutrition(name, food_id)
        
        if nutrition_per_100g:
            # Calculate nutrition for this ingredient: (quantity_in_grams / 100) * nutrition_per_100g
            multiplier = quantity_grams / 100.0
            
            total_calories += nutrition_per_100g.get("calories", 0.0) * multiplier
            total_protein += nutrition_per_100g.get("protein", 0.0) * multiplier
            total_carbs += nutrition_per_100g.get("carbs", 0.0) * multiplier
            total_fats += nutrition_per_100g.get("fats", 0.0) * multiplier
            total_fiber += nutrition_per_100g.get("fiber", 0.0) * multiplier
            total_sugar += nutrition_per_100g.get("sugar", 0.0) * multiplier
            total_sodium += nutrition_per_100g.get("sodium", 0.0) * multiplier
        else:
            # Track missing ingredients for debugging
            missing_ingredients.append(name)
    
    result = {
        "calories": round(total_calories, 1),
        "protein": round(total_protein, 1),
        "carbs": round(total_carbs, 1),
        "fats": round(total_fats, 1),
        "fiber": round(total_fiber, 1) if total_fiber > 0 else 0.0,
        "sugar": round(total_sugar, 1) if total_sugar > 0 else 0.0,
        "sodium": round(total_sodium, 1) if total_sodium > 0 else 0.0
    }
    
    # Add metadata about missing ingredients (for debugging/UI feedback)
    if missing_ingredients:
        result["_missing_ingredients"] = missing_ingredients
    
    return result

