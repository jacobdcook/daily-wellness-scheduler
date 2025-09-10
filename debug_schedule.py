#!/usr/bin/env python3
"""Debug script to check supplement scheduling"""

from daily_wellness_scheduler import UserSettings, SupplementScheduler
import datetime

# Create settings
settings = UserSettings()
print("Settings created:")
print(f"  Wake time: {settings.wake_time}")
print(f"  Dinner time: {settings.dinner_time}")
print(f"  Bedtime: {settings.bedtime}")

# Create scheduler
scheduler = SupplementScheduler(settings)
print(f"\nTotal supplements defined: {len(scheduler.supplements)}")

# List all supplements
print("\nAll supplements:")
for i, supp in enumerate(scheduler.supplements):
    print(f"  {i+1}. {supp.name} - Enabled: {supp.enabled}, Optional: {supp.optional}")

# Generate schedule for today
start_date = datetime.datetime.now()
schedule = scheduler.generate_schedule(start_date, 1)
today = start_date.date().isoformat()

print(f"\nSchedule for {today}:")
if today in schedule:
    items = schedule[today]
    print(f"  {len(items)} supplements scheduled:")
    for item in items:
        time_str = item.scheduled_time.strftime("%I:%M %p")
        print(f"    {time_str}: {item.item.name} — {item.item.dose}")
else:
    print("  No schedule found for today")
