"""
Phase 21: Advanced Scheduling & Automation
- Smart recurring patterns (every X days, bi-weekly, etc.)
- Auto-rescheduling based on missed items
- Habit stacking suggestions
- Smart notification timing
- Backup/restore functionality
- Advanced filtering and search
"""
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import json
import os

def suggest_habit_stacking(schedule: Dict[str, List[Dict]], progress: Dict[str, Dict]) -> List[Dict[str, Any]]:
    """Suggest habit stacking opportunities based on completion patterns"""
    suggestions = []
    
    if not schedule or not progress:
        return suggestions
    
    # Find items that are frequently completed together
    item_pairs = {}
    for date_str, day_progress in progress.items():
        if date_str not in schedule:
            continue
        
        completed_items = []
        for item in schedule[date_str]:
            item_id = item.get("id", "")
            if item_id in day_progress and day_progress[item_id] == 2:
                item_name = item.get("item", {}).get("name", "")
                completed_items.append(item_name)
        
        # Track pairs
        for i, item1 in enumerate(completed_items):
            for item2 in completed_items[i+1:]:
                pair_key = tuple(sorted([item1, item2]))
                if pair_key not in item_pairs:
                    item_pairs[pair_key] = 0
                item_pairs[pair_key] += 1
    
    # Find frequently paired items
    for (item1, item2), count in item_pairs.items():
        if count >= 3:  # Completed together at least 3 times
            suggestions.append({
                "type": "habit_stacking",
                "items": [item1, item2],
                "frequency": count,
                "message": f"'{item1}' and '{item2}' are often completed together. Consider scheduling them at the same time for better consistency.",
                "action": f"Schedule {item1} and {item2} together"
            })
    
    return suggestions

def suggest_auto_reschedule(schedule: Dict[str, List[Dict]], progress: Dict[str, Dict]) -> List[Dict[str, Any]]:
    """Suggest rescheduling items that are frequently missed at certain times"""
    suggestions = []
    
    if not schedule or not progress:
        return suggestions
    
    # Track missed items by hour
    missed_by_hour = {}
    completed_by_hour = {}
    
    for date_str, day_schedule in schedule.items():
        day_progress = progress.get(date_str, {})
        
        for item in day_schedule:
            item_id = item.get("id", "")
            item_name = item.get("item", {}).get("name", "")
            
            try:
                scheduled_time = item.get("scheduled_time", "")
                if scheduled_time:
                    dt = datetime.fromisoformat(scheduled_time.replace("Z", "+00:00"))
                    hour = dt.hour
                    
                    if hour not in missed_by_hour:
                        missed_by_hour[hour] = {}
                        completed_by_hour[hour] = {}
                    
                    if item_name not in missed_by_hour[hour]:
                        missed_by_hour[hour][item_name] = 0
                        completed_by_hour[hour][item_name] = 0
                    
                    if item_id in day_progress:
                        if day_progress[item_id] == 2:
                            completed_by_hour[hour][item_name] += 1
                        else:
                            missed_by_hour[hour][item_name] += 1
                    else:
                        missed_by_hour[hour][item_name] += 1
            except:
                continue
    
    # Find items with low completion rates at specific hours
    for hour, items in missed_by_hour.items():
        for item_name, missed_count in items.items():
            completed_count = completed_by_hour.get(hour, {}).get(item_name, 0)
            total = missed_count + completed_count
            
            if total >= 3 and (completed_count / total) < 0.3:  # Less than 30% completion
                suggestions.append({
                    "type": "reschedule",
                    "item": item_name,
                    "current_hour": hour,
                    "completion_rate": round((completed_count / total) * 100, 1),
                    "message": f"'{item_name}' at {hour}:00 has only {round((completed_count / total) * 100, 1)}% completion rate. Consider rescheduling.",
                    "action": f"Reschedule {item_name} from {hour}:00"
                })
    
    return suggestions

def create_backup(user_id: str, backup_dir: str = "backups") -> str:
    """Create a backup of all user data"""
    import shutil
    from pathlib import Path
    
    user_data_dir = f"data/{user_id}"
    if not os.path.exists(user_data_dir):
        return None
    
    # Create backup directory
    os.makedirs(backup_dir, exist_ok=True)
    
    # Create timestamped backup
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = f"{backup_dir}/{user_id}_{timestamp}"
    
    # Copy user data
    shutil.copytree(user_data_dir, backup_path)
    
    return backup_path

def restore_backup(user_id: str, backup_path: str) -> bool:
    """Restore user data from backup"""
    import shutil
    
    if not os.path.exists(backup_path):
        return False
    
    user_data_dir = f"data/{user_id}"
    
    # Backup current data first
    if os.path.exists(user_data_dir):
        old_backup = f"{user_data_dir}_old_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        shutil.move(user_data_dir, old_backup)
    
    # Restore from backup
    shutil.copytree(backup_path, user_data_dir)
    
    return True

def list_backups(user_id: str, backup_dir: str = "backups") -> List[Dict[str, Any]]:
    """List all available backups for a user"""
    if not os.path.exists(backup_dir):
        return []
    
    backups = []
    for item in os.listdir(backup_dir):
        if item.startswith(user_id + "_"):
            backup_path = os.path.join(backup_dir, item)
            if os.path.isdir(backup_path):
                # Extract timestamp
                try:
                    timestamp_str = item.replace(user_id + "_", "")
                    dt = datetime.strptime(timestamp_str, "%Y%m%d_%H%M%S")
                    backups.append({
                        "path": backup_path,
                        "name": item,
                        "timestamp": dt.isoformat(),
                        "display": dt.strftime("%B %d, %Y at %I:%M %p")
                    })
                except:
                    continue
    
    # Sort by timestamp (newest first)
    backups.sort(key=lambda x: x["timestamp"], reverse=True)
    return backups

