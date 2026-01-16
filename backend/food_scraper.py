"""
Background Food Scraper - Slowly builds up local food database
Runs in background to populate the food database with common foods
"""
import json
import os
import time
import requests
from typing import List, Dict
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

from .food_database import load_food_database, save_food_database, add_food_to_database

# Common foods to scrape
COMMON_FOODS = [
    # Fruits
    "apple", "banana", "orange", "strawberry", "blueberry", "grape", "watermelon", "pineapple",
    "mango", "peach", "pear", "cherry", "kiwi", "avocado", "lemon", "lime",
    
    # Vegetables
    "broccoli", "carrot", "spinach", "lettuce", "tomato", "cucumber", "bell pepper", "onion",
    "garlic", "potato", "sweet potato", "corn", "peas", "green beans", "asparagus", "zucchini",
    
    # Proteins
    "chicken breast", "chicken thigh", "ground beef", "steak", "pork", "salmon", "tuna", "shrimp",
    "eggs", "tofu", "tempeh", "lentils", "black beans", "chickpeas", "kidney beans",
    
    # Grains & Carbs
    "rice", "brown rice", "quinoa", "oats", "oatmeal", "pasta", "bread", "whole wheat bread",
    "bagel", "tortilla", "potato", "sweet potato", "corn", "barley", "bulgur",
    
    # Dairy
    "milk", "almond milk", "soy milk", "yogurt", "greek yogurt", "cheese", "cheddar cheese",
    "mozzarella", "cottage cheese", "butter", "cream cheese",
    
    # Nuts & Seeds
    "almonds", "walnuts", "peanuts", "peanut butter", "cashews", "pistachios", "chia seeds",
    "flax seeds", "sunflower seeds", "pumpkin seeds",
    
    # Snacks & Sweets
    "chocolate", "brownies", "cookies", "chips", "popcorn", "crackers", "granola bar",
    "protein bar", "ice cream", "yogurt", "trail mix",
    
    # Beverages
    "coffee", "tea", "orange juice", "apple juice", "cranberry juice", "soda", "water",
    
    # Common meals
    "pizza", "burger", "sandwich", "salad", "soup", "stir fry", "pasta", "rice bowl",
]

def scrape_edamam(food_name: str) -> List[Dict]:
    """Scrape food from Edamam API"""
    edamam_app_id = os.getenv("EDAMAM_APP_ID")
    edamam_app_key = os.getenv("EDAMAM_APP_KEY")
    
    if not edamam_app_id or not edamam_app_key:
        return []
    
    try:
        url = "https://api.edamam.com/api/food-database/v2/parser"
        params = {
            "q": food_name,
            "app_id": edamam_app_id,
            "app_key": edamam_app_key,
            "limit": 5
        }
        
        response = requests.get(url, params=params, timeout=8)
        if response.status_code == 200:
            data = response.json()
            hints = data.get("hints", [])
            
            foods = []
            for item in hints[:3]:  # Take top 3
                food = item.get("food", {})
                nutrients = food.get("nutrients", {})
                
                foods.append({
                    "id": food.get("foodId", "") or f"edamam_{hash(food.get('label', ''))}",
                    "name": food.get("label", ""),
                    "brand": food.get("brand"),
                    "serving_size": "100g",
                    "serving_weight_grams": 100.0,
                    "calories": round(nutrients.get("ENERC_KCAL", 0), 1),
                    "protein": round(nutrients.get("PROCNT", 0), 1),
                    "carbs": round(nutrients.get("CHOCDF", 0), 1),
                    "fats": round(nutrients.get("FAT", 0), 1),
                    "fiber": round(nutrients.get("FIBTG", 0), 1) if nutrients.get("FIBTG") else None,
                    "sugar": round(nutrients.get("SUGAR", 0), 1) if nutrients.get("SUGAR") else None,
                    "sodium": round(nutrients.get("NA", 0), 1) if nutrients.get("NA") else None,
                    "source": "edamam"
                })
            
            return foods
    except Exception as e:
        print(f"Error scraping {food_name} from Edamam: {e}")
    
    return []

def scrape_openfoodfacts(food_name: str) -> List[Dict]:
    """Scrape food from Open Food Facts"""
    try:
        url = "https://world.openfoodfacts.org/cgi/search.pl"
        params = {
            "search_terms": food_name,
            "search_simple": 1,
            "action": "process",
            "json": 1,
            "page_size": 5,
            "page": 1
        }
        
        response = requests.get(url, params=params, timeout=8)
        if response.status_code == 200:
            data = response.json()
            products = data.get("products", [])
            
            foods = []
            for item in products[:3]:  # Take top 3
                nutriments = item.get("nutriments", {})
                product_name = item.get("product_name", "") or item.get("product_name_en", "") or food_name
                
                calories = nutriments.get("energy-kcal_100g") or nutriments.get("energy-kcal") or 0
                protein = nutriments.get("proteins_100g") or nutriments.get("proteins") or 0
                
                if calories > 0 or protein > 0:
                    foods.append({
                        "id": item.get("code", "") or f"off_{hash(product_name)}",
                        "name": product_name,
                        "brand": item.get("brands", "").split(",")[0] if item.get("brands") else None,
                        "serving_size": "100g",
                        "serving_weight_grams": 100.0,
                        "calories": round(calories, 1) if calories else 0,
                        "protein": round(protein, 1) if protein else 0,
                        "carbs": round(nutriments.get("carbohydrates_100g", 0) or nutriments.get("carbohydrates", 0), 1),
                        "fats": round(nutriments.get("fat_100g", 0) or nutriments.get("fat", 0), 1),
                        "fiber": round(nutriments.get("fiber_100g", 0) or nutriments.get("fiber", 0), 1) if nutriments.get("fiber_100g") or nutriments.get("fiber") else None,
                        "sugar": round(nutriments.get("sugars_100g", 0) or nutriments.get("sugars", 0), 1) if nutriments.get("sugars_100g") or nutriments.get("sugars") else None,
                        "sodium": round(nutriments.get("sodium_100g", 0) or (nutriments.get("sodium", 0) / 1000 if nutriments.get("sodium") else 0), 1) if nutriments.get("sodium_100g") or nutriments.get("sodium") else None,
                        "source": "openfoodfacts"
                    })
            
            return foods
    except Exception as e:
        print(f"Error scraping {food_name} from Open Food Facts: {e}")
    
    return []

def scrape_food(food_name: str) -> bool:
    """Scrape a single food from APIs and add to database"""
    db = load_food_database()
    foods_dict = db.get("foods", {})
    
    # Skip if already in database
    if food_name.lower() in foods_dict:
        return False
    
    # Try Edamam first
    foods = scrape_edamam(food_name)
    
    # If no results, try Open Food Facts
    if not foods:
        foods = scrape_openfoodfacts(food_name)
    
    # Add to database if we got results
    if foods:
        add_food_to_database(food_name, foods)
        print(f"✅ Scraped and cached: {food_name} ({len(foods)} results)")
        return True
    else:
        print(f"❌ No results for: {food_name}")
        return False

def scrape_common_foods(limit: int = 10, delay: float = 2.0):
    """Scrape common foods in the background (respects rate limits)"""
    print(f"🍽️  Starting food scraper - will scrape {limit} foods with {delay}s delay between requests...")
    
    scraped = 0
    skipped = 0
    
    for food_name in COMMON_FOODS:
        if scraped >= limit:
            break
        
        if scrape_food(food_name):
            scraped += 1
        else:
            skipped += 1
        
        # Delay to respect rate limits
        if scraped < limit:
            time.sleep(delay)
    
    print(f"✅ Scraping complete: {scraped} new foods added, {skipped} skipped (already in database)")

if __name__ == "__main__":
    # Run scraper - scrape 20 foods with 2 second delay
    scrape_common_foods(limit=20, delay=2.0)

