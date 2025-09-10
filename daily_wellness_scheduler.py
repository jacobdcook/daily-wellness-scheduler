#!/usr/bin/env python3
"""
Daily Wellness Scheduler

A Python desktop app that generates a 6-week, time-of-day schedule for supplements 
and electrolytes based on user habits. Features GUI with tkinter and optional CLI mode.

Usage:
    python daily_wellness_scheduler.py                    # GUI mode
    python daily_wellness_scheduler.py --today           # Print today's schedule
    python daily_wellness_scheduler.py --export-csv path.csv
    python daily_wellness_scheduler.py --export-ics path.ics
    python daily_wellness_scheduler.py --light           # Light day mode
    python daily_wellness_scheduler.py --sweaty          # Sweaty day mode

Author: AI Assistant
Version: 1.0
"""

import tkinter as tk
from tkinter import ttk, messagebox, filedialog
import json
import os
import sys
import argparse
from datetime import datetime, timedelta, time
from typing import Dict, List, Optional, Tuple, Any
import csv
import re
from dataclasses import dataclass, asdict
from enum import Enum


class DayType(Enum):
    LIGHT = "light"
    SWEATY = "sweaty"


class TimingRule(Enum):
    WITH_MEAL = "with_meal"
    BEFORE_MEAL = "before_meal"
    AFTER_MEAL = "after_meal"
    BETWEEN_MEALS = "between_meals"
    EMPTY_STOMACH = "empty_stomach"
    BEFORE_BED = "before_bed"
    AFTER_WAKE = "after_wake"
    WORKOUT_WINDOW = "workout_window"


@dataclass
class SupplementItem:
    name: str
    dose: str
    timing_rule: TimingRule
    notes: str
    window_minutes: int
    anchor: str  # wake, breakfast, lunch, dinner, bed, study_start, study_end
    offset_minutes: int  # minutes before/after anchor
    conflicts: List[str]
    enabled: bool = True
    optional: bool = False


@dataclass
class UserSettings:
    wake_time: str = "07:30"
    bedtime: str = "22:00"
    dinner_time: str = "18:30"
    breakfast_mode: str = "sometimes"  # usually, sometimes, skip
    breakfast_days: List[bool] = None  # 7 days starting Monday
    study_start: str = "09:30"
    study_end: str = "17:30"
    workout_days: List[bool] = None  # 7 days starting Monday
    workout_time: str = ""
    vaping_window: str = ""
    electrolyte_intensity: str = "light"  # light, sweaty
    timezone: str = "America/Los_Angeles"
    optional_items: Dict[str, bool] = None
    
    def __post_init__(self):
        if self.breakfast_days is None:
            self.breakfast_days = [True] * 7
        if self.workout_days is None:
            self.workout_days = [False] * 7
        if self.optional_items is None:
            self.optional_items = {
                "slippery_elm": False,
                "l_glutamine": False,
                "collagen": False,
                "melatonin": False
            }


@dataclass
class ScheduledItem:
    item: SupplementItem
    scheduled_time: datetime
    day_type: DayType
    shifted: bool = False
    shift_reason: str = ""


class SupplementScheduler:
    """Core scheduling engine for supplement timing"""
    
    def __init__(self, settings: UserSettings):
        self.settings = settings
        self.supplements = self._create_default_supplements()
        self.schedule_cache = {}
        
    def _create_default_supplements(self) -> List[SupplementItem]:
        """Create the default supplement regimen"""
        return [
            # Core stack
            SupplementItem(
                name="Electrolyte Mix",
                dose="1 L water",
                timing_rule=TimingRule.BETWEEN_MEALS,
                notes="Citric-free mix with Baja Gold salt, potassium bicarbonate, ConcenTrace",
                window_minutes=60,
                anchor="wake",
                offset_minutes=120,  # 2 hours after wake
                conflicts=["meals"],
                enabled=True
            ),
            SupplementItem(
                name="Magnesium Glycinate",
                dose="1-2 capsules (60-120 mg elemental)",
                timing_rule=TimingRule.BEFORE_BED,
                notes="Double Wood brand",
                window_minutes=30,
                anchor="bed",
                offset_minutes=-90,  # 1.5 hours before bed
                conflicts=[],
                enabled=True
            ),
            SupplementItem(
                name="PepZin GI",
                dose="37.5 mg",
                timing_rule=TimingRule.WITH_MEAL,
                notes="Zinc-Carnosine, twice daily",
                window_minutes=15,
                anchor="lunch",
                offset_minutes=0,
                conflicts=[],
                enabled=True
            ),
            SupplementItem(
                name="PepZin GI",
                dose="37.5 mg",
                timing_rule=TimingRule.WITH_MEAL,
                notes="Zinc-Carnosine, twice daily",
                window_minutes=15,
                anchor="dinner",
                offset_minutes=0,
                conflicts=[],
                enabled=True
            ),
            SupplementItem(
                name="DGL Plus",
                dose="1-2 tablets/capsules",
                timing_rule=TimingRule.BEFORE_MEAL,
                notes="15-20 min before meals, twice daily",
                window_minutes=15,
                anchor="lunch",
                offset_minutes=-20,  # 20 minutes before lunch
                conflicts=[],
                enabled=True
            ),
            SupplementItem(
                name="DGL Plus",
                dose="1-2 tablets/capsules",
                timing_rule=TimingRule.BEFORE_MEAL,
                notes="15-20 min before meals, twice daily",
                window_minutes=15,
                anchor="dinner",
                offset_minutes=-20,  # 20 minutes before dinner
                conflicts=[],
                enabled=True
            ),
            SupplementItem(
                name="Aloe Vera Juice",
                dose="2-4 oz",
                timing_rule=TimingRule.BETWEEN_MEALS,
                notes="Lily of the Desert, preservative-free inner fillet",
                window_minutes=30,
                anchor="dinner",
                offset_minutes=-120,  # 2 hours before dinner
                conflicts=["meals"],
                enabled=True
            ),
            SupplementItem(
                name="Probiotic",
                dose="1 capsule (25B CFU)",
                timing_rule=TimingRule.EMPTY_STOMACH,
                notes="NOW Probiotic-10",
                window_minutes=30,
                anchor="wake",
                offset_minutes=30,  # 30 min after wake
                conflicts=["meals"],
                enabled=True
            ),
            SupplementItem(
                name="Omega-3 + D3/K2",
                dose="As directed",
                timing_rule=TimingRule.WITH_MEAL,
                notes="With fat-containing meal",
                window_minutes=15,
                anchor="dinner",
                offset_minutes=0,
                conflicts=[],
                enabled=True
            ),
            # Optional items
            SupplementItem(
                name="Melatonin",
                dose="300 mcg",
                timing_rule=TimingRule.BEFORE_BED,
                notes="Life Extension brand",
                window_minutes=30,
                anchor="bed",
                offset_minutes=-30,  # 30 min before bed
                conflicts=[],
                enabled=False,
                optional=True
            ),
            SupplementItem(
                name="Slippery Elm Tea",
                dose="1 serving",
                timing_rule=TimingRule.BETWEEN_MEALS,
                notes="For throat irritation, avoid within 60 min of other supplements",
                window_minutes=60,
                anchor="study_end",
                offset_minutes=60,  # 1 hour after study
                conflicts=["supplements"],
                enabled=False,
                optional=True
            ),
            SupplementItem(
                name="L-Glutamine",
                dose="5 g powder",
                timing_rule=TimingRule.BETWEEN_MEALS,
                notes="Gut support, not with hot drinks",
                window_minutes=30,
                anchor="wake",
                offset_minutes=150,  # 2.5 hours after wake (10:30 AM)
                conflicts=["meals", "hot_drinks"],
                enabled=False,
                optional=True
            ),
            SupplementItem(
                name="L-Glutamine",
                dose="5 g powder",
                timing_rule=TimingRule.BETWEEN_MEALS,
                notes="Gut support, not with hot drinks",
                window_minutes=30,
                anchor="study_start",
                offset_minutes=180,  # 3 hours after study start (3:00 PM)
                conflicts=["meals", "hot_drinks"],
                enabled=False,
                optional=True
            ),
            SupplementItem(
                name="Collagen Peptides",
                dose="10 g",
                timing_rule=TimingRule.WITH_MEAL,
                notes="Mix in water/coffee if tolerated",
                window_minutes=15,
                anchor="breakfast",
                offset_minutes=0,  # with breakfast
                conflicts=[],
                enabled=False,
                optional=True
            ),
            SupplementItem(
                name="Collagen Peptides",
                dose="10 g",
                timing_rule=TimingRule.BETWEEN_MEALS,
                notes="Mix in water/coffee if tolerated",
                window_minutes=60,
                anchor="study_start",
                offset_minutes=120,  # 2 hours after study start (2:00 PM)
                conflicts=["meals"],
                enabled=False,
                optional=True
            )
        ]
    
    def generate_schedule(self, start_date: datetime, weeks: int = 6) -> Dict[str, List[ScheduledItem]]:
        """Generate a complete schedule for the specified period"""
        schedule = {}
        current_date = start_date.date()
        
        for week in range(weeks):
            for day in range(7):
                date = current_date + timedelta(days=week * 7 + day)
                date_str = date.isoformat()
                day_type = DayType.LIGHT if self.settings.electrolyte_intensity == "light" else DayType.SWEATY
                
                # Determine if it's a workout day
                is_workout = self.settings.workout_days[day]
                
                # Determine if breakfast is scheduled
                has_breakfast = self._should_have_breakfast(date, day)
                
                day_schedule = self._schedule_day(date, day_type, is_workout, has_breakfast)
                schedule[date_str] = day_schedule
                
        return schedule
    
    def _should_have_breakfast(self, date: datetime.date, day_of_week: int) -> bool:
        """Determine if breakfast should be scheduled for this day"""
        if self.settings.breakfast_mode == "skip":
            return False
        elif self.settings.breakfast_mode == "usually":
            return True
        else:  # sometimes
            return self.settings.breakfast_days[day_of_week]
    
    def _schedule_day(self, date: datetime.date, day_type: DayType, is_workout: bool, has_breakfast: bool) -> List[ScheduledItem]:
        """Schedule all supplements for a single day"""
        scheduled_items = []
        
        # Create time anchors for the day
        anchors = self._create_time_anchors(date, is_workout, has_breakfast)
        
        # Schedule each enabled supplement
        for supplement in self.supplements:
            if not supplement.enabled:
                continue
                
            if supplement.optional:
                # Check if this optional item is enabled
                item_key = supplement.name.lower().replace(" ", "_").replace("-", "_")
                if not self.settings.optional_items.get(item_key, False):
                    continue
                
            scheduled_time = self._find_best_time(supplement, anchors, scheduled_items, day_type)
            if scheduled_time:
                scheduled_item = ScheduledItem(
                    item=supplement,
                    scheduled_time=scheduled_time,
                    day_type=day_type
                )
                scheduled_items.append(scheduled_item)
        
        # Sort by time
        scheduled_items.sort(key=lambda x: x.scheduled_time)
        return scheduled_items
    
    def _create_time_anchors(self, date: datetime.date, is_workout: bool, has_breakfast: bool) -> Dict[str, datetime]:
        """Create time anchors for the day"""
        wake_time = self._parse_time(self.settings.wake_time)
        bedtime = self._parse_time(self.settings.bedtime)
        dinner_time = self._parse_time(self.settings.dinner_time)
        study_start = self._parse_time(self.settings.study_start)
        study_end = self._parse_time(self.settings.study_end)
        
        anchors = {
            "wake": datetime.combine(date, wake_time),
            "bed": datetime.combine(date, bedtime),
            "dinner": datetime.combine(date, dinner_time),
            "study_start": datetime.combine(date, study_start),
            "study_end": datetime.combine(date, study_end)
        }
        
        if has_breakfast:
            # Breakfast 1 hour after wake
            anchors["breakfast"] = anchors["wake"] + timedelta(hours=1)
            # Lunch 4 hours after breakfast (12:30 PM if breakfast at 9:00 AM)
            anchors["lunch"] = anchors["breakfast"] + timedelta(hours=4)
        else:
            # If no breakfast, lunch at 12:30 PM
            anchors["lunch"] = datetime.combine(date, time(12, 30))
        
        if is_workout and self.settings.workout_time:
            workout_time = self._parse_time(self.settings.workout_time)
            anchors["workout"] = datetime.combine(date, workout_time)
        
        return anchors
    
    def _parse_time(self, time_str: str) -> time:
        """Parse time string in HH:MM format"""
        try:
            return datetime.strptime(time_str, "%H:%M").time()
        except ValueError:
            return datetime.strptime(time_str, "%I:%M %p").time()
    
    def _find_best_time(self, supplement: SupplementItem, anchors: Dict[str, datetime], 
                       existing_items: List[ScheduledItem], day_type: DayType) -> Optional[datetime]:
        """Find the best time to schedule a supplement"""
        # Check if anchor exists
        if supplement.anchor not in anchors:
            return None
            
        base_time = anchors[supplement.anchor] + timedelta(minutes=supplement.offset_minutes)
        
        # Special handling for DGL Plus - try multiple times before meals
        if supplement.name == "DGL Plus":
            meal_anchor = supplement.anchor  # lunch or dinner
            if meal_anchor in anchors:
                meal_time = anchors[meal_anchor]
                # Try 15, 18, 20 minutes before meal
                for offset in [15, 18, 20]:
                    test_time = meal_time - timedelta(minutes=offset)
                    if self._is_time_valid(test_time, supplement, existing_items, anchors):
                        return test_time
                # If no valid time found, try the base time
                if self._is_time_valid(base_time, supplement, existing_items, anchors):
                    return base_time
            return None
        
        # Try the ideal time first
        if self._is_time_valid(base_time, supplement, existing_items, anchors):
            return base_time
        
        # Try shifting within the window
        for offset in range(15, supplement.window_minutes + 1, 15):
            for direction in [-1, 1]:
                shifted_time = base_time + timedelta(minutes=offset * direction)
                if self._is_time_valid(shifted_time, supplement, existing_items, anchors):
                    return shifted_time
        
        # If no valid time found, return None
        return None
    
    def _is_time_valid(self, scheduled_time: datetime, supplement: SupplementItem, 
                      existing_items: List[ScheduledItem], anchors: Dict[str, datetime]) -> bool:
        """Check if a scheduled time is valid for a supplement"""
        # Check conflicts with existing items
        for existing in existing_items:
            time_diff = abs((scheduled_time - existing.scheduled_time).total_seconds() / 60)
            if time_diff < 30:  # 30 minute minimum spacing
                return False
        
        # Check meal conflicts
        if "meals" in supplement.conflicts:
            for meal_name in ["breakfast", "lunch", "dinner"]:
                if meal_name in anchors:
                    meal_time = anchors[meal_name]
                    time_diff = abs((scheduled_time - meal_time).total_seconds() / 60)
                    if time_diff < 60:  # 60 minute buffer around meals
                        return False
        
        # Special case: DGL Plus should be close to meals (before them)
        if supplement.name == "DGL Plus":
            meal_anchor = supplement.anchor  # lunch or dinner
            if meal_anchor in anchors:
                meal_time = anchors[meal_anchor]
                time_diff = (meal_time - scheduled_time).total_seconds() / 60
                if not (10 <= time_diff <= 25):  # DGL Plus should be 10-25 min before meal
                    return False
            else:
                return False  # DGL Plus requires meal anchor
        
        # Check supplement conflicts
        if "supplements" in supplement.conflicts:
            for existing in existing_items:
                time_diff = abs((scheduled_time - existing.scheduled_time).total_seconds() / 60)
                if time_diff < 60:  # 60 minute buffer
                    return False
        
        return True


class WellnessSchedulerApp:
    """Main GUI application"""
    
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("Daily Wellness Scheduler")
        self.root.geometry("1200x800")
        
        # Configure custom styles
        self._configure_styles()
        
        # Load settings and data
        self.settings = self._load_settings()
        self.scheduler = SupplementScheduler(self.settings)
        self.current_schedule = {}
        
        # Initialize progress tracking
        self.item_states = {}  # Track state of each item: 0=empty, 1=in_progress, 2=complete
        self.checkboxes = {}  # Store checkbox widgets for persistence
        self.progress_file = ".local_private/progress.json"  # File to save progress
        self.pushbullet_api_key = None  # Pushbullet API key for phone notifications
        
        # Create GUI
        self._create_gui()
        
        # Load today's progress
        self._load_today_progress()
        
        # Load Pushbullet API key
        self._load_pushbullet_key()
        
        # Update Pushbullet display after loading key
        self._update_pushbullet_display()
        
        # Always generate a fresh daily plan on startup
        self._generate_schedule()
        
        # Check for missed items and start notification timer
        self._check_missed_items()
        self._start_notification_timer()
    
    def _configure_styles(self):
        """Configure custom ttk styles"""
        style = ttk.Style()
        
        # Success progress bar (green)
        style.configure("Success.TProgressbar", 
                       background="green", 
                       troughcolor="lightgray")
        
        # Warning progress bar (orange)
        style.configure("Warning.TProgressbar", 
                       background="orange", 
                       troughcolor="lightgray")
        
    def _load_settings(self) -> UserSettings:
        """Load user settings from JSON file"""
        settings_file = ".local_private/supplement_schedule.json"
        if os.path.exists(settings_file):
            try:
                with open(settings_file, 'r') as f:
                    data = json.load(f)
                    return UserSettings(**data.get('settings', {}))
            except Exception as e:
                print(f"Error loading settings: {e}")
        
        return UserSettings()
    
    def _save_settings(self):
        """Save current settings to JSON file"""
        os.makedirs(".local_private", exist_ok=True)
        settings_file = ".local_private/supplement_schedule.json"
        
        # Handle both dataclass instances and regular dictionaries
        def convert_item(item):
            if hasattr(item, '__dataclass_fields__'):
                return asdict(item)
            else:
                return item
        
        data = {
            'settings': asdict(self.settings),
            'schedule': {k: [convert_item(item) for item in v] for k, v in self.current_schedule.items()}
        }
        
        with open(settings_file, 'w') as f:
            json.dump(data, f, indent=2, default=str)
    
    def _create_gui(self):
        """Create the main GUI layout"""
        # Main frame
        main_frame = ttk.Frame(self.root, padding="10")
        main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # Configure grid weights
        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(0, weight=1)
        main_frame.columnconfigure(1, weight=1)
        main_frame.rowconfigure(1, weight=1)
        
        # Left panel - Settings
        self._create_settings_panel(main_frame)
        
        # Right panel - Schedule display
        self._create_schedule_panel(main_frame)
        
        # Top controls
        self._create_top_controls(main_frame)
    
    def _create_settings_panel(self, parent):
        """Create the settings panel"""
        settings_frame = ttk.LabelFrame(parent, text="Settings", padding="10")
        settings_frame.grid(row=1, column=0, sticky=(tk.W, tk.E, tk.N, tk.S), padx=(0, 10))
        
        # Time settings
        time_frame = ttk.LabelFrame(settings_frame, text="Daily Schedule", padding="5")
        time_frame.pack(fill=tk.X, pady=(0, 10))
        
        ttk.Label(time_frame, text="Wake Time:").grid(row=0, column=0, sticky=tk.W, padx=(0, 5))
        self.wake_var = tk.StringVar(value=self.settings.wake_time)
        ttk.Entry(time_frame, textvariable=self.wake_var, width=10).grid(row=0, column=1, sticky=tk.W)
        
        ttk.Label(time_frame, text="Bedtime:").grid(row=0, column=2, sticky=tk.W, padx=(20, 5))
        self.bed_var = tk.StringVar(value=self.settings.bedtime)
        ttk.Entry(time_frame, textvariable=self.bed_var, width=10).grid(row=0, column=3, sticky=tk.W)
        
        ttk.Label(time_frame, text="Dinner Time:").grid(row=1, column=0, sticky=tk.W, padx=(0, 5))
        self.dinner_var = tk.StringVar(value=self.settings.dinner_time)
        ttk.Entry(time_frame, textvariable=self.dinner_var, width=10).grid(row=1, column=1, sticky=tk.W)
        
        # Breakfast settings
        breakfast_frame = ttk.LabelFrame(settings_frame, text="Breakfast", padding="5")
        breakfast_frame.pack(fill=tk.X, pady=(0, 10))
        
        self.breakfast_mode = tk.StringVar(value=self.settings.breakfast_mode)
        ttk.Radiobutton(breakfast_frame, text="Usually", variable=self.breakfast_mode, value="usually").pack(anchor=tk.W)
        ttk.Radiobutton(breakfast_frame, text="Sometimes", variable=self.breakfast_mode, value="sometimes").pack(anchor=tk.W)
        ttk.Radiobutton(breakfast_frame, text="Skip Most Days", variable=self.breakfast_mode, value="skip").pack(anchor=tk.W)
        
        # Study block
        study_frame = ttk.LabelFrame(settings_frame, text="Study Block", padding="5")
        study_frame.pack(fill=tk.X, pady=(0, 10))
        
        ttk.Label(study_frame, text="Start:").grid(row=0, column=0, sticky=tk.W, padx=(0, 5))
        self.study_start_var = tk.StringVar(value=self.settings.study_start)
        ttk.Entry(study_frame, textvariable=self.study_start_var, width=10).grid(row=0, column=1, sticky=tk.W)
        
        ttk.Label(study_frame, text="End:").grid(row=0, column=2, sticky=tk.W, padx=(20, 5))
        self.study_end_var = tk.StringVar(value=self.settings.study_end)
        ttk.Entry(study_frame, textvariable=self.study_end_var, width=10).grid(row=0, column=3, sticky=tk.W)
        
        # Electrolyte intensity
        intensity_frame = ttk.LabelFrame(settings_frame, text="Electrolyte Intensity", padding="5")
        intensity_frame.pack(fill=tk.X, pady=(0, 10))
        
        self.intensity_var = tk.StringVar(value=self.settings.electrolyte_intensity)
        ttk.Radiobutton(intensity_frame, text="Light Day", variable=self.intensity_var, value="light").pack(anchor=tk.W)
        ttk.Radiobutton(intensity_frame, text="Sweaty Day", variable=self.intensity_var, value="sweaty").pack(anchor=tk.W)
        
        # Optional items
        optional_frame = ttk.LabelFrame(settings_frame, text="Optional Items", padding="5")
        optional_frame.pack(fill=tk.X, pady=(0, 10))
        
        self.optional_vars = {}
        for item, enabled in self.settings.optional_items.items():
            var = tk.BooleanVar(value=enabled)
            self.optional_vars[item] = var
            ttk.Checkbutton(optional_frame, text=item.replace("_", " ").title(), variable=var).pack(anchor=tk.W)
        
        # Pushbullet API Key
        pushbullet_frame = ttk.LabelFrame(settings_frame, text="Phone Notifications (Optional)", padding="5")
        pushbullet_frame.pack(fill=tk.X, pady=(0, 10))
        
        ttk.Label(pushbullet_frame, text="Pushbullet API Key:").pack(anchor=tk.W)
        self.pushbullet_var = tk.StringVar(value="••••••••••••••••••••••••••••••••••••••••" if self.pushbullet_api_key else "")
        pushbullet_entry = ttk.Entry(pushbullet_frame, textvariable=self.pushbullet_var, show="*", width=40)
        pushbullet_entry.pack(fill=tk.X, pady=(2, 5))
        
        # Show status
        self.pushbullet_status_label = ttk.Label(pushbullet_frame, text="", 
                                               font=("TkDefaultFont", 8))
        self.pushbullet_status_label.pack(anchor=tk.W)
        
        ttk.Label(pushbullet_frame, text="Get your API key at: https://www.pushbullet.com/", 
                 font=("TkDefaultFont", 8), foreground="gray").pack(anchor=tk.W)
        
        ttk.Button(pushbullet_frame, text="Save API Key", command=self._save_pushbullet_key).pack(anchor=tk.W, pady=(5, 0))
        
        # Generate button
        ttk.Button(settings_frame, text="Refresh Today's Plan", command=self._generate_schedule).pack(pady=10)
    
    def _create_schedule_panel(self, parent):
        """Create the schedule display panel"""
        schedule_frame = ttk.Frame(parent)
        schedule_frame.grid(row=1, column=1, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # Notebook for tabs
        self.notebook = ttk.Notebook(schedule_frame)
        self.notebook.pack(fill=tk.BOTH, expand=True)
        
        # Today tab
        self.today_frame = ttk.Frame(self.notebook)
        self.notebook.add(self.today_frame, text="Today")
        
        # Add progress header to Today tab
        self._create_progress_header()
        
        # Week tab
        self.week_frame = ttk.Frame(self.notebook)
        self.notebook.add(self.week_frame, text="Week")
        
        # 6-Week tab
        self.sixweek_frame = ttk.Frame(self.notebook)
        self.notebook.add(self.sixweek_frame, text="6-Week")
    
    def _create_top_controls(self, parent):
        """Create top control buttons"""
        controls_frame = ttk.Frame(parent)
        controls_frame.grid(row=0, column=0, columnspan=2, sticky=(tk.W, tk.E), pady=(0, 10))
        
        ttk.Button(controls_frame, text="Export CSV", command=self._export_csv).pack(side=tk.LEFT, padx=(0, 5))
        ttk.Button(controls_frame, text="Export iCal", command=self._export_ical).pack(side=tk.LEFT, padx=(0, 5))
        ttk.Button(controls_frame, text="Save Progress", command=self._save_progress).pack(side=tk.LEFT, padx=(0, 5))
        
        # Day type toggle
        self.day_type_var = tk.StringVar(value="Light Day")
        ttk.Button(controls_frame, textvariable=self.day_type_var, command=self._toggle_day_type).pack(side=tk.RIGHT)
    
    def _generate_schedule(self):
        """Generate a simple daily schedule that repeats"""
        # Update settings from GUI
        self._update_settings_from_gui()
        
        # Generate a simple daily schedule that repeats
        self.current_schedule = self._generate_simple_daily_schedule()
        
        # Save to file
        self._save_settings()
        
        # Update display
        self._update_schedule_display()
        
        # Schedule generated silently - no popup needed
    
    def _generate_simple_daily_schedule(self):
        """Generate a simple daily schedule with all supplements"""
        from datetime import datetime, timedelta
        
        # Get today's date
        today = datetime.now().date()
        
        # Create the complete daily schedule
        daily_schedule = [
            # Morning supplements
            {
                "item": {
                    "name": "Probiotic",
                    "dose": "1 capsule (25B CFU)",
                    "timing_rule": "empty_stomach",
                    "notes": "NOW Probiotic-10",
                    "window_minutes": 30,
                    "anchor": "wake",
                    "offset_minutes": 30,
                    "conflicts": ["meals"],
                    "enabled": True,
                    "optional": False
                },
                "scheduled_time": f"{today}T08:30:00",
                "day_type": "light",
                "shifted": False,
                "shift_reason": ""
            },
            {
                "item": {
                    "name": "Collagen Peptides",
                    "dose": "10 g",
                    "timing_rule": "with_meal",
                    "notes": "Mix in water/coffee if tolerated",
                    "window_minutes": 15,
                    "anchor": "breakfast",
                    "offset_minutes": 0,
                    "conflicts": [],
                    "enabled": True,
                    "optional": True
                },
                "scheduled_time": f"{today}T09:00:00",
                "day_type": "light",
                "shifted": False,
                "shift_reason": ""
            },
            {
                "item": {
                    "name": "Electrolyte Mix",
                    "dose": "1 L water",
                    "timing_rule": "between_meals",
                    "notes": "Citric-free mix with Baja Gold salt, potassium bicarbonate, ConcenTrace",
                    "window_minutes": 60,
                    "anchor": "wake",
                    "offset_minutes": 120,
                    "conflicts": ["meals"],
                    "enabled": True,
                    "optional": False
                },
                "scheduled_time": f"{today}T10:00:00",
                "day_type": "light",
                "shifted": False,
                "shift_reason": ""
            },
            {
                "item": {
                    "name": "L-Glutamine",
                    "dose": "5 g powder",
                    "timing_rule": "between_meals",
                    "notes": "Gut support, not with hot drinks",
                    "window_minutes": 30,
                    "anchor": "wake",
                    "offset_minutes": 150,
                    "conflicts": ["meals", "hot_drinks"],
                    "enabled": True,
                    "optional": True
                },
                "scheduled_time": f"{today}T10:30:00",
                "day_type": "light",
                "shifted": False,
                "shift_reason": ""
            },
            # Lunch supplements
            {
                "item": {
                    "name": "DGL Plus",
                    "dose": "1-2 tablets/capsules",
                    "timing_rule": "before_meal",
                    "notes": "15-20 min before meals, twice daily",
                    "window_minutes": 15,
                    "anchor": "lunch",
                    "offset_minutes": -20,
                    "conflicts": [],
                    "enabled": True,
                    "optional": False
                },
                "scheduled_time": f"{today}T12:10:00",
                "day_type": "light",
                "shifted": False,
                "shift_reason": ""
            },
            {
                "item": {
                    "name": "PepZin GI",
                    "dose": "37.5 mg",
                    "timing_rule": "with_meal",
                    "notes": "Zinc-Carnosine, twice daily",
                    "window_minutes": 15,
                    "anchor": "lunch",
                    "offset_minutes": 0,
                    "conflicts": [],
                    "enabled": True,
                    "optional": False
                },
                "scheduled_time": f"{today}T12:30:00",
                "day_type": "light",
                "shifted": False,
                "shift_reason": ""
            },
            # Afternoon supplements
            {
                "item": {
                    "name": "Collagen Peptides",
                    "dose": "10 g",
                    "timing_rule": "between_meals",
                    "notes": "Mix in water/coffee if tolerated",
                    "window_minutes": 60,
                    "anchor": "study_start",
                    "offset_minutes": 120,
                    "conflicts": ["meals"],
                    "enabled": True,
                    "optional": True
                },
                "scheduled_time": f"{today}T14:00:00",
                "day_type": "light",
                "shifted": False,
                "shift_reason": ""
            },
            {
                "item": {
                    "name": "L-Glutamine",
                    "dose": "5 g powder",
                    "timing_rule": "between_meals",
                    "notes": "Gut support, not with hot drinks",
                    "window_minutes": 30,
                    "anchor": "study_start",
                    "offset_minutes": 180,
                    "conflicts": ["meals", "hot_drinks"],
                    "enabled": True,
                    "optional": True
                },
                "scheduled_time": f"{today}T15:00:00",
                "day_type": "light",
                "shifted": False,
                "shift_reason": ""
            },
            {
                "item": {
                    "name": "Aloe Vera Juice",
                    "dose": "2-4 oz",
                    "timing_rule": "between_meals",
                    "notes": "Lily of the Desert, preservative-free inner fillet",
                    "window_minutes": 30,
                    "anchor": "dinner",
                    "offset_minutes": -120,
                    "conflicts": ["meals"],
                    "enabled": True,
                    "optional": False
                },
                "scheduled_time": f"{today}T17:30:00",
                "day_type": "light",
                "shifted": False,
                "shift_reason": ""
            },
            # Dinner supplements
            {
                "item": {
                    "name": "DGL Plus",
                    "dose": "1-2 tablets/capsules",
                    "timing_rule": "before_meal",
                    "notes": "15-20 min before meals, twice daily",
                    "window_minutes": 15,
                    "anchor": "dinner",
                    "offset_minutes": -20,
                    "conflicts": [],
                    "enabled": True,
                    "optional": False
                },
                "scheduled_time": f"{today}T19:10:00",
                "day_type": "light",
                "shifted": False,
                "shift_reason": ""
            },
            {
                "item": {
                    "name": "PepZin GI",
                    "dose": "37.5 mg",
                    "timing_rule": "with_meal",
                    "notes": "Zinc-Carnosine, twice daily",
                    "window_minutes": 15,
                    "anchor": "dinner",
                    "offset_minutes": 0,
                    "conflicts": [],
                    "enabled": True,
                    "optional": False
                },
                "scheduled_time": f"{today}T19:30:00",
                "day_type": "light",
                "shifted": False,
                "shift_reason": ""
            },
            {
                "item": {
                    "name": "Omega-3 + D3/K2",
                    "dose": "As directed",
                    "timing_rule": "with_meal",
                    "notes": "With fat-containing meal",
                    "window_minutes": 15,
                    "anchor": "dinner",
                    "offset_minutes": 0,
                    "conflicts": [],
                    "enabled": True,
                    "optional": False
                },
                "scheduled_time": f"{today}T19:30:00",
                "day_type": "light",
                "shifted": False,
                "shift_reason": ""
            },
            # Evening supplements
            {
                "item": {
                    "name": "Magnesium Glycinate",
                    "dose": "1-2 capsules (60-120 mg elemental)",
                    "timing_rule": "before_bed",
                    "notes": "Double Wood brand",
                    "window_minutes": 30,
                    "anchor": "bed",
                    "offset_minutes": -90,
                    "conflicts": [],
                    "enabled": True,
                    "optional": False
                },
                "scheduled_time": f"{today}T22:30:00",
                "day_type": "light",
                "shifted": False,
                "shift_reason": ""
            },
            {
                "item": {
                    "name": "Melatonin",
                    "dose": "300 mcg",
                    "timing_rule": "before_bed",
                    "notes": "Life Extension brand",
                    "window_minutes": 30,
                    "anchor": "bed",
                    "offset_minutes": -30,
                    "conflicts": [],
                    "enabled": True,
                    "optional": True
                },
                "scheduled_time": f"{today}T23:30:00",
                "day_type": "light",
                "shifted": False,
                "shift_reason": ""
            }
        ]
        
        # Return as a single-day schedule
        return {str(today): daily_schedule}
    
    def _update_settings_from_gui(self):
        """Update settings object from GUI values"""
        self.settings.wake_time = self.wake_var.get()
        self.settings.bedtime = self.bed_var.get()
        self.settings.dinner_time = self.dinner_var.get()
        self.settings.breakfast_mode = self.breakfast_mode.get()
        self.settings.study_start = self.study_start_var.get()
        self.settings.study_end = self.study_end_var.get()
        self.settings.electrolyte_intensity = self.intensity_var.get()
        
        # Update optional items
        for item, var in self.optional_vars.items():
            self.settings.optional_items[item] = var.get()
    
    def _load_schedule(self):
        """Load existing schedule from file"""
        settings_file = ".local_private/supplement_schedule.json"
        if os.path.exists(settings_file):
            try:
                with open(settings_file, 'r') as f:
                    data = json.load(f)
                    # Convert back to ScheduledItem objects
                    self.current_schedule = {}
                    for date_str, items in data.get('schedule', {}).items():
                        self.current_schedule[date_str] = []
                        for item_data in items:
                            # This would need proper deserialization
                            pass
            except Exception as e:
                print(f"Error loading schedule: {e}")
    
    def _update_schedule_display(self):
        """Update the schedule display in all tabs"""
        self._update_today_display()
        self._update_week_display()
        self._update_sixweek_display()
    
    def _update_today_display(self):
        """Update today's schedule display"""
        from datetime import datetime
        
        # Clear existing widgets except progress header
        for widget in self.today_frame.winfo_children():
            if widget != self.progress_header_frame:
                widget.destroy()
        
        # Clear checkbox references since widgets are being recreated
        self.checkboxes.clear()
        
        # Reinitialize progress tracking for today's items
        self._initialize_today_progress()
        
        today = datetime.now().date().isoformat()
        if today not in self.current_schedule:
            ttk.Label(self.today_frame, text="No schedule for today. Generate a plan first.").pack(pady=20)
            return
        
        # Create scrollable frame
        canvas = tk.Canvas(self.today_frame)
        scrollbar = ttk.Scrollbar(self.today_frame, orient="vertical", command=canvas.yview)
        scrollable_frame = ttk.Frame(canvas)
        
        scrollable_frame.bind(
            "<Configure>",
            lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
        )
        
        canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)
        
        # Display today's items
        items = self.current_schedule[today]
        for i, scheduled_item in enumerate(items):
            item_frame = ttk.Frame(scrollable_frame)
            item_frame.pack(fill=tk.X, pady=2)
            
            # Handle both dataclass objects and dictionaries
            if hasattr(scheduled_item, 'scheduled_time'):
                # Dataclass object
                time_str = scheduled_item.scheduled_time.strftime("%I:%M %p")
                item_name = scheduled_item.item.name
                item_dose = scheduled_item.item.dose
                item_notes = scheduled_item.item.notes
            else:
                # Dictionary
                from datetime import datetime
                time_str = datetime.fromisoformat(scheduled_item['scheduled_time']).strftime("%I:%M %p")
                item_name = scheduled_item['item']['name']
                item_dose = scheduled_item['item']['dose']
                item_notes = scheduled_item['item']['notes']
            
            # Interactive checkbox - always create new since we cleared checkboxes
            item_id = f"{item_name}_{time_str.replace(':', '')}"
            
            checkbox = tk.Button(item_frame, text="☐", font=("Arial", 16), 
                               relief="flat", bd=0, width=2)
            # Use a lambda that captures the current values
            checkbox.config(command=lambda iid=item_id, cb=checkbox, frame=item_frame: self._toggle_item_state(iid, cb, frame))
            checkbox.grid(row=0, column=0, padx=(0, 10))
            self.checkboxes[item_id] = checkbox
            
            # Update checkbox appearance based on current state
            current_state = self.item_states.get(item_id, 0)
            if current_state == 0:  # Empty
                checkbox.config(text="☐", foreground="black")
                item_frame.config(relief="flat")
            elif current_state == 1:  # In progress
                checkbox.config(text="◐", foreground="orange")
                item_frame.config(relief="raised")
            else:  # Complete
                checkbox.config(text="☑", foreground="green")
                item_frame.config(relief="sunken")
            
            # Time
            ttk.Label(item_frame, text=time_str, width=10).grid(row=0, column=1, sticky=tk.W)
            
            # Item name and dose
            item_text = f"{item_name} — {item_dose}"
            ttk.Label(item_frame, text=item_text).grid(row=0, column=2, sticky=tk.W, padx=(10, 0))
            
            # Notes
            if item_notes:
                ttk.Label(item_frame, text=f"• {item_notes}", 
                         foreground="gray", font=("TkDefaultFont", 8)).grid(row=1, column=2, sticky=tk.W, padx=(10, 0))
        
        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")
    
    def _create_progress_header(self):
        """Create progress header with percentage and progress bar"""
        self.progress_header_frame = ttk.Frame(self.today_frame)
        self.progress_header_frame.pack(fill=tk.X, pady=(0, 10))
        
        # Progress percentage
        self.progress_var = tk.StringVar(value="0% Complete")
        progress_label = ttk.Label(self.progress_header_frame, textvariable=self.progress_var, font=("TkDefaultFont", 12, "bold"))
        progress_label.pack(side=tk.LEFT)
        
        # Progress bar
        self.progress_bar = ttk.Progressbar(self.progress_header_frame, mode='determinate')
        self.progress_bar.pack(side=tk.RIGHT, fill=tk.X, expand=True, padx=(10, 0))
        
        # Progress tracking is initialized in constructor
    
    def _initialize_today_progress(self):
        """Initialize progress tracking for today's items"""
        from datetime import datetime
        today = datetime.now().date().isoformat()
        
        if today in self.current_schedule:
            # Initialize item states for today's items
            for scheduled_item in self.current_schedule[today]:
                # Handle both dataclass objects and dictionaries
                if hasattr(scheduled_item, 'scheduled_time'):
                    time_str = scheduled_item.scheduled_time.strftime("%I:%M %p")
                    item_name = scheduled_item.item.name
                else:
                    time_str = datetime.fromisoformat(scheduled_item['scheduled_time']).strftime("%I:%M %p")
                    item_name = scheduled_item['item']['name']
                
                item_id = f"{item_name}_{time_str.replace(':', '')}"
                if item_id not in self.item_states:
                    self.item_states[item_id] = 0  # Start as empty
    
    def _toggle_item_state(self, item_id, checkbox, item_frame):
        """Toggle item state between empty, in_progress, and complete"""
        if item_id not in self.item_states:
            self.item_states[item_id] = 0
        
        # Cycle through states: 0 -> 1 -> 2 -> 0
        self.item_states[item_id] = (self.item_states[item_id] + 1) % 3
        
        # Update visual appearance
        if self.item_states[item_id] == 0:  # Empty
            checkbox.config(text="☐", foreground="black")
            item_frame.config(relief="flat")
        elif self.item_states[item_id] == 1:  # In progress
            checkbox.config(text="◐", foreground="orange")
            item_frame.config(relief="raised")
        else:  # Complete
            checkbox.config(text="☑", foreground="green")
            item_frame.config(relief="sunken")
        
        # Update progress
        self._update_progress()
        
        # Save progress automatically (silently)
        self._save_progress_silent()
    
    def _update_progress(self):
        """Update progress percentage and bar"""
        if not self.item_states or not hasattr(self, 'progress_var') or not hasattr(self, 'progress_bar'):
            return
        
        # Count only today's items
        from datetime import datetime
        today = datetime.now().date().isoformat()
        today_items = []
        
        if today in self.current_schedule:
            for scheduled_item in self.current_schedule[today]:
                if hasattr(scheduled_item, 'scheduled_time'):
                    time_str = scheduled_item.scheduled_time.strftime("%I:%M %p")
                    item_name = scheduled_item.item.name
                else:
                    time_str = datetime.fromisoformat(scheduled_item['scheduled_time']).strftime("%I:%M %p")
                    item_name = scheduled_item['item']['name']
                
                item_id = f"{item_name}_{time_str.replace(':', '')}"
                today_items.append(item_id)
        
        total_items = len(today_items)
        completed_items = sum(1 for item_id in today_items if self.item_states.get(item_id, 0) == 2)
        in_progress_items = sum(1 for item_id in today_items if self.item_states.get(item_id, 0) == 1)
        
        percentage = (completed_items / total_items) * 100 if total_items > 0 else 0
        
        # Update display
        progress_text = f"{completed_items}/{total_items} Complete ({percentage:.0f}%)"
        self.progress_var.set(progress_text)
        self.progress_bar['value'] = percentage
        
        # Color coding - just use the default progress bar style
        # (Background color doesn't work with ttk.Progressbar)
    
    def _save_progress_silent(self):
        """Save current progress to file silently (no popup)"""
        try:
            import os
            from datetime import datetime
            
            # Ensure directory exists
            os.makedirs(os.path.dirname(self.progress_file), exist_ok=True)
            
            # Get today's date
            today = datetime.now().date().isoformat()
            
            # Load existing progress or create new
            progress_data = self._load_progress_data()
            
            # Update today's progress
            progress_data[today] = self.item_states.copy()
            
            # Save to file
            with open(self.progress_file, 'w') as f:
                json.dump(progress_data, f, indent=2)
                
        except Exception as e:
            print(f"Error saving progress: {e}")
    
    def _save_progress(self):
        """Save current progress and settings to file with confirmation"""
        try:
            import os
            from datetime import datetime
            
            # Ensure directory exists
            os.makedirs(os.path.dirname(self.progress_file), exist_ok=True)
            
            # Get today's date
            today = datetime.now().date().isoformat()
            
            # Load existing progress or create new
            progress_data = self._load_progress_data()
            
            # Update today's progress
            progress_data[today] = self.item_states.copy()
            
            # Save progress to file
            with open(self.progress_file, 'w') as f:
                json.dump(progress_data, f, indent=2)
            
            # Also save settings
            self._save_settings()
            
            # Show success message
            messagebox.showinfo("Success", "Progress and settings saved successfully!")
                
        except Exception as e:
            print(f"Error saving progress: {e}")
            messagebox.showerror("Error", f"Failed to save progress: {e}")
    
    def _load_progress_data(self):
        """Load progress data from file"""
        try:
            if os.path.exists(self.progress_file):
                with open(self.progress_file, 'r') as f:
                    return json.load(f)
            return {}
        except Exception as e:
            print(f"Error loading progress: {e}")
            return {}
    
    def _load_today_progress(self):
        """Load today's progress from saved data"""
        from datetime import datetime
        
        today = datetime.now().date().isoformat()
        progress_data = self._load_progress_data()
        
        if today in progress_data:
            self.item_states = progress_data[today].copy()
        else:
            self.item_states = {}
    
    def _save_pushbullet_key(self):
        """Save Pushbullet API key to file"""
        try:
            import os
            
            # Get the API key from the entry field
            api_key = self.pushbullet_var.get().strip()
            
            if not api_key:
                messagebox.showwarning("Warning", "Please enter a Pushbullet API key")
                return
            
            # Ensure directory exists
            os.makedirs(".local_private", exist_ok=True)
            
            # Save to file
            with open(".local_private/pushbullet_key.txt", 'w') as f:
                f.write(api_key)
            
            # Update the instance variable
            self.pushbullet_api_key = api_key
            
            # Update the display
            self._update_pushbullet_display()
            
            messagebox.showinfo("Success", "Pushbullet API key saved successfully!")
                
        except Exception as e:
            print(f"Error saving Pushbullet key: {e}")
            messagebox.showerror("Error", f"Failed to save API key: {e}")
    
    def _load_pushbullet_key(self):
        """Load Pushbullet API key from file"""
        try:
            if os.path.exists(".local_private/pushbullet_key.txt"):
                with open(".local_private/pushbullet_key.txt", 'r') as f:
                    self.pushbullet_api_key = f.read().strip()
        except Exception as e:
            print(f"Error loading Pushbullet key: {e}")
            self.pushbullet_api_key = None
    
    def _update_pushbullet_display(self):
        """Update the Pushbullet display based on loaded API key"""
        if hasattr(self, 'pushbullet_var'):
            if self.pushbullet_api_key:
                self.pushbullet_var.set("••••••••••••••••••••••••••••••••••••••••")
                if hasattr(self, 'pushbullet_status_label'):
                    self.pushbullet_status_label.config(text="✓ API key saved - notifications enabled", 
                                                       foreground="green")
            else:
                self.pushbullet_var.set("")
                if hasattr(self, 'pushbullet_status_label'):
                    self.pushbullet_status_label.config(text="No API key - notifications disabled", 
                                                       foreground="gray")
    
    def _send_pushbullet_notification(self, title, body):
        """Send notification via Pushbullet"""
        if not self.pushbullet_api_key:
            return
        
        try:
            import urllib.request
            import urllib.parse
            import json
            
            url = "https://api.pushbullet.com/v2/pushes"
            data = {
                "type": "note",
                "title": title,
                "body": body
            }
            
            headers = {
                "Access-Token": self.pushbullet_api_key,
                "Content-Type": "application/json"
            }
            
            req = urllib.request.Request(url, 
                                       data=json.dumps(data).encode('utf-8'),
                                       headers=headers)
            
            with urllib.request.urlopen(req) as response:
                if response.status == 200:
                    print(f"Pushbullet notification sent: {title}")
                else:
                    print(f"Failed to send Pushbullet notification: {response.status}")
                    
        except Exception as e:
            print(f"Error sending Pushbullet notification: {e}")
    
    def _check_missed_items(self):
        """Check for missed items when app starts and send notifications"""
        from datetime import datetime
        
        if not self.pushbullet_api_key:
            return
        
        today = datetime.now().date().isoformat()
        if today not in self.current_schedule:
            return
        
        current_time = datetime.now()
        missed_items = []
        
        for item in self.current_schedule[today]:
            # Handle both dataclass objects and dictionaries
            if hasattr(item, 'scheduled_time'):
                scheduled_time = item.scheduled_time
                item_name = item.item.name
                item_dose = item.item.dose
            else:
                scheduled_time = datetime.fromisoformat(item['scheduled_time'])
                item_name = item['item']['name']
                item_dose = item['item']['dose']
            
            # Check if item was scheduled for today and is past due
            if scheduled_time.date() == current_time.date() and scheduled_time < current_time:
                # Check if it's not already completed
                # Use the same ID format as in _update_today_display
                item_id = f"{item_name}_{scheduled_time.strftime('%I:%M %p').replace(':', '')}"
                if self.item_states.get(item_id, 0) != 2:  # Not completed
                    missed_items.append((item_name, item_dose, scheduled_time))
        
        # Send notification for missed items
        if missed_items:
            title = "⚠️ Missed Supplements"
            body = "You missed these supplements today:\n\n"
            for name, dose, time in missed_items:
                body += f"• {name} ({dose}) - was due at {time.strftime('%I:%M %p')}\n"
            
            self._send_pushbullet_notification(title, body)
    
    def _start_notification_timer(self):
        """Start timer to check for upcoming supplements every minute"""
        self._check_upcoming_supplements()
        # Schedule next check in 60 seconds
        self.root.after(60000, self._start_notification_timer)
    
    def _check_upcoming_supplements(self):
        """Check if it's time for any supplements and send notifications"""
        from datetime import datetime, timedelta
        
        if not self.pushbullet_api_key:
            return
        
        today = datetime.now().date().isoformat()
        if today not in self.current_schedule:
            return
        
        current_time = datetime.now()
        
        for item in self.current_schedule[today]:
            # Handle both dataclass objects and dictionaries
            if hasattr(item, 'scheduled_time'):
                scheduled_time = item.scheduled_time
                item_name = item.item.name
                item_dose = item.item.dose
            else:
                scheduled_time = datetime.fromisoformat(item['scheduled_time'])
                item_name = item['item']['name']
                item_dose = item['item']['dose']
            
            # Check if it's time for this supplement (within 1 minute)
            time_diff = abs((scheduled_time - current_time).total_seconds())
            if time_diff <= 60:  # Within 1 minute
                # Check if not already completed
                # Use the same ID format as in _update_today_display
                item_id = f"{item_name}_{scheduled_time.strftime('%I:%M %p').replace(':', '')}"
                if self.item_states.get(item_id, 0) != 2:  # Not completed
                    title = "💊 Time for Supplement!"
                    body = f"It's time to take:\n\n{item_name}\nDose: {item_dose}\nTime: {scheduled_time.strftime('%I:%M %p')}"
                    
                    self._send_pushbullet_notification(title, body)
                    
                    # Mark as notified to avoid spam
                    self.item_states[f"{item_id}_notified"] = True
    
    def _update_week_display(self):
        """Update week view display"""
        from datetime import datetime, timedelta
        
        # Clear existing widgets
        for widget in self.week_frame.winfo_children():
            widget.destroy()
        
        if not self.current_schedule:
            ttk.Label(self.week_frame, text="No schedule available. Generate a plan first.").pack(pady=20)
            return
        
        # Create scrollable frame
        canvas = tk.Canvas(self.week_frame)
        scrollbar = ttk.Scrollbar(self.week_frame, orient="vertical", command=canvas.yview)
        scrollable_frame = ttk.Frame(canvas)
        
        scrollable_frame.bind(
            "<Configure>",
            lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
        )
        
        canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)
        
        # Get current week (7 days starting from today)
        today = datetime.now().date()
        week_dates = [today + timedelta(days=i) for i in range(7)]
        
        # Create week grid
        for i, date in enumerate(week_dates):
            date_str = date.isoformat()
            day_name = date.strftime("%A")
            
            # Day header
            day_frame = ttk.LabelFrame(scrollable_frame, text=f"{day_name} {date.strftime('%m/%d')}", padding="5")
            day_frame.pack(fill=tk.X, pady=2)
            
            if date_str in self.current_schedule:
                items = self.current_schedule[date_str]
                for scheduled_item in items:
                    item_frame = ttk.Frame(day_frame)
                    item_frame.pack(fill=tk.X, pady=1)
                    
                    # Handle both dataclass objects and dictionaries
                    if hasattr(scheduled_item, 'scheduled_time'):
                        # Dataclass object
                        time_str = scheduled_item.scheduled_time.strftime("%I:%M %p")
                        item_name = scheduled_item.item.name
                        item_dose = scheduled_item.item.dose
                    else:
                        # Dictionary
                        from datetime import datetime
                        time_str = datetime.fromisoformat(scheduled_item['scheduled_time']).strftime("%I:%M %p")
                        item_name = scheduled_item['item']['name']
                        item_dose = scheduled_item['item']['dose']
                    
                    # Time
                    ttk.Label(item_frame, text=time_str, width=8).pack(side=tk.LEFT, padx=(0, 5))
                    
                    # Item name and dose
                    item_text = f"{item_name} — {item_dose}"
                    ttk.Label(item_frame, text=item_text, font=("TkDefaultFont", 9)).pack(side=tk.LEFT)
            else:
                ttk.Label(day_frame, text="No schedule", foreground="gray").pack()
        
        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")
    
    def _update_sixweek_display(self):
        """Update 6-week view display"""
        from datetime import datetime, timedelta
        
        # Clear existing widgets
        for widget in self.sixweek_frame.winfo_children():
            widget.destroy()
        
        if not self.current_schedule:
            ttk.Label(self.sixweek_frame, text="No schedule available. Generate a plan first.").pack(pady=20)
            return
        
        # Create scrollable frame
        canvas = tk.Canvas(self.sixweek_frame)
        scrollbar = ttk.Scrollbar(self.sixweek_frame, orient="vertical", command=canvas.yview)
        scrollable_frame = ttk.Frame(canvas)
        
        scrollable_frame.bind(
            "<Configure>",
            lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
        )
        
        canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)
        
        # Get all dates from schedule, sorted
        all_dates = sorted(self.current_schedule.keys())
        
        # Group by weeks
        weeks = []
        current_week = []
        
        for date_str in all_dates:
            date = datetime.fromisoformat(date_str).date()
            current_week.append(date)
            
            # If we have 7 days or it's the last date, start a new week
            if len(current_week) == 7 or date_str == all_dates[-1]:
                weeks.append(current_week)
                current_week = []
        
        # Create week headers and content
        for week_num, week_dates in enumerate(weeks, 1):
            # Week header
            week_header = ttk.LabelFrame(scrollable_frame, text=f"Week {week_num}", padding="5")
            week_header.pack(fill=tk.X, pady=(10, 5))
            
            # Create collapsible week content
            week_content = ttk.Frame(week_header)
            week_content.pack(fill=tk.X)
            
            # Toggle button for week
            week_var = tk.BooleanVar(value=True)  # Start expanded
            week_toggle = ttk.Checkbutton(week_header, text=f"Show Week {week_num}", variable=week_var,
                                        command=lambda w=week_content, v=week_var: self._toggle_week_content(w, v))
            week_toggle.pack(anchor=tk.W, pady=(0, 5))
            
            # Week content
            for date in week_dates:
                date_str = date.isoformat()
                day_name = date.strftime("%A")
                
                # Day header
                day_frame = ttk.LabelFrame(week_content, text=f"{day_name} {date.strftime('%m/%d')}", padding="3")
                day_frame.pack(fill=tk.X, pady=1)
                
                if date_str in self.current_schedule:
                    items = self.current_schedule[date_str]
                    for scheduled_item in items:
                        item_frame = ttk.Frame(day_frame)
                        item_frame.pack(fill=tk.X, pady=1)
                        
                        # Handle both dataclass objects and dictionaries
                        if hasattr(scheduled_item, 'scheduled_time'):
                            # Dataclass object
                            time_str = scheduled_item.scheduled_time.strftime("%I:%M %p")
                            item_name = scheduled_item.item.name
                            item_dose = scheduled_item.item.dose
                        else:
                            # Dictionary
                            from datetime import datetime
                            time_str = datetime.fromisoformat(scheduled_item['scheduled_time']).strftime("%I:%M %p")
                            item_name = scheduled_item['item']['name']
                            item_dose = scheduled_item['item']['dose']
                        
                        # Time
                        ttk.Label(item_frame, text=time_str, width=8).pack(side=tk.LEFT, padx=(0, 5))
                        
                        # Item name and dose
                        item_text = f"{item_name} — {item_dose}"
                        ttk.Label(item_frame, text=item_text, font=("TkDefaultFont", 9)).pack(side=tk.LEFT)
                else:
                    ttk.Label(day_frame, text="No schedule", foreground="gray").pack()
        
        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")
    
    def _toggle_week_content(self, content_frame, var):
        """Toggle visibility of week content"""
        if var.get():
            content_frame.pack(fill=tk.X)
        else:
            content_frame.pack_forget()
    
    def _toggle_day_type(self):
        """Toggle between light and sweaty day"""
        current = self.day_type_var.get()
        if current == "Light Day":
            self.day_type_var.set("Sweaty Day")
            self.settings.electrolyte_intensity = "sweaty"
        else:
            self.day_type_var.set("Light Day")
            self.settings.electrolyte_intensity = "light"
        
        self._save_settings()
        self._update_schedule_display()
    
    def _export_csv(self):
        """Export schedule to CSV"""
        if not self.current_schedule:
            messagebox.showwarning("No Data", "No schedule to export. Generate a plan first.")
            return
        
        filename = filedialog.asksaveasfilename(
            defaultextension=".csv",
            filetypes=[("CSV files", "*.csv"), ("All files", "*.*")]
        )
        
        if filename:
            self._write_csv(filename)
            messagebox.showinfo("Success", f"Schedule exported to {filename}")
    
    def _write_csv(self, filename: str):
        """Write schedule to CSV file"""
        with open(filename, 'w', newline='') as csvfile:
            writer = csv.writer(csvfile)
            writer.writerow(['Date', 'Time', 'Item', 'Dose', 'Notes', 'DayType'])
            
            for date_str, items in sorted(self.current_schedule.items()):
                for item in items:
                    # Handle both dataclass objects and dictionaries
                    if hasattr(item, 'scheduled_time'):
                        # Dataclass object
                        time_str = item.scheduled_time.strftime("%H:%M")
                        item_name = item.item.name
                        item_dose = item.item.dose
                        item_notes = item.item.notes
                        day_type = item.day_type.value
                    else:
                        # Dictionary
                        from datetime import datetime
                        time_str = datetime.fromisoformat(item['scheduled_time']).strftime("%H:%M")
                        item_name = item['item']['name']
                        item_dose = item['item']['dose']
                        item_notes = item['item']['notes']
                        day_type = item['day_type']
                    
                    writer.writerow([
                        date_str,
                        time_str,
                        item_name,
                        item_dose,
                        item_notes,
                        day_type
                    ])
    
    def _export_ical(self):
        """Export schedule to iCal format"""
        if not self.current_schedule:
            messagebox.showwarning("No Data", "No schedule to export. Generate a plan first.")
            return
        
        filename = filedialog.asksaveasfilename(
            defaultextension=".ics",
            filetypes=[("iCal files", "*.ics"), ("All files", "*.*")]
        )
        
        if filename:
            self._write_ical(filename)
            messagebox.showinfo("Success", f"Schedule exported to {filename}")
    
    def _write_ical(self, filename: str):
        """Write schedule to iCal file"""
        from datetime import datetime, timedelta
        
        with open(filename, 'w') as f:
            f.write("BEGIN:VCALENDAR\n")
            f.write("VERSION:2.0\n")
            f.write("PRODID:-//Daily Wellness Scheduler//EN\n")
            
            for date_str, items in self.current_schedule.items():
                for item in items:
                    # Handle both dataclass objects and dictionaries
                    if hasattr(item, 'scheduled_time'):
                        # Dataclass object
                        scheduled_time = item.scheduled_time
                        item_name = item.item.name
                        item_dose = item.item.dose
                        item_notes = item.item.notes
                    else:
                        # Dictionary
                        scheduled_time = datetime.fromisoformat(item['scheduled_time'])
                        item_name = item['item']['name']
                        item_dose = item['item']['dose']
                        item_notes = item['item']['notes']
                    
                    # Format datetime for iCal
                    dt_start = scheduled_time.strftime("%Y%m%dT%H%M%S")
                    dt_end = (scheduled_time + timedelta(minutes=15)).strftime("%Y%m%dT%H%M%S")
                    
                    f.write("BEGIN:VEVENT\n")
                    f.write(f"DTSTART:{dt_start}\n")
                    f.write(f"DTEND:{dt_end}\n")
                    f.write(f"SUMMARY:{item_name}\n")
                    f.write(f"DESCRIPTION:{item_dose} - {item_notes}\n")
                    f.write("END:VEVENT\n")
            
            f.write("END:VCALENDAR\n")
    
    def run(self):
        """Start the GUI application"""
        self.root.mainloop()


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description="Daily Wellness Scheduler")
    parser.add_argument("--today", action="store_true", help="Print today's schedule")
    parser.add_argument("--export-csv", help="Export schedule to CSV file")
    parser.add_argument("--export-ics", help="Export schedule to iCal file")
    parser.add_argument("--light", action="store_true", help="Use light day mode")
    parser.add_argument("--sweaty", action="store_true", help="Use sweaty day mode")
    parser.add_argument("--headless", action="store_true", help="Run in headless mode")
    
    args = parser.parse_args()
    
    if args.headless or args.today or args.export_csv or args.export_ics:
        # CLI mode - load existing schedule or create simple daily schedule
        app = DailyWellnessApp()
        if not app.current_schedule:
            # Generate simple daily schedule if none exists
            app.current_schedule = app._generate_simple_daily_schedule()
        
        schedule = app.current_schedule
        
        if args.today:
            today = datetime.now().date().isoformat()
            if today in schedule:
                print(f"Today's Schedule ({today}):")
                print("-" * 40)
                for item in schedule[today]:
                    # Handle both dataclass objects and dictionaries
                    if hasattr(item, 'scheduled_time'):
                        # Dataclass object
                        time_str = item.scheduled_time.strftime("%I:%M %p")
                        item_name = item.item.name
                        item_dose = item.item.dose
                        item_notes = item.item.notes
                    else:
                        # Dictionary
                        time_str = datetime.fromisoformat(item['scheduled_time']).strftime("%I:%M %p")
                        item_name = item['item']['name']
                        item_dose = item['item']['dose']
                        item_notes = item['item']['notes']
                    
                    print(f"{time_str}: {item_name} — {item_dose}")
                    if item_notes:
                        print(f"    • {item_notes}")
            else:
                print("No schedule available for today.")
        
        if args.export_csv:
            app = WellnessSchedulerApp()
            app.current_schedule = schedule
            app._write_csv(args.export_csv)
            print(f"Schedule exported to {args.export_csv}")
        
        if args.export_ics:
            app = WellnessSchedulerApp()
            app.current_schedule = schedule
            app._write_ical(args.export_ics)
            print(f"Schedule exported to {args.export_ics}")
    else:
        # GUI mode
        app = WellnessSchedulerApp()
        app.run()


if __name__ == "__main__":
    main()
