"""
Community & Gamification Engine - Challenges, leaderboards, achievements, points, social features
"""
import json
import os
from datetime import datetime, date, timedelta
from typing import Dict, List, Optional, Any
from pydantic import BaseModel

class Challenge(BaseModel):
    """Challenge model"""
    id: str
    name: str
    description: str
    type: str  # "nutrition", "water", "habits", "weight", "general"
    goal: str
    target_value: float
    unit: str
    start_date: str
    end_date: str
    is_premium: bool
    created_by: str
    participants: List[str]
    created_at: str

class LeaderboardEntry(BaseModel):
    """Leaderboard entry"""
    user_id: str
    username: str
    score: float
    rank: int
    progress: float
    avatar_url: Optional[str] = None

class Achievement(BaseModel):
    """Achievement/Badge"""
    id: str
    name: str
    description: str
    icon: str
    category: str  # "streak", "milestone", "social", "challenge"
    rarity: str  # "common", "rare", "epic", "legendary"
    points: int
    unlocked_at: Optional[str] = None

class PointsTransaction(BaseModel):
    """Points transaction"""
    id: str
    user_id: str
    amount: int
    reason: str
    category: str
    timestamp: str

def load_challenges() -> List[Dict[str, Any]]:
    """Load all challenges"""
    challenges_file = "data/challenges.json"
    if os.path.exists(challenges_file):
        try:
            with open(challenges_file, "r") as f:
                return json.load(f)
        except:
            pass
    return []

def save_challenges(challenges: List[Dict[str, Any]]):
    """Save all challenges"""
    challenges_file = "data/challenges.json"
    os.makedirs(os.path.dirname(challenges_file), exist_ok=True)
    with open(challenges_file, "w") as f:
        json.dump(challenges, f, indent=2)

def create_challenge(challenge_data: Dict[str, Any]) -> Challenge:
    """Create a new challenge"""
    challenge = Challenge(
        id=f"challenge_{datetime.now().timestamp()}",
        name=challenge_data.get("name", "New Challenge"),
        description=challenge_data.get("description", ""),
        type=challenge_data.get("type", "general"),
        goal=challenge_data.get("goal", ""),
        target_value=challenge_data.get("target_value", 0),
        unit=challenge_data.get("unit", ""),
        start_date=challenge_data.get("start_date", date.today().isoformat()),
        end_date=challenge_data.get("end_date", (date.today() + timedelta(days=7)).isoformat()),
        is_premium=challenge_data.get("is_premium", False),
        created_by=challenge_data.get("created_by", ""),
        participants=challenge_data.get("participants", []),
        created_at=datetime.now().isoformat()
    )
    
    challenges = load_challenges()
    challenges.append(challenge.model_dump())
    save_challenges(challenges)
    
    return challenge

def join_challenge(challenge_id: str, user_id: str) -> bool:
    """Join a challenge"""
    challenges = load_challenges()
    for challenge in challenges:
        if challenge.get("id") == challenge_id:
            participants = challenge.get("participants", [])
            if user_id not in participants:
                participants.append(user_id)
                challenge["participants"] = participants
                save_challenges(challenges)
                return True
    return False

def get_user_challenges(user_id: str) -> List[Dict[str, Any]]:
    """Get challenges user is participating in"""
    challenges = load_challenges()
    user_challenges = []
    for challenge in challenges:
        if user_id in challenge.get("participants", []):
            user_challenges.append(challenge)
    return user_challenges

def get_challenge_leaderboard(challenge_id: str) -> List[LeaderboardEntry]:
    """Get leaderboard for a challenge"""
    challenges = load_challenges()
    challenge = None
    for c in challenges:
        if c.get("id") == challenge_id:
            challenge = c
            break
    
    if not challenge:
        return []
    
    # Get progress for each participant
    leaderboard = []
    for user_id in challenge.get("participants", []):
        progress = calculate_challenge_progress(user_id, challenge)
        leaderboard.append({
            "user_id": user_id,
            "username": get_username(user_id),
            "score": progress,
            "rank": 0,  # Will be set after sorting
            "progress": progress,
            "avatar_url": None
        })
    
    # Sort by progress
    leaderboard.sort(key=lambda x: x["score"], reverse=True)
    
    # Assign ranks
    for i, entry in enumerate(leaderboard):
        entry["rank"] = i + 1
    
    return leaderboard

def calculate_challenge_progress(user_id: str, challenge: Dict[str, Any]) -> float:
    """Calculate user's progress in a challenge"""
    challenge_type = challenge.get("type", "general")
    start_date = challenge.get("start_date")
    end_date = challenge.get("end_date")
    target = challenge.get("target_value", 0)
    
    # Calculate progress based on challenge type
    if challenge_type == "nutrition":
        from .nutrition_engine import load_nutrition_entries
        entries = load_nutrition_entries(user_id, days=30)
        # Filter by date range
        total_calories = sum(e.get("nutrition", {}).get("calories", 0) for e in entries 
                           if start_date <= e.get("date", "") <= end_date)
        return min((total_calories / target) * 100, 100) if target > 0 else 0
    
    elif challenge_type == "water":
        from .water_tracker import load_water_intake
        total_ml = 0
        current = datetime.fromisoformat(start_date).date()
        end = datetime.fromisoformat(end_date).date()
        while current <= end:
            day_data = load_water_intake(user_id, current.isoformat())
            total_ml += day_data.get("total_ml", 0)
            current += timedelta(days=1)
        return min((total_ml / target) * 100, 100) if target > 0 else 0
    
    elif challenge_type == "habits":
        from .habits_engine import load_habits, get_habit_completions
        habits = load_habits(user_id)
        total_completions = 0
        for habit in habits:
            completions = get_habit_completions(habit.get("id", ""), 30)
            total_completions += len(completions)
        return min((total_completions / target) * 100, 100) if target > 0 else 0
    
    return 0

def get_username(user_id: str) -> str:
    """Get username from user_id"""
    user_file = f"data/{user_id}/user.json"
    if os.path.exists(user_file):
        try:
            with open(user_file, "r") as f:
                user_data = json.load(f)
                return user_data.get("username", user_id.split("@")[0] if "@" in user_id else user_id)
        except:
            pass
    return user_id.split("@")[0] if "@" in user_id else user_id

def load_user_points(user_id: str) -> int:
    """Load user's total points"""
    points_file = f"data/{user_id}/points.json"
    if os.path.exists(points_file):
        try:
            with open(points_file, "r") as f:
                data = json.load(f)
                return data.get("total_points", 0)
        except:
            pass
    return 0

def add_points(user_id: str, amount: int, reason: str, category: str = "general"):
    """Add points to user"""
    points_file = f"data/{user_id}/points.json"
    os.makedirs(os.path.dirname(points_file), exist_ok=True)
    
    data = {"total_points": 0, "transactions": []}
    if os.path.exists(points_file):
        try:
            with open(points_file, "r") as f:
                data = json.load(f)
        except:
            pass
    
    data["total_points"] = data.get("total_points", 0) + amount
    data["transactions"].append({
        "id": f"tx_{datetime.now().timestamp()}",
        "amount": amount,
        "reason": reason,
        "category": category,
        "timestamp": datetime.now().isoformat()
    })
    
    with open(points_file, "w") as f:
        json.dump(data, f, indent=2)
    
    # Check for level up
    check_level_up(user_id, data["total_points"])

def check_level_up(user_id: str, total_points: int):
    """Check if user leveled up"""
    level = calculate_level(total_points)
    level_file = f"data/{user_id}/level.json"
    
    current_level = 0
    if os.path.exists(level_file):
        try:
            with open(level_file, "r") as f:
                level_data = json.load(f)
                current_level = level_data.get("level", 0)
        except:
            pass
    
    if level > current_level:
        # Level up!
        with open(level_file, "w") as f:
            json.dump({"level": level, "leveled_up_at": datetime.now().isoformat()}, f, indent=2)
        
        # Award achievement
        award_achievement(user_id, f"level_{level}", f"Reached Level {level}")

def calculate_level(points: int) -> int:
    """Calculate level from points"""
    # Level formula: level = sqrt(points / 100)
    import math
    return int(math.sqrt(points / 100)) + 1

def load_achievements(user_id: str) -> List[Dict[str, Any]]:
    """Load user's achievements"""
    achievements_file = f"data/{user_id}/achievements.json"
    if os.path.exists(achievements_file):
        try:
            with open(achievements_file, "r") as f:
                return json.load(f)
        except:
            pass
    return []

def award_achievement(user_id: str, achievement_id: str, achievement_name: str):
    """Award an achievement to user"""
    achievements = load_achievements(user_id)
    
    # Check if already awarded
    for ach in achievements:
        if ach.get("id") == achievement_id:
            return
    
    # Add achievement
    achievements.append({
        "id": achievement_id,
        "name": achievement_name,
        "description": f"Achievement: {achievement_name}",
        "icon": "🏆",
        "category": "milestone",
        "rarity": "common",
        "points": 100,
        "unlocked_at": datetime.now().isoformat()
    })
    
    achievements_file = f"data/{user_id}/achievements.json"
    os.makedirs(os.path.dirname(achievements_file), exist_ok=True)
    with open(achievements_file, "w") as f:
        json.dump(achievements, f, indent=2)
    
    # Award points
    add_points(user_id, 100, f"Achievement: {achievement_name}", "achievement")

def get_global_leaderboard(limit: int = 100) -> List[LeaderboardEntry]:
    """Get global leaderboard"""
    # Get all users with points
    data_dir = "data"
    leaderboard = []
    
    if not os.path.exists(data_dir):
        return []
    
    for user_dir in os.listdir(data_dir):
        user_path = os.path.join(data_dir, user_dir)
        if os.path.isdir(user_path):
            points = load_user_points(user_dir)
            if points > 0:
                leaderboard.append({
                    "user_id": user_dir,
                    "username": get_username(user_dir),
                    "score": points,
                    "rank": 0,
                    "progress": points,
                    "avatar_url": None
                })
    
    # Sort by points
    leaderboard.sort(key=lambda x: x["score"], reverse=True)
    
    # Assign ranks
    for i, entry in enumerate(leaderboard[:limit]):
        entry["rank"] = i + 1
    
    return leaderboard[:limit]

def get_friends_leaderboard(user_id: str) -> List[LeaderboardEntry]:
    """Get leaderboard of user's friends"""
    from .social_engine import load_friends
    
    friends_data = load_friends(user_id)
    friends = friends_data.get("friends", [])
    
    leaderboard = []
    for friend in friends:
        friend_id = friend.get("user_id") or friend.get("email", "")
        points = load_user_points(friend_id)
        leaderboard.append({
            "user_id": friend_id,
            "username": friend.get("username") or get_username(friend_id),
            "score": points,
            "rank": 0,
            "progress": points,
            "avatar_url": None
        })
    
    # Sort by points
    leaderboard.sort(key=lambda x: x["score"], reverse=True)
    
    # Assign ranks
    for i, entry in enumerate(leaderboard):
        entry["rank"] = i + 1
    
    return leaderboard

