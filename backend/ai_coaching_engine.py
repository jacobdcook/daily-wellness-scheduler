"""
AI Coaching Engine - Analyzes all wellness data and generates personalized recommendations
"""
import json
import os
from datetime import datetime, date, timedelta
from typing import Dict, List, Optional, Any
from pydantic import BaseModel

class DailyRecommendation(BaseModel):
    """Daily personalized recommendation"""
    id: str
    type: str  # "nutrition", "sleep", "water", "habits", "weight", "general"
    priority: str  # "high", "medium", "low"
    title: str
    message: str
    action_items: List[str]
    reasoning: str
    related_metrics: Dict[str, Any]
    created_at: str

class WeeklyPlan(BaseModel):
    """Weekly personalized plan"""
    week_start: str
    goals: List[Dict[str, Any]]
    meal_plan: Optional[Dict[str, Any]] = None
    focus_areas: List[str]
    milestones: List[Dict[str, Any]]
    created_at: str

class CoachingInsight(BaseModel):
    """Insight from analyzing user data"""
    category: str
    finding: str
    impact: str  # "positive", "negative", "neutral"
    recommendation: str
    confidence: float  # 0-1

def analyze_wellness_data(user_id: str, days: int = 7) -> Dict[str, Any]:
    """Analyze all wellness data to understand user patterns"""
    from .nutrition_engine import load_nutrition_entries, calculate_daily_summary, load_nutrition_goals
    from .water_tracker import load_water_settings, get_water_data_filepath
    from .habits_engine import load_habits, get_habit_completions
    from .sleep_engine import load_sleep_entries
    from .weight_engine import load_weight_entries, load_weight_goals
    
    # Load all data
    nutrition_entries = load_nutrition_entries(user_id, days=days)
    nutrition_goals = load_nutrition_goals(user_id)
    
    # Load water data
    from .water_tracker import load_water_intake
    water_data = {"user_id": user_id, "intake": []}
    # Get water intake for recent days
    for i in range(days):
        check_date = (date.today() - timedelta(days=i)).isoformat()
        day_intake = load_water_intake(user_id, check_date)
        if day_intake.get("total_ml", 0) > 0:
            water_data["intake"].append({
                "date": check_date,
                "amount_ml": day_intake.get("total_ml", 0)
            })
    
    habits = load_habits(user_id)
    sleep_entries = load_sleep_entries(user_id, days=days)
    weight_entries = load_weight_entries(user_id, days=days)
    weight_goals = load_weight_goals(user_id)
    
    # Analyze nutrition patterns
    nutrition_analysis = analyze_nutrition_patterns(nutrition_entries, nutrition_goals, days)
    
    # Analyze water intake
    water_analysis = analyze_water_patterns(water_data, days)
    
    # Analyze habits
    habits_analysis = analyze_habits_patterns(habits, days)
    
    # Analyze sleep
    sleep_analysis = analyze_sleep_patterns(sleep_entries, days)
    
    # Analyze weight trends
    weight_analysis = analyze_weight_trends(weight_entries, weight_goals, days)
    
    return {
        "nutrition": nutrition_analysis,
        "water": water_analysis,
        "habits": habits_analysis,
        "sleep": sleep_analysis,
        "weight": weight_analysis,
        "overall_score": calculate_overall_score(nutrition_analysis, water_analysis, habits_analysis, sleep_analysis, weight_analysis)
    }

def analyze_nutrition_patterns(entries: List[Dict], goals: Optional[Dict], days: int) -> Dict[str, Any]:
    """Analyze nutrition patterns"""
    if not entries:
        return {
            "status": "insufficient_data",
            "avg_calories": 0,
            "goal_adherence": 0,
            "protein_avg": 0,
            "consistency": 0,
            "issues": ["Not logging meals regularly"]
        }
    
    # Group by date
    daily_totals = {}
    for entry in entries:
        entry_date = entry.get("date", "")
        if entry_date not in daily_totals:
            daily_totals[entry_date] = {"calories": 0, "protein": 0, "carbs": 0, "fats": 0, "meals": 0}
        nutrition = entry.get("nutrition", {})
        daily_totals[entry_date]["calories"] += nutrition.get("calories", 0)
        daily_totals[entry_date]["protein"] += nutrition.get("protein", 0)
        daily_totals[entry_date]["carbs"] += nutrition.get("carbs", 0)
        daily_totals[entry_date]["fats"] += nutrition.get("fats", 0)
        daily_totals[entry_date]["meals"] += 1
    
    avg_calories = sum(d["calories"] for d in daily_totals.values()) / len(daily_totals)
    avg_protein = sum(d["protein"] for d in daily_totals.values()) / len(daily_totals)
    consistency = len(daily_totals) / days  # Percentage of days logged
    
    goal_calories = goals.get("daily_calories", 2000) if goals else 2000
    goal_protein = goals.get("protein_grams", 0) if goals else 0
    
    goal_adherence = (avg_calories / goal_calories * 100) if goal_calories > 0 else 0
    
    issues = []
    if consistency < 0.7:
        issues.append("Inconsistent meal logging")
    if goal_adherence < 80:
        issues.append("Consistently under calorie goal")
    elif goal_adherence > 120:
        issues.append("Consistently over calorie goal")
    if goal_protein > 0 and avg_protein < goal_protein * 0.8:
        issues.append("Not meeting protein goals")
    
    return {
        "status": "good" if len(issues) == 0 else "needs_improvement",
        "avg_calories": round(avg_calories, 1),
        "goal_adherence": round(goal_adherence, 1),
        "protein_avg": round(avg_protein, 1),
        "consistency": round(consistency * 100, 1),
        "issues": issues,
        "days_logged": len(daily_totals)
    }

def analyze_water_patterns(water_data: Dict, days: int) -> Dict[str, Any]:
    """Analyze water intake patterns"""
    from .water_tracker import load_water_settings
    
    user_id = water_data.get("user_id", "")
    settings = load_water_settings(user_id)
    goal_ml = settings.get("daily_goal_ml", 2000) if settings else 2000
    
    # Get recent water intake
    recent_intake = water_data.get("intake", [])
    if not recent_intake:
        return {
            "status": "insufficient_data",
            "avg_intake": 0,
            "goal_adherence": 0,
            "issues": ["Not tracking water intake"]
        }
    
    # Calculate average
    total_intake = sum(entry.get("amount_ml", 0) for entry in recent_intake[-days:])
    avg_intake = total_intake / min(len(recent_intake), days) if recent_intake else 0
    goal_adherence = (avg_intake / goal_ml * 100) if goal_ml > 0 else 0
    
    issues = []
    if goal_adherence < 80:
        issues.append("Not meeting daily water goal")
    
    return {
        "status": "good" if len(issues) == 0 else "needs_improvement",
        "avg_intake": round(avg_intake, 1),
        "goal_adherence": round(goal_adherence, 1),
        "issues": issues
    }

def analyze_habits_patterns(habits: List[Dict], days: int) -> Dict[str, Any]:
    """Analyze habits patterns"""
    from .habits_engine import get_habit_completions
    
    if not habits:
        return {
            "status": "no_habits",
            "total_habits": 0,
            "completion_rate": 0,
            "issues": ["No habits tracked"]
        }
    
    # Calculate completion rates
    total_completions = 0
    total_possible = 0
    
    for habit in habits:
        habit_id = habit.get("id", "")
        completions = get_habit_completions(habit_id, days)
        total_completions += len(completions)
        total_possible += days
    
    completion_rate = (total_completions / total_possible * 100) if total_possible > 0 else 0
    
    issues = []
    if completion_rate < 70:
        issues.append("Low habit completion rate")
    
    return {
        "status": "good" if completion_rate >= 70 else "needs_improvement",
        "total_habits": len(habits),
        "completion_rate": round(completion_rate, 1),
        "issues": issues
    }

def analyze_sleep_patterns(entries: List[Dict], days: int) -> Dict[str, Any]:
    """Analyze sleep patterns"""
    if not entries:
        return {
            "status": "insufficient_data",
            "avg_duration": 0,
            "avg_quality": 0,
            "issues": ["Not tracking sleep"]
        }
    
    durations = []
    qualities = []
    
    for entry in entries:
        duration = entry.get("duration_hours", 0)
        quality = entry.get("quality_rating", 0)
        if duration > 0:
            durations.append(duration)
        if quality > 0:
            qualities.append(quality)
    
    avg_duration = sum(durations) / len(durations) if durations else 0
    avg_quality = sum(qualities) / len(qualities) if qualities else 0
    
    issues = []
    if avg_duration < 7:
        issues.append("Not getting enough sleep")
    elif avg_duration > 9:
        issues.append("Sleeping too much")
    if avg_quality < 3:
        issues.append("Poor sleep quality")
    
    return {
        "status": "good" if len(issues) == 0 else "needs_improvement",
        "avg_duration": round(avg_duration, 1),
        "avg_quality": round(avg_quality, 1),
        "issues": issues
    }

def analyze_weight_trends(entries: List[Dict], goals: Optional[Dict], days: int) -> Dict[str, Any]:
    """Analyze weight trends"""
    if not entries or len(entries) < 2:
        return {
            "status": "insufficient_data",
            "trend": "stable",
            "change": 0,
            "on_track": False
        }
    
    # Sort by date
    sorted_entries = sorted(entries, key=lambda x: x.get("date", ""))
    first_weight = sorted_entries[0].get("weight_kg", 0)
    last_weight = sorted_entries[-1].get("weight_kg", 0)
    change = last_weight - first_weight
    
    trend = "increasing" if change > 0.5 else "decreasing" if change < -0.5 else "stable"
    
    on_track = True
    if goals and goals.get("goal_type") != "maintain":
        weekly_change_kg = goals.get("weekly_change_kg", 0)
        if weekly_change_kg != 0:
            expected_change = (weekly_change_kg * days) / 7
            on_track = abs(change - expected_change) < abs(expected_change) * 0.5
    
    return {
        "status": "good" if on_track else "needs_attention",
        "trend": trend,
        "change": round(change, 2),
        "on_track": on_track
    }

def calculate_overall_score(nutrition: Dict, water: Dict, habits: Dict, sleep: Dict, weight: Dict) -> float:
    """Calculate overall wellness score (0-100)"""
    scores = []
    
    if nutrition.get("status") == "good":
        scores.append(20)
    elif nutrition.get("status") == "needs_improvement":
        scores.append(10)
    
    if water.get("status") == "good":
        scores.append(20)
    elif water.get("status") == "needs_improvement":
        scores.append(10)
    
    if habits.get("status") == "good":
        scores.append(20)
    elif habits.get("status") == "needs_improvement":
        scores.append(10)
    
    if sleep.get("status") == "good":
        scores.append(20)
    elif sleep.get("status") == "needs_improvement":
        scores.append(10)
    
    if weight.get("status") == "good":
        scores.append(20)
    elif weight.get("status") == "needs_attention":
        scores.append(10)
    
    return sum(scores)

def generate_daily_recommendations(user_id: str, date_str: Optional[str] = None) -> List[DailyRecommendation]:
    """Generate daily personalized recommendations"""
    if not date_str:
        date_str = date.today().isoformat()
    
    analysis = analyze_wellness_data(user_id, days=7)
    recommendations = []
    
    # Nutrition recommendations
    nutrition = analysis.get("nutrition", {})
    if nutrition.get("status") == "needs_improvement":
        issues = nutrition.get("issues", [])
        if "Inconsistent meal logging" in issues:
            recommendations.append(DailyRecommendation(
                id=f"rec_{datetime.now().timestamp()}",
                type="nutrition",
                priority="high",
                title="Improve Meal Logging Consistency",
                message="You're only logging meals {:.0f}% of the time. Consistent tracking helps you understand your eating patterns better.".format(nutrition.get("consistency", 0)),
                action_items=[
                    "Set a reminder to log meals after eating",
                    "Log meals immediately after eating",
                    "Use quick-add buttons for common meals"
                ],
                reasoning="Consistent meal logging is essential for accurate nutrition tracking and goal achievement.",
                related_metrics={"consistency": nutrition.get("consistency", 0)},
                created_at=datetime.now().isoformat()
            ))
        
        if "Consistently under calorie goal" in issues:
            recommendations.append(DailyRecommendation(
                id=f"rec_{datetime.now().timestamp()}_2",
                type="nutrition",
                priority="high",
                title="Increase Calorie Intake",
                message="You're averaging {:.0f} calories per day, which is {:.0f}% below your goal. Eating too few calories can slow your metabolism.".format(
                    nutrition.get("avg_calories", 0),
                    100 - nutrition.get("goal_adherence", 0)
                ),
                action_items=[
                    "Add healthy snacks between meals",
                    "Increase portion sizes slightly",
                    "Include nutrient-dense foods like nuts and avocados"
                ],
                reasoning="Consistently eating below your calorie goal can lead to muscle loss and metabolic slowdown.",
                related_metrics={"avg_calories": nutrition.get("avg_calories", 0), "goal_adherence": nutrition.get("goal_adherence", 0)},
                created_at=datetime.now().isoformat()
            ))
    
    # Water recommendations
    water = analysis.get("water", {})
    if water.get("status") == "needs_improvement":
        recommendations.append(DailyRecommendation(
            id=f"rec_{datetime.now().timestamp()}_3",
            type="water",
            priority="medium",
            title="Increase Water Intake",
            message="You're averaging {:.0f}ml per day, which is {:.0f}% of your goal. Proper hydration is crucial for metabolism and energy.".format(
                water.get("avg_intake", 0),
                water.get("goal_adherence", 0)
            ),
            action_items=[
                "Drink a glass of water first thing in the morning",
                "Set hourly water reminders",
                "Keep a water bottle with you throughout the day"
            ],
            reasoning="Adequate hydration supports metabolism, energy levels, and overall health.",
            related_metrics={"avg_intake": water.get("avg_intake", 0), "goal_adherence": water.get("goal_adherence", 0)},
            created_at=datetime.now().isoformat()
        ))
    
    # Sleep recommendations
    sleep = analysis.get("sleep", {})
    if sleep.get("status") == "needs_improvement":
        issues = sleep.get("issues", [])
        if "Not getting enough sleep" in issues:
            recommendations.append(DailyRecommendation(
                id=f"rec_{datetime.now().timestamp()}_4",
                type="sleep",
                priority="high",
                title="Improve Sleep Duration",
                message="You're averaging {:.1f} hours of sleep per night. Most adults need 7-9 hours for optimal health.".format(sleep.get("avg_duration", 0)),
                action_items=[
                    "Set a consistent bedtime",
                    "Create a relaxing bedtime routine",
                    "Avoid screens 1 hour before bed"
                ],
                reasoning="Insufficient sleep can negatively impact metabolism, appetite regulation, and weight management.",
                related_metrics={"avg_duration": sleep.get("avg_duration", 0)},
                created_at=datetime.now().isoformat()
            ))
    
    # Habits recommendations
    habits = analysis.get("habits", {})
    if habits.get("status") == "needs_improvement":
        recommendations.append(DailyRecommendation(
            id=f"rec_{datetime.now().timestamp()}_5",
            type="habits",
            priority="medium",
            title="Improve Habit Consistency",
            message="Your habit completion rate is {:.0f}%. Building consistency is key to long-term success.".format(habits.get("completion_rate", 0)),
            action_items=[
                "Start with just 1-2 key habits",
                "Set specific times for habit completion",
                "Use habit stacking (link new habits to existing ones)"
            ],
            reasoning="Consistent habit formation leads to sustainable lifestyle changes.",
            related_metrics={"completion_rate": habits.get("completion_rate", 0)},
            created_at=datetime.now().isoformat()
        ))
    
    # Positive reinforcement
    if analysis.get("overall_score", 0) >= 80:
        recommendations.append(DailyRecommendation(
            id=f"rec_{datetime.now().timestamp()}_6",
            type="general",
            priority="low",
            title="Great Progress!",
            message="You're doing excellent! Your overall wellness score is {:.0f}/100. Keep up the great work!".format(analysis.get("overall_score", 0)),
            action_items=[
                "Continue your current routine",
                "Consider setting new goals to challenge yourself",
                "Share your progress with friends for accountability"
            ],
            reasoning="Consistent positive behaviors lead to long-term success.",
            related_metrics={"overall_score": analysis.get("overall_score", 0)},
            created_at=datetime.now().isoformat()
        ))
    
    return recommendations

def generate_weekly_plan(user_id: str, week_start: Optional[str] = None) -> WeeklyPlan:
    """Generate personalized weekly plan"""
    from datetime import datetime, timedelta
    
    if not week_start:
        today = date.today()
        days_since_monday = today.weekday()
        monday = today - timedelta(days=days_since_monday)
        week_start = monday.isoformat()
    
    analysis = analyze_wellness_data(user_id, days=7)
    
    # Generate goals based on analysis
    goals = []
    focus_areas = []
    
    nutrition = analysis.get("nutrition", {})
    if nutrition.get("status") == "needs_improvement":
        focus_areas.append("Nutrition")
        goals.append({
            "category": "nutrition",
            "goal": "Log meals consistently (aim for 90%+ days)",
            "target": "90%",
            "current": f"{nutrition.get('consistency', 0):.0f}%"
        })
    
    water = analysis.get("water", {})
    if water.get("status") == "needs_improvement":
        focus_areas.append("Hydration")
        goals.append({
            "category": "water",
            "goal": "Meet daily water goal 6 out of 7 days",
            "target": "6 days",
            "current": "Track progress"
        })
    
    sleep = analysis.get("sleep", {})
    if sleep.get("status") == "needs_improvement":
        focus_areas.append("Sleep")
        goals.append({
            "category": "sleep",
            "goal": "Get 7-9 hours of sleep nightly",
            "target": "7-9 hours",
            "current": f"{sleep.get('avg_duration', 0):.1f} hours"
        })
    
    habits = analysis.get("habits", {})
    if habits.get("status") == "needs_improvement":
        focus_areas.append("Habits")
        goals.append({
            "category": "habits",
            "goal": "Improve habit completion rate to 80%+",
            "target": "80%",
            "current": f"{habits.get('completion_rate', 0):.0f}%"
        })
    
    if not focus_areas:
        focus_areas = ["Maintain Current Progress"]
        goals.append({
            "category": "general",
            "goal": "Maintain your excellent progress",
            "target": "Continue current routine",
            "current": "On track"
        })
    
    # Generate milestones
    milestones = []
    for i, goal in enumerate(goals[:3], 1):  # Top 3 goals
        milestones.append({
            "id": f"milestone_{i}",
            "title": goal["goal"],
            "target_date": (datetime.fromisoformat(week_start) + timedelta(days=7)).isoformat(),
            "category": goal["category"]
        })
    
    return WeeklyPlan(
        week_start=week_start,
        goals=goals,
        focus_areas=focus_areas,
        milestones=milestones,
        created_at=datetime.now().isoformat()
    )

def save_coaching_feedback(user_id: str, recommendation_id: str, feedback: Dict[str, Any]) -> bool:
    """Save user feedback on recommendations"""
    data_dir = f"data/{user_id}"
    os.makedirs(data_dir, exist_ok=True)
    
    feedback_file = f"{data_dir}/coaching_feedback.json"
    
    # Load existing feedback
    if os.path.exists(feedback_file):
        with open(feedback_file, "r") as f:
            all_feedback = json.load(f)
    else:
        all_feedback = []
    
    # Add new feedback
    feedback_entry = {
        "recommendation_id": recommendation_id,
        "feedback": feedback,
        "timestamp": datetime.now().isoformat()
    }
    all_feedback.append(feedback_entry)
    
    # Save
    with open(feedback_file, "w") as f:
        json.dump(all_feedback, f, indent=2)
    
    return True

