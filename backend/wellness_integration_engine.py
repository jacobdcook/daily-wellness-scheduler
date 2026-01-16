"""
Wellness Integration Engine - Correlate nutrition with sleep, water, habits, supplements
Generate holistic insights and wellness scores
"""
import json
import os
from datetime import datetime, date, timedelta
from typing import Dict, List, Optional, Any
from pydantic import BaseModel

class WellnessCorrelation(BaseModel):
    """Correlation between two metrics"""
    metric1: str
    metric2: str
    correlation: float  # -1 to 1
    strength: str  # "strong", "moderate", "weak"
    insight: str  # Human-readable insight

class WellnessInsight(BaseModel):
    """Holistic wellness insight"""
    type: str  # "positive", "negative", "neutral"
    title: str
    description: str
    impact: str  # "high", "medium", "low"
    recommendation: Optional[str] = None

class WellnessScore(BaseModel):
    """Overall wellness score"""
    total_score: float  # 0-100
    nutrition_score: float
    sleep_score: float
    water_score: float
    habits_score: float
    supplements_score: float
    breakdown: Dict[str, Any]

def get_wellness_data(user_id: str, days: int = 30) -> Dict[str, Any]:
    """Get all wellness data for correlation analysis"""
    from .nutrition_engine import load_nutrition_entries, calculate_daily_summary
    from .sleep_engine import load_sleep_entries
    from .water_tracker import load_water_intake
    from .habits_engine import load_habits, load_habit_entries
    from .weight_engine import load_weight_entries
    
    # Get date range
    end_date = date.today()
    start_date = end_date - timedelta(days=days)
    
    # Load all data
    nutrition_entries = load_nutrition_entries(user_id, days=days)
    sleep_entries = load_sleep_entries(user_id, days=days)
    habits = load_habits(user_id)
    weight_entries = load_weight_entries(user_id, days=days)
    
    # Load water data for each day
    water_data_by_date = {}
    current_date = start_date
    while current_date <= end_date:
        date_str = current_date.strftime("%Y-%m-%d")
        water_data = load_water_intake(user_id, date=date_str)
        water_data_by_date[date_str] = water_data.get("total_oz", 0)
        current_date += timedelta(days=1)
    
    # Organize by date
    daily_data = {}
    
    current_date = start_date
    while current_date <= end_date:
        date_str = current_date.strftime("%Y-%m-%d")
        daily_data[date_str] = {
            "date": date_str,
            "calories": 0,
            "protein": 0,
            "carbs": 0,
            "fats": 0,
            "sleep_hours": None,
            "sleep_quality": None,
            "water_oz": 0,
            "habits_completed": 0,
            "habits_total": len(habits),
            "weight_kg": None
        }
        current_date += timedelta(days=1)
    
    # Fill nutrition data
    for entry in nutrition_entries:
        entry_date = entry.get("date", "")
        if entry_date in daily_data:
            nutrition = entry.get("nutrition", {})
            daily_data[entry_date]["calories"] += nutrition.get("calories", 0)
            daily_data[entry_date]["protein"] += nutrition.get("protein", 0)
            daily_data[entry_date]["carbs"] += nutrition.get("carbs", 0)
            daily_data[entry_date]["fats"] += nutrition.get("fats", 0)
    
    # Fill sleep data
    for entry in sleep_entries:
        entry_date = entry.get("date", "")
        if entry_date in daily_data:
            daily_data[entry_date]["sleep_hours"] = entry.get("sleep_duration_hours")
            daily_data[entry_date]["sleep_quality"] = entry.get("quality_rating")
    
    # Fill water data
    for date_str, water_oz in water_data_by_date.items():
        if date_str in daily_data:
            daily_data[date_str]["water_oz"] = water_oz
    
    # Fill habits data
    habit_entries = load_habit_entries(user_id, days=days)
    for entry in habit_entries:
        if entry.get("completed", False):
            entry_date = entry.get("date", "")
            if entry_date in daily_data:
                daily_data[entry_date]["habits_completed"] += 1
    
    # Fill weight data
    for entry in weight_entries:
        entry_date = entry.get("date", "")
        if entry_date in daily_data:
            daily_data[entry_date]["weight_kg"] = entry.get("weight_kg")
    
    return {
        "daily_data": list(daily_data.values()),
        "start_date": start_date.strftime("%Y-%m-%d"),
        "end_date": end_date.strftime("%Y-%m-%d")
    }

def calculate_correlation(x_values: List[float], y_values: List[float]) -> float:
    """Calculate Pearson correlation coefficient"""
    if len(x_values) != len(y_values) or len(x_values) < 2:
        return 0.0
    
    # Filter out None values
    pairs = [(x, y) for x, y in zip(x_values, y_values) if x is not None and y is not None]
    if len(pairs) < 2:
        return 0.0
    
    x_vals = [p[0] for p in pairs]
    y_vals = [p[1] for p in pairs]
    
    # Calculate means
    x_mean = sum(x_vals) / len(x_vals)
    y_mean = sum(y_vals) / len(y_vals)
    
    # Calculate correlation
    numerator = sum((x - x_mean) * (y - y_mean) for x, y in zip(x_vals, y_vals))
    x_variance = sum((x - x_mean) ** 2 for x in x_vals)
    y_variance = sum((y - y_mean) ** 2 for y in y_vals)
    
    if x_variance == 0 or y_variance == 0:
        return 0.0
    
    correlation = numerator / ((x_variance * y_variance) ** 0.5)
    return round(correlation, 3)

def get_wellness_correlations(user_id: str, days: int = 30) -> List[Dict[str, Any]]:
    """Get correlations between different wellness metrics"""
    data = get_wellness_data(user_id, days=days)
    daily_data = data["daily_data"]
    
    correlations = []
    
    # Sleep vs Calories
    sleep_hours = [d.get("sleep_hours") for d in daily_data]
    calories = [d.get("calories") for d in daily_data]
    corr = calculate_correlation(sleep_hours, calories)
    if abs(corr) > 0.3:
        correlations.append({
            "metric1": "sleep_hours",
            "metric2": "calories",
            "correlation": corr,
            "strength": "strong" if abs(corr) > 0.6 else "moderate",
            "insight": f"Sleep and calorie intake have a {'positive' if corr > 0 else 'negative'} correlation ({corr:.2f})"
        })
    
    # Water vs Weight Loss
    water_oz = [d.get("water_oz") for d in daily_data]
    weights = [d.get("weight_kg") for d in daily_data]
    # Calculate weight change
    weight_changes = []
    for i in range(1, len(weights)):
        if weights[i] is not None and weights[i-1] is not None:
            weight_changes.append(weights[i-1] - weights[i])  # Negative = loss
        else:
            weight_changes.append(None)
    # Align with water data (skip first day)
    water_aligned = water_oz[1:] if len(water_oz) > 1 else []
    corr = calculate_correlation(water_aligned, weight_changes)
    if abs(corr) > 0.3:
        correlations.append({
            "metric1": "water_intake",
            "metric2": "weight_loss",
            "correlation": corr,
            "strength": "strong" if abs(corr) > 0.6 else "moderate",
            "insight": f"Water intake and weight loss have a {'positive' if corr > 0 else 'negative'} correlation ({corr:.2f})"
        })
    
    # Protein vs Weight Loss
    protein = [d.get("protein") for d in daily_data]
    corr = calculate_correlation(protein, weight_changes)
    if abs(corr) > 0.3:
        correlations.append({
            "metric1": "protein",
            "metric2": "weight_loss",
            "correlation": corr,
            "strength": "strong" if abs(corr) > 0.6 else "moderate",
            "insight": f"Protein intake and weight loss have a {'positive' if corr > 0 else 'negative'} correlation ({corr:.2f})"
        })
    
    # Habits vs Calories
    habits_completed = [d.get("habits_completed") for d in daily_data]
    corr = calculate_correlation(habits_completed, calories)
    if abs(corr) > 0.3:
        correlations.append({
            "metric1": "habits",
            "metric2": "calories",
            "correlation": corr,
            "strength": "strong" if abs(corr) > 0.6 else "moderate",
            "insight": f"Habit completion and calorie intake have a {'positive' if corr > 0 else 'negative'} correlation ({corr:.2f})"
        })
    
    return correlations

def generate_wellness_insights(user_id: str, days: int = 30) -> List[Dict[str, Any]]:
    """Generate holistic wellness insights"""
    data = get_wellness_data(user_id, days=days)
    daily_data = data["daily_data"]
    correlations = get_wellness_correlations(user_id, days=days)
    
    insights = []
    
    # Analyze sleep vs calories
    sleep_calorie_pairs = [(d.get("sleep_hours"), d.get("calories")) 
                          for d in daily_data 
                          if d.get("sleep_hours") is not None and d.get("calories") > 0]
    
    if len(sleep_calorie_pairs) >= 7:
        low_sleep_days = [c for s, c in sleep_calorie_pairs if s < 7]
        high_sleep_days = [c for s, c in sleep_calorie_pairs if s >= 7]
        
        if low_sleep_days and high_sleep_days:
            avg_low_sleep = sum(low_sleep_days) / len(low_sleep_days)
            avg_high_sleep = sum(high_sleep_days) / len(high_sleep_days)
            diff = avg_low_sleep - avg_high_sleep
            
            if abs(diff) > 100:
                insights.append({
                    "type": "negative" if diff > 0 else "positive",
                    "title": "Sleep Affects Your Eating",
                    "description": f"You eat {abs(diff):.0f} more calories on days you sleep less than 7 hours",
                    "impact": "high" if abs(diff) > 200 else "medium",
                    "recommendation": "Aim for 7-9 hours of sleep to better control your calorie intake"
                })
    
    # Analyze water vs weight
    water_weight_pairs = [(d.get("water_oz"), d.get("weight_kg")) 
                         for d in daily_data 
                         if d.get("water_oz") is not None and d.get("weight_kg") is not None]
    
    if len(water_weight_pairs) >= 7:
        # Calculate weight loss rate for high vs low water days
        high_water_days = [w for w_oz, w in water_weight_pairs if w_oz >= 64]  # 8 glasses
        low_water_days = [w for w_oz, w in water_weight_pairs if w_oz < 64]
        
        if len(high_water_days) >= 3 and len(low_water_days) >= 3:
            # Calculate average weight for each group
            avg_high_water = sum(high_water_days) / len(high_water_days)
            avg_low_water = sum(low_water_days) / len(low_water_days)
            
            if avg_high_water < avg_low_water:
                improvement = ((avg_low_water - avg_high_water) / avg_low_water) * 100
                insights.append({
                    "type": "positive",
                    "title": "Water Intake Boosts Weight Loss",
                    "description": f"Your weight loss is {improvement:.0f}% better when you drink 8+ glasses of water",
                    "impact": "high" if improvement > 20 else "medium",
                    "recommendation": "Drink at least 8 glasses of water daily for optimal results"
                })
    
    # Analyze protein vs weight loss
    protein_data = [(d.get("protein"), d.get("weight_kg")) 
                   for d in daily_data 
                   if d.get("protein") is not None and d.get("weight_kg") is not None]
    
    if len(protein_data) >= 7:
        high_protein_days = [w for p, w in protein_data if p >= 100]  # 100g+ protein
        low_protein_days = [w for p, w in protein_data if p < 100]
        
        if len(high_protein_days) >= 3 and len(low_protein_days) >= 3:
            avg_high_protein = sum(high_protein_days) / len(high_protein_days)
            avg_low_protein = sum(low_protein_days) / len(low_protein_days)
            
            if avg_high_protein < avg_low_protein:
                improvement = ((avg_low_protein - avg_high_protein) / avg_low_protein) * 100
                insights.append({
                    "type": "positive",
                    "title": "Protein Supports Weight Loss",
                    "description": f"Your weight loss is {improvement:.0f}% better when you eat 100g+ protein daily",
                    "impact": "high" if improvement > 15 else "medium",
                    "recommendation": "Aim for at least 100g of protein per day"
                })
    
    # Analyze habits vs nutrition
    habits_calorie_pairs = [(d.get("habits_completed"), d.get("calories")) 
                           for d in daily_data 
                           if d.get("habits_completed") is not None and d.get("calories") > 0]
    
    if len(habits_calorie_pairs) >= 7:
        high_habit_days = [c for h, c in habits_calorie_pairs if h >= 3]
        low_habit_days = [c for h, c in habits_calorie_pairs if h < 3]
        
        if high_habit_days and low_habit_days:
            avg_high_habits = sum(high_habit_days) / len(high_habit_days)
            avg_low_habits = sum(low_habit_days) / len(low_habit_days)
            
            if abs(avg_high_habits - avg_low_habits) > 100:
                insights.append({
                    "type": "positive" if avg_high_habits < avg_low_habits else "negative",
                    "title": "Habits Impact Nutrition",
                    "description": f"You eat {abs(avg_high_habits - avg_low_habits):.0f} {'fewer' if avg_high_habits < avg_low_habits else 'more'} calories when you complete more habits",
                    "impact": "medium",
                    "recommendation": "Building consistent habits helps maintain better nutrition"
                })
    
    return insights

def calculate_wellness_score(user_id: str, days: int = 30) -> Dict[str, Any]:
    """Calculate overall wellness score (0-100)"""
    from .nutrition_engine import load_nutrition_goals, calculate_daily_summary
    from .sleep_engine import load_sleep_settings
    from .water_tracker import load_water_settings
    from .habits_engine import load_habits, load_habit_entries
    
    data = get_wellness_data(user_id, days=days)
    daily_data = data["daily_data"]
    
    # Nutrition Score (0-25 points)
    nutrition_score = 0
    nutrition_goals = load_nutrition_goals(user_id)
    goal_calories = nutrition_goals.get("daily_calories", 2000) if nutrition_goals else 2000
    
    calorie_adherence = []
    for d in daily_data:
        calories = d.get("calories", 0)
        if calories > 0:
            adherence = 1 - abs(calories - goal_calories) / goal_calories
            adherence = max(0, min(1, adherence))  # Clamp 0-1
            calorie_adherence.append(adherence)
    
    if calorie_adherence:
        nutrition_score = (sum(calorie_adherence) / len(calorie_adherence)) * 25
    
    # Sleep Score (0-25 points)
    sleep_score = 0
    sleep_data = [d.get("sleep_hours") for d in daily_data if d.get("sleep_hours") is not None]
    if sleep_data:
        avg_sleep = sum(sleep_data) / len(sleep_data)
        # Optimal sleep is 7-9 hours
        if 7 <= avg_sleep <= 9:
            sleep_score = 25
        elif 6 <= avg_sleep < 7 or 9 < avg_sleep <= 10:
            sleep_score = 20
        elif 5 <= avg_sleep < 6 or 10 < avg_sleep <= 11:
            sleep_score = 15
        else:
            sleep_score = 10
    
    # Water Score (0-20 points)
    water_score = 0
    water_data = [d.get("water_oz") for d in daily_data if d.get("water_oz") > 0]
    if water_data:
        avg_water = sum(water_data) / len(water_data)
        # Optimal is 64+ oz (8 glasses)
        if avg_water >= 64:
            water_score = 20
        elif avg_water >= 48:
            water_score = 15
        elif avg_water >= 32:
            water_score = 10
        else:
            water_score = 5
    
    # Habits Score (0-15 points)
    habits_score = 0
    habits = load_habits(user_id)
    if habits:
        habit_entries = load_habit_entries(user_id, days=days)
        completed_entries = [e for e in habit_entries if e.get("completed", False)]
        total_possible = len(habits) * len([d for d in daily_data if d.get("habits_completed") is not None])
        if total_possible > 0:
            completion_rate = len(completed_entries) / total_possible
            habits_score = completion_rate * 15
    
    # Supplements Score (0-15 points) - Based on schedule completion
    supplements_score = 15  # Default, can be enhanced with schedule data
    
    total_score = nutrition_score + sleep_score + water_score + habits_score + supplements_score
    
    return {
        "total_score": round(total_score, 1),
        "nutrition_score": round(nutrition_score, 1),
        "sleep_score": round(sleep_score, 1),
        "water_score": round(water_score, 1),
        "habits_score": round(habits_score, 1),
        "supplements_score": round(supplements_score, 1),
        "breakdown": {
            "nutrition": {
                "score": round(nutrition_score, 1),
                "max": 25,
                "details": f"Calorie goal adherence: {sum(calorie_adherence) / len(calorie_adherence) * 100:.0f}%" if calorie_adherence else "No data"
            },
            "sleep": {
                "score": round(sleep_score, 1),
                "max": 25,
                "details": f"Average sleep: {sum(sleep_data) / len(sleep_data):.1f} hours" if sleep_data else "No data"
            },
            "water": {
                "score": round(water_score, 1),
                "max": 20,
                "details": f"Average water: {sum(water_data) / len(water_data):.1f} oz" if water_data else "No data"
            },
            "habits": {
                "score": round(habits_score, 1),
                "max": 15,
                "details": f"Habit completion: {total_completions / total_possible * 100:.0f}%" if habits and total_possible > 0 else "No habits"
            },
            "supplements": {
                "score": round(supplements_score, 1),
                "max": 15,
                "details": "Schedule adherence"
            }
        }
    }

