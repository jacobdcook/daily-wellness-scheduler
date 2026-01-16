"""
Smart Supplement Interactions & Safety System
Checks for interactions, conflicts, and provides safety recommendations.
"""
import json
import os
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
from pathlib import Path

# Load interaction database
_interaction_db = None
_supplement_aliases = None

def _load_interaction_database():
    """Load the interaction database from JSON file"""
    global _interaction_db, _supplement_aliases
    
    if _interaction_db is not None:
        return _interaction_db, _supplement_aliases
    
    db_path = Path(__file__).parent / "data" / "supplement_interactions.json"
    
    if not db_path.exists():
        print(f"Warning: Interaction database not found at {db_path}")
        return [], {}
    
    try:
        with open(db_path, "r") as f:
            data = json.load(f)
            _interaction_db = data.get("interactions", [])
            _supplement_aliases = data.get("supplement_aliases", {})
            return _interaction_db, _supplement_aliases
    except Exception as e:
        print(f"Error loading interaction database: {e}")
        return [], {}


def _normalize_supplement_name(name: str, aliases: Dict[str, List[str]]) -> str:
    """Normalize supplement name using aliases"""
    name_lower = name.lower().strip()
    
    # Check if name matches any alias
    for main_name, alias_list in aliases.items():
        if name_lower == main_name.lower():
            return main_name
        for alias in alias_list:
            if name_lower == alias.lower():
                return main_name
    
    # Check if name contains any alias
    for main_name, alias_list in aliases.items():
        for alias in alias_list:
            if alias.lower() in name_lower or name_lower in alias.lower():
                return main_name
    
    return name


def _supplements_match(supp1: str, supp2: str, aliases: Dict[str, List[str]]) -> bool:
    """Check if two supplement names match (including aliases)"""
    norm1 = _normalize_supplement_name(supp1, aliases)
    norm2 = _normalize_supplement_name(supp2, aliases)
    
    # Direct match
    if norm1.lower() == norm2.lower():
        return True
    
    # Check if one contains the other
    if norm1.lower() in norm2.lower() or norm2.lower() in norm1.lower():
        return True
    
    # Check aliases
    for main_name, alias_list in aliases.items():
        if norm1.lower() == main_name.lower():
            if any(alias.lower() in norm2.lower() or norm2.lower() in alias.lower() for alias in alias_list):
                return True
        if norm2.lower() == main_name.lower():
            if any(alias.lower() in norm1.lower() or norm1.lower() in alias.lower() for alias in alias_list):
                return True
    
    return False


def check_interaction(supplement1: str, supplement2: str) -> Optional[Dict[str, Any]]:
    """
    Check for interaction between two supplements.
    Returns interaction data if found, None otherwise.
    """
    interactions, aliases = _load_interaction_database()
    
    for interaction in interactions:
        supp1 = interaction.get("supplement1", "")
        supp2 = interaction.get("supplement2", "")
        
        # Check both directions (A-B and B-A)
        if (_supplements_match(supplement1, supp1, aliases) and 
            _supplements_match(supplement2, supp2, aliases)):
            return interaction
        if (_supplements_match(supplement1, supp2, aliases) and 
            _supplements_match(supplement2, supp1, aliases)):
            return interaction
    
    return None


def check_schedule_interactions(schedule: Dict[str, List[Dict[str, Any]]], 
                                date: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Check all interactions in a schedule.
    Returns list of detected interactions with details.
    """
    interactions, aliases = _load_interaction_database()
    detected = []
    
    # Get items for specific date or all dates
    items_to_check = []
    if date:
        items_to_check = schedule.get(date, [])
    else:
        # Check all dates
        for date_items in schedule.values():
            items_to_check.extend(date_items)
    
    # Extract supplement names and times
    supplements = []
    for item in items_to_check:
        item_data = item.get("item", {})
        name = item_data.get("name", "")
        if name:
            scheduled_time = item.get("scheduled_time", "")
            supplements.append({
                "name": name,
                "time": scheduled_time,
                "item": item
            })
    
    # Check all pairs
    for i, supp1 in enumerate(supplements):
        for supp2 in supplements[i+1:]:
            interaction = check_interaction(supp1["name"], supp2["name"])
            if interaction:
                # Calculate time difference
                time_diff = None
                try:
                    if supp1["time"] and supp2["time"]:
                        time1 = datetime.fromisoformat(supp1["time"].replace("Z", "+00:00"))
                        time2 = datetime.fromisoformat(supp2["time"].replace("Z", "+00:00"))
                        time_diff = abs((time1 - time2).total_seconds() / 3600)  # hours
                except:
                    pass
                
                # Check if spacing is adequate
                required_spacing = interaction.get("spacing_hours", 0)
                spacing_adequate = time_diff is None or time_diff >= required_spacing
                
                detected.append({
                    "supplement1": supp1["name"],
                    "supplement2": supp2["name"],
                    "time1": supp1["time"],
                    "time2": supp2["time"],
                    "time_diff_hours": time_diff,
                    "interaction": interaction,
                    "spacing_adequate": spacing_adequate,
                    "severity": interaction.get("severity", "unknown"),
                    "type": interaction.get("type", "unknown")
                })
    
    return detected


def suggest_timing_adjustment(supplement1: str, supplement2: str, 
                              current_time1: str, current_time2: str) -> Dict[str, Any]:
    """
    Suggest optimal timing adjustment for two interacting supplements.
    """
    interaction = check_interaction(supplement1, supplement2)
    
    if not interaction:
        return {
            "adjustment_needed": False,
            "message": "No interaction detected"
        }
    
    required_spacing = interaction.get("spacing_hours", 0)
    
    try:
        time1 = datetime.fromisoformat(current_time1.replace("Z", "+00:00"))
        time2 = datetime.fromisoformat(current_time2.replace("Z", "+00:00"))
        current_diff = abs((time1 - time2).total_seconds() / 3600)
    except:
        current_diff = 0
    
    if current_diff >= required_spacing:
        return {
            "adjustment_needed": False,
            "message": f"Current spacing ({current_diff:.1f}h) meets requirement ({required_spacing}h)"
        }
    
    # Suggest adjustment
    if interaction.get("type") == "synergistic":
        # Synergistic - can be taken together
        suggested_time1 = current_time1
        suggested_time2 = current_time1  # Same time
    else:
        # Conflicting - need spacing
        suggested_time1 = current_time1
        suggested_time2 = (datetime.fromisoformat(current_time1.replace("Z", "+00:00")) + 
                          timedelta(hours=required_spacing)).isoformat()
    
    return {
        "adjustment_needed": True,
        "interaction": interaction,
        "current_spacing_hours": current_diff,
        "required_spacing_hours": required_spacing,
        "suggested_time1": suggested_time1,
        "suggested_time2": suggested_time2,
        "recommendation": interaction.get("recommendation", "")
    }


def get_interaction_details(supplement1: str, supplement2: str) -> Optional[Dict[str, Any]]:
    """Get detailed information about interaction between two supplements"""
    return check_interaction(supplement1, supplement2)


def get_all_interactions_for_supplement(supplement: str) -> List[Dict[str, Any]]:
    """Get all known interactions for a specific supplement"""
    interactions, aliases = _load_interaction_database()
    matches = []
    
    for interaction in interactions:
        supp1 = interaction.get("supplement1", "")
        supp2 = interaction.get("supplement2", "")
        
        if (_supplements_match(supplement, supp1, aliases) or 
            _supplements_match(supplement, supp2, aliases)):
            matches.append(interaction)
    
    return matches

