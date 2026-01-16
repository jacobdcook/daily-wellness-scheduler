"use client";

import { useEffect, useState, useRef } from "react";
import { getSchedule, defaultSettings, loadSettings, saveSettings, loadProgress, saveProgress, checkMissedItems, checkUpcomingSupplements, regenerateSchedule, updateItem, deleteItem, getStats, getInsights, getFriends } from "@/utils/api";
import { Schedule, ScheduledItem, UserSettings } from "@/types";
import { ScheduleCard, ItemState } from "@/components/ScheduleCard";
import { SettingsPanel } from "@/components/SettingsPanel";
import { EditItemModal } from "@/components/EditItemModal";
import { KnowledgeModal } from "@/components/KnowledgeModal";
import { InventoryView } from "@/components/InventoryView";
import { TravelPlannerModal } from "@/components/TravelPlannerModal";
import { DailyCheckIn } from "@/components/DailyCheckIn";
import { InsightsPanel } from "@/components/InsightsPanel";
import { RescheduleModal } from "@/components/RescheduleModal";
import { FastingAdjustment } from "@/components/FastingAdjustment";
import { ChatInterface } from "@/components/ChatInterface";
import { WeekView } from "@/components/WeekView";
import { SixWeekView } from "@/components/SixWeekView";
import { StatsPanel } from "@/components/StatsPanel";
import { BottomNav } from "@/components/BottomNav";
import { useRouter } from "next/navigation";
import { PwaInstallPrompt } from "@/components/PwaInstallPrompt";
import { format, isSameDay, addDays, subDays } from "date-fns";
import { Calendar as CalendarIcon, Droplets, Sun, ChevronLeft, ChevronRight, AlertCircle, LogOut, Plus, Users, Pill, Calendar, Sparkles } from "lucide-react";
import { clsx } from "clsx";

import { CustomScheduleModal } from "@/components/CustomScheduleModal";
import { TaskTemplateModal } from "@/components/TaskTemplateModal";
import { OnboardingFlow } from "@/components/OnboardingFlow";
import { PullToRefresh } from "@/components/PullToRefresh";
import { useToast } from "@/context/ToastContext";
import { motion, AnimatePresence } from "framer-motion";
import { useSession, signOut } from "next-auth/react";
import { InteractionWarnings } from "@/components/InteractionWarnings";
import { NotificationManager } from "@/components/NotificationManager";

const CHAT_EVENT = "wellness-chat-open";
const SCHEDULE_REFRESH_EVENT = "wellness-schedule-refresh";

type Tab = "schedule" | "progress" | "inventory" | "settings" | "wellness" | "tasks" | "insights" | "profile";

export default function Home() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const { showToast } = useToast();
    const [schedule, setSchedule] = useState<Schedule | null>(null);
    const [loading, setLoading] = useState(true);
    const [checkingUsername, setCheckingUsername] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [settings, setSettings] = useState<UserSettings>(defaultSettings);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [knowledgeItem, setKnowledgeItem] = useState<string | null>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isCustomScheduleOpen, setIsCustomScheduleOpen] = useState(false);
    const [isTaskTemplateOpen, setIsTaskTemplateOpen] = useState(false);
    const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
    const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
    const [isTravelPlannerOpen, setIsTravelPlannerOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<ScheduledItem | null>(null);
    const [reschedulingItem, setReschedulingItem] = useState<ScheduledItem | null>(null);
    const [progress, setProgress] = useState<Record<string, Record<string, any>>>({});
    const [view, setView] = useState<"today" | "week" | "six-week">("today");
    const [activeTab, setActiveTab] = useState<Tab>("schedule");
    const [stats, setStats] = useState<any>(null);
    const [insights, setInsights] = useState<any>(null);
    const [lastAiAction, setLastAiAction] = useState<{ summary: string; timestamp: string } | null>(null);
    const notifiedItemsRef = useRef<Set<string>>(new Set());
    const hasCheckedMissedRef = useRef(false);
    const addButtonRef = useRef<HTMLButtonElement | null>(null);
    const [tutorialPos, setTutorialPos] = useState<{ top: number; left: number } | null>(null);
    const [pendingFriendRequests, setPendingFriendRequests] = useState(0);
    
    const mode = (settings.electrolyte_intensity as "light" | "sweaty") || "light";

    // Safety timeout to prevent infinite loading
    useEffect(() => {
        const safetyTimeout = setTimeout(() => {
            console.warn("Safety timeout: allowing access after 5 seconds");
            setCheckingUsername(false);
        }, 5000); // 5 second absolute maximum

        return () => clearTimeout(safetyTimeout);
    }, []);

    // Check if user needs to set username (for OAuth users only)
    useEffect(() => {
        async function checkUsername() {
            // Wait for session to load
            if (status === "loading") {
                // Keep checkingUsername as true while loading
                return;
            }
            
            // If not authenticated, don't check username - allow access
            if (status !== "authenticated" || !session?.user?.id) {
                console.log("Not authenticated, skipping username check");
                setCheckingUsername(false);
                return;
            }

            // For email/password signups, username is set during signup, so skip the check
            // Only check for OAuth users (they sign in with Google, etc.)
            // @ts-ignore
            const isOAuth = session.user?.isOAuth === true; // Explicitly check for true
            
            console.log("Session loaded:", { 
                userId: session.user.id, 
                isOAuth, 
                email: session.user.email,
                // @ts-ignore
                rawIsOAuth: session.user?.isOAuth
            });
            
            // If not OAuth (or isOAuth is undefined/false), skip the check
            // Email/password users have username set during signup
            if (!isOAuth) {
                console.log("Email/password user (or isOAuth not set), skipping username check");
                setCheckingUsername(false);
                return;
            }

            // For OAuth users, check if they have a username
            // Set a timeout to prevent infinite loading
            let timeoutId: NodeJS.Timeout | null = setTimeout(() => {
                console.warn("Username check timed out, allowing access");
                setCheckingUsername(false);
                timeoutId = null;
            }, 3000); // 3 second timeout

            try {
                console.log("Checking username for OAuth user:", session.user.id);
                const res = await fetch(`/backend/username/has/${encodeURIComponent(session.user.id)}`, {
                    headers: {
                        "x-user-id": session.user.id, // FastAPI expects lowercase with hyphens
                    },
                });
                
                if (timeoutId) {
                    clearTimeout(timeoutId);
                    timeoutId = null;
                }
                
                if (res.ok) {
                    const data = await res.json();
                    console.log("Username check result:", data);
                    // For OAuth users, if has_username is false, redirect to setup
                    if (!data.has_username) {
                        console.log("OAuth user has no username, redirecting to setup");
                        router.push("/setup-username");
                        return;
                    }
                } else {
                    // If check fails (e.g., 403, 404), assume user has username (don't block access)
                    console.warn("Username check failed with status:", res.status, "- allowing access");
                }
            } catch (error) {
                // Network error or other exception - don't block user
                console.warn("Username check error, allowing access:", error);
            } finally {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }
                setCheckingUsername(false);
            }
        }
        
        checkUsername();
    }, [status, session?.user?.id, session?.user?.isOAuth, router]);

    // Load settings and progress on mount
    useEffect(() => {
        async function initData() {
            try {
                const [loadedSettings, loadedProgress, friendsData] = await Promise.all([
                    loadSettings(),
                    loadProgress(),
                    getFriends().catch(() => ({ pending_received: [] })) // Silently fail if not available
                ]);
                setSettings(loadedSettings);
                setProgress(loadedProgress);
                setPendingFriendRequests(friendsData.pending_received?.length || 0);
            } catch (error) {
                console.error("Failed to load data", error);
            }
        }
        initData();
    }, []);

    // Check for friend requests periodically
    useEffect(() => {
        const checkFriendRequests = async () => {
            try {
                const friendsData = await getFriends();
                setPendingFriendRequests(friendsData.pending_received?.length || 0);
            } catch (error) {
                // Silently fail
            }
        };
        
        checkFriendRequests();
        const interval = setInterval(checkFriendRequests, 30000); // Check every 30 seconds
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        async function loadSchedule() {
            setLoading(true);
            try {
                const data = await getSchedule();
                setSchedule(data);
            } catch (error) {
                console.error("Failed to load schedule", error);
            } finally {
                setLoading(false);
            }
        }
        loadSchedule();
    }, []); 

    // Clean up stale progress entries whenever schedule changes
    useEffect(() => {
        if (!schedule || Object.keys(schedule).length === 0) return;
        
        const cleanupProgress = async () => {
            const cleanedProgress = { ...progress };
            let hasChanges = false;
            
            for (const dateKey in cleanedProgress) {
                if (dateKey === "_meta") continue;
                const daySchedule = schedule[dateKey] || [];
                const validItemIds = new Set(daySchedule.map(item => item.id || `${item.item?.name}_${item.scheduled_time}`));
                const dayProgress = cleanedProgress[dateKey] || {};
                const cleanedDayProgress: Record<string, any> = { ...dayProgress };
                
                // Remove progress entries for items not in schedule
                for (const itemId in cleanedDayProgress) {
                    if (itemId === "_meta") continue;
                    if (!validItemIds.has(itemId)) {
                        delete cleanedDayProgress[itemId];
                        hasChanges = true;
                    }
                }
                
                // Only keep day if it has valid entries or metadata
                if (Object.keys(cleanedDayProgress).length > 0) {
                    cleanedProgress[dateKey] = cleanedDayProgress;
                } else if (cleanedProgress[dateKey]) {
                    delete cleanedProgress[dateKey];
                    hasChanges = true;
                }
            }
            
            if (hasChanges) {
                setProgress(cleanedProgress);
                try {
                    await saveProgress(cleanedProgress);
                } catch (e) {
                    console.error("Failed to save cleaned progress", e);
                }
            }
        };
        
        cleanupProgress();
    }, [schedule]); // Run whenever schedule changes

    // Load stats when schedule or progress changes
    useEffect(() => {
        async function loadStats() {
            if (schedule && Object.keys(schedule).length > 0) {
                try {
                    const statsData = await getStats();
                    setStats(statsData);
                    const insightsData = await getInsights();
                    setInsights(insightsData);
                } catch (error) {
                    console.error("Failed to load stats", error);
                }
            }
        }
        loadStats();
    }, [schedule, progress]);

    const handleRegenerate = async () => {
        if (!confirm("This will overwrite your current schedule with a new one based on your settings. Any manual edits will be lost. Continue?")) {
            return;
        }
        setProcessing(true);
        try {
            const data = await regenerateSchedule(settings);
            
            // Reload schedule from server to ensure we have the latest data
            // This ensures we get the correct count and any server-side filtering is applied
            const refreshedSchedule = await getSchedule();
            setSchedule(refreshedSchedule);
            
            // Also reload progress to ensure it's in sync
            const refreshedProgress = await loadProgress();
            setProgress(refreshedProgress);
            
            // Display warnings if any
            if (data.warnings && data.warnings.length > 0) {
                const warningCount = data.warnings.length;
                const errorCount = data.warnings.filter(w => w.severity === "error").length;
                if (errorCount > 0) {
                    showToast(`${errorCount} supplement(s) could not be scheduled. Check console for details.`, "error");
                } else {
                    showToast(`${warningCount} scheduling warning(s). Check console for details.`, "warning");
                }
                console.warn("Schedule generation warnings:", data.warnings);
            } else {
                showToast("Schedule regenerated successfully!", "success");
            }
        } catch (error) {
            console.error("Failed to regenerate schedule", error);
            showToast("Failed to regenerate schedule. Please try again.", "error");
        } finally {
            setProcessing(false);
        }
    };

    // Check for missed items once on initial schedule load
    useEffect(() => {
        if (schedule && Object.keys(schedule).length > 0 && !hasCheckedMissedRef.current) {
            hasCheckedMissedRef.current = true;
            checkMissedItems(schedule, progress).then((result: { status: string; count?: number }) => {
                if (result.status === "sent") {
                    console.log(`Sent notifications for ${result.count} missed items`);
                }
            });
        }
    }, [schedule, progress]);

    // Store progress in a ref so the interval always has the latest value
    const progressRef = useRef(progress);
    useEffect(() => {
        progressRef.current = progress;
    }, [progress]);

    // Check for upcoming supplements every minute
    useEffect(() => {
        if (!schedule || Object.keys(schedule).length === 0) return;

        const checkUpcoming = () => {
            checkUpcomingSupplements(schedule, progressRef.current, notifiedItemsRef.current).then((result: { status: string; notified_items: string[]; sent_count?: number }) => {
                if (result.status === "checked" && result.notified_items) {
                    notifiedItemsRef.current = new Set(result.notified_items);
                    if (result.sent_count && result.sent_count > 0) {
                        console.log(`Sent ${result.sent_count} upcoming supplement notifications`);
                    }
                }
            });
        };

        checkUpcoming();
        const interval = setInterval(checkUpcoming, 60000);
        return () => clearInterval(interval);
    }, [schedule]);

    // Listen for schedule refresh events
    useEffect(() => {
        const handleRefreshEvent = (event: Event) => {
            const detail = (event as CustomEvent<{ source?: string; prompt?: string }>).detail;
            if (detail?.source === "ai") {
                setLastAiAction({
                    summary: detail.prompt || "AI adjusted your plan",
                    timestamp: new Date().toISOString()
                });
            }
            handleRefresh();
        };
        
        window.addEventListener(SCHEDULE_REFRESH_EVENT, handleRefreshEvent as EventListener);
        return () => {
            window.removeEventListener(SCHEDULE_REFRESH_EVENT, handleRefreshEvent as EventListener);
        };
    }, []);

    const handleSettingsSave = async (newSettings: UserSettings, shouldRegenerate: boolean = false) => {
        const oldOptionalItems = settings.optional_items || {};
        const newOptionalItems = newSettings.optional_items || {};
        
        const optionalItemsChanged = JSON.stringify(oldOptionalItems) !== JSON.stringify(newOptionalItems);
        const scheduleAffectingSettings = [
            'workout_days', 'breakfast_mode', 'lunch_mode', 'dinner_mode',
            'fasting', 'fasting_level', 'feeding_window', 'electrolyte_intensity',
            'wake_time', 'bedtime', 'dinner_time', 'study_start', 'study_end'
        ];
        
        // Check if any schedule-affecting settings changed
        const scheduleAffectingChanged = scheduleAffectingSettings.some(key => {
            const oldVal = (settings as any)[key];
            const newVal = (newSettings as any)[key];
            return JSON.stringify(oldVal) !== JSON.stringify(newVal);
        });
        
        setSettings(newSettings);
        setIsSettingsOpen(false);
        setProcessing(true);
        try {
            await saveSettings(newSettings);
            
            // Regenerate if explicitly requested OR if optional items or schedule-affecting settings changed
            if (shouldRegenerate || optionalItemsChanged || scheduleAffectingChanged) {
                try {
                    showToast("Regenerating schedule...", "info");
                    const regeneratedData = await regenerateSchedule(newSettings);
                    setSchedule(regeneratedData.schedule);
                    const updatedProgress = await loadProgress();
                    setProgress(updatedProgress);
                    
                    // Display warnings if any
                    if (regeneratedData.warnings && regeneratedData.warnings.length > 0) {
                        const warningCount = regeneratedData.warnings.length;
                        const errorCount = regeneratedData.warnings.filter(w => w.severity === "error").length;
                        if (errorCount > 0) {
                            showToast(`${errorCount} supplement(s) could not be scheduled. Check console for details.`, "error");
                        } else {
                            showToast(`Schedule updated with ${warningCount} warning(s). Check console for details.`, "warning");
                        }
                        console.warn("Schedule generation warnings:", regeneratedData.warnings);
                    } else {
                        showToast("Schedule updated successfully!", "success");
                    }
                } catch (error) {
                    console.error("Auto-regeneration failed", error);
                    showToast("Failed to regenerate schedule", "error");
                }
            } else {
                showToast("Settings saved", "success");
            }
        } catch (error) {
            console.error("Failed to save settings", error);
            showToast("Failed to save settings", "error");
        } finally {
            setProcessing(false);
        }
    };

    const handleProgressChange = async (itemId: string, newState: ItemState) => {
        const todayKey = format(selectedDate, "yyyy-MM-dd");
        const stateValue = newState === "pending" ? 0 : newState === "in_progress" ? 1 : 2;
        
        // Get current schedule items for today to validate itemId exists
        const todayItems = schedule?.[todayKey] || [];
        const validItemIds = new Set(todayItems.map(item => item.id || `${item.item?.name}_${item.scheduled_time}`));
        
        // Only update progress if item exists in schedule
        if (!validItemIds.has(itemId)) {
            console.warn(`Item ${itemId} not found in schedule, skipping progress update`);
            return;
        }
        
        const newProgress = {
            ...progress,
            [todayKey]: {
                ...(progress[todayKey] || {}),
                [itemId]: stateValue
            }
        };
        
        setProgress(newProgress);
        try {
            await saveProgress(newProgress);
        } catch (error) {
            console.error("Failed to save progress", error);
            showToast("Failed to save progress", "error");
        }
    };

    const handleCheckInSave = async (ratings: { energy: number; mood: number; sleep: number }) => {
        const todayKey = format(selectedDate, "yyyy-MM-dd");
        const newProgress = {
            ...progress,
            [todayKey]: {
                ...(progress[todayKey] || {}),
                _meta: ratings
            }
        };
        setProgress(newProgress);
        try {
            await saveProgress(newProgress);
            showToast("Check-in saved");
        } catch (error) {
            console.error("Failed to save check-in", error);
            showToast("Failed to save check-in", "error");
        }
    };

    const handleItemUpdate = async (itemId: string, updates: any) => {
        const dateKey = format(selectedDate, "yyyy-MM-dd");
        try {
            const newSchedule = await updateItem(dateKey, itemId, updates);
            setSchedule(newSchedule);
            showToast("Item updated");
        } catch (error) {
            console.error("Failed to update item", error);
            showToast("Failed to update item", "error");
        }
    };

    const handleItemDelete = async (itemId: string) => {
        const dateKey = format(selectedDate, "yyyy-MM-dd");
        try {
            const newSchedule = await deleteItem(dateKey, itemId);
            setSchedule(newSchedule);
            showToast("Item deleted");
        } catch (error) {
            console.error("Failed to delete item", error);
            showToast("Failed to delete item", "error");
        }
    };

    const handleReschedule = async () => {
        if (schedule) {
            try {
                const data = await getSchedule();
                setSchedule(data);
            } catch (error) {
                console.error("Failed to reload schedule", error);
            }
        }
    };

    const handleScheduleUpdate = async () => {
        try {
            const updatedSchedule = await getSchedule();
            setSchedule(updatedSchedule);
        } catch (error) {
            console.error("Failed to reload schedule", error);
        }
    };

    const todayStr = format(selectedDate, "yyyy-MM-dd");
    const daysItems = schedule ? schedule[todayStr] || [] : [];
    const sortedItems = [...daysItems].sort((a, b) =>
        new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime()
    );

    const totalItems = sortedItems.length;
    const todayProgress = progress[todayStr] || {};
    
    // Only count progress for items that actually exist in the current schedule
    // This prevents counting completed items that were removed from the schedule
    const validItemIds = new Set(sortedItems.map(item => item.id || `${item.item?.name}_${item.scheduled_time}`));
    const completedCount = Object.entries(todayProgress)
        .filter(([itemId, status]) => {
            // Skip metadata entries
            if (itemId === "_meta") return false;
            // Only count if item exists in schedule and is completed
            return validItemIds.has(itemId) && status === 2;
        }).length;
    
    // Cap percentage at 100% to prevent showing >100%
    const percentComplete = totalItems > 0 ? Math.min(100, Math.round((completedCount / totalItems) * 100)) : 0;

    const handleRefresh = async () => {
        try {
            const [updatedSettings, updatedProgress, updatedSchedule] = await Promise.all([
                loadSettings(),
                loadProgress(),
                getSchedule()
            ]);
            setSettings(updatedSettings);
            setProgress(updatedProgress);
            setSchedule(updatedSchedule);
            
            if (updatedSchedule && Object.keys(updatedSchedule).length > 0) {
                 checkMissedItems(updatedSchedule, updatedProgress);
            }
        } catch (e) {
            console.error("Refresh failed", e);
        }
    };

    const shouldShowOnboarding = !loading && sortedItems.length === 0 && view === "today" && isSameDay(selectedDate, new Date()) && !isCustomScheduleOpen && !isSettingsOpen && activeTab === "schedule";

    const openChatWithPrompt = (prompt: string, autoSend = false) => {
        window.dispatchEvent(new CustomEvent(CHAT_EVENT, { detail: { message: prompt, autoSend } }));
    };

    useEffect(() => {
        if (!shouldShowOnboarding) {
            setTutorialPos(null);
            return;
        }

        const updatePosition = () => {
            if (addButtonRef.current) {
                const rect = addButtonRef.current.getBoundingClientRect();
                setTutorialPos({
                    top: rect.bottom + 12,
                    left: rect.left + rect.width / 2
                });
            }
        };

        updatePosition();
        window.addEventListener("resize", updatePosition);
        window.addEventListener("scroll", updatePosition, { passive: true });

        return () => {
            window.removeEventListener("resize", updatePosition);
            window.removeEventListener("scroll", updatePosition);
        };
    }, [shouldShowOnboarding]);

    // Show loading while checking username (must be after all hooks)
    if (checkingUsername) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Loading...</p>
                </div>
            </div>
        );
    }

    const handleTabChange = (tab: Tab) => {
        // Prevent access to inventory if supplements are disabled
        if (tab === "inventory" && !(settings.enable_supplements ?? false)) {
            showToast("Inventory is only available when supplements are enabled. Enable supplements in settings.", "info");
            return;
        }
        
        if (tab === "settings") {
            setIsSettingsOpen(true);
        } else if (tab === "wellness") {
            router.push("/wellness");
        } else if (tab === "tasks") {
            router.push("/tasks");
        } else if (tab === "insights") {
            router.push("/insights");
        } else if (tab === "profile") {
            router.push("/profile");
        } else {
            setActiveTab(tab);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-gray-100 font-sans">
            {/* Phase 29: Notification Manager (background service) */}
            <NotificationManager />
            
            {/* Friend Request Notification Banner */}
            {pendingFriendRequests > 0 && (
                <div className="fixed top-0 left-0 right-0 z-[60] bg-primary-600 text-white px-4 py-3 shadow-lg">
                    <div className="max-w-3xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Users size={18} />
                            <span className="font-medium">
                                You have {pendingFriendRequests} pending friend request{pendingFriendRequests > 1 ? 's' : ''}
                            </span>
                        </div>
                        <button
                            onClick={() => router.push("/social")}
                            className="px-4 py-1.5 bg-white text-primary-600 rounded-lg font-medium hover:bg-gray-100 transition-colors text-sm"
                        >
                            View
                        </button>
                    </div>
                </div>
            )}

            {/* Header */}
            <header className={clsx(
                "bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b dark:border-gray-800 fixed left-0 right-0 z-50 transition-all",
                pendingFriendRequests > 0 ? "top-12" : "top-0"
            )}>
                <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold">
                            W
                        </div>
                        <h1 className="font-bold text-xl tracking-tight">Wellness Scheduler</h1>
                    </div>

                    <div className="flex items-center space-x-2">
                        {/* Light/Sweaty Day Toggle - Only show if supplements are enabled */}
                        {(settings.enable_supplements ?? false) && (
                            <button
                                onClick={async () => {
                                    const newMode = mode === "light" ? "sweaty" : "light";
                                    const updatedSettings = { ...settings, electrolyte_intensity: newMode };
                                    setProcessing(true);
                                    try {
                                        await saveSettings(updatedSettings);
                                        setSettings(updatedSettings);
                                        const regeneratedData = await regenerateSchedule(updatedSettings);
                                        const regeneratedSchedule = regeneratedData.schedule;
                                        
                                        // Display warnings if any
                                        if (regeneratedData.warnings && regeneratedData.warnings.length > 0) {
                                            const warningCount = regeneratedData.warnings.length;
                                            const errorCount = regeneratedData.warnings.filter(w => w.severity === "error").length;
                                            if (errorCount > 0) {
                                                showToast(`${errorCount} supplement(s) could not be scheduled. Check console for details.`, "error");
                                            } else {
                                                showToast(`Schedule updated with ${warningCount} warning(s). Check console for details.`, "warning");
                                            }
                                            console.warn("Schedule generation warnings:", regeneratedData.warnings);
                                        }
                                        setSchedule(regeneratedSchedule);
                                        const updatedProgress = await loadProgress();
                                        setProgress(updatedProgress);
                                        showToast(`Switched to ${newMode === "sweaty" ? "Sweaty" : "Light"} Day`, "success");
                                    } catch (error) {
                                        console.error("Failed to toggle day type", error);
                                        showToast("Failed to switch day type", "error");
                                    } finally {
                                        setProcessing(false);
                                    }
                                }}
                                className={clsx(
                                    "px-3 py-1.5 rounded-full text-sm font-medium flex items-center transition-colors",
                                    mode === "sweaty"
                                        ? "bg-orange-100 text-orange-700 hover:bg-orange-200"
                                        : "bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 hover:bg-primary-100"
                                )}
                                disabled={processing}
                            >
                                {mode === "sweaty" ? <Droplets size={16} className="mr-1.5" /> : <Sun size={16} className="mr-1.5" />}
                                {mode === "sweaty" ? "Sweaty Day" : "Light Day"}
                            </button>
                        )}
                        
                        <button
                            ref={addButtonRef}
                            type="button"
                            onClick={() => setIsCustomScheduleOpen(true)}
                            className="p-2 text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 rounded-full transition-colors relative z-20 border border-primary-200"
                            aria-label="Add item"
                        >
                            <Plus size={20} />
                        </button>

                        <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={async (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                try {
                                    await signOut({ callbackUrl: "/login" });
                                } catch (error) {
                                    console.error('Logout failed:', error);
                                    // Force redirect as fallback
                                    window.location.href = '/login';
                                }
                            }}
                            onTouchStart={(e) => e.preventDefault()}
                            className="p-2 text-gray-500 hover:bg-red-50 hover:text-red-600 rounded-full transition-colors relative z-20"
                            aria-label="Log out"
                        >
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>
            </header>

            <PullToRefresh onRefresh={handleRefresh}>
                <div className={clsx("pb-24 transition-all", pendingFriendRequests > 0 ? "pt-28" : "pt-16")}>
                    <main className="max-w-3xl mx-auto px-4 py-8">
                        <AnimatePresence mode="wait">
                            
                            {/* SCHEDULE TAB */}
                            {activeTab === "schedule" && (
                                <motion.div
                                    key="schedule"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    {/* Date Nav */}
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                                        <div className="flex items-center justify-between bg-white dark:bg-gray-900 rounded-xl p-1 border dark:border-gray-800 shadow-sm">
                                            <button onClick={() => setSelectedDate(subDays(selectedDate, 1))} className="p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-400">
                                                <ChevronLeft size={20} />
                                            </button>
                                            <div className="flex items-center px-4 font-medium text-gray-900 dark:text-gray-100">
                                                <CalendarIcon size={18} className="mr-2 text-primary-600 dark:text-primary-400" />
                                                {format(selectedDate, "MMM do")}
                                            </div>
                                            <button onClick={() => setSelectedDate(addDays(selectedDate, 1))} className="p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-400">
                                                <ChevronRight size={20} />
                                            </button>
                                        </div>
                                        <div className="flex bg-gray-100 p-1 rounded-xl">
                                            {["today", "week", "six-week"].map((v) => (
                                                <button
                                                    key={v}
                                                    onClick={() => setView(v as any)}
                                                    className={clsx(
                                                        "px-4 py-1.5 text-sm font-medium rounded-lg transition-all capitalize",
                                                        view === v ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                                                    )}
                                                >
                                                    {v.replace("-", " ")}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {view === "today" && (
                                        <>
                                            <FastingAdjustment settings={settings} />
                                            
                                            {/* Phase 26: Interaction Warnings */}
                                            <div className="mb-4">
                                                <InteractionWarnings date={format(selectedDate, "yyyy-MM-dd")} />
                                            </div>
                                            
                                            {isSameDay(selectedDate, new Date()) && (
                                                <DailyCheckIn 
                                                    date={format(selectedDate, "yyyy-MM-dd")}
                                                    initialData={progress[format(selectedDate, "yyyy-MM-dd")]?._meta}
                                                    onSave={handleCheckInSave}
                                                />
                                            )}

                                            <div className="mb-6 mt-6 flex items-center justify-between">
                                                <div>
                                                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{format(selectedDate, "EEEE, MMMM do")}</h2>
                                                    <p className="text-gray-500 dark:text-gray-400">{sortedItems.length} {sortedItems.length === 1 ? 'item' : 'items'} scheduled for today</p>
                                                </div>
                                                <button
                                                    onClick={() => setIsTaskTemplateOpen(true)}
                                                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2 text-sm font-medium"
                                                >
                                                    <Sparkles size={16} />
                                                    Templates
                                                </button>
                                            </div>
                                            {sortedItems.length > 0 && (
                                                    <div className="mt-4">
                                                        <div className="flex justify-between text-sm text-gray-600 mb-1">
                                                            <span>Progress</span>
                                                            <span>{percentComplete}% ({completedCount}/{totalItems})</span>
                                                        </div>
                                                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                                                            <div className="bg-green-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${percentComplete}%` }}></div>
                                                        </div>
                                                    </div>
                                                )}

                                            {loading ? (
                                                <div className="space-y-4">
                                                    {[1, 2, 3].map((i) => (<div key={i} className="h-24 bg-white rounded-xl animate-pulse" />))}
                                                </div>
                                            ) : (
                                                <div className="space-y-6">
                                                    {/* Split items into general tasks and supplements */}
                                                    {(() => {
                                                        const generalItems = sortedItems.filter(item => {
                                                            const itemType = item.item_type || "supplement";
                                                            return itemType !== "supplement";
                                                        });
                                                        const supplementItems = sortedItems.filter(item => {
                                                            const itemType = item.item_type || "supplement";
                                                            return itemType === "supplement";
                                                        });
                                                        const enableSupplements = settings.enable_supplements ?? false;
                                                        
                                                        return (
                                                            <>
                                                                {/* Daily Schedule Section */}
                                                                {generalItems.length > 0 && (
                                                                    <div className="space-y-3">
                                                                        <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                                                                            <Calendar className="text-green-600 dark:text-green-400" size={18} />
                                                                            <h3 className="font-semibold text-gray-900 dark:text-white">Daily Schedule</h3>
                                                                            <span className="ml-auto text-sm text-gray-500 dark:text-gray-400">
                                                                                {generalItems.length} {generalItems.length === 1 ? 'item' : 'items'}
                                                                            </span>
                                                                        </div>
                                                                        <div className="space-y-3">
                                                                            {generalItems.map((item, index) => {
                                                                                const itemKey = item.id || `${item.item?.name || 'item'}-${index}`;
                                                                                const todayKey = format(selectedDate, "yyyy-MM-dd");
                                                                                const stateValue = (progress[todayKey] || {})[itemKey] || 0;
                                                                                const state: ItemState = stateValue === 0 ? "pending" : stateValue === 1 ? "in_progress" : "completed";
                                                                                const itemTime = new Date(item.scheduled_time);
                                                                                const now = new Date();
                                                                                const isMissed = isSameDay(selectedDate, now) && itemTime < now && state !== "completed";
                                                                                
                                                                                return (
                                                                                    <ScheduleCard 
                                                                                        key={itemKey} 
                                                                                        item={item} 
                                                                                        state={state}
                                                                                        onStateChange={(newState) => handleProgressChange(itemKey, newState)}
                                                                                        onEdit={() => setEditingItem(item)}
                                                                                        onReschedule={() => setReschedulingItem(item)}
                                                                                        isMissed={isMissed}
                                                                                        fastingEnabled={settings.fasting === "yes"}
                                                                                        fastingLevel={settings.fasting_level}
                                                                                    />
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                
                                                                {/* Supplements Section - Only show if enabled */}
                                                                {enableSupplements && (
                                                                    <motion.div
                                                                        initial={{ opacity: 0, height: 0 }}
                                                                        animate={{ opacity: 1, height: "auto" }}
                                                                        exit={{ opacity: 0, height: 0 }}
                                                                        transition={{ duration: 0.3, ease: "easeInOut" }}
                                                                        className="space-y-3"
                                                                    >
                                                                        {supplementItems.length > 0 && (
                                                                            <>
                                                                                <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                                                                                    <Pill className="text-purple-600 dark:text-purple-400" size={18} />
                                                                                    <h3 className="font-semibold text-gray-900 dark:text-white">Supplements</h3>
                                                                                    <span className="ml-auto text-sm text-gray-500 dark:text-gray-400">
                                                                                        {supplementItems.length} {supplementItems.length === 1 ? 'supplement' : 'supplements'}
                                                                                    </span>
                                                                                </div>
                                                                                <div className="space-y-3">
                                                                                    {supplementItems.map((item, index) => {
                                                                                        const itemKey = item.id || `${item.item?.name || 'item'}-${index}`;
                                                                                        const todayKey = format(selectedDate, "yyyy-MM-dd");
                                                                                        const stateValue = (progress[todayKey] || {})[itemKey] || 0;
                                                                                        const state: ItemState = stateValue === 0 ? "pending" : stateValue === 1 ? "in_progress" : "completed";
                                                                                        const itemTime = new Date(item.scheduled_time);
                                                                                        const now = new Date();
                                                                                        const isMissed = isSameDay(selectedDate, now) && itemTime < now && state !== "completed";
                                                                                        
                                                                                        return (
                                                                                            <ScheduleCard 
                                                                                                key={itemKey} 
                                                                                                item={item} 
                                                                                                state={state}
                                                                                                onStateChange={(newState) => handleProgressChange(itemKey, newState)}
                                                                                                onEdit={() => setEditingItem(item)}
                                                                                                onReschedule={() => setReschedulingItem(item)}
                                                                                                isMissed={isMissed}
                                                                                                fastingEnabled={settings.fasting === "yes"}
                                                                                                fastingLevel={settings.fasting_level}
                                                                                            />
                                                                                        );
                                                                                    })}
                                                                                </div>
                                                                            </>
                                                                        )}
                                                                    </motion.div>
                                                                )}
                                                                
                                                                {/* Enhanced Empty State */}
                                                                {generalItems.length === 0 && (!enableSupplements || supplementItems.length === 0) && (
                                                                    <motion.div
                                                                        initial={{ opacity: 0, y: 20 }}
                                                                        animate={{ opacity: 1, y: 0 }}
                                                                        className="text-center py-16 px-4 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700"
                                                                    >
                                                                        <div className="max-w-md mx-auto space-y-4">
                                                                            <div className="text-6xl mb-4">📅</div>
                                                                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                                                                                {enableSupplements 
                                                                                    ? "Your schedule is empty"
                                                                                    : "Ready to build your schedule?"
                                                                                }
                                                                            </h3>
                                                                            <p className="text-gray-600 dark:text-gray-400 mb-6">
                                                                                {enableSupplements
                                                                                    ? "Add items to your schedule to get started. You can add supplements, meals, workouts, and more."
                                                                                    : "Add tasks, meals, workouts, and habits to create your personalized wellness schedule."
                                                                                }
                                                                            </p>
                                                                            <div className="flex flex-col gap-3">
                                                                                <button
                                                                                    onClick={() => setIsTaskTemplateOpen(true)}
                                                                                    className="px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
                                                                                >
                                                                                    <Sparkles size={18} />
                                                                                    Use a Template
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => setIsCustomScheduleOpen(true)}
                                                                                    className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
                                                                                >
                                                                                    <Plus size={18} />
                                                                                    Add Custom Item
                                                                                </button>
                                                                                {!enableSupplements && (
                                                                                    <button
                                                                                        onClick={() => {
                                                                                            setIsSettingsOpen(true);
                                                                                            setTimeout(() => {
                                                                                                const supplementsSection = document.querySelector('[data-section="supplements"]');
                                                                                                if (supplementsSection) {
                                                                                                    supplementsSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                                                                }
                                                                                            }, 300);
                                                                                        }}
                                                                                        className="px-6 py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors flex items-center justify-center gap-2 text-sm"
                                                                                    >
                                                                                        <Pill size={18} />
                                                                                        Enable Supplements
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </motion.div>
                                                                )}
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {view === "week" && (
                                        <WeekView selectedDate={selectedDate} schedule={schedule} progress={progress} settings={settings} />
                                    )}

                                    {view === "six-week" && (
                                        <SixWeekView schedule={schedule} progress={progress} />
                                    )}
                                </motion.div>
                            )}

                            {/* PROGRESS TAB */}
                            {activeTab === "progress" && (
                                <motion.div
                                    key="progress"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.2 }}
                                    className="space-y-6"
                                >
                                    <StatsPanel stats={stats} enableSupplements={settings.enable_supplements ?? false} />
                                    {insights && insights.correlations && (
                                        <InsightsPanel
                                            correlations={insights.correlations}
                                            prediction={insights.prediction}
                                            recommendations={insights.recommendations}
                                            trends={insights.trends}
                                            patterns={insights.patterns}
                                            lastAction={lastAiAction}
                                            onAskAi={(prompt, auto) => openChatWithPrompt(prompt, auto)}
                                        />
                                    )}
                                </motion.div>
                            )}

                            {/* INVENTORY TAB - Only show if supplements are enabled */}
                            {activeTab === "inventory" && (settings.enable_supplements ?? false) && (
                                <motion.div
                                    key="inventory"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <InventoryView 
                                        settings={settings} 
                                        schedule={schedule} 
                                        onUpdate={handleSettingsSave}
                                        onOpenTravelPlanner={() => setIsTravelPlannerOpen(true)}
                                    />
                                </motion.div>
                            )}
                            
                            {/* Redirect if trying to access inventory when supplements disabled */}
                            {activeTab === "inventory" && !(settings.enable_supplements ?? false) && (
                                <motion.div
                                    key="inventory-disabled"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="text-center py-12"
                                >
                                    <p className="text-gray-500 dark:text-gray-400 mb-4">Inventory is only available when supplements are enabled.</p>
                                    <button
                                        onClick={() => setActiveTab("schedule")}
                                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                                    >
                                        Go to Schedule
                                    </button>
                                </motion.div>
                            )}

                        </AnimatePresence>
                    </main>
                </div>
            </PullToRefresh>

            <BottomNav activeTab={activeTab as any} />

            {/* MODALS */}
            <EditItemModal
                isOpen={!!editingItem}
                onClose={() => setEditingItem(null)}
                item={editingItem}
                onSave={handleItemUpdate}
                onDelete={handleItemDelete}
            />

            <RescheduleModal
                isOpen={!!reschedulingItem}
                onClose={() => setReschedulingItem(null)}
                item={reschedulingItem}
                date={todayStr}
                onRescheduled={handleReschedule}
            />

            <TravelPlannerModal
                isOpen={isTravelPlannerOpen}
                onClose={() => setIsTravelPlannerOpen(false)}
                settings={settings}
                schedule={schedule}
                onUpdate={handleSettingsSave}
            />

            <TaskTemplateModal
                isOpen={isTaskTemplateOpen}
                onClose={() => setIsTaskTemplateOpen(false)}
                selectedDate={selectedDate}
                onApplied={handleRefresh}
            />

            <OnboardingFlow
                isOpen={isOnboardingOpen}
                onComplete={async (newSettings) => {
                    localStorage.setItem("onboarding_completed", "true");
                    setHasCompletedOnboarding(true);
                    setIsOnboardingOpen(false);
                    setSettings(newSettings);
                    await handleRefresh();
                }}
                onSkip={() => {
                    localStorage.setItem("onboarding_completed", "true");
                    setHasCompletedOnboarding(true);
                    setIsOnboardingOpen(false);
                }}
            />

            {processing && (
                <div className="fixed inset-0 bg-black/20 z-[20000] flex items-center justify-center backdrop-blur-sm">
                    <div className="bg-white p-4 rounded-xl shadow-xl flex items-center gap-3">
                        <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                        <span className="font-medium text-gray-700">Processing...</span>
                    </div>
                </div>
            )}

            <ChatInterface />
            
            <CustomScheduleModal
                isOpen={isCustomScheduleOpen}
                onClose={() => setIsCustomScheduleOpen(false)}
                settings={settings}
                onSave={handleSettingsSave}
            />

            {shouldShowOnboarding && tutorialPos && (
                <div 
                    className="fixed z-[100] animate-bounce pointer-events-none"
                    style={{ top: tutorialPos.top, left: tutorialPos.left }}
                >
                    <div className="relative -translate-x-1/2 bg-primary-600 text-white px-4 py-3 rounded-xl shadow-lg max-w-[220px]">
                        <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-primary-600 transform rotate-45" />
                        <p className="text-sm font-medium leading-tight flex items-center gap-1 flex-wrap">
                            Tap
                            <span className="inline-flex items-center justify-center w-5 h-5 border border-white/60 rounded-full bg-white/10">
                                <Plus size={12} />
                            </span>
                            to add your first task — or describe it to the AI helper.
                        </p>
                    </div>
                </div>
            )}
            
            <KnowledgeModal
                isOpen={!!knowledgeItem}
                onClose={() => setKnowledgeItem(null)}
                itemName={knowledgeItem || ""}
            />

            <SettingsPanel
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                settings={settings}
                schedule={schedule}
                onSave={handleSettingsSave}
                onRegenerate={handleRegenerate}
                onScheduleUpdate={handleScheduleUpdate}
            />

            <PwaInstallPrompt />
        </div>
    );
}
