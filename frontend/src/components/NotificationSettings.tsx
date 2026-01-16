"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Clock, Moon, Sun, CheckCircle, XCircle } from "lucide-react";
import {
    getNotificationSettings,
    updateNotificationSettings,
    requestNotificationPermission,
    registerServiceWorker,
    subscribeToPushNotifications,
    savePushSubscription,
    removePushSubscription,
    sendTestNotification,
    NotificationSettings,
} from "@/utils/notifications";
import { useToast } from "@/context/ToastContext";

export function NotificationSettingsPanel() {
    const { showToast } = useToast();
    const [settings, setSettings] = useState<NotificationSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [permission, setPermission] = useState<NotificationPermission>("default");
    const [isSubscribed, setIsSubscribed] = useState(false);

    useEffect(() => {
        loadSettings();
        checkPermission();
    }, []);

    const loadSettings = async () => {
        try {
            const data = await getNotificationSettings();
            setSettings(data);
            // Check if actually subscribed to push notifications
            if (navigator.serviceWorker) {
                try {
                    const registration = await navigator.serviceWorker.ready;
                    const subscription = await registration.pushManager.getSubscription();
                    setIsSubscribed(!!subscription && data.push_subscriptions.length > 0);
                } catch (e) {
                    setIsSubscribed(data.push_subscriptions.length > 0);
                }
            } else {
                setIsSubscribed(data.push_subscriptions.length > 0);
            }
        } catch (error) {
            console.error("Failed to load notification settings:", error);
            showToast("Failed to load notification settings", "error");
        } finally {
            setLoading(false);
        }
    };

    const checkPermission = async () => {
        if ("Notification" in window) {
            setPermission(Notification.permission);
        }
    };

    const handleEnablePush = async () => {
        try {
            setSaving(true);
            const newPermission = await requestNotificationPermission();
            setPermission(newPermission);

            if (newPermission !== "granted") {
                showToast("Notification permission denied", "error");
                return;
            }

            const registration = await registerServiceWorker();
            if (!registration) {
                throw new Error("Failed to register service worker");
            }

            const subscription = await subscribeToPushNotifications(registration);
            if (!subscription) {
                throw new Error("Failed to subscribe to push notifications");
            }

            await savePushSubscription(subscription);
            // Reload settings to get updated subscription list
            const updatedSettings = await getNotificationSettings();
            setSettings(updatedSettings);
            setIsSubscribed(true);
            // Also enable notifications setting
            await handleUpdateSettings({ enabled: true });
            showToast("Push notifications enabled!", "success");
        } catch (error: any) {
            console.error("Failed to enable push:", error);
            showToast(error.message || "Failed to enable push notifications", "error");
        } finally {
            setSaving(false);
        }
    };

    const handleDisablePush = async () => {
        try {
            setSaving(true);
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            if (subscription) {
                await subscription.unsubscribe();
                await removePushSubscription(subscription.endpoint);
            }
            // Reload settings to get updated subscription list
            const updatedSettings = await getNotificationSettings();
            setSettings(updatedSettings);
            setIsSubscribed(false);
            // Also disable notifications setting
            await handleUpdateSettings({ enabled: false });
            showToast("Push notifications disabled", "success");
        } catch (error: any) {
            console.error("Failed to disable push:", error);
            showToast("Failed to disable push notifications", "error");
        } finally {
            setSaving(false);
        }
    };

    const handleUpdateSettings = async (updates: Partial<NotificationSettings>) => {
        if (!settings) return;

        try {
            setSaving(true);
            const updated = await updateNotificationSettings(updates);
            setSettings(updated);
            showToast("Settings saved", "success");
        } catch (error) {
            console.error("Failed to update settings:", error);
            showToast("Failed to save settings", "error");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="card-surface p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                </div>
            </div>
        );
    }

    if (!settings) {
        return null;
    }

    return (
        <div className="card-surface space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <Bell className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        Notifications
                    </h3>
                </div>
                <button
                    onClick={() => {
                        if (isSubscribed) {
                            handleDisablePush();
                        } else {
                            handleEnablePush();
                        }
                    }}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        isSubscribed
                            ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                            : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                    }`}
                >
                    {isSubscribed ? (
                        <>
                            <Bell className="w-4 h-4 inline mr-2" />
                            On
                        </>
                    ) : (
                        <>
                            <BellOff className="w-4 h-4 inline mr-2" />
                            Off
                        </>
                    )}
                </button>
            </div>

            {!settings.enabled && (
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Notifications are currently disabled. Enable them to receive reminders and updates.
                    </p>
                    <button
                        onClick={async () => {
                            if (isSubscribed) {
                                // Already subscribed, just enable settings
                                await handleUpdateSettings({ enabled: true });
                            } else {
                                // Not subscribed, enable push notifications
                                await handleEnablePush();
                            }
                        }}
                        disabled={saving}
                        className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        <Bell className="w-4 h-4" />
                        Turn On Notifications
                    </button>
                </div>
            )}

            {settings.enabled && (
                <>
                    {/* Push Notifications */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="font-medium text-gray-900 dark:text-gray-100">
                                    Push Notifications
                                </h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Receive notifications even when the app is closed
                                </p>
                                {isSubscribed && (
                                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                        ✓ Push notifications are active
                                    </p>
                                )}
                                {!isSubscribed && permission === "granted" && (
                                    <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                                        Permission granted but not subscribed
                                    </p>
                                )}
                            </div>
                            {isSubscribed ? (
                                <button
                                    onClick={handleDisablePush}
                                    disabled={saving}
                                    className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg font-medium hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50"
                                >
                                    <XCircle className="w-4 h-4 inline mr-2" />
                                    Disable
                                </button>
                            ) : (
                                <button
                                    onClick={handleEnablePush}
                                    disabled={saving || permission === "denied"}
                                    className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <CheckCircle className="w-4 h-4 inline mr-2" />
                                    {permission === "granted" ? "Subscribe" : "Enable"}
                                </button>
                            )}
                        </div>
                        {permission === "denied" && (
                            <p className="text-sm text-red-600 dark:text-red-400">
                                Notifications are blocked. Please enable them in your browser settings.
                            </p>
                        )}
                        {permission === "default" && !isSubscribed && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Click "Enable" to request notification permission and subscribe to push notifications.
                            </p>
                        )}
                        {isSubscribed && (
                            <button
                                onClick={async () => {
                                    try {
                                        setSaving(true);
                                        await sendTestNotification();
                                        showToast("Test notification sent! Check your notifications.", "success");
                                    } catch (error: any) {
                                        console.error("Failed to send test notification:", error);
                                        showToast(error.message || "Failed to send test notification", "error");
                                    } finally {
                                        setSaving(false);
                                    }
                                }}
                                disabled={saving}
                                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                <Bell className="w-4 h-4" />
                                Send Test Notification
                            </button>
                        )}
                    </div>

                    {/* Reminder Settings */}
                    <div className="space-y-4 border-t dark:border-gray-800 pt-4">
                        <h4 className="font-medium text-gray-900 dark:text-gray-100 flex items-center">
                            <Clock className="w-4 h-4 mr-2" />
                            Reminder Settings
                        </h4>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Remind me before scheduled time (minutes)
                            </label>
                            <input
                                type="number"
                                min="0"
                                max="60"
                                value={settings.reminder_minutes_before}
                                onChange={(e) =>
                                    handleUpdateSettings({
                                        reminder_minutes_before: parseInt(e.target.value) || 5,
                                    })
                                }
                                className="w-full px-3 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Remind about missed items after (minutes)
                            </label>
                            <input
                                type="number"
                                min="0"
                                max="120"
                                value={settings.missed_item_delay_minutes}
                                onChange={(e) =>
                                    handleUpdateSettings({
                                        missed_item_delay_minutes: parseInt(e.target.value) || 15,
                                    })
                                }
                                className="w-full px-3 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                            />
                        </div>
                    </div>

                    {/* Quiet Hours */}
                    <div className="space-y-4 border-t dark:border-gray-800 pt-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="font-medium text-gray-900 dark:text-gray-100 flex items-center">
                                    <Moon className="w-4 h-4 mr-2" />
                                    Quiet Hours
                                </h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Don't send notifications during these hours
                                </p>
                            </div>
                            <button
                                onClick={() =>
                                    handleUpdateSettings({
                                        quiet_hours: {
                                            ...settings.quiet_hours,
                                            enabled: !settings.quiet_hours.enabled,
                                        },
                                    })
                                }
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                    settings.quiet_hours.enabled
                                        ? "bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400"
                                        : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                                }`}
                            >
                                {settings.quiet_hours.enabled ? "On" : "Off"}
                            </button>
                        </div>

                        {settings.quiet_hours.enabled && (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Start Time
                                    </label>
                                    <input
                                        type="time"
                                        value={settings.quiet_hours.start}
                                        onChange={(e) =>
                                            handleUpdateSettings({
                                                quiet_hours: {
                                                    ...settings.quiet_hours,
                                                    start: e.target.value,
                                                },
                                            })
                                        }
                                        className="w-full px-3 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        End Time
                                    </label>
                                    <input
                                        type="time"
                                        value={settings.quiet_hours.end}
                                        onChange={(e) =>
                                            handleUpdateSettings({
                                                quiet_hours: {
                                                    ...settings.quiet_hours,
                                                    end: e.target.value,
                                                },
                                            })
                                        }
                                        className="w-full px-3 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Notification Types */}
                    <div className="space-y-3 border-t dark:border-gray-800 pt-4">
                        <h4 className="font-medium text-gray-900 dark:text-gray-100">
                            Notification Types
                        </h4>

                        {Object.entries(settings.notification_types).map(([key, value]) => (
                            <label
                                key={key}
                                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                                <span className="text-sm text-gray-900 dark:text-gray-100 capitalize">
                                    {key.replace(/_/g, " ")}
                                </span>
                                <input
                                    type="checkbox"
                                    checked={value}
                                    onChange={(e) =>
                                        handleUpdateSettings({
                                            notification_types: {
                                                ...settings.notification_types,
                                                [key]: e.target.checked,
                                            },
                                        })
                                    }
                                    className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                                />
                            </label>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

