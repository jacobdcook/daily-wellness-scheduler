import json
import os
import sys

file_path = "data/jacob@jacob.jacob/schedule.json"
log_file = "clean_log.txt"

with open(log_file, "w") as log:
    try:
        log.write(f"Opening {file_path}\n")
        if not os.path.exists(file_path):
             log.write("File not found!\n")
             sys.exit(1)

        with open(file_path, 'r') as f:
            data = json.load(f)
        
        log.write(f"Loaded schedule with {len(data)} days.\n")
        
        cleaned_schedule = {}
        removed_count = 0
        
        for date, items in data.items():
            cleaned_items = []
            for item in items:
                item_name = item.get('item', {}).get('name', '').lower()
                if 'pokemon' in item_name:
                    removed_count += 1
                else:
                    cleaned_items.append(item)
            cleaned_schedule[date] = cleaned_items
            
        log.write(f"Removed {removed_count} instances of 'pokemon'.\n")
        
        with open(file_path, 'w') as f:
            json.dump(cleaned_schedule, f, indent=2)
            
        log.write("Successfully saved cleaned schedule.\n")

    except Exception as e:
        log.write(f"Error: {e}\n")
        sys.exit(1)
