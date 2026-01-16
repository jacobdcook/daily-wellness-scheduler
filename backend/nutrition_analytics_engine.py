"""
Nutrition Analytics Engine - Predictive analytics, correlations, reports, streaks, and insights
"""
import json
import os
from datetime import datetime, date, timedelta
from typing import Dict, List, Optional, Any
from pydantic import BaseModel

class Prediction(BaseModel):
    """Predictive metric"""
    metric: str
    current_value: float
    projected_value: float
    projected_date: Optional[str] = None
    trend: str  # "up", "down", "stable"
    confidence: float  # 0-1

class Correlation(BaseModel):
    """Correlation between metrics"""
    metric1: str
    metric2: str
    correlation: float
    strength: str
    insight: str

class Streak(BaseModel):
    """Streak information"""
    type: str  # "calorie_goal", "protein_goal", etc.
    current_streak: int
    longest_streak: int
    start_date: Optional[str] = None

def calculate_predictions(user_id: str, days: int = 30) -> Dict[str, Any]:
    """Calculate predictive metrics"""
    from .nutrition_engine import load_nutrition_entries, calculate_daily_summary, load_nutrition_goals
    from .weight_engine import load_weight_entries, load_weight_goals, get_latest_weight
    
    # Get nutrition data
    entries = load_nutrition_entries(user_id, days=days)
    goals = load_nutrition_goals(user_id)
    weight_goals = load_weight_goals(user_id)
    
    if not entries:
        return {
            "projected_goal_date": None,
            "on_track": False,
            "projected_weight": None,
            "trend": "insufficient_data"
        }
    
    # Group by date
    daily_totals = {}
    for entry in entries:
        entry_date = entry.get("date", "")
        if entry_date not in daily_totals:
            daily_totals[entry_date] = {
                "calories": 0.0,
                "protein": 0.0,
                "carbs": 0.0,
                "fats": 0.0
            }
        nutrition = entry.get("nutrition", {})
        daily_totals[entry_date]["calories"] += nutrition.get("calories", 0)
        daily_totals[entry_date]["protein"] += nutrition.get("protein", 0)
        daily_totals[entry_date]["carbs"] += nutrition.get("carbs", 0)
        daily_totals[entry_date]["fats"] += nutrition.get("fats", 0)
    
    # Calculate average daily calories
    if not daily_totals:
        return {"projected_goal_date": None, "on_track": False}
    
    avg_calories = sum(d["calories"] for d in daily_totals.values()) / len(daily_totals)
    goal_calories = goals.get("daily_calories", 2000) if goals else 2000
    
    # Predict weight goal date if weight goal exists
    projected_goal_date = None
    projected_weight = None
    on_track = True
    
    if weight_goals and weight_goals.get("goal_type") != "maintain":
        current_weight = get_latest_weight(user_id) or weight_goals.get("current_weight_kg", 70.0)
        target_weight = weight_goals.get("target_weight_kg")
        weekly_change_kg = weight_goals.get("weekly_change_kg")
        
        if target_weight and weekly_change_kg:
            weight_diff = abs(target_weight - current_weight)
            if weekly_change_kg != 0:
                weeks_needed = weight_diff / abs(weekly_change_kg)
                projected_goal_date = (date.today() + timedelta(weeks=weeks_needed)).strftime("%Y-%m-%d")
                
                # Check if on track based on current calorie adherence
                calorie_deficit = goal_calories - avg_calories
                expected_weekly_change = (calorie_deficit * 7) / 7700  # 1kg = 7700 calories
                
                if weight_goals.get("goal_type") == "lose":
                    on_track = expected_weekly_change >= abs(weekly_change_kg) * 0.8
                elif weight_goals.get("goal_type") == "gain":
                    on_track = expected_weekly_change >= abs(weekly_change_kg) * 0.8
                
                # Project weight in 30 days
                projected_weight = current_weight + (expected_weekly_change * (30 / 7))
    
    return {
        "projected_goal_date": projected_goal_date,
        "on_track": on_track,
        "projected_weight": round(projected_weight, 1) if projected_weight else None,
        "trend": "up" if avg_calories > goal_calories * 1.1 else "down" if avg_calories < goal_calories * 0.9 else "stable",
        "average_daily_calories": round(avg_calories, 1),
        "goal_calories": goal_calories,
        "calorie_adherence": round((avg_calories / goal_calories) * 100, 1) if goal_calories > 0 else 0
    }

def calculate_correlations(user_id: str, days: int = 30) -> Dict[str, Any]:
    """Calculate correlations between nutrition and weight"""
    from .nutrition_engine import load_nutrition_entries
    from .weight_engine import load_weight_entries
    
    nutrition_entries = load_nutrition_entries(user_id, days=days)
    weight_entries = load_weight_entries(user_id, days=days)
    
    # Group by date
    daily_data = {}
    for entry in nutrition_entries:
        entry_date = entry.get("date", "")
        if entry_date not in daily_data:
            daily_data[entry_date] = {"calories": 0, "protein": 0, "carbs": 0, "fats": 0, "weight": None}
        nutrition = entry.get("nutrition", {})
        daily_data[entry_date]["calories"] += nutrition.get("calories", 0)
        daily_data[entry_date]["protein"] += nutrition.get("protein", 0)
        daily_data[entry_date]["carbs"] += nutrition.get("carbs", 0)
        daily_data[entry_date]["fats"] += nutrition.get("fats", 0)
    
    # Add weight data
    for entry in weight_entries:
        entry_date = entry.get("date", "")
        if entry_date in daily_data:
            daily_data[entry_date]["weight"] = entry.get("weight_kg")
    
    # Calculate correlations
    calories = [d["calories"] for d in daily_data.values() if d["weight"] is not None]
    weights = [d["weight"] for d in daily_data.values() if d["weight"] is not None]
    protein = [d["protein"] for d in daily_data.values() if d["weight"] is not None]
    
    correlations = []
    
    if len(calories) >= 7 and len(weights) >= 7:
        # Simple correlation calculation
        from .wellness_integration_engine import calculate_correlation
        corr = calculate_correlation(calories, weights)
        if abs(corr) > 0.3:
            correlations.append({
                "metric1": "calories",
                "metric2": "weight",
                "correlation": corr,
                "strength": "strong" if abs(corr) > 0.6 else "moderate",
                "insight": f"Calorie intake and weight have a {'positive' if corr > 0 else 'negative'} correlation"
            })
        
        corr_protein = calculate_correlation(protein, weights)
        if abs(corr_protein) > 0.3:
            correlations.append({
                "metric1": "protein",
                "metric2": "weight",
                "correlation": corr_protein,
                "strength": "strong" if abs(corr_protein) > 0.6 else "moderate",
                "insight": f"Protein intake and weight have a {'positive' if corr_protein > 0 else 'negative'} correlation"
            })
    
    return {
        "correlations": correlations,
        "data_points": len(calories)
    }

def generate_report(user_id: str, period: str = "weekly") -> Dict[str, Any]:
    """Generate weekly or monthly nutrition report"""
    from .nutrition_engine import load_nutrition_entries, calculate_daily_summary, load_nutrition_goals
    
    days = 7 if period == "weekly" else 30
    entries = load_nutrition_entries(user_id, days=days)
    goals = load_nutrition_goals(user_id)
    
    if not entries:
        return {
            "period": period,
            "total_calories": 0,
            "average_daily_calories": 0,
            "goal_adherence": 0,
            "insights": []
        }
    
    # Calculate totals
    total_calories = 0.0
    total_protein = 0.0
    total_carbs = 0.0
    total_fats = 0.0
    daily_totals = {}
    
    for entry in entries:
        entry_date = entry.get("date", "")
        if entry_date not in daily_totals:
            daily_totals[entry_date] = {"calories": 0, "protein": 0, "carbs": 0, "fats": 0}
        nutrition = entry.get("nutrition", {})
        daily_totals[entry_date]["calories"] += nutrition.get("calories", 0)
        daily_totals[entry_date]["protein"] += nutrition.get("protein", 0)
        daily_totals[entry_date]["carbs"] += nutrition.get("carbs", 0)
        daily_totals[entry_date]["fats"] += nutrition.get("fats", 0)
    
    for d in daily_totals.values():
        total_calories += d["calories"]
        total_protein += d["protein"]
        total_carbs += d["carbs"]
        total_fats += d["fats"]
    
    days_tracked = len(daily_totals)
    avg_calories = total_calories / days_tracked if days_tracked > 0 else 0
    goal_calories = goals.get("daily_calories", 2000) if goals else 2000
    goal_adherence = (avg_calories / goal_calories * 100) if goal_calories > 0 else 0
    
    insights = []
    if goal_adherence > 110:
        insights.append("You're consistently exceeding your calorie goal. Consider adjusting your target or intake.")
    elif goal_adherence < 90:
        insights.append("You're consistently under your calorie goal. Make sure you're eating enough for your goals.")
    else:
        insights.append("Great job staying within your calorie goal range!")
    
    return {
        "period": period,
        "days_tracked": days_tracked,
        "total_calories": round(total_calories, 1),
        "average_daily_calories": round(avg_calories, 1),
        "average_protein": round(total_protein / days_tracked, 1) if days_tracked > 0 else 0,
        "average_carbs": round(total_carbs / days_tracked, 1) if days_tracked > 0 else 0,
        "average_fats": round(total_fats / days_tracked, 1) if days_tracked > 0 else 0,
        "goal_calories": goal_calories,
        "goal_adherence": round(goal_adherence, 1),
        "insights": insights
    }

def calculate_streaks(user_id: str) -> Dict[str, Any]:
    """Calculate streaks for nutrition goals"""
    from .nutrition_engine import load_nutrition_entries, calculate_daily_summary, load_nutrition_goals
    
    entries = load_nutrition_entries(user_id, days=90)  # Check last 90 days
    goals = load_nutrition_goals(user_id)
    
    if not entries or not goals:
        return {
            "calorie_goal_streak": 0,
            "protein_goal_streak": 0,
            "longest_calorie_streak": 0
        }
    
    goal_calories = goals.get("daily_calories", 2000)
    goal_protein = goals.get("protein_grams")
    
    # Group by date
    daily_totals = {}
    for entry in entries:
        entry_date = entry.get("date", "")
        if entry_date not in daily_totals:
            daily_totals[entry_date] = {"calories": 0, "protein": 0}
        nutrition = entry.get("nutrition", {})
        daily_totals[entry_date]["calories"] += nutrition.get("calories", 0)
        daily_totals[entry_date]["protein"] += nutrition.get("protein", 0)
    
    # Sort dates
    sorted_dates = sorted(daily_totals.keys(), reverse=True)
    
    # Calculate current streak
    calorie_streak = 0
    protein_streak = 0
    longest_calorie_streak = 0
    current_calorie_streak = 0
    
    for date_str in sorted_dates:
        data = daily_totals[date_str]
        
        # Calorie goal streak
        if goal_calories * 0.9 <= data["calories"] <= goal_calories * 1.1:
            if calorie_streak == 0:  # Start of streak
                calorie_streak = 1
            else:
                calorie_streak += 1
            current_calorie_streak += 1
            longest_calorie_streak = max(longest_calorie_streak, current_calorie_streak)
        else:
            if calorie_streak > 0:
                break  # Streak broken
            current_calorie_streak = 0
        
        # Protein goal streak
        if goal_protein and data["protein"] >= goal_protein * 0.9:
            if protein_streak == 0:
                protein_streak = 1
            else:
                protein_streak += 1
        else:
            if protein_streak > 0:
                break
    
    return {
        "calorie_goal_streak": calorie_streak,
        "protein_goal_streak": protein_streak,
        "longest_calorie_streak": longest_calorie_streak
    }

def generate_insights(user_id: str, days: int = 30) -> List[Dict[str, Any]]:
    """Generate 'what's working' insights"""
    from .nutrition_engine import load_nutrition_entries, calculate_daily_summary
    from .weight_engine import load_weight_entries
    
    entries = load_nutrition_entries(user_id, days=days)
    weight_entries = load_weight_entries(user_id, days=days)
    
    if not entries:
        return []
    
    insights = []
    
    # Group by date
    daily_totals = {}
    for entry in entries:
        entry_date = entry.get("date", "")
        if entry_date not in daily_totals:
            daily_totals[entry_date] = {"calories": 0, "protein": 0, "breakfast": False}
        nutrition = entry.get("nutrition", {})
        daily_totals[entry_date]["calories"] += nutrition.get("calories", 0)
        daily_totals[entry_date]["protein"] += nutrition.get("protein", 0)
        if entry.get("meal_type") == "breakfast":
            daily_totals[entry_date]["breakfast"] = True
    
    # Analyze breakfast impact
    breakfast_days = [d for d in daily_totals.values() if d["breakfast"]]
    no_breakfast_days = [d for d in daily_totals.values() if not d["breakfast"]]
    
    if len(breakfast_days) >= 5 and len(no_breakfast_days) >= 5:
        avg_breakfast_calories = sum(d["calories"] for d in breakfast_days) / len(breakfast_days)
        avg_no_breakfast_calories = sum(d["calories"] for d in no_breakfast_days) / len(no_breakfast_days)
        
        if avg_breakfast_calories < avg_no_breakfast_calories:
            diff = avg_no_breakfast_calories - avg_breakfast_calories
            insights.append({
                "type": "positive",
                "title": "Breakfast Helps Control Calories",
                "description": f"You eat {diff:.0f} fewer calories on days you eat breakfast",
                "impact": "high" if diff > 200 else "medium"
            })
    
    # Analyze protein impact on weight loss
    if weight_entries and len(weight_entries) >= 7:
        high_protein_days = [d for d in daily_totals.values() if d["protein"] >= 100]
        low_protein_days = [d for d in daily_totals.values() if d["protein"] < 100]
        
        if len(high_protein_days) >= 3 and len(low_protein_days) >= 3:
            # Get corresponding weights
            weight_by_date = {e.get("date"): e.get("weight_kg") for e in weight_entries}
            high_protein_weights = [weight_by_date.get(d) for d in daily_totals.keys() if daily_totals[d]["protein"] >= 100 and weight_by_date.get(d)]
            low_protein_weights = [weight_by_date.get(d) for d in daily_totals.keys() if daily_totals[d]["protein"] < 100 and weight_by_date.get(d)]
            
            if high_protein_weights and low_protein_weights:
                avg_high_protein_weight = sum(high_protein_weights) / len(high_protein_weights)
                avg_low_protein_weight = sum(low_protein_weights) / len(low_protein_weights)
                
                if avg_high_protein_weight < avg_low_protein_weight:
                    insights.append({
                        "type": "positive",
                        "title": "Protein Supports Weight Loss",
                        "description": "Your weight loss is better when you eat 100g+ protein daily",
                        "impact": "high"
                    })
    
    return insights

