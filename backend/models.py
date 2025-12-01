from enum import Enum
from typing import List, Dict, Optional
from pydantic import BaseModel, Field
from datetime import datetime

class DayType(str, Enum):
    LIGHT = "light"
    SWEATY = "sweaty"

class TimingRule(str, Enum):
    WITH_MEAL = "with_meal"
    BEFORE_MEAL = "before_meal"
    AFTER_MEAL = "after_meal"
    BETWEEN_MEALS = "between_meals"
    EMPTY_STOMACH = "empty_stomach"
    BEFORE_BED = "before_bed"
    AFTER_WAKE = "after_wake"
    WORKOUT_WINDOW = "workout_window"

class SupplementItem(BaseModel):
    name: str
    dose: str
    timing_rule: TimingRule
    notes: str
    window_minutes: int
    anchor: str
    offset_minutes: int
    conflicts: List[str]
    enabled: bool = True
    optional: bool = False
    caloric: bool = False
    fasting_action: str = "allow"
    fasting_notes: str = ""

class UserSettings(BaseModel):
    wake_time: str = "07:30"
    bedtime: str = "22:00"
    dinner_time: str = "18:30"
    breakfast_mode: str = "yes"
    lunch_mode: str = "yes"
    dinner_mode: str = "yes"
    breakfast_days: List[bool] = Field(default_factory=lambda: [True] * 7)
    study_start: str = "09:30"
    study_end: str = "17:30"
    workout_days: List[bool] = Field(default_factory=lambda: [False] * 7)
    workout_time: str = ""
    vaping_window: str = ""
    electrolyte_intensity: str = "light"
    timezone: str = "America/Los_Angeles"
    optional_items: Dict[str, bool] = Field(default_factory=lambda: {
        "slippery_elm": False,
        "l_glutamine": False,
        "collagen": False,
        "melatonin": False
    })
    fasting: str = "no"
    fasting_level: str = "light"
    feeding_window: Dict[str, str] = Field(default_factory=lambda: {"start": "11:30", "end": "19:30"})

class ScheduledItem(BaseModel):
    item: SupplementItem
    scheduled_time: datetime
    day_type: DayType
    shifted: bool = False
    shift_reason: str = ""
