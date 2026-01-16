import { Schedule, UserSettings } from "../types";
import { getSession } from "next-auth/react";

const API_URL = "/backend";

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
    optional_items: {},
    fasting: "no",
    fasting_level: "light",
    feeding_window: { start: "11:30", end: "19:30" },
};

export async function getAuthHeaders(): Promise<HeadersInit> {
    const session = await getSession();
    const headers: HeadersInit = {
        "Content-Type": "application/json",
    };
    
    // Always send user ID - use email as fallback if ID not available
    // @ts-ignore
    const userId = session?.user?.id || session?.user?.email;
    if (userId) {
        headers["x-user-id"] = userId; // FastAPI expects lowercase with hyphens
    } else {
        console.warn("No user ID or email found in session");
        throw new Error("User ID not found in session");
    }
    
    return headers;
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/auth/change-password`, {
        method: "POST",
        headers,
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    });

    if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Failed to change password");
    }
}

export async function getSchedule(): Promise<Schedule> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/get-schedule`, {
        method: "GET",
        headers,
        cache: "no-store",
    });

    if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = "Failed to get schedule";
        try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.detail || errorMessage;
        } catch {
            errorMessage = errorText || errorMessage;
        }
        console.error("Schedule fetch error:", errorMessage, response.status);
        throw new Error(errorMessage);
    }

    const data = await response.json();
    // Handle new format with warnings (backward compatible)
    if (data.schedule) {
        // Store warnings in a global or return them separately
        if (data.warnings && data.warnings.length > 0) {
            console.warn("Schedule warnings:", data.warnings);
            // Store warnings for UI display
            (window as any).__scheduleWarnings = data.warnings;
        }
        return data.schedule;
    }
    // Backward compatibility: return data directly if it's the old format
    return data;
}

export async function getScheduleWithWarnings(): Promise<{ schedule: Schedule; warnings?: Array<{ date: string; supplement_name: string; reason: string; severity: string }> }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/get-schedule`, {
        method: "GET",
        headers,
        cache: "no-store",
    });

    if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = "Failed to get schedule";
        try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.detail || errorMessage;
        } catch {
            errorMessage = errorText || errorMessage;
        }
        console.error("Schedule fetch error:", errorMessage, response.status);
        throw new Error(errorMessage);
    }

    const data = await response.json();
    // Handle new format with warnings (backward compatible)
    if (data.schedule) {
        return { schedule: data.schedule, warnings: data.warnings || [] };
    }
    // Backward compatibility: return data directly if it's the old format
    return { schedule: data, warnings: [] };
}

export async function regenerateSchedule(settings: UserSettings): Promise<{ schedule: Schedule; warnings?: Array<{ date: string; supplement_name: string; reason: string; severity: string }>; total_items?: number }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/regenerate-schedule`, {
        method: "POST",
        headers,
        body: JSON.stringify(settings),
    });

    if (!response.ok) {
        throw new Error("Failed to regenerate schedule");
    }

    const data = await response.json();
    // New format always includes schedule and warnings
    if (data.schedule) {
        return data;
    }
    // Backward compatibility: wrap old format
    return { schedule: data, warnings: [] };
}

export async function updateItem(date: string, itemId: string, updates: Record<string, unknown>): Promise<Schedule> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/schedule/update-item`, {
        method: "POST",
        headers,
        body: JSON.stringify({ date, item_id: itemId, updates }),
    });

    if (!response.ok) {
        throw new Error("Failed to update item");
    }

    const data = await response.json();
    return data.schedule;
}

export async function deleteItem(date: string, itemId: string): Promise<Schedule> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/schedule/delete-item`, {
        method: "POST",
        headers,
        body: JSON.stringify({ date, item_id: itemId }),
    });

    if (!response.ok) {
        throw new Error("Failed to delete item");
    }

    const data = await response.json();
    return data;
}

export async function saveSettings(settings: UserSettings): Promise<void> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/save-settings`, {
        method: "POST",
        headers,
        body: JSON.stringify(settings),
    });

    if (!response.ok) {
        throw new Error("Failed to save settings");
    }
}

export async function loadSettings(): Promise<UserSettings> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/load-settings`, { headers, cache: "no-store" });

    if (!response.ok) {
        console.warn("Failed to load settings, using default");
        return defaultSettings;
    }

    return response.json();
}

export async function saveProgress(progress: Record<string, Record<string, any>>): Promise<void> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/save-progress`, {
        method: "POST",
        headers,
        body: JSON.stringify(progress),
    });

    if (!response.ok) {
        throw new Error("Failed to save progress");
    }
}

export async function loadProgress(): Promise<Record<string, Record<string, any>>> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/load-progress`, { headers, cache: "no-store" });

    if (!response.ok) {
        console.warn("Failed to load progress");
        return {};
    }

    return response.json();
}

export async function exportSchedule(format: 'csv' | 'ical' | 'json' | 'pdf' | 'markdown' | 'summary'): Promise<void> {
    const endpoint = `/export/${format}`;
    const filename = format === 'csv' ? 'wellness_schedule.csv' 
                   : format === 'ical' ? 'wellness_schedule.ics'
                   : format === 'json' ? 'wellness_data.json'
                   : format === 'pdf' ? 'wellness_schedule.pdf'
                   : format === 'markdown' ? 'wellness_schedule.md'
                   : 'wellness_summary.txt';
    const headers = await getAuthHeaders();

    const response = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers,
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to export ${format}: ${errorText}`);
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
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/notifications/save-key`, {
        method: "POST",
        headers,
        body: JSON.stringify({ api_key: apiKey }),
    });

    if (!response.ok) {
        throw new Error("Failed to save Pushbullet key");
    }
}

export async function loadPushbulletKey(): Promise<{ has_key: boolean; masked_key: string }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/notifications/load-key`, { headers });
    if (!response.ok) return { has_key: false, masked_key: "" };
    return response.json();
}

export async function testNotification(): Promise<void> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/notifications/test`, {
        method: "POST",
        headers,
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to send test notification");
    }
}

export async function checkMissedItems(schedule: Schedule, progress: Record<string, Record<string, any>>): Promise<{ status: string; count?: number }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/notifications/check-missed`, {
        method: "POST",
        headers,
        body: JSON.stringify({ schedule, progress }),
    });

    if (!response.ok) {
        return { status: "error" };
    }

    return response.json();
}

export async function checkUpcomingSupplements(
    schedule: Schedule,
    progress: Record<string, Record<string, any>>,
    notifiedItems: Set<string>
): Promise<{ status: string; notified_items: string[]; sent_count?: number }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/notifications/check-upcoming`, {
        method: "POST",
        headers,
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

export interface Stats {
    current_streak: number;
    longest_streak: number;
    total_days_completed: number;
    weekly_completion_rate: number;
    this_week_completed: number;
    this_week_total: number;
    achievements: Array<{ name: string; description: string; unlocked: boolean }>;
}

export async function getStats(): Promise<Stats> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/stats`, { headers });
    if (!response.ok) {
        throw new Error("Failed to get stats");
    }
    return response.json();
}

export interface KnowledgeItem {
    name: string;
    category: string;
    summary: string;
    benefits: string[];
    mechanism: string;
    timing_rationale: string;
    synergies: string[];
    antagonists: string[];
    scientific_confidence: string;
}

export async function getKnowledge(itemName: string): Promise<KnowledgeItem | null> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/knowledge/${encodeURIComponent(itemName)}`, { 
        headers,
        cache: "force-cache" 
    });
    
    if (!response.ok) {
        return null;
    }
    return response.json();
}
export interface Insight {
    type: "correlation" | "trend" | "suggestion";
    correlation: "positive" | "negative";
    metric: string;
    lift: number;
    message: string;
}

export interface Prediction {
    predicted_rate: number;
    confidence: number;
    factors: string[];
}

export interface Recommendation {
    type: "timing" | "pattern" | "item" | "schedule";
    priority: "high" | "medium" | "low";
    title: string;
    message: string;
    action: string;
}

export interface Trends {
    average_completion_rate: number;
    trend_direction: "improving" | "declining" | "stable" | "insufficient_data";
    trend_magnitude: number;
    average_items_per_day: number;
    data_points: number;
}

export interface Patterns {
    day_of_week_rates: Record<string, number>;
    hour_completion_rates: Record<number, number>;
    item_completion_rates: Record<string, number>;
    best_hour: { hour: number; rate: number } | null;
    worst_hour: { hour: number; rate: number } | null;
    best_day: { day: string; rate: number } | null;
    worst_day: { day: string; rate: number } | null;
}

export async function getInsights(): Promise<{ 
    correlations: Insight[];
    patterns?: Patterns;
    prediction?: Prediction;
    recommendations?: Recommendation[];
    trends?: Trends;
}> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/insights`, { headers });
    if (!response.ok) {
        return { correlations: [] };
    }
    return response.json();
}

export async function suggestReschedule(date: string, itemId: string): Promise<{ options: Array<{ time: string; label: string; reason: string }> }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/schedule/suggest-reschedule`, {
        method: "POST",
        headers,
        body: JSON.stringify({ date, item_id: itemId }),
    });
    if (!response.ok) {
        return { options: [] };
    }
    return response.json();
}

export async function applyReschedule(date: string, itemId: string, newTime: string): Promise<Schedule> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/schedule/apply-reschedule`, {
        method: "POST",
        headers,
        body: JSON.stringify({ date, item_id: itemId, new_time: newTime }),
    });
    if (!response.ok) {
        throw new Error("Failed to apply reschedule");
    }
    const data = await response.json();
    return data.schedule;
}

export interface AddItemRequest {
    date: string;
    name: string;
    time: string; // HH:MM format
    dose?: string;
    notes?: string;
    caloric?: boolean;
    fasting_action?: string;
    fasting_notes?: string;
    optional?: boolean;
}

export async function addItemToSchedule(item: AddItemRequest): Promise<Schedule> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/schedule/add-item`, {
        method: "POST",
        headers,
        body: JSON.stringify(item),
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: "Failed to add item" }));
        throw new Error(error.detail || "Failed to add item");
    }
    const data = await response.json();
    return data.schedule;
}

export async function getFastingAdjustment(): Promise<{ suggestion: string | null; reason: string; current_window?: string; suggested_window?: string }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/insights/fasting-adjustment`, { headers });
    if (!response.ok) {
        return { suggestion: null, reason: "Error checking fasting adjustment" };
    }
    return response.json();
}

export interface SupplementAnalysis {
    caloric: boolean;
    fasting_action: "allow" | "defer" | "skip";
    fasting_notes: string;
}

export async function analyzeSupplement(name: string, dose?: string): Promise<SupplementAnalysis> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/analyze-supplement`, {
        method: "POST",
        headers,
        body: JSON.stringify({ name, dose: dose || "" }),
    });
    if (!response.ok) {
        return {
            caloric: false,
            fasting_action: "allow",
            fasting_notes: "Analysis unavailable. Please verify manually."
        };
    }
    return response.json();
}

export interface BackupInfo {
    path: string;
    name: string;
    timestamp: string;
    display: string;
}

export async function createScheduleBackup(): Promise<{ status: string; backup_path?: string; message?: string }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/backup/create`, {
        method: "POST",
        headers,
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to create backup");
    }

    return response.json();
}

export async function listBackups(): Promise<{ status: string; backups: BackupInfo[] }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/backup/list`, {
        method: "GET",
        headers,
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to list backups");
    }

    return response.json();
}

export async function restoreScheduleBackup(backupPath: string): Promise<{ status: string; message?: string }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/backup/restore`, {
        method: "POST",
        headers,
        body: JSON.stringify({ backup_path: backupPath }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to restore backup");
    }

    return response.json();
}

// Analytics API (Phase 27)
export interface AnalyticsOverview {
    overview: {
        total_days: number;
        total_items: number;
        completed_count: number;
        in_progress_count: number;
        pending_count: number;
        overall_completion_rate: number;
        average_items_per_day: number;
        trend_direction: string;
        trend_magnitude: number;
        recent_average: number;
    };
    daily_completion_rates: Array<{
        date: string;
        rate: number;
        completed: number;
        total: number;
    }>;
    item_performance: Array<{
        name: string;
        completion_rate: number;
        total: number;
        completed: number;
        in_progress: number;
        pending: number;
    }>;
    date_range: {
        start: string;
        end: string;
    };
}

export interface TrendDataPoint {
    date: string;
    completion_rate: number;
    completed: number;
    total: number;
}

export interface TimeAnalytics {
    hour_rates: Array<{
        hour: number;
        completion_rate: number;
        total: number;
        completed: number;
    }>;
    day_rates: Array<{
        day: string;
        completion_rate: number;
        total: number;
        completed: number;
    }>;
    best_hour: { hour: number; completion_rate: number; total: number; completed: number } | null;
    worst_hour: { hour: number; completion_rate: number; total: number; completed: number } | null;
    best_day: { day: string; completion_rate: number; total: number; completed: number } | null;
    worst_day: { day: string; completion_rate: number; total: number; completed: number } | null;
}

export async function getAnalyticsOverview(startDate?: string, endDate?: string): Promise<AnalyticsOverview> {
    const headers = await getAuthHeaders();
    const params = new URLSearchParams();
    if (startDate) params.append("start_date", startDate);
    if (endDate) params.append("end_date", endDate);
    
    const url = `${API_URL}/analytics/overview${params.toString() ? `?${params.toString()}` : ""}`;
    const response = await fetch(url, { headers });

    if (!response.ok) {
        throw new Error("Failed to get analytics overview");
    }

    return response.json();
}

export async function getAnalyticsTrends(days: number = 30): Promise<{ trend_data: TrendDataPoint[] }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/analytics/trends?days=${days}`, { headers });

    if (!response.ok) {
        throw new Error("Failed to get analytics trends");
    }

    return response.json();
}

export async function getTimeAnalytics(): Promise<TimeAnalytics> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/analytics/time-analysis`, { headers });

    if (!response.ok) {
        throw new Error("Failed to get time analytics");
    }

    return response.json();
}

// Goal Tracking
export interface Goal {
    id?: string;
    name: string;
    type: "completion_rate" | "streak" | "item" | "wellness";
    target_value: number;
    start_date: string;
    end_date?: string;
    achieved?: boolean;
    current_value?: number;
    created_at?: string;
}

export async function getGoals(): Promise<{ goals: Goal[] }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/analytics/goals`, { headers });

    if (!response.ok) {
        throw new Error("Failed to get goals");
    }

    return response.json();
}

export async function createGoal(goal: Omit<Goal, "id" | "current_value" | "achieved" | "created_at">): Promise<{ status: string; goal: Goal }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/analytics/goals`, {
        method: "POST",
        headers,
        body: JSON.stringify(goal),
    });

    if (!response.ok) {
        throw new Error("Failed to create goal");
    }

    return response.json();
}

export async function deleteGoal(goalId: string): Promise<{ status: string }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/analytics/goals/${goalId}`, {
        method: "DELETE",
        headers,
    });

    if (!response.ok) {
        throw new Error("Failed to delete goal");
    }

    return response.json();
}

// --- Recurring Patterns API (Phase 25) ---

export interface RecurringPattern {
    id?: string;
    name: string;
    pattern_type: "daily" | "weekly" | "biweekly" | "monthly" | "custom";
    frequency?: number;
    days_of_week?: number[];
    days_of_month?: number[];
    start_date: string;
    end_date?: string;
    exceptions?: string[];
    max_occurrences?: number;
    time: string;
    item_template: any;
    enabled?: boolean;
}

export async function createPattern(pattern: RecurringPattern): Promise<{ pattern: RecurringPattern; preview: string[] }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/patterns/create`, {
        method: "POST",
        headers,
        body: JSON.stringify(pattern),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to create pattern");
    }

    return response.json();
}

export async function listPatterns(): Promise<{ patterns: RecurringPattern[] }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/patterns/list`, { headers });

    if (!response.ok) {
        throw new Error("Failed to list patterns");
    }

    return response.json();
}

export async function previewPattern(patternId: string, count: number = 10): Promise<{ preview: string[] }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/patterns/${patternId}/preview?count=${count}`, { headers });

    if (!response.ok) {
        throw new Error("Failed to preview pattern");
    }

    return response.json();
}

export async function updatePattern(patternId: string, updates: Partial<RecurringPattern>): Promise<{ pattern: RecurringPattern }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/patterns/${patternId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(updates),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to update pattern");
    }

    return response.json();
}

export async function deletePattern(patternId: string, deleteAll: boolean = false): Promise<void> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/patterns/${patternId}?delete_all=${deleteAll}`, {
        method: "DELETE",
        headers,
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to delete pattern");
    }
}

export async function regeneratePattern(patternId: string): Promise<{ preview: string[] }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/patterns/${patternId}/regenerate`, {
        method: "POST",
        headers,
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to regenerate pattern");
    }

    return response.json();
}

// --- Social Features API (Phase 28) ---

export interface Friend {
    id: string;
    username?: string;
    display_name?: string;
    email?: string;
    added_at?: string;
    sent_at?: string;
    received_at?: string;
}

export interface FriendsData {
    friends: Friend[];
    pending_sent: Friend[];
    pending_received: Friend[];
    blocked: string[];
}

export interface Challenge {
    id: string;
    creator_id: string;
    name: string;
    description: string;
    type: string;
    target_value: number;
    duration_days: number;
    start_date: string;
    end_date: string;
    is_global: boolean;
    participants: string[];
    progress: Record<string, number>;
    user_progress?: number;
    user_percentage?: number;
    is_participant?: boolean;
}

export interface Benchmark {
    metric: string;
    value: number;
    percentile: number;
    message: string;
}

export interface ProgressCard {
    user_id: string;
    completion_rate: number;
    current_streak: number;
    total_items_completed: number;
    total_days_active: number;
    generated_at: string;
    message: string;
}

export async function getFriends(): Promise<FriendsData> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/social/friends`, { headers });

    if (!response.ok) {
        throw new Error("Failed to load friends");
    }

    const data = await response.json();
    return {
        friends: data.friends || [],
        pending_sent: data.pending_sent || [],
        pending_received: data.pending_received || [],
        blocked: data.blocked || []
    };
}

export async function sendFriendRequest(targetUserId: string): Promise<void> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/social/friends/request`, {
        method: "POST",
        headers: {
            ...headers,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ target_user_id: targetUserId }),
    });

    if (!response.ok) {
        let errorMessage = "Failed to send friend request";
        try {
            const error = await response.json();
            errorMessage = error.detail || error.message || errorMessage;
        } catch {
            errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
    }
}

export async function acceptFriendRequest(fromUserId: string): Promise<void> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/social/friends/accept`, {
        method: "POST",
        headers: {
            ...headers,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ from_user_id: fromUserId }),
    });

    if (!response.ok) {
        let errorMessage = "Failed to accept friend request";
        try {
            const error = await response.json();
            errorMessage = error.detail || error.message || errorMessage;
        } catch {
            errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
    }
}

export async function declineFriendRequest(fromUserId: string): Promise<void> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/social/friends/decline`, {
        method: "POST",
        headers: {
            ...headers,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ from_user_id: fromUserId }),
    });

    if (!response.ok) {
        let errorMessage = "Failed to decline friend request";
        try {
            const error = await response.json();
            errorMessage = error.detail || error.message || errorMessage;
        } catch {
            errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
    }
}

export async function cancelFriendRequest(targetUserId: string): Promise<void> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/social/friends/cancel`, {
        method: "POST",
        headers: {
            ...headers,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ target_user_id: targetUserId }),
    });

    if (!response.ok) {
        let errorMessage = "Failed to cancel friend request";
        try {
            const error = await response.json();
            errorMessage = error.detail || error.message || errorMessage;
        } catch {
            errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
    }
}

export async function blockUser(targetUserId: string): Promise<void> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/social/friends/block`, {
        method: "POST",
        headers: {
            ...headers,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ target_user_id: targetUserId }),
    });

    if (!response.ok) {
        let errorMessage = "Failed to block user";
        try {
            const error = await response.json();
            errorMessage = error.detail || error.message || errorMessage;
        } catch {
            errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
    }
}

export async function unblockUser(targetUserId: string): Promise<void> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/social/friends/unblock`, {
        method: "POST",
        headers: {
            ...headers,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ target_user_id: targetUserId }),
    });

    if (!response.ok) {
        let errorMessage = "Failed to unblock user";
        try {
            const error = await response.json();
            errorMessage = error.detail || error.message || errorMessage;
        } catch {
            errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
    }
}

export async function removeFriend(targetUserId: string): Promise<void> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/social/friends/remove`, {
        method: "POST",
        headers: {
            ...headers,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ target_user_id: targetUserId }),
    });

    if (!response.ok) {
        let errorMessage = "Failed to remove friend";
        try {
            const error = await response.json();
            errorMessage = error.detail || error.message || errorMessage;
        } catch {
            errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
    }
}


// Old social challenge functions removed - using community endpoints below

export async function getBenchmarks(metric: string = "completion_rate"): Promise<Benchmark> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/social/benchmarks?metric=${metric}`, { headers });

    if (!response.ok) {
        throw new Error("Failed to load benchmarks");
    }

    const data = await response.json();
    return {
        metric: data.metric,
        value: data.value,
        percentile: data.percentile,
        message: data.message
    };
}

export async function generateShareCard(): Promise<ProgressCard> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/social/share/generate-card`, {
        method: "POST",
        headers,
    });

    if (!response.ok) {
        throw new Error("Failed to generate share card");
    }

    const data = await response.json();
    return data.card;
}

export interface UserSearchResult {
    user_id: string;
    username?: string;
    display_name: string;
    completion_rate: number;
    current_streak: number;
    total_items_completed: number;
    relationship: "self" | "friend" | "pending_sent" | "pending_received" | "none";
}

export async function searchUsers(query: string): Promise<UserSearchResult[]> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/social/users/search?query=${encodeURIComponent(query)}`, { headers });

    if (!response.ok) {
        throw new Error("Failed to search users");
    }

    const data = await response.json();
    return data.users || [];
}

export async function getSocialStats(): Promise<any> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/social/stats`, { headers });

    if (!response.ok) {
        throw new Error("Failed to load social stats");
    }

    const data = await response.json();
    return data.stats;
}

export interface FriendProfile {
    user_id: string;
    display_name: string;
    stats: {
        completion_rate: number;
        current_streak: number;
        total_items_completed: number;
        total_days_active: number;
        average_items_per_day: number;
    };
    is_friend: boolean;
    profile_visibility: string;
}

export async function getFriendProfile(username: string): Promise<FriendProfile> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/profile/${encodeURIComponent(username)}`, { headers });
    if (!response.ok) {
        let errorMessage = "Failed to load friend profile";
        try {
            const error = await response.json();
            errorMessage = error.detail || error.message || errorMessage;
        } catch {
            errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
    }
    return (await response.json()).profile;
}

export async function getUsername(userId: string): Promise<string> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/username/${encodeURIComponent(userId)}`, { headers });
    if (!response.ok) {
        return userId; // Fallback to user_id if username not found
    }
    const data = await response.json();
    return data.username || userId;
}

// --- Privacy Settings ---

export interface PrivacySettings {
    profile_visibility: "private" | "friends_only" | "public";
    progress_sharing: boolean;
    show_in_search: boolean;
    allow_friend_requests: boolean;
}

export async function getPrivacySettings(): Promise<PrivacySettings> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/privacy/settings`, { headers });

    if (!response.ok) {
        throw new Error("Failed to load privacy settings");
    }

    const data = await response.json();
    return data.settings;
}

export async function updatePrivacySettings(settings: PrivacySettings): Promise<void> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/privacy/settings`, {
        method: "POST",
        headers,
        body: JSON.stringify(settings),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to update privacy settings");
    }
}

// --- Phase 1.5: Water Tracking & Reminders ---

export interface WaterSettings {
    daily_goal_oz: number;
    daily_goal_ml: number;
    unit: "oz" | "ml";
    reminders_enabled: boolean;
    reminder_interval_hours: number;
    reminder_start_time: string;
    reminder_end_time: string;
    glass_size_oz: number;
    glass_size_ml: number;
}

export interface WaterIntake {
    entries: Array<{
        amount_oz: number;
        amount_ml: number;
        unit: string;
        timestamp: string;
        time: string;
    }>;
    total_oz: number;
    total_ml: number;
    goal_met: boolean;
}

export interface WaterStats {
    total_days_tracked: number;
    goal_met_days: number;
    goal_completion_rate: number;
    average_daily_intake: number;
    current_streak: number;
    longest_streak: number;
    daily_goal: number;
    unit: string;
}

export async function getWaterSettings(): Promise<WaterSettings> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/water/settings`, { headers });
    if (!response.ok) {
        throw new Error("Failed to load water settings");
    }
    const data = await response.json();
    return data.settings;
}

export async function updateWaterSettings(settings: WaterSettings): Promise<void> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/water/settings`, {
        method: "POST",
        headers: {
            ...headers,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
    });
    if (!response.ok) {
        throw new Error("Failed to update water settings");
    }
}

export async function getWaterIntake(date?: string): Promise<{ intake: WaterIntake; settings: WaterSettings; progress_percent: number }> {
    const headers = await getAuthHeaders();
    const url = date ? `${API_URL}/water/intake?date=${date}` : `${API_URL}/water/intake`;
    const response = await fetch(url, { headers });
    if (!response.ok) {
        throw new Error("Failed to load water intake");
    }
    return response.json();
}

export async function addWaterIntake(amount: number, unit: "oz" | "ml" = "oz", date?: string): Promise<{ entry: any; intake: WaterIntake; progress_percent: number; goal_met: boolean; message: string }> {
    const headers = await getAuthHeaders();
    const params = new URLSearchParams({ amount: amount.toString(), unit });
    if (date) params.append("date", date);
    const response = await fetch(`${API_URL}/water/intake?${params}`, {
        method: "POST",
        headers: {
            ...headers,
            "Content-Type": "application/json",
        },
    });
    if (!response.ok) {
        throw new Error("Failed to record water intake");
    }
    return response.json();
}

export async function getWaterStats(days: number = 30): Promise<WaterStats> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/water/stats?days=${days}`, { headers });
    if (!response.ok) {
        throw new Error("Failed to load water stats");
    }
    const data = await response.json();
    return data.stats;
}

// --- Phase 26: Supplement Interactions & Safety System ---

export interface Interaction {
    supplement1: string;
    supplement2: string;
    type: "absorption_conflict" | "synergistic" | "contraindication";
    severity: "low" | "moderate" | "high";
    description: string;
    recommendation: string;
    spacing_hours: number;
    scientific_evidence: string;
}

export interface DetectedInteraction {
    supplement1: string;
    supplement2: string;
    time1: string;
    time2: string;
    time_diff_hours: number | null;
    interaction: Interaction;
    spacing_adequate: boolean;
    severity: string;
    type: string;
}

export interface ScheduleInteractions {
    interactions: DetectedInteraction[];
    count: number;
    by_severity: {
        high: DetectedInteraction[];
        moderate: DetectedInteraction[];
        low: DetectedInteraction[];
    };
    has_conflicts: boolean;
}

export async function checkInteractions(supplement1?: string, supplement2?: string, date?: string): Promise<{ interaction?: Interaction | null; interactions?: DetectedInteraction[]; count?: number }> {
    const headers = await getAuthHeaders();
    const body: any = {};
    
    if (supplement1 && supplement2) {
        body.supplement1 = supplement1;
        body.supplement2 = supplement2;
    } else if (date) {
        body.date = date;
    }
    
    const response = await fetch(`${API_URL}/interactions/check`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        throw new Error("Failed to check interactions");
    }

    return response.json();
}

export async function getInteractionDetails(supp1: string, supp2: string): Promise<{ interaction: Interaction | null }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/interactions/${encodeURIComponent(supp1)}/${encodeURIComponent(supp2)}`, { headers });

    if (!response.ok) {
        throw new Error("Failed to get interaction details");
    }

    return response.json();
}

export async function suggestTiming(supplement1: string, supplement2: string, time1: string, time2: string): Promise<any> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/interactions/suggest-timing`, {
        method: "POST",
        headers,
        body: JSON.stringify({ supplement1, supplement2, time1, time2 }),
    });

    if (!response.ok) {
        throw new Error("Failed to get timing suggestion");
    }

    return response.json();
}

export async function getScheduleInteractions(date?: string): Promise<ScheduleInteractions> {
    const headers = await getAuthHeaders();
    const url = date 
        ? `${API_URL}/interactions/schedule?date=${encodeURIComponent(date)}`
        : `${API_URL}/interactions/schedule`;
    const response = await fetch(url, { headers });

    if (!response.ok) {
        throw new Error("Failed to get schedule interactions");
    }

    return response.json();
}

export async function getSupplementInteractions(supplement: string): Promise<{ supplement: string; interactions: Interaction[]; count: number }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/interactions/supplement/${encodeURIComponent(supplement)}`, { headers });

    if (!response.ok) {
        throw new Error("Failed to get supplement interactions");
    }

    return response.json();
}

// --- Phase 30: Health Metrics ---

export interface HealthMetric {
    id: string;
    metric_type: "weight" | "blood_pressure" | "heart_rate" | "custom";
    value: number;
    unit: string;
    timestamp: string;
    notes?: string;
    custom_name?: string;
}

export interface HealthMetricSettings {
    default_weight_unit: "lbs" | "kg";
    default_pressure_unit: "mmHg";
    custom_metrics: Array<{
        name: string;
        unit: string;
        type: string;
    }>;
}

export interface HealthMetricStats {
    count: number;
    latest: HealthMetric | null;
    average: number | null;
    min: number | null;
    max: number | null;
    trend: "increasing" | "decreasing" | "stable" | null;
}

export async function getHealthMetrics(metricType?: string, days: number = 30): Promise<{ metrics: HealthMetric[] }> {
    const headers = await getAuthHeaders();
    const params = new URLSearchParams();
    if (metricType) params.append("metric_type", metricType);
    params.append("days", days.toString());
    
    const response = await fetch(`${API_URL}/health-metrics?${params}`, { headers });

    if (!response.ok) {
        throw new Error("Failed to load health metrics");
    }

    return response.json();
}

export async function createHealthMetric(metric: Omit<HealthMetric, "id">): Promise<{ status: string; metric: HealthMetric }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/health-metrics`, {
        method: "POST",
        headers,
        body: JSON.stringify(metric),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to create health metric");
    }

    return response.json();
}

export async function deleteHealthMetric(metricId: string): Promise<void> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/health-metrics/${metricId}`, {
        method: "DELETE",
        headers,
    });

    if (!response.ok) {
        throw new Error("Failed to delete health metric");
    }
}

export async function getHealthMetricStats(metricType: string, days: number = 30): Promise<HealthMetricStats> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/health-metrics/stats/${metricType}?days=${days}`, { headers });

    if (!response.ok) {
        throw new Error("Failed to load health metric stats");
    }

    return response.json();
}

export async function getHealthMetricsSettings(): Promise<HealthMetricSettings> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/health-metrics/settings`, { headers });

    if (!response.ok) {
        throw new Error("Failed to load health metrics settings");
    }

    return response.json();
}

export async function updateHealthMetricsSettings(settings: HealthMetricSettings): Promise<void> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/health-metrics/settings`, {
        method: "POST",
        headers,
        body: JSON.stringify(settings),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to update health metrics settings");
    }
}

// --- Phase 30: Habits Tracking ---

export interface Habit {
    id: string;
    name: string;
    description?: string;
    color: string;
    icon?: string;
    reminder_time?: string;
    reminder_enabled: boolean;
    created_at: string;
    enabled: boolean;
    today_completed?: boolean;
}

export interface HabitEntry {
    id: string;
    habit_id: string;
    date: string;
    completed: boolean;
    notes?: string;
    timestamp: string;
}

export interface HabitStats {
    habit_id: string;
    total_days: number;
    completed_days: number;
    completion_rate: number;
    current_streak: number;
    longest_streak: number;
    last_completed: string | null;
}

export async function getHabits(): Promise<{ habits: Habit[] }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/habits`, { headers });

    if (!response.ok) {
        throw new Error("Failed to load habits");
    }

    return response.json();
}

export async function createHabit(habit: Omit<Habit, "id" | "created_at" | "today_completed">): Promise<{ status: string; habit: Habit }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/habits`, {
        method: "POST",
        headers,
        body: JSON.stringify(habit),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to create habit");
    }

    return response.json();
}

export async function updateHabit(habitId: string, habit: Partial<Habit>): Promise<{ status: string; habit: Habit }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/habits/${habitId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(habit),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to update habit");
    }

    return response.json();
}

export async function deleteHabit(habitId: string): Promise<void> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/habits/${habitId}`, {
        method: "DELETE",
        headers,
    });

    if (!response.ok) {
        throw new Error("Failed to delete habit");
    }
}

export async function toggleHabitEntry(habitId: string, date: string, completed: boolean, notes?: string): Promise<{ status: string; entry: HabitEntry }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/habits/${habitId}/entries`, {
        method: "POST",
        headers,
        body: JSON.stringify({ date, completed, notes }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to update habit entry");
    }

    return response.json();
}

export async function getHabitStats(habitId: string, days: number = 90): Promise<HabitStats> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/habits/${habitId}/stats?days=${days}`, { headers });

    if (!response.ok) {
        throw new Error("Failed to load habit stats");
    }

    return response.json();
}

export async function getHabitEntries(habitId: string, days: number = 90): Promise<{ entries: HabitEntry[] }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/habits/${habitId}/entries?days=${days}`, { headers });

    if (!response.ok) {
        throw new Error("Failed to load habit entries");
    }

    return response.json();
}

// --- Sleep Tracking API (Phase 30) ---

export interface SleepEntry {
    id: string;
    date: string;
    bedtime: string;
    wake_time: string;
    sleep_duration_hours: number;
    quality_rating: number;
    notes?: string;
    timestamp: string;
}

export interface SleepSettings {
    target_sleep_hours: number;
    bedtime_reminder_enabled: boolean;
    bedtime_reminder_time: string;
    wake_reminder_enabled: boolean;
    wake_reminder_time: string;
}

export interface SleepStats {
    total_nights: number;
    average_duration: number | null;
    average_quality: number | null;
    total_hours: number;
    best_quality_night: SleepEntry | null;
    longest_sleep: SleepEntry | null;
    shortest_sleep: SleepEntry | null;
    consistency_score: number | null;
}

export async function getSleepEntries(days: number = 30): Promise<{ entries: SleepEntry[] }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/sleep/entries?days=${days}`, { headers });

    if (!response.ok) {
        throw new Error("Failed to load sleep entries");
    }

    return response.json();
}

export async function createSleepEntry(entry: Partial<SleepEntry>): Promise<{ status: string; entry: SleepEntry }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/sleep/entries`, {
        method: "POST",
        headers: {
            ...headers,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(entry),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: "Failed to save sleep entry" }));
        throw new Error(error.detail || "Failed to save sleep entry");
    }

    return response.json();
}

export async function deleteSleepEntry(entryId: string): Promise<{ status: string }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/sleep/entries/${entryId}`, {
        method: "DELETE",
        headers,
    });

    if (!response.ok) {
        throw new Error("Failed to delete sleep entry");
    }

    return response.json();
}

export async function getSleepStats(days: number = 30): Promise<SleepStats> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/sleep/stats?days=${days}`, { headers });

    if (!response.ok) {
        throw new Error("Failed to load sleep stats");
    }

    return response.json();
}

export async function getSleepSettings(): Promise<SleepSettings> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/sleep/settings`, { headers });

    if (!response.ok) {
        throw new Error("Failed to load sleep settings");
    }

    return response.json();
}

export async function updateSleepSettings(settings: Partial<SleepSettings>): Promise<{ status: string; settings: SleepSettings }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/sleep/settings`, {
        method: "POST",
        headers: {
            ...headers,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: "Failed to update sleep settings" }));
        throw new Error(error.detail || "Failed to update sleep settings");
    }

    return response.json();
}

// --- Nutrition Tracking API (Phase 32) ---

export interface FoodItem {
    id: string;
    name: string;
    brand?: string;
    barcode?: string;
    serving_size: string;
    serving_weight_grams?: number;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    fiber?: number;
    sugar?: number;
    sodium?: number;
    source: string;
    // Health scoring data (Yuka-like features)
    health?: {
        health_score?: number;
        health_grade?: string;
        breakdown?: {
            nutri_score_points?: number;
            nova_points?: number;
            additives_points?: number;
            ingredient_quality_points?: number;
            final_score?: number;
            grade?: string;
        };
        nutri_score?: {
            grade?: string;
            description?: string;
        };
        nova?: {
            group?: number;
            description?: string;
        };
        additives?: {
            total?: number;
            harmful?: string[];
            questionable?: string[];
            safe?: string[];
            has_harmful?: boolean;
            has_questionable?: boolean;
        };
        ingredients_analysis?: string[];
        recommendation?: string;
        ecoscore?: string;
    };
    ingredients_text?: string;
    nutri_score?: string;
    nova_group?: number;
    additives?: string[];
    ingredients_analysis?: string[];
    ecoscore?: string;
}

export interface FoodEntry {
    id: string;
    user_id: string;
    date: string;
    meal_type: string; // breakfast, lunch, dinner, snack
    food_item: FoodItem;
    quantity: number;
    unit: string; // serving, gram, oz, cup, piece, etc.
    nutrition: {
        calories: number;
        protein: number;
        carbs: number;
        fats: number;
        fiber?: number;
        sugar?: number;
        sodium?: number;
    };
    timestamp: string;
}

export interface NutritionGoal {
    user_id: string;
    daily_calories: number;
    protein_grams?: number;
    carbs_grams?: number;
    fats_grams?: number;
    protein_percent?: number;
    carbs_percent?: number;
    fats_percent?: number;
    activity_level: string;
    goal: string; // lose, maintain, gain
    updated_at: string;
}

export interface NutritionSummary {
    date: string;
    total_calories: number;
    total_protein: number;
    total_carbs: number;
    total_fats: number;
    total_fiber?: number;
    total_sugar?: number;
    total_sodium?: number;
    goal_calories: number;
    calories_remaining: number;
    protein_percent?: number;
    carbs_percent?: number;
    fats_percent?: number;
    meal_breakdown: {
        breakfast: number;
        lunch: number;
        dinner: number;
        snack: number;
    };
}

export interface CalorieTrend {
    date: string;
    calories: number;
}

export interface MacroTrend {
    date: string;
    protein: number;
    carbs: number;
    fats: number;
}

export interface MostLoggedFood {
    name: string;
    count: number;
    avg_calories: number;
}

export interface MealAverages {
    breakfast: number;
    lunch: number;
    dinner: number;
    snack: number;
}

export interface NutritionPatterns {
    dinner_percentage: number;
    protein_percentage: number;
    avg_daily_calories: number;
    total_days: number;
}

export interface WeeklySummary {
    week_start: string;
    total_calories: number;
    avg_daily_calories: number;
    total_protein: number;
    total_carbs: number;
    total_fats: number;
    days_logged: number;
}

export interface NutritionStats {
    calorie_trends: CalorieTrend[];
    macro_trends: MacroTrend[];
    most_logged_foods: MostLoggedFood[];
    meal_averages: MealAverages;
    patterns: NutritionPatterns;
    weekly_summaries: WeeklySummary[];
    date_range: {
        start: string;
        end: string;
    };
    // Backward compatibility
    days_tracked: number;
    average_calories: number | null;
    average_protein: number | null;
    average_carbs: number | null;
    average_fats: number | null;
    total_days: number;
}

export async function searchFoods(query: string): Promise<{ foods: FoodItem[]; source: string }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/nutrition/search?query=${encodeURIComponent(query)}`, { headers });

    if (!response.ok) {
        throw new Error("Failed to search foods");
    }

    return response.json();
}

export async function getFoodDetails(foodId: string, source?: string): Promise<FoodItem> {
    const headers = await getAuthHeaders();
    const url = source 
        ? `${API_URL}/nutrition/food/${foodId}?source=${source}`
        : `${API_URL}/nutrition/food/${foodId}`;
    const response = await fetch(url, { headers });

    if (!response.ok) {
        throw new Error("Failed to get food details");
    }

    return response.json();
}

export async function getHealthierAlternatives(foodId: string, limit: number = 5): Promise<{
    current_food: { id: string; name: string; health_score: number };
    alternatives: Array<{
        food: FoodItem;
        health_score: number;
        score_improvement: number;
        similarity: number;
        explanation: string;
    }>;
}> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/nutrition/health/${encodeURIComponent(foodId)}/alternatives?limit=${limit}`, {
        headers
    });

    if (!response.ok) {
        throw new Error("Failed to get healthier alternatives");
    }

    return response.json();
}

export async function getNutritionEntries(date?: string, days: number = 30): Promise<{ entries: FoodEntry[] }> {
    const headers = await getAuthHeaders();
    const url = date
        ? `${API_URL}/nutrition/entries?date=${date}&days=${days}`
        : `${API_URL}/nutrition/entries?days=${days}`;
    const response = await fetch(url, { headers });

    if (!response.ok) {
        throw new Error("Failed to load nutrition entries");
    }

    return response.json();
}

export async function createNutritionEntry(entry: Partial<FoodEntry>): Promise<{ status: string; entry: FoodEntry }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/nutrition/entries`, {
        method: "POST",
        headers: {
            ...headers,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(entry),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: "Failed to create nutrition entry" }));
        throw new Error(error.detail || "Failed to create nutrition entry");
    }

    return response.json();
}

export async function updateNutritionEntry(entryId: string, entry: Partial<FoodEntry>): Promise<{ status: string; entry: FoodEntry }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/nutrition/entries/${entryId}`, {
        method: "PUT",
        headers: {
            ...headers,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(entry),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: "Failed to update nutrition entry" }));
        throw new Error(error.detail || "Failed to update nutrition entry");
    }

    return response.json();
}

export async function deleteNutritionEntry(entryId: string): Promise<{ status: string }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/nutrition/entries/${entryId}`, {
        method: "DELETE",
        headers,
    });

    if (!response.ok) {
        throw new Error("Failed to delete nutrition entry");
    }

    return response.json();
}

export async function getNutritionSummary(date?: string): Promise<NutritionSummary> {
    const headers = await getAuthHeaders();
    const url = date
        ? `${API_URL}/nutrition/summary?date=${date}`
        : `${API_URL}/nutrition/summary`;
    const response = await fetch(url, { headers });

    if (!response.ok) {
        throw new Error("Failed to load nutrition summary");
    }

    return response.json();
}

export async function getNutritionGoals(): Promise<NutritionGoal> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/nutrition/goals`, { headers });

    if (!response.ok) {
        throw new Error("Failed to load nutrition goals");
    }

    return response.json();
}

export async function updateNutritionGoals(goals: Partial<NutritionGoal>): Promise<{ status: string; goals: NutritionGoal }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/nutrition/goals`, {
        method: "POST",
        headers: {
            ...headers,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(goals),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: "Failed to update nutrition goals" }));
        throw new Error(error.detail || "Failed to update nutrition goals");
    }

    return response.json();
}

export async function getNutritionStats(
    days?: number,
    startDate?: string,
    endDate?: string
): Promise<NutritionStats> {
    const headers = await getAuthHeaders();
    const params = new URLSearchParams();
    if (days !== undefined) params.append("days", days.toString());
    if (startDate) params.append("start_date", startDate);
    if (endDate) params.append("end_date", endDate);
    
    const url = `${API_URL}/nutrition/stats${params.toString() ? `?${params.toString()}` : ""}`;
    const response = await fetch(url, { headers });

    if (!response.ok) {
        throw new Error("Failed to load nutrition stats");
    }

    return response.json();
}

// --- Weight Tracking API ---

export interface WeightEntry {
    id: string;
    user_id: string;
    date: string;
    weight_kg: number;
    weight_lbs?: number;
    body_fat_percent?: number;
    notes?: string;
    timestamp: string;
}

export interface WeightGoal {
    user_id: string;
    goal_type: string; // "lose", "maintain", "gain"
    current_weight_kg: number;
    target_weight_kg?: number;
    target_date?: string;
    weekly_change_kg?: number;
    activity_level: string;
    gender: string;
    age: number;
    height_cm: number;
    updated_at: string;
}

export interface WeightStats {
    entries_count: number;
    latest_weight: number | null;
    weight_change: number | null;
    average_weight: number | null;
    trend: string | null;
}

export interface CalorieTarget {
    bmr: number;
    tdee: number;
    target_calories: number;
    weekly_change_kg: number;
    daily_adjustment: number;
}

export async function getWeightEntries(days: number = 365): Promise<{ entries: WeightEntry[] }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/weight/entries?days=${days}`, { headers });

    if (!response.ok) {
        throw new Error("Failed to load weight entries");
    }

    return response.json();
}

export async function createWeightEntry(entry: Partial<WeightEntry>): Promise<{ status: string; entry: WeightEntry }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/weight/entries`, {
        method: "POST",
        headers: {
            ...headers,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(entry),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: "Failed to create weight entry" }));
        throw new Error(error.detail || "Failed to create weight entry");
    }

    return response.json();
}

export async function deleteWeightEntry(entryId: string): Promise<{ status: string }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/weight/entries/${entryId}`, {
        method: "DELETE",
        headers,
    });

    if (!response.ok) {
        throw new Error("Failed to delete weight entry");
    }

    return response.json();
}

export async function getWeightGoals(): Promise<{ goals: WeightGoal | null; calorie_target: CalorieTarget | null }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/weight/goals`, { headers });

    if (!response.ok) {
        throw new Error("Failed to load weight goals");
    }

    return response.json();
}

export async function updateWeightGoals(goals: Partial<WeightGoal>): Promise<{ status: string; goals: WeightGoal }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/weight/goals`, {
        method: "POST",
        headers: {
            ...headers,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(goals),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: "Failed to update weight goals" }));
        throw new Error(error.detail || "Failed to update weight goals");
    }

    return response.json();
}

export async function getWeightStats(days: number = 30): Promise<WeightStats> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/weight/stats?days=${days}`, { headers });

    if (!response.ok) {
        throw new Error("Failed to load weight stats");
    }

    return response.json();
}

// --- Wellness Integration API ---

export interface WellnessCorrelation {
    metric1: string;
    metric2: string;
    correlation: number;
    strength: string;
    insight: string;
}

export interface WellnessInsight {
    type: string;
    title: string;
    description: string;
    impact: string;
    recommendation?: string;
}

export interface WellnessScore {
    total_score: number;
    nutrition_score: number;
    sleep_score: number;
    water_score: number;
    habits_score: number;
    supplements_score: number;
    breakdown: {
        nutrition: { score: number; max: number; details: string };
        sleep: { score: number; max: number; details: string };
        water: { score: number; max: number; details: string };
        habits: { score: number; max: number; details: string };
        supplements: { score: number; max: number; details: string };
    };
}

export async function getWellnessCorrelations(days: number = 30): Promise<{ correlations: WellnessCorrelation[] }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/nutrition/wellness/correlations?days=${days}`, { headers });

    if (!response.ok) {
        throw new Error("Failed to load wellness correlations");
    }

    return response.json();
}

export async function getWellnessScore(days: number = 30): Promise<WellnessScore> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/nutrition/wellness/score?days=${days}`, { headers });

    if (!response.ok) {
        throw new Error("Failed to load wellness score");
    }

    return response.json();
}

export async function getWellnessInsights(days: number = 30): Promise<{ insights: WellnessInsight[] }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/nutrition/wellness/insights?days=${days}`, { headers });

    if (!response.ok) {
        throw new Error("Failed to load wellness insights");
    }

    return response.json();
}

export async function getNutritionChallenges(): Promise<{ challenges: any[] }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/nutrition/challenges`, { headers });

    if (!response.ok) {
        throw new Error("Failed to load nutrition challenges");
    }

    return response.json();
}

export async function createNutritionChallenge(challengeData: any): Promise<{ status: string; challenge: any }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/nutrition/challenges/create`, {
        method: "POST",
        headers: {
            ...headers,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(challengeData),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: "Failed to create challenge" }));
        throw new Error(error.detail || "Failed to create challenge");
    }

    return response.json();
}

export async function shareMealPlan(mealPlanId: string, friendIds: string[]): Promise<{ status: string; message: string }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/nutrition/share/meal-plan`, {
        method: "POST",
        headers: {
            ...headers,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ meal_plan_id: mealPlanId, friend_ids: friendIds }),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: "Failed to share meal plan" }));
        throw new Error(error.detail || "Failed to share meal plan");
    }

    return response.json();
}

// --- Meal Suggestions API ---

export interface MealSuggestion {
    food_item_id: string;
    food_name: string;
    brand?: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    serving_size: string;
    serving_weight_grams?: number;
    reason: string;
    confidence: number;
    source?: string; // "usda", "recipe", "favorite", "local"
    recipe_id?: string; // If this is a recipe suggestion
    is_recipe?: boolean; // Whether this is a recipe or single food
    macro_fit_score?: number; // How well it fits macro needs (0-1)
    meal_combination?: Array<{ name: string; quantity: number; unit: string }>; // For complete meal suggestions
}

export interface FavoriteMeal {
    id: string;
    user_id: string;
    name: string;
    food_entries: any[];
    total_calories: number;
    total_protein: number;
    total_carbs: number;
    total_fats: number;
    meal_type: string;
    created_at: string;
    times_logged: number;
}

// --- Nutrition Insights & Recommendations ---

export interface NutritionPattern {
    has_data: boolean;
    days_analyzed?: number;
    total_entries?: number;
    averages?: {
        calories: number;
        protein: number;
        carbs: number;
        fats: number;
    };
    weekday_vs_weekend?: {
        weekday_avg: number;
        weekend_avg: number;
        difference: number;
        weekend_higher: boolean;
    };
    meal_breakdown?: Record<string, number>;
    trends?: {
        calorie_trend: string;
        calorie_change_percent: number;
        consistency_score: number;
    };
    top_foods?: Array<{ name: string; count: number }>;
    daily_totals?: Array<{
        date: string;
        calories: number;
        protein: number;
        carbs: number;
        fats: number;
    }>;
}

export interface NutritionRecommendation {
    type: "info" | "warning" | "success";
    priority: "high" | "medium" | "low";
    title: string;
    message: string;
    suggestion?: string;
    action?: string;
}

export interface WeeklyReport {
    week_start: string;
    week_end: string;
    has_data: boolean;
    summary?: {
        total_calories: number;
        total_protein: number;
        total_carbs: number;
        total_fats: number;
        days_logged: number;
        total_meals: number;
    };
    averages?: {
        calories: number;
        protein: number;
        carbs: number;
        fats: number;
    };
    goal_comparison?: Record<string, {
        goal: number;
        actual: number;
        percent: number;
        met: boolean;
    }>;
    daily_breakdown?: Record<string, {
        calories: number;
        protein: number;
        carbs: number;
        fats: number;
        meal_count: number;
    }>;
    meal_breakdown?: Record<string, {
        total_calories: number;
        avg_per_meal: number;
        meal_count: number;
    }>;
}

export interface DetectedPattern {
    type: string;
    title: string;
    description: string;
    severity: "low" | "medium" | "high";
    suggestion: string;
}

export async function getNutritionPatterns(days: number = 30): Promise<NutritionPattern> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/nutrition/insights/patterns?days=${days}`, { headers });

    if (!response.ok) {
        throw new Error("Failed to get nutrition patterns");
    }

    return response.json();
}

export async function getNutritionRecommendations(days: number = 30): Promise<{ recommendations: NutritionRecommendation[] }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/nutrition/insights/recommendations?days=${days}`, { headers });

    if (!response.ok) {
        throw new Error("Failed to get recommendations");
    }

    return response.json();
}

export async function getWeeklyReport(weekStart?: string): Promise<WeeklyReport> {
    const headers = await getAuthHeaders();
    const url = weekStart 
        ? `${API_URL}/nutrition/insights/weekly-report?week_start=${weekStart}`
        : `${API_URL}/nutrition/insights/weekly-report`;
    const response = await fetch(url, { headers });

    if (!response.ok) {
        throw new Error("Failed to get weekly report");
    }

    return response.json();
}

export async function getDetectedPatterns(days: number = 60): Promise<{ patterns: DetectedPattern[] }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/nutrition/insights/patterns-detected?days=${days}`, { headers });

    if (!response.ok) {
        throw new Error("Failed to get detected patterns");
    }

    return response.json();
}

// --- Data Export & Import ---

export interface ExportResults {
    exported: boolean;
    filename?: string;
    error?: string;
}

export interface ImportResults {
    imported: {
        nutrition?: number;
        recipes?: number;
        weight?: number;
        settings?: number | boolean;
    };
    skipped: number;
    errors: string[];
}

export interface BackupData {
    export_metadata: {
        user_id: string;
        export_date: string;
        version: string;
    };
    nutrition?: any;
    recipes?: any;
    meal_plans?: any;
    weight?: any;
    schedule?: any;
    settings?: any;
    goals?: any;
    backup_metadata?: {
        backup_date: string;
        backup_type: string;
        version: string;
    };
}

export async function exportAllData(): Promise<BackupData> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/data/export/all`, { headers });

    if (!response.ok) {
        throw new Error("Failed to export data");
    }

    return response.json();
}

export async function exportNutritionCSV(startDate?: string, endDate?: string): Promise<Blob> {
    const headers = await getAuthHeaders();
    const params = new URLSearchParams();
    if (startDate) params.append("start_date", startDate);
    if (endDate) params.append("end_date", endDate);
    
    const url = `${API_URL}/data/export/nutrition/csv${params.toString() ? `?${params.toString()}` : ""}`;
    const response = await fetch(url, { headers });

    if (!response.ok) {
        throw new Error("Failed to export nutrition CSV");
    }

    return response.blob();
}

export async function exportWeightCSV(): Promise<Blob> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/data/export/weight/csv`, { headers });

    if (!response.ok) {
        throw new Error("Failed to export weight CSV");
    }

    return response.blob();
}

export async function exportRecipesJSON(): Promise<Blob> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/data/export/recipes/json`, { headers });

    if (!response.ok) {
        throw new Error("Failed to export recipes");
    }

    return response.blob();
}

export async function exportMealPlanJSON(weekStart?: string): Promise<Blob> {
    const headers = await getAuthHeaders();
    const url = weekStart 
        ? `${API_URL}/data/export/meal-plan/json?week_start=${weekStart}`
        : `${API_URL}/data/export/meal-plan/json`;
    const response = await fetch(url, { headers });

    if (!response.ok) {
        throw new Error("Failed to export meal plan");
    }

    return response.blob();
}

export async function importMyFitnessPal(file: File): Promise<ImportResults> {
    const headers = await getAuthHeaders();
    const content = await file.text();
    
    const response = await fetch(`${API_URL}/data/import/myfitnesspal`, {
        method: "POST",
        headers: {
            ...headers,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ content }),
    });

    if (!response.ok) {
        throw new Error("Failed to import MyFitnessPal data");
    }

    return response.json();
}

export async function importCronometer(file: File): Promise<ImportResults> {
    const headers = await getAuthHeaders();
    const content = await file.text();
    
    const response = await fetch(`${API_URL}/data/import/cronometer`, {
        method: "POST",
        headers: {
            ...headers,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ content }),
    });

    if (!response.ok) {
        throw new Error("Failed to import Cronometer data");
    }

    return response.json();
}

export async function importGenericJSON(file: File): Promise<ImportResults> {
    const headers = await getAuthHeaders();
    const jsonData = JSON.parse(await file.text());
    
    const response = await fetch(`${API_URL}/data/import/generic`, {
        method: "POST",
        headers: {
            ...headers,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(jsonData),
    });

    if (!response.ok) {
        throw new Error("Failed to import data");
    }

    return response.json();
}

export async function createBackup(): Promise<BackupData> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/data/backup/create`, { headers });

    if (!response.ok) {
        throw new Error("Failed to create backup");
    }

    return response.json();
}

export async function restoreBackup(backupData: BackupData): Promise<ImportResults> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/data/backup/restore`, {
        method: "POST",
        headers: {
            ...headers,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(backupData),
    });

    if (!response.ok) {
        throw new Error("Failed to restore backup");
    }

    return response.json();
}

export async function getInsightsSummary(days: number = 30): Promise<{
    patterns: NutritionPattern;
    recommendations: NutritionRecommendation[];
    detected_patterns: DetectedPattern[];
    generated_at: string;
}> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/nutrition/insights/summary?days=${days}`, { headers });

    if (!response.ok) {
        throw new Error("Failed to get insights summary");
    }

    return response.json();
}

export async function getMealSuggestions(mealType: string, date?: string): Promise<{ 
    suggestions: MealSuggestion[];
    macro_gaps?: {
        needs_protein: boolean;
        needs_carbs: boolean;
        needs_fats: boolean;
        protein_gap: number;
        carbs_gap: number;
        fats_gap: number;
        protein_percent: number;
        carbs_percent: number;
        fats_percent: number;
    };
    target_calories?: number;
    remaining_calories?: number;
}> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/nutrition/suggestions`, {
        method: "POST",
        headers: {
            ...headers,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ meal_type: mealType, date: date || new Date().toISOString().split('T')[0] }),
    });

    if (!response.ok) {
        throw new Error("Failed to get meal suggestions");
    }

    return response.json();
}

export async function getFavoriteMeals(): Promise<{ favorites: FavoriteMeal[] }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/nutrition/favorites`, { headers });

    if (!response.ok) {
        throw new Error("Failed to load favorite meals");
    }

    return response.json();
}

export async function saveFavoriteMeal(meal: Partial<FavoriteMeal>): Promise<{ status: string; meal: FavoriteMeal }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/nutrition/favorites`, {
        method: "POST",
        headers: {
            ...headers,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(meal),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: "Failed to save favorite meal" }));
        throw new Error(error.detail || "Failed to save favorite meal");
    }

    return response.json();
}

// Old meal plan functions moved to meal prep section below

// --- Nutrition Analytics API ---

export interface NutritionPrediction {
    projected_goal_date: string | null;
    on_track: boolean;
    projected_weight: number | null;
    trend: string;
    average_daily_calories: number;
    goal_calories: number;
    calorie_adherence: number;
}

export interface NutritionCorrelation {
    metric1: string;
    metric2: string;
    correlation: number;
    strength: string;
    insight: string;
}

export interface NutritionReport {
    period: string;
    days_tracked: number;
    total_calories: number;
    average_daily_calories: number;
    average_protein: number;
    average_carbs: number;
    average_fats: number;
    goal_calories: number;
    goal_adherence: number;
    insights: string[];
}

export interface NutritionStreak {
    calorie_goal_streak: number;
    protein_goal_streak: number;
    longest_calorie_streak: number;
}

export async function getNutritionPredictions(days: number = 30): Promise<NutritionPrediction> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/nutrition/analytics/predictions?days=${days}`, { headers });

    if (!response.ok) {
        throw new Error("Failed to load predictions");
    }

    return response.json();
}

export async function getNutritionCorrelations(days: number = 30): Promise<{ correlations: NutritionCorrelation[]; data_points: number }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/nutrition/analytics/correlations?days=${days}`, { headers });

    if (!response.ok) {
        throw new Error("Failed to load correlations");
    }

    return response.json();
}

export async function getNutritionReports(period: "weekly" | "monthly" = "weekly"): Promise<NutritionReport> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/nutrition/analytics/reports?period=${period}`, { headers });

    if (!response.ok) {
        throw new Error("Failed to load reports");
    }

    return response.json();
}

export async function getNutritionStreaks(): Promise<NutritionStreak> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/nutrition/analytics/streaks`, { headers });

    if (!response.ok) {
        throw new Error("Failed to load streaks");
    }

    return response.json();
}

export async function getNutritionInsights(days: number = 30): Promise<{ insights: any[] }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/nutrition/analytics/insights?days=${days}`, { headers });

    if (!response.ok) {
        throw new Error("Failed to load insights");
    }

    return response.json();
}

// --- AI Coaching API ---

export interface DailyRecommendation {
    id: string;
    type: string;
    priority: string;
    title: string;
    message: string;
    action_items: string[];
    reasoning: string;
    related_metrics: Record<string, any>;
    created_at: string;
}

export interface WeeklyPlan {
    week_start: string;
    goals: Array<{
        category: string;
        goal: string;
        target: string;
        current: string;
    }>;
    meal_plan?: any;
    focus_areas: string[];
    milestones: Array<{
        id: string;
        title: string;
        target_date: string;
        category: string;
    }>;
    created_at: string;
}

export interface WellnessAnalysis {
    nutrition: any;
    water: any;
    habits: any;
    sleep: any;
    weight: any;
    overall_score: number;
}

export async function getDailyRecommendations(date?: string): Promise<{ recommendations: DailyRecommendation[]; date: string }> {
    const headers = await getAuthHeaders();
    const url = date ? `${API_URL}/coaching/daily-recommendations?date=${date}` : `${API_URL}/coaching/daily-recommendations`;
    const response = await fetch(url, { headers });

    if (!response.ok) {
        throw new Error("Failed to load recommendations");
    }

    return response.json();
}

export async function getWeeklyPlan(weekStart?: string): Promise<WeeklyPlan> {
    const headers = await getAuthHeaders();
    const url = weekStart ? `${API_URL}/coaching/weekly-plan?week_start=${weekStart}` : `${API_URL}/coaching/weekly-plan`;
    const response = await fetch(url, { headers });

    if (!response.ok) {
        throw new Error("Failed to load weekly plan");
    }

    return response.json();
}

export async function getWellnessAnalysis(days: number = 7): Promise<WellnessAnalysis> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/coaching/analysis?days=${days}`, { headers });

    if (!response.ok) {
        throw new Error("Failed to load wellness analysis");
    }

    return response.json();
}

export async function submitCoachingFeedback(recommendationId: string, feedback: { helpful?: boolean; comment?: string }): Promise<{ status: string; message: string }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/coaching/feedback`, {
        method: "POST",
        headers: {
            ...headers,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ recommendation_id: recommendationId, feedback }),
    });

    if (!response.ok) {
        throw new Error("Failed to submit feedback");
    }

    return response.json();
}

export async function getCoachingProgress(days: number = 30): Promise<{ overall_score: number; feedback_count: number; positive_feedback_rate: number; trend: string }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/coaching/progress?days=${days}`, { headers });

    if (!response.ok) {
        throw new Error("Failed to load coaching progress");
    }

    return response.json();
}

// --- Premium Subscription API ---

export interface PremiumStatus {
    is_premium: boolean;
    expires_at: string | null;
    plan: string;
}

export async function getPremiumStatus(): Promise<PremiumStatus> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/premium/status`, { headers });

    if (!response.ok) {
        throw new Error("Failed to load premium status");
    }

    return response.json();
}

export async function subscribePremium(plan: "monthly" | "yearly"): Promise<{ status: string; message: string; premium: PremiumStatus }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/premium/subscribe`, {
        method: "POST",
        headers: {
            ...headers,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan }),
    });

    if (!response.ok) {
        throw new Error("Failed to subscribe");
    }

    return response.json();
}

// --- Community & Gamification API ---

export interface Challenge {
    id: string;
    name: string;
    description: string;
    type: string;
    goal: string;
    target_value: number;
    unit: string;
    start_date: string;
    end_date: string;
    is_premium: boolean;
    created_by: string;
    participants: string[];
    created_at: string;
}

export interface LeaderboardEntry {
    user_id: string;
    username: string;
    score: number;
    rank: number;
    progress: number;
    avatar_url?: string;
}

export interface Achievement {
    id: string;
    name: string;
    description: string;
    icon: string;
    category: string;
    rarity: string;
    points: number;
    unlocked_at?: string;
}

export async function getChallenges(): Promise<{ challenges: Challenge[] }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/community/challenges`, { headers });

    if (!response.ok) {
        throw new Error("Failed to load challenges");
    }

    return response.json();
}

export async function createChallenge(challenge: Partial<Challenge>): Promise<Challenge> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/community/challenges/create`, {
        method: "POST",
        headers: {
            ...headers,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(challenge),
    });

    if (!response.ok) {
        throw new Error("Failed to create challenge");
    }

    return response.json();
}

export async function joinChallenge(challengeId: string): Promise<{ status: string; message: string }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/community/challenges/join`, {
        method: "POST",
        headers: {
            ...headers,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ challenge_id: challengeId }),
    });

    if (!response.ok) {
        throw new Error("Failed to join challenge");
    }

    return response.json();
}

export async function getMyChallenges(): Promise<{ challenges: Challenge[] }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/community/challenges/my-challenges`, { headers });

    if (!response.ok) {
        throw new Error("Failed to load challenges");
    }

    return response.json();
}

export async function getChallengeLeaderboard(challengeId: string): Promise<{ leaderboard: LeaderboardEntry[] }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/community/challenges/${challengeId}/leaderboard`, { headers });

    if (!response.ok) {
        throw new Error("Failed to load leaderboard");
    }

    return response.json();
}

export async function getLeaderboard(type: "global" | "friends" = "global", limit: number = 100): Promise<{ leaderboard: LeaderboardEntry[]; type: string }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/community/leaderboard?type=${type}&limit=${limit}`, { headers });

    if (!response.ok) {
        throw new Error("Failed to load leaderboard");
    }

    return response.json();
}

export async function getUserPoints(): Promise<{ points: number; level: number; points_to_next_level: number }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/community/points`, { headers });

    if (!response.ok) {
        throw new Error("Failed to load points");
    }

    return response.json();
}

export async function getUserAchievements(): Promise<{ achievements: Achievement[] }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/community/achievements`, { headers });

    if (!response.ok) {
        throw new Error("Failed to load achievements");
    }

    return response.json();
}

// --- Recipe & Meal Prep API ---

export interface Recipe {
    id: string;
    name: string;
    description: string;
    cuisine: string;
    difficulty: string;
    prep_time_minutes: number;
    cook_time_minutes: number;
    total_time_minutes: number;
    servings: number;
    ingredients: Array<{
        name: string;
        quantity: number;
        unit: string;
        category?: string;
        notes?: string;
    }>;
    instructions: string[];
    nutrition: {
        calories: number;
        protein: number;
        carbs: number;
        fats: number;
    };
    tags: string[];
    image_url?: string;
    video_url?: string;
    created_by: string;
    is_public: boolean;
    rating: number;
    review_count: number;
    created_at: string;
    updated_at: string;
}

export interface MealPlan {
    id: string;
    user_id: string;
    week_start: string;
    meals: Record<string, Array<{
        meal_type: string;
        recipe_id: string;
        servings: number;
    }>>;
    created_at: string;
    updated_at: string;
}

export interface ShoppingListItem {
    name: string;
    quantity: number;
    unit: string;
    category: string;
    checked: boolean;
}

export interface ShoppingList {
    id: string;
    user_id: string;
    meal_plan_id?: string;
    items: ShoppingListItem[];
    created_at: string;
    updated_at: string;
}

export async function searchRecipes(params: {
    query?: string;
    cuisine?: string;
    difficulty?: string;
    tags?: string[];
    max_prep_time?: number;
    min_rating?: number;
    limit?: number;
}): Promise<{ recipes: Recipe[] }> {
    const headers = await getAuthHeaders();
    const queryParams = new URLSearchParams();
    if (params.query) queryParams.append("query", params.query);
    if (params.cuisine) queryParams.append("cuisine", params.cuisine);
    if (params.difficulty) queryParams.append("difficulty", params.difficulty);
    if (params.tags) queryParams.append("tags", params.tags.join(","));
    if (params.max_prep_time) queryParams.append("max_prep_time", params.max_prep_time.toString());
    if (params.min_rating) queryParams.append("min_rating", params.min_rating.toString());
    if (params.limit) queryParams.append("limit", params.limit.toString());
    
    const response = await fetch(`${API_URL}/recipes?${queryParams.toString()}`, { headers });

    if (!response.ok) {
        throw new Error("Failed to search recipes");
    }

    return response.json();
}

export async function getRecipe(recipeId: string): Promise<Recipe> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/recipes/${recipeId}`, { headers });

    if (!response.ok) {
        throw new Error("Failed to load recipe");
    }

    return response.json();
}

export async function createRecipe(recipe: Partial<Recipe>): Promise<Recipe> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/recipes`, {
        method: "POST",
        headers: {
            ...headers,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(recipe),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: "Failed to create recipe" }));
        throw new Error(error.detail || "Failed to create recipe");
    }

    return response.json();
}

export async function getMyRecipes(): Promise<{ recipes: Recipe[] }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/recipes/my`, { headers });

    if (!response.ok) {
        throw new Error("Failed to load your recipes");
    }

    return response.json();
}

export async function updateRecipe(recipeId: string, recipe: Partial<Recipe>): Promise<Recipe> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/recipes/${recipeId}`, {
        method: "PUT",
        headers: {
            ...headers,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(recipe),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: "Failed to update recipe" }));
        throw new Error(error.detail || "Failed to update recipe");
    }

    return response.json();
}

export async function deleteRecipe(recipeId: string): Promise<void> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/recipes/${recipeId}`, {
        method: "DELETE",
        headers,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: "Failed to delete recipe" }));
        throw new Error(error.detail || "Failed to delete recipe");
    }
}

export interface Ingredient {
    name: string;
    quantity: number;
    unit: string;
    food_id?: string;
    category?: string;
    notes?: string;
}

export interface RecipeNutrition {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    fiber?: number;
    sugar?: number;
    sodium?: number;
    _missing_ingredients?: string[];
}

export async function calculateRecipeNutrition(ingredients: Ingredient[]): Promise<RecipeNutrition> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/recipes/calculate-nutrition`, {
        method: "POST",
        headers: {
            ...headers,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ ingredients }),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: "Failed to calculate nutrition" }));
        throw new Error(error.detail || "Failed to calculate nutrition");
    }

    return response.json();
}

export async function favoriteRecipe(recipeId: string): Promise<{ status: string; message: string }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/recipes/${recipeId}/favorite`, {
        method: "POST",
        headers: {
            ...headers,
            "Content-Type": "application/json",
        },
    });

    if (!response.ok) {
        throw new Error("Failed to favorite recipe");
    }

    return response.json();
}

export async function getFavoriteRecipes(): Promise<{ recipes: Recipe[] }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/recipes/favorites`, { headers });

    if (!response.ok) {
        throw new Error("Failed to load favorite recipes");
    }

    return response.json();
}

export async function createMealPlan(weekStart: string, meals: Record<string, any[]>): Promise<MealPlan> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/meal-prep/plan`, {
        method: "POST",
        headers: {
            ...headers,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ week_start: weekStart, meals }),
    });

    if (!response.ok) {
        throw new Error("Failed to create meal plan");
    }

    return response.json();
}

export async function getMealPlan(weekStart?: string): Promise<{ meal_plan: MealPlan | null }> {
    const headers = await getAuthHeaders();
    const url = weekStart ? `${API_URL}/meal-prep/plan?week_start=${weekStart}` : `${API_URL}/meal-prep/plan`;
    const response = await fetch(url, { headers });

    if (!response.ok) {
        throw new Error("Failed to load meal plan");
    }

    return response.json();
}

export async function generateShoppingList(mealPlanId?: string, weekStart?: string): Promise<ShoppingList> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/meal-prep/shopping-list`, {
        method: "POST",
        headers: {
            ...headers,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ meal_plan_id: mealPlanId, week_start: weekStart }),
    });

    if (!response.ok) {
        throw new Error("Failed to generate shopping list");
    }

    return response.json();
}

// --- Account Deletion API ---

export async function deleteAccount(): Promise<{ status: string; message: string }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/account/delete`, {
        method: "DELETE",
        headers,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: "Failed to delete account" }));
        throw new Error(error.detail || "Failed to delete account");
    }

    return response.json();
}

// --- Tasks API ---

export interface Task {
    id: string;
    title: string;
    completed: boolean;
    priority: "low" | "medium" | "high";
    dueDate?: string;
    createdAt: string;
}

export async function getTasks(): Promise<{ tasks: Task[] }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/tasks`, { headers });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: "Failed to get tasks" }));
        throw new Error(error.detail || "Failed to get tasks");
    }

    return response.json();
}

export async function createTask(task: Omit<Task, "id" | "createdAt"> & { id?: string; createdAt?: string }): Promise<{ status: string; task: Task }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/tasks`, {
        method: "POST",
        headers: {
            ...headers,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(task),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: "Failed to create task" }));
        throw new Error(error.detail || "Failed to create task");
    }

    return response.json();
}

export async function updateTask(taskId: string, updates: Partial<Task>): Promise<{ status: string }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/tasks/${taskId}`, {
        method: "PUT",
        headers: {
            ...headers,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: "Failed to update task" }));
        throw new Error(error.detail || "Failed to update task");
    }

    return response.json();
}

export async function deleteTask(taskId: string): Promise<{ status: string }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/tasks/${taskId}`, {
        method: "DELETE",
        headers,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: "Failed to delete task" }));
        throw new Error(error.detail || "Failed to delete task");
    }

    return response.json();
}

// --- Meal Template API ---

export interface MealTemplateFood {
    name: string;
    quantity: number;
    unit: string;
    nutrition: {
        calories: number;
        protein: number;
        carbs: number;
        fats: number;
    };
    food_id?: string;
}

export interface MealTemplate {
    id: string;
    name: string;
    description: string;
    category: "breakfast" | "lunch" | "dinner" | "snacks";
    foods: MealTemplateFood[];
    total_nutrition: {
        calories: number;
        protein: number;
        carbs: number;
        fats: number;
    };
    usage_count: number;
    last_used?: string;
    created_by: string;
    created_at: string;
    updated_at: string;
}

export async function getUserMealTemplates(category?: string): Promise<{ templates: MealTemplate[] }> {
    const headers = await getAuthHeaders();
    const url = category ? `${API_URL}/meal-templates/my?category=${category}` : `${API_URL}/meal-templates/my`;
    const response = await fetch(url, { headers });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: "Failed to get meal templates" }));
        throw new Error(error.detail || "Failed to get meal templates");
    }

    return response.json();
}

export async function createMealTemplate(template: Omit<MealTemplate, "id" | "total_nutrition" | "usage_count" | "last_used" | "created_by" | "created_at" | "updated_at">): Promise<{ status: string; template: MealTemplate }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/meal-templates`, {
        method: "POST",
        headers: {
            ...headers,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(template),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: "Failed to create meal template" }));
        throw new Error(error.detail || "Failed to create meal template");
    }

    return response.json();
}

export async function updateMealTemplate(templateId: string, updates: Partial<Omit<MealTemplate, "id" | "total_nutrition" | "usage_count" | "last_used" | "created_by" | "created_at" | "updated_at">>): Promise<{ status: string; template: MealTemplate }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/meal-templates/${templateId}`, {
        method: "PUT",
        headers: {
            ...headers,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: "Failed to update meal template" }));
        throw new Error(error.detail || "Failed to update meal template");
    }

    return response.json();
}

export async function deleteMealTemplate(templateId: string): Promise<{ status: string; message: string }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/meal-templates/${templateId}`, {
        method: "DELETE",
        headers,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: "Failed to delete meal template" }));
        throw new Error(error.detail || "Failed to delete meal template");
    }

    return response.json();
}

export async function useMealTemplate(templateId: string): Promise<{ status: string }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/meal-templates/${templateId}/use`, {
        method: "POST",
        headers,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: "Failed to mark template as used" }));
        throw new Error(error.detail || "Failed to mark template as used");
    }

    return response.json();
}

export async function getMealTemplateStats(): Promise<{ stats: {
    total_templates: number;
    templates_by_category: Record<string, number>;
    total_usage: number;
    most_used?: { id: string; name: string; usage_count: number };
    recently_used?: { id: string; name: string; last_used: string };
} }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/meal-templates/stats`, { headers });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: "Failed to get template stats" }));
        throw new Error(error.detail || "Failed to get template stats");
    }

    return response.json();
}

export async function searchMealTemplates(query: string, category?: string): Promise<{ templates: MealTemplate[] }> {
    const headers = await getAuthHeaders();
    const params = new URLSearchParams({ query });
    if (category) params.append("category", category);

    const response = await fetch(`${API_URL}/meal-templates/search?${params}`, { headers });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: "Failed to search templates" }));
        throw new Error(error.detail || "Failed to search templates");
    }

    return response.json();
}

export async function getRecentMealTemplates(limit: number = 5): Promise<{ templates: MealTemplate[] }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/meal-templates/recent?limit=${limit}`, { headers });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: "Failed to get recent templates" }));
        throw new Error(error.detail || "Failed to get recent templates");
    }

    return response.json();
}

// --- Task Templates API ---

export interface TaskTemplate {
    id: string;
    name: string;
    description: string;
    category: string;
    icon?: string;
    tasks: Array<{
        name: string;
        description: string;
        category: string;
        time_offset: string; // e.g., "0:30" (30 min after wake) or "-1:00" (1 hour before bed)
        duration_minutes?: number;
        notes?: string;
    }>;
}

export interface ScheduleTask {
    id: string;
    name: string;
    description?: string;
    category: string;
    duration_minutes?: number;
    notes?: string;
    enabled: boolean;
    optional?: boolean;
    icon?: string;
}

export async function getTaskTemplates(): Promise<{ templates: TaskTemplate[] }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/schedule/tasks/templates`, { headers });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: "Failed to get task templates" }));
        throw new Error(error.detail || "Failed to get task templates");
    }

    return response.json();
}

export async function applyTaskTemplate(
    templateId: string,
    date?: string,
    daysOfWeek?: number[]
): Promise<{
    status: string;
    template: string;
    dates_applied: number;
    items_added: number;
    added_items: Array<{ date: string; task: string; time: string }>;
    backup_file?: string;
}> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/schedule/tasks/apply-template`, {
        method: "POST",
        headers: {
            ...headers,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            template_id: templateId,
            date: date,
            days_of_week: daysOfWeek,
        }),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: "Failed to apply template" }));
        throw new Error(error.detail || "Failed to apply template");
    }

    return response.json();
}

export async function revertTemplateApplication(backupFile: string): Promise<{
    status: string;
    message: string;
}> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/schedule/tasks/revert-template`, {
        method: "POST",
        headers: {
            ...headers,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            backup_file: backupFile,
        }),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: "Failed to revert template" }));
        throw new Error(error.detail || "Failed to revert template");
    }

    return response.json();
}

export async function getScheduleTypes(): Promise<{
    types: Array<{ value: string; label: string }>;
}> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/schedule/types`, { headers });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: "Failed to get schedule types" }));
        throw new Error(error.detail || "Failed to get schedule types");
    }

    return response.json();
}

export async function addScheduleTask(task: Partial<ScheduleTask>): Promise<{ status: string; task: ScheduleTask }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/schedule/tasks`, {
        method: "POST",
        headers: {
            ...headers,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(task),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: "Failed to add task" }));
        throw new Error(error.detail || "Failed to add task");
    }

    return response.json();
}

export async function updateScheduleTask(
    taskId: string,
    task: Partial<ScheduleTask>
): Promise<{ status: string; task: ScheduleTask }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/schedule/tasks/${taskId}`, {
        method: "PUT",
        headers: {
            ...headers,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(task),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: "Failed to update task" }));
        throw new Error(error.detail || "Failed to update task");
    }

    return response.json();
}

export async function deleteScheduleTask(taskId: string): Promise<{ status: string; deleted_task: ScheduleTask }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/schedule/tasks/${taskId}`, {
        method: "DELETE",
        headers,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: "Failed to delete task" }));
        throw new Error(error.detail || "Failed to delete task");
    }

    return response.json();
}