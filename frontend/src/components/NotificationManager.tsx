"use client";

import { useEffect, useState, useCallback } from "react";
import {
    requestNotificationPermission,
    registerServiceWorker,
    subscribeToPushNotifications,
    savePushSubscription,
    startNotificationChecker,
    getNotificationSettings,
} from "@/utils/notifications";

export function NotificationManager() {
    const [permission, setPermission] = useState<NotificationPermission>("default");
    const [isRegistered, setIsRegistered] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Check current permission status
        if ("Notification" in window) {
            setPermission(Notification.permission);
        }

        // Register service worker
        registerServiceWorker()
            .then((registration) => {
                if (registration) {
                    setIsRegistered(true);
                    // Check if already subscribed
                    registration.pushManager
                        .getSubscription()
                        .then((subscription) => {
                            setIsSubscribed(!!subscription);
                        })
                        .catch((err) => {
                            console.error("Error checking subscription:", err);
                        });
                }
            })
            .catch((err) => {
                console.error("Service Worker registration failed:", err);
                setError("Failed to register service worker");
            });
    }, []);

    const handleEnableNotifications = useCallback(async () => {
        try {
            setError(null);

            // Request permission
            const newPermission = await requestNotificationPermission();
            setPermission(newPermission);

            if (newPermission !== "granted") {
                setError("Notification permission denied. Please enable it in your browser settings.");
                return;
            }

            // Register service worker if not already registered
            let registration = await navigator.serviceWorker.ready;
            if (!isRegistered) {
                registration = (await registerServiceWorker()) || registration;
                if (!registration) {
                    throw new Error("Failed to register service worker");
                }
                setIsRegistered(true);
            }

            // Subscribe to push notifications
            const subscription = await subscribeToPushNotifications(registration);
            if (!subscription) {
                throw new Error("Failed to subscribe to push notifications");
            }

            // Save subscription to backend
            await savePushSubscription(subscription);
            setIsSubscribed(true);

            // Start checking for notifications
            startNotificationChecker((notifications) => {
                notifications.forEach((notification) => {
                    if (permission === "granted") {
                        new Notification(notification.title, {
                            body: notification.body,
                            icon: "/icon.svg",
                            badge: "/icon.svg",
                            tag: notification.type,
                            data: notification.data,
                        });
                    }
                });
            }, 5); // Check every 5 minutes
        } catch (err: any) {
            console.error("Error enabling notifications:", err);
            setError(err.message || "Failed to enable notifications");
        }
    }, [isRegistered, permission]);

    // Auto-enable if permission is already granted
    useEffect(() => {
        if (permission === "granted" && isRegistered && !isSubscribed) {
            handleEnableNotifications();
        }
    }, [permission, isRegistered, isSubscribed, handleEnableNotifications]);

    // Don't render anything - this is a background manager
    return null;
}

