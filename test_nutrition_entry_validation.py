#!/usr/bin/env python3
"""
Test nutrition entry creation with None values for optional fields (fiber, sodium, sugar)
This verifies the fix for Pydantic validation errors.
"""
import requests
import json
import sys

BASE_URL = "http://localhost:8000"
TEST_USER_ID = "test_user_123"

def get_headers():
    return {
        "Content-Type": "application/json",
        "X-User-ID": TEST_USER_ID
    }

def test_nutrition_entry_with_none_values():
    """Test creating nutrition entry with None values for optional fields"""
    print(f"\n{'='*80}")
    print("TEST: Nutrition Entry Creation with None Values")
    print(f"{'='*80}")
    
    url = f"{BASE_URL}/nutrition/entries"
    
    # Create a food item with None values for optional fields
    food_item = {
        "id": "test_food_123",
        "name": "Test Food",
        "serving_size": "100g",
        "serving_weight_grams": 100.0,
        "calories": 250.0,
        "protein": 10.0,
        "carbs": 30.0,
        "fats": 5.0,
        "fiber": None,  # Optional field - should be handled gracefully
        "sugar": None,  # Optional field - should be handled gracefully
        "sodium": None,  # Optional field - should be handled gracefully
        "source": "test"
    }
    
    entry_data = {
        "food_item": food_item,
        "quantity": 1.0,
        "unit": "serving",
        "meal_type": "snack",
        "date": "2025-12-04"
    }
    
    try:
        response = requests.post(url, headers=get_headers(), json=entry_data, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ SUCCESS: Nutrition entry created with None values")
            
            if 'entry' in data:
                entry = data['entry']
                nutrition = entry.get('nutrition', {})
                print(f"\nEntry Details:")
                print(f"  - Entry ID: {entry.get('id', 'N/A')}")
                print(f"  - Calories: {nutrition.get('calories', 'N/A')}")
                print(f"  - Protein: {nutrition.get('protein', 'N/A')}g")
                print(f"  - Carbs: {nutrition.get('carbs', 'N/A')}g")
                print(f"  - Fats: {nutrition.get('fats', 'N/A')}g")
                
                # Check optional fields
                fiber = nutrition.get('fiber')
                sodium = nutrition.get('sodium')
                sugar = nutrition.get('sugar')
                
                print(f"\nOptional Fields:")
                print(f"  - Fiber: {fiber if fiber is not None else 'Not present (OK)'}")
                print(f"  - Sugar: {sugar if sugar is not None else 'Not present (OK)'}")
                print(f"  - Sodium: {sodium if sodium is not None else 'Not present (OK)'}")
                
                # Verify None values are handled correctly
                if fiber is None or isinstance(fiber, (int, float)):
                    print("  ✅ Fiber handled correctly")
                else:
                    print(f"  ❌ Fiber has invalid type: {type(fiber)}")
                    return False
                
                if sodium is None or isinstance(sodium, (int, float)):
                    print("  ✅ Sodium handled correctly")
                else:
                    print(f"  ❌ Sodium has invalid type: {type(sodium)}")
                    return False
                
                if sugar is None or isinstance(sugar, (int, float)):
                    print("  ✅ Sugar handled correctly")
                else:
                    print(f"  ❌ Sugar has invalid type: {type(sugar)}")
                    return False
            
            return True
        else:
            error_data = response.json() if response.content else {}
            print(f"❌ FAILED: {response.status_code}")
            print(f"Error: {error_data.get('detail', 'Unknown error')}")
            if 'detail' in error_data:
                print(f"Full error: {json.dumps(error_data, indent=2)}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ ERROR: Request failed - {e}")
        return False
    except Exception as e:
        print(f"❌ UNEXPECTED ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("\n" + "="*80)
    print("NUTRITION ENTRY VALIDATION TEST")
    print("="*80)
    print(f"\nTesting against: {BASE_URL}")
    print(f"Test User ID: {TEST_USER_ID}")
    
    success = test_nutrition_entry_with_none_values()
    
    print(f"\n{'='*80}")
    print(f"RESULT: {'✅ PASSED' if success else '❌ FAILED'}")
    print(f"{'='*80}\n")
    
    sys.exit(0 if success else 1)

