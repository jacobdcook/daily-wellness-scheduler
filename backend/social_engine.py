"""
Social Features Engine
Phase 28: Social Features & Community Integration
"""
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import json
import os
import uuid
from collections import defaultdict

def get_social_data_dir() -> str:
    """Get directory for social data"""
    data_dir = os.path.join("data", "_social")
    os.makedirs(data_dir, exist_ok=True)
    return data_dir

def load_friends(user_id: str) -> Dict[str, Any]:
    """Load user's friends list"""
    filepath = os.path.join("data", user_id, "friends.json")
    if os.path.exists(filepath):
        try:
            with open(filepath, "r") as f:
                return json.load(f)
        except:
            pass
    return {
        "friends": [],
        "pending_sent": [],
        "pending_received": [],
        "blocked": []
    }

def save_friends(user_id: str, friends_data: Dict[str, Any]):
    """Save user's friends list"""
    filepath = os.path.join("data", user_id, "friends.json")
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, "w") as f:
        json.dump(friends_data, f, indent=2)

def load_challenges() -> List[Dict[str, Any]]:
    """Load all challenges"""
    filepath = os.path.join(get_social_data_dir(), "challenges.json")
    if os.path.exists(filepath):
        try:
            with open(filepath, "r") as f:
                return json.load(f)
        except:
            pass
    return []

def save_challenges(challenges: List[Dict[str, Any]]):
    """Save all challenges"""
    filepath = os.path.join(get_social_data_dir(), "challenges.json")
    with open(filepath, "w") as f:
        json.dump(challenges, f, indent=2)

def load_user_stats(user_id: str) -> Dict[str, Any]:
    """Load user statistics for benchmarking"""
    progress_file = os.path.join("data", user_id, "progress.json")
    schedule_file = os.path.join("data", user_id, "schedule.json")
    
    stats = {
        "completion_rate": 0.0,
        "current_streak": 0,
        "total_items_completed": 0,
        "total_days_active": 0,
        "average_items_per_day": 0.0
    }
    
    try:
        if os.path.exists(progress_file):
            with open(progress_file, "r") as f:
                progress = json.load(f)
            
            total_items = 0
            completed_items = 0
            active_days = set()
            
            if os.path.exists(schedule_file):
                with open(schedule_file, "r") as f:
                    schedule = json.load(f)
                
                for date_str, items in schedule.items():
                    if date_str in progress:
                        day_progress = progress[date_str]
                        for item in items:
                            total_items += 1
                            item_id = item.get("id", "")
                            if item_id in day_progress and day_progress[item_id] == 2:
                                completed_items += 1
                        active_days.add(date_str)
            
            if total_items > 0:
                stats["completion_rate"] = (completed_items / total_items) * 100
                stats["total_items_completed"] = completed_items
                stats["total_days_active"] = len(active_days)
                stats["average_items_per_day"] = completed_items / len(active_days) if active_days else 0.0
            
            # Calculate streak
            today = datetime.now().date()
            streak = 0
            check_date = today
            while True:
                date_str = check_date.isoformat()
                if date_str in progress:
                    streak += 1
                    check_date -= timedelta(days=1)
                else:
                    break
            stats["current_streak"] = streak
    
    except Exception as e:
        print(f"Error loading user stats: {e}")
    
    return stats

def get_benchmark_percentile(user_id: str, metric: str) -> Dict[str, Any]:
    """Get user's percentile ranking (anonymous benchmarking)"""
    # For now, return mock data. In production, this would aggregate stats from all users
    # while maintaining privacy (no PII shared)
    
    user_stats = load_user_stats(user_id)
    user_value = user_stats.get(metric, 0)
    
    # Mock percentile calculation
    # In production, this would compare against anonymized database
    if metric == "completion_rate":
        if user_value >= 90:
            percentile = 95
        elif user_value >= 75:
            percentile = 80
        elif user_value >= 60:
            percentile = 60
        elif user_value >= 40:
            percentile = 40
        else:
            percentile = 20
    elif metric == "current_streak":
        if user_value >= 30:
            percentile = 95
        elif user_value >= 14:
            percentile = 75
        elif user_value >= 7:
            percentile = 50
        else:
            percentile = 25
    else:
        percentile = 50
    
    return {
        "metric": metric,
        "value": user_value,
        "percentile": percentile,
        "message": f"You're in the top {100 - percentile}% of users!"
    }

def create_challenge(
    creator_id: str,
    name: str,
    description: str,
    challenge_type: str,
    target_value: float,
    duration_days: int,
    is_global: bool = False,
    friend_ids: Optional[List[str]] = None
) -> Dict[str, Any]:
    """Create a new challenge"""
    challenges = load_challenges()
    
    challenge = {
        "id": str(uuid.uuid4()),
        "creator_id": creator_id,
        "name": name,
        "description": description,
        "type": challenge_type,  # completion_rate, streak, items_completed
        "target_value": target_value,
        "duration_days": duration_days,
        "start_date": datetime.now().isoformat(),
        "end_date": (datetime.now() + timedelta(days=duration_days)).isoformat(),
        "is_global": is_global,
        "participants": [creator_id] + (friend_ids or []),
        "progress": {creator_id: 0.0},
        "created_at": datetime.now().isoformat()
    }
    
    challenges.append(challenge)
    save_challenges(challenges)
    
    return challenge

def get_user_challenges(user_id: str) -> List[Dict[str, Any]]:
    """Get all challenges for a user (global + friend challenges)"""
    challenges = load_challenges()
    friends_data = load_friends(user_id)
    friend_ids = [f["id"] for f in friends_data.get("friends", [])]
    
    user_challenges = []
    for challenge in challenges:
        # Include if user is participant, or if it's global, or if it's a friend's challenge
        is_participant = user_id in challenge.get("participants", [])
        is_global = challenge.get("is_global", False)
        is_friend_challenge = any(fid in challenge.get("participants", []) for fid in friend_ids)
        
        if is_participant or is_global or is_friend_challenge:
            # Update progress for this user if they're a participant
            if is_participant:
                user_stats = load_user_stats(user_id)
                if challenge["type"] == "completion_rate":
                    progress = user_stats.get("completion_rate", 0.0)
                elif challenge["type"] == "streak":
                    progress = user_stats.get("current_streak", 0)
                elif challenge["type"] == "items_completed":
                    progress = user_stats.get("total_items_completed", 0)
                else:
                    progress = 0.0
            else:
                progress = 0.0
            
            challenge_copy = challenge.copy()
            challenge_copy["user_progress"] = progress
            challenge_copy["user_percentage"] = min((progress / challenge["target_value"]) * 100, 100) if challenge["target_value"] > 0 else 0
            challenge_copy["is_participant"] = is_participant
            user_challenges.append(challenge_copy)
    
    return user_challenges

def join_challenge(user_id: str, challenge_id: str) -> bool:
    """Join a challenge"""
    challenges = load_challenges()
    
    for challenge in challenges:
        if challenge["id"] == challenge_id:
            if user_id not in challenge.get("participants", []):
                challenge["participants"].append(user_id)
                if "progress" not in challenge:
                    challenge["progress"] = {}
                challenge["progress"][user_id] = 0.0
                save_challenges(challenges)
                return True
            return False  # Already a participant
    
    return False  # Challenge not found

def send_friend_request(from_user_id: str, to_user_id: str) -> bool:
    """Send a friend request"""
    if from_user_id == to_user_id:
        return False
    
    # Load both users' friend data
    from_friends = load_friends(from_user_id)
    to_friends = load_friends(to_user_id)
    
    # Check if already friends or blocked
    if any(f["id"] == to_user_id for f in from_friends.get("friends", [])):
        return False  # Already friends
    
    if to_user_id in from_friends.get("blocked", []):
        return False  # Blocked
    
    if from_user_id in to_friends.get("blocked", []):
        return False  # User blocked you
    
    # Check if request already exists
    if any(r["id"] == to_user_id for r in from_friends.get("pending_sent", [])):
        return False  # Request already sent
    
    # Add to pending lists
    from_friends.setdefault("pending_sent", []).append({
        "id": to_user_id,
        "sent_at": datetime.now().isoformat()
    })
    
    to_friends.setdefault("pending_received", []).append({
        "id": from_user_id,
        "received_at": datetime.now().isoformat()
    })
    
    save_friends(from_user_id, from_friends)
    save_friends(to_user_id, to_friends)
    
    return True

def accept_friend_request(user_id: str, from_user_id: str) -> bool:
    """Accept a friend request"""
    user_friends = load_friends(user_id)
    from_friends = load_friends(from_user_id)
    
    # Remove from pending
    user_friends["pending_received"] = [
        r for r in user_friends.get("pending_received", [])
        if r["id"] != from_user_id
    ]
    
    from_friends["pending_sent"] = [
        r for r in from_friends.get("pending_sent", [])
        if r["id"] != user_id
    ]
    
    # Add to friends
    user_friends.setdefault("friends", []).append({
        "id": from_user_id,
        "added_at": datetime.now().isoformat()
    })
    
    from_friends.setdefault("friends", []).append({
        "id": user_id,
        "added_at": datetime.now().isoformat()
    })
    
    save_friends(user_id, user_friends)
    save_friends(from_user_id, from_friends)
    
    return True

def decline_friend_request(user_id: str, from_user_id: str) -> bool:
    """Decline a friend request"""
    user_friends = load_friends(user_id)
    from_friends = load_friends(from_user_id)
    
    # Remove from pending
    user_friends["pending_received"] = [
        r for r in user_friends.get("pending_received", [])
        if r["id"] != from_user_id
    ]
    
    from_friends["pending_sent"] = [
        r for r in from_friends.get("pending_sent", [])
        if r["id"] != user_id
    ]
    
    save_friends(user_id, user_friends)
    save_friends(from_user_id, from_friends)
    
    return True

def cancel_friend_request(user_id: str, to_user_id: str) -> bool:
    """Cancel a sent friend request"""
    user_friends = load_friends(user_id)
    to_friends = load_friends(to_user_id)
    
    # Remove from pending
    user_friends["pending_sent"] = [
        r for r in user_friends.get("pending_sent", [])
        if r["id"] != to_user_id
    ]
    
    to_friends["pending_received"] = [
        r for r in to_friends.get("pending_received", [])
        if r["id"] != user_id
    ]
    
    save_friends(user_id, user_friends)
    save_friends(to_user_id, to_friends)
    
    return True

def block_user(user_id: str, target_user_id: str) -> bool:
    """Block a user"""
    if user_id == target_user_id:
        return False
    
    user_friends = load_friends(user_id)
    target_friends = load_friends(target_user_id)
    
    # Remove from friends if they are friends
    user_friends["friends"] = [
        f for f in user_friends.get("friends", [])
        if f["id"] != target_user_id
    ]
    target_friends["friends"] = [
        f for f in target_friends.get("friends", [])
        if f["id"] != user_id
    ]
    
    # Remove from pending requests
    user_friends["pending_sent"] = [
        r for r in user_friends.get("pending_sent", [])
        if r["id"] != target_user_id
    ]
    user_friends["pending_received"] = [
        r for r in user_friends.get("pending_received", [])
        if r["id"] != target_user_id
    ]
    target_friends["pending_sent"] = [
        r for r in target_friends.get("pending_sent", [])
        if r["id"] != user_id
    ]
    target_friends["pending_received"] = [
        r for r in target_friends.get("pending_received", [])
        if r["id"] != user_id
    ]
    
    # Add to blocked list
    if target_user_id not in user_friends.get("blocked", []):
        user_friends.setdefault("blocked", []).append(target_user_id)
    
    save_friends(user_id, user_friends)
    save_friends(target_user_id, target_friends)
    
    return True

def unblock_user(user_id: str, target_user_id: str) -> bool:
    """Unblock a user"""
    user_friends = load_friends(user_id)
    
    # Remove from blocked list
    if "blocked" in user_friends:
        user_friends["blocked"] = [
            u for u in user_friends["blocked"]
            if u != target_user_id
        ]
    
    save_friends(user_id, user_friends)
    
    return True

def remove_friend(user_id: str, friend_id: str) -> bool:
    """Remove a friend (unfriend)"""
    if user_id == friend_id:
        return False
    
    user_friends = load_friends(user_id)
    friend_friends = load_friends(friend_id)
    
    # Remove from both users' friends lists
    user_friends["friends"] = [
        f for f in user_friends.get("friends", [])
        if f["id"] != friend_id
    ]
    
    friend_friends["friends"] = [
        f for f in friend_friends.get("friends", [])
        if f["id"] != user_id
    ]
    
    save_friends(user_id, user_friends)
    save_friends(friend_id, friend_friends)
    
    return True

def get_relationship_status(current_user_id: str, target_user_id: str) -> str:
    """Get relationship status between two users"""
    if current_user_id == target_user_id:
        return "self"
    
    friends_data = load_friends(current_user_id)
    
    # Check if friends
    if any(f["id"] == target_user_id for f in friends_data.get("friends", [])):
        return "friend"
    
    # Check if pending sent
    if any(r["id"] == target_user_id for r in friends_data.get("pending_sent", [])):
        return "pending_sent"
    
    # Check if pending received
    if any(r["id"] == target_user_id for r in friends_data.get("pending_received", [])):
        return "pending_received"
    
    # Check if blocked
    if target_user_id in friends_data.get("blocked", []):
        return "blocked"
    
    return "none"

def search_users(query: str, current_user_id: str) -> List[Dict[str, Any]]:
    """Search for users by email, user ID, or username"""
    try:
        from .username_engine import get_username
    except ImportError:
        # Fallback if username_engine not available
        def get_username(user_id: str) -> str:
            return user_id.split("@")[0] if "@" in user_id else user_id
    
    results = []
    
    # Search in all user directories
    data_dir = "data"
    if not os.path.exists(data_dir):
        return results
    
    query_lower = query.lower()
    
    for user_dir in os.listdir(data_dir):
        if user_dir.startswith("_") or user_dir == current_user_id:
            continue
        
        # Get username for this user
        username = get_username(user_dir)
        username_lower = username.lower()
        
        # Check if query matches user_id/email or username
        if query_lower in user_dir.lower() or query_lower in username_lower:
            stats = load_user_stats(user_dir)
            relationship = get_relationship_status(current_user_id, user_dir)
            
            results.append({
                "user_id": user_dir,
                "username": username,
                "display_name": user_dir,
                "completion_rate": stats.get("completion_rate", 0.0),
                "current_streak": stats.get("current_streak", 0),
                "total_items_completed": stats.get("total_items_completed", 0),
                "relationship": relationship
            })
    
    return results

def generate_progress_card(user_id: str, stats: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Generate a shareable progress card"""
    if stats is None:
        stats = load_user_stats(user_id)
    
    card = {
        "user_id": user_id,
        "completion_rate": round(stats.get("completion_rate", 0), 1),
        "current_streak": stats.get("current_streak", 0),
        "total_items_completed": stats.get("total_items_completed", 0),
        "total_days_active": stats.get("total_days_active", 0),
        "generated_at": datetime.now().isoformat(),
        "message": f"🎯 {stats.get('current_streak', 0)} day streak! {round(stats.get('completion_rate', 0), 1)}% completion rate."
    }
    
    return card

