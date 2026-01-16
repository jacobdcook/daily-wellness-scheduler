"""
Phase 29: Advanced Notification System & Smart Reminders
Handles notification scheduling, delivery, and smart reminder logic.
"""
import json
import os
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


def get_user_dir(user_id: str) -> str:
    """Get user data directory"""
    data_dir = Path("data") / user_id
    data_dir.mkdir(parents=True, exist_ok=True)
    return str(data_dir)


def load_notification_settings(user_id: str) -> Dict[str, Any]:
    """Load user notification preferences"""
    settings_file = os.path.join(get_user_dir(user_id), "notification_settings.json")
    if os.path.exists(settings_file):
        try:
            with open(settings_file, "r") as f:
                return json.load(f)
        except:
            pass
    
    # Default settings
    return {
        "enabled": True,
        "reminder_minutes_before": 5,  # Remind 5 minutes before scheduled time
        "missed_item_reminders": True,
        "missed_item_delay_minutes": 15,  # Remind 15 minutes after missed
        "quiet_hours": {
            "enabled": False,
            "start": "22:00",  # 10 PM
            "end": "07:00"     # 7 AM
        },
        "notification_types": {
            "upcoming_reminders": True,
            "missed_items": True,
            "daily_summary": True,
            "streak_reminders": True,
            "habit_reminders": True
        },
        "push_subscriptions": []  # Web Push API subscriptions
    }


def save_notification_settings(user_id: str, settings: Dict[str, Any]):
    """Save user notification preferences"""
    settings_file = os.path.join(get_user_dir(user_id), "notification_settings.json")
    with open(settings_file, "w") as f:
        json.dump(settings, f, indent=2)


def get_upcoming_notifications(user_id: str, lookahead_minutes: int = 60) -> List[Dict[str, Any]]:
    """
    Get notifications that should be sent in the next lookahead_minutes.
    Returns list of notifications to send.
    """
    from .main import load_schedule_from_file, load_progress_from_file
    from .habits_engine import load_habits, load_habit_entries
    
    schedule = load_schedule_from_file(user_id)
    progress = load_progress_from_file(user_id)
    settings = load_notification_settings(user_id)
    
    if not settings.get("enabled", True):
        return []
    
    notifications = []
    now = datetime.now()
    today_str = now.date().isoformat()
    today_schedule = schedule.get(today_str, [])
    
    # Check quiet hours
    quiet_hours = settings.get("quiet_hours", {})
    if quiet_hours.get("enabled", False):
        current_time = now.time()
        quiet_start = datetime.strptime(quiet_hours["start"], "%H:%M").time()
        quiet_end = datetime.strptime(quiet_hours["end"], "%H:%M").time()
        
        if quiet_start > quiet_end:  # Overnight quiet hours
            if current_time >= quiet_start or current_time < quiet_end:
                return []  # In quiet hours
        else:
            if quiet_start <= current_time < quiet_end:
                return []  # In quiet hours
    
    reminder_minutes = settings.get("reminder_minutes_before", 5)
    
    for item in today_schedule:
        item_data = item.get("item", {})
        if not item_data.get("enabled", True):
            continue
        
        item_id = item.get("id", "")
        scheduled_time_str = item.get("scheduled_time", "")
        
        if not scheduled_time_str:
            continue
        
        try:
            scheduled_time = datetime.fromisoformat(scheduled_time_str.replace("Z", "+00:00"))
            if scheduled_time.tzinfo:
                scheduled_time = scheduled_time.replace(tzinfo=None)
        except:
            continue
        
        # Check if already completed
        today_progress = progress.get(today_str, {})
        item_progress = today_progress.get(item_id, 0)
        if item_progress == 2:  # Completed
            continue
        
        # Check for upcoming reminder
        reminder_time = scheduled_time - timedelta(minutes=reminder_minutes)
        time_until_reminder = (reminder_time - now).total_seconds() / 60
        
        if 0 <= time_until_reminder <= lookahead_minutes:
            if settings.get("notification_types", {}).get("upcoming_reminders", True):
                notifications.append({
                    "type": "upcoming_reminder",
                    "item_id": item_id,
                    "item_name": item_data.get("name", "Supplement"),
                    "dose": item_data.get("dose", ""),
                    "scheduled_time": scheduled_time.isoformat(),
                    "reminder_time": reminder_time.isoformat(),
                    "title": f"Reminder: {item_data.get('name', 'Supplement')}",
                    "body": f"Time to take {item_data.get('name', 'supplement')} in {reminder_minutes} minutes",
                    "data": {
                        "item_id": item_id,
                        "scheduled_time": scheduled_time.isoformat(),
                        "type": "reminder"
                    }
                })
        
        # Check for missed item
        if now > scheduled_time:
            time_since_scheduled = (now - scheduled_time).total_seconds() / 60
            missed_delay = settings.get("missed_item_delay_minutes", 15)
            
            if missed_delay <= time_since_scheduled <= (missed_delay + lookahead_minutes):
                # Check if we've already sent a missed notification for this item today
                sent_notifications_file = os.path.join(get_user_dir(user_id), "sent_notifications.json")
                sent_notifications = {}
                if os.path.exists(sent_notifications_file):
                    try:
                        with open(sent_notifications_file, "r") as f:
                            sent_notifications = json.load(f)
                    except:
                        pass
                
                notification_key = f"{today_str}_{item_id}_missed"
                if notification_key not in sent_notifications.get("missed", []):
                    if settings.get("notification_types", {}).get("missed_items", True):
                        notifications.append({
                            "type": "missed_item",
                            "item_id": item_id,
                            "item_name": item_data.get("name", "Supplement"),
                            "dose": item_data.get("dose", ""),
                            "scheduled_time": scheduled_time.isoformat(),
                            "title": f"Missed: {item_data.get('name', 'Supplement')}",
                            "body": f"You missed {item_data.get('name', 'supplement')} scheduled for {scheduled_time.strftime('%I:%M %p')}",
                            "data": {
                                "item_id": item_id,
                                "scheduled_time": scheduled_time.isoformat(),
                                "type": "missed"
                            }
                        })
    
    # Check for habit reminders
    if settings.get("notification_types", {}).get("habit_reminders", True):
        try:
            habits = load_habits(user_id)
            habit_entries = load_habit_entries(user_id, days=1)  # Just today's entries
            
            # Get today's completed habit IDs
            today_completed_habits = {
                entry.get("habit_id") 
                for entry in habit_entries 
                if entry.get("date") == today_str and entry.get("completed", False)
            }
            
            for habit in habits:
                if not habit.get("enabled", True):
                    continue
                
                if not habit.get("reminder_enabled", False):
                    continue
                
                reminder_time_str = habit.get("reminder_time")
                if not reminder_time_str:
                    continue
                
                # Skip if already completed today
                if habit.get("id") in today_completed_habits:
                    continue
                
                try:
                    # Parse reminder time (HH:MM format)
                    reminder_hour, reminder_min = map(int, reminder_time_str.split(":"))
                    reminder_datetime = now.replace(hour=reminder_hour, minute=reminder_min, second=0, microsecond=0)
                    
                    # If reminder time has passed today, check for tomorrow
                    if reminder_datetime < now:
                        reminder_datetime += timedelta(days=1)
                    
                    # Check if reminder is within lookahead window
                    time_until_reminder = (reminder_datetime - now).total_seconds() / 60
                    
                    if 0 <= time_until_reminder <= lookahead_minutes:
                        # Check if we've already sent a reminder for this habit today
                        sent_notifications_file = os.path.join(get_user_dir(user_id), "sent_notifications.json")
                        sent_notifications = {}
                        if os.path.exists(sent_notifications_file):
                            try:
                                with open(sent_notifications_file, "r") as f:
                                    sent_notifications = json.load(f)
                            except:
                                pass
                        
                        notification_key = f"{today_str}_{habit.get('id')}_habit_reminder"
                        if notification_key not in sent_notifications.get("habit_reminders", []):
                            notifications.append({
                                "type": "habit_reminder",
                                "habit_id": habit.get("id"),
                                "habit_name": habit.get("name", "Habit"),
                                "reminder_time": reminder_datetime.isoformat(),
                                "title": f"Habit Reminder: {habit.get('name', 'Habit')}",
                                "body": f"Time to check in on your habit: {habit.get('name', 'habit')}",
                                "data": {
                                    "habit_id": habit.get("id"),
                                    "type": "habit_reminder",
                                    "reminder_time": reminder_datetime.isoformat()
                                }
                            })
                except Exception as e:
                    print(f"Error processing habit reminder for {habit.get('id')}: {e}")
                    continue
        except Exception as e:
            print(f"Error loading habits for notifications: {e}")
    
    return notifications


def mark_notification_sent(user_id: str, notification_type: str, item_id: str, date: str):
    """Mark a notification as sent to avoid duplicates"""
    sent_notifications_file = os.path.join(get_user_dir(user_id), "sent_notifications.json")
    sent_notifications = {}
    if os.path.exists(sent_notifications_file):
        try:
            with open(sent_notifications_file, "r") as f:
                sent_notifications = json.load(f)
        except:
            pass
    
    # Handle different notification types
    if notification_type == "habit_reminder":
        if "habit_reminders" not in sent_notifications:
            sent_notifications["habit_reminders"] = []
        key = f"{date}_{item_id}_habit_reminder"
        if key not in sent_notifications["habit_reminders"]:
            sent_notifications["habit_reminders"].append(key)
    else:
        if notification_type not in sent_notifications:
            sent_notifications[notification_type] = []
        key = f"{date}_{item_id}_{notification_type}"
        if key not in sent_notifications[notification_type]:
            sent_notifications[notification_type].append(key)
    
    # Clean up old entries (keep last 7 days)
    cutoff_date = (datetime.now() - timedelta(days=7)).date().isoformat()
    for notif_type in sent_notifications:
        if isinstance(sent_notifications[notif_type], list):
            sent_notifications[notif_type] = [
                k for k in sent_notifications[notif_type]
                if k.split("_")[0] >= cutoff_date
            ]
    
    with open(sent_notifications_file, "w") as f:
        json.dump(sent_notifications, f, indent=2)


def get_daily_summary_notification(user_id: str) -> Optional[Dict[str, Any]]:
    """Generate daily summary notification"""
    from .main import load_schedule_from_file, load_progress_from_file
    
    schedule = load_schedule_from_file(user_id)
    progress = load_progress_from_file(user_id)
    settings = load_notification_settings(user_id)
    
    if not settings.get("notification_types", {}).get("daily_summary", True):
        return None
    
    today_str = datetime.now().date().isoformat()
    today_schedule = schedule.get(today_str, [])
    today_progress = progress.get(today_str, {})
    
    total_items = len([item for item in today_schedule if item.get("item", {}).get("enabled", True)])
    completed_items = sum(1 for item in today_schedule 
                         if item.get("item", {}).get("enabled", True) and 
                         today_progress.get(item.get("id", ""), 0) == 2)
    
    if total_items == 0:
        return None
    
    completion_rate = (completed_items / total_items) * 100
    
    # Send summary at end of day (9 PM)
    summary_time = datetime.now().replace(hour=21, minute=0, second=0, microsecond=0)
    now = datetime.now()
    
    if summary_time <= now <= summary_time + timedelta(minutes=60):
        return {
            "type": "daily_summary",
            "title": "Daily Summary",
            "body": f"You completed {completed_items}/{total_items} items today ({completion_rate:.0f}%)",
            "data": {
                "type": "summary",
                "completed": completed_items,
                "total": total_items,
                "rate": completion_rate
            }
        }
    
    return None


def add_push_subscription(user_id: str, subscription: Dict[str, Any]):
    """Add a Web Push API subscription"""
    settings = load_notification_settings(user_id)
    subscriptions = settings.get("push_subscriptions", [])
    
    # Check if subscription already exists
    endpoint = subscription.get("endpoint", "")
    for sub in subscriptions:
        if sub.get("endpoint") == endpoint:
            return  # Already exists
    
    subscriptions.append({
        "endpoint": subscription.get("endpoint"),
        "keys": subscription.get("keys", {}),
        "created_at": datetime.now().isoformat()
    })
    
    settings["push_subscriptions"] = subscriptions
    save_notification_settings(user_id, settings)


def remove_push_subscription(user_id: str, endpoint: str):
    """Remove a Web Push API subscription"""
    settings = load_notification_settings(user_id)
    subscriptions = settings.get("push_subscriptions", [])
    settings["push_subscriptions"] = [s for s in subscriptions if s.get("endpoint") != endpoint]
    save_notification_settings(user_id, settings)


def send_push_notification(subscription: Dict[str, Any], title: str, body: str, data: Optional[Dict[str, Any]] = None):
    """
    Send a push notification to a subscription.
    Requires pywebpush package and VAPID keys in environment.
    """
    try:
        from pywebpush import webpush, WebPushException
        
        vapid_private_key = os.getenv("VAPID_PRIVATE_KEY")
        vapid_public_key = os.getenv("VAPID_PUBLIC_KEY")
        vapid_email = os.getenv("VAPID_EMAIL", "mailto:wellness@example.com")
        
        if not vapid_private_key or not vapid_public_key:
            print("Warning: VAPID keys not configured. Cannot send push notifications.")
            return False
        
        subscription_info = {
            "endpoint": subscription.get("endpoint"),
            "keys": {
                "p256dh": subscription.get("keys", {}).get("p256dh"),
                "auth": subscription.get("keys", {}).get("auth")
            }
        }
        
        vapid_claims = {
            "sub": vapid_email
        }
        
        payload = json.dumps({
            "title": title,
            "body": body,
            "icon": "/icon.svg",
            "badge": "/icon.svg",
            "data": data or {}
        })
        
        webpush(
            subscription_info=subscription_info,
            data=payload,
            vapid_private_key=vapid_private_key,
            vapid_claims=vapid_claims
        )
        
        return True
    except ImportError:
        print("Warning: pywebpush not installed. Run: pip install pywebpush")
        return False
    except WebPushException as e:
        print(f"Error sending push notification: {e}")
        if e.response and e.response.status_code == 410:
            # Subscription expired, should be removed
            return "expired"
        return False
    except Exception as e:
        print(f"Error sending push notification: {e}")
        return False


def send_notifications_to_user(user_id: str, notifications: List[Dict[str, Any]]):
    """
    Send multiple notifications to all of a user's push subscriptions.
    """
    settings = load_notification_settings(user_id)
    subscriptions = settings.get("push_subscriptions", [])
    
    if not subscriptions:
        return
    
    expired_endpoints = []
    
    for notification in notifications:
        for subscription in subscriptions:
            result = send_push_notification(
                subscription,
                notification.get("title", "Wellness Reminder"),
                notification.get("body", ""),
                notification.get("data", {})
            )
            
            if result == "expired":
                expired_endpoints.append(subscription.get("endpoint"))
    
    # Remove expired subscriptions
    for endpoint in expired_endpoints:
        remove_push_subscription(user_id, endpoint)

