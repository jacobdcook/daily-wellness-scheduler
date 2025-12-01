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
}

export interface ScheduledItem {
    item: SupplementItem;
    scheduled_time: string; // ISO string
    day_type: DayType;
    shifted: boolean;
    shift_reason: string;
}

export type Schedule = Record<string, ScheduledItem[]>;
