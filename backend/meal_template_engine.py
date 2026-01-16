"""
Meal Template Engine
Handles CRUD operations for user meal templates
"""
import json
import os
from datetime import datetime
from typing import Dict, List, Optional, Any
from pydantic import ValidationError

from .models import MealTemplate, MealTemplateFood

def get_user_templates_dir(user_id: str) -> str:
    """Get the directory for storing user's meal templates"""
    user_dir = os.path.join("data", user_id)
    templates_dir = os.path.join(user_dir, "meal_templates.json")
    return templates_dir

def load_user_templates(user_id: str) -> List[MealTemplate]:
    """Load user's meal templates from file"""
    templates_file = get_user_templates_dir(user_id)

    if not os.path.exists(templates_file):
        return []

    try:
        with open(templates_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return [MealTemplate(**template) for template in data]
    except (json.JSONDecodeError, ValidationError, FileNotFoundError):
        return []

def save_user_templates(user_id: str, templates: List[MealTemplate]) -> None:
    """Save user's meal templates to file"""
    templates_file = get_user_templates_dir(user_id)
    os.makedirs(os.path.dirname(templates_file), exist_ok=True)

    # Convert to dict format for JSON serialization
    templates_data = [template.model_dump() for template in templates]

    with open(templates_file, 'w', encoding='utf-8') as f:
        json.dump(templates_data, f, indent=2, ensure_ascii=False)

def get_user_template(user_id: str, template_id: str) -> Optional[MealTemplate]:
    """Get a specific meal template by ID"""
    templates = load_user_templates(user_id)
    return next((t for t in templates if t.id == template_id), None)

def create_meal_template(user_id: str, template_data: Dict[str, Any]) -> MealTemplate:
    """Create a new meal template"""
    # Validate required fields
    if not template_data.get("name", "").strip():
        raise ValueError("Template name is required")

    if not template_data.get("category"):
        raise ValueError("Template category is required")

    if not template_data.get("foods") or len(template_data["foods"]) == 0:
        raise ValueError("Template must contain at least one food item")

    # Create template with calculated nutrition
    template = MealTemplate(
        name=template_data["name"].strip(),
        description=template_data.get("description", "").strip(),
        category=template_data["category"],
        foods=[MealTemplateFood(**food) for food in template_data["foods"]],
        created_by=user_id
    )

    # Calculate total nutrition
    template.total_nutrition = calculate_template_nutrition(template.foods)

    # Load existing templates and add new one
    templates = load_user_templates(user_id)
    templates.append(template)

    # Save
    save_user_templates(user_id, templates)

    return template

def update_meal_template(user_id: str, template_id: str, update_data: Dict[str, Any]) -> Optional[MealTemplate]:
    """Update an existing meal template"""
    templates = load_user_templates(user_id)
    template_index = next((i for i, t in enumerate(templates) if t.id == template_id), None)

    if template_index is None:
        return None

    template = templates[template_index]

    # Update fields
    if "name" in update_data and update_data["name"].strip():
        template.name = update_data["name"].strip()

    if "description" in update_data:
        template.description = update_data["description"].strip()

    if "category" in update_data:
        template.category = update_data["category"]

    if "foods" in update_data and update_data["foods"]:
        if len(update_data["foods"]) == 0:
            raise ValueError("Template must contain at least one food item")
        template.foods = [MealTemplateFood(**food) for food in update_data["foods"]]
        template.total_nutrition = calculate_template_nutrition(template.foods)

    template.updated_at = datetime.now().isoformat()

    # Save
    save_user_templates(user_id, templates)

    return template

def delete_meal_template(user_id: str, template_id: str) -> bool:
    """Delete a meal template"""
    templates = load_user_templates(user_id)
    original_length = len(templates)

    templates = [t for t in templates if t.id != template_id]

    if len(templates) < original_length:
        save_user_templates(user_id, templates)
        return True

    return False

def increment_template_usage(user_id: str, template_id: str) -> None:
    """Increment usage count for a template"""
    templates = load_user_templates(user_id)
    template = next((t for t in templates if t.id == template_id), None)

    if template:
        template.usage_count += 1
        template.last_used = datetime.now().isoformat()
        save_user_templates(user_id, templates)

def get_templates_by_category(user_id: str, category: Optional[str] = None) -> List[MealTemplate]:
    """Get templates filtered by category, sorted by usage"""
    templates = load_user_templates(user_id)

    if category:
        templates = [t for t in templates if t.category == category]

    # Sort by usage count (descending), then by last used (descending)
    templates.sort(key=lambda t: (-t.usage_count, t.last_used or "0000-00-00"), reverse=True)

    return templates

def calculate_template_nutrition(foods: List[MealTemplateFood]) -> Dict[str, float]:
    """Calculate total nutrition for a list of foods"""
    total = {
        "calories": 0.0,
        "protein": 0.0,
        "carbs": 0.0,
        "fats": 0.0
    }

    for food in foods:
        nutrition = food.nutrition
        multiplier = food.quantity

        # Apply quantity multiplier to nutrition
        total["calories"] += nutrition.get("calories", 0) * multiplier
        total["protein"] += nutrition.get("protein", 0) * multiplier
        total["carbs"] += nutrition.get("carbs", 0) * multiplier
        total["fats"] += nutrition.get("fats", 0) * multiplier

    # Round to reasonable precision
    for key in total:
        total[key] = round(total[key], 1)

    return total

def search_templates(user_id: str, query: str, category: Optional[str] = None) -> List[MealTemplate]:
    """Search templates by name/description"""
    templates = load_user_templates(user_id)

    if category:
        templates = [t for t in templates if t.category == category]

    if query:
        query_lower = query.lower()
        templates = [
            t for t in templates
            if query_lower in t.name.lower() or query_lower in t.description.lower()
        ]

    # Sort by usage count
    templates.sort(key=lambda t: -t.usage_count)

    return templates

def get_recent_templates(user_id: str, limit: int = 5) -> List[MealTemplate]:
    """Get recently used templates"""
    templates = load_user_templates(user_id)

    # Filter to templates that have been used
    used_templates = [t for t in templates if t.last_used]

    # Sort by last used date
    used_templates.sort(key=lambda t: t.last_used or "0000-00-00", reverse=True)

    return used_templates[:limit]

def get_template_stats(user_id: str) -> Dict[str, Any]:
    """Get statistics about user's templates"""
    templates = load_user_templates(user_id)

    stats = {
        "total_templates": len(templates),
        "templates_by_category": {},
        "total_usage": sum(t.usage_count for t in templates),
        "most_used": None,
        "recently_used": None
    }

    # Category breakdown
    for template in templates:
        category = template.category
        if category not in stats["templates_by_category"]:
            stats["templates_by_category"][category] = 0
        stats["templates_by_category"][category] += 1

    # Most used template
    if templates:
        most_used = max(templates, key=lambda t: t.usage_count)
        if most_used.usage_count > 0:
            stats["most_used"] = {
                "id": most_used.id,
                "name": most_used.name,
                "usage_count": most_used.usage_count
            }

    # Recently used
    recent = get_recent_templates(user_id, 1)
    if recent:
        stats["recently_used"] = {
            "id": recent[0].id,
            "name": recent[0].name,
            "last_used": recent[0].last_used
        }

    return stats
