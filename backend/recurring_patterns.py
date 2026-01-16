"""
Recurring Patterns Engine
Phase 25: Advanced Recurring Patterns & Custom Schedules
"""
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dateutil.rrule import rrule, DAILY, WEEKLY, MONTHLY, MO, TU, WE, TH, FR, SA, SU
import json
import os

def generate_occurrences(
    pattern_type: str,
    frequency: Optional[int],
    days_of_week: Optional[List[int]],
    days_of_month: Optional[List[int]],
    start_date: str,
    end_date: Optional[str],
    exceptions: List[str],
    max_occurrences: Optional[int],
    schedule_end_date: datetime
) -> List[datetime]:
    """Generate list of occurrence dates for a recurring pattern"""
    
    start = datetime.fromisoformat(start_date).date()
    end = schedule_end_date.date()
    
    if end_date:
        pattern_end = datetime.fromisoformat(end_date).date()
        if pattern_end < end:
            end = pattern_end
    
    exception_dates = {datetime.fromisoformat(exc).date() for exc in exceptions}
    
    occurrences = []
    
    try:
        if pattern_type == "daily":
            # Every N days
            freq = frequency or 1
            current = start
            count = 0
            
            while current <= end and (max_occurrences is None or count < max_occurrences):
                if current not in exception_dates:
                    occurrences.append(datetime.combine(current, datetime.min.time()))
                    count += 1
                current += timedelta(days=freq)
        
        elif pattern_type == "weekly":
            # Specific days of week
            if not days_of_week:
                days_of_week = [0, 1, 2, 3, 4, 5, 6]  # All days
            
            # Map to dateutil weekdays
            weekday_map = {0: MO, 1: TU, 2: WE, 3: TH, 4: FR, 5: SA, 6: SU}
            weekdays = [weekday_map[d] for d in days_of_week if d in weekday_map]
            
            if weekdays:
                rule = rrule(
                    WEEKLY,
                    byweekday=weekdays,
                    dtstart=datetime.combine(start, datetime.min.time()),
                    until=datetime.combine(end, datetime.max.time())
                )
                occurrences = list(rule)
                
                # Apply exceptions and max_occurrences
                filtered = []
                for occ in occurrences:
                    if occ.date() not in exception_dates:
                        filtered.append(occ)
                    if max_occurrences and len(filtered) >= max_occurrences:
                        break
                occurrences = filtered
        
        elif pattern_type == "biweekly":
            # Every other week on specific days
            if not days_of_week:
                days_of_week = [0, 1, 2, 3, 4, 5, 6]
            
            weekday_map = {0: MO, 1: TU, 2: WE, 3: TH, 4: FR, 5: SA, 6: SU}
            weekdays = [weekday_map[d] for d in days_of_week if d in weekday_map]
            
            if weekdays:
                rule = rrule(
                    WEEKLY,
                    interval=2,  # Every 2 weeks
                    byweekday=weekdays,
                    dtstart=datetime.combine(start, datetime.min.time()),
                    until=datetime.combine(end, datetime.max.time())
                )
                occurrences = list(rule)
                
                filtered = []
                for occ in occurrences:
                    if occ.date() not in exception_dates:
                        filtered.append(occ)
                    if max_occurrences and len(filtered) >= max_occurrences:
                        break
                occurrences = filtered
        
        elif pattern_type == "monthly":
            # Specific days of month
            if not days_of_month:
                days_of_month = [1]  # First of month
            
            rule = rrule(
                MONTHLY,
                bymonthday=days_of_month,
                dtstart=datetime.combine(start, datetime.min.time()),
                until=datetime.combine(end, datetime.max.time())
            )
            occurrences = list(rule)
            
            filtered = []
            for occ in occurrences:
                if occ.date() not in exception_dates:
                    filtered.append(occ)
                if max_occurrences and len(filtered) >= max_occurrences:
                    break
            occurrences = filtered
        
        else:
            # Custom or unsupported - return empty
            pass
    
    except Exception as e:
        print(f"Error generating occurrences: {e}")
        return []
    
    return occurrences

def apply_recurring_pattern(
    pattern: Dict[str, Any],
    schedule_end_date: datetime,
    existing_schedule: Dict[str, List[Dict]]
) -> Dict[str, List[Dict]]:
    """Apply a recurring pattern to generate schedule items"""
    
    item_template = pattern.get("item_template", {})
    time_str = pattern.get("time", "12:00")
    
    # Generate occurrences
    occurrences = generate_occurrences(
        pattern_type=pattern.get("pattern_type", "daily"),
        frequency=pattern.get("frequency"),
        days_of_week=pattern.get("days_of_week"),
        days_of_month=pattern.get("days_of_month"),
        start_date=pattern.get("start_date"),
        end_date=pattern.get("end_date"),
        exceptions=pattern.get("exceptions", []),
        max_occurrences=pattern.get("max_occurrences"),
        schedule_end_date=schedule_end_date
    )
    
    # Create schedule items for each occurrence
    new_schedule = existing_schedule.copy()
    
    for occ in occurrences:
        date_str = occ.date().isoformat()
        
        # Parse time
        try:
            hour, minute = map(int, time_str.split(":"))
            scheduled_datetime = occ.replace(hour=hour, minute=minute)
        except:
            scheduled_datetime = occ.replace(hour=12, minute=0)
        
        # Create item
        schedule_item = {
            "id": f"{pattern.get('id', 'pattern')}_{occ.isoformat()}",
            "item": item_template,
            "scheduled_time": scheduled_datetime.isoformat(),
            "day_type": "light",
            "shifted": False,
            "shift_reason": "",
            "pattern_id": pattern.get("id")
        }
        
        if date_str not in new_schedule:
            new_schedule[date_str] = []
        
        # Check for conflicts (simple check - could be enhanced)
        conflict = False
        for existing_item in new_schedule[date_str]:
            existing_time = datetime.fromisoformat(existing_item.get("scheduled_time", "").replace("Z", "+00:00"))
            time_diff = abs((scheduled_datetime - existing_time).total_seconds() / 60)
            if time_diff < 15:  # Within 15 minutes
                conflict = True
                break
        
        if not conflict:
            new_schedule[date_str].append(schedule_item)
    
    return new_schedule

def preview_pattern_occurrences(
    pattern: Dict[str, Any],
    count: int = 10
) -> List[str]:
    """Preview next N occurrences of a pattern"""
    
    schedule_end = datetime.now() + timedelta(days=90)  # Look ahead 90 days
    
    occurrences = generate_occurrences(
        pattern_type=pattern.get("pattern_type", "daily"),
        frequency=pattern.get("frequency"),
        days_of_week=pattern.get("days_of_week"),
        days_of_month=pattern.get("days_of_month"),
        start_date=pattern.get("start_date"),
        end_date=pattern.get("end_date"),
        exceptions=pattern.get("exceptions", []),
        max_occurrences=count,
        schedule_end_date=schedule_end
    )
    
    return [occ.date().isoformat() for occ in occurrences[:count]]

