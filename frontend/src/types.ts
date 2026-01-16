export type DayType = "light" | "sweaty";

export type TimingRule =
    | "with_meal"
    | "before_meal"
    | "after_meal"
    | "between_meals"
    | "empty_stomach"
    | "before_bed"
    | "after_wake"
    | "workout_window";

export interface SupplementItem {
    name: string;
    dose: string;
    timing_rule: TimingRule;
    notes: string;
    window_minutes: number;
    anchor: string;
    offset_minutes: number;
    conflicts: string[];
    enabled: boolean;
    optional: boolean;
    caloric: boolean;
    fasting_action: string;
    fasting_notes: string;
}

export interface CustomItem {
    id: string;
    name: string;
    time: string;
    dose: string;
    notes: string;
    enabled: boolean;
    optional?: boolean;
    caloric?: boolean;
    days?: string[];
}

export interface InventoryItem {
    current_stock: number;
    low_stock_threshold: number;
    refill_size: number;
    unit: string;
    last_restocked?: string;
    average_daily_usage?: number;
    unit_cost?: number;
    preferred_vendor?: string;
    auto_refill?: boolean;
    next_restock_date?: string;
}

export interface UserSettings {
    wake_time: string;
    bedtime: string;
    dinner_time: string;
    breakfast_mode: string;
    lunch_mode: string;
    dinner_mode: string;
    breakfast_days: boolean[];
    study_start: string;
    study_end: string;
    workout_days: boolean[];
    workout_time: string;
    vaping_window: string;
    electrolyte_intensity: string;
    timezone: string;
    optional_items: Record<string, boolean>;
    fasting: string;
    fasting_level: string;
    feeding_window: { start: string; end: string };
    enable_supplements?: boolean; // If false, supplements are disabled
    custom_items?: CustomItem[];
    inventory?: Record<string, InventoryItem>;
    default_tasks?: GeneralTaskItem[];
}

export interface GeneralTaskItem {
    id: string;
    name: string;
    description?: string;
    category: string; // meal, workout, hydration, medication, habit, custom
    duration_minutes?: number;
    notes?: string;
    enabled: boolean;
    optional?: boolean;
    icon?: string;
}

export type ScheduleItemType = 
    | "supplement" 
    | "task" 
    | "habit" 
    | "reminder" 
    | "meal" 
    | "workout" 
    | "hydration" 
    | "medication" 
    | "custom";

export interface ScheduledItem {
    id: string;
    item_type?: ScheduleItemType; // Type of item (supplement, task, meal, etc.)
    item: SupplementItem | GeneralTaskItem | any; // Can be supplement or general task
    scheduled_time: string; // ISO string
    day_type: DayType;
    shifted?: boolean;
    shift_reason?: string;
}

export type Schedule = Record<string, ScheduledItem[]>;

export interface ScheduleWarning {
    date: string;
    supplement_name: string;
    reason: string;
    severity: "warning" | "error";
}

export interface ScheduleResponse {
    schedule: Schedule;
    warnings?: ScheduleWarning[];
    total_items?: number;
}