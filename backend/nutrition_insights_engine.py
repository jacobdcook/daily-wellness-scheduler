"""
Nutrition Insights & Recommendations Engine
Analyzes user nutrition data to provide insights, patterns, and personalized recommendations
"""
import json
import os
from datetime import datetime, date, timedelta
from typing import Dict, List, Optional, Any, Tuple
from collections import defaultdict
from statistics import mean, median, stdev

def get_nutrition_entries_filepath(user_id: str) -> str:
    """Get filepath for user's nutrition entries"""
    user_dir = os.path.join("data", user_id)
    os.makedirs(user_dir, exist_ok=True)
    return os.path.join(user_dir, "nutrition_entries.json")

def load_nutrition_entries(user_id: str, days: int = 365) -> List[Dict[str, Any]]:
    """Load nutrition entries for analysis"""
    filepath = get_nutrition_entries_filepath(user_id)
    
    if not os.path.exists(filepath):
        return []
    
    try:
        with open(filepath, "r") as f:
            all_entries = json.load(f)
        
        # Filter by date range
        cutoff_date = date.today() - timedelta(days=days)
        filtered_entries = []
        for entry in all_entries:
            try:
                entry_date = datetime.fromisoformat(entry.get("date", "")).date()
                if entry_date >= cutoff_date:
                    filtered_entries.append(entry)
            except (ValueError, TypeError):
                continue
        
        return filtered_entries
    except Exception as e:
        print(f"Error loading nutrition entries: {e}")
        return []

def analyze_nutrition_patterns(user_id: str, days: int = 30) -> Dict[str, Any]:
    """Analyze nutrition patterns and trends"""
    entries = load_nutrition_entries(user_id, days=days)
    
    if not entries:
        return {
            "has_data": False,
            "message": "Not enough data to analyze. Start logging meals to get insights!"
        }
    
    # Group entries by date
    entries_by_date = defaultdict(list)
    for entry in entries:
        try:
            entry_date = datetime.fromisoformat(entry.get("date", "")).date()
            entries_by_date[entry_date.isoformat()].append(entry)
        except (ValueError, TypeError):
            continue
    
    # Calculate daily totals
    daily_totals = []
    for date_str, day_entries in entries_by_date.items():
        daily_total = {
            "date": date_str,
            "calories": 0,
            "protein": 0,
            "carbs": 0,
            "fats": 0,
            "fiber": 0,
            "sugar": 0,
            "sodium": 0,
            "meal_count": len(set(e.get("meal_type", "snack") for e in day_entries))
        }
        
        for entry in day_entries:
            nutrition = entry.get("nutrition", {})
            daily_total["calories"] += nutrition.get("calories", 0)
            daily_total["protein"] += nutrition.get("protein", 0)
            daily_total["carbs"] += nutrition.get("carbs", 0)
            daily_total["fats"] += nutrition.get("fats", 0)
            daily_total["fiber"] += nutrition.get("fiber", 0) or 0
            daily_total["sugar"] += nutrition.get("sugar", 0) or 0
            daily_total["sodium"] += nutrition.get("sodium", 0) or 0
        
        daily_totals.append(daily_total)
    
    if not daily_totals:
        return {"has_data": False, "message": "No valid nutrition data found"}
    
    # Calculate statistics
    calories_list = [d["calories"] for d in daily_totals]
    protein_list = [d["protein"] for d in daily_totals]
    carbs_list = [d["carbs"] for d in daily_totals]
    fats_list = [d["fats"] for d in daily_totals]
    
    avg_calories = mean(calories_list) if calories_list else 0
    avg_protein = mean(protein_list) if protein_list else 0
    avg_carbs = mean(carbs_list) if carbs_list else 0
    avg_fats = mean(fats_list) if fats_list else 0
    
    # Day of week analysis
    weekday_totals = defaultdict(list)
    weekend_totals = []
    
    for daily in daily_totals:
        try:
            entry_date = datetime.fromisoformat(daily["date"]).date()
            weekday = entry_date.weekday()  # 0=Monday, 6=Sunday
            if weekday < 5:  # Monday-Friday
                weekday_totals[weekday].append(daily["calories"])
            else:  # Saturday-Sunday
                weekend_totals.append(daily["calories"])
        except (ValueError, TypeError):
            continue
    
    avg_weekday_calories = mean([mean(calories) for calories in weekday_totals.values()]) if weekday_totals else avg_calories
    avg_weekend_calories = mean(weekend_totals) if weekend_totals else avg_calories
    
    # Meal type analysis
    meal_type_totals = defaultdict(lambda: {"calories": 0, "count": 0})
    for entry in entries:
        meal_type = entry.get("meal_type", "snack")
        nutrition = entry.get("nutrition", {})
        meal_type_totals[meal_type]["calories"] += nutrition.get("calories", 0)
        meal_type_totals[meal_type]["count"] += 1
    
    avg_calories_by_meal = {}
    for meal_type, totals in meal_type_totals.items():
        if totals["count"] > 0:
            avg_calories_by_meal[meal_type] = totals["calories"] / totals["count"]
    
    # Trend analysis (last 7 days vs previous 7 days)
    sorted_dates = sorted(daily_totals, key=lambda x: x["date"])
    if len(sorted_dates) >= 14:
        recent_7 = sorted_dates[-7:]
        previous_7 = sorted_dates[-14:-7]
        
        recent_avg = mean([d["calories"] for d in recent_7])
        previous_avg = mean([d["calories"] for d in previous_7])
        
        calorie_trend = "increasing" if recent_avg > previous_avg * 1.05 else "decreasing" if recent_avg < previous_avg * 0.95 else "stable"
        calorie_change_percent = ((recent_avg - previous_avg) / previous_avg * 100) if previous_avg > 0 else 0
    else:
        calorie_trend = "insufficient_data"
        calorie_change_percent = 0
    
    # Consistency analysis
    calorie_std = stdev(calories_list) if len(calories_list) > 1 else 0
    consistency_score = max(0, 100 - (calorie_std / avg_calories * 100)) if avg_calories > 0 else 0
    
    # Most logged foods
    food_counts = defaultdict(int)
    for entry in entries:
        food_name = entry.get("food_item", {}).get("name", "") or entry.get("food_name", "")
        if food_name:
            food_counts[food_name] += 1
    
    top_foods = sorted(food_counts.items(), key=lambda x: x[1], reverse=True)[:10]
    
    return {
        "has_data": True,
        "days_analyzed": len(daily_totals),
        "total_entries": len(entries),
        "averages": {
            "calories": round(avg_calories, 1),
            "protein": round(avg_protein, 1),
            "carbs": round(avg_carbs, 1),
            "fats": round(avg_fats, 1),
        },
        "weekday_vs_weekend": {
            "weekday_avg": round(avg_weekday_calories, 1),
            "weekend_avg": round(avg_weekend_calories, 1),
            "difference": round(avg_weekend_calories - avg_weekday_calories, 1),
            "weekend_higher": avg_weekend_calories > avg_weekday_calories * 1.1
        },
        "meal_breakdown": {
            meal_type: round(avg_cal, 1) for meal_type, avg_cal in avg_calories_by_meal.items()
        },
        "trends": {
            "calorie_trend": calorie_trend,
            "calorie_change_percent": round(calorie_change_percent, 1),
            "consistency_score": round(consistency_score, 1)
        },
        "top_foods": [{"name": name, "count": count} for name, count in top_foods],
        "daily_totals": daily_totals[-30:]  # Last 30 days for charts
    }

def generate_recommendations(user_id: str, days: int = 30) -> List[Dict[str, Any]]:
    """Generate personalized nutrition recommendations"""
    from .nutrition_engine import load_nutrition_goals
    
    patterns = analyze_nutrition_patterns(user_id, days=days)
    goals = load_nutrition_goals(user_id)
    
    if not patterns.get("has_data"):
        return [{
            "type": "info",
            "priority": "low",
            "title": "Start Logging",
            "message": "Log your meals to get personalized recommendations!",
            "action": "log_meals"
        }]
    
    recommendations = []
    
    # Goal adherence recommendations
    if goals:
        goal_calories = goals.get("daily_calories", 2000)
        avg_calories = patterns.get("averages", {}).get("calories", 0)
        
        if avg_calories > goal_calories * 1.1:
            recommendations.append({
                "type": "warning",
                "priority": "high",
                "title": "Calorie Goal Exceeded",
                "message": f"You're averaging {round(avg_calories)} calories/day, which is {round((avg_calories / goal_calories - 1) * 100)}% above your goal of {goal_calories}.",
                "suggestion": "Consider reducing portion sizes or choosing lower-calorie options.",
                "action": "adjust_goals"
            })
        elif avg_calories < goal_calories * 0.9:
            recommendations.append({
                "type": "info",
                "priority": "medium",
                "title": "Below Calorie Goal",
                "message": f"You're averaging {round(avg_calories)} calories/day, which is {round((1 - avg_calories / goal_calories) * 100)}% below your goal.",
                "suggestion": "Consider adding healthy snacks or increasing portion sizes to meet your goals.",
                "action": "add_snacks"
            })
    
    # Weekend eating pattern
    weekday_vs_weekend = patterns.get("weekday_vs_weekend", {})
    if weekday_vs_weekend.get("weekend_higher"):
        diff = weekday_vs_weekend.get("difference", 0)
        recommendations.append({
            "type": "warning",
            "priority": "medium",
            "title": "Weekend Eating Pattern",
            "message": f"You consume {round(diff)} more calories on weekends than weekdays.",
            "suggestion": "Try meal prepping on weekends or planning healthier weekend meals.",
            "action": "plan_weekend_meals"
        })
    
    # Consistency recommendation
    consistency = patterns.get("trends", {}).get("consistency_score", 100)
    if consistency < 70:
        recommendations.append({
            "type": "info",
            "priority": "medium",
            "title": "Improve Consistency",
            "message": f"Your daily calorie intake varies significantly (consistency score: {round(consistency)}%).",
            "suggestion": "Try to maintain more consistent eating patterns for better results.",
            "action": "improve_consistency"
        })
    
    # Protein recommendations
    if goals:
        goal_protein = goals.get("protein_grams", 0)
        avg_protein = patterns.get("averages", {}).get("protein", 0)
        
        if goal_protein > 0 and avg_protein < goal_protein * 0.8:
            gap = goal_protein - avg_protein
            recommendations.append({
                "type": "warning",
                "priority": "high",
                "title": "Low Protein Intake",
                "message": f"You're averaging {round(avg_protein)}g protein/day, but your goal is {goal_protein}g.",
                "suggestion": f"Add {round(gap)}g more protein daily. Consider lean meats, eggs, Greek yogurt, or protein shakes.",
                "action": "increase_protein"
            })
    
    # Meal timing recommendations
    meal_breakdown = patterns.get("meal_breakdown", {})
    breakfast_cals = meal_breakdown.get("breakfast", 0)
    dinner_cals = meal_breakdown.get("dinner", 0)
    
    if breakfast_cals < 300 and dinner_cals > 600:
        recommendations.append({
            "type": "info",
            "priority": "low",
            "title": "Meal Distribution",
            "message": "You're eating light breakfasts but heavy dinners.",
            "suggestion": "Consider a more balanced distribution - a larger breakfast can boost metabolism and energy.",
            "action": "balance_meals"
        })
    
    # Trend recommendations
    trends = patterns.get("trends", {})
    if trends.get("calorie_trend") == "increasing":
        change = trends.get("calorie_change_percent", 0)
        recommendations.append({
            "type": "warning",
            "priority": "medium",
            "title": "Calorie Intake Increasing",
            "message": f"Your calorie intake has increased by {round(change)}% in the last week.",
            "suggestion": "Review recent meals and consider portion control or healthier alternatives.",
            "action": "review_recent_meals"
        })
    
    # Variety recommendation
    top_foods = patterns.get("top_foods", [])
    if len(top_foods) > 0 and top_foods[0].get("count", 0) > len(patterns.get("daily_totals", [])) * 0.3:
        recommendations.append({
            "type": "info",
            "priority": "low",
            "title": "Add Variety",
            "message": f"You eat '{top_foods[0].get('name')}' very frequently.",
            "suggestion": "Try adding more variety to your diet for better nutrition and enjoyment.",
            "action": "explore_new_foods"
        })
    
    # Sort by priority
    priority_order = {"high": 0, "medium": 1, "low": 2}
    recommendations.sort(key=lambda x: priority_order.get(x.get("priority", "low"), 2))
    
    return recommendations

def generate_weekly_report(user_id: str, week_start: Optional[str] = None) -> Dict[str, Any]:
    """Generate a weekly nutrition report"""
    if not week_start:
        # Get Monday of current week
        today = date.today()
        days_since_monday = today.weekday()
        week_start_date = today - timedelta(days=days_since_monday)
        week_start = week_start_date.isoformat()
    else:
        week_start_date = datetime.fromisoformat(week_start).date()
    
    week_end_date = week_start_date + timedelta(days=6)
    week_end = week_end_date.isoformat()
    
    entries = load_nutrition_entries(user_id, days=365)
    
    # Filter entries for this week
    week_entries = []
    for entry in entries:
        try:
            entry_date = datetime.fromisoformat(entry.get("date", "")).date()
            if week_start_date <= entry_date <= week_end_date:
                week_entries.append(entry)
        except (ValueError, TypeError):
            continue
    
    if not week_entries:
        return {
            "week_start": week_start,
            "week_end": week_end,
            "has_data": False,
            "message": "No data logged for this week"
        }
    
    # Calculate weekly totals
    weekly_total = {
        "calories": 0,
        "protein": 0,
        "carbs": 0,
        "fats": 0,
        "fiber": 0,
        "sugar": 0,
        "sodium": 0,
        "days_logged": len(set(e.get("date", "") for e in week_entries)),
        "total_meals": len(week_entries)
    }
    
    for entry in week_entries:
        nutrition = entry.get("nutrition", {})
        weekly_total["calories"] += nutrition.get("calories", 0)
        weekly_total["protein"] += nutrition.get("protein", 0)
        weekly_total["carbs"] += nutrition.get("carbs", 0)
        weekly_total["fats"] += nutrition.get("fats", 0)
        weekly_total["fiber"] += nutrition.get("fiber", 0) or 0
        weekly_total["sugar"] += nutrition.get("sugar", 0) or 0
        weekly_total["sodium"] += nutrition.get("sodium", 0) or 0
    
    # Calculate daily averages
    days_logged = weekly_total["days_logged"] or 1
    weekly_avg = {
        "calories": round(weekly_total["calories"] / days_logged, 1),
        "protein": round(weekly_total["protein"] / days_logged, 1),
        "carbs": round(weekly_total["carbs"] / days_logged, 1),
        "fats": round(weekly_total["fats"] / days_logged, 1),
    }
    
    # Compare to goals
    from .nutrition_engine import load_nutrition_goals
    goals = load_nutrition_goals(user_id)
    
    goal_comparison = {}
    if goals:
        goal_calories = goals.get("daily_calories", 2000)
        goal_protein = goals.get("protein_grams", 0)
        goal_carbs = goals.get("carbs_grams", 0)
        goal_fats = goals.get("fats_grams", 0)
        
        goal_comparison = {
            "calories": {
                "goal": goal_calories,
                "actual": weekly_avg["calories"],
                "percent": round((weekly_avg["calories"] / goal_calories * 100) if goal_calories > 0 else 0, 1),
                "met": weekly_avg["calories"] >= goal_calories * 0.9 and weekly_avg["calories"] <= goal_calories * 1.1
            },
            "protein": {
                "goal": goal_protein,
                "actual": weekly_avg["protein"],
                "percent": round((weekly_avg["protein"] / goal_protein * 100) if goal_protein > 0 else 0, 1),
                "met": weekly_avg["protein"] >= goal_protein * 0.9 if goal_protein > 0 else True
            },
            "carbs": {
                "goal": goal_carbs,
                "actual": weekly_avg["carbs"],
                "percent": round((weekly_avg["carbs"] / goal_carbs * 100) if goal_carbs > 0 else 0, 1),
                "met": weekly_avg["carbs"] >= goal_carbs * 0.9 if goal_carbs > 0 else True
            },
            "fats": {
                "goal": goal_fats,
                "actual": weekly_avg["fats"],
                "percent": round((weekly_avg["fats"] / goal_fats * 100) if goal_fats > 0 else 0, 1),
                "met": weekly_avg["fats"] >= goal_fats * 0.9 if goal_fats > 0 else True
            }
        }
    
    # Daily breakdown
    daily_breakdown = defaultdict(lambda: {
        "calories": 0,
        "protein": 0,
        "carbs": 0,
        "fats": 0,
        "meals": []
    })
    
    for entry in week_entries:
        date_str = entry.get("date", "")
        nutrition = entry.get("nutrition", {})
        daily_breakdown[date_str]["calories"] += nutrition.get("calories", 0)
        daily_breakdown[date_str]["protein"] += nutrition.get("protein", 0)
        daily_breakdown[date_str]["carbs"] += nutrition.get("carbs", 0)
        daily_breakdown[date_str]["fats"] += nutrition.get("fats", 0)
        daily_breakdown[date_str]["meals"].append(entry.get("meal_type", "snack"))
    
    # Meal type breakdown
    meal_type_totals = defaultdict(lambda: {"calories": 0, "count": 0})
    for entry in week_entries:
        meal_type = entry.get("meal_type", "snack")
        nutrition = entry.get("nutrition", {})
        meal_type_totals[meal_type]["calories"] += nutrition.get("calories", 0)
        meal_type_totals[meal_type]["count"] += 1
    
    return {
        "week_start": week_start,
        "week_end": week_end,
        "has_data": True,
        "summary": {
            "total_calories": round(weekly_total["calories"], 1),
            "total_protein": round(weekly_total["protein"], 1),
            "total_carbs": round(weekly_total["carbs"], 1),
            "total_fats": round(weekly_total["fats"], 1),
            "days_logged": weekly_total["days_logged"],
            "total_meals": weekly_total["total_meals"]
        },
        "averages": weekly_avg,
        "goal_comparison": goal_comparison,
        "daily_breakdown": {
            date: {
                "calories": round(totals["calories"], 1),
                "protein": round(totals["protein"], 1),
                "carbs": round(totals["carbs"], 1),
                "fats": round(totals["fats"], 1),
                "meal_count": len(set(totals["meals"]))
            }
            for date, totals in daily_breakdown.items()
        },
        "meal_breakdown": {
            meal_type: {
                "total_calories": round(totals["calories"], 1),
                "avg_per_meal": round(totals["calories"] / totals["count"], 1) if totals["count"] > 0 else 0,
                "meal_count": totals["count"]
            }
            for meal_type, totals in meal_type_totals.items()
        }
    }

def detect_nutrition_patterns(user_id: str, days: int = 60) -> List[Dict[str, Any]]:
    """Detect specific nutrition patterns and insights"""
    patterns = analyze_nutrition_patterns(user_id, days=days)
    
    if not patterns.get("has_data"):
        return []
    
    detected_patterns = []
    
    # High calorie days pattern
    daily_totals = patterns.get("daily_totals", [])
    if daily_totals:
        calories_list = [d["calories"] for d in daily_totals]
        if calories_list:
            high_threshold = mean(calories_list) + stdev(calories_list) if len(calories_list) > 1 else mean(calories_list) * 1.2
            high_days = [d for d in daily_totals if d["calories"] > high_threshold]
            
            if len(high_days) > len(daily_totals) * 0.2:  # More than 20% of days
                detected_patterns.append({
                    "type": "high_calorie_days",
                    "title": "Frequent High-Calorie Days",
                    "description": f"You have {len(high_days)} days with significantly higher calorie intake.",
                    "severity": "medium",
                    "suggestion": "Identify triggers for high-calorie days and plan ahead."
                })
    
    # Low protein days
    protein_list = [d["protein"] for d in daily_totals if d.get("protein", 0) > 0]
    if protein_list:
        low_protein_threshold = mean(protein_list) - stdev(protein_list) if len(protein_list) > 1 else mean(protein_list) * 0.7
        low_protein_days = [d for d in daily_totals if d.get("protein", 0) < low_protein_threshold and d.get("protein", 0) > 0]
        
        if len(low_protein_days) > len(daily_totals) * 0.3:  # More than 30% of days
            detected_patterns.append({
                "type": "low_protein_days",
                "title": "Frequent Low-Protein Days",
                "description": f"You have {len(low_protein_days)} days with below-average protein intake.",
                "severity": "high",
                "suggestion": "Add protein-rich foods to your meals, especially on low-protein days."
            })
    
    # Meal skipping pattern
    meal_breakdown = patterns.get("meal_breakdown", {})
    if "breakfast" not in meal_breakdown or meal_breakdown.get("breakfast", 0) < 100:
        detected_patterns.append({
            "type": "skipping_breakfast",
            "title": "Breakfast Skipping",
            "description": "You rarely log breakfast meals.",
            "severity": "low",
            "suggestion": "Consider adding breakfast to boost metabolism and energy levels."
        })
    
    # Weekend pattern
    weekday_vs_weekend = patterns.get("weekday_vs_weekend", {})
    if weekday_vs_weekend.get("weekend_higher") and weekday_vs_weekend.get("difference", 0) > 300:
        detected_patterns.append({
            "type": "weekend_overeating",
            "title": "Weekend Overeating Pattern",
            "description": f"You consume {round(weekday_vs_weekend.get('difference', 0))} more calories on weekends.",
            "severity": "medium",
            "suggestion": "Plan weekend meals in advance to maintain consistency."
        })
    
    return detected_patterns

