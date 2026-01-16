#!/usr/bin/env python3
"""
Direct test of food database save/load to verify caching works
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from food_database import load_food_database, save_food_database

print("Testing food database save/load...")

# Load database
db = load_food_database()
foods_dict = db.get("foods", {})
print(f"Loaded {len(foods_dict)} foods from database")

# Check if Nutella barcode exists
barcode = "3017620422003"
if barcode in foods_dict:
    print(f"✅ Found Nutella (barcode: {barcode}) in database")
    food = foods_dict[barcode]
    print(f"   Name: {food.get('name', 'N/A')}")
    print(f"   ID: {food.get('id', 'N/A')}")
    print(f"   Barcode: {food.get('barcode', 'N/A')}")
else:
    print(f"❌ Nutella (barcode: {barcode}) NOT found in database")
    print(f"   Searching for any food with this barcode...")
    found = False
    for key, value in foods_dict.items():
        if isinstance(value, dict):
            if str(value.get("barcode", "")) == barcode:
                print(f"   ✅ Found by barcode field: key={key}, name={value.get('name', 'N/A')}")
                found = True
                break
            if str(value.get("id", "")) == barcode:
                print(f"   ✅ Found by ID field: key={key}, name={value.get('name', 'N/A')}")
                found = True
                break
    if not found:
        print(f"   ❌ Not found anywhere in database")
        print(f"   Sample keys (first 10): {list(foods_dict.keys())[:10]}")

