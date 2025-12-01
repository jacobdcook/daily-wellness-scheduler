import { Schedule, UserSettings } from "../types";

const API_URL = "http://localhost:8000";

export const defaultSettings: UserSettings = {
    wake_time: "07:30",
    bedtime: "22:00",
    dinner_time: "18:30",
    breakfast_mode: "yes",
    lunch_mode: "yes",
    dinner_mode: "yes",
    breakfast_days: [true, true, true, true, true, true, true],
    study_start: "09:30",
    study_end: "17:30",
    workout_days: [false, false, false, false, false, false, false],
    workout_time: "",
    vaping_window: "",
    electrolyte_intensity: "light",
    timezone: "America/Los_Angeles",
    optional_items: {
        slippery_elm: false,
        l_glutamine: false,
        collagen: false,
        melatonin: false,
    },
    fasting: "no",
    fasting_level: "light",
    feeding_window: { start: "11:30", end: "19:30" },
};

export async function generateSchedule(settings: UserSettings): Promise<Schedule> {
    const response = await fetch(`${API_URL}/generate-schedule`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
    });

    if (!response.ok) {
        throw new Error("Failed to generate schedule");
    }

    return response.json();
}
