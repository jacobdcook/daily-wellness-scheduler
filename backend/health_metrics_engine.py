"""
Health Metrics Engine - Track weight, blood pressure, heart rate, and custom metrics
"""
import json
import os
from datetime import datetime, date, timedelta
from typing import Dict, List, Optional, Any
from pydantic import BaseModel

class HealthMetric(BaseModel):
    """Individual health metric entry"""
    id: str
    metric_type: str  # "weight", "blood_pressure", "heart_rate", "custom"
    value: float
    unit: str  # "lbs", "kg", "mmHg", "bpm", etc.
    timestamp: str  # ISO format datetime
    notes: Optional[str] = None
    custom_name: Optional[str] = None  # For custom metrics

class HealthMetricSettings(BaseModel):
    """User preferences for health metrics"""
    default_weight_unit: str = "lbs"  # "lbs" or "kg"
    default_pressure_unit: str = "mmHg"
    custom_metrics: List[Dict[str, Any]] = []  # List of custom metric definitions

def get_health_metrics_filepath(user_id: str) -> str:
    """Get filepath for user's health metrics data"""
    user_dir = os.path.join("data", user_id)
    os.makedirs(user_dir, exist_ok=True)
    return os.path.join(user_dir, "health_metrics.json")

def get_health_metrics_settings_filepath(user_id: str) -> str:
    """Get filepath for user's health metrics settings"""
    user_dir = os.path.join("data", user_id)
    os.makedirs(user_dir, exist_ok=True)
    return os.path.join(user_dir, "health_metrics_settings.json")

def load_health_metrics(user_id: str, metric_type: Optional[str] = None, days: int = 30) -> List[Dict[str, Any]]:
    """Load health metrics for a user, optionally filtered by type and date range"""
    filepath = get_health_metrics_filepath(user_id)
    
    if not os.path.exists(filepath):
        return []
    
    try:
        with open(filepath, "r") as f:
            all_metrics = json.load(f)
        
        # Filter by type if specified
        if metric_type:
            all_metrics = [m for m in all_metrics if m.get("metric_type") == metric_type]
        
        # Filter by date range
        cutoff_date = datetime.now().date() - timedelta(days=days)
        filtered_metrics = []
        for metric in all_metrics:
            try:
                metric_date = datetime.fromisoformat(metric.get("timestamp", "")).date()
                if metric_date >= cutoff_date:
                    filtered_metrics.append(metric)
            except:
                continue
        
        # Sort by timestamp (newest first)
        filtered_metrics.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
        return filtered_metrics
    except Exception as e:
        print(f"Error loading health metrics for {user_id}: {e}")
        return []

def save_health_metric(user_id: str, metric: HealthMetric) -> bool:
    """Save a new health metric entry"""
    filepath = get_health_metrics_filepath(user_id)
    
    # Load existing metrics
    existing_metrics = load_health_metrics(user_id, days=365*10)  # Load all
    
    # Add new metric
    metric_dict = metric.model_dump()
    existing_metrics.append(metric_dict)
    
    # Save back
    try:
        with open(filepath, "w") as f:
            json.dump(existing_metrics, f, indent=2)
        return True
    except Exception as e:
        print(f"Error saving health metric for {user_id}: {e}")
        return False

def delete_health_metric(user_id: str, metric_id: str) -> bool:
    """Delete a health metric entry"""
    filepath = get_health_metrics_filepath(user_id)
    
    if not os.path.exists(filepath):
        return False
    
    try:
        with open(filepath, "r") as f:
            metrics = json.load(f)
        
        # Remove metric with matching ID
        metrics = [m for m in metrics if m.get("id") != metric_id]
        
        with open(filepath, "w") as f:
            json.dump(metrics, f, indent=2)
        return True
    except Exception as e:
        print(f"Error deleting health metric for {user_id}: {e}")
        return False

def get_health_metrics_stats(user_id: str, metric_type: str, days: int = 30) -> Dict[str, Any]:
    """Get statistics for a specific metric type"""
    metrics = load_health_metrics(user_id, metric_type=metric_type, days=days)
    
    if not metrics:
        return {
            "count": 0,
            "latest": None,
            "average": None,
            "min": None,
            "max": None,
            "trend": None
        }
    
    values = [float(m.get("value", 0)) for m in metrics if m.get("value")]
    
    if not values:
        return {
            "count": len(metrics),
            "latest": None,
            "average": None,
            "min": None,
            "max": None,
            "trend": None
        }
    
    # Calculate trend (comparing first half to second half)
    trend = None
    if len(values) >= 4:
        mid = len(values) // 2
        first_half_avg = sum(values[:mid]) / mid
        second_half_avg = sum(values[mid:]) / len(values[mid:])
        if second_half_avg > first_half_avg:
            trend = "increasing"
        elif second_half_avg < first_half_avg:
            trend = "decreasing"
        else:
            trend = "stable"
    
    return {
        "count": len(metrics),
        "latest": metrics[0] if metrics else None,
        "average": sum(values) / len(values),
        "min": min(values),
        "max": max(values),
        "trend": trend
    }

def load_health_metrics_settings(user_id: str) -> HealthMetricSettings:
    """Load user's health metrics settings"""
    filepath = get_health_metrics_settings_filepath(user_id)
    
    if os.path.exists(filepath):
        try:
            with open(filepath, "r") as f:
                data = json.load(f)
                return HealthMetricSettings(**data)
        except Exception as e:
            print(f"Error loading health metrics settings for {user_id}: {e}")
    
    return HealthMetricSettings()

def save_health_metrics_settings(user_id: str, settings: HealthMetricSettings):
    """Save user's health metrics settings"""
    filepath = get_health_metrics_settings_filepath(user_id)
    
    try:
        with open(filepath, "w") as f:
            json.dump(settings.model_dump(), f, indent=2)
    except Exception as e:
        print(f"Error saving health metrics settings for {user_id}: {e}")

