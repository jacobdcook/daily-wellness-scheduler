"""
Download and Import Open Food Facts Database
This script downloads the Open Food Facts database and imports it into our local food database.
Run this periodically (weekly/monthly) to keep the database updated.

Usage:
    python -m backend.download_openfoodfacts [--limit 1000] [--update-only]
"""
import json
import os
import sys
import gzip
import requests
from typing import Dict, List, Any
from datetime import datetime
import argparse

# Try to import tqdm for progress bars, but make it optional
try:
    from tqdm import tqdm
    HAS_TQDM = True
except ImportError:
    HAS_TQDM = False
    # Simple progress bar replacement
    def tqdm(iterable, **kwargs):
        return iterable

from .food_database import load_food_database, save_food_database, add_food_to_database

# Open Food Facts download URLs
# Try multiple possible URLs as they may change
OFF_PRODUCTS_URLS = [
    "https://static.openfoodfacts.org/data/openfoodfacts-products.jsonl.gz",  # Main JSONL export
    "https://static.openfoodfacts.org/data/en.openfoodfacts.org.products.jsonl.gz",  # English-only (if exists)
]

def download_file(url: str, output_path: str, chunk_size: int = 8192):
    """Download a file with progress bar"""
    print(f"Downloading {url}...")
    response = requests.get(url, stream=True, timeout=30, allow_redirects=True)
    
    # Check if we got an error page
    if response.status_code != 200:
        raise Exception(f"Download failed with status {response.status_code}: {response.text[:200]}")
    
    # Check content type - should be gzip or octet-stream
    content_type = response.headers.get('content-type', '').lower()
    if 'html' in content_type:
        # We got HTML instead of the file - check first few bytes
        first_bytes = response.content[:100]
        if b'<html' in first_bytes.lower() or b'<!doctype' in first_bytes.lower():
            raise Exception(f"Server returned HTML instead of gzipped file. URL might be wrong or file doesn't exist. Response: {first_bytes.decode('utf-8', errors='ignore')[:200]}")
    
    total_size = int(response.headers.get('content-length', 0))
    
    if HAS_TQDM:
        with open(output_path, 'wb') as f, tqdm(
            desc=os.path.basename(output_path),
            total=total_size,
            unit='B',
            unit_scale=True,
            unit_divisor=1024,
        ) as bar:
            for chunk in response.iter_content(chunk_size=chunk_size):
                if chunk:
                    f.write(chunk)
                    bar.update(len(chunk))
    else:
        print(f"Downloading {os.path.basename(output_path)} ({total_size / 1024 / 1024:.1f} MB)...")
        with open(output_path, 'wb') as f:
            downloaded = 0
            for chunk in response.iter_content(chunk_size=chunk_size):
                if chunk:
                    f.write(chunk)
                    downloaded += len(chunk)
                    if downloaded % (10 * 1024 * 1024) == 0:  # Print every 10MB
                        print(f"  Downloaded {downloaded / 1024 / 1024:.1f} MB...")
    
    # Verify it's actually a gzipped file
    try:
        with gzip.open(output_path, 'rb') as test_file:
            test_file.read(1)  # Try to read first byte
        print(f"✅ Downloaded and verified: {output_path}")
    except Exception as e:
        # Check if it's HTML
        with open(output_path, 'rb') as f:
            first_bytes = f.read(100)
            if b'<html' in first_bytes.lower() or b'<!doctype' in first_bytes.lower():
                os.remove(output_path)
                raise Exception(f"Downloaded file is HTML, not gzip. URL might be wrong. First 200 chars: {first_bytes.decode('utf-8', errors='ignore')[:200]}")
        raise Exception(f"Downloaded file is not a valid gzip file: {e}")
    
    print(f"Downloaded to {output_path}")

def process_off_product(product: Dict[str, Any]) -> Dict[str, Any] | None:
    """Convert Open Food Facts product to our food format"""
    # Skip if no nutrition data
    nutriments = product.get("nutriments", {})
    if not nutriments:
        return None
    
    # Get product name
    product_name = (
        product.get("product_name") or 
        product.get("product_name_en") or 
        product.get("product_name_fr") or 
        product.get("product_name_de") or
        product.get("product_name_es") or
        ""
    )
    
    if not product_name:
        return None
    
    # Extract nutrition values (per 100g)
    calories = nutriments.get("energy-kcal_100g") or nutriments.get("energy-kcal") or 0
    protein = nutriments.get("proteins_100g") or nutriments.get("proteins") or 0
    carbs = nutriments.get("carbohydrates_100g") or nutriments.get("carbohydrates") or 0
    fats = nutriments.get("fat_100g") or nutriments.get("fat") or 0
    
    # Skip if no meaningful nutrition data
    if calories == 0 and protein == 0:
        return None
    
    # Get brand
    brands = product.get("brands", "")
    brand = brands.split(",")[0].strip() if brands else None
    
    # Get serving size
    serving_size = product.get("serving_size", "100g")
    
    # Extract health scoring data (Yuka-like features)
    nutri_score_grade = product.get("nutriscore_grade", "").upper() if product.get("nutriscore_grade") else None
    nova_group = product.get("nova_group", 0) if product.get("nova_group") else None
    additives_tags = product.get("additives_tags", []) or []
    additives_original_tags = product.get("additives_original_tags", []) or []
    ingredients_text = product.get("ingredients_text", "") or product.get("ingredients_text_en", "") or ""
    ingredients_analysis_tags = product.get("ingredients_analysis_tags", []) or []
    ecoscore_grade = product.get("ecoscore_grade", "").upper() if product.get("ecoscore_grade") else None
    
    # Combine additives (prefer original tags, fallback to processed tags)
    all_additives = additives_original_tags if additives_original_tags else additives_tags
    
    return {
        "id": product.get("code", "") or f"off_{hash(product_name)}",
        "name": product_name,
        "brand": brand,
        "serving_size": serving_size,
        "serving_weight_grams": 100.0,  # Open Food Facts data is per 100g
        "calories": round(calories, 1) if calories else 0,
        "protein": round(protein, 1) if protein else 0,
        "carbs": round(carbs, 1) if carbs else 0,
        "fats": round(fats, 1) if fats else 0,
        "fiber": round(nutriments.get("fiber_100g", 0), 1) if nutriments.get("fiber_100g") else None,
        "sugar": round(nutriments.get("sugars_100g", 0), 1) if nutriments.get("sugars_100g") else None,
        "sodium": round(nutriments.get("sodium_100g", 0), 1) if nutriments.get("sodium_100g") else None,
        # Health scoring data (Yuka-like features)
        "nutri_score": nutri_score_grade,  # A, B, C, D, E
        "nova_group": nova_group,  # 1-4 (1=unprocessed, 4=ultra-processed)
        "additives": all_additives,  # List of additive tags
        "ingredients_text": ingredients_text,  # Full ingredient list
        "ingredients_analysis": ingredients_analysis_tags,  # Tags like "en:vegan", "en:palm-oil-free"
        "ecoscore": ecoscore_grade,  # A-E environmental score
        "source": "openfoodfacts_import",
        "imported_at": datetime.now().isoformat()
    }

def import_from_api(limit: int = 1000, update_only: bool = False):
    """Import foods from Open Food Facts API (more reliable than bulk download)"""
    print(f"Importing {limit} products from Open Food Facts API...")
    print("Note: This uses their search API, which is slower but more reliable.")
    
    db = load_food_database()
    foods_dict = db.get("foods", {})
    initial_count = len(foods_dict)
    
    imported = 0
    skipped = 0
    errors = 0
    
    # Common search terms to get diverse products
    # This list covers most common foods people search for
    search_terms = [
        # Fruits
        "banana", "apple", "orange", "strawberry", "grape", "blueberry", "mango", "pineapple",
        "peach", "pear", "cherry", "watermelon", "kiwi", "avocado", "lemon", "lime",
        # Vegetables
        "broccoli", "carrot", "spinach", "tomato", "lettuce", "cucumber", "pepper", "onion",
        "potato", "sweet potato", "corn", "peas", "green beans", "asparagus", "mushroom", "zucchini",
        # Proteins
        "chicken", "beef", "pork", "turkey", "salmon", "tuna", "shrimp", "egg",
        "tofu", "lentils", "beans", "chickpeas", "black beans", "kidney beans",
        # Grains & Carbs
        "rice", "pasta", "bread", "quinoa", "oats", "barley", "wheat", "noodles",
        "waffle", "pancake", "bagel", "tortilla", "cereal", "granola",
        # Dairy
        "milk", "cheese", "yogurt", "butter", "cream", "cottage cheese", "sour cream",
        # Nuts & Seeds
        "almonds", "peanuts", "walnuts", "cashews", "peanut butter", "almond butter",
        # Snacks & Sweets
        "chocolate", "cookies", "crackers", "chips", "popcorn", "nuts", "trail mix",
        "ice cream", "yogurt", "protein bar", "energy bar",
        # Beverages
        "soda", "juice", "coffee", "tea", "water", "sports drink", "smoothie",
        # Meals & Prepared
        "pizza", "burger", "sandwich", "soup", "salad", "stir fry", "curry", "pasta sauce",
        # Condiments & Oils
        "olive oil", "vegetable oil", "mayonnaise", "ketchup", "mustard", "soy sauce",
        # Other common items
        "honey", "maple syrup", "jam", "jelly", "peanut butter", "hummus", "salsa"
    ]
    
    # Expand search terms to get more products
    counter = 1
    while len(search_terms) < limit // 20:  # ~20 products per search term
        search_terms.extend([f"food {counter}", f"product {counter}"])
        counter += 1
    
    for term in tqdm(search_terms[:limit // 20], desc="Searching products"):
        if imported >= limit:
            break
        
        try:
            # Use Open Food Facts search API
            url = "https://world.openfoodfacts.org/cgi/search.pl"
            params = {
                "search_terms": term,
                "search_simple": 1,
                "action": "process",
                "json": 1,
                "page_size": 20,
                "page": 1
            }
            
            response = requests.get(url, params=params, timeout=10)
            if response.status_code != 200:
                errors += 1
                continue
            
            data = response.json()
            products = data.get("products", [])
            
            for product in products:
                if imported >= limit:
                    break
                
                food = process_off_product(product)
                if not food:
                    skipped += 1
                    continue
                
                food_name_lower = food["name"].lower().strip()
                
                # Skip if already exists and update_only is True
                if update_only and food_name_lower in foods_dict:
                    skipped += 1
                    continue
                
                # Store by food name
                foods_dict[food_name_lower] = food
                
                # Also store by product code if available
                if food["id"] and not food["id"].startswith("off_"):
                    foods_dict[food["id"]] = food
                
                imported += 1
                
                # Save periodically
                if imported % 100 == 0:
                    db["foods"] = foods_dict
                    db["last_updated"] = datetime.now().isoformat()
                    save_food_database(db)
            
            # Be nice to the API
            import time
            time.sleep(0.5)  # 500ms delay between requests
            
        except Exception as e:
            errors += 1
            if errors < 10:
                print(f"  Error searching '{term}': {e}")
            continue
    
    # Final save
    db["foods"] = foods_dict
    db["last_updated"] = datetime.now().isoformat()
    save_food_database(db)
    
    final_count = len(foods_dict)
    new_items = final_count - initial_count
    
    print(f"\n✅ Import complete!")
    print(f"   Imported: {imported} products")
    print(f"   Skipped: {skipped} products")
    print(f"   Errors: {errors}")
    print(f"   Database size: {initial_count} → {final_count} (+{new_items})")

def import_jsonl_file(file_path: str, limit: int = None, update_only: bool = False, resume: bool = True):
    """Import Open Food Facts JSONL file into local database"""
    print(f"Importing from {file_path}...")
    
    # Verify file is actually gzipped before trying to open it
    try:
        with open(file_path, 'rb') as test_file:
            magic = test_file.read(2)
            if magic != b'\x1f\x8b':  # Gzip magic number
                # Check if it's HTML
                test_file.seek(0)
                first_bytes = test_file.read(100)
                if b'<html' in first_bytes.lower() or b'<!doctype' in first_bytes.lower():
                    raise Exception(f"File appears to be HTML, not gzip. The download may have failed. Please delete {file_path} and try downloading again.")
                raise Exception(f"File is not a valid gzip file (magic: {magic}). Please delete {file_path} and try downloading again.")
    except Exception as e:
        if "not a valid gzip file" in str(e) or "HTML" in str(e):
            print(f"❌ {e}")
            response = input(f"Delete invalid file {file_path}? (y/n): ")
            if response.lower() == 'y':
                os.remove(file_path)
                print(f"Deleted {file_path}")
        raise
    
    db = load_food_database()
    foods_dict = db.get("foods", {})
    initial_count = len(foods_dict)
    
    # Check for resume position
    progress_file = file_path + ".progress"
    start_line = 0
    if resume and os.path.exists(progress_file):
        try:
            with open(progress_file, 'r') as pf:
                progress_data = json.load(pf)
                start_line = progress_data.get("last_line", 0)
                if start_line > 0:
                    print(f"📌 Resuming from line {start_line:,} (found progress file)")
        except:
            pass
    
    imported = 0
    skipped_no_nutrition = 0  # Products with no nutrition data
    skipped_exists = 0  # Products already in database
    errors = 0
    
    # Open gzipped file
    print(f"Starting import... (This may take a while - processing millions of products)")
    print(f"Current database has {initial_count:,} products")
    if start_line > 0:
        print(f"Skipping first {start_line:,} lines (already processed)")
    print(f"Progress will be shown every 10,000 lines OR every 30 seconds (whichever comes first)")
    print(f"Starting now...")
    sys.stdout.flush()  # Ensure output is visible immediately
    print()
    
    line_num = start_line  # Initialize in case of early error
    try:
        with gzip.open(file_path, 'rt', encoding='utf-8') as f:
            last_progress_time = datetime.now()
            for line_num, line in enumerate(tqdm(f, desc="Processing products", initial=start_line)):
                # Skip lines we've already processed
                if line_num < start_line:
                    continue
                if limit and imported >= limit:
                    break
                
                # Show progress every 10,000 lines OR every 30 seconds (whichever comes first)
                current_time = datetime.now()
                time_since_last_progress = (current_time - last_progress_time).total_seconds()
                should_show_progress = (line_num + 1) % 10000 == 0 or time_since_last_progress >= 30
                
                try:
                    product = json.loads(line.strip())
                    food = process_off_product(product)
                    
                    if not food:
                        skipped_no_nutrition += 1
                        if should_show_progress:
                            total_skipped = skipped_no_nutrition + skipped_exists
                            print(f"  Line {line_num + 1:,} | Imported: {imported} | No nutrition: {skipped_no_nutrition:,} | Already exists: {skipped_exists:,} | Errors: {errors}")
                            sys.stdout.flush()
                            last_progress_time = current_time
                        continue
                    
                    # Add to database using our existing function
                    # This handles deduplication and indexing
                    food_name_lower = food["name"].lower().strip()
                    
                    # Skip if already exists and update_only is True
                    if update_only and food_name_lower in foods_dict:
                        skipped_exists += 1
                        if should_show_progress:
                            total_skipped = skipped_no_nutrition + skipped_exists
                            print(f"  Line {line_num + 1:,} | Imported: {imported} | No nutrition: {skipped_no_nutrition:,} | Already exists: {skipped_exists:,} | Errors: {errors}")
                            sys.stdout.flush()
                            last_progress_time = current_time
                        continue
                    
                    # Store by food name
                    foods_dict[food_name_lower] = food
                    
                    # Also store by product code if available
                    if food["id"] and food["id"].startswith("off_"):
                        foods_dict[food["id"]] = food
                    
                    imported += 1
                    
                    # Save periodically (every 1000 items)
                    if imported % 1000 == 0:
                        db["foods"] = foods_dict
                        db["last_updated"] = datetime.now().isoformat()
                        save_food_database(db)
                        print(f"  ✅ Saved {imported} new products | Line {line_num + 1:,} | Total in DB: {len(foods_dict):,}")
                        sys.stdout.flush()
                    
                    # Show progress every 10,000 lines or every 30 seconds
                    if should_show_progress:
                        total_skipped = skipped_no_nutrition + skipped_exists
                        print(f"  Line {line_num + 1:,} | Imported: {imported} | No nutrition: {skipped_no_nutrition:,} | Already exists: {skipped_exists:,} | Errors: {errors}")
                        sys.stdout.flush()  # Ensure output is visible immediately
                        last_progress_time = current_time
                    
                    # Save progress every 10,000 lines (for resume capability)
                    if (line_num + 1) % 10000 == 0:
                        # Save progress file
                        progress_data = {
                            "last_line": line_num + 1,
                            "imported": imported,
                            "skipped_no_nutrition": skipped_no_nutrition,
                            "skipped_exists": skipped_exists,
                            "errors": errors,
                            "timestamp": datetime.now().isoformat()
                        }
                        with open(progress_file, 'w') as pf:
                            json.dump(progress_data, pf)
                        
                except json.JSONDecodeError:
                    errors += 1
                    if should_show_progress:
                        total_skipped = skipped_no_nutrition + skipped_exists
                        print(f"  Line {line_num + 1:,} | Imported: {imported} | No nutrition: {skipped_no_nutrition:,} | Already exists: {skipped_exists:,} | Errors: {errors}")
                        sys.stdout.flush()
                        last_progress_time = current_time
                    continue
                except Exception as e:
                    errors += 1
                    if errors < 10:  # Only print first 10 errors
                        print(f"  Error on line {line_num}: {e}")
                        sys.stdout.flush()
                    if should_show_progress:
                        total_skipped = skipped_no_nutrition + skipped_exists
                        print(f"  Line {line_num + 1:,} | Imported: {imported} | No nutrition: {skipped_no_nutrition:,} | Already exists: {skipped_exists:,} | Errors: {errors}")
                        sys.stdout.flush()
                        last_progress_time = current_time
                    continue
    
    except (EOFError, gzip.BadGzipFile) as e:
        # File is corrupted or incomplete - save progress and inform user
        print(f"\n⚠️  WARNING: File appears to be corrupted or incomplete at line {line_num + 1:,}")
        print(f"   Error: {e}")
        print(f"   Progress saved: {imported} imported, {skipped_no_nutrition + skipped_exists:,} skipped")
        
        # Save progress before exiting
        if line_num > start_line:
            progress_data = {
                "last_line": line_num,
                "imported": imported,
                "skipped_no_nutrition": skipped_no_nutrition,
                "skipped_exists": skipped_exists,
                "errors": errors,
                "timestamp": datetime.now().isoformat(),
                "error": str(e),
                "corrupted": True
            }
            with open(progress_file, 'w') as pf:
                json.dump(progress_data, pf)
            print(f"   📌 Progress saved to {progress_file}")
            print(f"   You can resume from line {line_num:,} after fixing the file")
        
        print(f"\n   Options:")
        print(f"   1. Re-download the file (recommended if file is corrupted):")
        print(f"      Delete {file_path} and run the download again")
        print(f"   2. Continue from where it left off (if file is actually complete):")
        print(f"      The script will resume from line {line_num:,} next time")
        print(f"   3. Check file size - expected ~10GB compressed")
        
        # Final save of what we have
        if imported > 0 or skipped_no_nutrition > 0 or skipped_exists > 0:
            db["foods"] = foods_dict
            save_food_database(db)
            print(f"\n   ✅ Saved {imported} new products to database")
        
        sys.exit(1)
    
    # Final save
    db["foods"] = foods_dict
    db["last_updated"] = datetime.now().isoformat()
    save_food_database(db)
    
    final_count = len(foods_dict)
    new_items = final_count - initial_count
    
    print(f"\n✅ Import complete!")
    print(f"   Imported: {imported} products")
    print(f"   Skipped (no nutrition): {skipped_no_nutrition:,} products")
    print(f"   Skipped (already exists): {skipped_exists:,} products")
    print(f"   Errors: {errors}")
    print(f"   Database size: {initial_count:,} → {final_count:,} (+{new_items:,})")

def main():
    parser = argparse.ArgumentParser(description="Download and import Open Food Facts database")
    parser.add_argument("--limit", type=int, default=None, help="Limit number of products to import (for testing)")
    parser.add_argument("--update-only", action="store_true", help="Only import new products (skip existing)")
    parser.add_argument("--download-only", action="store_true", help="Only download, don't import")
    parser.add_argument("--file", type=str, help="Use existing file instead of downloading")
    parser.add_argument("--use-api", action="store_true", help="Use Open Food Facts API instead of bulk download (slower but more reliable)")
    parser.add_argument("--no-resume", action="store_true", help="Don't resume from previous position (start from beginning)")
    
    args = parser.parse_args()
    
    # Create data directory if it doesn't exist
    os.makedirs("data", exist_ok=True)
    
    file_path = args.file or "data/openfoodfacts_products.jsonl.gz"
    
    # Download if needed
    if not args.file and not os.path.exists(file_path):
        print("⚠️  Database file not found. Downloading...")
        print("   This may take a while (file is ~3GB compressed, ~15GB uncompressed)")
        print("   You can cancel and use --file to use an existing file")
        
        response = input("Continue with download? (y/n): ")
        if response.lower() != 'y':
            print("Cancelled.")
            return
        
        # Try multiple URLs
        downloaded = False
        for url in OFF_PRODUCTS_URLS:
            try:
                print(f"\nTrying URL: {url}")
                download_file(url, file_path)
                print(f"✅ Download complete: {file_path}")
                downloaded = True
                break
            except Exception as e:
                print(f"❌ Failed with URL {url}: {e}")
                if os.path.exists(file_path):
                    os.remove(file_path)  # Remove partial download
                continue
        
        if not downloaded:
            print("\n❌ All download URLs failed. Please check:")
            print("   1. Your internet connection")
            print("   2. Visit https://world.openfoodfacts.org/data to find the correct download URL")
            print("   3. Download manually and use --file option")
            return
    
    if args.download_only:
        print("Download complete. Use --file to import later.")
        return
    
    # Use API import if requested
    if args.use_api:
        import_from_api(limit=args.limit or 1000, update_only=args.update_only)
        return
    
    # Import from file
    if os.path.exists(file_path):
        import_jsonl_file(file_path, limit=args.limit, update_only=args.update_only, resume=not args.no_resume)
    else:
        print(f"❌ File not found: {file_path}")
        print("   Options:")
        print("   1. Run without --file to download it")
        print("   2. Use --use-api to import via API (slower but more reliable)")
        print("   3. Download manually from https://world.openfoodfacts.org/data and use --file")

if __name__ == "__main__":
    main()

