"""
Predictive Modeling & Smart Insights Engine
Phase 20: The Brain - Advanced analytics and recommendations
"""
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from collections import defaultdict
import statistics

def calculate_completion_patterns(progress: Dict[str, Dict], schedule: Dict[str, List[Dict]]) -> Dict[str, Any]:
    """Analyze completion patterns to identify trends"""
    if not progress or not schedule:
        return {}
    
    # Group by day of week
    day_of_week_completion = defaultdict(lambda: {"total": 0, "completed": 0})
    hour_completion = defaultdict(lambda: {"total": 0, "completed": 0})
    item_completion = defaultdict(lambda: {"total": 0, "completed": 0})
    
    for date_str, day_progress in progress.items():
        if date_str == "_meta" or date_str not in schedule:
            continue
            
        try:
            dt = datetime.fromisoformat(date_str)
            day_name = dt.strftime("%A")
        except:
            continue
            
        day_schedule = schedule[date_str]
        day_items_completed = 0
        day_items_total = len(day_schedule)
        
        for item in day_schedule:
            item_id = item.get("id", "")
            item_name = item.get("item", {}).get("name", "Unknown")
            
            if item_id in day_progress:
                status = day_progress[item_id]
                if status == 2:  # Completed
                    day_items_completed += 1
                    item_completion[item_name]["completed"] += 1
                    
                    # Track by hour
                    try:
                        scheduled_time = item.get("scheduled_time", "")
                        if scheduled_time:
                            dt_item = datetime.fromisoformat(scheduled_time.replace("Z", "+00:00"))
                            hour = dt_item.hour
                            hour_completion[hour]["completed"] += 1
                    except:
                        pass
                
                item_completion[item_name]["total"] += 1
                try:
                    scheduled_time = item.get("scheduled_time", "")
                    if scheduled_time:
                        dt_item = datetime.fromisoformat(scheduled_time.replace("Z", "+00:00"))
                        hour = dt_item.hour
                        hour_completion[hour]["total"] += 1
                except:
                    pass
        
        if day_items_total > 0:
            day_of_week_completion[day_name]["total"] += 1
            completion_rate = day_items_completed / day_items_total
            if completion_rate >= 0.5:  # Consider day "completed" if >50%
                day_of_week_completion[day_name]["completed"] += 1
    
    # Calculate rates
    day_rates = {}
    for day, data in day_of_week_completion.items():
        if data["total"] > 0:
            day_rates[day] = round((data["completed"] / data["total"]) * 100, 1)
    
    hour_rates = {}
    for hour, data in hour_completion.items():
        if data["total"] > 0:
            hour_rates[hour] = round((data["completed"] / data["total"]) * 100, 1)
    
    item_rates = {}
    for item, data in item_completion.items():
        if data["total"] > 0:
            item_rates[item] = round((data["completed"] / data["total"]) * 100, 1)
    
    # Find best/worst times
    best_hour = max(hour_rates.items(), key=lambda x: x[1]) if hour_rates else None
    worst_hour = min(hour_rates.items(), key=lambda x: x[1]) if hour_rates else None
    best_day = max(day_rates.items(), key=lambda x: x[1]) if day_rates else None
    worst_day = min(day_rates.items(), key=lambda x: x[1]) if day_rates else None
    
    return {
        "day_of_week_rates": day_rates,
        "hour_completion_rates": hour_rates,
        "item_completion_rates": item_rates,
        "best_hour": {"hour": best_hour[0], "rate": best_hour[1]} if best_hour else None,
        "worst_hour": {"hour": worst_hour[0], "rate": worst_hour[1]} if worst_hour else None,
        "best_day": {"day": best_day[0], "rate": best_day[1]} if best_day else None,
        "worst_day": {"day": worst_day[0], "rate": worst_day[1]} if worst_day else None,
    }

def predict_today_completion(schedule: Dict[str, List[Dict]], progress: Dict[str, Dict], patterns: Dict[str, Any]) -> Dict[str, Any]:
    """Predict today's completion rate based on historical patterns"""
    today = datetime.now().date().isoformat()
    
    if today not in schedule:
        return {"predicted_rate": 0, "confidence": 0, "factors": []}
    
    today_schedule = schedule[today]
    if not today_schedule:
        return {"predicted_rate": 0, "confidence": 0, "factors": []}
    
    try:
        dt = datetime.fromisoformat(today)
        day_name = dt.strftime("%A")
    except:
        day_name = None
    
    factors = []
    predicted_rate = 50.0  # Base prediction
    confidence = 0.5
    
    # Factor 1: Day of week pattern
    if day_name and patterns.get("day_of_week_rates", {}).get(day_name):
        day_rate = patterns["day_of_week_rates"][day_name]
        predicted_rate = (predicted_rate + day_rate) / 2
        factors.append(f"Historical {day_name} completion: {day_rate}%")
        confidence += 0.2
    
    # Factor 2: Hour-based patterns
    hour_rates = patterns.get("hour_completion_rates", {})
    if hour_rates:
        item_hours = []
        for item in today_schedule:
            try:
                scheduled_time = item.get("scheduled_time", "")
                if scheduled_time:
                    dt_item = datetime.fromisoformat(scheduled_time.replace("Z", "+00:00"))
                    hour = dt_item.hour
                    if hour in hour_rates:
                        item_hours.append(hour_rates[hour])
            except:
                pass
        
        if item_hours:
            avg_hour_rate = statistics.mean(item_hours)
            predicted_rate = (predicted_rate + avg_hour_rate) / 2
            factors.append(f"Average completion rate for scheduled hours: {avg_hour_rate:.1f}%")
            confidence += 0.2
    
    # Factor 3: Item-specific patterns
    item_rates = patterns.get("item_completion_rates", {})
    if item_rates:
        item_completion_rates = []
        for item in today_schedule:
            item_name = item.get("item", {}).get("name", "")
            if item_name in item_rates:
                item_completion_rates.append(item_rates[item_name])
        
        if item_completion_rates:
            avg_item_rate = statistics.mean(item_completion_rates)
            predicted_rate = (predicted_rate + avg_item_rate) / 2
            factors.append(f"Average completion rate for scheduled items: {avg_item_rate:.1f}%")
            confidence += 0.1
    
    # Cap confidence at 1.0
    confidence = min(1.0, confidence)
    predicted_rate = max(0, min(100, predicted_rate))
    
    return {
        "predicted_rate": round(predicted_rate, 1),
        "confidence": round(confidence, 2),
        "factors": factors
    }

def generate_smart_recommendations(schedule: Dict[str, List[Dict]], progress: Dict[str, Dict], patterns: Dict[str, Any], settings: Any) -> List[Dict[str, Any]]:
    """Generate smart recommendations for schedule optimization"""
    recommendations = []
    
    if not patterns:
        return recommendations
    
    # Recommendation 1: Best time to schedule items
    best_hour = patterns.get("best_hour")
    worst_hour = patterns.get("worst_hour")
    
    if best_hour and worst_hour and best_hour["rate"] > worst_hour["rate"] + 10:
        recommendations.append({
            "type": "timing",
            "priority": "high",
            "title": "Optimize Schedule Timing",
            "message": f"You're {best_hour['rate'] - worst_hour['rate']:.0f}% more likely to complete items at {best_hour['hour']}:00 than at {worst_hour['hour']}:00. Consider moving items from {worst_hour['hour']}:00 to {best_hour['hour']}:00.",
            "action": f"Reschedule items from {worst_hour['hour']}:00 to {best_hour['hour']}:00"
        })
    
    # Recommendation 2: Day of week patterns
    best_day = patterns.get("best_day")
    worst_day = patterns.get("worst_day")
    
    if best_day and worst_day and best_day["rate"] > worst_day["rate"] + 15:
        recommendations.append({
            "type": "pattern",
            "priority": "medium",
            "title": "Day of Week Pattern Detected",
            "message": f"You complete {best_day['rate'] - worst_day['rate']:.0f}% more items on {best_day['day']}s than on {worst_day['day']}s. Consider adjusting your schedule accordingly.",
            "action": f"Review {worst_day['day']} schedule"
        })
    
    # Recommendation 3: Low-performing items
    item_rates = patterns.get("item_completion_rates", {})
    if item_rates:
        low_performers = [(item, rate) for item, rate in item_rates.items() if rate < 50]
        if low_performers:
            worst_item = min(low_performers, key=lambda x: x[1])
            recommendations.append({
                "type": "item",
                "priority": "medium",
                "title": "Low Completion Rate Item",
                "message": f"'{worst_item[0]}' has only {worst_item[1]:.0f}% completion rate. Consider adjusting timing, dose, or removing if not needed.",
                "action": f"Review {worst_item[0]}"
            })
    
    # Recommendation 4: Too many items
    today = datetime.now().date().isoformat()
    if today in schedule:
        today_items = len(schedule[today])
        if today_items > 15:
            recommendations.append({
                "type": "schedule",
                "priority": "low",
                "title": "High Item Count",
                "message": f"You have {today_items} items scheduled today. Consider consolidating or removing optional items to improve completion rates.",
                "action": "Review optional items"
            })
    
    return recommendations

def calculate_trends(progress: Dict[str, Dict], schedule: Dict[str, List[Dict]], days: int = 30) -> Dict[str, Any]:
    """Calculate trends over the last N days"""
    if not progress or not schedule:
        return {}
    
    today = datetime.now().date()
    dates = [(today - timedelta(days=i)).isoformat() for i in range(days)]
    
    completion_rates = []
    item_counts = []
    
    for date_str in dates:
        if date_str not in schedule:
            continue
            
        day_schedule = schedule[date_str]
        day_progress = progress.get(date_str, {})
        
        total = len(day_schedule)
        completed = sum(1 for item in day_schedule 
                       if item.get("id", "") in day_progress and day_progress[item.get("id", "")] == 2)
        
        if total > 0:
            rate = (completed / total) * 100
            completion_rates.append(rate)
            item_counts.append(total)
    
    if not completion_rates:
        return {}
    
    # Calculate trend direction
    if len(completion_rates) >= 7:
        recent_avg = statistics.mean(completion_rates[:7])
        older_avg = statistics.mean(completion_rates[7:14]) if len(completion_rates) >= 14 else statistics.mean(completion_rates[7:])
        trend_direction = "improving" if recent_avg > older_avg else "declining" if recent_avg < older_avg else "stable"
        trend_magnitude = abs(recent_avg - older_avg)
    else:
        trend_direction = "insufficient_data"
        trend_magnitude = 0
    
    return {
        "average_completion_rate": round(statistics.mean(completion_rates), 1),
        "trend_direction": trend_direction,
        "trend_magnitude": round(trend_magnitude, 1),
        "average_items_per_day": round(statistics.mean(item_counts), 1) if item_counts else 0,
        "data_points": len(completion_rates)
    }

