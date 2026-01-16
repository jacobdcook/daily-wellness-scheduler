from enum import Enum
from typing import List, Dict, Optional, Any, Union
from pydantic import BaseModel, Field
from datetime import datetime
import uuid

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

class ScheduleItemType(str, Enum):
    """Type of schedule item"""
    SUPPLEMENT = "supplement"
    TASK = "task"
    HABIT = "habit"
    REMINDER = "reminder"
    MEAL = "meal"
    WORKOUT = "workout"
    HYDRATION = "hydration"
    MEDICATION = "medication"
    CUSTOM = "custom"

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

class CustomItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    time: str
    dose: str
    notes: str
    enabled: bool = True
    days: List[str] = Field(default_factory=lambda: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"])
    optional: bool = False
    caloric: bool = False

class GeneralTaskItem(BaseModel):
    """General task item for non-supplement schedule items"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str = ""
    category: str = "general"  # meal, workout, hydration, medication, habit, custom
    duration_minutes: Optional[int] = None
    notes: str = ""
    enabled: bool = True
    optional: bool = False
    icon: Optional[str] = None  # Optional icon identifier for UI

class InventoryItem(BaseModel):
    current_stock: int = 0
    low_stock_threshold: int = 10
    refill_size: int = 30  # Default bottle size
    unit: str = "units" # capsules, scoops, etc.
    last_restocked: Optional[datetime] = None

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
    enable_default_stack: bool = False  # If True, includes the hardcoded default supplements
    enable_supplements: bool = False  # If False, supplements are disabled (default for new users)
    custom_items: List[CustomItem] = Field(default_factory=list)
    inventory: Dict[str, InventoryItem] = Field(default_factory=dict)
    default_tasks: List[GeneralTaskItem] = Field(default_factory=list)  # Default general tasks

class ScheduledItem(BaseModel):
    id: str
    item_type: ScheduleItemType  # Type of item (supplement, task, habit, etc.)
    item: Union[SupplementItem, GeneralTaskItem, Dict[str, Any]]  # Can be supplement or general task
    scheduled_time: datetime
    day_type: DayType
    shifted: bool = False
    shift_reason: str = ""
    pattern_id: Optional[str] = None  # Link to recurring pattern

class RecurringPattern(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    pattern_type: str  # daily, weekly, biweekly, monthly, custom
    frequency: Optional[int] = None  # For daily patterns (every N days)
    days_of_week: Optional[List[int]] = Field(default=None)  # 0-6, Sunday-Saturday
    days_of_month: Optional[List[int]] = Field(default=None)  # 1-31
    start_date: str  # ISO date
    end_date: Optional[str] = None  # ISO date, None for infinite
    exceptions: List[str] = Field(default_factory=list)  # ISO dates to skip
    max_occurrences: Optional[int] = None
    time: str  # HH:MM format
    item_template: Dict[str, Any]  # The item to repeat
    enabled: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now().isoformat())

class MealTemplateCategory(str, Enum):
    BREAKFAST = "breakfast"
    LUNCH = "lunch"
    DINNER = "dinner"
    SNACKS = "snacks"

class MealTemplateFood(BaseModel):
    """A food item in a meal template"""
    name: str
    quantity: float
    unit: str
    nutrition: Dict[str, float]  # {calories, protein, carbs, fats} per serving
    food_id: Optional[str] = None  # Reference to food database if available

class MealTemplate(BaseModel):
    """Meal template model for saving reusable meal combinations"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str = ""
    category: MealTemplateCategory
    foods: List[MealTemplateFood] = Field(default_factory=list)
    total_nutrition: Dict[str, float] = Field(default_factory=dict)  # Total {calories, protein, carbs, fats}
    usage_count: int = 0
    last_used: Optional[str] = None  # ISO datetime
    created_by: str
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now().isoformat())
