# Testing Rule

**ALWAYS create tests to verify functionality before considering work complete.**

## Rule
Before marking any feature or fix as complete, create and run test files to verify:
1. The functionality works as expected
2. Edge cases are handled correctly
3. Error cases are handled gracefully
4. Integration between components works

## Test File Naming
- `test_<feature_name>.py` - Feature-specific tests
- `test_<fix_name>_fixes.py` - Fix verification tests
- `test_backend_health.py` - Backend health checks

## Test Structure
Each test should:
1. Check prerequisites (backend running, dependencies available)
2. Test happy path (expected behavior)
3. Test edge cases (None values, missing data, etc.)
4. Test error cases (invalid input, network failures, etc.)
5. Provide clear pass/fail output with details

## Example Test Template
```python
#!/usr/bin/env python3
"""
Test script to verify [feature/fix description]
"""
import requests
import json

BASE_URL = "http://localhost:8000"
TEST_USER_ID = "test_user_123"

def get_headers():
    return {
        "Content-Type": "application/json",
        "X-User-ID": TEST_USER_ID
    }

def test_feature():
    """Test [feature name]"""
    print(f"\n{'='*80}")
    print(f"TEST: [Feature Name]")
    print(f"{'='*80}")
    
    try:
        response = requests.get(f"{BASE_URL}/endpoint", headers=get_headers(), timeout=10)
        if response.status_code == 200:
            print("✅ SUCCESS")
            return True
        else:
            print(f"❌ FAILED: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return False

if __name__ == "__main__":
    test_feature()
```

## Running Tests
```bash
# Run all tests
python test_*.py

# Run specific test
python test_nutrition_fixes.py
```

## Current Test Files
- `test_nutrition_fixes.py` - Tests nutrition entry creation, barcode scanning, food lookup
- `test_backend_health.py` - Checks if backend is running and endpoints are accessible
- `test_food_database_direct.py` - Direct database access tests

