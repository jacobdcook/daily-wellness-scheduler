"""
Username Engine
Handles username generation and management
"""
import json
import os
import re
from typing import Optional

def get_username_filepath(user_id: str) -> str:
    """Get path to username mapping file"""
    user_dir = os.path.join("data", user_id)
    os.makedirs(user_dir, exist_ok=True)
    return os.path.join(user_dir, "username.json")

def generate_username_from_email(email: str) -> str:
    """Generate a username from an email address"""
    # Extract the part before @
    username = email.split("@")[0]
    # Remove any non-alphanumeric characters
    username = re.sub(r'[^a-zA-Z0-9]', '', username)
    # Convert to lowercase
    username = username.lower()
    # Ensure it's not empty
    if not username:
        username = "user"
    return username

def get_username(user_id: str) -> str:
    """Get username for a user, creating one if it doesn't exist"""
    filepath = get_username_filepath(user_id)
    
    if os.path.exists(filepath):
        try:
            with open(filepath, "r") as f:
                data = json.load(f)
                return data.get("username", user_id)
        except:
            pass
    
    # Generate username from user_id (email)
    username = generate_username_from_email(user_id)
    
    # Check if username is already taken
    username = ensure_unique_username(username, user_id)
    
    # Save username
    save_username(user_id, username)
    
    return username

def ensure_unique_username(base_username: str, exclude_user_id: str) -> str:
    """Ensure username is unique by appending numbers if needed"""
    username = base_username
    counter = 1
    
    # Check all user directories for existing usernames
    data_dir = "data"
    if not os.path.exists(data_dir):
        return username
    
    while True:
        # Check if this username is already taken by another user
        taken = False
        for user_dir in os.listdir(data_dir):
            if user_dir.startswith("_") or user_dir == exclude_user_id:
                continue
            
            user_username_file = os.path.join(data_dir, user_dir, "username.json")
            if os.path.exists(user_username_file):
                try:
                    with open(user_username_file, "r") as f:
                        data = json.load(f)
                        if data.get("username") == username:
                            taken = True
                            break
                except:
                    pass
        
        if not taken:
            return username
        
        # Try with a number suffix
        username = f"{base_username}{counter}"
        counter += 1
        
        # Safety limit
        if counter > 10000:
            return f"{base_username}{hash(exclude_user_id) % 10000}"

def save_username(user_id: str, username: str):
    """Save username for a user"""
    filepath = get_username_filepath(user_id)
    data = {
        "username": username,
        "user_id": user_id
    }
    with open(filepath, "w") as f:
        json.dump(data, f, indent=2)

def get_user_id_from_username(username: str) -> Optional[str]:
    """Get user_id from username"""
    data_dir = "data"
    if not os.path.exists(data_dir):
        return None
    
    for user_dir in os.listdir(data_dir):
        if user_dir.startswith("_"):
            continue
        
        username_file = os.path.join(data_dir, user_dir, "username.json")
        if os.path.exists(username_file):
            try:
                with open(username_file, "r") as f:
                    data = json.load(f)
                    if data.get("username") == username:
                        return data.get("user_id", user_dir)
            except:
                pass
    
    return None

def assign_usernames_to_existing_users():
    """Assign usernames to all existing users who don't have one"""
    data_dir = "data"
    if not os.path.exists(data_dir):
        return 0
    
    assigned = 0
    for user_dir in os.listdir(data_dir):
        if user_dir.startswith("_"):
            continue
        
        user_path = os.path.join(data_dir, user_dir)
        if not os.path.isdir(user_path):
            continue
        
        username_file = os.path.join(user_path, "username.json")
        if not os.path.exists(username_file):
            try:
                username = get_username(user_dir)
                assigned += 1
                print(f"Assigned username '{username}' to {user_dir}")
            except Exception as e:
                # Skip if there's an error (e.g., file already exists)
                if "Cannot create a file when that file already exists" not in str(e):
                    print(f"Warning: Could not assign username to {user_dir}: {e}")
    
    return assigned

