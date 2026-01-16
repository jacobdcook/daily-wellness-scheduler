#!/usr/bin/env python3
"""
Test script to verify all nutrition-related fixes:
1. Barcode scanning (Nutella: 3017620422003)
2. Food details lookup
3. Nutrition entry creation with None values
4. Health analysis integration
"""
import requests
import json
import sys
from typing import Dict, Any

BASE_URL = "http://localhost:8000"
TEST_USER_ID = "test_user_123"  # You may need to adjust this

def get_headers() -> Dict[str, str]:
    """Get authentication headers"""
    return {
        "Content-Type": "application/json",
        "X-User-ID": TEST_USER_ID  # Backend uses X-User-ID header for authentication
    }

def test_barcode_scan(barcode: str) -> Dict[str, Any]:
    """Test barcode scanning endpoint"""
    print(f"\n{'='*80}")
    print(f"TEST 1: Barcode Scanning - {barcode}")
    print(f"{'='*80}")
    
    url = f"{BASE_URL}/nutrition/scan/{barcode}"
    headers = get_headers()
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ SUCCESS: Barcode scan successful")
            print(f"\nResponse structure:")
            print(f"  - Has 'food' key: {'food' in data}")
            print(f"  - Has 'source' key: {'source' in data}")
            
            if 'food' in data:
                food = data['food']
                print(f"\nFood Details:")
                print(f"  - ID: {food.get('id', 'N/A')}")
                print(f"  - Name: {food.get('name', 'N/A')}")
                print(f"  - Brand: {food.get('brand', 'N/A')}")
                print(f"  - Barcode: {food.get('barcode', 'N/A')}")
                print(f"  - Calories: {food.get('calories', 'N/A')}")
                print(f"  - Has health data: {'health' in food}")
                
                if 'health' in food:
                    health = food['health']
                    print(f"  - Health Score: {health.get('health_score', 'N/A')}")
                    print(f"  - Nutri-Score: {health.get('nutri_score', {}).get('grade', 'N/A')}")
                    print(f"  - NOVA Group: {health.get('nova', {}).get('group', 'N/A')}")
            
            return data
        else:
            error_data = response.json() if response.content else {}
            print(f"❌ FAILED: {response.status_code}")
            print(f"Error: {error_data.get('detail', 'Unknown error')}")
            return {}
    except requests.exceptions.RequestException as e:
        print(f"❌ ERROR: Request failed - {e}")
        return {}

def test_food_details(food_id: str) -> Dict[str, Any]:
    """Test food details lookup endpoint"""
    print(f"\n{'='*80}")
    print(f"TEST 2: Food Details Lookup - {food_id}")
    print(f"{'='*80}")
    
    url = f"{BASE_URL}/nutrition/food/{food_id}"
    headers = get_headers()
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            food = response.json()
            print(f"✅ SUCCESS: Food details retrieved")
            print(f"\nFood Details:")
            print(f"  - ID: {food.get('id', 'N/A')}")
            print(f"  - Name: {food.get('name', 'N/A')}")
            print(f"  - Brand: {food.get('brand', 'N/A')}")
            print(f"  - Barcode: {food.get('barcode', 'N/A')}")
            print(f"  - Source: {food.get('source', 'N/A')}")
            print(f"  - Calories: {food.get('calories', 'N/A')}")
            print(f"  - Protein: {food.get('protein', 'N/A')}g")
            print(f"  - Carbs: {food.get('carbs', 'N/A')}g")
            print(f"  - Fats: {food.get('fats', 'N/A')}g")
            print(f"  - Fiber: {food.get('fiber', 'N/A')}")
            print(f"  - Sugar: {food.get('sugar', 'N/A')}")
            print(f"  - Sodium: {food.get('sodium', 'N/A')}")
            print(f"  - Has health data: {'health' in food}")
            
            if 'health' in food:
                health = food['health']
                print(f"\nHealth Analysis:")
                print(f"  - Health Score: {health.get('health_score', 'N/A')}/100")
                print(f"  - Nutri-Score: {health.get('nutri_score', {}).get('grade', 'N/A')}")
                print(f"  - NOVA Group: {health.get('nova', {}).get('group', 'N/A')}")
            
            return food
        else:
            error_data = response.json() if response.content else {}
            print(f"❌ FAILED: {response.status_code}")
            print(f"Error: {error_data.get('detail', 'Unknown error')}")
            return {}
    except requests.exceptions.RequestException as e:
        print(f"❌ ERROR: Request failed - {e}")
        return {}

def test_nutrition_entry_creation(food_item: Dict[str, Any]) -> Dict[str, Any]:
    """Test nutrition entry creation with None values for optional fields"""
    print(f"\n{'='*80}")
    print(f"TEST 3: Nutrition Entry Creation (with None values)")
    print(f"{'='*80}")
    
    url = f"{BASE_URL}/nutrition/entries"
    headers = get_headers()
    
    # Create a food item that might have None values for fiber/sodium
    entry_data = {
        "food_item": food_item,
        "quantity": 1.0,
        "unit": "serving",
        "meal_type": "snack",
        "date": "2025-12-04"
    }
    
    try:
        response = requests.post(url, headers=headers, json=entry_data, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ SUCCESS: Nutrition entry created")
            print(f"\nEntry Details:")
            if 'entry' in data:
                entry = data['entry']
                nutrition = entry.get('nutrition', {})
                print(f"  - Entry ID: {entry.get('id', 'N/A')}")
                print(f"  - Food Name: {entry.get('food_item', {}).get('name', 'N/A')}")
                print(f"  - Calories: {nutrition.get('calories', 'N/A')}")
                print(f"  - Protein: {nutrition.get('protein', 'N/A')}g")
                print(f"  - Carbs: {nutrition.get('carbs', 'N/A')}g")
                print(f"  - Fats: {nutrition.get('fats', 'N/A')}g")
                print(f"  - Fiber: {nutrition.get('fiber', 'Not present')}")
                print(f"  - Sugar: {nutrition.get('sugar', 'Not present')}")
                print(f"  - Sodium: {nutrition.get('sodium', 'Not present')}")
                
                # Verify None values are handled correctly
                fiber = nutrition.get('fiber')
                sodium = nutrition.get('sodium')
                sugar = nutrition.get('sugar')
                
                if fiber is None:
                    print(f"  ⚠️  Fiber is None (should be excluded or 0)")
                elif isinstance(fiber, (int, float)):
                    print(f"  ✅ Fiber is a valid number: {fiber}")
                
                if sodium is None:
                    print(f"  ⚠️  Sodium is None (should be excluded or 0)")
                elif isinstance(sodium, (int, float)):
                    print(f"  ✅ Sodium is a valid number: {sodium}")
                
                if sugar is None:
                    print(f"  ⚠️  Sugar is None (should be excluded or 0)")
                elif isinstance(sugar, (int, float)):
                    print(f"  ✅ Sugar is a valid number: {sugar}")
            
            return data
        else:
            error_data = response.json() if response.content else {}
            print(f"❌ FAILED: {response.status_code}")
            print(f"Error: {error_data.get('detail', 'Unknown error')}")
            if 'detail' in error_data:
                print(f"Full error: {json.dumps(error_data, indent=2)}")
            return {}
    except requests.exceptions.RequestException as e:
        print(f"❌ ERROR: Request failed - {e}")
        return {}

def test_food_search(query: str) -> Dict[str, Any]:
    """Test food search endpoint"""
    print(f"\n{'='*80}")
    print(f"TEST 4: Food Search - '{query}'")
    print(f"{'='*80}")
    
    url = f"{BASE_URL}/nutrition/search"
    headers = get_headers()
    params = {"query": query}
    
    try:
        response = requests.get(url, headers=headers, params=params, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            foods = data.get('foods', [])
            print(f"✅ SUCCESS: Found {len(foods)} results")
            
            if foods:
                print(f"\nFirst Result:")
                food = foods[0]
                print(f"  - ID: {food.get('id', 'N/A')}")
                print(f"  - Name: {food.get('name', 'N/A')}")
                print(f"  - Source: {food.get('source', 'N/A')}")
                print(f"  - Has health data: {'health' in food}")
            
            return data
        else:
            error_data = response.json() if response.content else {}
            print(f"❌ FAILED: {response.status_code}")
            print(f"Error: {error_data.get('detail', 'Unknown error')}")
            return {}
    except requests.exceptions.RequestException as e:
        print(f"❌ ERROR: Request failed - {e}")
        return {}

def main():
    """Run all tests"""
    print("\n" + "="*80)
    print("NUTRITION FIXES VERIFICATION TEST SUITE")
    print("="*80)
    print(f"\nTesting against: {BASE_URL}")
    print(f"Test User ID: {TEST_USER_ID}")
    
    # Test 1: Barcode scanning (Nutella)
    nutella_barcode = "3017620422003"
    scan_result = test_barcode_scan(nutella_barcode)
    
    # Test 2: Food details lookup using barcode
    if scan_result and 'food' in scan_result:
        food_id = scan_result['food'].get('id') or scan_result['food'].get('barcode') or nutella_barcode
        food_details = test_food_details(food_id)
        
        # Test 3: Nutrition entry creation
        if food_details:
            # Create a food item with potential None values
            food_item = {
                "id": food_details.get('id', 'test_id'),
                "name": food_details.get('name', 'Test Food'),
                "brand": food_details.get('brand'),
                "barcode": food_details.get('barcode'),
                "serving_size": food_details.get('serving_size', '100g'),
                "serving_weight_grams": food_details.get('serving_weight_grams', 100.0),
                "calories": food_details.get('calories', 0),
                "protein": food_details.get('protein', 0),
                "carbs": food_details.get('carbs', 0),
                "fats": food_details.get('fats', 0),
                "fiber": food_details.get('fiber'),  # May be None
                "sugar": food_details.get('sugar'),  # May be None
                "sodium": food_details.get('sodium'),  # May be None
                "source": food_details.get('source', 'test')
            }
            entry_result = test_nutrition_entry_creation(food_item)
    else:
        # If barcode scan failed, try direct lookup
        print(f"\n⚠️  Barcode scan failed, trying direct food details lookup...")
        food_details = test_food_details(nutella_barcode)
    
    # Test 4: Food search
    search_result = test_food_search("nutella")
    
    # Summary
    print(f"\n{'='*80}")
    print("TEST SUMMARY")
    print(f"{'='*80}")
    print(f"✅ Barcode Scan: {'PASSED' if scan_result and 'food' in scan_result else 'FAILED'}")
    print(f"✅ Food Details: {'PASSED' if food_details and 'id' in food_details else 'FAILED'}")
    print(f"✅ Nutrition Entry: {'PASSED' if 'entry_result' in locals() and entry_result else 'SKIPPED'}")
    print(f"✅ Food Search: {'PASSED' if search_result and 'foods' in search_result else 'FAILED'}")
    print(f"\n{'='*80}\n")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ UNEXPECTED ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

