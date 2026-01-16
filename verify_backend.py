import requests
import json

def test_api():
    url = "http://localhost:8000/generate-schedule"
    
    # Default settings payload
    payload = {
        "wake_time": "07:30",
        "bedtime": "22:00",
        "dinner_time": "18:30",
        "electrolyte_intensity": "light"
    }
    
    try:
        response = requests.post(url, json=payload)
        if response.status_code == 200:
            data = response.json()
            print("✅ API Call Successful")
            print(f"Received schedule for {len(data)} days")
            
            # Check today's items
            first_day = list(data.keys())[0]
            items = data[first_day]
            print(f"First day ({first_day}) has {len(items)} items:")
            for item in items[:3]:
                print(f"  - {item['scheduled_time']}: {item['item']['name']}")
        else:
            print(f"❌ API Call Failed: {response.status_code}")
            print(response.text)
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_api()
