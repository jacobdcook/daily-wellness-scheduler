"""
Local Food Database - Caches food search results locally
"""
import json
import os
from typing import List, Dict, Optional, Any
from datetime import datetime
import time

FOOD_DB_FILE = "data/food_database.json"

# In-memory cache to avoid reloading large JSON files on every request
_db_cache: Optional[Dict[str, Any]] = None
_db_cache_timestamp: float = 0
_db_cache_ttl: float = 60.0  # Cache for 60 seconds (refresh if file modified)

def load_food_database(force_reload: bool = False) -> Dict[str, Any]:
    """Load the local food database with in-memory caching for performance"""
    global _db_cache, _db_cache_timestamp
    
    if not os.path.exists(FOOD_DB_FILE):
        return {"foods": {}, "last_updated": None}
    
    # Check if we should use cache
    if not force_reload and _db_cache is not None:
        file_mtime = os.path.getmtime(FOOD_DB_FILE)
        if time.time() - _db_cache_timestamp < _db_cache_ttl and file_mtime <= _db_cache_timestamp:
            return _db_cache
    
    # Load from disk
    try:
        with open(FOOD_DB_FILE, "r", encoding="utf-8") as f:
            _db_cache = json.load(f)
            _db_cache_timestamp = time.time()
            return _db_cache
    except (json.JSONDecodeError, ValueError) as e:
        # Database is corrupted - try to recover or return empty
        print(f"⚠️  Food database file is corrupted (JSON error): {e}")
        print(f"   Attempting to recover by creating backup and resetting...")
        try:
            # Create backup of corrupted file
            import shutil
            backup_file = FOOD_DB_FILE + ".corrupted_backup"
            if os.path.exists(FOOD_DB_FILE):
                shutil.copy2(FOOD_DB_FILE, backup_file)
                print(f"   Created backup: {backup_file}")
            # Reset to empty database
            _db_cache = {"foods": {}, "last_updated": None}
            save_food_database(_db_cache)
            print(f"   Reset food database to empty state")
        except Exception as backup_error:
            print(f"   Failed to create backup: {backup_error}")
        return {"foods": {}, "last_updated": None}
    except Exception as e:
        print(f"Error loading food database: {e}")
        return {"foods": {}, "last_updated": None}

def save_food_database(db: Dict[str, Any]):
    """Save the local food database and update cache"""
    global _db_cache, _db_cache_timestamp
    os.makedirs(os.path.dirname(FOOD_DB_FILE), exist_ok=True)
    try:
        with open(FOOD_DB_FILE, "w", encoding="utf-8") as f:
            json.dump(db, f, indent=2, ensure_ascii=False)
        # Update cache
        _db_cache = db
        _db_cache_timestamp = time.time()
    except Exception as e:
        print(f"Error saving food database: {e}")

def search_local_database(query: str, limit: int = 15) -> List[Dict[str, Any]]:
    """Search the local food database - prioritizes exact matches
    
    Optimized for large databases:
    - Uses O(1) dictionary lookups for exact matches
    - Limits iteration to avoid scanning millions of items
    - Early termination when enough results found
    """
    db = load_food_database()
    foods_dict = db.get("foods", {})
    
    if not foods_dict:
        return []
    
    query_lower = query.lower().strip()
    exact_matches = []
    starts_with_matches = []
    contains_matches = []
    word_matches = []
    seen_ids = set()  # Track seen food IDs to avoid duplicates
    
    # Helper to check if food name matches query exactly (handles singular/plural)
    def is_exact_match(food_name: str, query: str) -> bool:
        food_lower = food_name.lower().strip()
        query_lower = query.lower().strip()
        if food_lower == query_lower:
            return True
        # Check singular/plural variations
        if query_lower.endswith('s') and food_lower == query_lower[:-1]:
            return True
        if not query_lower.endswith('s') and food_lower == query_lower + 's':
            return True
        return False
    
    # Strategy 1: Exact match by query term key (highest priority, O(1) lookup)
    if query_lower in foods_dict:
        food = foods_dict[query_lower]
        food_id = food.get("id", "")
        if food_id and food_id not in seen_ids:
            exact_matches.append(food)
            seen_ids.add(food_id)
    
    # Strategy 2: Exact match by food name (case-insensitive, including singular/plural)
    # OPTIMIZATION: Limit iteration to avoid scanning millions of items
    # Only iterate if we don't have enough exact matches yet
    max_iterations = 10000  # Limit to first 10k items for performance
    items_checked = 0
    
    if len(exact_matches) < limit:
        for food_key, food_data in foods_dict.items():
            items_checked += 1
            if items_checked > max_iterations:
                break  # Stop after checking reasonable number of items
                
            if food_key.startswith("word_") or food_key.startswith("id_"):  # Skip index entries
                continue
            
            food_id = food_data.get("id", "")
            if food_id in seen_ids:
                continue
            
            # Check the actual food name field, not just the dictionary key
            food_name = food_data.get("name", food_key)  # Fallback to key if name missing
            food_name_lower = food_name.lower().strip()
            
            # Exact match (highest priority) - including singular/plural variations
            if is_exact_match(food_name, query_lower):
                exact_matches.append(food_data)
                seen_ids.add(food_id)
            # Starts with query (high priority) - e.g., "Banana bread" for query "banana"
            elif food_name_lower.startswith(query_lower + " ") or food_name_lower.startswith(query_lower + ","):
                starts_with_matches.append(food_data)
                seen_ids.add(food_id)
            # Contains query as whole word (medium-high priority)
            elif f" {query_lower} " in f" {food_name_lower} " or food_name_lower.startswith(query_lower) or food_name_lower.endswith(" " + query_lower):
                contains_matches.append(food_data)
                seen_ids.add(food_id)
            
            # Early termination if we have enough results
            if len(exact_matches) + len(starts_with_matches) + len(contains_matches) >= limit * 2:
                break
    
    # Strategy 3: Word matches (lower priority) - only if we don't have enough results
    if len(exact_matches) + len(starts_with_matches) + len(contains_matches) < limit:
        query_words = [w for w in query_lower.split() if len(w) > 2]
        for word in query_words:
            word_key = f"word_{word}"
            if word_key in foods_dict:
                food_data = foods_dict[word_key]
                food_id = food_data.get("id", "")
                if food_id not in seen_ids:
                    word_matches.append(food_data)
                    seen_ids.add(food_id)
                    if len(exact_matches) + len(starts_with_matches) + len(contains_matches) + len(word_matches) >= limit:
                        break
    
    # Sort exact matches to prioritize simpler names (shorter, fewer words, no brand)
    def sort_key(food):
        name = food.get("name", "").lower()
        brand = food.get("brand", "")
        # Prefer: shorter names, fewer words, no brand, then alphabetically
        word_count = len(name.split())
        has_brand = bool(brand)
        return (word_count, has_brand, name)
    
    exact_matches.sort(key=sort_key)
    starts_with_matches.sort(key=sort_key)
    contains_matches.sort(key=sort_key)
    
    # Combine results in priority order: exact > starts with > contains > word matches
    results = exact_matches + starts_with_matches + contains_matches + word_matches
    return results[:limit]

def add_food_to_database(query: str, foods: List[Dict[str, Any]]):
    """Add foods to the local database - automatically caches all search results"""
    if not foods:
        return
    
    db = load_food_database()
    foods_dict = db.get("foods", {})
    
    query_lower = query.lower().strip()
    
    # Add each food with multiple keys for better searchability
    for food in foods:
        food_name = food.get("name", "").lower().strip()
        food_id = food.get("id", "")
        
        if not food_name:
            continue
        
        # Store by food name (most common searches) - always update if we have better data
        if food_name not in foods_dict or food.get("calories", 0) > 0:
            foods_dict[food_name] = food
        
        # Store by query term for better matching
        # Prioritize simple/exact matches: if food name exactly matches query, always store it
        # Otherwise, only store if the key doesn't exist (don't overwrite better matches)
        if query_lower:
            is_exact_match = (
                food_name == query_lower or
                food_name == query_lower + "s" or
                (query_lower.endswith('s') and food_name == query_lower[:-1])
            )
            
            if is_exact_match:
                # Always store exact matches (they're the best result for this query)
                foods_dict[query_lower] = food
            elif query_lower not in foods_dict:
                # Only store if key doesn't exist (don't overwrite potential exact matches)
                foods_dict[query_lower] = food
        
        # Store by food ID for deduplication
        if food_id:
            if food_id not in foods_dict or food.get("calories", 0) > 0:
                foods_dict[food_id] = food
        
        # Also store by individual words in the food name for partial matching
        food_words = food_name.split()
        for word in food_words:
            if len(word) > 3:  # Only index words longer than 3 characters
                word_key = f"word_{word}"
                if word_key not in foods_dict:
                    foods_dict[word_key] = food
    
    db["foods"] = foods_dict
    db["last_updated"] = datetime.now().isoformat()
    save_food_database(db)
    
    # Log cache addition (only occasionally to avoid spam)
    import random
    if random.random() < 0.1:  # 10% chance to log
        print(f"💾 Cached {len(foods)} food(s) for query: '{query}' (Total in DB: {len(foods_dict)})")

def search_food_by_barcode(barcode: str) -> Optional[Dict[str, Any]]:
    """Search for food by barcode in local database and Open Food Facts"""
    db = load_food_database()
    foods_dict = db.get("foods", {})
    
    # First, try to find in local database by barcode
    # Barcodes might be stored as keys or in food data
    if barcode in foods_dict:
        food = foods_dict[barcode]
        if isinstance(food, dict) and food.get("calories", 0) > 0:
            return food
    
    # Search through all foods for barcode match
    for food_id, food in foods_dict.items():
        if isinstance(food, dict):
            # Check if barcode matches
            if food.get("barcode") == barcode or food.get("id") == barcode:
                return food
    
    # If not found locally, try Open Food Facts API
    try:
        import requests
        url = f"https://world.openfoodfacts.org/api/v0/product/{barcode}.json"
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            data = response.json()
            if data.get("status") == 1 and data.get("product"):
                product = data["product"]
                
                # Extract nutrition data
                nutriments = product.get("nutriments", {})
                calories = nutriments.get("energy-kcal_100g") or nutriments.get("energy_100g", 0) / 4.184
                protein = nutriments.get("proteins_100g", 0)
                carbs = nutriments.get("carbohydrates_100g", 0)
                fats = nutriments.get("fat_100g", 0)
                
                food_data = {
                    "id": barcode,
                    "barcode": barcode,
                    "name": product.get("product_name", "Unknown Product"),
                    "brand": product.get("brands", "").split(",")[0] if product.get("brands") else None,
                    "calories": round(calories, 1) if calories else 0,
                    "protein": round(protein, 1) if protein else 0,
                    "carbs": round(carbs, 1) if carbs else 0,
                    "fats": round(fats, 1) if fats else 0,
                    "fiber": round(nutriments.get("fiber_100g", 0), 1) if nutriments.get("fiber_100g") else None,
                    "sugar": round(nutriments.get("sugars_100g", 0), 1) if nutriments.get("sugars_100g") else None,
                    "sodium": round(nutriments.get("sodium_100g", 0) * 1000, 1) if nutriments.get("sodium_100g") else None,
                    "serving_size": 100,  # Default to 100g
                    "serving_unit": "g",
                    "source": "openfoodfacts"
                }
                
                # Cache it in local database
                foods_dict[barcode] = food_data
                foods_dict[food_data["name"].lower()] = food_data
                db["foods"] = foods_dict
                save_food_database(db)
                
                return food_data
    except Exception as e:
        print(f"Error searching Open Food Facts for barcode {barcode}: {e}")
    
    return None

def get_database_stats() -> Dict[str, Any]:
    """Get statistics about the local database"""
    db = load_food_database()
    foods_dict = db.get("foods", {})
    return {
        "total_foods": len(foods_dict),
        "last_updated": db.get("last_updated"),
        "size_mb": os.path.getsize(FOOD_DB_FILE) / (1024 * 1024) if os.path.exists(FOOD_DB_FILE) else 0
    }

