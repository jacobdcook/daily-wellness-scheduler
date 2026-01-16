from fastapi import FastAPI, HTTPException, Header, Depends, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, Response
from datetime import datetime, timedelta, time
from typing import Dict, List, Any, Optional
import json
import os
import uuid
from pydantic import BaseModel

# Helper imports
from .models import (
    UserSettings, ScheduledItem, SupplementItem, TimingRule, DayType, InventoryItem, CustomItem,
    ScheduleItemType, GeneralTaskItem
)
from .scheduler_engine import SupplementScheduler
from .supplement_database import lookup_supplement
from .chat_engine import chat_engine
from .knowledge_base import get_knowledge_item
from .export_engine import generate_csv_export, generate_ical_export, generate_json_export, generate_pdf_export, generate_markdown_export, generate_summary_export
from .predictive_engine import calculate_completion_patterns, predict_today_completion, generate_smart_recommendations, calculate_trends
from .analytics_engine import calculate_comprehensive_analytics, calculate_time_analytics, generate_trend_data
from .analytics_engine import calculate_comprehensive_analytics, calculate_time_analytics, generate_trend_data
from .automation_engine import suggest_habit_stacking, suggest_auto_reschedule, create_backup, restore_backup, list_backups
from .recurring_patterns import apply_recurring_pattern, preview_pattern_occurrences
from .models import RecurringPattern
from .social_engine import (
    load_friends, save_friends, load_challenges, save_challenges,
    load_user_stats, get_benchmark_percentile, create_challenge, join_challenge,
    get_user_challenges, send_friend_request, accept_friend_request,
    decline_friend_request, cancel_friend_request, block_user, unblock_user,
    remove_friend, generate_progress_card
)
from .username_engine import get_username, assign_usernames_to_existing_users
from .interaction_engine import (
    check_interaction, check_schedule_interactions, suggest_timing_adjustment,
    get_interaction_details, get_all_interactions_for_supplement
)
from .notification_service import (
    load_notification_settings, save_notification_settings, get_upcoming_notifications,
    mark_notification_sent, get_daily_summary_notification, add_push_subscription,
    remove_push_subscription
)
from .privacy_engine import load_privacy_settings, save_privacy_settings
from .water_tracker import (
    load_water_settings, save_water_settings, load_water_intake,
    save_water_intake, get_water_stats, get_next_water_reminder_time
)

# Load .env file if python-dotenv is available (optional dependency)
try:
    from dotenv import load_dotenv
    # Load from backend/.env or parent directory
    env_path = os.path.join(os.path.dirname(__file__), '.env')
    if os.path.exists(env_path):
        load_dotenv(env_path)
    else:
        load_dotenv()  # Try parent directory
except ImportError:
    pass  # dotenv not installed, will use system environment variables only

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan event handler for startup and shutdown"""
    # Startup
    try:
        from .username_engine import assign_usernames_to_existing_users
        assigned = assign_usernames_to_existing_users()
        if assigned:
            print(f"✅ Assigned usernames to {assigned} existing users")
    except Exception as e:
        # Handle file already exists error gracefully
        if "Cannot create a file when that file already exists" in str(e):
            pass  # File already exists, that's fine
        else:
            print(f"Warning: Could not assign usernames to existing users: {e}")
    yield
    # Shutdown (if needed)

app = FastAPI(title="Daily Wellness Scheduler API", lifespan=lifespan)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Constants
BASE_DATA_DIR = "data"
LEGACY_SETTINGS_FILE = "user_settings.json"
LEGACY_PROGRESS_FILE = "progress.json"
LEGACY_SCHEDULE_FILE = "schedule.json"
PUSHBULLET_KEY_FILE = "pushbullet_key.txt"

# --- Helper Functions ---

def get_user_dir(user_id: str) -> str:
    # Sanitize user_id to be safe for filesystem
    safe_id = "".join(c for c in user_id if c.isalnum() or c in ('-', '_', '@', '.'))
    user_dir = os.path.join(BASE_DATA_DIR, safe_id)
    os.makedirs(user_dir, exist_ok=True)
    return user_dir

def migrate_legacy_data_if_needed(user_id: str):
    """
    Legacy migration disabled.
    New users should start with clean state.
    """
    return

    # Original migration logic below commented out
    # user_dir = get_user_dir(user_id)
    
    # # Check if user already has data
    # if os.path.exists(os.path.join(user_dir, "settings.json")):
    #     return # Already set up

    # print(f"Migrating legacy data for user {user_id}...")
    
    # # Copy Settings
    # if os.path.exists(LEGACY_SETTINGS_FILE):
    #     with open(LEGACY_SETTINGS_FILE, "r") as src, open(os.path.join(user_dir, "settings.json"), "w") as dst:
    #         dst.write(src.read())
            
    # # Copy Progress
    # if os.path.exists(LEGACY_PROGRESS_FILE):
    #     with open(LEGACY_PROGRESS_FILE, "r") as src, open(os.path.join(user_dir, "progress.json"), "w") as dst:
    #         dst.write(src.read())
            
    # # Copy Schedule
    # if os.path.exists(LEGACY_SCHEDULE_FILE):
    #     with open(LEGACY_SCHEDULE_FILE, "r") as src, open(os.path.join(user_dir, "schedule.json"), "w") as dst:
    #         dst.write(src.read())

def load_settings_from_file(user_id: str = "default") -> UserSettings:
    migrate_legacy_data_if_needed(user_id)
    filepath = os.path.join(get_user_dir(user_id), "settings.json")
    
    if os.path.exists(filepath):
        try:
            with open(filepath, "r") as f:
                data = json.load(f)
                # For existing users, default enable_supplements to True if not present (preserve current behavior)
                if "enable_supplements" not in data:
                    data["enable_supplements"] = True
                settings = UserSettings(**data)
                # Ensure optional_items has all default keys if it's empty or missing some
                default_optional = {
                    "slippery_elm": False,
                    "l_glutamine": False,
                    "collagen": False,
                    "melatonin": False
                }
                if not settings.optional_items:
                    settings.optional_items = default_optional.copy()
                else:
                    # Merge with defaults to ensure all keys exist
                    for key, default_value in default_optional.items():
                        if key not in settings.optional_items:
                            settings.optional_items[key] = default_value
                return settings
        except Exception as e:
            print(f"Error loading settings: {e}")
            return UserSettings()
    # New user - defaults to enable_supplements=False
    # Also initialize with smart defaults for general tasks
    new_settings = UserSettings()
    new_settings.default_tasks = _get_smart_default_tasks()
    return new_settings

def _get_smart_default_tasks() -> List[GeneralTaskItem]:
    """Get smart default tasks for new users (when supplements are disabled)"""
    return [
        # These are suggested defaults - users can customize
        # They won't be automatically added, but available as suggestions
    ]

def save_settings_to_file(settings: UserSettings, user_id: str = "default"):
    filepath = os.path.join(get_user_dir(user_id), "settings.json")
    with open(filepath, "w") as f:
        json.dump(settings.model_dump(), f, indent=4, default=str)

def load_progress_from_file(user_id: str = "default") -> Dict[str, Dict[str, Any]]:
    migrate_legacy_data_if_needed(user_id)
    filepath = os.path.join(get_user_dir(user_id), "progress.json")
    
    if os.path.exists(filepath):
        try:
            with open(filepath, "r") as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading progress: {e}")
            return {}
    return {}

def save_progress_to_file(progress: Dict[str, Dict[str, Any]], user_id: str = "default"):
    filepath = os.path.join(get_user_dir(user_id), "progress.json")
    with open(filepath, "w") as f:
        json.dump(progress, f, indent=4)

def load_schedule_from_file(user_id: str = "default") -> Dict[str, List[Dict[str, Any]]]:
    migrate_legacy_data_if_needed(user_id)
    filepath = os.path.join(get_user_dir(user_id), "schedule.json")
    
    if os.path.exists(filepath):
        try:
            with open(filepath, "r") as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading schedule: {e}")
            return {}
    return {}

def save_schedule_to_file(schedule: Dict[str, List[Dict[str, Any]]], user_id: str = "default", skip_backup: bool = False):
    """
    Save schedule to file with safety checks.
    
    SAFETY FEATURES:
    1. Always creates backup before overwriting existing schedule with data
    2. Validates schedule isn't completely empty (unless explicitly allowed)
    3. Prevents accidental deletion of user data
    """
    filepath = os.path.join(get_user_dir(user_id), "schedule.json")
    
    # Load existing schedule to check if we're about to lose data
    existing_schedule = {}
    if os.path.exists(filepath):
        try:
            with open(filepath, "r") as f:
                existing_schedule = json.load(f)
        except:
            pass
    
    # Count items in existing and new schedule
    existing_item_count = sum(len(items) for items in existing_schedule.values() if isinstance(items, list))
    new_item_count = sum(len(items) for items in schedule.values() if isinstance(items, list))
    
    # SAFETY CHECK 1: If existing schedule has data and new one is empty, create backup and warn
    if existing_item_count > 0 and new_item_count == 0 and not skip_backup:
        # Create emergency backup before potential data loss
        try:
            backup_path = create_backup(user_id)
            if backup_path:
                print(f"⚠️  WARNING: Attempting to save empty schedule! Created emergency backup: {backup_path}")
        except Exception as e:
            print(f"⚠️  CRITICAL: Failed to create backup before potential data loss: {e}")
        
        # Don't save empty schedule if we had data - this prevents accidental deletion
        raise ValueError(f"SAFETY CHECK FAILED: Attempted to save empty schedule when {existing_item_count} items existed. Schedule not saved. Backup created.")
    
    # SAFETY CHECK 2: Create backup before any schedule modification if existing data exists
    if existing_item_count > 0 and not skip_backup:
        try:
            backup_path = create_backup(user_id)
            if backup_path:
                print(f"✓ Created backup before schedule save: {backup_path}")
        except Exception as e:
            print(f"Warning: Failed to create backup before schedule save: {e}")
            # Don't fail the save if backup fails, but log it
    
    # Save the schedule
    with open(filepath, "w") as f:
        json.dump(schedule, f, indent=4, default=str)
    
    print(f"✓ Schedule saved: {new_item_count} items across {len(schedule)} dates")

def load_recurring_patterns(user_id: str = "default") -> List[Dict[str, Any]]:
    """Load recurring patterns for user"""
    filepath = os.path.join(get_user_dir(user_id), "recurring_patterns.json")
    if os.path.exists(filepath):
        try:
            with open(filepath, "r") as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading recurring patterns: {e}")
            return []
    return []

def save_recurring_patterns(patterns: List[Dict[str, Any]], user_id: str = "default"):
    """Save recurring patterns for user"""
    filepath = os.path.join(get_user_dir(user_id), "recurring_patterns.json")
    with open(filepath, "w") as f:
        json.dump(patterns, f, indent=2, default=str)

def load_pushbullet_key() -> str:
    if os.path.exists(PUSHBULLET_KEY_FILE):
        with open(PUSHBULLET_KEY_FILE, "r") as f:
            return f.read().strip()
    return ""

def save_pushbullet_key(key: str):
    with open(PUSHBULLET_KEY_FILE, "w") as f:
        f.write(key)

# ... (constants and helpers)

# Dependency
async def get_current_user_id(x_user_id: str = Header(...)):
    """Get current user ID from header - required for all authenticated endpoints"""
    if not x_user_id or x_user_id == "default":
        from fastapi import HTTPException
        raise HTTPException(status_code=401, detail="User ID required in x-user-id header")
    return x_user_id

# --- Endpoints ---

@app.get("/")
async def root():
    return {"message": "Daily Wellness Scheduler API", "version": "1.0"}


@app.get("/get-schedule")
async def get_schedule(user_id: str = Depends(get_current_user_id)):
    """Get the current schedule, generating if needed. Filters supplements if enable_supplements is False."""
    try:
        schedule = load_schedule_from_file(user_id)
        today_str = datetime.now().date().isoformat()
        
        # Check if user has configured settings
        settings_filepath = os.path.join(get_user_dir(user_id), "settings.json")
        if not os.path.exists(settings_filepath):
            print(f"ℹ️  User {user_id} has no settings file. Returning empty schedule. User should configure settings first.")
            return {}
        
        settings = load_settings_from_file(user_id)
        scheduler = SupplementScheduler(settings)
        
        # Check if supplements are enabled
        enable_supplements = getattr(settings, 'enable_supplements', False)
        
        # If supplements are disabled, we still generate schedule (general tasks only)
        # The scheduler will handle this internally
        
        # Track warnings across all generation operations
        all_warnings = []
        
        # If schedule is completely empty, generate full schedule
        if not schedule or len(schedule) == 0:
            generated, warnings = scheduler.generate_schedule(datetime.now(), weeks=6)
            all_warnings.extend(warnings)
            
            # Convert to JSON-serializable dict
            serializable_schedule = {}
            total_items = 0
            for date_str, items in generated.items():
                serializable_schedule[date_str] = [item.model_dump() for item in items]
                total_items += len(items)
            
            # SAFETY CHECK: Only save if we actually generated items
            if total_items > 0:
                schedule = serializable_schedule
                save_schedule_to_file(schedule, user_id, skip_backup=True)  # New user, no backup needed
            else:
                print(f"⚠️  WARNING: Schedule generation produced 0 items for user {user_id}. Returning empty schedule.")
                error_warning = [{"date": datetime.now().date().isoformat(), "supplement_name": "All", "reason": "Schedule generation produced 0 items", "severity": "error"}]
                return {"schedule": {}, "warnings": error_warning}
        else:
            # Schedule exists - check for missing dates (past 30 days + future 6 weeks)
            from datetime import timedelta
            today = datetime.now().date()
            missing_dates = []
            
            # Check past 30 days (for viewing history)
            for i in range(30, 0, -1):  # 30 days ago to yesterday
                check_date = today - timedelta(days=i)
                check_date_str = check_date.isoformat()
                if check_date_str not in schedule:
                    missing_dates.append(check_date)
            
            # Check future 6 weeks
            for i in range(42):  # 6 weeks ahead
                check_date = today + timedelta(days=i)
                check_date_str = check_date.isoformat()
                if check_date_str not in schedule:
                    missing_dates.append(check_date)
            
            # If we have missing dates, generate schedule for them
            if missing_dates:
                print(f"📅 Generating schedule for {len(missing_dates)} missing dates (past + future) for user {user_id}")
                # Generate from the earliest missing date forward
                earliest_date = min(missing_dates)
                latest_date = max(missing_dates)
                
                # Calculate how many weeks we need to generate
                # If earliest_date is in the past, we still generate forward from it
                # to cover all missing dates up to 6 weeks in the future
                if earliest_date < today:
                    # Start from earliest missing date, generate enough weeks to cover future
                    days_from_earliest_to_future = (today + timedelta(weeks=6) - earliest_date).days
                    weeks_to_generate = max(1, (days_from_earliest_to_future + 6) // 7)
                    start_date = earliest_date
                else:
                    # All missing dates are in the future, start from today
                    days_to_generate = (latest_date - today).days + 1
                    weeks_to_generate = max(1, (days_to_generate + 6) // 7)
                    start_date = today
                
                # Generate schedule starting from start_date
                generated, warnings = scheduler.generate_schedule(
                    datetime.combine(start_date, datetime.min.time()),
                    weeks=weeks_to_generate
                )
                
                # Merge new dates into existing schedule (don't overwrite existing dates)
                for date_str, items in generated.items():
                    if date_str not in schedule:  # Only add missing dates
                        schedule[date_str] = [item.model_dump() for item in items]
                
                # Save the updated schedule
                save_schedule_to_file(schedule, user_id, skip_backup=False)
                
                # Store warnings for response (only for missing dates generation)
                all_warnings.extend(warnings)
        
        # Apply recurring patterns (Phase 25) - Only if schedule exists and has data
        # Don't apply patterns on every request to avoid overwriting user data
        # Patterns are applied when created/updated, not on every schedule load
        # This prevents accidental data loss
        
        # Filter supplements from schedule if enable_supplements is False
        if not enable_supplements:
            filtered_schedule = {}
            for date_str, items in schedule.items():
                filtered_items = []
                for item in items:
                    # Keep items that are not supplements
                    if isinstance(item, dict):
                        item_type = item.get("item_type")
                        if item_type != "supplement":
                            filtered_items.append(item)
                    elif hasattr(item, 'item_type'):
                        if item.item_type != ScheduleItemType.SUPPLEMENT:
                            filtered_items.append(item.model_dump() if hasattr(item, 'model_dump') else item)
                    else:
                        # Legacy format - assume it's a supplement if it has supplement-like structure
                        # Keep general tasks (meals, workouts, etc.)
                        item_name = item.get("item", {}).get("name", "").lower() if isinstance(item, dict) else ""
                        if item_name in ["breakfast", "lunch", "dinner", "workout", "water", "bedtime"]:
                            filtered_items.append(item)
                if filtered_items:
                    filtered_schedule[date_str] = filtered_items
            schedule = filtered_schedule
        
        # Return schedule with warnings if any were generated
        # For backward compatibility, return just schedule if no warnings
        # Frontend can check for 'warnings' key to detect new format
        if all_warnings:
            warnings_dict = [
                {
                    "date": w.date,
                    "supplement_name": w.supplement_name,
                    "reason": w.reason,
                    "severity": w.severity
                }
                for w in all_warnings
            ]
            return {"schedule": schedule, "warnings": warnings_dict}
        return schedule
    except Exception as e:
        print(f"Error in get_schedule for user {user_id}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to load schedule: {str(e)}")

@app.post("/regenerate-schedule")
async def regenerate_schedule(user_id: str = Depends(get_current_user_id)):
    """Force regenerate the schedule - automatically creates backup before regenerating"""
    try:
        # Load existing schedule to check if it has data
        existing_schedule = load_schedule_from_file(user_id)
        
        # If schedule has data, create a backup before regenerating
        if existing_schedule and len(existing_schedule) > 0:
            try:
                backup_path = create_backup(user_id)
                if backup_path:
                    print(f"Created backup before regeneration: {backup_path}")
            except Exception as backup_error:
                # Log but don't fail - backup is a safety measure
                print(f"Warning: Failed to create backup before regeneration: {backup_error}")
        
        # Check if user has configured settings - if not, return empty schedule
        settings_filepath = os.path.join(get_user_dir(user_id), "settings.json")
        if not os.path.exists(settings_filepath):
            print(f"ℹ️  User {user_id} has no settings file. Returning empty schedule. User should configure settings first.")
            return {}
        
        # Regenerate schedule
        settings = load_settings_from_file(user_id)
        scheduler = SupplementScheduler(settings)
        
        # Check if supplements are enabled
        enable_supplements = getattr(settings, 'enable_supplements', False)
        
        # If supplements are disabled, we still generate schedule (general tasks only)
        # No need to check for supplements if they're disabled
        if enable_supplements and len(scheduler.supplements) == 0:
            raise HTTPException(
                status_code=500, 
                detail="CRITICAL: Supplements are enabled but scheduler has no supplements configured. Schedule not regenerated to prevent data loss. Please check settings."
            )
        
        # Preserve past dates (last 30 days) - don't regenerate them
        # Also preserve ALL existing supplement items if supplements are disabled (so they can be restored later)
        today = datetime.now().date()
        past_dates = {}
        preserved_supplements = {}  # Store supplements from existing schedule to preserve them
        
        if existing_schedule:
            for date_str, items in existing_schedule.items():
                try:
                    date_obj = datetime.fromisoformat(date_str).date()
                    # Keep dates from the past 30 days
                    if (today - date_obj).days > 0 and (today - date_obj).days <= 30:
                        past_dates[date_str] = items
                    
                    # If supplements are disabled, preserve all supplement items from existing schedule
                    if not enable_supplements:
                        supplement_items = []
                        for item in items:
                            item_type = item.get("item_type") if isinstance(item, dict) else getattr(item, 'item_type', None)
                            # Preserve supplements (including legacy items without item_type that look like supplements)
                            if item_type == "supplement" or (item_type is None and isinstance(item, dict) and "item" in item and "dose" in item.get("item", {})):
                                supplement_items.append(item)
                        if supplement_items:
                            if date_str not in preserved_supplements:
                                preserved_supplements[date_str] = []
                            preserved_supplements[date_str].extend(supplement_items)
                except (ValueError, TypeError):
                    continue
        
        # Generate new schedule from today forward
        generated, warnings = scheduler.generate_schedule(datetime.now(), weeks=6)
        
        # Debug: Log optional items status
        optional_items_status = settings.optional_items or {}
        enabled_optional = [key for key, value in optional_items_status.items() if value]
        print(f"📊 REGENERATION DEBUG: Optional items enabled: {enabled_optional}")
        
        serializable_schedule = {}
        total_items = 0
        today_str = datetime.now().date().isoformat()
        today_items = []
        for date_str, items in generated.items():
            serializable_schedule[date_str] = [item.model_dump() for item in items]
            total_items += len(items)
            if date_str == today_str:
                today_items = [item.model_dump() for item in items]
        
        # Debug: Log today's schedule details
        print(f"📊 REGENERATION DEBUG: Today ({today_str}) has {len(today_items)} items")
        if today_items:
            item_names = [item.get('item', {}).get('name', 'Unknown') for item in today_items]
            print(f"📊 REGENERATION DEBUG: Today's items: {item_names}")
        
        # Merge preserved past dates back into the schedule
        serializable_schedule.update(past_dates)
        
        # If supplements are disabled, merge preserved supplements back into the schedule (they'll be filtered in response only)
        if not enable_supplements and preserved_supplements:
            for date_str, supplement_items in preserved_supplements.items():
                if date_str in serializable_schedule:
                    # Merge supplements back in (they'll be filtered in the response)
                    serializable_schedule[date_str].extend(supplement_items)
                    # Sort by time
                    serializable_schedule[date_str].sort(key=lambda x: x.get("scheduled_time", ""))
                else:
                    serializable_schedule[date_str] = supplement_items
        
        # SAFETY CHECK: Verify we actually generated items
        if total_items == 0:
            raise HTTPException(
                status_code=500,
                detail=f"CRITICAL: Schedule regeneration produced 0 items. Schedule not saved to prevent data loss. Scheduler has {len(scheduler.supplements)} supplements configured."
            )
        
        # Apply recurring patterns (Phase 25) - Only on explicit regeneration
        patterns = load_recurring_patterns(user_id)
        enabled_patterns = [p for p in patterns if p.get("enabled", True)]
        if enabled_patterns:
            schedule_end = datetime.now() + timedelta(weeks=6)
            for pattern in enabled_patterns:
                serializable_schedule = apply_recurring_pattern(pattern, schedule_end, serializable_schedule)
        
        # Convert warnings to dict format for JSON serialization
        warnings_dict = [
            {
                "date": w.date,
                "supplement_name": w.supplement_name,
                "reason": w.reason,
                "severity": w.severity
            }
            for w in warnings
        ]
        
        # IMPORTANT: Save the FULL schedule (including supplements) even if supplements are disabled
        # This preserves supplement data so it can be restored when supplements are re-enabled
        # We only filter supplements in the RESPONSE, not in the saved file
        
        # Count items for validation (count all items, not just filtered)
        final_item_count = sum(len(items) for items in serializable_schedule.values())
        if final_item_count == 0 and enable_supplements:
            # Only error if supplements are enabled (general tasks should always exist)
            raise HTTPException(
                status_code=500,
                detail="CRITICAL: Final schedule has 0 items after regeneration. Schedule not saved to prevent data loss."
            )
        
        # Save the FULL schedule (including supplements if they exist)
        save_schedule_to_file(serializable_schedule, user_id, skip_backup=True)  # Skip backup since we already created one
        
        # Filter supplements from RESPONSE ONLY if enable_supplements is False
        # This way supplements are preserved in storage but hidden from view
        response_schedule = serializable_schedule
        if not enable_supplements:
            filtered_schedule = {}
            for date_str, items in serializable_schedule.items():
                filtered_items = [
                    item for item in items
                    if item.get("item_type") != "supplement"
                ]
                # Also filter legacy items that look like supplements (no item_type but have dose)
                filtered_items = [
                    item for item in filtered_items
                    if not (item.get("item_type") is None and isinstance(item, dict) and "item" in item and "dose" in item.get("item", {}))
                ]
                if filtered_items:
                    filtered_schedule[date_str] = filtered_items
            response_schedule = filtered_schedule
        
        # Count visible items for response
        visible_item_count = sum(len(items) for items in response_schedule.values())
        
        # Debug: Log today's schedule details
        today_str = datetime.now().date().isoformat()
        today_response_items = response_schedule.get(today_str, [])
        print(f"📊 REGENERATION DEBUG: Today ({today_str}) response has {len(today_response_items)} visible items")
        if today_response_items:
            item_details = []
            for item in today_response_items:
                item_type = item.get("item_type", "unknown")
                item_name = item.get("item", {}).get("name", "Unknown") if isinstance(item.get("item"), dict) else "Unknown"
                item_details.append(f"{item_name} ({item_type})")
            print(f"📊 REGENERATION DEBUG: Today's visible items: {item_details}")
        
        # Debug: Log optional items status
        optional_items_status = settings.optional_items or {}
        enabled_optional = [key for key, value in optional_items_status.items() if value]
        print(f"📊 REGENERATION DEBUG: Optional items enabled in settings: {enabled_optional}")
        print(f"📊 REGENERATION DEBUG: Warnings count: {len(warnings_dict)}")
        if warnings_dict:
            print(f"📊 REGENERATION DEBUG: Warnings: {warnings_dict}")
        
        # Return filtered schedule (supplements hidden) but they're preserved in storage
        return {
            "schedule": response_schedule,
            "warnings": warnings_dict,
            "total_items": visible_item_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to regenerate schedule: {str(e)}")

@app.post("/save-settings")
async def save_settings(settings: UserSettings, user_id: str = Depends(get_current_user_id)):
    """
    Save user settings. 
    SAFETY: Creates backup before saving if schedule exists, in case settings change affects schedule generation.
    If enable_supplements is False, supplement-related settings are ignored.
    """
    # Create backup before settings change (settings might affect schedule generation)
    existing_schedule = load_schedule_from_file(user_id)
    if existing_schedule:
        existing_item_count = sum(len(items) for items in existing_schedule.values() if isinstance(items, list))
        if existing_item_count > 0:
            try:
                backup_path = create_backup(user_id)
                if backup_path:
                    print(f"✓ Created backup before settings save: {backup_path}")
            except Exception as e:
                print(f"Warning: Failed to create backup before settings save: {e}")
    
    # Validation: If enable_supplements is False, we don't need to validate supplement settings
    # But we still save them in case user re-enables supplements later
    # The scheduler will simply not generate supplements if enable_supplements is False
    
    save_settings_to_file(settings, user_id)
    return {"status": "success"}

@app.get("/load-settings")
async def load_settings(user_id: str = Depends(get_current_user_id)):
    return load_settings_from_file(user_id)

@app.post("/save-progress")
async def save_progress(progress_data: Dict[str, Dict[str, Any]], user_id: str = Depends(get_current_user_id)):
    try:
        old_progress = load_progress_from_file(user_id)
        settings = load_settings_from_file(user_id)
        inventory_updated = False
        
        # Handle Inventory Logic
        for date_key, day_data in progress_data.items():
            if date_key == "_meta": continue
            
            # Get old day data
            old_day_data = old_progress.get(date_key, {})
            
            # Find items in schedule for this day to map ID to Name
            schedule = load_schedule_from_file(user_id)
            day_schedule = schedule.get(date_key, [])
            id_to_name = {}
            for item in day_schedule:
                # Handle both dict and obj (though json load gives dict)
                if isinstance(item, dict):
                    item_id = item.get('id')
                    item_name = item.get('item', {}).get('name')
                    # Also try to match simplified keys if needed, but name is safer
                    if item_id and item_name:
                        id_to_name[item_id] = item_name

            # Iterate through items in the update
            for item_id, status in day_data.items():
                if item_id == "_meta": continue
                
                # Skip if not integer status
                if not isinstance(status, int): continue

                old_status = old_day_data.get(item_id, 0)
                
                # If changing TO completed (2) FROM not completed
                if status == 2 and old_status != 2:
                    # Decrement stock
                    name = id_to_name.get(item_id)
                    if name:
                        # Normalize name for inventory key
                        inv_key = name # simpler to just use name or normalize
                        # Try to find in inventory
                        # Actually inventory keys might be user input or normalized
                        # Let's search loosely
                        target_key = None
                        for k in settings.inventory.keys():
                            if k.lower() == name.lower():
                                target_key = k
                                break
                        
                        if not target_key:
                             # Initialize if not found? Or just use name
                             target_key = name
                             if target_key not in settings.inventory:
                                 settings.inventory[target_key] = InventoryItem(current_stock=0)

                        if target_key in settings.inventory:
                            settings.inventory[target_key].current_stock -= 1
                            inventory_updated = True

                # If changing FROM completed (2) TO not completed
                elif status != 2 and old_status == 2:
                    # Increment stock (undo)
                    name = id_to_name.get(item_id)
                    if name:
                        target_key = None
                        for k in settings.inventory.keys():
                            if k.lower() == name.lower():
                                target_key = k
                                break
                        
                        if target_key and target_key in settings.inventory:
                            settings.inventory[target_key].current_stock += 1
                            inventory_updated = True

        if inventory_updated:
            save_settings_to_file(settings, user_id)
            
        save_progress_to_file(progress_data, user_id)
        return {"status": "success"}
    except Exception as e:
        print(f"Error saving progress: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/load-progress")
async def load_progress(user_id: str = Depends(get_current_user_id)):
    return load_progress_from_file(user_id)

# --- Inventory ---

class InventoryUpdate(BaseModel):
    name: str
    change: int # +1, -1, or absolute set if we wanted, but simple delta is easy

@app.post("/inventory/update")
async def update_inventory(data: Dict[str, Any], user_id: str = Depends(get_current_user_id)):
    settings = load_settings_from_file(user_id)
    name = data.get("name")
    
    # Handle absolute set vs relative change
    # data could be {name: "X", current_stock: 5} OR {name: "X", change: -1}
    
    if not name:
         raise HTTPException(status_code=400, detail="Name required")

    # Find or create item
    if name not in settings.inventory:
        settings.inventory[name] = InventoryItem()
    
    if "current_stock" in data:
        settings.inventory[name].current_stock = int(data["current_stock"])
    
    if "low_stock_threshold" in data:
        settings.inventory[name].low_stock_threshold = int(data["low_stock_threshold"])

    if "refill_size" in data:
        settings.inventory[name].refill_size = int(data["refill_size"])

    save_settings_to_file(settings, user_id)
    return settings.inventory

# --- Schedule Management ---

@app.post("/schedule/add-item")
async def add_item_to_schedule(item_data: ScheduledItem, user_id: str = Depends(get_current_user_id)):
    """Add a new item directly to the schedule for the current day."""
    try:
        schedule = load_schedule_from_file(user_id)
        today_str = datetime.now().date().isoformat()

        if today_str not in schedule:
            schedule[today_str] = []

        # Ensure the item has a unique ID
        if not item_data.id:
            item_data.id = str(uuid.uuid4())

        schedule[today_str].append(item_data.model_dump())
        
        # Sort
        def sort_key(x):
            try:
                return datetime.fromisoformat(x["scheduled_time"]) if isinstance(x["scheduled_time"], str) else x["scheduled_time"]
            except:
                return datetime.now() # Fallback
        
        schedule[today_str].sort(key=lambda x: x["scheduled_time"]) # Simple sort might fail with mixed types, assume string from load

        save_schedule_to_file(schedule, user_id)
        return {"status": "success", "schedule": schedule}
    except Exception as e:
        print(f"Error adding item to schedule: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/schedule/update-item")
async def update_schedule_item(item_data: ScheduledItem, user_id: str = Depends(get_current_user_id)):
    """Update a specific scheduled item"""
    try:
        schedule = load_schedule_from_file(user_id)
        updated = False
        
        # Find item across all days (usually just need today/future)
        for date_str, items in schedule.items():
            for i, item in enumerate(items):
                if item.get("id") == item_data.id:
                    schedule[date_str][i] = item_data.model_dump()
                    updated = True
                    break
            if updated: break
        
        if not updated:
             raise HTTPException(status_code=404, detail="Item not found")
             
        save_schedule_to_file(schedule, user_id)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/schedule/delete-item")
async def delete_schedule_item(data: Dict[str, str], user_id: str = Depends(get_current_user_id)):
    """Delete a scheduled item by ID"""
    item_id = data.get("id") or data.get("item_id")
    if not item_id:
        raise HTTPException(status_code=400, detail="ID required")
        
    schedule = load_schedule_from_file(user_id)
    deleted = False
    
    for date_str, items in schedule.items():
        original_len = len(items)
        schedule[date_str] = [i for i in items if i.get("id") != item_id]
        if len(schedule[date_str]) < original_len:
            deleted = True
            
    if deleted:
        save_schedule_to_file(schedule, user_id)
        return schedule
    
    raise HTTPException(status_code=404, detail="Item not found")

@app.post("/schedule/suggest-reschedule")
async def suggest_reschedule(data: Dict[str, str], user_id: str = Depends(get_current_user_id)):
    """Suggest reschedule times for a missed item"""
    item_id = data.get("id")
    schedule = load_schedule_from_file(user_id)
    today_str = datetime.now().date().isoformat()
    items = schedule.get(today_str, [])
    
    target_item = next((i for i in items if i.get("id") == item_id), None)
    if not target_item:
        raise HTTPException(status_code=404, detail="Item not found")
        
    # Logic to find options
    # Simplified for reconstruction: return fixed options
    now = datetime.now()
    options = []
    
    # Option 1: +30 mins
    opt1 = now + timedelta(minutes=30)
    options.append({"label": "In 30 minutes", "time": opt1.isoformat()})
    
    # Option 2: +1 hour
    opt2 = now + timedelta(hours=1)
    options.append({"label": "In 1 hour", "time": opt2.isoformat()})
    
    # Option 3: Dinner (6:30 PM)
    dinner = datetime.combine(now.date(), time(18, 30))
    if dinner > now:
        options.append({"label": "At Dinner (6:30 PM)", "time": dinner.isoformat()})
        
    return {"options": options}

@app.get("/schedule/types")
async def get_schedule_types(user_id: str = Depends(get_current_user_id)):
    """Get available schedule item types"""
    return {
        "types": [
            {"value": "supplement", "label": "Supplement"},
            {"value": "task", "label": "Task"},
            {"value": "habit", "label": "Habit"},
            {"value": "reminder", "label": "Reminder"},
            {"value": "meal", "label": "Meal"},
            {"value": "workout", "label": "Workout"},
            {"value": "hydration", "label": "Hydration"},
            {"value": "medication", "label": "Medication"},
            {"value": "custom", "label": "Custom"}
        ]
    }

@app.get("/schedule/tasks/templates")
async def get_task_templates(user_id: str = Depends(get_current_user_id)):
    """Get default task templates with full details"""
    settings = load_settings_from_file(user_id)
    wake_time = settings.wake_time
    bedtime = settings.bedtime
    
    templates = [
        {
            "id": "morning_routine",
            "name": "Morning Routine",
            "description": "Start your day right with a complete morning routine",
            "category": "habit",
            "icon": "sunrise",
            "tasks": [
                {
                    "name": "Wake Up",
                    "description": "Start your day",
                    "category": "reminder",
                    "time_offset": "0:00",  # At wake time
                    "duration_minutes": None,
                    "notes": ""
                },
                {
                    "name": "Morning Meditation",
                    "description": "Mindfulness practice",
                    "category": "habit",
                    "time_offset": "0:30",  # 30 min after wake
                    "duration_minutes": 10,
                    "notes": "Take time to center yourself"
                },
                {
                    "name": "Morning Stretch",
                    "description": "Gentle stretching",
                    "category": "workout",
                    "time_offset": "0:45",  # 45 min after wake
                    "duration_minutes": 15,
                    "notes": "Wake up your body"
                }
            ]
        },
        {
            "id": "evening_routine",
            "name": "Evening Routine",
            "description": "Wind down for a restful night",
            "category": "habit",
            "icon": "moon",
            "tasks": [
                {
                    "name": "Evening Reflection",
                    "description": "Journal or reflect on your day",
                    "category": "habit",
                    "time_offset": "-2:00",  # 2 hours before bedtime
                    "duration_minutes": 15,
                    "notes": "Gratitude journaling or reflection"
                },
                {
                    "name": "Relaxation Time",
                    "description": "Unwind before bed",
                    "category": "habit",
                    "time_offset": "-1:00",  # 1 hour before bedtime
                    "duration_minutes": 30,
                    "notes": "Reading, music, or quiet time"
                },
                {
                    "name": "Prepare for Sleep",
                    "description": "Get ready for bed",
                    "category": "reminder",
                    "time_offset": "-0:30",  # 30 min before bedtime
                    "duration_minutes": None,
                    "notes": "Set up for tomorrow"
                }
            ]
        },
        {
            "id": "workout_day",
            "name": "Workout Day",
            "description": "Complete workout day routine",
            "category": "workout",
            "icon": "dumbbell",
            "tasks": [
                {
                    "name": "Pre-Workout Meal",
                    "description": "Fuel your workout",
                    "category": "meal",
                    "time_offset": "-1:30",  # 1.5 hours before workout
                    "duration_minutes": None,
                    "notes": "Light meal or snack"
                },
                {
                    "name": "Warm-up",
                    "description": "Prepare your body",
                    "category": "workout",
                    "time_offset": "-0:15",  # 15 min before workout
                    "duration_minutes": 10,
                    "notes": "Dynamic stretching and activation"
                },
                {
                    "name": "Post-Workout Recovery",
                    "description": "Recovery and refuel",
                    "category": "workout",
                    "time_offset": "0:30",  # 30 min after workout
                    "duration_minutes": 20,
                    "notes": "Stretching and hydration"
                }
            ]
        },
        {
            "id": "rest_day",
            "name": "Rest Day",
            "description": "Active recovery and rest",
            "category": "habit",
            "icon": "rest",
            "tasks": [
                {
                    "name": "Gentle Walk",
                    "description": "Light movement",
                    "category": "workout",
                    "time_offset": "2:00",  # 2 hours after wake
                    "duration_minutes": 30,
                    "notes": "Easy pace, enjoy nature"
                },
                {
                    "name": "Mobility Work",
                    "description": "Flexibility and mobility",
                    "category": "workout",
                    "time_offset": "4:00",  # 4 hours after wake
                    "duration_minutes": 20,
                    "notes": "Yoga, stretching, or foam rolling"
                },
                {
                    "name": "Recovery Activities",
                    "description": "Restorative practices",
                    "category": "habit",
                    "time_offset": "6:00",  # 6 hours after wake
                    "duration_minutes": 30,
                    "notes": "Meditation, reading, or hobbies"
                }
            ]
        },
        {
            "id": "meditation_practice",
            "name": "Meditation Practice",
            "description": "Daily mindfulness and meditation",
            "category": "habit",
            "icon": "zen",
            "tasks": [
                {
                    "name": "Morning Meditation",
                    "description": "Start your day mindfully",
                    "category": "habit",
                    "time_offset": "0:30",  # 30 min after wake
                    "duration_minutes": 10,
                    "notes": "Set intention for the day"
                },
                {
                    "name": "Evening Meditation",
                    "description": "Wind down mindfully",
                    "category": "habit",
                    "time_offset": "-1:00",  # 1 hour before bedtime
                    "duration_minutes": 15,
                    "notes": "Reflect and release the day"
                }
            ]
        },
        {
            "id": "hydration_focus",
            "name": "Hydration Focus",
            "description": "Enhanced hydration reminders",
            "category": "hydration",
            "icon": "droplets",
            "tasks": [
                {
                    "name": "Morning Water",
                    "description": "Start hydrated",
                    "category": "hydration",
                    "time_offset": "0:15",  # 15 min after wake
                    "duration_minutes": None,
                    "notes": "First glass of the day"
                },
                {
                    "name": "Mid-Morning Water",
                    "description": "Stay hydrated",
                    "category": "hydration",
                    "time_offset": "2:00",  # 2 hours after wake
                    "duration_minutes": None,
                    "notes": "Keep the momentum"
                },
                {
                    "name": "Afternoon Water",
                    "description": "Afternoon hydration",
                    "category": "hydration",
                    "time_offset": "5:00",  # 5 hours after wake
                    "duration_minutes": None,
                    "notes": "Maintain energy"
                },
                {
                    "name": "Evening Water",
                    "description": "Final hydration",
                    "category": "hydration",
                    "time_offset": "-2:00",  # 2 hours before bedtime
                    "duration_minutes": None,
                    "notes": "Last glass (not too close to bed)"
                }
            ]
        },
        {
            "id": "reading_habit",
            "name": "Reading Habit",
            "description": "Daily reading routine",
            "category": "habit",
            "icon": "book",
            "tasks": [
                {
                    "name": "Reading Time",
                    "description": "Daily reading session",
                    "category": "habit",
                    "time_offset": "-2:00",  # 2 hours before bedtime
                    "duration_minutes": 30,
                    "notes": "Read for pleasure or learning"
                }
            ]
        },
        {
            "id": "journaling_practice",
            "name": "Journaling Practice",
            "description": "Daily journaling and reflection",
            "category": "habit",
            "icon": "pen",
            "tasks": [
                {
                    "name": "Morning Journal",
                    "description": "Set intentions",
                    "category": "habit",
                    "time_offset": "0:20",  # 20 min after wake
                    "duration_minutes": 10,
                    "notes": "Gratitude and goals"
                },
                {
                    "name": "Evening Journal",
                    "description": "Reflect on the day",
                    "category": "habit",
                    "time_offset": "-1:30",  # 1.5 hours before bedtime
                    "duration_minutes": 15,
                    "notes": "Review and reflect"
                }
            ]
        }
    ]
    return {"templates": templates}

@app.post("/schedule/tasks/apply-template")
async def apply_task_template(
    template_data: dict,
    user_id: str = Depends(get_current_user_id)
):
    """Apply a task template to the schedule"""
    template_id = template_data.get("template_id")
    date_str = template_data.get("date")  # ISO date string, optional (defaults to today)
    days_of_week = template_data.get("days_of_week", [])  # Optional: apply to specific days
    
    if not template_id:
        raise HTTPException(status_code=400, detail="template_id is required")
    
    # Get template
    templates_response = await get_task_templates(user_id)
    templates = templates_response.get("templates", [])
    template = next((t for t in templates if t.get("id") == template_id), None)
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    settings = load_settings_from_file(user_id)
    schedule = load_schedule_from_file(user_id)
    
    # Create backup before applying template (for revert functionality)
    import json
    import os
    backup_dir = os.path.join(BASE_DATA_DIR, user_id, "template_backups")
    os.makedirs(backup_dir, exist_ok=True)
    backup_file = os.path.join(backup_dir, f"backup_{datetime.now().isoformat().replace(':', '-')}.json")
    with open(backup_file, 'w') as f:
        json.dump(schedule, f, default=str, indent=2)
    
    # Parse date or use today
    if date_str:
        try:
            target_date = datetime.fromisoformat(date_str).date()
        except:
            target_date = datetime.now().date()
    else:
        target_date = datetime.now().date()
    
    # Determine which dates to apply to
    dates_to_apply = []
    if days_of_week:
        # Apply to specific days of week for next 6 weeks
        for week in range(6):
            for day_offset in range(7):
                check_date = target_date + timedelta(days=week * 7 + day_offset)
                if check_date.weekday() in days_of_week:
                    dates_to_apply.append(check_date)
    else:
        # Apply to single date
        dates_to_apply = [target_date]
    
    # Apply template tasks to each date
    added_items = []
    for apply_date in dates_to_apply:
        date_str = apply_date.isoformat()
        if date_str not in schedule:
            schedule[date_str] = []
        
        # Get time anchors for this date
        day_of_week = apply_date.weekday()
        has_breakfast = settings.breakfast_mode != "no" and (settings.breakfast_mode == "yes" or settings.breakfast_days[day_of_week])
        is_workout = settings.workout_days[day_of_week]
        
        # Create time anchors
        try:
            wake_parts = settings.wake_time.split(':')
            wake_hour = int(wake_parts[0])
            wake_minute = int(wake_parts[1])
            wake_dt = datetime.combine(apply_date, time(wake_hour, wake_minute))
        except:
            wake_dt = datetime.combine(apply_date, time(7, 30))
        
        try:
            bed_parts = settings.bedtime.split(':')
            bed_hour = int(bed_parts[0])
            bed_minute = int(bed_parts[1])
            bed_dt = datetime.combine(apply_date, time(bed_hour, bed_minute))
        except:
            bed_dt = datetime.combine(apply_date, time(22, 0))
        
        # Apply each task from template
        for task_template in template.get("tasks", []):
            # Parse time offset (format: "H:MM" or "-H:MM" for relative to wake/bed)
            time_offset = task_template.get("time_offset", "0:00")
            is_relative_to_bed = time_offset.startswith("-")
            offset_str = time_offset.lstrip("-")
            offset_parts = offset_str.split(":")
            offset_hours = int(offset_parts[0])
            offset_minutes = int(offset_parts[1]) if len(offset_parts) > 1 else 0
            
            # Calculate task time
            if is_relative_to_bed:
                task_time = bed_dt - timedelta(hours=offset_hours, minutes=offset_minutes)
            else:
                task_time = wake_dt + timedelta(hours=offset_hours, minutes=offset_minutes)
            
            # Create task item
            task = GeneralTaskItem(
                id=str(uuid.uuid4()),
                name=task_template.get("name", ""),
                description=task_template.get("description", ""),
                category=task_template.get("category", "habit"),
                duration_minutes=task_template.get("duration_minutes"),
                notes=task_template.get("notes", ""),
                enabled=True,
                icon=task_template.get("icon")
            )
            
            # Determine item type from category
            category_to_type = {
                "meal": ScheduleItemType.MEAL,
                "workout": ScheduleItemType.WORKOUT,
                "hydration": ScheduleItemType.HYDRATION,
                "medication": ScheduleItemType.MEDICATION,
                "habit": ScheduleItemType.HABIT,
                "reminder": ScheduleItemType.REMINDER,
                "custom": ScheduleItemType.CUSTOM
            }
            item_type = category_to_type.get(task.category, ScheduleItemType.TASK)
            
            # Create scheduled item
            scheduled_item = ScheduledItem(
                id=str(uuid.uuid4()),
                item_type=item_type,
                item=task,
                scheduled_time=task_time,
                day_type=DayType.LIGHT
            )
            
            schedule[date_str].append(scheduled_item.model_dump())
            added_items.append({
                "date": date_str,
                "task": task.name,
                "time": task_time.isoformat()
            })
        
        # Sort by time - handle both datetime objects and ISO strings
        def sort_key(x):
            scheduled_time = x.get("scheduled_time", "")
            if isinstance(scheduled_time, str):
                try:
                    return datetime.fromisoformat(scheduled_time.replace('Z', '+00:00'))
                except:
                    return datetime.now()
            elif isinstance(scheduled_time, datetime):
                return scheduled_time
            else:
                return datetime.now()
        
        schedule[date_str].sort(key=sort_key)
    
    # Save updated schedule
    save_schedule_to_file(schedule, user_id)
    
    return {
        "status": "success",
        "template": template.get("name"),
        "dates_applied": len(dates_to_apply),
        "items_added": len(added_items),
        "added_items": added_items,
        "backup_file": backup_file  # Return backup file path for revert
    }

@app.post("/schedule/tasks/revert-template")
async def revert_template_application(
    template_data: dict,
    user_id: str = Depends(get_current_user_id)
):
    """Revert a template application using a backup file"""
    backup_file = template_data.get("backup_file")
    
    if not backup_file:
        raise HTTPException(status_code=400, detail="backup_file is required")
    
    import os
    import json
    
    # Check if backup file exists
    if not os.path.exists(backup_file):
        raise HTTPException(status_code=404, detail="Backup file not found")
    
    try:
        # Load backup
        with open(backup_file, 'r') as f:
            backup_schedule = json.load(f)
        
        # Restore schedule
        save_schedule_to_file(backup_schedule, user_id)
        
        return {
            "status": "success",
            "message": "Template application reverted successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to revert: {str(e)}")

@app.get("/schedule/tasks/recent-backups")
async def get_recent_backups(
    user_id: str = Depends(get_current_user_id)
):
    """Get list of recent template application backups"""
    import os
    import json
    from pathlib import Path
    
    backup_dir = os.path.join(BASE_DATA_DIR, user_id, "template_backups")
    
    if not os.path.exists(backup_dir):
        return {"backups": []}
    
    backups = []
    for file in sorted(Path(backup_dir).glob("backup_*.json"), reverse=True)[:10]:  # Last 10 backups
        try:
            stat = file.stat()
            backups.append({
                "file": str(file),
                "created": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                "size": stat.st_size
            })
        except:
            continue
    
    return {"backups": backups}

@app.post("/schedule/tasks")
async def add_schedule_task(
    task_data: dict,
    user_id: str = Depends(get_current_user_id)
):
    """Add a custom general task to user's default tasks"""
    settings = load_settings_from_file(user_id)
    
    # Create GeneralTaskItem from task_data
    task = GeneralTaskItem(
        id=task_data.get("id", str(uuid.uuid4())),
        name=task_data.get("name", ""),
        description=task_data.get("description", ""),
        category=task_data.get("category", "custom"),
        duration_minutes=task_data.get("duration_minutes"),
        notes=task_data.get("notes", ""),
        enabled=task_data.get("enabled", True),
        optional=task_data.get("optional", False),
        icon=task_data.get("icon")
    )
    
    # Add to default_tasks
    if not settings.default_tasks:
        settings.default_tasks = []
    settings.default_tasks.append(task)
    
    save_settings_to_file(settings, user_id)
    return {"status": "success", "task": task.model_dump()}

@app.put("/schedule/tasks/{task_id}")
async def update_schedule_task(
    task_id: str,
    task_data: dict,
    user_id: str = Depends(get_current_user_id)
):
    """Update a general task in user's default tasks"""
    settings = load_settings_from_file(user_id)
    
    if not settings.default_tasks:
        raise HTTPException(status_code=404, detail="No tasks found")
    
    # Find task by ID
    task_index = None
    for i, task in enumerate(settings.default_tasks):
        if task.id == task_id or task.name == task_id:  # Support both ID and name for backward compatibility
            task_index = i
            break
    
    if task_index is None:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Update task (preserve ID)
    existing_task = settings.default_tasks[task_index]
    updated_task = GeneralTaskItem(
        id=existing_task.id,  # Preserve ID
        name=task_data.get("name", existing_task.name),
        description=task_data.get("description", existing_task.description),
        category=task_data.get("category", existing_task.category),
        duration_minutes=task_data.get("duration_minutes", existing_task.duration_minutes),
        notes=task_data.get("notes", existing_task.notes),
        enabled=task_data.get("enabled", existing_task.enabled),
        optional=task_data.get("optional", existing_task.optional),
        icon=task_data.get("icon", existing_task.icon)
    )
    
    settings.default_tasks[task_index] = updated_task
    save_settings_to_file(settings, user_id)
    return {"status": "success", "task": updated_task.model_dump()}

@app.delete("/schedule/tasks/{task_id}")
async def delete_schedule_task(
    task_id: str,
    user_id: str = Depends(get_current_user_id)
):
    """Delete a general task from user's default tasks"""
    settings = load_settings_from_file(user_id)
    
    if not settings.default_tasks:
        raise HTTPException(status_code=404, detail="No tasks found")
    
    # Find task by ID
    task_index = None
    for i, task in enumerate(settings.default_tasks):
        if task.id == task_id or task.name == task_id:  # Support both ID and name for backward compatibility
            task_index = i
            break
    
    if task_index is None:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Remove task
    deleted_task = settings.default_tasks.pop(task_index)
    save_settings_to_file(settings, user_id)
    return {"status": "success", "deleted_task": deleted_task.model_dump()}

@app.post("/schedule/apply-reschedule")
async def apply_reschedule(data: Dict[str, str], user_id: str = Depends(get_current_user_id)):
    item_id = data.get("id")
    new_time_str = data.get("new_time")
    
    schedule = load_schedule_from_file(user_id)
    today_str = datetime.now().date().isoformat()
    items = schedule.get(today_str, [])
    
    for item in items:
        if item.get("id") == item_id:
            item["scheduled_time"] = new_time_str
            item["shifted"] = True
            item["shift_reason"] = "Rescheduled by user"
            break
            
    # Re-sort
    try:
        items.sort(key=lambda x: x["scheduled_time"])
    except: pass
    
    save_schedule_to_file(schedule, user_id)
    return {"status": "success"}

# --- Stats & Insights ---

@app.get("/stats")
async def get_stats(user_id: str = Depends(get_current_user_id)):
    progress = load_progress_from_file(user_id)
    schedule = load_schedule_from_file(user_id)
    
    # Calculate streak
    current_streak = 0
    longest_streak = 0
    total_days = 0
    today = datetime.now().date()
    
    # Iterate backwards from yesterday
    check_date = today - timedelta(days=1)
    while True:
        date_str = check_date.isoformat()
        if date_str in progress:
            # Check if day was "completed" (e.g. > 50% or something)
            # Simplified: if any entry exists, count it as a day for now
            current_streak += 1
            check_date -= timedelta(days=1)
        else:
            break
            
    # Check today
    if today.isoformat() in progress:
        current_streak += 1
    
    # Calculate weekly completion (last 7 days)
    week_start = today - timedelta(days=6)  # Include today, so 6 days back
    week_dates = [(today - timedelta(days=i)).isoformat() for i in range(7)]
    
    week_completed_days = 0
    week_total_days = 0
    
    for date_str in week_dates:
        if date_str in schedule and len(schedule[date_str]) > 0:
            week_total_days += 1
            if date_str in progress:
                day_progress = progress[date_str]
                day_schedule = schedule[date_str]
                
                # Count completed items
                completed_count = 0
                total_count = len(day_schedule)
                
                for item in day_schedule:
                    item_id = item.get("id", "")
                    if item_id in day_progress and day_progress[item_id] == 2:
                        completed_count += 1
                
                # Day is "completed" if > 50% of items are done
                if total_count > 0 and (completed_count / total_count) >= 0.5:
                    week_completed_days += 1
    
    weekly_completion = (week_completed_days / week_total_days * 100) if week_total_days > 0 else 0.0
        
    return {
        "current_streak": current_streak,
        "longest_streak": max(current_streak, longest_streak),
        "total_days": len(progress),
        "weekly_completion": round(weekly_completion, 1)
    }

@app.get("/insights")
async def get_insights(user_id: str = Depends(get_current_user_id)):
    try:
        progress = load_progress_from_file(user_id)
        schedule = load_schedule_from_file(user_id)
        settings = load_settings_from_file(user_id)
        
        # Calculate patterns and predictions
        patterns = calculate_completion_patterns(progress, schedule)
        prediction = predict_today_completion(schedule, progress, patterns)
        recommendations = generate_smart_recommendations(schedule, progress, patterns, settings)
        trends = calculate_trends(progress, schedule)
        
        # Add automation suggestions
        habit_stacking = suggest_habit_stacking(schedule, progress)
        reschedule_suggestions = suggest_auto_reschedule(schedule, progress)
        
        # Merge recommendations
        recommendations.extend(habit_stacking)
        recommendations.extend(reschedule_suggestions)
        
        # Calculate correlations (existing logic)
        daily_completion = {}
        subjective_data = {"energy": {}, "mood": {}, "sleep": {}}
        
        for date_str, day_data in progress.items():
            # Check metadata
            meta = day_data.get("_meta", {})
            if "energy" in meta: subjective_data["energy"][date_str] = float(meta["energy"])
            if "mood" in meta: subjective_data["mood"][date_str] = float(meta["mood"])
            if "sleep" in meta: subjective_data["sleep"][date_str] = float(meta["sleep"])
                
            # Calculate completion %
            total_items = 0
            completed_items = 0
            for key, val in day_data.items():
                if key == "_meta": continue
                total_items += 1
                if val == 2: # Completed
                    completed_items += 1
            
            if total_items > 0:
                daily_completion[date_str] = completed_items / total_items

        correlations = []
        for metric, values in subjective_data.items():
            high_days = []
            low_days = []
            
            for date_str, score in values.items():
                if date_str in daily_completion:
                    if daily_completion[date_str] >= 0.8:
                        high_days.append(score)
                    elif daily_completion[date_str] < 0.5:
                        low_days.append(score)
            
            if high_days and low_days:
                avg_high = sum(high_days) / len(high_days)
                avg_low = sum(low_days) / len(low_days)
                
                diff = avg_high - avg_low
                if abs(diff) >= 0.5: # Significant difference
                    lift = int((diff / avg_low) * 100) if avg_low > 0 else 0
                    correlations.append({
                        "metric": metric.capitalize(),
                        "correlation": "positive" if diff > 0 else "negative",
                        "lift": abs(lift),
                        "message": f"Your {metric} is {abs(lift)}% {'higher' if diff > 0 else 'lower'} on days with high adherence."
                    })
        
        if not correlations:
            correlations.append({
                "metric": "Wellness",
                "correlation": "positive",
                "lift": 0,
                "message": "Keep tracking your daily wellness to unlock insights."
            })
            
        return {
            "correlations": correlations,
            "patterns": patterns,
            "prediction": prediction,
            "recommendations": recommendations,
            "trends": trends
        }
        
    except Exception as e:
        print(f"Error in get_insights: {e}")
        import traceback
        traceback.print_exc()
        return {
            "correlations": [{
                "metric": "System",
                "correlation": "positive",
                "lift": 0,
                "message": "Insights engine is initializing..."
            }],
            "patterns": {},
            "prediction": {"predicted_rate": 0, "confidence": 0, "factors": []},
            "recommendations": [],
            "trends": {}
        }

@app.get("/insights/fasting-adjustment")
async def get_fasting_adjustment(user_id: str = Depends(get_current_user_id)):
    return {"adjustment": None}

@app.get("/knowledge/{item_name}")
async def get_knowledge(item_name: str):
    """Get detailed knowledge about a specific item."""
    data = get_knowledge_item(item_name)
    if not data:
        raise HTTPException(status_code=404, detail="Knowledge not found")
    return data

# --- Export Endpoints ---

@app.post("/export/csv")
async def export_csv(user_id: str = Depends(get_current_user_id)):
    """Export schedule as CSV"""
    schedule = load_schedule_from_file(user_id)
    progress = load_progress_from_file(user_id)
    settings = load_settings_from_file(user_id)
    
    csv_content = generate_csv_export(schedule, progress, settings)
    
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=wellness_schedule.csv"}
    )

@app.post("/export/ical")
async def export_ical(user_id: str = Depends(get_current_user_id)):
    """Export schedule as iCal"""
    schedule = load_schedule_from_file(user_id)
    settings = load_settings_from_file(user_id)
    
    ical_content = generate_ical_export(schedule, settings)
    
    return Response(
        content=ical_content,
        media_type="text/calendar",
        headers={"Content-Disposition": "attachment; filename=wellness_schedule.ics"}
    )

@app.post("/export/json")
async def export_json(user_id: str = Depends(get_current_user_id)):
    """Export full data as JSON"""
    try:
        schedule = load_schedule_from_file(user_id)
        progress = load_progress_from_file(user_id)
        settings = load_settings_from_file(user_id)
        
        json_content = generate_json_export(schedule, progress, settings)
        
        return Response(
            content=json_content,
            media_type="application/json",
            headers={"Content-Disposition": "attachment; filename=wellness_data.json"}
        )
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Export JSON error: {error_details}")
        raise HTTPException(status_code=500, detail=f"Failed to export JSON: {str(e)}")

@app.post("/export/pdf")
async def export_pdf(user_id: str = Depends(get_current_user_id)):
    """Export schedule as PDF"""
    schedule = load_schedule_from_file(user_id)
    progress = load_progress_from_file(user_id)
    settings = load_settings_from_file(user_id)
    
    try:
        pdf_buffer = generate_pdf_export(schedule, progress, settings)
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=wellness_schedule.pdf"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF export failed: {str(e)}")

@app.post("/export/markdown")
async def export_markdown(user_id: str = Depends(get_current_user_id)):
    """Export schedule as Markdown"""
    schedule = load_schedule_from_file(user_id)
    progress = load_progress_from_file(user_id)
    settings = load_settings_from_file(user_id)
    
    markdown_content = generate_markdown_export(schedule, progress, settings)
    
    return Response(
        content=markdown_content,
        media_type="text/markdown",
        headers={"Content-Disposition": "attachment; filename=wellness_schedule.md"}
    )

@app.post("/export/summary")
async def export_summary(user_id: str = Depends(get_current_user_id)):
    """Export summary statistics"""
    schedule = load_schedule_from_file(user_id)
    progress = load_progress_from_file(user_id)
    settings = load_settings_from_file(user_id)
    
    summary_content = generate_summary_export(schedule, progress, settings)
    
    return Response(
        content=summary_content,
        media_type="text/plain",
        headers={"Content-Disposition": "attachment; filename=wellness_summary.txt"}
    )

# --- Backup & Restore ---

@app.post("/backup/create")
async def create_user_backup(user_id: str = Depends(get_current_user_id)):
    """Create a backup of user data"""
    try:
        backup_path = create_backup(user_id)
        if backup_path:
            return {"status": "success", "backup_path": backup_path, "message": "Backup created successfully"}
        else:
            raise HTTPException(status_code=404, detail="User data not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Backup failed: {str(e)}")

@app.get("/backup/list")
async def list_user_backups(user_id: str = Depends(get_current_user_id)):
    """List all backups for the user"""
    try:
        backups = list_backups(user_id)
        return {"status": "success", "backups": backups}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list backups: {str(e)}")

class RestoreBackupRequest(BaseModel):
    backup_path: str

@app.post("/backup/restore")
async def restore_user_backup(request: RestoreBackupRequest, user_id: str = Depends(get_current_user_id)):
    """Restore user data from backup"""
    try:
        backup_path = request.backup_path
        # Validate backup path belongs to user
        if not backup_path.startswith(f"backups/{user_id}_"):
            raise HTTPException(status_code=403, detail="Invalid backup path")
        
        success = restore_backup(user_id, backup_path)
        if success:
            return {"status": "success", "message": "Backup restored successfully"}
        else:
            raise HTTPException(status_code=404, detail="Backup not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Restore failed: {str(e)}")

# --- Analysis ---

@app.post("/analyze-supplement")
async def analyze_supplement(data: Dict):
    name = data.get("name", "")
    dose = data.get("dose", "")
    
    # Local DB
    result = lookup_supplement(name, dose)
    if result:
        return result
        
    # Fallback: Food detection
    name_lower = name.lower()
    foods = ["banana", "apple", "orange", "bread", "rice", "meat", "chicken", "fish"]
    if any(f in name_lower for f in foods):
         return {
            "caloric": True,
            "fasting_action": "skip",
            "fasting_notes": "Food item contains calories; will break a fast."
        }

    return {
        "caloric": False,
        "fasting_action": "allow",
        "fasting_notes": "Unable to determine. Please verify."
    }

# --- Notifications ---
class NotificationCheckRequest(BaseModel):
    schedule: Dict[str, List[Dict[str, Any]]]
    progress: Dict[str, Dict[str, Any]] = {}
    notified_items: List[str] = []

@app.post("/notifications/check-upcoming")
async def check_upcoming(request: NotificationCheckRequest, user_id: str = Depends(get_current_user_id)):
    """Check for upcoming supplements and send notifications"""
    try:
        # The frontend sends the full schedule and progress
        # We can process this if needed, but for now just return success
        # The actual notification logic can be implemented here later
        return {
            "status": "checked",
            "notified_items": request.notified_items,
            "sent_count": 0
        }
    except Exception as e:
        print(f"Error in check-upcoming: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/notifications/check-missed")
async def check_missed(request: NotificationCheckRequest, user_id: str = Depends(get_current_user_id)):
    """Check for missed supplements and send notifications"""
    try:
        # The frontend sends the full schedule and progress
        # We can process this if needed, but for now just return success
        # The actual notification logic can be implemented here later
        return {
            "status": "checked",
            "count": 0
        }
    except Exception as e:
        print(f"Error in check-missed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/notifications/save-key")
async def save_notification_key(data: Dict[str, str], user_id: str = Depends(get_current_user_id)):
    """Save Pushbullet API key for the user"""
    try:
        api_key = data.get("api_key", "").strip()
        if not api_key:
            raise HTTPException(status_code=400, detail="API key is required")
        
        # Save to user-specific file
        key_file = os.path.join(get_user_dir(user_id), "pushbullet_key.txt")
        with open(key_file, "w") as f:
            f.write(api_key)
        
        return {"status": "success"}
    except Exception as e:
        print(f"Error saving notification key: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/notifications/load-key")
async def load_notification_key(user_id: str = Depends(get_current_user_id)):
    """Load Pushbullet API key for the user"""
    try:
        key_file = os.path.join(get_user_dir(user_id), "pushbullet_key.txt")
        if os.path.exists(key_file):
            with open(key_file, "r") as f:
                key = f.read().strip()
            if key:
                # Return masked key (show last 4 characters)
                masked = "*" * (len(key) - 4) + key[-4:] if len(key) > 4 else "*" * len(key)
                return {
                    "has_key": True,
                    "masked_key": masked
                }
        
        return {
            "has_key": False,
            "masked_key": ""
        }
    except Exception as e:
        print(f"Error loading notification key: {e}")
        return {
            "has_key": False,
            "masked_key": ""
        }

# --- Chat ---

class ChatRequest(BaseModel):
    message: str

@app.get("/chat/history")
async def get_chat_history(user_id: str = Depends(get_current_user_id)):
    """Get chat history for the user"""
    filepath = os.path.join(get_user_dir(user_id), "chat_history.json")
    if os.path.exists(filepath):
        try:
            with open(filepath, "r") as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading chat history: {e}")
            return []
    return []

@app.post("/chat/clear")
async def clear_chat_history(user_id: str = Depends(get_current_user_id)):
    """Clear chat history for the user"""
    filepath = os.path.join(get_user_dir(user_id), "chat_history.json")
    if os.path.exists(filepath):
        try:
            os.remove(filepath)
            return {"status": "success"}
        except Exception as e:
            print(f"Error clearing chat history: {e}")
            raise HTTPException(status_code=500, detail="Failed to clear history")
    return {"status": "success"}

@app.post("/chat")
async def chat(request: ChatRequest, user_id: str = Depends(get_current_user_id)):
    """Chat with the AI assistant about the schedule."""
    try:
        # Gather context - include FULL schedule so AI knows all available supplements
        schedule = load_schedule_from_file(user_id)
        today_str = datetime.now().date().isoformat()
        today_schedule = schedule.get(today_str, [])
        
        progress = load_progress_from_file(user_id)
        settings = load_settings_from_file(user_id)
        stats = {"current_streak": "Unknown"} # Could call get_stats logic
        
        context = {
            "schedule": schedule,  # Full schedule, not just today - so AI knows all available supplements
            "today_schedule": today_schedule,  # Today's items for convenience
            "progress": progress,
            "settings": settings.model_dump(),
            "stats": stats
        }
        
        # Load chat history to pass to AI for context
        history_file = os.path.join(get_user_dir(user_id), "chat_history.json")
        history = []
        if os.path.exists(history_file):
            try:
                with open(history_file, "r") as f:
                    history = json.load(f)
            except: pass
        
        # Pass history to chat engine so AI can see what was removed
        reply = chat_engine.chat(request.message, context, user_id, chat_history=history)
            
        # Append new exchange
        history.append({
            "id": str(datetime.now().timestamp()),
            "role": "user",
            "content": request.message
        })
        history.append({
            "id": str(datetime.now().timestamp() + 0.1),
            "role": "assistant",
            "content": reply
        })
        
        # Limit history size (e.g. last 50 messages)
        if len(history) > 50:
            history = history[-50:]
            
        with open(history_file, "w") as f:
            json.dump(history, f, indent=2)
            
        return {"reply": reply}
    except Exception as e:
        print(f"Error in /chat endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# --- Auth ---

from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

class User(BaseModel):
    email: str
    password: str
    first_name: str = ""
    last_name: str = ""
    username: Optional[str] = None

def get_password_hash(password):
    return pwd_context.hash(password)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

USERS_FILE = "users.json"

def load_users():
    if os.path.exists(USERS_FILE):
        with open(USERS_FILE, "r") as f:
            return json.load(f)
    return {}

def save_users(users):
    with open(USERS_FILE, "w") as f:
        json.dump(users, f, indent=4)

@app.post("/auth/signup")
async def signup(user: User):
    users = load_users()
    if user.email in users:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Validate username if provided
    if user.username:
        # Check if username is already taken
        from .username_engine import get_user_id_from_username, ensure_unique_username
        existing_user_id = get_user_id_from_username(user.username)
        if existing_user_id and existing_user_id != user.email:
            raise HTTPException(status_code=400, detail="Username already taken")
        
        # Validate username format (alphanumeric, lowercase, 3-20 chars)
        import re
        if not re.match(r'^[a-z0-9]{3,20}$', user.username):
            raise HTTPException(status_code=400, detail="Username must be 3-20 characters, lowercase letters and numbers only")
        
        # Ensure uniqueness
        user.username = ensure_unique_username(user.username, user.email)
    else:
        # Generate username from email if not provided
        from .username_engine import generate_username_from_email, ensure_unique_username
        user.username = generate_username_from_email(user.email)
        user.username = ensure_unique_username(user.username, user.email)
    
    hashed_pw = get_password_hash(user.password)
    users[user.email] = {
        "email": user.email,
        "hashed_password": hashed_pw,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "id": user.email # Use email as ID for simplicity in this file-based system
    }
    save_users(users)
    
    # Initialize user directory
    get_user_dir(user.email)
    
    # Save username
    from .username_engine import save_username
    save_username(user.email, user.username)
    
    return {"status": "success", "user": {"email": user.email, "name": f"{user.first_name} {user.last_name}", "username": user.username}}

@app.post("/auth/login")
async def login(data: Dict[str, str]):
    email = data.get("email")
    password = data.get("password")
    
    users = load_users()
    user = users.get(email)
    
    if not user or not verify_password(password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
        
    return {
        "status": "success", 
        "user": {
            "email": user["email"], 
            "name": f"{user.get('first_name', '')} {user.get('last_name', '')}",
            "id": user["email"]
        }
    }

@app.post("/auth/change-password")
async def change_password(data: Dict[str, str], user_id: str = Depends(get_current_user_id)):
    current_password = data.get("current_password")
    new_password = data.get("new_password")
    
    if not current_password or not new_password:
        raise HTTPException(status_code=400, detail="Missing fields")
        
    users = load_users()
    # user_id is the email in our system
    user = users.get(user_id)
    
    if not user:
        # Try finding by ID field if user_id isn't email (backward compat)
        found = False
        for email, u in users.items():
            if u.get("id") == user_id or email == user_id:
                user = u
                found = True
                break
        if not found:
            raise HTTPException(status_code=404, detail="User not found")
    
    if not verify_password(current_password, user["hashed_password"]):
        raise HTTPException(status_code=400, detail="Incorrect current password")
        
    user["hashed_password"] = get_password_hash(new_password)
    save_users(users)
    
    return {"status": "success", "message": "Password updated successfully"}

# --- Recurring Patterns Endpoints (Phase 25) ---

@app.post("/patterns/create")
async def create_pattern(pattern: RecurringPattern, user_id: str = Depends(get_current_user_id)):
    """Create a new recurring pattern"""
    patterns = load_recurring_patterns(user_id)
    
    pattern_dict = pattern.model_dump()
    pattern_dict["user_id"] = user_id
    pattern_dict["created_at"] = datetime.now().isoformat()
    pattern_dict["updated_at"] = datetime.now().isoformat()
    
    patterns.append(pattern_dict)
    save_recurring_patterns(patterns, user_id)
    
    # Apply pattern to schedule
    schedule = load_schedule_from_file(user_id)
    schedule_end = datetime.now() + timedelta(weeks=6)
    updated_schedule = apply_recurring_pattern(pattern_dict, schedule_end, schedule)
    save_schedule_to_file(updated_schedule, user_id)
    
    # Preview occurrences
    preview = preview_pattern_occurrences(pattern_dict, 10)
    
    return {
        "status": "success",
        "pattern": pattern_dict,
        "preview": preview,
        "message": f"Pattern created and {len(preview)} occurrences generated"
    }

@app.get("/patterns/list")
async def list_patterns(user_id: str = Depends(get_current_user_id)):
    """List all recurring patterns for user"""
    patterns = load_recurring_patterns(user_id)
    
    # Add preview for each pattern
    for pattern in patterns:
        if pattern.get("enabled", True):
            pattern["preview"] = preview_pattern_occurrences(pattern, 5)
    
    return {"status": "success", "patterns": patterns}

@app.get("/patterns/{pattern_id}/preview")
async def preview_pattern(pattern_id: str, count: int = 10, user_id: str = Depends(get_current_user_id)):
    """Preview occurrences for a pattern"""
    patterns = load_recurring_patterns(user_id)
    pattern = next((p for p in patterns if p.get("id") == pattern_id), None)
    
    if not pattern:
        raise HTTPException(status_code=404, detail="Pattern not found")
    
    preview = preview_pattern_occurrences(pattern, count)
    return {"status": "success", "preview": preview}

@app.put("/patterns/{pattern_id}")
async def update_pattern(pattern_id: str, pattern_update: Dict[str, Any], user_id: str = Depends(get_current_user_id)):
    """Update a recurring pattern"""
    patterns = load_recurring_patterns(user_id)
    pattern_index = next((i for i, p in enumerate(patterns) if p.get("id") == pattern_id), None)
    
    if pattern_index is None:
        raise HTTPException(status_code=404, detail="Pattern not found")
    
    # Update pattern
    patterns[pattern_index].update(pattern_update)
    patterns[pattern_index]["updated_at"] = datetime.now().isoformat()
    save_recurring_patterns(patterns, user_id)
    
    # Regenerate schedule if pattern is enabled
    if patterns[pattern_index].get("enabled", True):
        schedule = load_schedule_from_file(user_id)
        # Remove old occurrences from this pattern
        schedule = {
            date: [item for item in items if item.get("pattern_id") != pattern_id]
            for date, items in schedule.items()
        }
        schedule = {date: items for date, items in schedule.items() if items}  # Remove empty dates
        
        # Apply updated pattern
        schedule_end = datetime.now() + timedelta(weeks=6)
        updated_schedule = apply_recurring_pattern(patterns[pattern_index], schedule_end, schedule)
        save_schedule_to_file(updated_schedule, user_id)
    
    return {"status": "success", "pattern": patterns[pattern_index]}

@app.delete("/patterns/{pattern_id}")
async def delete_pattern(pattern_id: str, delete_all: bool = False, user_id: str = Depends(get_current_user_id)):
    """Delete a recurring pattern"""
    patterns = load_recurring_patterns(user_id)
    pattern = next((p for p in patterns if p.get("id") == pattern_id), None)
    
    if not pattern:
        raise HTTPException(status_code=404, detail="Pattern not found")
    
    # Remove pattern
    patterns = [p for p in patterns if p.get("id") != pattern_id]
    save_recurring_patterns(patterns, user_id)
    
    # Remove pattern occurrences from schedule
    if delete_all:
        schedule = load_schedule_from_file(user_id)
        schedule = {
            date: [item for item in items if item.get("pattern_id") != pattern_id]
            for date, items in schedule.items()
        }
        schedule = {date: items for date, items in schedule.items() if items}
        save_schedule_to_file(schedule, user_id)
    
    return {"status": "success", "message": "Pattern deleted"}

@app.post("/patterns/{pattern_id}/regenerate")
async def regenerate_pattern(pattern_id: str, user_id: str = Depends(get_current_user_id)):
    """Regenerate occurrences for a pattern"""
    patterns = load_recurring_patterns(user_id)
    pattern = next((p for p in patterns if p.get("id") == pattern_id), None)
    
    if not pattern:
        raise HTTPException(status_code=404, detail="Pattern not found")
    
    if not pattern.get("enabled", True):
        raise HTTPException(status_code=400, detail="Pattern is disabled")
    
    # Remove old occurrences
    schedule = load_schedule_from_file(user_id)
    schedule = {
        date: [item for item in items if item.get("pattern_id") != pattern_id]
        for date, items in schedule.items()
    }
    schedule = {date: items for date, items in schedule.items() if items}
    
    # Apply pattern
    schedule_end = datetime.now() + timedelta(weeks=6)
    updated_schedule = apply_recurring_pattern(pattern, schedule_end, schedule)
    save_schedule_to_file(updated_schedule, user_id)
    
    preview = preview_pattern_occurrences(pattern, 10)
    
    return {
        "status": "success",
        "preview": preview,
        "message": f"Regenerated {len(preview)} occurrences"
    }

# --- Social Features Endpoints (Phase 28) ---

@app.get("/social/users/search")
async def search_users(
    query: str,
    user_id: str = Depends(get_current_user_id)
):
    """Search for users by email, user ID, or username"""
    from .social_engine import search_users as search_users_engine
    if not query or len(query) < 2:
        return {"status": "success", "users": []}
    
    results = search_users_engine(query, user_id)
    # Limit results to 10
    results = results[:10]
    
    return {"status": "success", "users": results}

@app.get("/social/friends")
async def get_friends(user_id: str = Depends(get_current_user_id)):
    """Get user's friends list and pending requests with usernames"""
    try:
        friends_data = load_friends(user_id)
        
        # Add usernames to friends
        for friend in friends_data.get("friends", []):
            try:
                friend["username"] = get_username(friend["id"])
            except Exception as e:
                print(f"Warning: Could not get username for {friend['id']}: {e}")
                friend["username"] = friend["id"].split("@")[0] if "@" in friend["id"] else friend["id"]
        
        # Add usernames to pending requests
        for request in friends_data.get("pending_sent", []):
            try:
                request["username"] = get_username(request["id"])
            except Exception as e:
                print(f"Warning: Could not get username for {request['id']}: {e}")
                request["username"] = request["id"].split("@")[0] if "@" in request["id"] else request["id"]
        
        for request in friends_data.get("pending_received", []):
            try:
                request["username"] = get_username(request["id"])
            except Exception as e:
                print(f"Warning: Could not get username for {request['id']}: {e}")
                request["username"] = request["id"].split("@")[0] if "@" in request["id"] else request["id"]
        
        return {"status": "success", **friends_data}
    except Exception as e:
        print(f"Error in get_friends: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to load friends: {str(e)}")

class FriendRequest(BaseModel):
    target_user_id: str

class FriendAction(BaseModel):
    from_user_id: str

class BlockAction(BaseModel):
    target_user_id: str

class CreateChallengeRequest(BaseModel):
    name: str
    description: str
    challenge_type: str
    target_value: float
    duration_days: int
    is_global: bool = False
    friend_ids: Optional[List[str]] = None

@app.post("/social/friends/request")
async def send_friend_request_endpoint(
    request: FriendRequest,
    user_id: str = Depends(get_current_user_id)
):
    """Send a friend request"""
    success = send_friend_request(user_id, request.target_user_id)
    if success:
        return {"status": "success", "message": "Friend request sent"}
    else:
        raise HTTPException(status_code=400, detail="Cannot send friend request")

@app.post("/social/friends/accept")
async def accept_friend_request_endpoint(
    request: FriendAction,
    user_id: str = Depends(get_current_user_id)
):
    """Accept a friend request"""
    success = accept_friend_request(user_id, request.from_user_id)
    if success:
        return {"status": "success", "message": "Friend request accepted"}
    else:
        raise HTTPException(status_code=400, detail="Cannot accept friend request")

@app.post("/social/friends/decline")
async def decline_friend_request_endpoint(
    request: FriendAction,
    user_id: str = Depends(get_current_user_id)
):
    """Decline a friend request"""
    success = decline_friend_request(user_id, request.from_user_id)
    if success:
        return {"status": "success", "message": "Friend request declined"}
    else:
        raise HTTPException(status_code=400, detail="Cannot decline friend request")

@app.post("/social/friends/cancel")
async def cancel_friend_request_endpoint(
    request: FriendRequest,
    user_id: str = Depends(get_current_user_id)
):
    """Cancel a sent friend request"""
    success = cancel_friend_request(user_id, request.target_user_id)
    if success:
        return {"status": "success", "message": "Friend request cancelled"}
    else:
        raise HTTPException(status_code=400, detail="Cannot cancel friend request")

@app.post("/social/friends/block")
async def block_user_endpoint(
    request: BlockAction,
    user_id: str = Depends(get_current_user_id)
):
    """Block a user"""
    success = block_user(user_id, request.target_user_id)
    if success:
        return {"status": "success", "message": "User blocked"}
    else:
        raise HTTPException(status_code=400, detail="Cannot block user")

@app.post("/social/friends/unblock")
async def unblock_user_endpoint(
    request: BlockAction,
    user_id: str = Depends(get_current_user_id)
):
    """Unblock a user"""
    success = unblock_user(user_id, request.target_user_id)
    if success:
        return {"status": "success", "message": "User unblocked"}
    else:
        raise HTTPException(status_code=400, detail="Cannot unblock user")

@app.post("/social/friends/remove")
async def remove_friend_endpoint(
    request: FriendRequest,
    user_id: str = Depends(get_current_user_id)
):
    """Remove a friend (unfriend)"""
    success = remove_friend(user_id, request.target_user_id)
    if success:
        return {"status": "success", "message": "Friend removed"}
    else:
        raise HTTPException(status_code=400, detail="Cannot remove friend")

@app.get("/social/challenges")
async def get_challenges(user_id: str = Depends(get_current_user_id)):
    """Get all challenges for the user"""
    challenges = get_user_challenges(user_id)
    return {"status": "success", "challenges": challenges}

@app.post("/social/challenges/create")
async def create_challenge_endpoint(
    request: CreateChallengeRequest,
    user_id: str = Depends(get_current_user_id)
):
    """Create a new challenge"""
    challenge = create_challenge(
        user_id, request.name, request.description, request.challenge_type,
        request.target_value, request.duration_days, request.is_global, request.friend_ids
    )
    return {"status": "success", "challenge": challenge}

@app.post("/social/challenges/{challenge_id}/join")
async def join_challenge_endpoint(
    challenge_id: str,
    user_id: str = Depends(get_current_user_id)
):
    """Join a challenge"""
    success = join_challenge(user_id, challenge_id)
    if success:
        return {"status": "success", "message": "Joined challenge successfully"}
    else:
        raise HTTPException(status_code=400, detail="Cannot join challenge (already joined or challenge not found)")

@app.get("/social/challenges/{challenge_id}/leaderboard")
async def get_challenge_leaderboard(
    challenge_id: str,
    user_id: str = Depends(get_current_user_id)
):
    """Get leaderboard for a challenge"""
    challenges = load_challenges()
    
    challenge = None
    for c in challenges:
        if c["id"] == challenge_id:
            challenge = c
            break
    
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
    
    # Check if user has access (participant or global)
    if user_id not in challenge.get("participants", []) and not challenge.get("is_global", False):
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Build leaderboard
    leaderboard = []
    for participant_id in challenge.get("participants", []):
        progress = challenge.get("progress", {}).get(participant_id, 0.0)
        percentage = min((progress / challenge["target_value"]) * 100, 100) if challenge["target_value"] > 0 else 0
        
        # Get user stats for display name
        try:
            from .username_engine import get_username
            username = get_username(participant_id)
        except:
            username = participant_id.split("@")[0] if "@" in participant_id else participant_id
        
        leaderboard.append({
            "user_id": participant_id,
            "username": username,
            "progress": progress,
            "percentage": percentage,
            "is_current_user": participant_id == user_id
        })
    
    # Sort by progress (descending)
    leaderboard.sort(key=lambda x: x["progress"], reverse=True)
    
    return {"status": "success", "leaderboard": leaderboard, "challenge": challenge}

@app.get("/social/benchmarks")
async def get_benchmarks(
    metric: str = "completion_rate",
    user_id: str = Depends(get_current_user_id)
):
    """Get user's benchmark percentile"""
    benchmark = get_benchmark_percentile(user_id, metric)
    return {"status": "success", **benchmark}

@app.post("/social/share/generate-card")
async def generate_share_card(user_id: str = Depends(get_current_user_id)):
    """Generate a shareable progress card"""
    card = generate_progress_card(user_id)
    return {"status": "success", "card": card}

@app.get("/social/stats")
async def get_social_stats(user_id: str = Depends(get_current_user_id)):
    """Get user stats for social features"""
    stats = load_user_stats(user_id)
    return {"status": "success", "stats": stats}

@app.get("/username/{user_id}")
async def get_username_endpoint(user_id: str):
    """Get username for a user_id"""
    from urllib.parse import unquote
    user_id = unquote(user_id)
    username = get_username(user_id)
    return {"status": "success", "username": username, "user_id": user_id}

@app.post("/username/{user_id}")
async def set_username_endpoint(user_id: str, data: Dict[str, str], current_user_id: str = Depends(get_current_user_id)):
    """Set username for a user (must be the same user)"""
    from urllib.parse import unquote
    user_id = unquote(user_id)
    
    # Only allow users to set their own username
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Cannot set username for another user")
    
    username = data.get("username")
    if not username:
        raise HTTPException(status_code=400, detail="Username is required")
    
    # Validate format
    import re
    if not re.match(r'^[a-z0-9]{3,20}$', username):
        raise HTTPException(status_code=400, detail="Username must be 3-20 characters, lowercase letters and numbers only")
    
    # Check if username is already taken by another user
    from .username_engine import get_user_id_from_username, ensure_unique_username, save_username
    existing_user_id = get_user_id_from_username(username)
    if existing_user_id and existing_user_id != user_id:
        raise HTTPException(status_code=400, detail="Username already taken")
    
    # Ensure uniqueness
    username = ensure_unique_username(username, user_id)
    
    # Save username
    save_username(user_id, username)
    
    return {"status": "success", "username": username, "user_id": user_id}

@app.get("/username/check/{username}")
async def check_username_availability(username: str):
    """Check if a username is available"""
    import re
    # Validate format
    if not re.match(r'^[a-z0-9]{3,20}$', username):
        return {"available": False, "reason": "Username must be 3-20 characters, lowercase letters and numbers only"}
    
    # Check if taken
    from .username_engine import get_user_id_from_username
    existing_user_id = get_user_id_from_username(username)
    if existing_user_id:
        return {"available": False, "reason": "Username already taken"}
    
    return {"available": True}

@app.get("/username/has/{user_id}")
async def has_username_endpoint(user_id: str, current_user_id: str = Depends(get_current_user_id)):
    """Check if user has a custom username (not auto-generated)"""
    from urllib.parse import unquote
    user_id = unquote(user_id)
    
    # Only allow users to check their own username status
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Cannot check username status for another user")
    
    from .username_engine import get_username_filepath
    import os
    filepath = get_username_filepath(user_id)
    
    if not os.path.exists(filepath):
        return {"has_username": False}
    
    try:
        with open(filepath, "r") as f:
            data = json.load(f)
            current_username = data.get("username", "")
            # If username file exists and has a username, user has a username
            # This covers both email/password signups (username set during signup) 
            # and OAuth users who have set their username
            has_username = bool(current_username)
            return {"has_username": has_username, "username": current_username}
    except Exception as e:
        print(f"Error checking username for {user_id}: {e}")
        return {"has_username": False}

@app.get("/profile/{username}")
async def get_user_profile(
    username: str,
    user_id: str = Depends(get_current_user_id)
):
    """Get a user's public profile by username"""
    from .username_engine import get_user_id_from_username, get_username
    
    # Get user_id from username
    target_user_id = get_user_id_from_username(username)
    if not target_user_id:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if users are friends
    friends_data = load_friends(user_id)
    is_friend = any(f["id"] == target_user_id for f in friends_data.get("friends", []))
    
    # Check privacy settings
    from .privacy_engine import load_privacy_settings
    privacy = load_privacy_settings(target_user_id)
    
    # Determine if profile can be viewed based on privacy settings
    profile_visibility = privacy.get("profile_visibility", "private")
    
    # Allow viewing if:
    # 1. Profile is public (anyone can view)
    # 2. Profile is friends_only AND users are friends
    # 3. Profile is private -> deny (only user themselves can view, but that's handled elsewhere)
    
    if profile_visibility == "public":
        # Public profiles can be viewed by anyone
        pass
    elif profile_visibility == "friends_only":
        # Friends-only profiles can only be viewed by friends
        if not is_friend:
            raise HTTPException(status_code=403, detail="Profile is private")
    elif profile_visibility == "private":
        # Private profiles cannot be viewed by anyone (except the user themselves)
        raise HTTPException(status_code=403, detail="Profile is private")
    else:
        # Unknown visibility setting, default to private
        raise HTTPException(status_code=403, detail="Profile is private")
    
    # Get user stats
    stats = load_user_stats(target_user_id)
    
    # Get username for display
    display_username = get_username(target_user_id)
    
    profile_data = {
        "user_id": target_user_id,
        "username": display_username,
        "display_name": target_user_id,  # Email for now, could be enhanced
        "stats": stats,
        "is_friend": is_friend,
        "profile_visibility": profile_visibility
    }
    
    return {"status": "success", "profile": profile_data}

@app.get("/social/users/{target_user_id}/profile")
async def get_user_profile_by_id(
    target_user_id: str,
    user_id: str = Depends(get_current_user_id)
):
    """Get a user's public profile by user_id (legacy endpoint, redirects to username)"""
    from .username_engine import get_username
    from urllib.parse import unquote
    
    target_user_id = unquote(target_user_id)
    username = get_username(target_user_id)
    
    # Redirect to username-based endpoint
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url=f"/profile/{username}", status_code=301)

# --- Water Tracking Endpoints ---

@app.get("/water/settings")
async def get_water_settings(user_id: str = Depends(get_current_user_id)):
    """Get user's water tracking settings"""
    settings = load_water_settings(user_id)
    return {"status": "success", "settings": settings}

@app.post("/water/settings")
async def update_water_settings(
    settings: Dict[str, Any],
    user_id: str = Depends(get_current_user_id)
):
    """Update user's water tracking settings"""
    save_water_settings(user_id, settings)
    return {"status": "success", "message": "Water settings updated"}

@app.get("/water/intake")
async def get_water_intake_endpoint(
    date: Optional[str] = None,
    user_id: str = Depends(get_current_user_id)
):
    """Get water intake for a specific date (defaults to today)"""
    intake = load_water_intake(user_id, date)
    settings = load_water_settings(user_id)
    return {
        "status": "success",
        "intake": intake,
        "settings": settings,
        "progress_percent": min(
            (intake["total_oz"] / settings["daily_goal_oz"] * 100) if settings.get("unit") == "oz" 
            else (intake["total_ml"] / settings["daily_goal_ml"] * 100),
            100
        )
    }

@app.post("/water/intake")
async def add_water_intake(
    amount: float,
    unit: str = "oz",
    date: Optional[str] = None,
    user_id: str = Depends(get_current_user_id)
):
    """Record water intake"""
    entry = save_water_intake(user_id, amount, unit, date)
    intake = load_water_intake(user_id, date)
    settings = load_water_settings(user_id)
    progress_percent = min(
        (intake["total_oz"] / settings["daily_goal_oz"] * 100) if settings.get("unit") == "oz"
        else (intake["total_ml"] / settings["daily_goal_ml"] * 100),
        100
    )
    goal_met = intake["goal_met"]
    
    return {
        "status": "success",
        "entry": entry,
        "intake": intake,
        "progress_percent": round(progress_percent, 1),
        "goal_met": goal_met,
        "message": "🎉 Daily goal achieved!" if goal_met and not intake.get("_goal_celebrated", False) else "Water intake recorded!"
    }

@app.get("/water/stats")
async def get_water_stats_endpoint(
    days: int = 30,
    user_id: str = Depends(get_current_user_id)
):
    """Get water intake statistics"""
    stats = get_water_stats(user_id, days)
    return {"status": "success", "stats": stats}

@app.get("/water/next-reminder")
async def get_next_water_reminder(user_id: str = Depends(get_current_user_id)):
    """Get the next water reminder time"""
    next_time = get_next_water_reminder_time(user_id)
    return {"status": "success", "next_reminder": next_time}

# --- Privacy Settings Endpoints ---

@app.get("/privacy/settings")
async def get_privacy_settings_endpoint(user_id: str = Depends(get_current_user_id)):
    """Get user's privacy settings"""
    settings = load_privacy_settings(user_id)
    return {"status": "success", "settings": settings}

@app.post("/privacy/settings")
async def update_privacy_settings_endpoint(
    settings: Dict[str, Any],
    user_id: str = Depends(get_current_user_id)
):
    """Update user's privacy settings"""
    print(f"DEBUG: Saving privacy settings for {user_id}: {settings}")
    success = save_privacy_settings(user_id, settings)
    if success:
        # Verify it was saved correctly
        saved = load_privacy_settings(user_id)
        print(f"DEBUG: Privacy settings saved. Reloaded: {saved}")
        return {"status": "success", "message": "Privacy settings updated"}
    else:
        raise HTTPException(status_code=500, detail="Failed to save privacy settings")

@app.delete("/account/delete")
async def delete_account_endpoint(user_id: str = Depends(get_current_user_id)):
    """Delete user account and all associated data"""
    import shutil
    from .social_engine import load_friends, save_friends, load_challenges, save_challenges
    from .username_engine import load_username_mapping, save_username_mapping, get_username
    
    try:
        # 1. Remove user from all friends' friend lists
        user_dir = get_user_dir(user_id)
        if os.path.exists(user_dir):
            friends_data = load_friends(user_id)
            all_friends = friends_data.get("friends", [])
            pending_sent = friends_data.get("pending_sent", [])
            pending_received = friends_data.get("pending_received", [])
            
            # Get all user IDs that have this user in their friends list
            affected_users = set()
            for friend in all_friends:
                affected_users.add(friend.get("user_id"))
            for pending in pending_sent:
                affected_users.add(pending.get("user_id"))
            for pending in pending_received:
                affected_users.add(pending.get("user_id"))
            
            # Remove this user from each affected user's friends list
            for other_user_id in affected_users:
                try:
                    other_friends = load_friends(other_user_id)
                    # Remove from friends
                    other_friends["friends"] = [
                        f for f in other_friends.get("friends", [])
                        if f.get("user_id") != user_id
                    ]
                    # Remove from pending_sent
                    other_friends["pending_sent"] = [
                        f for f in other_friends.get("pending_sent", [])
                        if f.get("user_id") != user_id
                    ]
                    # Remove from pending_received
                    other_friends["pending_received"] = [
                        f for f in other_friends.get("pending_received", [])
                        if f.get("user_id") != user_id
                    ]
                    # Remove from blocked (if they blocked this user)
                    other_friends["blocked"] = [
                        f for f in other_friends.get("blocked", [])
                        if f.get("user_id") != user_id
                    ]
                    save_friends(other_user_id, other_friends)
                except Exception as e:
                    print(f"Error removing user from {other_user_id}'s friends list: {e}")
            
            # 2. Remove user from challenges
            challenges = load_challenges()
            updated_challenges = []
            for challenge in challenges:
                # Remove from participants
                if "participants" in challenge:
                    challenge["participants"] = [
                        p for p in challenge["participants"]
                        if p != user_id
                    ]
                # Remove from invited_friends if present
                if "invited_friends" in challenge:
                    challenge["invited_friends"] = [
                        f for f in challenge["invited_friends"]
                        if f != user_id
                    ]
                # Keep challenge if it still has participants or is global
                if challenge.get("participants") or challenge.get("is_global", False):
                    updated_challenges.append(challenge)
            save_challenges(updated_challenges)
            
            # 3. Remove username from global mapping
            try:
                from .username_engine import get_username
                username = get_username(user_id)
                if username:
                    mapping = load_username_mapping()
                    if user_id in mapping:
                        del mapping[user_id]
                    # Also remove by username
                    mapping = {k: v for k, v in mapping.items() if v != username}
                    save_username_mapping(mapping)
            except Exception as e:
                print(f"Error removing username mapping: {e}")
            
            # 4. Delete entire user data directory
            if os.path.exists(user_dir):
                shutil.rmtree(user_dir)
                print(f"Deleted user data directory: {user_dir}")
        
        return {
            "status": "success",
            "message": "Account and all associated data deleted successfully"
        }
    except Exception as e:
        print(f"Error deleting account for {user_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete account: {str(e)}"
        )

# --- Analytics Endpoints (Phase 27) ---

@app.get("/analytics/overview")
async def get_analytics_overview(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user_id: str = Depends(get_current_user_id)
):
    """Get comprehensive analytics overview"""
    progress = load_progress_from_file(user_id)
    schedule = load_schedule_from_file(user_id)
    
    date_range = None
    if start_date and end_date:
        date_range = (start_date, end_date)
    
    analytics = calculate_comprehensive_analytics(user_id, progress, schedule, date_range)
    return analytics

@app.get("/analytics/trends")
async def get_analytics_trends(
    days: int = 30,
    user_id: str = Depends(get_current_user_id)
):
    """Get trend data for charts"""
    progress = load_progress_from_file(user_id)
    schedule = load_schedule_from_file(user_id)
    
    trend_data = generate_trend_data(progress, schedule, days)
    return {"trend_data": trend_data}

@app.get("/analytics/time-analysis")
async def get_time_analytics(user_id: str = Depends(get_current_user_id)):
    """Get time-based analytics (hour of day, day of week)"""
    progress = load_progress_from_file(user_id)
    schedule = load_schedule_from_file(user_id)
    
    time_analytics = calculate_time_analytics(progress, schedule)
    return time_analytics

# Goal Tracking (Phase 27)
class Goal(BaseModel):
    id: Optional[str] = None
    name: str
    type: str  # completion_rate, streak, item, wellness
    target_value: float
    start_date: str
    end_date: Optional[str] = None
    achieved: bool = False

@app.get("/analytics/goals")
async def get_goals(user_id: str = Depends(get_current_user_id)):
    """Get user goals"""
    goals_file = os.path.join(get_user_dir(user_id), "goals.json")
    if os.path.exists(goals_file):
        try:
            with open(goals_file, "r") as f:
                goals_data = json.load(f)
                # Calculate current progress for each goal
                progress = load_progress_from_file(user_id)
                schedule = load_schedule_from_file(user_id)
                
                for goal in goals_data:
                    goal_id = goal.get("id", "")
                    goal_type = goal.get("type", "")
                    target = goal.get("target_value", 0)
                    
                    # Calculate current value based on goal type
                    if goal_type == "completion_rate":
                        # Calculate overall completion rate
                        total_items = sum(len(items) for items in schedule.values())
                        completed_items = 0
                        for date_str, day_schedule in schedule.items():
                            day_progress = progress.get(date_str, {})
                            for item in day_schedule:
                                item_id = item.get("id", "")
                                if item_id in day_progress and day_progress[item_id] == 2:
                                    completed_items += 1
                        current_value = (completed_items / total_items * 100) if total_items > 0 else 0
                    elif goal_type == "streak":
                        # Calculate current streak
                        today = datetime.now().date()
                        current_streak = 0
                        check_date = today - timedelta(days=1)
                        while True:
                            date_str = check_date.isoformat()
                            if date_str in progress:
                                current_streak += 1
                                check_date -= timedelta(days=1)
                            else:
                                break
                        if today.isoformat() in progress:
                            current_streak += 1
                        current_value = current_streak
                    else:
                        current_value = 0
                    
                    goal["current_value"] = current_value
                    goal["achieved"] = current_value >= target
                
                return {"goals": goals_data}
        except Exception as e:
            print(f"Error loading goals: {e}")
    return {"goals": []}

@app.post("/analytics/goals")
async def create_goal(goal: Goal, user_id: str = Depends(get_current_user_id)):
    """Create a new goal"""
    goals_file = os.path.join(get_user_dir(user_id), "goals.json")
    goals = []
    
    if os.path.exists(goals_file):
        try:
            with open(goals_file, "r") as f:
                goals = json.load(f)
        except:
            pass
    
    goal_dict = goal.model_dump()
    if not goal_dict.get("id"):
        goal_dict["id"] = str(uuid.uuid4())
    goal_dict["created_at"] = datetime.now().isoformat()
    goal_dict["current_value"] = 0
    goal_dict["achieved"] = False
    
    goals.append(goal_dict)
    
    with open(goals_file, "w") as f:
        json.dump(goals, f, indent=2)
    
    return {"status": "success", "goal": goal_dict}

@app.delete("/analytics/goals/{goal_id}")
async def delete_goal(goal_id: str, user_id: str = Depends(get_current_user_id)):
    """Delete a goal"""
    goals_file = os.path.join(get_user_dir(user_id), "goals.json")
    if os.path.exists(goals_file):
        try:
            with open(goals_file, "r") as f:
                goals = json.load(f)
            
            goals = [g for g in goals if g.get("id") != goal_id]
            
            with open(goals_file, "w") as f:
                json.dump(goals, f, indent=2)
            
            return {"status": "success"}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to delete goal: {str(e)}")
    
    raise HTTPException(status_code=404, detail="Goal not found")


# --- Phase 26: Supplement Interactions & Safety System ---

@app.post("/interactions/check")
async def check_interactions_endpoint(request: Dict[str, Any], user_id: str = Depends(get_current_user_id)):
    """Check for interactions between supplements or in schedule"""
    try:
        if "supplement1" in request and "supplement2" in request:
            # Check specific pair
            interaction = check_interaction(request["supplement1"], request["supplement2"])
            return {"interaction": interaction}
        elif "date" in request:
            # Check schedule for specific date
            schedule = load_schedule_from_file(user_id)
            interactions = check_schedule_interactions(schedule, request.get("date"))
            return {"interactions": interactions, "count": len(interactions)}
        else:
            # Check entire schedule
            schedule = load_schedule_from_file(user_id)
            interactions = check_schedule_interactions(schedule)
            return {"interactions": interactions, "count": len(interactions)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to check interactions: {str(e)}")


@app.get("/interactions/{supp1}/{supp2}")
async def get_interaction_details_endpoint(supp1: str, supp2: str):
    """Get detailed interaction information between two supplements"""
    try:
        interaction = get_interaction_details(supp1, supp2)
        if not interaction:
            return {"interaction": None, "message": "No interaction found"}
        return {"interaction": interaction}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get interaction details: {str(e)}")


@app.post("/interactions/suggest-timing")
async def suggest_timing_endpoint(request: Dict[str, Any]):
    """Suggest optimal timing adjustment for interacting supplements"""
    try:
        supplement1 = request.get("supplement1")
        supplement2 = request.get("supplement2")
        time1 = request.get("time1")
        time2 = request.get("time2")
        
        if not all([supplement1, supplement2, time1, time2]):
            raise HTTPException(status_code=400, detail="Missing required fields: supplement1, supplement2, time1, time2")
        
        suggestion = suggest_timing_adjustment(supplement1, supplement2, time1, time2)
        return suggestion
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to suggest timing: {str(e)}")


@app.get("/interactions/supplement/{supplement}")
async def get_supplement_interactions(supplement: str):
    """Get all known interactions for a specific supplement"""
    try:
        interactions = get_all_interactions_for_supplement(supplement)
        return {"supplement": supplement, "interactions": interactions, "count": len(interactions)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get supplement interactions: {str(e)}")


@app.get("/interactions/schedule")
async def get_schedule_interactions(user_id: str = Depends(get_current_user_id), date: Optional[str] = None):
    """Get all interactions in user's schedule"""
    try:
        schedule = load_schedule_from_file(user_id)
        interactions = check_schedule_interactions(schedule, date)
        
        # Group by severity
        high_severity = [i for i in interactions if i.get("severity") == "high"]
        moderate_severity = [i for i in interactions if i.get("severity") == "moderate"]
        low_severity = [i for i in interactions if i.get("severity") == "low"]
        
        return {
            "interactions": interactions,
            "count": len(interactions),
            "by_severity": {
                "high": high_severity,
                "moderate": moderate_severity,
                "low": low_severity
            },
            "has_conflicts": len([i for i in interactions if not i.get("spacing_adequate", True)]) > 0
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to check schedule interactions: {str(e)}")

# --- Phase 29: Advanced Notification System & Smart Reminders ---

@app.get("/notifications/settings")
async def get_notification_settings(user_id: str = Depends(get_current_user_id)):
    """Get user notification settings"""
    try:
        settings = load_notification_settings(user_id)
        return settings
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load notification settings: {str(e)}")


@app.post("/notifications/settings")
async def update_notification_settings(request: Dict[str, Any], user_id: str = Depends(get_current_user_id)):
    """Update user notification settings"""
    try:
        current_settings = load_notification_settings(user_id)
        current_settings.update(request)
        save_notification_settings(user_id, current_settings)
        return {"status": "success", "settings": current_settings}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update notification settings: {str(e)}")


@app.get("/notifications/upcoming")
async def get_upcoming_notifications_endpoint(user_id: str = Depends(get_current_user_id), lookahead_minutes: int = 60):
    """Get upcoming notifications that should be sent"""
    try:
        notifications = get_upcoming_notifications(user_id, lookahead_minutes)
        
        # Also check for daily summary
        summary = get_daily_summary_notification(user_id)
        if summary:
            notifications.append(summary)
        
        # Send push notifications if any are found
        if notifications:
            from .notification_service import send_notifications_to_user
            send_notifications_to_user(user_id, notifications)
        
        return {"notifications": notifications, "count": len(notifications)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get upcoming notifications: {str(e)}")


@app.post("/notifications/test")
async def send_test_notification_endpoint(user_id: str = Depends(get_current_user_id)):
    """Send a test notification to verify push notifications are working"""
    try:
        from .notification_service import send_notifications_to_user, load_notification_settings
        
        settings = load_notification_settings(user_id)
        subscriptions = settings.get("push_subscriptions", [])
        
        if not subscriptions:
            raise HTTPException(
                status_code=400,
                detail="No push subscriptions found. Please enable push notifications first."
            )
        
        # Create a test notification
        test_notification = {
            "title": "Test Notification",
            "body": "This is a test notification to verify your push notifications are working! 🎉",
            "data": {
                "type": "test",
                "timestamp": datetime.now().isoformat()
            }
        }
        
        # Send the test notification
        send_notifications_to_user(user_id, [test_notification])
        
        return {
            "status": "success",
            "message": "Test notification sent successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to send test notification: {str(e)}"
        )

@app.post("/notifications/mark-sent")
async def mark_notification_sent_endpoint(request: Dict[str, Any], user_id: str = Depends(get_current_user_id)):
    """Mark a notification as sent"""
    try:
        notification_type = request.get("type")
        item_id = request.get("item_id")
        date = request.get("date", datetime.now().date().isoformat())
        
        mark_notification_sent(user_id, notification_type, item_id, date)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to mark notification as sent: {str(e)}")


@app.post("/notifications/push/subscribe")
async def subscribe_push_notifications(request: Dict[str, Any], user_id: str = Depends(get_current_user_id)):
    """Subscribe to Web Push notifications"""
    try:
        subscription = request.get("subscription")
        if not subscription:
            raise HTTPException(status_code=400, detail="Subscription data required")
        
        add_push_subscription(user_id, subscription)
        return {"status": "success", "message": "Push subscription added"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to subscribe: {str(e)}")


@app.post("/notifications/push/unsubscribe")
async def unsubscribe_push_notifications(request: Dict[str, Any], user_id: str = Depends(get_current_user_id)):
    """Unsubscribe from Web Push notifications"""
    try:
        endpoint = request.get("endpoint")
        if not endpoint:
            raise HTTPException(status_code=400, detail="Endpoint required")
        
        remove_push_subscription(user_id, endpoint)
        return {"status": "success", "message": "Push subscription removed"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to unsubscribe: {str(e)}")

# --- Health Metrics Endpoints (Phase 30) ---

@app.get("/health-metrics")
async def get_health_metrics(
    metric_type: Optional[str] = None,
    days: int = 30,
    user_id: str = Depends(get_current_user_id)
):
    """Get health metrics for the user"""
    from .health_metrics_engine import load_health_metrics
    metrics = load_health_metrics(user_id, metric_type=metric_type, days=days)
    return {"metrics": metrics}

@app.post("/health-metrics")
async def create_health_metric(
    metric: Dict[str, Any],
    user_id: str = Depends(get_current_user_id)
):
    """Create a new health metric entry"""
    from .health_metrics_engine import HealthMetric, save_health_metric
    import uuid
    
    # Generate ID if not provided
    if "id" not in metric:
        metric["id"] = str(uuid.uuid4())
    
    # Set timestamp if not provided
    if "timestamp" not in metric:
        metric["timestamp"] = datetime.now().isoformat()
    
    try:
        health_metric = HealthMetric(**metric)
        success = save_health_metric(user_id, health_metric)
        if success:
            return {"status": "success", "metric": health_metric.model_dump()}
        else:
            raise HTTPException(status_code=500, detail="Failed to save health metric")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid metric data: {str(e)}")

@app.delete("/health-metrics/{metric_id}")
async def delete_health_metric_endpoint(
    metric_id: str,
    user_id: str = Depends(get_current_user_id)
):
    """Delete a health metric entry"""
    from .health_metrics_engine import delete_health_metric
    
    success = delete_health_metric(user_id, metric_id)
    if success:
        return {"status": "success"}
    else:
        raise HTTPException(status_code=404, detail="Metric not found")

@app.get("/health-metrics/stats/{metric_type}")
async def get_health_metrics_stats(
    metric_type: str,
    days: int = 30,
    user_id: str = Depends(get_current_user_id)
):
    """Get statistics for a specific metric type"""
    from .health_metrics_engine import get_health_metrics_stats
    
    stats = get_health_metrics_stats(user_id, metric_type, days)
    return stats

@app.get("/health-metrics/settings")
async def get_health_metrics_settings(user_id: str = Depends(get_current_user_id)):
    """Get user's health metrics settings"""
    from .health_metrics_engine import load_health_metrics_settings
    
    settings = load_health_metrics_settings(user_id)
    return settings.model_dump()

@app.post("/health-metrics/settings")
async def update_health_metrics_settings(
    settings_data: Dict[str, Any],
    user_id: str = Depends(get_current_user_id)
):
    """Update user's health metrics settings"""
    from .health_metrics_engine import HealthMetricSettings, save_health_metrics_settings
    
    try:
        settings = HealthMetricSettings(**settings_data)
        save_health_metrics_settings(user_id, settings)
        return {"status": "success", "settings": settings.model_dump()}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid settings: {str(e)}")

# --- Habits Endpoints (Phase 30) ---

@app.get("/habits")
async def get_habits(user_id: str = Depends(get_current_user_id)):
    """Get all habits for the user"""
    from .habits_engine import load_habits, get_today_habits_status
    
    habits = load_habits(user_id)
    today_status = get_today_habits_status(user_id)
    
    # Add today's completion status to each habit
    for habit in habits:
        habit["today_completed"] = today_status.get(habit.get("id"), False)
    
    return {"habits": habits}

@app.post("/habits")
async def create_habit(
    habit_data: Dict[str, Any],
    user_id: str = Depends(get_current_user_id)
):
    """Create a new habit"""
    from .habits_engine import Habit, load_habits, save_habits
    import uuid
    
    # Generate ID and timestamp if not provided
    if "id" not in habit_data:
        habit_data["id"] = str(uuid.uuid4())
    if "created_at" not in habit_data:
        habit_data["created_at"] = datetime.now().isoformat()
    
    try:
        habit = Habit(**habit_data)
        habits = load_habits(user_id)
        habits.append(habit.model_dump())
        save_habits(user_id, habits)
        return {"status": "success", "habit": habit.model_dump()}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid habit data: {str(e)}")

@app.put("/habits/{habit_id}")
async def update_habit(
    habit_id: str,
    habit_data: Dict[str, Any],
    user_id: str = Depends(get_current_user_id)
):
    """Update an existing habit"""
    from .habits_engine import Habit, load_habits, save_habits
    
    habits = load_habits(user_id)
    habit_index = next((i for i, h in enumerate(habits) if h.get("id") == habit_id), None)
    
    if habit_index is None:
        raise HTTPException(status_code=404, detail="Habit not found")
    
    # Preserve ID and created_at
    habit_data["id"] = habit_id
    if "created_at" not in habit_data:
        habit_data["created_at"] = habits[habit_index].get("created_at", datetime.now().isoformat())
    
    try:
        habit = Habit(**habit_data)
        habits[habit_index] = habit.model_dump()
        save_habits(user_id, habits)
        return {"status": "success", "habit": habit.model_dump()}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid habit data: {str(e)}")

@app.delete("/habits/{habit_id}")
async def delete_habit(
    habit_id: str,
    user_id: str = Depends(get_current_user_id)
):
    """Delete a habit"""
    from .habits_engine import load_habits, save_habits
    
    habits = load_habits(user_id)
    habits = [h for h in habits if h.get("id") != habit_id]
    save_habits(user_id, habits)
    return {"status": "success"}

@app.post("/habits/{habit_id}/entries")
async def create_habit_entry(
    habit_id: str,
    entry_data: Dict[str, Any],
    user_id: str = Depends(get_current_user_id)
):
    """Create or update a habit entry for a specific date"""
    from .habits_engine import HabitEntry, save_habit_entry
    import uuid
    
    # Set habit_id and generate ID if not provided
    entry_data["habit_id"] = habit_id
    if "id" not in entry_data:
        entry_data["id"] = str(uuid.uuid4())
    
    # Set date to today if not provided
    if "date" not in entry_data:
        entry_data["date"] = date.today().isoformat()
    
    # Set timestamp if not provided
    if "timestamp" not in entry_data:
        entry_data["timestamp"] = datetime.now().isoformat()
    
    try:
        entry = HabitEntry(**entry_data)
        success = save_habit_entry(user_id, entry)
        if success:
            return {"status": "success", "entry": entry.model_dump()}
        else:
            raise HTTPException(status_code=500, detail="Failed to save habit entry")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid entry data: {str(e)}")

@app.get("/habits/{habit_id}/stats")
async def get_habit_stats(
    habit_id: str,
    days: int = 90,
    user_id: str = Depends(get_current_user_id)
):
    """Get statistics for a habit"""
    from .habits_engine import calculate_habit_stats
    
    stats = calculate_habit_stats(user_id, habit_id, days)
    return stats

@app.get("/habits/{habit_id}/entries")
async def get_habit_entries(
    habit_id: str,
    days: int = 90,
    user_id: str = Depends(get_current_user_id)
):
    """Get entries for a specific habit"""
    from .habits_engine import load_habit_entries
    
    entries = load_habit_entries(user_id, habit_id=habit_id, days=days)
    return {"entries": entries}

# --- Sleep Tracking Endpoints (Phase 30) ---

@app.get("/sleep/entries")
async def get_sleep_entries(
    days: int = 30,
    user_id: str = Depends(get_current_user_id)
):
    """Get sleep entries for the user"""
    from .sleep_engine import load_sleep_entries
    
    entries = load_sleep_entries(user_id, days=days)
    return {"entries": entries}

@app.post("/sleep/entries")
async def create_sleep_entry(
    entry_data: Dict[str, Any],
    user_id: str = Depends(get_current_user_id)
):
    """Create or update a sleep entry"""
    from .sleep_engine import SleepEntry, save_sleep_entry, calculate_sleep_duration
    import uuid
    
    # Generate ID if not provided
    if "id" not in entry_data:
        entry_data["id"] = str(uuid.uuid4())
    
    # Set date to today if not provided (represents last night)
    if "date" not in entry_data:
        entry_data["date"] = (date.today() - timedelta(days=1)).isoformat()  # Last night
    
    # Calculate sleep duration if not provided
    if "sleep_duration_hours" not in entry_data and "bedtime" in entry_data and "wake_time" in entry_data:
        entry_data["sleep_duration_hours"] = calculate_sleep_duration(
            entry_data["bedtime"], 
            entry_data["wake_time"]
        )
    
    # Set timestamp if not provided
    if "timestamp" not in entry_data:
        entry_data["timestamp"] = datetime.now().isoformat()
    
    try:
        sleep_entry = SleepEntry(**entry_data)
        success = save_sleep_entry(user_id, sleep_entry)
        if success:
            return {"status": "success", "entry": sleep_entry.model_dump()}
        else:
            raise HTTPException(status_code=500, detail="Failed to save sleep entry")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid sleep entry data: {str(e)}")

@app.delete("/sleep/entries/{entry_id}")
async def delete_sleep_entry_endpoint(
    entry_id: str,
    user_id: str = Depends(get_current_user_id)
):
    """Delete a sleep entry"""
    from .sleep_engine import delete_sleep_entry
    
    success = delete_sleep_entry(user_id, entry_id)
    if success:
        return {"status": "success"}
    else:
        raise HTTPException(status_code=404, detail="Sleep entry not found")

@app.get("/sleep/stats")
async def get_sleep_stats(
    days: int = 30,
    user_id: str = Depends(get_current_user_id)
):
    """Get sleep statistics"""
    from .sleep_engine import get_sleep_stats
    
    stats = get_sleep_stats(user_id, days)
    return stats

@app.get("/sleep/settings")
async def get_sleep_settings(user_id: str = Depends(get_current_user_id)):
    """Get user's sleep settings"""
    from .sleep_engine import load_sleep_settings
    
    settings = load_sleep_settings(user_id)
    return settings.model_dump()

@app.post("/sleep/settings")
async def update_sleep_settings(
    settings_data: Dict[str, Any],
    user_id: str = Depends(get_current_user_id)
):
    """Update user's sleep settings"""
    from .sleep_engine import SleepSettings, save_sleep_settings
    
    try:
        settings = SleepSettings(**settings_data)
        save_sleep_settings(user_id, settings)
        return {"status": "success", "settings": settings.model_dump()}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid settings: {str(e)}")

# --- Nutrition Insights & Recommendations Endpoints ---

@app.get("/nutrition/insights/patterns")
async def get_nutrition_patterns(
    days: int = 30,
    user_id: str = Depends(get_current_user_id)
):
    """Get nutrition pattern analysis"""
    from .nutrition_insights_engine import analyze_nutrition_patterns
    
    patterns = analyze_nutrition_patterns(user_id, days=days)
    return patterns

@app.get("/nutrition/insights/recommendations")
async def get_nutrition_recommendations(
    days: int = 30,
    user_id: str = Depends(get_current_user_id)
):
    """Get personalized nutrition recommendations"""
    from .nutrition_insights_engine import generate_recommendations
    
    recommendations = generate_recommendations(user_id, days=days)
    return {"recommendations": recommendations}

@app.get("/nutrition/insights/weekly-report")
async def get_weekly_report(
    week_start: Optional[str] = None,
    user_id: str = Depends(get_current_user_id)
):
    """Get weekly nutrition report"""
    from .nutrition_insights_engine import generate_weekly_report
    
    report = generate_weekly_report(user_id, week_start=week_start)
    return report

@app.get("/nutrition/insights/patterns-detected")
async def get_detected_patterns(
    days: int = 60,
    user_id: str = Depends(get_current_user_id)
):
    """Get detected nutrition patterns"""
    from .nutrition_insights_engine import detect_nutrition_patterns
    
    patterns = detect_nutrition_patterns(user_id, days=days)
    return {"patterns": patterns}

@app.get("/nutrition/insights/summary")
async def get_insights_summary(
    days: int = 30,
    user_id: str = Depends(get_current_user_id)
):
    """Get comprehensive insights summary"""
    from .nutrition_insights_engine import (
        analyze_nutrition_patterns,
        generate_recommendations,
        detect_nutrition_patterns
    )
    
    patterns = analyze_nutrition_patterns(user_id, days=days)
    recommendations = generate_recommendations(user_id, days=days)
    detected_patterns = detect_nutrition_patterns(user_id, days=days)
    
    return {
        "patterns": patterns,
        "recommendations": recommendations,
        "detected_patterns": detected_patterns,
        "generated_at": datetime.now().isoformat()
    }

# --- Food Photo Recognition Endpoints ---

@app.post("/nutrition/recognize-photo")
async def recognize_food_photo(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id)
):
    """Recognize food from uploaded photo"""
    from .food_photo_recognition_engine import recognize_food_from_image, enhance_with_nutrition_api
    
    try:
        # Read image data
        image_data = await file.read()
        
        if len(image_data) == 0:
            raise HTTPException(status_code=400, detail="Empty image file")
        
        # Check file size (max 10MB)
        if len(image_data) > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Image file too large (max 10MB)")
        
        # Recognize food
        result = recognize_food_from_image(image_data, user_id)
        
        # Enhance with nutrition data if foods identified
        if result.get("foods"):
            for food in result["foods"]:
                if food.get("source") != "database":
                    # Try to enhance with database lookup
                    enhanced = enhance_with_nutrition_api(food.get("name", ""))
                    if enhanced:
                        food["nutrition"] = enhanced.get("nutrition", food.get("nutrition", {}))
                        food["brand"] = enhanced.get("brand")
                        food["source"] = "database_enhanced"
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Photo recognition error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to recognize food: {str(e)}")

@app.post("/nutrition/estimate-portion")
async def estimate_portion_size(
    file: UploadFile = File(...),
    food_name: str = None,
    user_id: str = Depends(get_current_user_id)
):
    """Estimate portion size from photo"""
    from .food_photo_recognition_engine import estimate_portion_size
    
    if not food_name:
        raise HTTPException(status_code=400, detail="Food name is required")
    
    try:
        image_data = await file.read()
        result = estimate_portion_size(food_name, image_data)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to estimate portion: {str(e)}")

# --- Data Export & Import Endpoints ---

@app.get("/data/export/all")
async def export_all_data(
    user_id: str = Depends(get_current_user_id)
):
    """Export all user data (GDPR-compliant full export)"""
    from .data_export_engine import export_all_user_data
    
    data = export_all_user_data(user_id)
    return data

@app.get("/data/export/nutrition/csv")
async def export_nutrition_csv(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user_id: str = Depends(get_current_user_id)
):
    """Export nutrition entries as CSV"""
    from .data_export_engine import export_nutrition_csv
    from fastapi.responses import Response
    
    csv_content = export_nutrition_csv(user_id, start_date, end_date)
    
    if not csv_content:
        raise HTTPException(status_code=404, detail="No nutrition data to export")
    
    filename = f"nutrition_export_{datetime.now().strftime('%Y%m%d')}.csv"
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@app.get("/data/export/weight/csv")
async def export_weight_csv(
    user_id: str = Depends(get_current_user_id)
):
    """Export weight entries as CSV"""
    from .data_export_engine import export_weight_csv
    from fastapi.responses import Response
    
    csv_content = export_weight_csv(user_id)
    
    if not csv_content:
        raise HTTPException(status_code=404, detail="No weight data to export")
    
    filename = f"weight_export_{datetime.now().strftime('%Y%m%d')}.csv"
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@app.get("/data/export/recipes/json")
async def export_recipes_json(
    user_id: str = Depends(get_current_user_id)
):
    """Export recipes as JSON"""
    from .data_export_engine import export_recipes_json
    from fastapi.responses import Response
    
    recipes = export_recipes_json(user_id)
    
    filename = f"recipes_export_{datetime.now().strftime('%Y%m%d')}.json"
    return Response(
        content=json.dumps(recipes, indent=2),
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@app.get("/data/export/meal-plan/json")
async def export_meal_plan_json(
    week_start: Optional[str] = None,
    user_id: str = Depends(get_current_user_id)
):
    """Export meal plan as JSON"""
    from .data_export_engine import export_meal_plan_json
    from fastapi.responses import Response
    
    meal_plan = export_meal_plan_json(user_id, week_start)
    
    if not meal_plan:
        raise HTTPException(status_code=404, detail="No meal plan found")
    
    filename = f"meal_plan_export_{datetime.now().strftime('%Y%m%d')}.json"
    return Response(
        content=json.dumps(meal_plan, indent=2),
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@app.post("/data/import/myfitnesspal")
async def import_myfitnesspal(
    file_data: Dict[str, Any],
    user_id: str = Depends(get_current_user_id)
):
    """Import nutrition data from MyFitnessPal CSV"""
    from .data_export_engine import import_myfitnesspal_csv
    
    csv_content = file_data.get("content", "")
    if not csv_content:
        raise HTTPException(status_code=400, detail="CSV content is required")
    
    results = import_myfitnesspal_csv(csv_content, user_id)
    return results

@app.post("/data/import/cronometer")
async def import_cronometer(
    file_data: Dict[str, Any],
    user_id: str = Depends(get_current_user_id)
):
    """Import nutrition data from Cronometer CSV"""
    from .data_export_engine import import_cronometer_csv
    
    csv_content = file_data.get("content", "")
    if not csv_content:
        raise HTTPException(status_code=400, detail="CSV content is required")
    
    results = import_cronometer_csv(csv_content, user_id)
    return results

@app.post("/data/import/generic")
async def import_generic(
    json_data: Dict[str, Any],
    user_id: str = Depends(get_current_user_id)
):
    """Import data from generic JSON format"""
    from .data_export_engine import import_generic_json
    
    results = import_generic_json(json_data, user_id)
    return results

@app.get("/data/backup/create")
async def create_backup_endpoint(
    user_id: str = Depends(get_current_user_id)
):
    """Create a complete backup of user data"""
    from .data_export_engine import create_backup
    
    backup = create_backup(user_id)
    return backup

@app.post("/data/backup/restore")
async def restore_backup_endpoint(
    backup_data: Dict[str, Any],
    user_id: str = Depends(get_current_user_id)
):
    """Restore user data from backup"""
    from .data_export_engine import restore_backup
    
    if not backup_data:
        raise HTTPException(status_code=400, detail="Backup data is required")
    
    results = restore_backup(user_id, backup_data)
    return results

# --- Nutrition Tracking Endpoints (Phase 32) ---

@app.get("/nutrition/entries")
async def get_nutrition_entries(
    date: Optional[str] = None,
    days: int = 30,
    user_id: str = Depends(get_current_user_id)
):
    """Get nutrition entries for the user"""
    from .nutrition_engine import load_nutrition_entries
    
    entries = load_nutrition_entries(user_id, date_str=date, days=days)
    return {"entries": entries}

@app.post("/nutrition/entries")
async def create_nutrition_entry(
    entry_data: Dict[str, Any],
    user_id: str = Depends(get_current_user_id)
):
    """Create a nutrition entry"""
    from .nutrition_engine import FoodEntry, FoodItem, save_nutrition_entry, calculate_entry_nutrition
    import uuid
    
    try:
        # Generate ID if not provided
        if "id" not in entry_data:
            entry_data["id"] = str(uuid.uuid4())
        
        # Set user_id and date if not provided
        entry_data["user_id"] = user_id
        if "date" not in entry_data:
            entry_data["date"] = date.today().isoformat()
        
        # Set timestamp if not provided
        if "timestamp" not in entry_data:
            entry_data["timestamp"] = datetime.now().isoformat()
        
        # Parse food_item
        food_item_data = entry_data.get("food_item", {})
        food_item = FoodItem(**food_item_data)
        
        # Calculate nutrition
        quantity = entry_data.get("quantity", 1.0)
        unit = entry_data.get("unit", "serving")
        nutrition = calculate_entry_nutrition(food_item, quantity, unit)
        
        # Ensure all required fields are present (set to 0 if None)
        nutrition_clean = {
            "calories": nutrition.get("calories", 0.0),
            "protein": nutrition.get("protein", 0.0),
            "carbs": nutrition.get("carbs", 0.0),
            "fats": nutrition.get("fats", 0.0),
        }
        # Add optional fields only if they exist
        if "fiber" in nutrition and nutrition["fiber"] is not None:
            nutrition_clean["fiber"] = nutrition["fiber"]
        if "sugar" in nutrition and nutrition["sugar"] is not None:
            nutrition_clean["sugar"] = nutrition["sugar"]
        if "sodium" in nutrition and nutrition["sodium"] is not None:
            nutrition_clean["sodium"] = nutrition["sodium"]
        
        entry_data["nutrition"] = nutrition_clean
        
        # Create entry
        entry = FoodEntry(
            id=entry_data["id"],
            user_id=entry_data["user_id"],
            date=entry_data["date"],
            meal_type=entry_data.get("meal_type", "snack"),
            food_item=food_item,
            quantity=quantity,
            unit=unit,
            nutrition=nutrition_clean,
            timestamp=entry_data["timestamp"]
        )
        
        success = save_nutrition_entry(user_id, entry)
        if success:
            return {"status": "success", "entry": entry.model_dump()}
        else:
            raise HTTPException(status_code=500, detail="Failed to save nutrition entry")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid nutrition entry data: {str(e)}")

@app.put("/nutrition/entries/{entry_id}")
async def update_nutrition_entry(
    entry_id: str,
    entry_data: Dict[str, Any],
    user_id: str = Depends(get_current_user_id)
):
    """Update a nutrition entry"""
    from .nutrition_engine import FoodEntry, FoodItem, load_nutrition_entries, save_nutrition_entry, calculate_entry_nutrition
    
    try:
        # Load existing entries to find the one to update
        entries = load_nutrition_entries(user_id, days=365*10)
        existing_entry = next((e for e in entries if e.get("id") == entry_id), None)
        
        if not existing_entry:
            raise HTTPException(status_code=404, detail="Nutrition entry not found")
        
        # Merge updates
        updated_data = {**existing_entry, **entry_data}
        updated_data["id"] = entry_id
        updated_data["user_id"] = user_id
        
        # Recalculate nutrition if food_item, quantity, or unit changed
        if "food_item" in entry_data or "quantity" in entry_data or "unit" in entry_data:
            food_item_data = updated_data.get("food_item", {})
            food_item = FoodItem(**food_item_data)
            quantity = updated_data.get("quantity", 1.0)
            unit = updated_data.get("unit", "serving")
            nutrition = calculate_entry_nutrition(food_item, quantity, unit)
            
            # Clean nutrition data - ensure all required fields are present and optional fields only if not None
            nutrition_clean = {
                "calories": nutrition.get("calories", 0.0),
                "protein": nutrition.get("protein", 0.0),
                "carbs": nutrition.get("carbs", 0.0),
                "fats": nutrition.get("fats", 0.0),
            }
            # Add optional fields only if they exist and are not None
            if "fiber" in nutrition and nutrition["fiber"] is not None:
                nutrition_clean["fiber"] = nutrition["fiber"]
            if "sugar" in nutrition and nutrition["sugar"] is not None:
                nutrition_clean["sugar"] = nutrition["sugar"]
            if "sodium" in nutrition and nutrition["sodium"] is not None:
                nutrition_clean["sodium"] = nutrition["sodium"]
            
            updated_data["nutrition"] = nutrition_clean
        
        # Create updated entry
        food_item = FoodItem(**updated_data["food_item"])
        entry = FoodEntry(**updated_data)
        
        success = save_nutrition_entry(user_id, entry)
        if success:
            return {"status": "success", "entry": entry.model_dump()}
        else:
            raise HTTPException(status_code=500, detail="Failed to update nutrition entry")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid nutrition entry data: {str(e)}")

@app.delete("/nutrition/entries/{entry_id}")
async def delete_nutrition_entry_endpoint(
    entry_id: str,
    user_id: str = Depends(get_current_user_id)
):
    """Delete a nutrition entry"""
    from .nutrition_engine import delete_nutrition_entry
    
    success = delete_nutrition_entry(user_id, entry_id)
    if success:
        return {"status": "success"}
    else:
        raise HTTPException(status_code=404, detail="Nutrition entry not found")

@app.get("/nutrition/summary")
async def get_nutrition_summary(
    date: Optional[str] = None,
    user_id: str = Depends(get_current_user_id)
):
    """Get daily nutrition summary"""
    from .nutrition_engine import calculate_daily_summary, load_nutrition_goals
    
    if not date:
        date = date.today().isoformat()
    
    summary = calculate_daily_summary(user_id, date)
    if summary:
        return summary
    else:
        # Return empty summary if no entries
        goals = load_nutrition_goals(user_id)
        goal_calories = goals.get("daily_calories", 2000.0) if goals else 2000.0
        return {
            "date": date,
            "total_calories": 0.0,
            "total_protein": 0.0,
            "total_carbs": 0.0,
            "total_fats": 0.0,
            "goal_calories": goal_calories,
            "calories_remaining": goal_calories,
            "protein_percent": None,
            "carbs_percent": None,
            "fats_percent": None,
            "meal_breakdown": {"breakfast": 0.0, "lunch": 0.0, "dinner": 0.0, "snack": 0.0}
        }

@app.get("/nutrition/goals")
async def get_nutrition_goals_endpoint(user_id: str = Depends(get_current_user_id)):
    """Get user's nutrition goals"""
    from .nutrition_engine import load_nutrition_goals
    
    goals = load_nutrition_goals(user_id)
    if goals:
        return goals
    else:
        # Return default goals
        return {
            "user_id": user_id,
            "daily_calories": 2000.0,
            "protein_grams": None,
            "carbs_grams": None,
            "fats_grams": None,
            "activity_level": "moderate",
            "goal": "maintain",
            "updated_at": datetime.now().isoformat()
        }

@app.post("/nutrition/goals")
async def update_nutrition_goals(
    goals_data: Dict[str, Any],
    user_id: str = Depends(get_current_user_id)
):
    """Set/update user's nutrition goals with optional auto-calculation"""
    from .nutrition_engine import (
        save_nutrition_goals,
        calculate_bmr,
        calculate_tdee,
        calculate_calorie_target,
        calculate_macro_targets,
        get_activity_multipliers
    )
    
    try:
        # Check if profile data is provided for auto-calculation
        profile_data = {
            "age": goals_data.get("age"),
            "weight_kg": goals_data.get("weight_kg"),
            "height_cm": goals_data.get("height_cm"),
            "gender": goals_data.get("gender"),
            "activity_level": goals_data.get("activity_level"),
            "goal_type": goals_data.get("goal_type"),
            "target_rate_lbs_per_week": goals_data.get("target_rate_lbs_per_week", 0),
            "macro_preset": goals_data.get("macro_preset", "balanced")
        }
        
        calculation_breakdown = None
        calculated_goals = {}
        
        # If manual calorie_goal is provided, use it (manual override)
        if "daily_calories" in goals_data and goals_data["daily_calories"]:
            calculated_goals["daily_calories"] = goals_data["daily_calories"]
        # Otherwise, try to calculate from profile data
        elif all([profile_data["age"], profile_data["weight_kg"], profile_data["height_cm"], profile_data["gender"], profile_data["activity_level"]]):
            # Validate inputs
            if profile_data["age"] < 10 or profile_data["age"] > 100:
                raise HTTPException(status_code=400, detail="Age must be between 10 and 100")
            if profile_data["weight_kg"] <= 0 or profile_data["weight_kg"] > 500:
                raise HTTPException(status_code=400, detail="Weight must be between 0 and 500 kg")
            if profile_data["height_cm"] <= 0 or profile_data["height_cm"] > 300:
                raise HTTPException(status_code=400, detail="Height must be between 0 and 300 cm")
            
            # Calculate BMR
            bmr = calculate_bmr(
                profile_data["weight_kg"],
                profile_data["height_cm"],
                profile_data["age"],
                profile_data["gender"]
            )
            
            # Calculate TDEE
            tdee = calculate_tdee(bmr, profile_data["activity_level"])
            
            # Get activity multiplier for display
            multipliers = get_activity_multipliers()
            activity_lower = profile_data["activity_level"].lower().replace(" ", "_")
            activity_map = {
                "sedentary": "sedentary",
                "light": "lightly_active",
                "lightly": "lightly_active",
                "lightly_active": "lightly_active",
                "moderate": "moderately_active",
                "moderately": "moderately_active",
                "moderately_active": "moderately_active",
                "active": "very_active",
                "very": "very_active",
                "very_active": "very_active",
                "extra": "extra_active",
                "extra_active": "extra_active"
            }
            mapped_level = activity_map.get(activity_lower, "moderately_active")
            activity_multiplier = multipliers.get(mapped_level, 1.55)
            
            # Calculate calorie target
            goal_type = profile_data["goal_type"] or "maintain"
            target_rate = profile_data["target_rate_lbs_per_week"] or 0
            calorie_target = calculate_calorie_target(tdee, goal_type, target_rate)
            
            # Calculate goal adjustment
            goal_adjustment = 0
            if goal_type.lower() in ["lose", "loss", "weight_loss"]:
                goal_adjustment = -target_rate * 500
            elif goal_type.lower() in ["gain", "weight_gain", "bulk"]:
                goal_adjustment = target_rate * 500
            
            # Calculate macro targets
            macro_preset = profile_data["macro_preset"] or "balanced"
            macro_targets = calculate_macro_targets(calorie_target, macro_preset)
            
            # Set calculated values
            calculated_goals["daily_calories"] = calorie_target
            calculated_goals["protein_grams"] = macro_targets["protein_grams"]
            calculated_goals["carbs_grams"] = macro_targets["carbs_grams"]
            calculated_goals["fats_grams"] = macro_targets["fats_grams"]
            calculated_goals["protein_percent"] = macro_targets["protein_percent"]
            calculated_goals["carbs_percent"] = macro_targets["carbs_percent"]
            calculated_goals["fats_percent"] = macro_targets["fats_percent"]
            
            # Create calculation breakdown
            calculation_breakdown = {
                "bmr": bmr,
                "tdee": tdee,
                "activity_multiplier": activity_multiplier,
                "goal_adjustment": goal_adjustment,
                "macro_preset": macro_preset
            }
        
        # Merge calculated goals with provided goals (provided values take precedence)
        # IMPORTANT: goals_data comes last so it overrides calculated_goals
        # This ensures if user explicitly sets daily_calories, it's saved as-is
        final_goals = {**calculated_goals, **goals_data}
        
        # Sync weight goals if profile data was provided
        if all([profile_data["age"], profile_data["weight_kg"], profile_data["height_cm"], profile_data["gender"], profile_data["activity_level"]]):
            from .weight_engine import save_weight_goals, load_weight_goals
            # Load existing weight goals or create new
            weight_goals = load_weight_goals(user_id) or {}
            
            # Normalize activity level for weight engine (it uses different names)
            activity_level = profile_data["activity_level"].lower().replace(" ", "_")
            activity_map = {
                "sedentary": "sedentary",
                "light": "light",
                "lightly": "light",
                "lightly_active": "light",
                "moderate": "moderate",
                "moderately": "moderate",
                "moderately_active": "moderate",
                "active": "active",
                "very": "very_active",
                "very_active": "very_active",
                "extra": "very_active",
                "extra_active": "very_active"
            }
            normalized_activity = activity_map.get(activity_level, "moderate")
            
            # Update with profile data
            weight_goals.update({
                "age": profile_data["age"],
                "current_weight_kg": profile_data["weight_kg"],
                "height_cm": profile_data["height_cm"],
                "gender": profile_data["gender"],
                "activity_level": normalized_activity,
                "goal_type": profile_data["goal_type"] or weight_goals.get("goal_type", "maintain"),
                "weekly_change_kg": (profile_data.get("target_rate_lbs_per_week", 0) * 0.453592) if profile_data.get("target_rate_lbs_per_week") else weight_goals.get("weekly_change_kg")
            })
            save_weight_goals(user_id, weight_goals)
        
        # Remove profile data from final goals (don't save it to nutrition goals)
        final_goals.pop("age", None)
        final_goals.pop("weight_kg", None)
        final_goals.pop("height_cm", None)
        final_goals.pop("gender", None)
        final_goals.pop("target_rate_lbs_per_week", None)
        final_goals.pop("macro_preset", None)
        final_goals.pop("goal_type", None)  # This is saved in weight goals, not nutrition goals
        
        # Save goals
        success = save_nutrition_goals(user_id, final_goals)
        if success:
            response = {"status": "success", "goals": final_goals}
            if calculation_breakdown:
                response["calculation"] = calculation_breakdown
            return response
        else:
            raise HTTPException(status_code=500, detail="Failed to save nutrition goals")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid goals data: {str(e)}")

@app.get("/nutrition/stats")
async def get_nutrition_stats(
    days: Optional[int] = 30,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user_id: str = Depends(get_current_user_id)
):
    """Get comprehensive nutrition statistics over time"""
    from .nutrition_engine import calculate_nutrition_stats
    
    stats = calculate_nutrition_stats(
        user_id, 
        days=days if days else 30,
        start_date=start_date,
        end_date=end_date
    )
    return stats

@app.get("/nutrition/search")
async def search_foods(
    query: str,
    user_id: str = Depends(get_current_user_id)
):
    """Search food database - Uses local cache first, then multiple free APIs: Edamam, Open Food Facts, USDA, Nutritionix"""
    import requests
    import os
    from dotenv import load_dotenv
    from .food_database import search_local_database, add_food_to_database
    
    load_dotenv()
    
    # Step 1: Check local database first (fastest, no API calls)
    # The local database automatically grows as users search - every API result is cached
    local_results = search_local_database(query, limit=15)
    
    # Add health scores to local results
    if local_results:
        from .food_health_engine import analyze_food_health
        for food in local_results:
            try:
                health_analysis = analyze_food_health(food)
                food["health"] = health_analysis
            except Exception as e:
                # If health analysis fails, continue without it
                pass
    
    # Check if we have an exact match in local results
    query_lower = query.lower().strip()
    has_exact_match = False
    if local_results:
        for food in local_results[:3]:  # Check first few results
            food_name = food.get("name", "").lower().strip()
            # Check for exact match (including singular/plural)
            if (food_name == query_lower or 
                food_name == query_lower + "s" or 
                (query_lower.endswith('s') and food_name == query_lower[:-1])):
                has_exact_match = True
                break
    
    # If we have good local results with exact match, return them
    if local_results and has_exact_match:
        return {"foods": local_results, "source": "local_database"}
    
    # If we have local results but no exact match, we'll still try APIs to find better matches
    # and merge them below (prioritizing exact matches from APIs)
    
    # If not in local DB, try APIs and automatically cache all results for future searches
    
    # Step 2: Try Edamam Food Database API first (BEST free API with good results)
    # Free tier: 10,000 requests/month - Get keys at https://developer.edamam.com/
    try:
        edamam_app_id = os.getenv("EDAMAM_APP_ID")
        edamam_app_key = os.getenv("EDAMAM_APP_KEY")
        
        if edamam_app_id and edamam_app_key:
            url = "https://api.edamam.com/api/food-database/v2/parser"
            params = {
                "q": query,
                "app_id": edamam_app_id,
                "app_key": edamam_app_key,
                "limit": 20
            }
            
            response = requests.get(url, params=params, timeout=5)
            if response.status_code == 200:
                data = response.json()
                hints = data.get("hints", [])
                
                if hints:
                    foods = []
                    query_lower = query.lower().strip()
                    
                    for item in hints[:20]:  # Get more to sort
                        food = item.get("food", {})
                        nutrients = food.get("nutrients", {})
                        food_name = food.get("label", "")
                        food_name_lower = food_name.lower()
                        
                        # Calculate match score with better prioritization
                        # Check if query appears as a whole word (better than just prefix)
                        query_as_word = f" {query_lower} " in f" {food_name_lower} " or food_name_lower.startswith(query_lower + " ") or food_name_lower.endswith(" " + query_lower)
                        query_exact = food_name_lower == query_lower
                        query_starts = food_name_lower.startswith(query_lower)
                        query_contains = query_lower in food_name_lower
                        
                        match_score = (
                            4 if query_exact else  # Exact match (highest)
                            3 if query_as_word else  # Query as whole word (e.g., "Loose Banana", "Organic bananas")
                            2 if query_starts else  # Starts with (e.g., "Banana chips")
                            1 if query_contains else  # Contains (lowest)
                            0  # Other
                        )
                        
                        food_data = {
                            "id": food.get("foodId", "") or f"edamam_{hash(food_name)}",
                            "name": food_name,
                            "brand": food.get("brand"),
                            "serving_size": "100g",
                            "serving_weight_grams": 100.0,
                            "calories": round(nutrients.get("ENERC_KCAL", 0), 1),
                            "protein": round(nutrients.get("PROCNT", 0), 1),
                            "carbs": round(nutrients.get("CHOCDF", 0), 1),
                            "fats": round(nutrients.get("FAT", 0), 1),
                            "fiber": round(nutrients.get("FIBTG", 0), 1) if nutrients.get("FIBTG") else None,
                            "sugar": round(nutrients.get("SUGAR", 0), 1) if nutrients.get("SUGAR") else None,
                            "sodium": round(nutrients.get("NA", 0), 1) if nutrients.get("NA") else None,
                            "source": "edamam",
                            "_match_score": match_score
                        }
                        foods.append(food_data)
                    
                    # Sort by match score (exact matches first), then by simplicity (shorter names, no brand), then alphabetically
                    def sort_key(x):
                        name = x["name"].lower()
                        brand = x.get("brand", "")
                        word_count = len(name.split())
                        has_brand = bool(brand)
                        return (-x["_match_score"], word_count, has_brand, name)
                    
                    foods.sort(key=sort_key)
                    # Remove the score before returning
                    for food in foods:
                        food.pop("_match_score", None)
                    
                    foods = foods[:15]  # Limit to 15
                    
                    if foods:
                        # Cache results in local database for future use
                        add_food_to_database(query, foods)
                        return {"foods": foods, "source": "edamam"}
    except Exception as e:
        print(f"Edamam search error: {e}")
    
    # Step 3: Try Open Food Facts (FREE, no API key, very reliable)
    # https://world.openfoodfacts.org/data
    try:
        url = "https://world.openfoodfacts.org/cgi/search.pl"
        params = {
            "search_terms": query,
            "search_simple": 1,
            "action": "process",
            "json": 1,
            "page_size": 20,
            "page": 1
        }
        
        response = requests.get(url, params=params, timeout=5)
        if response.status_code == 200:
            data = response.json()
            products = data.get("products", [])
            
            if products and len(products) > 0:
                foods = []
                query_lower = query.lower().strip()
                
                for item in products[:20]:  # Get more to sort
                    # Extract nutrition data
                    nutriments = item.get("nutriments", {})
                    product_name = item.get("product_name", "") or item.get("product_name_en", "") or item.get("product_name_fr", "") or query
                    product_name_lower = product_name.lower()
                    
                    # Get nutrition values (per 100g)
                    calories = nutriments.get("energy-kcal_100g") or nutriments.get("energy-kcal") or 0
                    protein = nutriments.get("proteins_100g") or nutriments.get("proteins") or 0
                    carbs = nutriments.get("carbohydrates_100g") or nutriments.get("carbohydrates") or 0
                    fats = nutriments.get("fat_100g") or nutriments.get("fat") or 0
                    fiber = nutriments.get("fiber_100g") or nutriments.get("fiber") or None
                    sugar = nutriments.get("sugars_100g") or nutriments.get("sugars") or None
                    sodium = nutriments.get("sodium_100g") or (nutriments.get("sodium") / 1000 if nutriments.get("sodium") else None) or None
                    
                    # Only add if we have at least calories or protein
                    if calories > 0 or protein > 0:
                        # Calculate match score with better prioritization
                        query_as_word = f" {query_lower} " in f" {product_name_lower} " or product_name_lower.startswith(query_lower + " ") or product_name_lower.endswith(" " + query_lower)
                        query_exact = product_name_lower == query_lower
                        query_starts = product_name_lower.startswith(query_lower)
                        query_contains = query_lower in product_name_lower
                        
                        match_score = (
                            4 if query_exact else  # Exact match (highest)
                            3 if query_as_word else  # Query as whole word (e.g., "Loose Banana", "Organic bananas")
                            2 if query_starts else  # Starts with (e.g., "Banana chips")
                            1 if query_contains else  # Contains (lowest)
                            0  # Other
                        )
                        
                        foods.append({
                            "id": item.get("code", "") or f"off_{hash(product_name)}",
                            "name": product_name,
                            "brand": item.get("brands", "").split(",")[0] if item.get("brands") else None,
                            "serving_size": "100g",
                            "serving_weight_grams": 100.0,
                            "calories": round(calories, 1) if calories else 0,
                            "protein": round(protein, 1) if protein else 0,
                            "carbs": round(carbs, 1) if carbs else 0,
                            "fats": round(fats, 1) if fats else 0,
                            "fiber": round(fiber, 1) if fiber else None,
                            "sugar": round(sugar, 1) if sugar else None,
                            "sodium": round(sodium, 1) if sodium else None,
                            "source": "openfoodfacts",
                            "_match_score": match_score
                        })
                
                # Sort by match score (exact matches first), then by simplicity (shorter names, no brand), then alphabetically
                def sort_key(x):
                    name = x["name"].lower()
                    brand = x.get("brand", "")
                    word_count = len(name.split())
                    has_brand = bool(brand)
                    return (-x["_match_score"], word_count, has_brand, name)
                
                foods.sort(key=sort_key)
                # Remove the score before returning
                for food in foods:
                    food.pop("_match_score", None)
                
                foods = foods[:15]  # Limit to 15
                
                if foods:
                    # Add health scores to Open Food Facts results (they have Nutri-Score, NOVA, etc.)
                    from .food_health_engine import analyze_food_health
                    for food in foods:
                        try:
                            # Extract health data from Open Food Facts product
                            product = next((item for item in products if item.get("code") == food.get("id")), None)
                            if product:
                                # Add health data to food item
                                food["nutri_score"] = product.get("nutriscore_grade", "").upper() if product.get("nutriscore_grade") else None
                                food["nova_group"] = product.get("nova_group")
                                food["additives"] = product.get("additives_original_tags") or product.get("additives_tags") or []
                                food["ingredients_text"] = product.get("ingredients_text", "") or product.get("ingredients_text_en", "")
                                food["ingredients_analysis"] = product.get("ingredients_analysis_tags", [])
                                food["ecoscore"] = product.get("ecoscore_grade", "").upper() if product.get("ecoscore_grade") else None
                            
                            health_analysis = analyze_food_health(food)
                            food["health"] = health_analysis
                        except Exception as e:
                            # If health analysis fails, continue without it
                            pass
                    
                    # Cache results in local database for future use
                    add_food_to_database(query, foods)
                    return {"foods": foods, "source": "openfoodfacts"}
    except Exception as e:
        print(f"Open Food Facts search error: {e}")
    
    # Step 4: Use USDA FoodData Central (FREE, no API key required, but recommended for rate limits)
    # API key is optional but recommended: https://fdc.nal.usda.gov/api-guide.html
    try:
        usda_api_key = os.getenv("USDA_API_KEY")  # Optional but recommended
        url = "https://api.nal.usda.gov/fdc/v1/foods/search"
        params = {
            "query": query,
            "pageSize": 20
        }
        
        # Add API key if available (recommended for higher rate limits)
        if usda_api_key:
            params["api_key"] = usda_api_key
        
        response = requests.get(url, params=params, timeout=6)
        if response.status_code == 200:
            data = response.json()
            # Check if we got results
            if not data.get("foods") or len(data.get("foods", [])) == 0:
                # No results from USDA, continue to fallback
                raise Exception("No results from USDA API")
            foods = []
            query_lower = query.lower().strip()
            
            for item in data.get("foods", [])[:20]:  # Get more to sort
                # Extract nutrition data
                nutrients = {}
                for n in item.get("foodNutrients", []):
                    nutrient_name = n.get("nutrientName", "")
                    value = n.get("value", 0)
                    if value:
                        nutrients[nutrient_name] = value
                
                # Get calories (Energy)
                calories = nutrients.get("Energy", 0) or nutrients.get("Energy (Atwater General Factors)", 0)
                food_name = item.get("description", "")
                food_name_lower = food_name.lower()
                
                # Calculate match score with better prioritization
                query_as_word = f" {query_lower} " in f" {food_name_lower} " or food_name_lower.startswith(query_lower + " ") or food_name_lower.endswith(" " + query_lower)
                query_exact = food_name_lower == query_lower
                query_starts = food_name_lower.startswith(query_lower)
                query_contains = query_lower in food_name_lower
                
                match_score = (
                    4 if query_exact else  # Exact match (highest)
                    3 if query_as_word else  # Query as whole word (e.g., "Loose Banana", "Organic bananas")
                    2 if query_starts else  # Starts with (e.g., "Banana chips")
                    1 if query_contains else  # Contains (lowest)
                    0  # Other
                )
                
                foods.append({
                    "id": str(item.get("fdcId", "")),
                    "name": food_name,
                    "brand": item.get("brandOwner"),
                    "serving_size": "100g",  # USDA default serving size
                    "serving_weight_grams": 100.0,
                    "calories": round(calories, 1) if calories else 0,
                    "protein": round(nutrients.get("Protein", 0), 1),
                    "carbs": round(nutrients.get("Carbohydrate, by difference", 0), 1),
                    "fats": round(nutrients.get("Total lipid (fat)", 0), 1),
                    "fiber": round(nutrients.get("Fiber, total dietary", 0), 1) if nutrients.get("Fiber, total dietary") else None,
                    "sugar": round(nutrients.get("Sugars, total including NLEA", 0), 1) if nutrients.get("Sugars, total including NLEA") else None,
                    "sodium": round(nutrients.get("Sodium, Na", 0), 1) if nutrients.get("Sodium, Na") else None,
                    "source": "usda",
                    "_match_score": match_score
                })
            
            # Sort by match score (exact matches first), then by simplicity (shorter names, no brand), then alphabetically
            def sort_key(x):
                name = x["name"].lower()
                brand = x.get("brand", "")
                word_count = len(name.split())
                has_brand = bool(brand)
                return (-x["_match_score"], word_count, has_brand, name)
            
            foods.sort(key=sort_key)
            # Remove the score before returning
            for food in foods:
                food.pop("_match_score", None)
            
            foods = foods[:15]  # Limit to 15
            
            if foods:
                # Cache results in local database for future use
                add_food_to_database(query, foods)
            return {"foods": foods, "source": "usda"}
        elif response.status_code == 403:
            # Rate limited - try without API key (slower rate limit)
            if usda_api_key:
                params.pop("api_key", None)
                response = requests.get(url, params=params, timeout=6)
                if response.status_code == 200:
                    # Process same as above
                    data = response.json()
                    foods = []
                    query_lower = query.lower().strip()
                    
                    for item in data.get("foods", [])[:20]:  # Get more to sort
                        nutrients = {}
                        for n in item.get("foodNutrients", []):
                            nutrient_name = n.get("nutrientName", "")
                            value = n.get("value", 0)
                            if value:
                                nutrients[nutrient_name] = value
                        calories = nutrients.get("Energy", 0) or nutrients.get("Energy (Atwater General Factors)", 0)
                        food_name = item.get("description", "")
                        food_name_lower = food_name.lower()
                        
                        # Calculate match score with better prioritization
                        query_as_word = f" {query_lower} " in f" {food_name_lower} " or food_name_lower.startswith(query_lower + " ") or food_name_lower.endswith(" " + query_lower)
                        query_exact = food_name_lower == query_lower
                        query_starts = food_name_lower.startswith(query_lower)
                        query_contains = query_lower in food_name_lower
                        
                        match_score = (
                            4 if query_exact else  # Exact match (highest)
                            3 if query_as_word else  # Query as whole word (e.g., "Loose Banana", "Organic bananas")
                            2 if query_starts else  # Starts with (e.g., "Banana chips")
                            1 if query_contains else  # Contains (lowest)
                            0  # Other
                        )
                        
                        foods.append({
                            "id": str(item.get("fdcId", "")),
                            "name": food_name,
                            "brand": item.get("brandOwner"),
                            "serving_size": "100g",
                            "serving_weight_grams": 100.0,
                            "calories": round(calories, 1) if calories else 0,
                            "protein": round(nutrients.get("Protein", 0), 1),
                            "carbs": round(nutrients.get("Carbohydrate, by difference", 0), 1),
                            "fats": round(nutrients.get("Total lipid (fat)", 0), 1),
                            "fiber": round(nutrients.get("Fiber, total dietary", 0), 1) if nutrients.get("Fiber, total dietary") else None,
                            "sugar": round(nutrients.get("Sugars, total including NLEA", 0), 1) if nutrients.get("Sugars, total including NLEA") else None,
                            "sodium": round(nutrients.get("Sodium, Na", 0), 1) if nutrients.get("Sodium, Na") else None,
                            "source": "usda",
                            "_match_score": match_score
                        })
                    
                    # Sort by match score (exact matches first), then by simplicity (shorter names, no brand), then alphabetically
                    def sort_key(x):
                        name = x["name"].lower()
                        brand = x.get("brand", "")
                        word_count = len(name.split())
                        has_brand = bool(brand)
                        return (-x["_match_score"], word_count, has_brand, name)
                    
                    foods.sort(key=sort_key)
                    # Remove the score before returning
                    for food in foods:
                        food.pop("_match_score", None)
                    
                    foods = foods[:15]  # Limit to 15
                    
                    if foods:
                        # Cache results in local database for future use
                        add_food_to_database(query, foods)
                    return {"foods": foods, "source": "usda"}
    except Exception as e:
        print(f"USDA search error: {e}")
        # Don't print full traceback for network errors - too verbose
        if "timeout" not in str(e).lower() and "connection" not in str(e).lower():
            import traceback
            traceback.print_exc()
    
    # Fallback 2: Try Edamam Food Database API (FREE tier - 10,000 requests/month)
    # No API key required for basic usage, but you can get one for higher limits
    try:
        edamam_app_id = os.getenv("EDAMAM_APP_ID")  # Optional
        edamam_app_key = os.getenv("EDAMAM_APP_KEY")  # Optional
        
        # Edamam has a free tier that works without API key for some endpoints
        # But Food Database API requires keys - try it if available
        if edamam_app_id and edamam_app_key:
            url = "https://api.edamam.com/api/food-database/v2/parser"
            params = {
                "q": query,
                "app_id": edamam_app_id,
                "app_key": edamam_app_key,
                "limit": 20
            }
            
            response = requests.get(url, params=params, timeout=5)
            if response.status_code == 200:
                data = response.json()
                hints = data.get("hints", [])
                
                if hints:
                    foods = []
                    for item in hints[:15]:
                        food = item.get("food", {})
                        nutrients = food.get("nutrients", {})
                        
                        foods.append({
                            "id": food.get("foodId", "") or f"edamam_{hash(food.get('label', ''))}",
                            "name": food.get("label", ""),
                            "brand": food.get("brand"),
                            "serving_size": "100g",
                            "serving_weight_grams": 100.0,
                            "calories": round(nutrients.get("ENERC_KCAL", 0), 1),
                            "protein": round(nutrients.get("PROCNT", 0), 1),
                            "carbs": round(nutrients.get("CHOCDF", 0), 1),
                            "fats": round(nutrients.get("FAT", 0), 1),
                            "fiber": round(nutrients.get("FIBTG", 0), 1) if nutrients.get("FIBTG") else None,
                            "sugar": round(nutrients.get("SUGAR", 0), 1) if nutrients.get("SUGAR") else None,
                            "sodium": round(nutrients.get("NA", 0), 1) if nutrients.get("NA") else None,
                            "source": "edamam"
                        })
                    
                    if foods:
                        return {"foods": foods, "source": "edamam"}
    except Exception as e:
        print(f"Edamam search error: {e}")
    
    # Fallback 3: Try Nutritionix if API keys are provided (for branded products)
    nutritionix_app_id = os.getenv("NUTRITIONIX_APP_ID")
    nutritionix_api_key = os.getenv("NUTRITIONIX_API_KEY")
    
    if nutritionix_app_id and nutritionix_api_key:
        try:
            url = "https://trackapi.nutritionix.com/v2/search/instant"
            headers = {
                "x-app-id": nutritionix_app_id,
                "x-app-key": nutritionix_api_key,
                "Content-Type": "application/json"
            }
            params = {"query": query}
            
            response = requests.get(url, headers=headers, params=params, timeout=5)
            if response.status_code == 200:
                data = response.json()
                foods = []
                
                # Process common foods
                for item in data.get("common", [])[:10]:
                    foods.append({
                        "id": item.get("tag_id", ""),
                        "name": item.get("food_name", ""),
                        "brand": None,
                        "serving_size": item.get("serving_unit", "1 serving"),
                        "calories": item.get("nf_calories", 0),
                        "source": "nutritionix_instant"
                    })
                
                # Process branded foods
                for item in data.get("branded", [])[:10]:
                    foods.append({
                        "id": item.get("nix_item_id", ""),
                        "name": item.get("food_name", ""),
                        "brand": item.get("brand_name"),
                        "serving_size": item.get("serving_unit", "1 serving"),
                        "calories": item.get("nf_calories", 0),
                        "source": "nutritionix_branded"
                    })
                
                if foods:
                    # Cache results in local database for future use
                    add_food_to_database(query, foods)
                    return {"foods": foods, "source": "nutritionix"}
        except Exception as e:
            print(f"Nutritionix search error: {e}")
    
    # Return empty if all APIs fail, but provide helpful fallback for common foods
    print(f"⚠️  All food search APIs failed for query: {query}")
    
    # Expanded local fallback database for common foods (when all APIs fail)
    # This helps users when network is down but they need to log common items
    common_foods_fallback = {
        "brownie": [{"id": "fallback_brownies", "name": "Brownies", "brand": None, "serving_size": "1 piece (20g)", "serving_weight_grams": 20, "calories": 100, "protein": 1.5, "carbs": 15, "fats": 4.5, "source": "fallback"}],
        "banana": [{"id": "fallback_banana", "name": "Banana", "brand": None, "serving_size": "1 medium (118g)", "serving_weight_grams": 118, "calories": 105, "protein": 1.3, "carbs": 27, "fats": 0.4, "source": "fallback"}],
        "apple": [{"id": "fallback_apple", "name": "Apple", "brand": None, "serving_size": "1 medium (182g)", "serving_weight_grams": 182, "calories": 95, "protein": 0.5, "carbs": 25, "fats": 0.3, "source": "fallback"}],
        "chicken": [{"id": "fallback_chicken", "name": "Chicken Breast", "brand": None, "serving_size": "100g", "serving_weight_grams": 100, "calories": 165, "protein": 31, "carbs": 0, "fats": 3.6, "source": "fallback"}],
        "rice": [{"id": "fallback_rice", "name": "White Rice", "brand": None, "serving_size": "1 cup cooked (158g)", "serving_weight_grams": 158, "calories": 205, "protein": 4.3, "carbs": 45, "fats": 0.4, "source": "fallback"}],
        "bread": [{"id": "fallback_bread", "name": "White Bread", "brand": None, "serving_size": "1 slice (25g)", "serving_weight_grams": 25, "calories": 66, "protein": 2, "carbs": 13, "fats": 0.8, "source": "fallback"}],
        "egg": [{"id": "fallback_egg", "name": "Egg", "brand": None, "serving_size": "1 large (50g)", "serving_weight_grams": 50, "calories": 70, "protein": 6, "carbs": 0.6, "fats": 5, "source": "fallback"}],
        "milk": [{"id": "fallback_milk", "name": "Whole Milk", "brand": None, "serving_size": "1 cup (244g)", "serving_weight_grams": 244, "calories": 149, "protein": 8, "carbs": 12, "fats": 8, "source": "fallback"}],
        "yogurt": [{"id": "fallback_yogurt", "name": "Greek Yogurt", "brand": None, "serving_size": "1 cup (200g)", "serving_weight_grams": 200, "calories": 130, "protein": 20, "carbs": 9, "fats": 0, "source": "fallback"}],
        "pasta": [{"id": "fallback_pasta", "name": "Pasta", "brand": None, "serving_size": "1 cup cooked (140g)", "serving_weight_grams": 140, "calories": 221, "protein": 8, "carbs": 43, "fats": 1.3, "source": "fallback"}],
        "salmon": [{"id": "fallback_salmon", "name": "Salmon", "brand": None, "serving_size": "100g", "serving_weight_grams": 100, "calories": 206, "protein": 22, "carbs": 0, "fats": 12, "source": "fallback"}],
        "beef": [{"id": "fallback_beef", "name": "Ground Beef", "brand": None, "serving_size": "100g", "serving_weight_grams": 100, "calories": 250, "protein": 26, "carbs": 0, "fats": 17, "source": "fallback"}],
        "cheese": [{"id": "fallback_cheese", "name": "Cheddar Cheese", "brand": None, "serving_size": "1 oz (28g)", "serving_weight_grams": 28, "calories": 113, "protein": 7, "carbs": 0.4, "fats": 9, "source": "fallback"}],
        "oatmeal": [{"id": "fallback_oatmeal", "name": "Oatmeal", "brand": None, "serving_size": "1 cup cooked (234g)", "serving_weight_grams": 234, "calories": 150, "protein": 5, "carbs": 27, "fats": 3, "source": "fallback"}],
        "peanut": [{"id": "fallback_peanut", "name": "Peanut Butter", "brand": None, "serving_size": "2 tbsp (32g)", "serving_weight_grams": 32, "calories": 188, "protein": 8, "carbs": 6, "fats": 16, "source": "fallback"}],
        "waffle": [{"id": "fallback_waffle", "name": "Waffle", "brand": None, "serving_size": "1 waffle (75g)", "serving_weight_grams": 75, "calories": 218, "protein": 6.5, "carbs": 25, "fats": 10, "source": "fallback"}],
        "waffles": [{"id": "fallback_waffle", "name": "Waffle", "brand": None, "serving_size": "1 waffle (75g)", "serving_weight_grams": 75, "calories": 218, "protein": 6.5, "carbs": 25, "fats": 10, "source": "fallback"}],
        "pancake": [{"id": "fallback_pancake", "name": "Pancake", "brand": None, "serving_size": "1 pancake (38g)", "serving_weight_grams": 38, "calories": 90, "protein": 2.5, "carbs": 12, "fats": 3.5, "source": "fallback"}],
        "pancakes": [{"id": "fallback_pancake", "name": "Pancake", "brand": None, "serving_size": "1 pancake (38g)", "serving_weight_grams": 38, "calories": 90, "protein": 2.5, "carbs": 12, "fats": 3.5, "source": "fallback"}],
    }
    
    query_lower = query.lower().strip()
    # Check if query matches any common food (fuzzy match)
    # First try exact match
    if query_lower in common_foods_fallback:
        return {"foods": common_foods_fallback[query_lower], "source": "fallback", "error": "Using fallback data - API unavailable. Results may be approximate."}
    
    # Then try partial match (query contains food key or vice versa)
    for food_key, food_list in common_foods_fallback.items():
        if food_key in query_lower or query_lower in food_key:
            return {"foods": food_list, "source": "fallback", "error": "Using fallback data - API unavailable. Results may be approximate."}
    
    return {"foods": [], "source": "none", "error": "Food search temporarily unavailable. Please try again later."}

@app.get("/nutrition/food/{food_id}")
async def get_food_by_id(
    food_id: str,
    source: Optional[str] = None,
    user_id: str = Depends(get_current_user_id)
):
    """Get food details by ID (barcode, name, or external API ID)"""
    from .food_database import load_food_database, add_food_to_database, save_food_database
    from .food_health_engine import analyze_food_health
    import requests
    import os
    from dotenv import load_dotenv
    
    load_dotenv()
    
    # Reload database to ensure we have latest data (in case it was just cached by barcode scan)
    db = load_food_database()
    foods_dict = db.get("foods", {})
    
    # Try to find food by ID, barcode, or name in local database first
    food = None
    decoded_id = food_id
    
    # Try direct lookup first (by exact key match)
    if decoded_id in foods_dict:
        food = foods_dict[decoded_id]
    else:
        # Search by name, barcode, or ID (case-insensitive)
        decoded_id_lower = decoded_id.lower()
        for key, value in foods_dict.items():
            if isinstance(value, dict):
                # Check if key (ID) matches (case-insensitive)
                if key.lower() == decoded_id_lower:
                    food = value
                    break
                # Check if food's ID field matches
                if str(value.get("id", "")).lower() == decoded_id_lower:
                    food = value
                    break
                # Check if barcode matches (exact match, not case-insensitive)
                if str(value.get("barcode", "")) == decoded_id:
                    food = value
                    break
                # Check if name matches (case-insensitive)
                if value.get("name", "").lower() == decoded_id_lower:
                    food = value
                    break
    
    # If not found locally, try barcode scanning as fallback (for barcodes)
    if not food and food_id.isdigit() and len(food_id) >= 8:
        # Try barcode scanning endpoint logic
        try:
            from .download_openfoodfacts import process_off_product
            url = f"https://world.openfoodfacts.org/api/v0/product/{food_id}.json"
            import requests
            response = requests.get(url, timeout=5)
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == 1 and data.get("product"):
                    product = data["product"]
                    scanned_food = process_off_product(product)
                    if scanned_food:
                        scanned_food["barcode"] = food_id
                        scanned_food["id"] = food_id
                        # Add health analysis
                        try:
                            health_analysis = analyze_food_health(scanned_food)
                            scanned_food["health"] = health_analysis
                        except:
                            pass
                        food = scanned_food
                        # Try to cache it (but don't fail if save fails)
                        try:
                            foods_dict[food_id] = food
                            db["foods"] = foods_dict
                            save_food_database(db)
                        except:
                            pass  # Don't fail if save doesn't work
        except:
            pass  # Continue to other fallbacks
    
    # If not found locally, try external APIs as fallback
    if not food:
        # Try USDA FoodData Central if food_id looks like a USDA FDC ID (numeric)
        if not source or source == "usda" or source.startswith("usda"):
            if food_id.isdigit():
                try:
                    usda_api_key = os.getenv("USDA_API_KEY")
                    url = f"https://api.nal.usda.gov/fdc/v1/food/{food_id}"
                    params = {}
                    if usda_api_key:
                        params["api_key"] = usda_api_key
                    
                    response = requests.get(url, params=params, timeout=6)
                    if response.status_code == 200:
                        usda_food = response.json()
                        nutrients = {}
                        for n in usda_food.get("foodNutrients", []):
                            nutrient_name = n.get("nutrientName", "")
                            value = n.get("value", 0)
                            if value:
                                nutrients[nutrient_name] = value
                        
                        calories = nutrients.get("Energy", 0) or nutrients.get("Energy (Atwater General Factors)", 0)
                        
                        food = {
                            "id": str(usda_food.get("fdcId", food_id)),
                            "name": usda_food.get("description", ""),
                            "brand": usda_food.get("brandOwner"),
                            "serving_size": "100g",
                            "serving_weight_grams": 100.0,
                            "calories": round(calories, 1) if calories else 0,
                            "protein": round(nutrients.get("Protein", 0), 1),
                            "carbs": round(nutrients.get("Carbohydrate, by difference", 0), 1),
                            "fats": round(nutrients.get("Total lipid (fat)", 0), 1),
                            "fiber": round(nutrients.get("Fiber, total dietary", 0), 1) if nutrients.get("Fiber, total dietary") else None,
                            "sugar": round(nutrients.get("Sugars, total including NLEA", 0), 1) if nutrients.get("Sugars, total including NLEA") else None,
                            "sodium": round(nutrients.get("Sodium, Na", 0), 1) if nutrients.get("Sodium, Na") else None,
                            "source": "usda"
                        }
                        # Cache in local database
                        foods_dict[food["id"]] = food
                        db["foods"] = foods_dict
                        save_food_database(db)
                except Exception as e:
                    print(f"USDA detail error: {e}")
        
        # Try Nutritionix if API keys are provided
        if not food and (not source or source == "nutritionix" or source.startswith("nutritionix")):
            nutritionix_app_id = os.getenv("NUTRITIONIX_APP_ID")
            nutritionix_api_key = os.getenv("NUTRITIONIX_API_KEY")
            
            if nutritionix_app_id and nutritionix_api_key:
                try:
                    url = f"https://trackapi.nutritionix.com/v2/search/item"
                    headers = {
                        "x-app-id": nutritionix_app_id,
                        "x-app-key": nutritionix_api_key,
                        "Content-Type": "application/json"
                    }
                    params = {"nix_item_id": food_id}
                    
                    response = requests.get(url, headers=headers, params=params, timeout=5)
                    if response.status_code == 200:
                        data = response.json()
                        foods = data.get("foods", [])
                        if foods:
                            nix_food = foods[0]
                            food = {
                                "id": nix_food.get("nix_item_id", food_id),
                                "name": nix_food.get("food_name", ""),
                                "brand": nix_food.get("brand_name"),
                                "serving_size": nix_food.get("serving_unit", "1 serving"),
                                "serving_weight_grams": nix_food.get("serving_weight_grams"),
                                "calories": nix_food.get("nf_calories", 0),
                                "protein": nix_food.get("nf_protein", 0),
                                "carbs": nix_food.get("nf_total_carbohydrate", 0),
                                "fats": nix_food.get("nf_total_fat", 0),
                                "fiber": nix_food.get("nf_dietary_fiber"),
                                "sugar": nix_food.get("nf_sugars"),
                                "sodium": nix_food.get("nf_sodium"),
                                "source": "nutritionix"
                            }
                            # Cache in local database
                            foods_dict[food["id"]] = food
                            db["foods"] = foods_dict
                            save_food_database(db)
                except Exception as e:
                    print(f"Nutritionix detail error: {e}")
    
    if not food:
        raise HTTPException(status_code=404, detail="Food not found")
    
    # Add health analysis if not present
    if not food.get("health"):
        try:
            health_analysis = analyze_food_health(food)
            food["health"] = health_analysis
        except Exception as e:
            print(f"Error analyzing food health: {e}")
            pass
    
    return food

@app.get("/nutrition/health/{food_id}")
async def get_food_health(
    food_id: str,
    user_id: str = Depends(get_current_user_id)
):
    """Get health analysis for a specific food item"""
    from .food_database import load_food_database
    from .food_health_engine import analyze_food_health
    
    db = load_food_database()
    foods_dict = db.get("foods", {})
    
    # Try to find food by ID, barcode, or name
    food = None
    decoded_id = food_id
    
    # Try direct lookup first
    if decoded_id in foods_dict:
        food = foods_dict[decoded_id]
    else:
        # Search by name, barcode, or ID (case-insensitive)
        decoded_id_lower = decoded_id.lower()
        for key, value in foods_dict.items():
            if isinstance(value, dict):
                # Check if ID matches
                if key.lower() == decoded_id_lower:
                    food = value
                    break
                # Check if name matches
                if value.get("name", "").lower() == decoded_id_lower:
                    food = value
                    break
                # Check if barcode matches
                if str(value.get("barcode", "")) == decoded_id:
                    food = value
                    break
    
    if not food:
        raise HTTPException(status_code=404, detail="Food not found")
    
    try:
        health_analysis = analyze_food_health(food)
        return health_analysis
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing food health: {str(e)}")

@app.get("/nutrition/health/{food_id}/alternatives")
async def get_healthier_alternatives(
    food_id: str,
    limit: int = 5,
    user_id: str = Depends(get_current_user_id)
):
    """Get healthier alternatives for a specific food item"""
    from .food_database import load_food_database
    from .food_health_engine import find_healthier_alternatives, analyze_food_health
    
    db = load_food_database()
    foods_dict = db.get("foods", {})
    
    # Find the current food
    food = None
    if food_id in foods_dict:
        food = foods_dict[food_id]
    else:
        food_id_lower = food_id.lower()
        for key, value in foods_dict.items():
            if isinstance(value, dict) and value.get("name", "").lower() == food_id_lower:
                food = value
                break
    
    if not food:
        raise HTTPException(status_code=404, detail="Food not found")
    
    # Ensure food has health analysis
    if not food.get("health"):
        try:
            health_analysis = analyze_food_health(food)
            food["health"] = health_analysis
        except:
            pass
    
    try:
        # Get all foods from database for comparison
        all_foods = [v for v in foods_dict.values() if isinstance(v, dict) and v.get("name")]
        alternatives = find_healthier_alternatives(food, all_foods, limit=limit)
        
        # Format response
        return {
            "current_food": {
                "id": food.get("id"),
                "name": food.get("name"),
                "health_score": food.get("health", {}).get("health_score", 0) if isinstance(food.get("health"), dict) else 0
            },
            "alternatives": [
                {
                    "food": alt["food"],
                    "health_score": alt["health_score"],
                    "score_improvement": alt["score_improvement"],
                    "similarity": alt["similarity"],
                    "explanation": alt["explanation"]
                }
                for alt in alternatives
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error finding alternatives: {str(e)}")

@app.get("/nutrition/scan/{barcode}")
async def scan_barcode(
    barcode: str,
    user_id: str = Depends(get_current_user_id)
):
    """Scan a product barcode and return health analysis"""
    import requests
    from .food_database import load_food_database, add_food_to_database
    from .download_openfoodfacts import process_off_product
    from .food_health_engine import analyze_food_health
    
    # Try to find in local database first
    db = load_food_database()
    foods_dict = db.get("foods", {})
    
    # Check if we have this barcode
    if barcode in foods_dict:
        food = foods_dict[barcode]
        if not food.get("health"):
            try:
                health_analysis = analyze_food_health(food)
                food["health"] = health_analysis
            except:
                pass
        return {"food": food, "source": "local_database"}
    
    # Try Open Food Facts API
    try:
        url = f"https://world.openfoodfacts.org/api/v0/product/{barcode}.json"
        response = requests.get(url, timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("status") == 1 and data.get("product"):
                product = data["product"]
                food = process_off_product(product)
                
                if food:
                    # Ensure barcode is set and use it as primary ID
                    if barcode:
                        food["barcode"] = barcode
                        food["id"] = barcode  # Use barcode as the primary ID for lookup
                    
                    # Add health analysis
                    try:
                        health_analysis = analyze_food_health(food)
                        food["health"] = health_analysis
                    except Exception as e:
                        print(f"Error analyzing food health: {e}")
                        pass
                    
                    # Cache in local database - store by barcode (primary) and original ID if different
                    if barcode:
                        foods_dict[barcode] = food
                    if food.get("id") and food["id"] != barcode:
                        foods_dict[food["id"]] = food
                    db["foods"] = foods_dict
                    from .food_database import save_food_database
                    save_food_database(db)
                    
                    return {"food": food, "source": "openfoodfacts"}
        
        raise HTTPException(status_code=404, detail="Product not found in Open Food Facts database")
    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Error fetching product data: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing barcode: {str(e)}")

@app.get("/nutrition/database/stats")
async def get_food_database_stats(user_id: str = Depends(get_current_user_id)):
    """Get statistics about the local food database"""
    from .food_database import get_database_stats
    return get_database_stats()

@app.post("/nutrition/database/scrape")
async def scrape_foods_background(
    limit: int = 20,
    delay: float = 2.0,
    user_id: str = Depends(get_current_user_id)
):
    """Trigger background food scraper to populate local database"""
    import threading
    from .food_scraper import scrape_common_foods
    
    # Run scraper in background thread
    def run_scraper():
        scrape_common_foods(limit=limit, delay=delay)
    
    thread = threading.Thread(target=run_scraper, daemon=True)
    thread.start()
    
    return {
        "status": "started",
        "message": f"Food scraper started in background. Will scrape {limit} foods with {delay}s delay between requests."
    }

@app.post("/nutrition/database/import-off")
async def import_openfoodfacts_database(
    limit: int = 1000,
    update_only: bool = False,
    user_id: str = Depends(get_current_user_id)
):
    """Import Open Food Facts database (downloads and imports in background)"""
    import threading
    from .download_openfoodfacts import import_jsonl_file, download_file
    
    # Run import in background thread
    def run_import():
        try:
            file_path = "data/openfoodfacts_products.jsonl.gz"
            
            # Download if needed
            if not os.path.exists(file_path):
                print("Downloading Open Food Facts database...")
                download_file(
                    "https://static.openfoodfacts.org/data/en.openfoodfacts.org.products.jsonl.gz",
                    file_path
                )
            
            # Import
            if os.path.exists(file_path):
                import_jsonl_file(file_path, limit=limit, update_only=update_only)
            else:
                print("Failed to download database file")
        except Exception as e:
            print(f"Error importing Open Food Facts database: {e}")
            import traceback
            traceback.print_exc()
    
    thread = threading.Thread(target=run_import, daemon=True)
    thread.start()
    
    return {
        "status": "started",
        "message": f"Open Food Facts import started in background. Will import up to {limit} products."
    }

# --- Weight Tracking Endpoints ---

@app.get("/weight/entries")
async def get_weight_entries(
    days: int = 365,
    user_id: str = Depends(get_current_user_id)
):
    """Get weight entries"""
    from .weight_engine import load_weight_entries
    
    entries = load_weight_entries(user_id, days=days)
    return {"entries": entries}

@app.post("/weight/entries")
async def create_weight_entry(
    entry_data: dict,
    user_id: str = Depends(get_current_user_id)
):
    """Create a weight entry"""
    from .weight_engine import WeightEntry, save_weight_entry
    from datetime import datetime
    
    # Generate ID if not provided
    entry_id = entry_data.get("id") or f"weight_{datetime.now().timestamp()}"
    
    # Convert lbs to kg if needed
    weight_kg = entry_data.get("weight_kg")
    weight_lbs = entry_data.get("weight_lbs")
    if weight_lbs and not weight_kg:
        weight_kg = weight_lbs / 2.20462
    elif weight_kg and not weight_lbs:
        weight_lbs = weight_kg * 2.20462
    
    entry = WeightEntry(
        id=entry_id,
        user_id=user_id,
        date=entry_data.get("date", datetime.now().strftime("%Y-%m-%d")),
        weight_kg=weight_kg,
        weight_lbs=weight_lbs,
        body_fat_percent=entry_data.get("body_fat_percent"),
        notes=entry_data.get("notes"),
        timestamp=datetime.now().isoformat()
    )
    
    success = save_weight_entry(user_id, entry)
    if success:
        return {"status": "success", "entry": entry.model_dump()}
    else:
        raise HTTPException(status_code=500, detail="Failed to save weight entry")

@app.delete("/weight/entries/{entry_id}")
async def delete_weight_entry(
    entry_id: str,
    user_id: str = Depends(get_current_user_id)
):
    """Delete a weight entry"""
    from .weight_engine import delete_weight_entry
    
    success = delete_weight_entry(user_id, entry_id)
    if success:
        return {"status": "success"}
    else:
        raise HTTPException(status_code=404, detail="Weight entry not found")

@app.get("/weight/goals")
async def get_weight_goals(
    user_id: str = Depends(get_current_user_id)
):
    """Get weight goals"""
    from .weight_engine import load_weight_goals, get_latest_weight, calculate_calorie_target
    
    goals = load_weight_goals(user_id)
    if not goals:
        return {"goals": None, "calorie_target": None}
    
    # Calculate calorie target
    current_weight = get_latest_weight(user_id) or goals.get("current_weight_kg", 70.0)
    calorie_target = calculate_calorie_target(goals, current_weight)
    
    return {"goals": goals, "calorie_target": calorie_target}

@app.post("/weight/goals")
async def update_weight_goals(
    goals_data: dict,
    user_id: str = Depends(get_current_user_id)
):
    """Set/update weight goals"""
    from .weight_engine import save_weight_goals
    
    try:
        success = save_weight_goals(user_id, goals_data)
        if success:
            return {"status": "success", "goals": goals_data}
        else:
            raise HTTPException(status_code=500, detail="Failed to save weight goals")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid goals data: {str(e)}")

@app.get("/weight/stats")
async def get_weight_stats(
    days: int = 30,
    user_id: str = Depends(get_current_user_id)
):
    """Get weight statistics"""
    from .weight_engine import get_weight_stats
    
    stats = get_weight_stats(user_id, days=days)
    return stats

# --- Wellness Integration Endpoints ---

@app.get("/nutrition/wellness/correlations")
async def get_wellness_correlations(
    days: int = 30,
    user_id: str = Depends(get_current_user_id)
):
    """Get correlations between wellness metrics"""
    from .wellness_integration_engine import get_wellness_correlations
    
    correlations = get_wellness_correlations(user_id, days=days)
    return {"correlations": correlations}

@app.get("/nutrition/wellness/score")
async def get_wellness_score(
    days: int = 30,
    user_id: str = Depends(get_current_user_id)
):
    """Get overall wellness score"""
    from .wellness_integration_engine import calculate_wellness_score
    
    score = calculate_wellness_score(user_id, days=days)
    return score

@app.get("/nutrition/wellness/insights")
async def get_wellness_insights(
    days: int = 30,
    user_id: str = Depends(get_current_user_id)
):
    """Get holistic wellness insights"""
    from .wellness_integration_engine import generate_wellness_insights
    
    insights = generate_wellness_insights(user_id, days=days)
    return {"insights": insights}

@app.get("/nutrition/challenges")
async def get_nutrition_challenges(
    user_id: str = Depends(get_current_user_id)
):
    """Get user's nutrition challenges"""
    from .social_engine import load_challenges
    
    all_challenges = load_challenges()
    # Filter for nutrition-related challenges that user is part of
    nutrition_challenges = [
        c for c in all_challenges 
        if c.get("type") == "nutrition" and (
            c.get("creator_id") == user_id or 
            user_id in c.get("participants", [])
        )
    ]
    return {"challenges": nutrition_challenges}

@app.post("/nutrition/challenges/create")
async def create_nutrition_challenge(
    challenge_data: dict,
    user_id: str = Depends(get_current_user_id)
):
    """Create a nutrition challenge"""
    from .social_engine import create_challenge
    
    challenge = create_challenge(
        creator_id=user_id,
        name=challenge_data.get("name", "Nutrition Challenge"),
        description=challenge_data.get("description", ""),
        challenge_type=challenge_data.get("type", "nutrition"),  # e.g., "protein_goal", "calorie_goal"
        target_value=challenge_data.get("target_value", 0),
        duration_days=challenge_data.get("duration_days", 7),
        is_global=challenge_data.get("is_global", False),
        friend_ids=challenge_data.get("friend_ids", [])
    )
    return {"status": "success", "challenge": challenge}

@app.post("/nutrition/share/meal-plan")
async def share_meal_plan(
    share_data: dict,
    user_id: str = Depends(get_current_user_id)
):
    """Share meal plan with friends"""
    from .meal_suggestions_engine import load_meal_plan
    from .social_engine import send_notification
    
    meal_plan_id = share_data.get("meal_plan_id")
    friend_ids = share_data.get("friend_ids", [])
    
    # Get meal plan
    plan = load_meal_plan(user_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Meal plan not found")
    
    # Send notifications to friends (simplified - in production, use proper messaging system)
    # For now, just return success
    return {
        "status": "success",
        "message": f"Meal plan shared with {len(friend_ids)} friend(s)"
    }

# --- Meal Suggestions Endpoints ---

@app.post("/nutrition/suggestions")
async def get_meal_suggestions(
    suggestion_data: dict,
    user_id: str = Depends(get_current_user_id)
):
    """Get AI meal suggestions"""
    from .meal_suggestions_engine import generate_meal_suggestions
    from .nutrition_engine import calculate_daily_summary, load_nutrition_goals
    
    meal_type = suggestion_data.get("meal_type", "breakfast")
    date_str = suggestion_data.get("date", datetime.now().strftime("%Y-%m-%d"))
    
    # Get remaining calories/macros
    summary = calculate_daily_summary(user_id, date_str)
    goals = load_nutrition_goals(user_id)
    
    # Default to goal calories if no summary or if remaining is 0
    goal_calories = goals.get("daily_calories", 2000) if goals else 2000
    if summary and summary.get("calories_remaining", 0) > 0:
        remaining_calories = summary.get("calories_remaining", goal_calories)
    else:
        # Use goal calories if no entries logged yet
        remaining_calories = goal_calories
    
    # Calculate remaining macros from summary
    if summary:
        remaining_protein = max(0, (goals.get("protein_grams", 0) if goals else 0) - summary.get("total_protein", 0))
        remaining_carbs = max(0, (goals.get("carbs_grams", 0) if goals else 0) - summary.get("total_carbs", 0))
        remaining_fats = max(0, (goals.get("fats_grams", 0) if goals else 0) - summary.get("total_fats", 0))
    else:
        remaining_protein = goals.get("protein_grams") if goals else None
        remaining_carbs = goals.get("carbs_grams") if goals else None
        remaining_fats = goals.get("fats_grams") if goals else None
    
    suggestions = generate_meal_suggestions(
        user_id=user_id,
        meal_type=meal_type,
        remaining_calories=remaining_calories,
        remaining_protein=remaining_protein,
        remaining_carbs=remaining_carbs,
        remaining_fats=remaining_fats,
        limit=15,  # Increased limit for better variety
        date_str=date_str
    )
    
    # Get macro gap analysis for frontend display
    from .meal_suggestions_engine import analyze_macro_gaps
    macro_gaps = analyze_macro_gaps(user_id, date_str, goals)
    
    return {
        "suggestions": suggestions,
        "macro_gaps": macro_gaps,
        "target_calories": target_calories,
        "remaining_calories": remaining_calories
    }

@app.get("/nutrition/favorites")
async def get_favorite_meals(
    user_id: str = Depends(get_current_user_id)
):
    """Get favorite meals"""
    from .meal_suggestions_engine import load_favorite_meals
    
    favorites = load_favorite_meals(user_id)
    return {"favorites": favorites}

@app.post("/nutrition/favorites")
async def save_favorite_meal(
    meal_data: dict,
    user_id: str = Depends(get_current_user_id)
):
    """Save a favorite meal"""
    from .meal_suggestions_engine import FavoriteMeal, save_favorite_meal
    from datetime import datetime
    
    meal = FavoriteMeal(
        id=meal_data.get("id") or f"favorite_{datetime.now().timestamp()}",
        user_id=user_id,
        name=meal_data.get("name", "Favorite Meal"),
        food_entries=meal_data.get("food_entries", []),
        total_calories=meal_data.get("total_calories", 0),
        total_protein=meal_data.get("total_protein", 0),
        total_carbs=meal_data.get("total_carbs", 0),
        total_fats=meal_data.get("total_fats", 0),
        meal_type=meal_data.get("meal_type", "breakfast"),
        created_at=datetime.now().isoformat(),
        times_logged=meal_data.get("times_logged", 0)
    )
    
    success = save_favorite_meal(user_id, meal)
    if success:
        return {"status": "success", "meal": meal.model_dump()}
    else:
        raise HTTPException(status_code=500, detail="Failed to save favorite meal")

@app.get("/nutrition/meal-plan")
async def get_meal_plan(
    week_start: Optional[str] = None,
    user_id: str = Depends(get_current_user_id)
):
    """Get weekly meal plan"""
    from .meal_suggestions_engine import load_meal_plan
    from datetime import datetime, timedelta
    
    # If no week_start provided, use current week (Monday)
    if not week_start:
        today = datetime.now()
        days_since_monday = today.weekday()
        monday = today - timedelta(days=days_since_monday)
        week_start = monday.strftime("%Y-%m-%d")
    
    plan = load_meal_plan(user_id, week_start)
    if not plan:
        return {"plan": None}
    
    return {"plan": plan}

@app.post("/nutrition/meal-plan")
async def save_meal_plan(
    plan_data: dict,
    user_id: str = Depends(get_current_user_id)
):
    """Save weekly meal plan"""
    from .meal_suggestions_engine import MealPlan, save_meal_plan
    from datetime import datetime
    
    plan = MealPlan(
        user_id=user_id,
        week_start=plan_data.get("week_start"),
        meals=plan_data.get("meals", {}),
        created_at=plan_data.get("created_at", datetime.now().isoformat()),
        updated_at=datetime.now().isoformat()
    )
    
    success = save_meal_plan(user_id, plan)
    if success:
        return {"status": "success", "plan": plan.model_dump()}
    else:
        raise HTTPException(status_code=500, detail="Failed to save meal plan")

@app.get("/nutrition/shopping-list")
async def get_shopping_list(
    week_start: Optional[str] = None,
    user_id: str = Depends(get_current_user_id)
):
    """Generate shopping list from meal plan"""
    from .meal_suggestions_engine import generate_shopping_list
    from datetime import datetime, timedelta
    
    # If no week_start provided, use current week (Monday)
    if not week_start:
        today = datetime.now()
        days_since_monday = today.weekday()
        monday = today - timedelta(days=days_since_monday)
        week_start = monday.strftime("%Y-%m-%d")
    
    shopping_list = generate_shopping_list(user_id, week_start)
    return {"shopping_list": shopping_list}

# --- Nutrition Analytics Endpoints ---

@app.get("/nutrition/analytics/predictions")
async def get_nutrition_predictions(
    days: int = 30,
    user_id: str = Depends(get_current_user_id)
):
    """Get predictive analytics"""
    from .nutrition_analytics_engine import calculate_predictions
    
    predictions = calculate_predictions(user_id, days=days)
    return predictions

@app.get("/nutrition/analytics/correlations")
async def get_nutrition_correlations(
    days: int = 30,
    user_id: str = Depends(get_current_user_id)
):
    """Get correlation data"""
    from .nutrition_analytics_engine import calculate_correlations
    
    correlations = calculate_correlations(user_id, days=days)
    return correlations

@app.get("/nutrition/analytics/reports")
async def get_nutrition_reports(
    period: str = "weekly",  # weekly or monthly
    user_id: str = Depends(get_current_user_id)
):
    """Get weekly/monthly reports"""
    from .nutrition_analytics_engine import generate_report
    
    report = generate_report(user_id, period=period)
    return report

@app.get("/nutrition/analytics/streaks")
async def get_nutrition_streaks(
    user_id: str = Depends(get_current_user_id)
):
    """Get streak data"""
    from .nutrition_analytics_engine import calculate_streaks
    
    streaks = calculate_streaks(user_id)
    return streaks

@app.get("/nutrition/analytics/insights")
async def get_nutrition_insights(
    days: int = 30,
    user_id: str = Depends(get_current_user_id)
):
    """Get 'what's working' insights"""
    from .nutrition_analytics_engine import generate_insights
    
    insights = generate_insights(user_id, days=days)
    return insights

# --- AI Coaching Endpoints ---

@app.get("/coaching/daily-recommendations")
async def get_daily_recommendations(
    date: Optional[str] = None,
    user_id: str = Depends(get_current_user_id)
):
    """Get daily personalized recommendations"""
    from .ai_coaching_engine import generate_daily_recommendations
    
    recommendations = generate_daily_recommendations(user_id, date)
    return {
        "recommendations": [rec.model_dump() for rec in recommendations],
        "date": date or datetime.now().strftime("%Y-%m-%d")
    }

@app.get("/coaching/weekly-plan")
async def get_weekly_plan(
    week_start: Optional[str] = None,
    user_id: str = Depends(get_current_user_id)
):
    """Get personalized weekly plan"""
    from .ai_coaching_engine import generate_weekly_plan
    
    plan = generate_weekly_plan(user_id, week_start)
    return plan.model_dump()

@app.get("/coaching/analysis")
async def get_wellness_analysis(
    days: int = 7,
    user_id: str = Depends(get_current_user_id)
):
    """Get comprehensive wellness analysis"""
    from .ai_coaching_engine import analyze_wellness_data
    
    analysis = analyze_wellness_data(user_id, days=days)
    return analysis

@app.post("/coaching/feedback")
async def submit_coaching_feedback(
    feedback_data: dict,
    user_id: str = Depends(get_current_user_id)
):
    """Submit feedback on a recommendation"""
    from .ai_coaching_engine import save_coaching_feedback
    
    recommendation_id = feedback_data.get("recommendation_id")
    feedback = feedback_data.get("feedback", {})
    
    success = save_coaching_feedback(user_id, recommendation_id, feedback)
    if success:
        return {"status": "success", "message": "Feedback saved"}
    else:
        raise HTTPException(status_code=500, detail="Failed to save feedback")

@app.get("/coaching/progress")
async def get_coaching_progress(
    days: int = 30,
    user_id: str = Depends(get_current_user_id)
):
    """Get coaching effectiveness metrics"""
    from .ai_coaching_engine import analyze_wellness_data
    import os
    
    # Get feedback data
    feedback_file = f"data/{user_id}/coaching_feedback.json"
    feedback_count = 0
    positive_feedback = 0
    
    if os.path.exists(feedback_file):
        try:
            with open(feedback_file, "r") as f:
                all_feedback = json.load(f)
                feedback_count = len(all_feedback)
                positive_feedback = sum(1 for f in all_feedback if f.get("feedback", {}).get("helpful", False))
        except:
            pass
    
    # Get current analysis
    analysis = analyze_wellness_data(user_id, days=days)
    
    return {
        "overall_score": analysis.get("overall_score", 0),
        "feedback_count": feedback_count,
        "positive_feedback_rate": (positive_feedback / feedback_count * 100) if feedback_count > 0 else 0,
        "trend": "improving" if analysis.get("overall_score", 0) >= 70 else "needs_improvement"
    }

# --- Premium Subscription Endpoints ---

@app.get("/premium/status")
async def get_premium_status(
    user_id: str = Depends(get_current_user_id)
):
    """Get user's premium subscription status"""
    import os
    
    premium_file = f"data/{user_id}/premium.json"
    if os.path.exists(premium_file):
        try:
            with open(premium_file, "r") as f:
                premium_data = json.load(f)
                return {
                    "is_premium": premium_data.get("is_premium", False),
                    "expires_at": premium_data.get("expires_at"),
                    "plan": premium_data.get("plan", "free")
                }
        except:
            pass
    
    return {
        "is_premium": False,
        "expires_at": None,
        "plan": "free"
    }

@app.post("/premium/subscribe")
async def subscribe_premium(
    subscription_data: dict,
    user_id: str = Depends(get_current_user_id)
):
    """Subscribe to premium (simplified - in production, integrate with payment processor)"""
    import os
    
    plan = subscription_data.get("plan", "monthly")  # "monthly" or "yearly"
    months = 1 if plan == "monthly" else 12
    
    premium_data = {
        "is_premium": True,
        "plan": plan,
        "subscribed_at": datetime.now().isoformat(),
        "expires_at": (datetime.now() + timedelta(days=months * 30)).isoformat()
    }
    
    premium_file = f"data/{user_id}/premium.json"
    os.makedirs(os.path.dirname(premium_file), exist_ok=True)
    
    with open(premium_file, "w") as f:
        json.dump(premium_data, f, indent=2)
    
    return {
        "status": "success",
        "message": "Premium subscription activated",
        "premium": premium_data
    }

# --- Community & Gamification Endpoints ---

@app.get("/community/challenges")
async def get_challenges(
    user_id: str = Depends(get_current_user_id)
):
    """Get all available challenges"""
    from .community_engine import load_challenges
    
    challenges = load_challenges()
    return {"challenges": challenges}

@app.post("/community/challenges/create")
async def create_challenge_endpoint(
    challenge_data: dict,
    user_id: str = Depends(get_current_user_id)
):
    """Create a new challenge"""
    from .community_engine import create_challenge
    
    challenge_data["created_by"] = user_id
    challenge = create_challenge(challenge_data)
    return challenge.model_dump()

@app.post("/community/challenges/join")
async def join_challenge_endpoint(
    challenge_data: dict,
    user_id: str = Depends(get_current_user_id)
):
    """Join a challenge"""
    from .community_engine import join_challenge, add_points
    
    challenge_id = challenge_data.get("challenge_id")
    success = join_challenge(challenge_id, user_id)
    
    if success:
        # Award points for joining
        add_points(user_id, 50, "Joined challenge", "challenge")
        return {"status": "success", "message": "Joined challenge"}
    else:
        raise HTTPException(status_code=400, detail="Failed to join challenge")

@app.get("/community/challenges/my-challenges")
async def get_my_challenges(
    user_id: str = Depends(get_current_user_id)
):
    """Get challenges user is participating in"""
    from .community_engine import get_user_challenges
    
    challenges = get_user_challenges(user_id)
    return {"challenges": challenges}

@app.get("/community/challenges/{challenge_id}/leaderboard")
async def get_challenge_leaderboard(
    challenge_id: str,
    user_id: str = Depends(get_current_user_id)
):
    """Get leaderboard for a challenge"""
    from .community_engine import get_challenge_leaderboard
    
    leaderboard = get_challenge_leaderboard(challenge_id)
    return {"leaderboard": [entry for entry in leaderboard]}

@app.get("/community/leaderboard")
async def get_leaderboard(
    type: str = "global",  # "global", "friends"
    limit: int = 100,
    user_id: str = Depends(get_current_user_id)
):
    """Get leaderboard"""
    from .community_engine import get_global_leaderboard, get_friends_leaderboard
    
    if type == "friends":
        leaderboard = get_friends_leaderboard(user_id)
    else:
        leaderboard = get_global_leaderboard(limit)
    
    return {"leaderboard": leaderboard, "type": type}

@app.get("/community/points")
async def get_user_points(
    user_id: str = Depends(get_current_user_id)
):
    """Get user's points and level"""
    from .community_engine import load_user_points, calculate_level
    
    points = load_user_points(user_id)
    level = calculate_level(points)
    
    return {
        "points": points,
        "level": level,
        "points_to_next_level": (level * level * 100) - points
    }

@app.get("/community/achievements")
async def get_user_achievements(
    user_id: str = Depends(get_current_user_id)
):
    """Get user's achievements"""
    from .community_engine import load_achievements
    
    achievements = load_achievements(user_id)
    return {"achievements": achievements}

# --- Recipe & Meal Prep Endpoints ---

@app.get("/recipes")
async def search_recipes_endpoint(
    query: Optional[str] = None,
    cuisine: Optional[str] = None,
    difficulty: Optional[str] = None,
    tags: Optional[str] = None,  # Comma-separated
    max_prep_time: Optional[int] = None,
    min_rating: Optional[float] = None,
    limit: int = 50,
    user_id: str = Depends(get_current_user_id)
):
    """Search and filter recipes"""
    from .recipe_engine import search_recipes
    
    tag_list = tags.split(",") if tags else None
    recipes = search_recipes(
        query=query,
        cuisine=cuisine,
        difficulty=difficulty,
        tags=tag_list,
        max_prep_time=max_prep_time,
        min_rating=min_rating,
        limit=limit
    )
    
    return {"recipes": recipes}

@app.get("/recipes/{recipe_id}")
async def get_recipe_endpoint(
    recipe_id: str,
    user_id: str = Depends(get_current_user_id)
):
    """Get a specific recipe"""
    from .recipe_engine import get_recipe
    
    recipe = get_recipe(recipe_id)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    
    return recipe

@app.post("/recipes")
async def create_recipe_endpoint(
    recipe_data: dict,
    user_id: str = Depends(get_current_user_id)
):
    """Create a new recipe (user's custom recipe)"""
    from .recipe_engine import save_user_recipe
    
    try:
        recipe = save_user_recipe(user_id, recipe_data)
        return recipe
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create recipe: {str(e)}")

@app.get("/recipes/my")
async def get_my_recipes_endpoint(
    user_id: str = Depends(get_current_user_id)
):
    """Get user's custom recipes"""
    from .recipe_engine import get_user_recipes
    
    recipes = get_user_recipes(user_id)
    return {"recipes": recipes}

@app.put("/recipes/{recipe_id}")
async def update_recipe_endpoint(
    recipe_id: str,
    recipe_data: dict,
    user_id: str = Depends(get_current_user_id)
):
    """Update a user's recipe"""
    from .recipe_engine import update_user_recipe
    
    try:
        recipe = update_user_recipe(user_id, recipe_id, recipe_data)
        return recipe
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update recipe: {str(e)}")

@app.delete("/recipes/{recipe_id}")
async def delete_recipe_endpoint(
    recipe_id: str,
    user_id: str = Depends(get_current_user_id)
):
    """Delete a user's recipe"""
    from .recipe_engine import delete_user_recipe
    
    success = delete_user_recipe(user_id, recipe_id)
    if success:
        return {"status": "success", "message": "Recipe deleted"}
    else:
        raise HTTPException(status_code=404, detail="Recipe not found or you don't have permission to delete it")

@app.post("/recipes/calculate-nutrition")
async def calculate_recipe_nutrition_endpoint(
    ingredients_data: dict,
    user_id: str = Depends(get_current_user_id)
):
    """Calculate nutrition from ingredients (for preview)"""
    from .recipe_engine import calculate_recipe_nutrition
    
    ingredients = ingredients_data.get("ingredients", [])
    if not ingredients:
        raise HTTPException(status_code=400, detail="Ingredients list is required")
    
    try:
        nutrition = calculate_recipe_nutrition(ingredients)
        return nutrition
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to calculate nutrition: {str(e)}")

@app.post("/recipes/{recipe_id}/favorite")
async def favorite_recipe_endpoint(
    recipe_id: str,
    user_id: str = Depends(get_current_user_id)
):
    """Favorite a recipe"""
    from .recipe_engine import favorite_recipe
    
    success = favorite_recipe(user_id, recipe_id)
    if success:
        return {"status": "success", "message": "Recipe favorited"}
    else:
        return {"status": "already_favorited", "message": "Recipe already in favorites"}

@app.get("/recipes/favorites")
async def get_favorite_recipes(
    user_id: str = Depends(get_current_user_id)
):
    """Get user's favorite recipes"""
    from .recipe_engine import get_favorite_recipes
    
    recipes = get_favorite_recipes(user_id)
    return {"recipes": recipes}

@app.post("/meal-prep/plan")
async def create_meal_plan_endpoint(
    plan_data: dict,
    user_id: str = Depends(get_current_user_id)
):
    """Create or update a meal plan"""
    from .recipe_engine import create_meal_plan
    
    week_start = plan_data.get("week_start")
    meals = plan_data.get("meals", {})
    
    meal_plan = create_meal_plan(user_id, week_start, meals)
    return meal_plan.model_dump()

@app.get("/meal-prep/plan")
async def get_meal_plan_endpoint(
    week_start: Optional[str] = None,
    user_id: str = Depends(get_current_user_id)
):
    """Get user's meal plan"""
    from .recipe_engine import get_meal_plan
    
    meal_plan = get_meal_plan(user_id, week_start)
    if not meal_plan:
        return {"meal_plan": None}
    
    return {"meal_plan": meal_plan}

@app.post("/meal-prep/shopping-list")
async def generate_shopping_list_endpoint(
    shopping_data: dict,
    user_id: str = Depends(get_current_user_id)
):
    """Generate shopping list from meal plan"""
    from .recipe_engine import generate_shopping_list
    
    meal_plan_id = shopping_data.get("meal_plan_id")
    week_start = shopping_data.get("week_start")
    
    shopping_list = generate_shopping_list(user_id, meal_plan_id, week_start)
    return shopping_list.model_dump()

# --- Meal Template Endpoints ---

@app.get("/meal-templates/my")
async def get_user_meal_templates(
    category: Optional[str] = None,
    user_id: str = Depends(get_current_user_id)
):
    """Get user's meal templates, optionally filtered by category"""
    from .meal_template_engine import get_templates_by_category

    templates = get_templates_by_category(user_id, category)
    return {"templates": [t.model_dump() for t in templates]}

@app.post("/meal-templates")
async def create_meal_template_endpoint(
    template_data: dict,
    user_id: str = Depends(get_current_user_id)
):
    """Create a new meal template"""
    from .meal_template_engine import create_meal_template

    try:
        template = create_meal_template(user_id, template_data)
        return {"status": "success", "template": template.model_dump()}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.put("/meal-templates/{template_id}")
async def update_meal_template_endpoint(
    template_id: str,
    template_data: dict,
    user_id: str = Depends(get_current_user_id)
):
    """Update an existing meal template"""
    from .meal_template_engine import update_meal_template

    try:
        template = update_meal_template(user_id, template_id, template_data)
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        return {"status": "success", "template": template.model_dump()}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.delete("/meal-templates/{template_id}")
async def delete_meal_template_endpoint(
    template_id: str,
    user_id: str = Depends(get_current_user_id)
):
    """Delete a meal template"""
    from .meal_template_engine import delete_meal_template

    deleted = delete_meal_template(user_id, template_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Template not found")

    return {"status": "success", "message": "Template deleted"}

@app.post("/meal-templates/{template_id}/use")
async def use_meal_template_endpoint(
    template_id: str,
    user_id: str = Depends(get_current_user_id)
):
    """Increment usage count for a template (called when template is used)"""
    from .meal_template_engine import increment_template_usage

    increment_template_usage(user_id, template_id)
    return {"status": "success"}

@app.get("/meal-templates/stats")
async def get_meal_template_stats_endpoint(
    user_id: str = Depends(get_current_user_id)
):
    """Get statistics about user's meal templates"""
    from .meal_template_engine import get_template_stats

    stats = get_template_stats(user_id)
    return {"stats": stats}

@app.get("/meal-templates/search")
async def search_meal_templates_endpoint(
    query: str = "",
    category: Optional[str] = None,
    user_id: str = Depends(get_current_user_id)
):
    """Search meal templates by name/description"""
    from .meal_template_engine import search_templates

    templates = search_templates(user_id, query, category)
    return {"templates": [t.model_dump() for t in templates]}

@app.get("/meal-templates/recent")
async def get_recent_meal_templates_endpoint(
    limit: int = 5,
    user_id: str = Depends(get_current_user_id)
):
    """Get recently used meal templates"""
    from .meal_template_engine import get_recent_templates

    templates = get_recent_templates(user_id, limit)
    return {"templates": [t.model_dump() for t in templates]}

# --- Tasks Endpoints ---

@app.get("/tasks")
async def get_tasks(user_id: str = Depends(get_current_user_id)):
    """Get user's tasks"""
    from .tasks_engine import load_tasks
    
    tasks = load_tasks(user_id)
    return {"tasks": tasks}

@app.post("/tasks")
async def create_task(
    task_data: dict,
    user_id: str = Depends(get_current_user_id)
):
    """Create a new task"""
    from .tasks_engine import add_task, Task
    
    task = Task(
        id=task_data.get("id", f"task_{int(datetime.now().timestamp() * 1000)}"),
        title=task_data.get("title", ""),
        completed=task_data.get("completed", False),
        priority=task_data.get("priority", "medium"),
        dueDate=task_data.get("dueDate"),
        createdAt=task_data.get("createdAt", datetime.now().isoformat())
    )
    
    success = add_task(user_id, task)
    if success:
        return {"status": "success", "task": task.model_dump()}
    else:
        raise HTTPException(status_code=500, detail="Failed to create task")

@app.put("/tasks/{task_id}")
async def update_task_endpoint(
    task_id: str,
    task_data: dict,
    user_id: str = Depends(get_current_user_id)
):
    """Update a task"""
    from .tasks_engine import update_task
    
    success = update_task(user_id, task_id, task_data)
    if success:
        return {"status": "success"}
    else:
        raise HTTPException(status_code=404, detail="Task not found")

@app.delete("/tasks/{task_id}")
async def delete_task_endpoint(
    task_id: str,
    user_id: str = Depends(get_current_user_id)
):
    """Delete a task"""
    from .tasks_engine import delete_task
    
    success = delete_task(user_id, task_id)
    if success:
        return {"status": "success"}
    else:
        raise HTTPException(status_code=404, detail="Task not found")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
