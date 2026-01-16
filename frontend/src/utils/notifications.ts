/**
 * Phase 29: Advanced Notification System
 * Web Push API and notification management utilities
 */

export interface NotificationSettings {
    enabled: boolean;
    reminder_minutes_before: number;
    missed_item_reminders: boolean;
    missed_item_delay_minutes: number;
    quiet_hours: {
        enabled: boolean;
        start: string;
        end: string;
    };
    notification_types: {
        upcoming_reminders: boolean;
        missed_items: boolean;
        daily_summary: boolean;
        streak_reminders: boolean;
        habit_reminders: boolean;
    };
    push_subscriptions: Array<{
        endpoint: string;
        keys: {
            p256dh: string;
            auth: string;
        };
        created_at: string;
    }>;
}

const API_URL = "/backend";

async function getAuthHeaders(): Promise<HeadersInit> {
    const { getSession } = await import("next-auth/react");
    const session = await getSession();
    const headers: HeadersInit = {
        "Content-Type": "application/json",
    };
    
    // @ts-ignore
    const userId = session?.user?.id || session?.user?.email;
    if (userId) {
        headers["x-user-id"] = userId; // FastAPI expects lowercase with hyphens
    }
    
    return headers;
}

export async function getNotificationSettings(): Promise<NotificationSettings> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/notifications/settings`, { headers });
    
    if (!response.ok) {
        throw new Error("Failed to load notification settings");
    }
    
    return response.json();
}

export async function updateNotificationSettings(settings: Partial<NotificationSettings>): Promise<NotificationSettings> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/notifications/settings`, {
        method: "POST",
        headers,
        body: JSON.stringify(settings),
    });
    
    if (!response.ok) {
        throw new Error("Failed to update notification settings");
    }
    
    const data = await response.json();
    return data.settings;
}

export async function getUpcomingNotifications(lookaheadMinutes: number = 60): Promise<any[]> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/notifications/upcoming?lookahead_minutes=${lookaheadMinutes}`, { headers });
    
    if (!response.ok) {
        throw new Error("Failed to get upcoming notifications");
    }
    
    const data = await response.json();
    return data.notifications || [];
}

export async function markNotificationSent(type: string, itemId: string, date: string): Promise<void> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/notifications/mark-sent`, {
        method: "POST",
        headers,
        body: JSON.stringify({ type, item_id: itemId, date }),
    });
    
    if (!response.ok) {
        throw new Error("Failed to mark notification as sent");
    }
}

// Web Push API functions
export async function requestNotificationPermission(): Promise<NotificationPermission> {
    if (!("Notification" in window)) {
        throw new Error("This browser does not support notifications");
    }
    
    if (Notification.permission === "granted") {
        return "granted";
    }
    
    if (Notification.permission === "denied") {
        return "denied";
    }
    
    const permission = await Notification.requestPermission();
    return permission;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!("serviceWorker" in navigator)) {
        console.warn("Service Workers are not supported");
        return null;
    }
    
    try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
            scope: "/",
        });
        
        console.log("Service Worker registered:", registration);
        return registration;
    } catch (error) {
        console.error("Service Worker registration failed:", error);
        return null;
    }
}

export async function subscribeToPushNotifications(
    registration: ServiceWorkerRegistration
): Promise<PushSubscription | null> {
    try {
        // VAPID public key from environment or fallback to generated key
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 
            "BKM4qALe-H2msXUzkil98QAaUbBbCf4fnMrXJIfiiGG6oOkeDXgEAQOHQEcNMuivOF3lfEWdgHFg1OaqJrjaSnc";
        
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as any,
        });
        
        return subscription;
    } catch (error) {
        console.error("Push subscription failed:", error);
        return null;
    }
}

export async function unsubscribeFromPushNotifications(
    subscription: PushSubscription
): Promise<boolean> {
    try {
        const result = await subscription.unsubscribe();
        return result;
    } catch (error) {
        console.error("Push unsubscription failed:", error);
        return false;
    }
}

export async function savePushSubscription(subscription: PushSubscription): Promise<void> {
    const headers = await getAuthHeaders();
    const subscriptionData = {
        endpoint: subscription.endpoint,
        keys: {
            p256dh: arrayBufferToBase64(subscription.getKey("p256dh")!),
            auth: arrayBufferToBase64(subscription.getKey("auth")!),
        },
    };
    
    const response = await fetch(`${API_URL}/notifications/push/subscribe`, {
        method: "POST",
        headers,
        body: JSON.stringify({ subscription: subscriptionData }),
    });
    
    if (!response.ok) {
        throw new Error("Failed to save push subscription");
    }
}

export async function removePushSubscription(endpoint: string): Promise<void> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/notifications/push/unsubscribe`, {
        method: "POST",
        headers,
        body: JSON.stringify({ endpoint }),
    });
    
    if (!response.ok) {
        throw new Error("Failed to remove push subscription");
    }
}

export async function sendTestNotification(): Promise<{ status: string; message: string }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/notifications/test`, {
        method: "POST",
        headers,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: "Failed to send test notification" }));
        throw new Error(error.detail || "Failed to send test notification");
    }

    return response.json();
}

// Helper functions
function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

// Check for notifications periodically
export function startNotificationChecker(callback: (notifications: any[]) => void, intervalMinutes: number = 5) {
    const checkNotifications = async () => {
        try {
            const notifications = await getUpcomingNotifications(intervalMinutes);
            if (notifications.length > 0) {
                callback(notifications);
            }
        } catch (error) {
            console.error("Error checking notifications:", error);
        }
    };
    
    // Check immediately
    checkNotifications();
    
    // Then check every interval
    const intervalMs = intervalMinutes * 60 * 1000;
    const intervalId = setInterval(checkNotifications, intervalMs);
    
    return () => clearInterval(intervalId);
}

