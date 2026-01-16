"""
Comprehensive Analytics Engine
Phase 27: Analytics Dashboard & Reporting
"""
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from collections import defaultdict
import statistics

def calculate_comprehensive_analytics(
    user_id: str,
    progress: Dict[str, Dict],
    schedule: Dict[str, List[Dict]],
    date_range: Optional[Tuple[str, str]] = None
) -> Dict[str, Any]:
    """Calculate comprehensive analytics for the user"""
    
    # Determine date range
    if date_range:
        start_date = datetime.fromisoformat(date_range[0]).date()
        end_date = datetime.fromisoformat(date_range[1]).date()
    else:
        # Default to last 30 days
        end_date = datetime.now().date()
        start_date = end_date - timedelta(days=30)
    
    # Filter data to date range
    filtered_schedule = {}
    filtered_progress = {}
    
    current_date = start_date
    while current_date <= end_date:
        date_str = current_date.isoformat()
        if date_str in schedule:
            filtered_schedule[date_str] = schedule[date_str]
        if date_str in progress:
            filtered_progress[date_str] = progress[date_str]
        current_date += timedelta(days=1)
    
    # Calculate metrics
    total_days = len(filtered_schedule)
    total_items = sum(len(items) for items in filtered_schedule.values())
    
    completed_count = 0
    in_progress_count = 0
    pending_count = 0
    
    item_stats = defaultdict(lambda: {"total": 0, "completed": 0, "in_progress": 0, "pending": 0})
    daily_completion_rates = []
    daily_item_counts = []
    
    for date_str, day_schedule in filtered_schedule.items():
        day_progress = filtered_progress.get(date_str, {})
        day_completed = 0
        day_in_progress = 0
        day_total = len(day_schedule)
        
        for item in day_schedule:
            item_id = item.get("id", "")
            item_name = item.get("item", {}).get("name", "Unknown")
            
            item_stats[item_name]["total"] += 1
            
            if item_id in day_progress:
                status = day_progress[item_id]
                if status == 2:
                    completed_count += 1
                    day_completed += 1
                    item_stats[item_name]["completed"] += 1
                elif status == 1:
                    in_progress_count += 1
                    day_in_progress += 1
                    item_stats[item_name]["in_progress"] += 1
                else:
                    pending_count += 1
                    item_stats[item_name]["pending"] += 1
            else:
                pending_count += 1
                item_stats[item_name]["pending"] += 1
        
        if day_total > 0:
            completion_rate = (day_completed / day_total) * 100
            daily_completion_rates.append({
                "date": date_str,
                "rate": round(completion_rate, 1),
                "completed": day_completed,
                "total": day_total
            })
            daily_item_counts.append(day_total)
    
    # Calculate overall completion rate
    overall_completion_rate = (completed_count / total_items * 100) if total_items > 0 else 0
    
    # Calculate item performance
    item_performance = []
    for item_name, stats in item_stats.items():
        if stats["total"] > 0:
            completion_rate = (stats["completed"] / stats["total"]) * 100
            item_performance.append({
                "name": item_name,
                "completion_rate": round(completion_rate, 1),
                "total": stats["total"],
                "completed": stats["completed"],
                "in_progress": stats["in_progress"],
                "pending": stats["pending"]
            })
    
    # Sort by completion rate
    item_performance.sort(key=lambda x: x["completion_rate"], reverse=True)
    
    # Calculate trends
    if len(daily_completion_rates) >= 7:
        recent_avg = statistics.mean([d["rate"] for d in daily_completion_rates[:7]])
        older_avg = statistics.mean([d["rate"] for d in daily_completion_rates[7:14]]) if len(daily_completion_rates) >= 14 else statistics.mean([d["rate"] for d in daily_completion_rates[7:]])
        trend_direction = "improving" if recent_avg > older_avg else "declining" if recent_avg < older_avg else "stable"
        trend_magnitude = abs(recent_avg - older_avg)
    else:
        trend_direction = "insufficient_data"
        trend_magnitude = 0
        recent_avg = statistics.mean([d["rate"] for d in daily_completion_rates]) if daily_completion_rates else 0
    
    return {
        "overview": {
            "total_days": total_days,
            "total_items": total_items,
            "completed_count": completed_count,
            "in_progress_count": in_progress_count,
            "pending_count": pending_count,
            "overall_completion_rate": round(overall_completion_rate, 1),
            "average_items_per_day": round(statistics.mean(daily_item_counts), 1) if daily_item_counts else 0,
            "trend_direction": trend_direction,
            "trend_magnitude": round(trend_magnitude, 1),
            "recent_average": round(recent_avg, 1)
        },
        "daily_completion_rates": daily_completion_rates,
        "item_performance": item_performance,
        "date_range": {
            "start": start_date.isoformat(),
            "end": end_date.isoformat()
        }
    }

def calculate_time_analytics(
    progress: Dict[str, Dict],
    schedule: Dict[str, List[Dict]]
) -> Dict[str, Any]:
    """Calculate time-based analytics (hour of day, day of week)"""
    
    hour_stats = defaultdict(lambda: {"total": 0, "completed": 0})
    day_stats = defaultdict(lambda: {"total": 0, "completed": 0})
    
    for date_str, day_schedule in schedule.items():
        day_progress = progress.get(date_str, {})
        
        try:
            dt = datetime.fromisoformat(date_str)
            day_name = dt.strftime("%A")
        except:
            continue
        
        for item in day_schedule:
            item_id = item.get("id", "")
            
            try:
                scheduled_time = item.get("scheduled_time", "")
                if scheduled_time:
                    dt_item = datetime.fromisoformat(scheduled_time.replace("Z", "+00:00"))
                    hour = dt_item.hour
                    hour_stats[hour]["total"] += 1
                    
                    if item_id in day_progress and day_progress[item_id] == 2:
                        hour_stats[hour]["completed"] += 1
            except:
                pass
            
            day_stats[day_name]["total"] += 1
            if item_id in day_progress and day_progress[item_id] == 2:
                day_stats[day_name]["completed"] += 1
    
    # Calculate rates
    hour_rates = {}
    for hour in range(24):
        if hour in hour_stats:
            total = hour_stats[hour]["total"]
            completed = hour_stats[hour]["completed"]
            if total > 0:
                hour_rates[hour] = {
                    "hour": hour,
                    "completion_rate": round((completed / total) * 100, 1),
                    "total": total,
                    "completed": completed
                }
    
    day_rates = {}
    day_order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    for day in day_order:
        if day in day_stats:
            total = day_stats[day]["total"]
            completed = day_stats[day]["completed"]
            if total > 0:
                day_rates[day] = {
                    "day": day,
                    "completion_rate": round((completed / total) * 100, 1),
                    "total": total,
                    "completed": completed
                }
    
    # Find best/worst
    best_hour = max(hour_rates.values(), key=lambda x: x["completion_rate"]) if hour_rates else None
    worst_hour = min(hour_rates.values(), key=lambda x: x["completion_rate"]) if hour_rates else None
    best_day = max(day_rates.values(), key=lambda x: x["completion_rate"]) if day_rates else None
    worst_day = min(day_rates.values(), key=lambda x: x["completion_rate"]) if day_rates else None
    
    return {
        "hour_rates": [hour_rates[h] for h in sorted(hour_rates.keys())],
        "day_rates": [day_rates[d] for d in day_order if d in day_rates],
        "best_hour": best_hour,
        "worst_hour": worst_hour,
        "best_day": best_day,
        "worst_day": worst_day
    }

def generate_trend_data(
    progress: Dict[str, Dict],
    schedule: Dict[str, List[Dict]],
    days: int = 30
) -> List[Dict[str, Any]]:
    """Generate time-series trend data for charts"""
    
    today = datetime.now().date()
    trend_data = []
    
    for i in range(days - 1, -1, -1):
        date = today - timedelta(days=i)
        date_str = date.isoformat()
        
        if date_str in schedule:
            day_schedule = schedule[date_str]
            day_progress = progress.get(date_str, {})
            
            total = len(day_schedule)
            completed = sum(1 for item in day_schedule 
                          if item.get("id", "") in day_progress and day_progress[item.get("id", "")] == 2)
            
            completion_rate = (completed / total * 100) if total > 0 else 0
            
            trend_data.append({
                "date": date_str,
                "completion_rate": round(completion_rate, 1),
                "completed": completed,
                "total": total
            })
    
    return trend_data

