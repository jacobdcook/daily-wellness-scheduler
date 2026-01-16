from datetime import datetime, timedelta, time
from typing import Dict, List, Optional, Tuple
from copy import deepcopy
import uuid
from dataclasses import dataclass
from .models import (
    UserSettings, SupplementItem, ScheduledItem, DayType, TimingRule,
    ScheduleItemType, GeneralTaskItem
)

@dataclass
class ScheduleWarning:
    """Warning about schedule generation"""
    date: str
    supplement_name: str
    reason: str
    severity: str = "warning"  # "warning" or "error"

class SupplementScheduler:
    """Core scheduling engine for supplement timing"""
    
    def __init__(self, settings: UserSettings):
        self.settings = settings
        self.supplements = self._create_default_supplements()
        self.schedule_cache = {}
        
        # SAFETY CHECK: Warn if no supplements are configured
        if len(self.supplements) == 0:
            print(f"⚠️  WARNING: SupplementScheduler initialized with 0 supplements. This will result in empty schedules!")
        
    def _create_default_supplements(self) -> List[SupplementItem]:
        """Create the default supplement regimen.
        Always returns core supplements. Optional supplements are included based on optional_items settings."""
        
        # Always return core supplements (non-optional ones)
        # Optional supplements are filtered later based on optional_items settings
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
                enabled=True,
                caloric=False,
                fasting_action="allow",
                fasting_notes="No sugar/citric; hydration OK"
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
                enabled=True,
                caloric=False,
                fasting_action="allow",
                fasting_notes="Mineral capsule; OK"
            ),
            SupplementItem(
                name="PepZin GI",
                dose="37.5 mg Zinc-Carnosine, twice daily",
                timing_rule=TimingRule.WITH_MEAL,
                notes="",
                window_minutes=15,
                anchor="lunch",
                offset_minutes=0,
                conflicts=[],
                enabled=True,
                caloric=False,
                fasting_action="meal_dependent",
                fasting_notes="Take with a meal only"
            ),
            SupplementItem(
                name="PepZin GI",
                dose="37.5 mg Zinc-Carnosine, twice daily",
                timing_rule=TimingRule.WITH_MEAL,
                notes="",
                window_minutes=15,
                anchor="dinner",
                offset_minutes=0,
                conflicts=[],
                enabled=True,
                caloric=False,
                fasting_action="meal_dependent",
                fasting_notes="Take with a meal only"
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
                enabled=True,
                caloric=False,
                fasting_action="meal_dependent",
                fasting_notes="Take before a meal only"
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
                enabled=True,
                caloric=False,
                fasting_action="meal_dependent",
                fasting_notes="Take before a meal only"
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
                enabled=True,
                caloric=False,
                fasting_action="defer",
                fasting_notes="Liquid calories; breaks strict fast — defer to feeding window"
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
                enabled=True,
                caloric=False,
                fasting_action="allow",
                fasting_notes="Zero-calorie capsule; fine during fast"
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
                enabled=True,
                caloric=False,
                fasting_action="meal_dependent",
                fasting_notes="Take with a meal only"
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
                optional=True,
                caloric=False,
                fasting_action="allow",
                fasting_notes=""
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
                optional=True,
                caloric=False,
                fasting_action="allow",
                fasting_notes=""
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
                optional=True,
                caloric=True,
                fasting_action="defer",
                fasting_notes="Amino acid has calories; defer on light fast; skip on strict"
            ),
            SupplementItem(
                name="L-Glutamine",
                dose="5 g powder",
                timing_rule=TimingRule.BETWEEN_MEALS,
                notes="Gut support, not with hot drinks",
                window_minutes=120,  # Increased window to avoid lunch conflict
                anchor="study_start",
                offset_minutes=300,  # 5 hours after study start (2:30 PM) - moved later to ensure sufficient buffer from lunch
                conflicts=["meals", "hot_drinks"],
                enabled=False,
                optional=True,
                caloric=True,
                fasting_action="defer",
                fasting_notes="Amino acid has calories; defer on light fast; skip on strict"
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
                optional=True,
                caloric=True,
                fasting_action="defer",
                fasting_notes="Protein breaks fast; move to feeding window"
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
                optional=True,
                caloric=True,
                fasting_action="defer",
                fasting_notes="Protein breaks fast; move to feeding window"
            )
        ]
    
    def generate_schedule(self, start_date: datetime, weeks: int = 6) -> Tuple[Dict[str, List[ScheduledItem]], List[ScheduleWarning]]:
        """Generate a complete schedule for the specified period.
        
        Returns:
            Tuple of (schedule_dict, warnings_list)
        """
        schedule = {}
        all_warnings = []
        current_date = start_date.date()
        
        # Always generate general schedule (meals, water, workouts, etc.)
        general_schedule = self._generate_general_schedule(start_date, weeks)
        
        # Only generate supplements if enabled
        supplement_schedule = {}
        if getattr(self.settings, 'enable_supplements', False):
            supplement_schedule, all_warnings = self._generate_supplement_schedule(start_date, weeks)
        
        # Merge schedules
        for week in range(weeks):
            for day in range(7):
                date = current_date + timedelta(days=week * 7 + day)
                date_str = date.isoformat()
                
                items = general_schedule.get(date_str, [])
                if date_str in supplement_schedule:
                    items.extend(supplement_schedule[date_str])
                
                # Sort by scheduled time
                schedule[date_str] = sorted(items, key=lambda x: x.scheduled_time)
                
        return schedule, all_warnings
    
    def _generate_general_schedule(self, start_date: datetime, weeks: int = 6) -> Dict[str, List[ScheduledItem]]:
        """Generate general schedule items (meals, water, workouts, etc.) - always included"""
        schedule = {}
        current_date = start_date.date()
        
        for week in range(weeks):
            for day in range(7):
                date = current_date + timedelta(days=week * 7 + day)
                date_str = date.isoformat()
                day_of_week = date.weekday()  # 0 = Monday, 6 = Sunday
                
                items = []
                
                # Create time anchors
                anchors = self._create_time_anchors(date, self.settings.workout_days[day], self._should_have_breakfast(date, day))
                
                # Meals are no longer automatically added - users can add them manually if needed
                # Removed automatic meal scheduling to keep schedule focused on supplements only
                
                # Add workout if scheduled
                if self.settings.workout_days[day] and self.settings.workout_time:
                    try:
                        workout_time_parts = self.settings.workout_time.split(':')
                        workout_hour = int(workout_time_parts[0])
                        workout_minute = int(workout_time_parts[1])
                        workout_dt = datetime.combine(date, time(workout_hour, workout_minute))
                        
                        workout_task = GeneralTaskItem(
                            name="Workout",
                            description="Exercise session",
                            category="workout",
                            notes="",
                            enabled=True
                        )
                        items.append(ScheduledItem(
                            id=str(uuid.uuid4()),
                            item_type=ScheduleItemType.WORKOUT,
                            item=workout_task,
                            scheduled_time=workout_dt,
                            day_type=DayType.SWEATY
                        ))
                    except Exception as e:
                        print(f"Error scheduling workout: {e}")
                
                # Water reminders are no longer automatically added - users can add them manually if needed
                # Removed automatic water reminders to keep schedule focused on supplements only
                
                # Bedtime reminder is no longer automatically added - users can add it manually if needed
                # Removed automatic bedtime reminder to keep schedule focused on supplements only
                
                # Add custom tasks from settings.default_tasks
                # These are user-defined recurring tasks that should be added to the schedule
                if hasattr(self.settings, 'default_tasks') and self.settings.default_tasks:
                    for task in self.settings.default_tasks:
                        if not task.enabled:
                            continue
                        
                        # Calculate task time based on category and anchors
                        task_time = None
                        
                        if task.category == "habit":
                            # Morning habits: 1 hour after wake
                            if "wake" in anchors:
                                task_time = anchors["wake"] + timedelta(hours=1)
                        elif task.category == "workout":
                            # Use workout time if available
                            if self.settings.workout_days[day] and self.settings.workout_time:
                                try:
                                    workout_time_parts = self.settings.workout_time.split(':')
                                    workout_hour = int(workout_time_parts[0])
                                    workout_minute = int(workout_time_parts[1])
                                    task_time = datetime.combine(date, time(workout_hour, workout_minute))
                                except:
                                    pass
                        elif task.category == "medication":
                            # Medications: with breakfast or at wake time
                            if "breakfast" in anchors:
                                task_time = anchors["breakfast"]
                            elif "wake" in anchors:
                                task_time = anchors["wake"] + timedelta(minutes=30)
                        elif task.category == "hydration":
                            # Hydration: spread throughout day (already handled above, but can add custom ones)
                            if "wake" in anchors:
                                task_time = anchors["wake"] + timedelta(hours=2)
                        else:
                            # Default: 2 hours after wake
                            if "wake" in anchors:
                                task_time = anchors["wake"] + timedelta(hours=2)
                        
                        # If we have a time, add the task
                        if task_time:
                            # Determine item type based on category
                            item_type_map = {
                                "habit": ScheduleItemType.HABIT,
                                "workout": ScheduleItemType.WORKOUT,
                                "medication": ScheduleItemType.MEDICATION,
                                "hydration": ScheduleItemType.HYDRATION,
                                "meal": ScheduleItemType.MEAL,
                                "reminder": ScheduleItemType.REMINDER,
                                "custom": ScheduleItemType.CUSTOM
                            }
                            item_type = item_type_map.get(task.category, ScheduleItemType.TASK)
                            
                            items.append(ScheduledItem(
                                id=str(uuid.uuid4()),
                                item_type=item_type,
                                item=task,
                                scheduled_time=task_time,
                                day_type=DayType.LIGHT
                            ))
                
                schedule[date_str] = items
                
        return schedule
    
    def _generate_supplement_schedule(self, start_date: datetime, weeks: int = 6) -> Tuple[Dict[str, List[ScheduledItem]], List[ScheduleWarning]]:
        """Generate supplement schedule - only called if enable_supplements is True"""
        schedule = {}
        all_warnings = []
        current_date = start_date.date()
        
        # SAFEGUARD: Track which optional items are enabled
        enabled_optional_names = set()
        name_map = {
            "slippery_elm_tea": "slippery_elm",
            "collagen_peptides": "collagen"
        }
        for supplement in self.supplements:
            if supplement.optional:
                raw_key = supplement.name.lower().replace(" ", "_").replace("-", "_")
                item_key = name_map.get(raw_key, raw_key)
                if self.settings.optional_items.get(item_key, False):
                    enabled_optional_names.add(supplement.name)
        
        for week in range(weeks):
            for day in range(7):
                date = current_date + timedelta(days=week * 7 + day)
                date_str = date.isoformat()
                
                # Determine if it's a workout day
                is_workout = self.settings.workout_days[day]
                
                # Day type is determined by workout days (sweaty) or global setting (light)
                if is_workout:
                    day_type = DayType.SWEATY
                else:
                    day_type = DayType.LIGHT if self.settings.electrolyte_intensity == "light" else DayType.SWEATY
                
                # Determine if breakfast is scheduled
                has_breakfast = self._should_have_breakfast(date, day)
                
                day_schedule, day_warnings = self._schedule_day(date, day_type, is_workout, has_breakfast)
                all_warnings.extend(day_warnings)
                
                # Check for interactions and adjust timing if needed
                day_schedule = self._check_and_adjust_interactions(day_schedule, date)
                
                # SAFEGUARD: Validate that all enabled optional items are scheduled
                scheduled_names = {item.item.name for item in day_schedule}
                missing_optional = enabled_optional_names - scheduled_names
                if missing_optional:
                    # Count occurrences (some optional items appear multiple times, e.g., L-Glutamine, Collagen)
                    name_counts = {}
                    for item in day_schedule:
                        name = item.item.name
                        name_counts[name] = name_counts.get(name, 0) + 1
                    
                    # Check if we're missing any instances
                    for supp in self.supplements:
                        if supp.optional and supp.name in missing_optional:
                            raw_key = supp.name.lower().replace(" ", "_").replace("-", "_")
                            item_key = name_map.get(raw_key, raw_key)
                            if self.settings.optional_items.get(item_key, False):
                                expected_count = sum(1 for s in self.supplements if s.name == supp.name and s.optional)
                                actual_count = name_counts.get(supp.name, 0)
                                if actual_count < expected_count:
                                    warning_msg = f"{supp.name} is enabled but only {actual_count}/{expected_count} instance(s) scheduled"
                                    print(f"⚠️  VALIDATION WARNING for {date_str}: {warning_msg}")
                                    all_warnings.append(ScheduleWarning(
                                        date=date_str,
                                        supplement_name=supp.name,
                                        reason=warning_msg,
                                        severity="warning"
                                    ))
                
                schedule[date_str] = day_schedule
                
        return schedule, all_warnings
    
    def _should_have_breakfast(self, date: datetime.date, day_of_week: int) -> bool:
        """Determine if breakfast should be scheduled for this day"""
        if self.settings.breakfast_mode == "skip":
            return False
        elif self.settings.breakfast_mode == "usually":
            return True
        else:  # sometimes
            return self.settings.breakfast_days[day_of_week]
    
    def _schedule_day(self, date: datetime.date, day_type: DayType, is_workout: bool, has_breakfast: bool) -> Tuple[List[ScheduledItem], List[ScheduleWarning]]:
        """Schedule all supplements for a single day.
        
        Returns:
            Tuple of (scheduled_items_list, warnings_list)
        """
        scheduled_items = []
        deferred_items = []  # Items to defer to feeding window
        failed_optional_items = []  # Track optional items that failed to schedule
        warnings = []
        
        # Create time anchors for the day
        anchors = self._create_time_anchors(date, is_workout, has_breakfast)
        
        # Handle fasting mode
        is_fasting = self.settings.fasting == "yes"
        feeding_window_times = None
        
        if is_fasting:
            feeding_window_times = self._get_feeding_window_times(date, anchors, has_breakfast)
            
            # Schedule each enabled supplement
        for supplement in self.supplements:
            is_optional = supplement.optional
            if not supplement.enabled and not is_optional:
                continue
                
            if is_optional:
                # Check if this optional item is enabled
                # Map complex names to simple settings keys
                name_map = {
                    "slippery_elm_tea": "slippery_elm",
                    "collagen_peptides": "collagen"
                }
                
                raw_key = supplement.name.lower().replace(" ", "_").replace("-", "_")
                item_key = name_map.get(raw_key, raw_key)
                
                enabled_in_settings = self.settings.optional_items.get(item_key, False)
                print(f"Checking {supplement.name} (key: {item_key}): {enabled_in_settings}")
                
                if not enabled_in_settings:
                    continue
            
            # Apply fasting logic if enabled
            if is_fasting:
                action = self._get_fasting_action(supplement, anchors, feeding_window_times, has_breakfast)
                if action == "skip":
                    print(f"Skipping {supplement.name} due to fasting skip")
                    if is_optional:
                        failed_optional_items.append((supplement, "skipped due to fasting"))
                    continue
                elif action == "defer":
                    deferred_items.append(supplement)
                    print(f"Deferring {supplement.name} due to fasting")
                    continue
            
            # Adjust electrolyte dose based on day type
            supplement_to_schedule = supplement
            if supplement.name == "Electrolyte Mix":
                if day_type == DayType.SWEATY:
                    # Create a modified version with higher dose for sweaty days
                    supplement_to_schedule = deepcopy(supplement)
                    supplement_to_schedule.dose = "1.5 L water (increased for workout day)"
                    supplement_to_schedule.notes = supplement.notes + " - Extra hydration for active day"
                
            scheduled_time = self._find_best_time(supplement_to_schedule, anchors, scheduled_items, day_type)
            
            # SAFEGUARD: For optional items, try harder to find a time if initial attempt fails
            if not scheduled_time and is_optional:
                scheduled_time = self._find_fallback_time(supplement_to_schedule, anchors, scheduled_items, day_type, date)
                if scheduled_time:
                    print(f"⚠️  Scheduled {supplement_to_schedule.name} at fallback time {scheduled_time} (original time conflicted)")
            
            # SPECIAL FIX: For L-Glutamine specifically, ensure both instances are scheduled
            # If this is the second L-Glutamine and first one was scheduled, try even harder
            if supplement_to_schedule.name == "L-Glutamine" and is_optional:
                # Count how many L-Glutamine instances are already scheduled
                scheduled_l_glutamine_count = sum(1 for item in scheduled_items if item.item.name == "L-Glutamine")
                # Count how many L-Glutamine instances should be scheduled (total in supplements list)
                total_l_glutamine_count = sum(1 for s in self.supplements if s.name == "L-Glutamine" and s.optional)
                
                # If we haven't scheduled all instances yet and this one failed, try even more aggressively
                if scheduled_l_glutamine_count < total_l_glutamine_count and not scheduled_time:
                    # Try multiple strategies to find a valid time
                    # Strategy 1: Use the intended anchor if available
                    if supplement_to_schedule.anchor in anchors:
                        base_time = anchors[supplement_to_schedule.anchor] + timedelta(minutes=supplement_to_schedule.offset_minutes)
                        # Try a very wide range: up to 4 hours in either direction
                        for hours_offset in [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4]:
                            for direction in [-1, 1]:
                                test_time = base_time + timedelta(hours=hours_offset * direction)
                                # Use very relaxed validation (15 min meal buffer)
                                if self._is_time_valid_very_relaxed(test_time, supplement_to_schedule, scheduled_items, anchors):
                                    scheduled_time = test_time
                                    print(f"✅ Force-scheduled L-Glutamine at {scheduled_time} using anchor {supplement_to_schedule.anchor} (very relaxed rules)")
                                    break
                            if scheduled_time:
                                break
                    
                    # Strategy 2: If anchor-based approach failed, try using other common anchors
                    if not scheduled_time:
                        # Try using wake time as base (most reliable anchor)
                        if "wake" in anchors:
                            wake_time = anchors["wake"]
                            # Try times throughout the day (avoiding meals)
                            for hours_after_wake in [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]:
                                test_time = wake_time + timedelta(hours=hours_after_wake)
                                if self._is_time_valid_very_relaxed(test_time, supplement_to_schedule, scheduled_items, anchors):
                                    scheduled_time = test_time
                                    print(f"✅ Force-scheduled L-Glutamine at {scheduled_time} using wake anchor fallback (very relaxed rules)")
                                    break
                                if scheduled_time:
                                    break
                    
                    # Strategy 3: Last resort - find ANY valid time in the day
                    if not scheduled_time:
                        # Start from 8 AM and try every 30 minutes until 10 PM
                        start_of_day = datetime.combine(date, time(8, 0))
                        for minutes_offset in range(0, 14 * 60, 30):  # 8 AM to 10 PM in 30-min increments
                            test_time = start_of_day + timedelta(minutes=minutes_offset)
                            if self._is_time_valid_very_relaxed(test_time, supplement_to_schedule, scheduled_items, anchors):
                                scheduled_time = test_time
                                print(f"✅ Force-scheduled L-Glutamine at {scheduled_time} using brute-force search (very relaxed rules)")
                                break
            
            if scheduled_time:
                print(f"Scheduled {supplement_to_schedule.name} at {scheduled_time}")
                scheduled_item = ScheduledItem(
                    id=str(uuid.uuid4()),
                    item_type=ScheduleItemType.SUPPLEMENT,
                    item=supplement_to_schedule,
                    scheduled_time=scheduled_time,
                    day_type=day_type
                )
                scheduled_items.append(scheduled_item)
                
                # On sweaty days, add a second electrolyte serving after workout (if workout time is set)
                if supplement_to_schedule.name == "Electrolyte Mix" and day_type == DayType.SWEATY and is_workout and self.settings.workout_time:
                    try:
                        workout_time_parts = self.settings.workout_time.split(':')
                        workout_hour = int(workout_time_parts[0])
                        workout_minute = int(workout_time_parts[1])
                        workout_dt = datetime.combine(date, time(workout_hour, workout_minute))
                        # Add second serving 30 minutes after workout
                        second_electrolyte_time = workout_dt + timedelta(minutes=30)
                        
                        # Check if this time is valid (not too close to meals)
                        if self._is_time_valid(second_electrolyte_time, supplement_to_schedule, scheduled_items, anchors):
                            second_electrolyte = deepcopy(supplement_to_schedule)
                            second_electrolyte.dose = "0.5 L water (post-workout)"
                            second_electrolyte.notes = "Post-workout hydration"
                            second_item = ScheduledItem(
                                id=str(uuid.uuid4()),
                                item_type=ScheduleItemType.SUPPLEMENT,
                                item=second_electrolyte,
                                scheduled_time=second_electrolyte_time,
                                day_type=day_type
                            )
                            scheduled_items.append(second_item)
                            print(f"Added post-workout electrolyte at {second_electrolyte_time}")
                    except Exception as e:
                        print(f"Error adding post-workout electrolyte: {e}")
            else:
                if is_optional:
                    reason = "could not find valid time - tried multiple fallback strategies"
                    failed_optional_items.append((supplement_to_schedule, reason))
                    warnings.append(ScheduleWarning(
                        date=date.isoformat(),
                        supplement_name=supplement_to_schedule.name,
                        reason=reason,
                        severity="warning"
                    ))
                print(f"⚠️  WARNING: Failed to find time for {supplement_to_schedule.name}" + (" (OPTIONAL - user enabled but couldn't schedule)" if is_optional else ""))
        
        # SAFEGUARD: Log warnings for failed optional items
        if failed_optional_items:
            print(f"\n⚠️  WARNING: {len(failed_optional_items)} optional supplement(s) could not be scheduled for {date}:")
            for supp, reason in failed_optional_items:
                print(f"   - {supp.name}: {reason}")
        
        # POST-PROCESSING: Ensure all L-Glutamine instances are scheduled (critical safeguard)
        scheduled_l_glutamine_count = sum(1 for item in scheduled_items if item.item.name == "L-Glutamine")
        total_l_glutamine_count = sum(1 for s in self.supplements if s.name == "L-Glutamine" and s.optional)
        
        # Check if L-Glutamine is enabled in settings (use same logic as main loop)
        name_map = {
            "slippery_elm_tea": "slippery_elm",
            "collagen_peptides": "collagen"
        }
        l_glutamine_enabled = False
        for supp in self.supplements:
            if supp.name == "L-Glutamine" and supp.optional:
                raw_key = supp.name.lower().replace(" ", "_").replace("-", "_")
                item_key = name_map.get(raw_key, raw_key)  # "l_glutamine"
                l_glutamine_enabled = self.settings.optional_items.get(item_key, False)
                if l_glutamine_enabled:
                    print(f"🔧 POST-PROCESSING: L-Glutamine is enabled (key: {item_key})")
                    break
        
        if l_glutamine_enabled and scheduled_l_glutamine_count < total_l_glutamine_count:
            print(f"\n🔧 POST-PROCESSING: Found {scheduled_l_glutamine_count}/{total_l_glutamine_count} L-Glutamine instances. Attempting to schedule missing ones...")
            
            # Find which L-Glutamine instances are missing by tracking which anchors are scheduled
            scheduled_anchors = {item.item.anchor for item in scheduled_items if item.item.name == "L-Glutamine"}
            print(f"   Scheduled anchors: {scheduled_anchors}")
            
            # Find all L-Glutamine supplements that should be scheduled
            all_l_glutamine_supps = [s for s in self.supplements if s.name == "L-Glutamine" and s.optional]
            print(f"   Total L-Glutamine supplements to schedule: {len(all_l_glutamine_supps)}")
            
            for supp in all_l_glutamine_supps:
                # Check if this specific instance is already scheduled
                is_scheduled = any(
                    item.item.name == "L-Glutamine" and 
                    item.item.anchor == supp.anchor and
                    item.item.offset_minutes == supp.offset_minutes
                    for item in scheduled_items
                )
                
                if not is_scheduled:
                    # This instance is missing, try to schedule it
                    print(f"   ⚠️  Missing L-Glutamine instance (anchor: {supp.anchor}, offset: {supp.offset_minutes}min). Attempting to schedule...")
                    
                    # Try multiple strategies with even more aggressive search
                    scheduled_time = None
                    
                    # Strategy 1: Use intended anchor with wide search
                    if supp.anchor in anchors:
                        base_time = anchors[supp.anchor] + timedelta(minutes=supp.offset_minutes)
                        print(f"      Strategy 1: Trying anchor {supp.anchor} at base time {base_time}")
                        for hours_offset in [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6]:
                            for direction in [-1, 1]:
                                test_time = base_time + timedelta(hours=hours_offset * direction)
                                if self._is_time_valid_very_relaxed(test_time, supp, scheduled_items, anchors):
                                    scheduled_time = test_time
                                    print(f"      ✅ Found valid time at {test_time} (offset: {hours_offset * direction}h)")
                                    break
                            if scheduled_time:
                                break
                    
                    # Strategy 2: Use wake anchor as fallback
                    if not scheduled_time and "wake" in anchors:
                        wake_time = anchors["wake"]
                        print(f"      Strategy 2: Trying wake anchor at {wake_time}")
                        for hours_after_wake in [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]:
                            test_time = wake_time + timedelta(hours=hours_after_wake)
                            if self._is_time_valid_very_relaxed(test_time, supp, scheduled_items, anchors):
                                scheduled_time = test_time
                                print(f"      ✅ Found valid time at {test_time} ({hours_after_wake}h after wake)")
                                break
                    
                    # Strategy 3: Brute force - try every 15 minutes from 6 AM to 11 PM
                    if not scheduled_time:
                        print(f"      Strategy 3: Brute force search (6 AM - 11 PM, every 15 min)")
                        start_of_day = datetime.combine(date, time(6, 0))
                        for minutes_offset in range(0, 17 * 60, 15):  # 6 AM to 11 PM
                            test_time = start_of_day + timedelta(minutes=minutes_offset)
                            if self._is_time_valid_very_relaxed(test_time, supp, scheduled_items, anchors):
                                scheduled_time = test_time
                                print(f"      ✅ Found valid time at {test_time} (brute force)")
                                break
                    
                    if scheduled_time:
                        scheduled_item = ScheduledItem(
                            id=str(uuid.uuid4()),
                            item_type=ScheduleItemType.SUPPLEMENT,
                            item=supp,
                            scheduled_time=scheduled_time,
                            day_type=day_type
                        )
                        scheduled_items.append(scheduled_item)
                        print(f"   ✅ Successfully scheduled missing L-Glutamine at {scheduled_time} (anchor: {supp.anchor})")
                    else:
                        print(f"   ❌ CRITICAL: Failed to schedule missing L-Glutamine (anchor: {supp.anchor}) after all strategies")
                        # Add a warning
                        warnings.append(ScheduleWarning(
                            date=date.isoformat(),
                            supplement_name="L-Glutamine",
                            reason=f"Could not schedule L-Glutamine instance (anchor: {supp.anchor}) even with aggressive post-processing",
                            severity="error"
                        ))
                else:
                    print(f"   ✓ L-Glutamine instance (anchor: {supp.anchor}) is already scheduled")
            
            # Final verification
            final_count = sum(1 for item in scheduled_items if item.item.name == "L-Glutamine")
            print(f"\n🔧 POST-PROCESSING COMPLETE: {final_count}/{total_l_glutamine_count} L-Glutamine instances scheduled")
        
        # Schedule deferred items in feeding window
        if is_fasting and deferred_items and feeding_window_times:
            deferred_scheduled = self._schedule_deferred_items(deferred_items, feeding_window_times, date, day_type)
            scheduled_items.extend(deferred_scheduled)
        
        # FINAL SAFEGUARD: One last check AFTER deferred items to ensure all L-Glutamine instances are scheduled
        # This is the absolute last chance to schedule missing L-Glutamine
        final_l_glutamine_count = sum(1 for item in scheduled_items if item.item.name == "L-Glutamine")
        final_total_count = sum(1 for s in self.supplements if s.name == "L-Glutamine" and s.optional)
        
        # Check if L-Glutamine is enabled
        name_map = {
            "slippery_elm_tea": "slippery_elm",
            "collagen_peptides": "collagen"
        }
        l_glutamine_enabled = False
        for supp in self.supplements:
            if supp.name == "L-Glutamine" and supp.optional:
                raw_key = supp.name.lower().replace(" ", "_").replace("-", "_")
                item_key = name_map.get(raw_key, raw_key)
                l_glutamine_enabled = self.settings.optional_items.get(item_key, False)
                if l_glutamine_enabled:
                    break
        
        if l_glutamine_enabled and final_l_glutamine_count < final_total_count:
            print(f"\n🚨 FINAL SAFEGUARD (after deferred): Still missing {final_total_count - final_l_glutamine_count} L-Glutamine instance(s)! Forcing schedule...")
            
            # Get all L-Glutamine supplements
            all_l_glutamine = [s for s in self.supplements if s.name == "L-Glutamine" and s.optional]
            
            # Find which ones are missing by checking anchor+offset combination
            scheduled_combos = {
                (item.item.anchor, item.item.offset_minutes)
                for item in scheduled_items
                if item.item.name == "L-Glutamine"
            }
            
            for supp in all_l_glutamine:
                if (supp.anchor, supp.offset_minutes) not in scheduled_combos:
                    # This one is definitely missing - force schedule it at ANY reasonable time
                    print(f"   🚨 FORCING schedule for L-Glutamine (anchor: {supp.anchor}, offset: {supp.offset_minutes}min)")
                    
                    # Try to find ANY valid time with minimal constraints
                    forced_time = None
                    
                    # Start from 8 AM, try every 15 minutes
                    start_time = datetime.combine(date, time(8, 0))
                    for minutes_offset in range(0, 16 * 60, 15):  # 8 AM to midnight
                        test_time = start_time + timedelta(minutes=minutes_offset)
                        
                        # Use extremely relaxed validation - only check for exact time conflicts
                        has_exact_conflict = False
                        for existing_item in scheduled_items:
                            if existing_item.item.name == "L-Glutamine":
                                continue  # Allow multiple L-Glutamine
                            time_diff = abs((test_time - existing_item.scheduled_time).total_seconds() / 60)
                            if time_diff < 5:  # Only 5 minute buffer
                                has_exact_conflict = True
                                break
                        
                        # Check meal conflicts with minimal buffer
                        meal_conflict = False
                        if "meals" in supp.conflicts:
                            for meal_name in ["breakfast", "lunch", "dinner"]:
                                if meal_name in anchors:
                                    meal_time = anchors[meal_name]
                                    time_diff = abs((test_time - meal_time).total_seconds() / 60)
                                    if time_diff < 10:  # Only 10 minute buffer
                                        meal_conflict = True
                                        break
                        
                        if not has_exact_conflict and not meal_conflict:
                            forced_time = test_time
                            break
                    
                    if forced_time:
                        forced_item = ScheduledItem(
                            id=str(uuid.uuid4()),
                            item_type=ScheduleItemType.SUPPLEMENT,
                            item=supp,
                            scheduled_time=forced_time,
                            day_type=day_type
                        )
                        scheduled_items.append(forced_item)
                        print(f"   ✅ FORCED L-Glutamine at {forced_time} (anchor: {supp.anchor})")
                    else:
                        print(f"   ❌ CRITICAL: Could not force schedule L-Glutamine even with minimal constraints!")
            
            # Final count
            very_final_count = sum(1 for item in scheduled_items if item.item.name == "L-Glutamine")
            print(f"🚨 FINAL SAFEGUARD COMPLETE: {very_final_count}/{final_total_count} L-Glutamine instances scheduled")
        
        # Sort by time
        scheduled_items.sort(key=lambda x: x.scheduled_time)
        
        return scheduled_items, warnings
    
    def _get_feeding_window_times(self, date: datetime.date, anchors: Dict[str, datetime], has_breakfast: bool) -> Dict[str, datetime]:
        """Get feeding window start and end times for the day"""
        # Use feeding window from settings or derive from meals
        start_time_str = self.settings.feeding_window.get("start", "11:30")
        end_time_str = self.settings.feeding_window.get("end", "19:30")
        
        # If feeding window is missing in settings, derive from meals
        if not start_time_str or not end_time_str:
            if self.settings.lunch_mode == "yes" and "lunch" in anchors:
                start_time_str = anchors["lunch"].strftime("%H:%M")
            if self.settings.dinner_mode == "yes" and "dinner" in anchors:
                dinner_end = anchors["dinner"] + timedelta(minutes=60)
                end_time_str = dinner_end.strftime("%H:%M")
        
        start_time = self._parse_time(start_time_str)
        end_time = self._parse_time(end_time_str)
        
        return {
            "start": datetime.combine(date, start_time),
            "end": datetime.combine(date, end_time)
        }
    
    def _get_fasting_action(self, supplement: SupplementItem, anchors: Dict[str, datetime], 
                           feeding_window_times: Dict[str, datetime], has_breakfast: bool) -> str:
        """Determine what action to take with a supplement during fasting"""
        
        if supplement.fasting_action == "allow":
            return "allow"
        elif supplement.fasting_action == "skip":
            return "skip"
        elif supplement.fasting_action == "meal_dependent":
            # Check if the meal is skipped or outside feeding window
            anchor = supplement.anchor
            if anchor in ["breakfast", "lunch", "dinner"]:
                # Check if meal is scheduled
                if anchor == "breakfast" and not has_breakfast:
                    return "skip"
                if anchor == "lunch" and self.settings.lunch_mode != "yes":
                    return "skip"
                if anchor == "dinner" and self.settings.dinner_mode != "yes":
                    return "skip"
                
                # Check if meal time is outside feeding window
                if anchor in anchors:
                    meal_time = anchors[anchor]
                    if (meal_time < feeding_window_times["start"] or 
                        meal_time > feeding_window_times["end"]):
                        return "skip"
            
            return "allow"
        elif supplement.fasting_action == "defer":
            # Skip if strict fasting, defer if light fasting
            if self.settings.fasting_level == "strict":
                return "skip"
            else:
                return "defer"
        
        return "allow"
    
    def _schedule_deferred_items(self, deferred_items: List[SupplementItem], 
                                feeding_window_times: Dict[str, datetime], 
                                date: datetime.date, day_type: DayType) -> List[ScheduledItem]:
        """Schedule deferred items within the feeding window"""
        scheduled_items = []
        
        # Start scheduling 15 minutes after feeding window starts
        current_time = feeding_window_times["start"] + timedelta(minutes=15)
        
        # Keep original order and space by 15 minutes
        for supplement in deferred_items:
            # Make sure we don't exceed feeding window
            if current_time > feeding_window_times["end"]:
                break
                
            scheduled_item = ScheduledItem(
                id=str(uuid.uuid4()),
                item_type=ScheduleItemType.SUPPLEMENT,
                item=supplement,
                scheduled_time=current_time,
                day_type=day_type,
                shifted=True,
                shift_reason="Deferred to feeding window during fasting"
            )
            scheduled_items.append(scheduled_item)
            
            # Space items by 15 minutes, respecting window_minutes
            spacing = max(15, supplement.window_minutes)
            current_time += timedelta(minutes=spacing)
        
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
    
    def _find_fallback_time(self, supplement: SupplementItem, anchors: Dict[str, datetime],
                           existing_items: List[ScheduledItem], day_type: DayType, date: datetime.date) -> Optional[datetime]:
        """
        SAFEGUARD: Try harder to find a time for optional items when primary scheduling fails.
        This method attempts multiple fallback strategies to ensure optional items are scheduled.
        """
        # Strategy 1: Try a much wider time window around the original anchor
        if supplement.anchor in anchors:
            base_time = anchors[supplement.anchor] + timedelta(minutes=supplement.offset_minutes)
            # Try up to 3 hours in either direction, in 30-minute increments
            for hours_offset in range(1, 4):  # 1, 2, 3 hours
                for direction in [-1, 1]:
                    test_time = base_time + timedelta(hours=hours_offset * direction)
                    # Relax conflict checking slightly for optional items (reduce meal buffer to 30 min)
                    if self._is_time_valid_relaxed(test_time, supplement, existing_items, anchors, relaxed=True):
                        return test_time
        
        # Strategy 2: Try alternative anchors (for BETWEEN_MEALS items, try different meal gaps)
        if supplement.timing_rule == TimingRule.BETWEEN_MEALS:
            # Try between breakfast and lunch
            if "breakfast" in anchors and "lunch" in anchors:
                breakfast_time = anchors["breakfast"]
                lunch_time = anchors["lunch"]
                gap_minutes = (lunch_time - breakfast_time).total_seconds() / 60
                if gap_minutes > 120:  # At least 2 hours between meals
                    test_time = breakfast_time + timedelta(minutes=gap_minutes / 2)
                    if self._is_time_valid_relaxed(test_time, supplement, existing_items, anchors, relaxed=True):
                        return test_time
            
            # Try between lunch and dinner
            if "lunch" in anchors and "dinner" in anchors:
                lunch_time = anchors["lunch"]
                dinner_time = anchors["dinner"]
                gap_minutes = (dinner_time - lunch_time).total_seconds() / 60
                if gap_minutes > 120:  # At least 2 hours between meals
                    test_time = lunch_time + timedelta(minutes=gap_minutes / 2)
                    if self._is_time_valid_relaxed(test_time, supplement, existing_items, anchors, relaxed=True):
                        return test_time
        
        # Strategy 3: Try common "safe" times (mid-morning, mid-afternoon, early evening)
        wake_time = anchors.get("wake")
        if wake_time:
            # Mid-morning: 2-3 hours after wake
            for hours in [2, 2.5, 3]:
                test_time = wake_time + timedelta(hours=hours)
                if self._is_time_valid_relaxed(test_time, supplement, existing_items, anchors, relaxed=True):
                    return test_time
            
            # Mid-afternoon: 6-7 hours after wake
            for hours in [6, 6.5, 7]:
                test_time = wake_time + timedelta(hours=hours)
                if self._is_time_valid_relaxed(test_time, supplement, existing_items, anchors, relaxed=True):
                    return test_time
        
        # Strategy 4: Try right after meals (if meal-dependent items can't be scheduled with meals)
        if supplement.timing_rule == TimingRule.WITH_MEAL:
            for meal_name in ["breakfast", "lunch", "dinner"]:
                if meal_name in anchors:
                    # Try 15-30 minutes after meal
                    for minutes in [15, 20, 30]:
                        test_time = anchors[meal_name] + timedelta(minutes=minutes)
                        if self._is_time_valid_relaxed(test_time, supplement, existing_items, anchors, relaxed=True):
                            return test_time
        
        # If all strategies fail, return None
        return None
    
    def _is_time_valid_very_relaxed(self, scheduled_time: datetime, supplement: SupplementItem,
                                    existing_items: List[ScheduledItem], anchors: Dict[str, datetime]) -> bool:
        """Very relaxed validation for critical optional items (like second L-Glutamine)"""
        # Check meal conflicts with very relaxed buffer (15 minutes)
        if "meals" in supplement.conflicts:
            meal_buffer = 15  # Very relaxed
            for meal_name in ["breakfast", "lunch", "dinner"]:
                if meal_name in anchors:
                    meal_time = anchors[meal_name]
                    time_diff = abs((scheduled_time - meal_time).total_seconds() / 60)
                    if time_diff < meal_buffer:
                        return False
        
        # Check conflicts with other items (30 min buffer instead of 60)
        for existing_item in existing_items:
            if existing_item.item.name == supplement.name:
                # Allow same supplement at different times (they're meant to be multiple times)
                continue
            time_diff = abs((scheduled_time - existing_item.scheduled_time).total_seconds() / 60)
            if time_diff < 30:  # Reduced from 60
                return False
        
        return True
    
    def _is_time_valid_relaxed(self, scheduled_time: datetime, supplement: SupplementItem,
                               existing_items: List[ScheduledItem], anchors: Dict[str, datetime],
                               relaxed: bool = False) -> bool:
        """
        Check if a scheduled time is valid, with optional relaxed rules for fallback scheduling.
        When relaxed=True, reduces meal buffer from 60 to 30 minutes for optional items.
        """
        # Check meal conflicts (with relaxed buffer if requested)
        if "meals" in supplement.conflicts:
            meal_buffer = 30 if relaxed else 60
            for meal_name in ["breakfast", "lunch", "dinner"]:
                if meal_name in anchors:
                    meal_time = anchors[meal_name]
                    time_diff = abs((scheduled_time - meal_time).total_seconds() / 60)
                    if time_diff < meal_buffer:
                        return False
        
        # Special case: DGL Plus should be close to meals (before them)
        if supplement.name == "DGL Plus":
            meal_anchor = supplement.anchor  # lunch or dinner
            if meal_anchor in anchors:
                meal_time = anchors[meal_anchor]
                time_diff = (meal_time - scheduled_time).total_seconds() / 60
                # Relaxed: allow 5-30 min before meal instead of 10-25
                min_diff = 5 if relaxed else 10
                max_diff = 30 if relaxed else 25
                if not (min_diff <= time_diff <= max_diff):
                    return False
            else:
                return False  # DGL Plus requires meal anchor
        
        # Check supplement conflicts (with relaxed buffer if requested)
        if "supplements" in supplement.conflicts:
            supplement_buffer = 30 if relaxed else 60
            for existing in existing_items:
                time_diff = abs((scheduled_time - existing.scheduled_time).total_seconds() / 60)
                if time_diff < supplement_buffer:
                    return False
        
        return True
    
    def _is_time_valid(self, scheduled_time: datetime, supplement: SupplementItem, 
                      existing_items: List[ScheduledItem], anchors: Dict[str, datetime]) -> bool:
        """Check if a scheduled time is valid for a supplement"""
        # Check conflicts with existing items
        # We allow items to be scheduled at the same time unless they have specific conflicts
        # Removed the default 30-minute spacing rule
        
        # Check meal conflicts
        if "meals" in supplement.conflicts:
            for meal_name in ["breakfast", "lunch", "dinner"]:
                if meal_name in anchors:
                    meal_time = anchors[meal_name]
                    time_diff = abs((scheduled_time - meal_time).total_seconds() / 60)
                    if time_diff < 60:  # 60 minute buffer around meals (must be >= 60 minutes away)
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
    
    def _check_and_adjust_interactions(self, scheduled_items: List[ScheduledItem], date: datetime.date) -> List[ScheduledItem]:
        """
        Phase 26: Check for supplement interactions and adjust timing if needed.
        This is a basic implementation - full interaction checking happens in the frontend.
        """
        try:
            from .interaction_engine import check_schedule_interactions
            
            # Convert to dict format for interaction checking
            schedule_dict = {
                date.isoformat(): [
                    {
                        "item": {
                            "name": item.item.name
                        },
                        "scheduled_time": item.scheduled_time.isoformat() if isinstance(item.scheduled_time, datetime) else str(item.scheduled_time)
                    }
                    for item in scheduled_items
                ]
            }
            
            # Check interactions
            interactions = check_schedule_interactions(schedule_dict, date.isoformat())
            
            # Log high-severity interactions
            high_severity = [i for i in interactions if i.get("severity") == "high" and not i.get("spacing_adequate", True)]
            if high_severity:
                print(f"⚠️  WARNING: {len(high_severity)} high-severity interaction(s) detected for {date.isoformat()}")
                for interaction in high_severity:
                    print(f"   - {interaction['supplement1']} + {interaction['supplement2']}: {interaction['interaction']['description']}")
            
            # Note: We don't auto-adjust here - let the frontend show warnings and let user decide
            # Auto-adjustment could be added as an optional feature later
            
        except ImportError:
            # Interaction engine not available - skip checking
            pass
        except Exception as e:
            # Don't fail schedule generation if interaction checking fails
            print(f"Warning: Failed to check interactions: {e}")
        
        return scheduled_items
