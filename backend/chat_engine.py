import os
import json
import uuid
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
try:
    from groq import Groq
except ImportError:
    Groq = None

from .models import UserSettings
from .scheduler_engine import SupplementScheduler

class ChatEngine:
    def __init__(self):
        self.api_key = "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"
        
        if Groq:
            self.client = Groq(api_key=self.api_key)
        else:
            self.client = None

    def _resolve_path(self, user_id: str, filename: str) -> str:
        if user_id:
            base_dir = os.path.join("data", user_id)
        else:
            base_dir = "."
        return os.path.join(base_dir, filename)

    def _ensure_parent_dir(self, path: str):
        directory = os.path.dirname(path)
        if directory and not os.path.exists(directory):
            os.makedirs(directory, exist_ok=True)

    def _load_schedule_file(self, user_id: str) -> Dict[str, Any]:
        path = self._resolve_path(user_id, "schedule.json")
        try:
            with open(path, "r") as f:
                return json.load(f)
        except FileNotFoundError:
            return {}
        except Exception as e:
            print(f"Error loading schedule for {user_id}: {e}")
            return {}

    def _save_schedule_file(self, schedule: Dict[str, Any], user_id: str):
        path = self._resolve_path(user_id, "schedule.json")
        self._ensure_parent_dir(path)
        with open(path, "w") as f:
            json.dump(schedule, f, indent=2)

    def _load_settings_file(self, user_id: str) -> Dict[str, Any]:
        path = self._resolve_path(user_id, "settings.json")
        try:
            with open(path, "r") as f:
                return json.load(f)
        except FileNotFoundError:
            return {}
        except Exception as e:
            print(f"Error loading settings for {user_id}: {e}")
            return {}

    def _save_settings_file(self, settings: Dict[str, Any], user_id: str):
        path = self._resolve_path(user_id, "settings.json")
        self._ensure_parent_dir(path)
        with open(path, "w") as f:
            json.dump(settings, f, indent=2)

    def _regenerate_schedule(self, user_id: str):
        """Regenerate schedule based on settings"""
        try:
            settings_dict = self._load_settings_file(user_id)
            if not settings_dict:
                settings_dict = UserSettings().model_dump()

            settings = UserSettings(**settings_dict)
            scheduler = SupplementScheduler(settings)
            
            # Generate
            generated = scheduler.generate_schedule(datetime.now(), weeks=6)
            
            # Convert to JSON
            serializable_schedule = {}
            for date_str, items in generated.items():
                # Convert date_str to string if it's a date object (just in case)
                if isinstance(date_str, (datetime, datetime.date)):
                    date_str = date_str.isoformat()
                if isinstance(date_str, datetime.date):
                     date_str = date_str.strftime("%Y-%m-%d")

                serializable_schedule[date_str] = [item.model_dump() for item in items]
                
            self._save_schedule_file(serializable_schedule, user_id)
            return True
        except Exception as e:
            print(f"AI Regen Error: {e}")
            return False

    def add_item_to_schedule(
        self,
        user_id: str,
        date: str,
        name: str,
        time: str,
        dose: str = "",
        notes: str = "",
        optional: bool = False,
        caloric: bool = False
    ):
        # Validate name - reject placeholder values
        if not name or name.strip().lower() in ["item_name", "item name", "name", "supplement", "item"]:
            return f"Error: Invalid item name '{name}'. Please provide the actual supplement/item name (e.g. 'Omega-3', 'Magnesium', 'Probiotic')."
        
        schedule = self._load_schedule_file(user_id)
        if date not in schedule:
            schedule[date] = []
        
        dt_str = f"{date}T{time}:00"
        
        new_item = {
            "id": str(uuid.uuid4()),
            "scheduled_time": dt_str,
            "day_type": "manual",
            "item": {
                "name": name,
                "dosage": dose,
                "notes": notes,
                "unit": "",
                "type": "activity", 
                "caloric": caloric,
                "optional": optional
            }
        }
        
        schedule[date].append(new_item)
        try:
            schedule[date].sort(key=lambda x: x["scheduled_time"])
        except: pass
        
        self._save_schedule_file(schedule, user_id)
        return f"Successfully added {name} at {time} on {date}. Please refresh the schedule."

    def add_recurring_item(
        self,
        user_id: str,
        name: str,
        time: str,
        days: List[str],
        dose: str = "",
        notes: str = "Added by AI",
        optional: bool = False,
        caloric: bool = False
    ):
        settings = self._load_settings_file(user_id)
        if "custom_items" not in settings:
            settings["custom_items"] = []
            
        new_item = {
            "id": str(uuid.uuid4()),
            "name": name,
            "time": time,
            "dose": dose,
            "notes": notes,
            "enabled": True,
            "days": days,
            "optional": optional,
            "caloric": caloric
        }
        
        settings["custom_items"].append(new_item)
        self._save_settings_file(settings, user_id)
        
        # Auto-regenerate
        if self._regenerate_schedule(user_id):
            return f"Added recurring item '{name}' on {', '.join(days)} at {time}. I have regenerated your schedule to reflect this."
        else:
            return f"Added recurring item '{name}', but failed to regenerate schedule automatically. Please check settings."

    def reschedule_item(self, user_id: str, date: str, item_name: str, new_time: str):
        schedule = self._load_schedule_file(user_id)
        if date not in schedule:
            return f"No items found for {date}."
            
        target_item = None
        for item in schedule[date]:
            # Fuzzy match name
            if item_name.lower() in item["item"]["name"].lower():
                target_item = item
                break
        
        if target_item:
            target_item["scheduled_time"] = f"{date}T{new_time}:00"
            target_item["shifted"] = True
            target_item["shift_reason"] = "Moved by AI"
            
            try:
                schedule[date].sort(key=lambda x: x["scheduled_time"])
            except: pass
            
            self._save_schedule_file(schedule, user_id)
            return f"Moved {target_item['item']['name']} to {new_time}."
        
        return f"Could not find item '{item_name}' on {date}."

    def remove_item_from_schedule(self, user_id: str, date: str, item_name: str, remove_all_dates: bool = False, remove_all: bool = True):
        """
        Remove items from schedule.
        - date: Specific date to remove from (YYYY-MM-DD)
        - item_name: Name of item to remove
        - remove_all_dates: If True, remove from ALL dates in schedule. If False, only remove from the specified date.
        - remove_all: If True and remove_all_dates=False, remove all matches on that date. If False, remove only first match.
        """
        if not item_name or not item_name.strip():
            return "Please provide a valid item name to remove."

        # Fix: ensure booleans are actually booleans
        if isinstance(remove_all_dates, str):
            remove_all_dates = remove_all_dates.lower() == "true"
        if isinstance(remove_all, str):
            remove_all = remove_all.lower() == "true"

        schedule = self._load_schedule_file(user_id)
        
        if remove_all_dates:
            # Remove from ALL dates
            total_removed = 0
            dates_to_remove = []
            for schedule_date, items in schedule.items():
                filtered_items = []
                date_removed = 0
                for item in items:
                    name = item.get("item", {}).get("name", "")
                    if item_name.lower() in name.lower():
                        date_removed += 1
                        total_removed += 1
                        continue  # Skip this item
                    filtered_items.append(item)
                
                if date_removed > 0:
                    if filtered_items:
                        schedule[schedule_date] = filtered_items
                    else:
                        dates_to_remove.append(schedule_date)
            
            for date_to_remove in dates_to_remove:
                del schedule[date_to_remove]
            
            self._save_schedule_file(schedule, user_id)
            return f"Removed {total_removed} item(s) matching '{item_name}' from all dates in your schedule."
        else:
            # Remove only from specified date
            if date not in schedule:
                return f"No items found for {date}."
            
            items = schedule[date]
            removed = 0
            filtered_items = []
            for item in items:
                name = item.get("item", {}).get("name", "")
                if item_name.lower() in name.lower():
                    removed += 1
                    if remove_all:
                        # Remove every match on this date (skip adding to filtered_items)
                        continue
                    elif removed == 1:
                        # Only the first match should be removed (skip adding)
                        continue
                    else:
                        # subsequent matches should be kept if not removing all
                        filtered_items.append(item)
                        continue
                filtered_items.append(item)
            
            if removed == 0:
                return f"Could not find any items matching '{item_name}' on {date}."
            
            if filtered_items:
                schedule[date] = filtered_items
            else:
                del schedule[date]
            
            self._save_schedule_file(schedule, user_id)
            summary = f"Removed {removed} item(s) matching '{item_name}' on {date} only."
            return summary

    def remove_recurring_item(self, user_id: str, name: str, remove_all: bool = True):
        if not name or not name.strip():
            return "Please provide a valid item name to remove."

        # Fix: ensure remove_all is a boolean, not a string "true"/"false"
        if isinstance(remove_all, str):
            remove_all = remove_all.lower() == "true"

        settings = self._load_settings_file(user_id)
        custom_items = settings.get("custom_items", [])
        if not custom_items:
            return f"No recurring items found to remove."
        
        remaining = []
        removed = 0
        for item in custom_items:
            item_name = item.get("name", "")
            if name.lower() in item_name.lower():
                removed += 1
                if remove_all:
                    continue
                if removed == 1:
                    # remove only the first occurrence
                    continue
                # keep subsequent matches when not removing all
                remaining.append(item)
                continue
            remaining.append(item)
        
        if removed == 0:
            return f"Could not find any recurring items matching '{name}'."
        
        settings["custom_items"] = remaining
        self._save_settings_file(settings, user_id)
        
        if not self._regenerate_schedule(user_id):
            return f"Removed {removed} recurring item(s) named '{name}', but failed to regenerate the schedule automatically. Please regenerate manually."
        
        return f"Removed {removed} recurring item(s) named '{name}'. Your schedule has been updated."

    def chat(self, message: str, context: Dict[str, Any], user_id: str, chat_history: Optional[List[Dict[str, Any]]] = None) -> str:
        if not self.client:
            return "Error: Groq client not initialized."

        system_prompt = self._build_system_prompt(context)
        
        tools = [
            {
                "type": "function",
                "function": {
                    "name": "add_item_to_schedule",
                    "description": "Add a ONE-OFF item to a specific date (e.g. 'Soccer tomorrow'). IMPORTANT: The 'name' parameter must be the ACTUAL supplement/item name (e.g. 'Omega-3', 'Magnesium Glycinate'), NOT a placeholder like 'item_name' or 'supplement'.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "date": {"type": "string", "description": "YYYY-MM-DD"},
                            "name": {"type": "string", "description": "ACTUAL supplement/item name (e.g. 'Omega-3 + D3/K2', 'PepZin GI'). DO NOT use placeholders like 'item_name', 'supplement', or 'name'."},
                            "time": {"type": "string", "description": "HH:MM 24h format"},
                            "dose": {"type": "string", "description": "Dosage information"},
                            "notes": {"type": "string", "description": "Additional notes"},
                            "optional": {"type": "boolean", "description": "Marks the item as optional"},
                            "caloric": {"type": "boolean", "description": "Set to true if the item has calories/breaks a fast"}
                        },
                        "required": ["date", "name", "time"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "add_recurring_item",
                    "description": "Add a RECURRING item (e.g. 'Soccer every Tuesday').",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string"},
                            "time": {"type": "string", "description": "HH:MM 24h"},
                            "days": {
                                "type": "array",
                                "items": {"type": "string", "enum": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]},
                                "description": "List of days"
                            },
                            "dose": {"type": "string"},
                            "notes": {"type": "string"},
                            "optional": {"type": "boolean"},
                            "caloric": {"type": "boolean"}
                        },
                        "required": ["name", "time", "days"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "reschedule_item",
                    "description": "Move/Reschedule an existing item on a specific date.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "date": {"type": "string", "description": "YYYY-MM-DD"},
                            "item_name": {"type": "string", "description": "Name of item to move"},
                            "new_time": {"type": "string", "description": "HH:MM 24h"}
                        },
                        "required": ["date", "item_name", "new_time"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "remove_item_from_schedule",
                    "description": "Remove one-off items on a specific date.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "date": {"type": "string", "description": "YYYY-MM-DD - the date to remove from. Use today's date for single-day removals."},
                            "item_name": {"type": "string", "description": "Name to match"},
                            "remove_all_dates": {"type": "boolean", "description": "If true, remove from ALL dates in schedule. If false, only remove from the specified date. Default false - only remove from that one date."},
                            "remove_all": {"type": "boolean", "description": "If remove_all_dates is false, remove every match on that date (default true). If false, remove only first match."}
                        },
                        "required": ["date", "item_name"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "remove_recurring_item",
                    "description": "Remove or disable recurring custom routines.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string", "description": "Name of the recurring item"},
                            "remove_all": {"type": "boolean", "description": "Remove every match (default true)"}
                        },
                        "required": ["name"]
                    }
                }
            }
        ]
        
        # Build messages with history if available
        messages = [{"role": "system", "content": system_prompt}]
        
        # Add recent chat history (last 10 messages) to give AI context
        if chat_history:
            # Convert history format to API format, limit to last 10 messages
            recent_history = chat_history[-10:] if len(chat_history) > 10 else chat_history
            for hist_item in recent_history:
                role = hist_item.get("role", "")
                content = hist_item.get("content", "")
                if role in ["user", "assistant"] and content:
                    messages.append({"role": role, "content": content})
        
        # Add current message
        messages.append({"role": "user", "content": message})

        try:
            completion = self.client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=messages,
                tools=tools,
                tool_choice="auto",
                temperature=0.7,
                max_tokens=1024,
            )
            
            response_message = completion.choices[0].message
            tool_calls = response_message.tool_calls

            if tool_calls:
                messages.append(response_message)
                
                for tool_call in tool_calls:
                    function_name = tool_call.function.name
                    function_args = json.loads(tool_call.function.arguments)
                    
                    tool_result = ""
                    try:
                        if function_name == "add_item_to_schedule":
                            tool_result = self.add_item_to_schedule(
                                user_id,
                                function_args.get("date"),
                                function_args.get("name"),
                                function_args.get("time"),
                                function_args.get("dose", ""),
                                function_args.get("notes", ""),
                                function_args.get("optional", False),
                                function_args.get("caloric", False)
                            )
                        elif function_name == "add_recurring_item":
                            tool_result = self.add_recurring_item(
                                user_id,
                                function_args.get("name"),
                                function_args.get("time"),
                                function_args.get("days", []),
                                function_args.get("dose", ""),
                                function_args.get("notes", "Added by AI"),
                                function_args.get("optional", False),
                                function_args.get("caloric", False)
                            )
                        elif function_name == "reschedule_item":
                            tool_result = self.reschedule_item(
                                user_id,
                                function_args.get("date"),
                                function_args.get("item_name"),
                                function_args.get("new_time")
                            )
                        elif function_name == "remove_item_from_schedule":
                            tool_result = self.remove_item_from_schedule(
                                user_id,
                                function_args.get("date"),
                                function_args.get("item_name"),
                                function_args.get("remove_all_dates", False),  # Default: only remove from that date
                                function_args.get("remove_all", True)
                            )
                        elif function_name == "remove_recurring_item":
                            tool_result = self.remove_recurring_item(
                                user_id,
                                function_args.get("name"),
                                function_args.get("remove_all", True)
                            )
                    except Exception as e:
                        tool_result = f"Error executing {function_name}: {str(e)}"
                    
                    messages.append({
                        "tool_call_id": tool_call.id,
                        "role": "tool",
                        "name": function_name,
                        "content": tool_result,
                    })
                
                final_completion = self.client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=messages
                )
                return final_completion.choices[0].message.content
            
            return response_message.content
        except Exception as e:
            print(f"Error: {e}")
            return f"Error: {str(e)}"

    def _build_system_prompt(self, context: Dict[str, Any]) -> str:
        now = datetime.now()
        tomorrow = (now + timedelta(days=1)).strftime("%Y-%m-%d")
        
        schedule = context.get("schedule", {})
        today_schedule = context.get("today_schedule", [])
        progress = context.get("progress", {})
        settings = context.get("settings", {})
        stats = context.get("stats", {})
        
        # Build today's schedule text
        today_str = now.date().isoformat()
        schedule_text = ""
        if today_schedule:
            for item in today_schedule:
                status = "Pending"
                item_id = item.get("id", "")
                day_progress = progress.get(today_str, {})
                if isinstance(day_progress, dict):
                    status_val = day_progress.get(item_id, 0)
                    if status_val == 2: status = "Completed"
                    elif status_val == 1: status = "In Progress"
                
                name = item.get('item', {}).get('name', 'Unknown')
                dose = item.get('item', {}).get('dosage', '')
                time = item.get('scheduled_time', '')
                schedule_text += f"- {time} {name} ({dose}): {status}\n"
        else:
            schedule_text = "No items scheduled for today."
        
        # Get list of ALL supplements user currently has (from full schedule)
        all_supplements = set()
        if isinstance(schedule, dict):
            for date_items in schedule.values():
                for item in date_items:
                    name = item.get('item', {}).get('name', '')
                    if name and name.strip():
                        all_supplements.add(name)
        supplements_list = ", ".join(sorted(all_supplements)) if all_supplements else "None"

        prompt = f"""You are the AI Agent for Daily Wellness Scheduler.
Current Date: {now.strftime("%A, %Y-%m-%d %H:%M")}
Tomorrow is: {tomorrow}

You can modify the schedule using tools:
- 'add_item_to_schedule': For single, one-off events.
- 'add_recurring_item': For repeating events (e.g. "Every Monday").
- 'reschedule_item': For moving existing events.
- 'remove_item_from_schedule': Delete one-off items. IMPORTANT: By default, only removes from the specified date (set remove_all_dates=false). Only set remove_all_dates=true if user explicitly wants to remove from ALL days.
- 'remove_recurring_item': Delete or disable recurring templates/lists.

CRITICAL RULES:
1. INFORMATIONAL QUERIES: If the user asks "Do you see..." or "What is on my schedule...", DO NOT CALL A TOOL. Just read the context provided in "Today's Schedule" and answer them.

2. SUPPLEMENT SUGGESTIONS - CRITICAL:
   - ONLY suggest supplements that the user ALREADY HAS in their schedule: {supplements_list}
   - DO NOT suggest new supplements they don't have (like GABA, 5-HTP, Ashwagandha, etc.) unless they explicitly ask to add new ones
   - Instead of adding new supplements, suggest:
     * Removing certain supplements for today/evening
     * Rescheduling existing supplements to better times
     * Adjusting doses of existing supplements
   - If user asks for a "calmer evening stack", work with what they have - remove stimulating ones, keep calming ones, reschedule timing

3. REMOVAL BEHAVIOR:
   - When user asks to remove items for "today" or "this evening" or "tonight", use remove_item_from_schedule with remove_all_dates=FALSE (only remove from today)
   - When user asks to "stop" or "remove forever" or "never show again", use remove_all_dates=TRUE or remove_recurring_item
   - By default, removals should only affect the specified date, not all dates

4. DATE HANDLING:
   - If user says "Today", use {now.strftime("%Y-%m-%d")}.
   - If user says "Tomorrow", use {tomorrow}.
   - Specific dates (e.g. "Dec 2nd") -> YYYY-MM-DD (e.g. 2025-12-02).

5. REVERT/UNDO: If user says "revert", "undo", "cancel that", "bring back", or "add it back":
   - Look at the conversation history to see what was removed
   - Restore the EXACT supplements that were removed with their original names, times, and doses
   - Use add_item_to_schedule with the ACTUAL supplement names (e.g. "Omega-3 + D3/K2", "PepZin GI", "DGL Plus")
   - NEVER use placeholder names like "item_name" - always use the real supplement name from the Available Supplements list
   - If you don't know the exact details, check the Available Supplements list above or ask the user

User Context:
- Fasting Mode: {settings.get('fasting', 'no')}
- Streak: {stats.get('current_streak', 0)} days
- Available Supplements: {supplements_list}

Today's Schedule:
{schedule_text}

Instructions:
1. Analyze user intent carefully. Is it a QUESTION or an ACTION?
2. If ACTION: Call the appropriate tool(s). Remember: only work with supplements they already have!
3. If QUESTION: Answer directly without tools.
4. Return a helpful confirmation or answer.
5. When removing items, clearly state whether it's just for today or all days.
"""
        return prompt

chat_engine = ChatEngine()
