#!/usr/bin/env python3
"""Regenerate the complete supplement schedule"""

import os
import json
from daily_wellness_scheduler import UserSettings, SupplementScheduler
import datetime

# Remove old schedule
schedule_file = ".local_private/supplement_schedule.json"
if os.path.exists(schedule_file):
    os.remove(schedule_file)
    print("Removed old schedule file")

# Create new settings
settings = UserSettings()
print("Created settings with default values")

# Create scheduler
scheduler = SupplementScheduler(settings)
print(f"Created scheduler with {len(scheduler.supplements)} supplements")

# Generate new schedule
start_date = datetime.datetime.now()
schedule = scheduler.generate_schedule(start_date, 6)
print(f"Generated 6-week schedule starting from {start_date.date()}")

# Save to file
os.makedirs(".local_private", exist_ok=True)
data = {
    'settings': {
        'wake_time': settings.wake_time,
        'bedtime': settings.bedtime,
        'dinner_time': settings.dinner_time,
        'breakfast_mode': settings.breakfast_mode,
        'breakfast_days': settings.breakfast_days,
        'study_start': settings.study_start,
        'study_end': settings.study_end,
        'workout_days': settings.workout_days,
        'workout_time': settings.workout_time,
        'vaping_window': settings.vaping_window,
        'electrolyte_intensity': settings.electrolyte_intensity,
        'timezone': settings.timezone,
        'optional_items': settings.optional_items
    },
    'schedule': {}
}

# Convert schedule to serializable format
for date_str, items in schedule.items():
    data['schedule'][date_str] = []
    for item in items:
        item_data = {
            'item': {
                'name': item.item.name,
                'dose': item.item.dose,
                'timing_rule': item.item.timing_rule.value,
                'notes': item.item.notes,
                'window_minutes': item.item.window_minutes,
                'anchor': item.item.anchor,
                'offset_minutes': item.item.offset_minutes,
                'conflicts': item.item.conflicts,
                'enabled': item.item.enabled,
                'optional': item.item.optional
            },
            'scheduled_time': item.scheduled_time.isoformat(),
            'day_type': item.day_type.value,
            'shifted': item.shifted,
            'shift_reason': item.shift_reason
        }
        data['schedule'][date_str].append(item_data)

# Write to file
with open(schedule_file, 'w') as f:
    json.dump(data, f, indent=2)

print(f"Saved complete schedule to {schedule_file}")

# Show today's schedule
today = start_date.date().isoformat()
if today in schedule:
    print(f"\nToday's schedule ({today}):")
    for item in schedule[today]:
        time_str = item.scheduled_time.strftime("%I:%M %p")
        print(f"  {time_str}: {item.item.name} — {item.item.dose}")
else:
    print("No schedule for today")
