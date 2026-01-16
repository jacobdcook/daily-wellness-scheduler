"""
Tasks Engine - Store and manage user tasks
"""
import json
import os
from datetime import datetime
from typing import List, Dict, Optional
from pydantic import BaseModel

class Task(BaseModel):
    id: str
    title: str
    completed: bool
    priority: str  # "low" | "medium" | "high"
    dueDate: Optional[str] = None
    createdAt: str

def get_tasks_filepath(user_id: str) -> str:
    """Get filepath for user's tasks"""
    user_dir = os.path.join("data", user_id)
    os.makedirs(user_dir, exist_ok=True)
    return os.path.join(user_dir, "tasks.json")

def load_tasks(user_id: str) -> List[Dict[str, any]]:
    """Load user's tasks"""
    filepath = get_tasks_filepath(user_id)
    
    if not os.path.exists(filepath):
        return []
    
    try:
        with open(filepath, "r") as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading tasks for {user_id}: {e}")
        return []

def save_tasks(user_id: str, tasks: List[Dict[str, any]]) -> bool:
    """Save user's tasks"""
    filepath = get_tasks_filepath(user_id)
    
    try:
        with open(filepath, "w") as f:
            json.dump(tasks, f, indent=2)
        return True
    except Exception as e:
        print(f"Error saving tasks for {user_id}: {e}")
        return False

def add_task(user_id: str, task: Task) -> bool:
    """Add a new task"""
    tasks = load_tasks(user_id)
    tasks.append(task.model_dump())
    return save_tasks(user_id, tasks)

def update_task(user_id: str, task_id: str, updates: Dict[str, any]) -> bool:
    """Update an existing task"""
    tasks = load_tasks(user_id)
    
    for i, task in enumerate(tasks):
        if task.get("id") == task_id:
            tasks[i].update(updates)
            return save_tasks(user_id, tasks)
    
    return False

def delete_task(user_id: str, task_id: str) -> bool:
    """Delete a task"""
    tasks = load_tasks(user_id)
    tasks = [t for t in tasks if t.get("id") != task_id]
    return save_tasks(user_id, tasks)

