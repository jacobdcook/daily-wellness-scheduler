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

export async function saveSettings(settings: UserSettings): Promise<void> {
    const response = await fetch(`${API_URL}/save-settings`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
    });

    if (!response.ok) {
        throw new Error("Failed to save settings");
    }
}

export async function loadSettings(): Promise<UserSettings> {
    const response = await fetch(`${API_URL}/load-settings`);

    if (!response.ok) {
        console.warn("Failed to load settings, using default");
        return defaultSettings;
    }

    return response.json();
}

export async function saveProgress(progress: Record<string, Record<string, number>>): Promise<void> {
    const response = await fetch(`${API_URL}/save-progress`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(progress),
    });

    if (!response.ok) {
        throw new Error("Failed to save progress");
    }
}

export async function loadProgress(): Promise<Record<string, Record<string, number>>> {
    const response = await fetch(`${API_URL}/load-progress`);

    if (!response.ok) {
        console.warn("Failed to load progress");
        return {};
    }

    return response.json();
}

export async function exportSchedule(settings: UserSettings, format: 'csv' | 'ical'): Promise<void> {
    const endpoint = format === 'csv' ? '/export/csv' : '/export/ical';
    const filename = format === 'csv' ? 'wellness_schedule.csv' : 'wellness_schedule.ics';
    
    const response = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
    });

    if (!response.ok) {
        throw new Error(`Failed to export ${format}`);
    }

    // Create download link
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}

export async function savePushbulletKey(apiKey: string): Promise<void> {
    const response = await fetch(`${API_URL}/notifications/save-key`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ api_key: apiKey }),
    });

    if (!response.ok) {
        throw new Error("Failed to save Pushbullet key");
    }
}

export async function loadPushbulletKey(): Promise<{ has_key: boolean; masked_key: string }> {
    const response = await fetch(`${API_URL}/notifications/load-key`);
    if (!response.ok) return { has_key: false, masked_key: "" };
    return response.json();
}

export async function testNotification(): Promise<void> {
    const response = await fetch(`${API_URL}/notifications/test`, {
        method: "POST",
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to send test notification");
    }
}

export async function checkMissedItems(schedule: Schedule, progress: Record<string, Record<string, number>>): Promise<{ status: string; count?: number }> {
    const response = await fetch(`${API_URL}/notifications/check-missed`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ schedule, progress }),
    });

    if (!response.ok) {
        return { status: "error" };
    }

    return response.json();
}

export async function checkUpcomingSupplements(
    schedule: Schedule, 
    progress: Record<string, Record<string, number>>,
    notifiedItems: Set<string>
): Promise<{ status: string; notified_items: string[]; sent_count?: number }> {
    const response = await fetch(`${API_URL}/notifications/check-upcoming`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
            schedule, 
            progress,
            notified_items: Array.from(notifiedItems)
        }),
    });

    if (!response.ok) {
        return { status: "error", notified_items: Array.from(notifiedItems) };
    }

    return response.json();
}