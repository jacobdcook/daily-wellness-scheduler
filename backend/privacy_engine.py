"""
Privacy Settings Engine
Handles user privacy preferences
"""
import json
import os
from typing import Dict, Any, Optional

def get_privacy_settings_file(user_id: str) -> str:
    """Get path to privacy settings file"""
    user_dir = os.path.join("data", user_id)
    os.makedirs(user_dir, exist_ok=True)
    return os.path.join(user_dir, "privacy_settings.json")

def load_privacy_settings(user_id: str) -> Dict[str, Any]:
    """Load user's privacy settings"""
    filepath = get_privacy_settings_file(user_id)
    if os.path.exists(filepath):
        try:
            with open(filepath, "r") as f:
                return json.load(f)
        except:
            pass
    
    # Default privacy settings
    return {
        "profile_visibility": "private",  # private, friends_only, public
        "progress_sharing": True,  # Allow friends to see progress
        "show_in_search": True,  # Show in user search results
        "allow_friend_requests": True,  # Allow others to send friend requests
    }

def save_privacy_settings(user_id: str, settings: Dict[str, Any]) -> bool:
    """Save user's privacy settings"""
    try:
        filepath = get_privacy_settings_file(user_id)
        with open(filepath, "w") as f:
            json.dump(settings, f, indent=2)
        return True
    except Exception as e:
        print(f"Error saving privacy settings: {e}")
        return False

