from datetime import datetime, timedelta, time
from typing import Dict, List, Optional
from .models import UserSettings, SupplementItem, ScheduledItem, DayType, TimingRule

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
                dose="37.5 mg",
                timing_rule=TimingRule.WITH_MEAL,
                notes="Zinc-Carnosine, twice daily",
                window_minutes=15,
                anchor="lunch",
                offset_minutes=0,
                conflicts=[],
                enabled=True,
                caloric=False,
                fasting_action="meal_dependent",
                fasting_notes="With meal only; skip if meal skipped"
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
                enabled=True,
                caloric=False,
                fasting_action="meal_dependent",
                fasting_notes="With meal only; skip if meal skipped"
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
                caloric=True,
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
                fasting_notes="Take with fat-containing meal only"
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
                fasting_notes="OK before bed"
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
                caloric=True,
                fasting_action="defer",
                fasting_notes="Tea with calories; defer to feeding window"
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
                window_minutes=30,
                anchor="study_start",
                offset_minutes=180,  # 3 hours after study start (3:00 PM)
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
        deferred_items = []  # Items to defer to feeding window
        
        # Create time anchors for the day
        anchors = self._create_time_anchors(date, is_workout, has_breakfast)
        
        # Handle fasting mode
        is_fasting = self.settings.fasting == "yes"
        feeding_window_times = None
        
        if is_fasting:
            feeding_window_times = self._get_feeding_window_times(date, anchors, has_breakfast)
        
        # Schedule each enabled supplement
        for supplement in self.supplements:
            if not supplement.enabled:
                continue
                
            if supplement.optional:
                # Check if this optional item is enabled
                item_key = supplement.name.lower().replace(" ", "_").replace("-", "_")
                if not self.settings.optional_items.get(item_key, False):
                    continue
            
            # Apply fasting logic if enabled
            if is_fasting:
                action = self._get_fasting_action(supplement, anchors, feeding_window_times, has_breakfast)
                if action == "skip":
                    continue
                elif action == "defer":
                    deferred_items.append(supplement)
                    continue
                
            scheduled_time = self._find_best_time(supplement, anchors, scheduled_items, day_type)
            if scheduled_time:
                scheduled_item = ScheduledItem(
                    item=supplement,
                    scheduled_time=scheduled_time,
                    day_type=day_type
                )
                scheduled_items.append(scheduled_item)
        
        # Schedule deferred items in feeding window
        if is_fasting and deferred_items and feeding_window_times:
            deferred_scheduled = self._schedule_deferred_items(deferred_items, feeding_window_times, date, day_type)
            scheduled_items.extend(deferred_scheduled)
        
        # Sort by time
        scheduled_items.sort(key=lambda x: x.scheduled_time)
        return scheduled_items
    
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
