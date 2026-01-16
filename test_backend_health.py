#!/usr/bin/env python3
"""
Backend health check - Verify backend is running and endpoints are accessible
"""
import requests
import sys

BASE_URL = "http://localhost:8000"

def check_backend_health():
    """Check if backend is running"""
    print("Checking backend health...")
    try:
        # Try a simple endpoint that doesn't require auth
        response = requests.get(f"{BASE_URL}/docs", timeout=5)
        if response.status_code in [200, 404]:  # 404 is OK, means server is running
            print("✅ Backend is running")
            return True
        else:
            print(f"⚠️  Backend returned status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Backend is not running or not accessible")
        print(f"   Make sure the backend is running on {BASE_URL}")
        print(f"   Start with: cd backend && python -m uvicorn main:app --reload")
        return False
    except Exception as e:
        print(f"❌ Error checking backend: {e}")
        return False

def check_endpoints():
    """Check if critical endpoints exist"""
    print("\nChecking critical endpoints...")
    endpoints = [
        "/nutrition/scan/3017620422003",
        "/nutrition/food/3017620422003",
        "/nutrition/search?query=banana",
    ]
    
    for endpoint in endpoints:
        try:
            url = f"{BASE_URL}{endpoint}"
            response = requests.get(url, headers={"X-User-ID": "test"}, timeout=15)
            status = "✅" if response.status_code in [200, 404] else "⚠️"
            print(f"{status} {endpoint} - Status: {response.status_code}")
        except requests.exceptions.Timeout:
            print(f"⏱️  {endpoint} - Timeout (endpoint may be slow)")
        except Exception as e:
            print(f"❌ {endpoint} - Error: {e}")

if __name__ == "__main__":
    if check_backend_health():
        check_endpoints()
    else:
        print("\n⚠️  Please start the backend server first:")
        print("   cd backend && python -m uvicorn main:app --reload")
        sys.exit(1)

