#!/usr/bin/env python3
"""Fix the JSON schedule file to include all supplements"""

import json
import os
from datetime import datetime, timedelta

# Create a properly formatted complete schedule
def create_fixed_schedule():
    settings = {
        "wake_time": "08:00",
        "bedtime": "00:00",
        "dinner_time": "19:30",
        "breakfast_mode": "sometimes",
        "breakfast_days": [True, True, False, True, False, True, False],
        "study_start": "09:30",
        "study_end": "17:30",
        "workout_days": [False, False, True, False, True, False, True],
        "workout_time": "16:00",
        "vaping_window": "",
        "electrolyte_intensity": "light",
        "timezone": "America/Los_Angeles",
        "optional_items": {
            "slippery_elm": False,
            "l_glutamine": False,
            "collagen": False,
            "melatonin": True
        }
    }
    
    # Generate 6 weeks of schedule with ALL supplements
    schedule = {}
    start_date = datetime.now().date()
    
    for week in range(6):
        for day in range(7):
            current_date = start_date + timedelta(days=week * 7 + day)
            date_str = current_date.isoformat()
            
            # Create daily schedule with ALL 8 supplements
            daily_items = []
            
            # 1. Probiotic - 8:30 AM
            daily_items.append({
                "item": {
                    "name": "Probiotic",
                    "dose": "1 capsule (25B CFU)",
                    "timing_rule": "empty_stomach",
                    "notes": "NOW Probiotic-10",
                    "window_minutes": 30,
                    "anchor": "wake",
                    "offset_minutes": 30,
                    "conflicts": ["meals"],
                    "enabled": True,
                    "optional": False
                },
                "scheduled_time": f"{current_date}T08:30:00",
                "day_type": "light",
                "shifted": False,
                "shift_reason": ""
            })
            
            # 2. Electrolyte Mix - 10:00 AM
            daily_items.append({
                "item": {
                    "name": "Electrolyte Mix",
                    "dose": "1 L water",
                    "timing_rule": "between_meals",
                    "notes": "Citric-free mix with Baja Gold salt, potassium bicarbonate, ConcenTrace",
                    "window_minutes": 60,
                    "anchor": "wake",
                    "offset_minutes": 120,
                    "conflicts": ["meals"],
                    "enabled": True,
                    "optional": False
                },
                "scheduled_time": f"{current_date}T10:00:00",
                "day_type": "light",
                "shifted": False,
                "shift_reason": ""
            })
            
            # 3. Aloe Vera Juice - 5:30 PM
            daily_items.append({
                "item": {
                    "name": "Aloe Vera Juice",
                    "dose": "2-4 oz",
                    "timing_rule": "between_meals",
                    "notes": "Lily of the Desert, preservative-free inner fillet",
                    "window_minutes": 30,
                    "anchor": "dinner",
                    "offset_minutes": -120,
                    "conflicts": ["meals"],
                    "enabled": True,
                    "optional": False
                },
                "scheduled_time": f"{current_date}T17:30:00",
                "day_type": "light",
                "shifted": False,
                "shift_reason": ""
            })
            
            # 4. DGL - 7:18 PM (12 min before dinner)
            daily_items.append({
                "item": {
                    "name": "DGL",
                    "dose": "1-2 tablets/capsules",
                    "timing_rule": "before_meal",
                    "notes": "10-15 min before meals",
                    "window_minutes": 15,
                    "anchor": "dinner",
                    "offset_minutes": -12,
                    "conflicts": [],
                    "enabled": True,
                    "optional": False
                },
                "scheduled_time": f"{current_date}T19:18:00",
                "day_type": "light",
                "shifted": False,
                "shift_reason": ""
            })
            
            # 5. PepZin GI - 7:30 PM (with dinner)
            daily_items.append({
                "item": {
                    "name": "PepZin GI",
                    "dose": "37.5 mg",
                    "timing_rule": "with_meal",
                    "notes": "Zinc-Carnosine, twice daily",
                    "window_minutes": 15,
                    "anchor": "dinner",
                    "offset_minutes": 0,
                    "conflicts": [],
                    "enabled": True,
                    "optional": False
                },
                "scheduled_time": f"{current_date}T19:30:00",
                "day_type": "light",
                "shifted": False,
                "shift_reason": ""
            })
            
            # 6. Omega-3 + D3/K2 - 7:30 PM (with dinner)
            daily_items.append({
                "item": {
                    "name": "Omega-3 + D3/K2",
                    "dose": "As directed",
                    "timing_rule": "with_meal",
                    "notes": "With fat-containing meal",
                    "window_minutes": 15,
                    "anchor": "dinner",
                    "offset_minutes": 0,
                    "conflicts": [],
                    "enabled": True,
                    "optional": False
                },
                "scheduled_time": f"{current_date}T19:30:00",
                "day_type": "light",
                "shifted": False,
                "shift_reason": ""
            })
            
            # 7. Magnesium Glycinate - 10:30 PM
            daily_items.append({
                "item": {
                    "name": "Magnesium Glycinate",
                    "dose": "1-2 capsules (60-120 mg elemental)",
                    "timing_rule": "before_bed",
                    "notes": "Double Wood brand",
                    "window_minutes": 30,
                    "anchor": "bed",
                    "offset_minutes": -90,
                    "conflicts": [],
                    "enabled": True,
                    "optional": False
                },
                "scheduled_time": f"{current_date}T22:30:00",
                "day_type": "light",
                "shifted": False,
                "shift_reason": ""
            })
            
            # 8. Melatonin - 11:15 PM (if enabled)
            if settings["optional_items"]["melatonin"]:
                daily_items.append({
                    "item": {
                        "name": "Melatonin",
                        "dose": "300 mcg",
                        "timing_rule": "before_bed",
                        "notes": "Life Extension brand",
                        "window_minutes": 30,
                        "anchor": "bed",
                        "offset_minutes": -45,
                        "conflicts": [],
                        "enabled": True,
                        "optional": True
                    },
                    "scheduled_time": f"{current_date}T23:15:00",
                    "day_type": "light",
                    "shifted": False,
                    "shift_reason": ""
                })
            
            schedule[date_str] = daily_items
    
    return {
        "settings": settings,
        "schedule": schedule
    }

# Create the fixed schedule
print("Creating complete schedule with ALL supplements...")
complete_data = create_fixed_schedule()

# Save to file
os.makedirs(".local_private", exist_ok=True)
with open(".local_private/supplement_schedule.json", "w") as f:
    json.dump(complete_data, f, indent=2)

print("✅ FIXED! Complete schedule saved with ALL 8 supplements:")
print("   1. Probiotic (8:30 AM)")
print("   2. Electrolyte Mix (10:00 AM)")  
print("   3. Aloe Vera Juice (5:30 PM)")
print("   4. DGL (7:18 PM)")
print("   5. PepZin GI (7:30 PM)")
print("   6. Omega-3 + D3/K2 (7:30 PM)")
print("   7. Magnesium Glycinate (10:30 PM)")
print("   8. Melatonin (11:15 PM)")

print(f"\n📅 Generated {len(complete_data['schedule'])} days of complete schedule")
print("🎉 Your app will now show ALL supplements in all tabs!")
