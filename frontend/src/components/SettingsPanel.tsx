"use client";

import { useState, useEffect } from "react";
import { UserSettings, Schedule, ScheduledItem, CustomItem } from "@/types";
import { X, Download, Bell, Plus, RefreshCw, Clock, Edit2, Trash2, Check, UtensilsCrossed, Info, User, Moon, Sun, Palette, Sparkles, Droplets, Repeat, Pill } from "lucide-react";
import { clsx } from "clsx";
import { exportSchedule, savePushbulletKey, loadPushbulletKey, testNotification, updateItem, deleteItem, analyzeSupplement, addItemToSchedule, changePassword, createBackup, listBackups, restoreBackup } from "@/utils/api";
import { CustomScheduleModal } from "./CustomScheduleModal";
import { RecurringPatternBuilder } from "./RecurringPatternBuilder";
import { PatternTemplateLibrary } from "./PatternTemplateLibrary";
import { NotificationSettingsPanel } from "./NotificationSettings";
import { format, parse } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useAppTheme, accentColors } from "@/context/ThemeContext";
import { useToast } from "@/context/ToastContext";

interface SettingsPanelProps {
    isOpen: boolean;
    onClose: () => void;
    settings: UserSettings;
    schedule: Schedule | null;
    onSave: (settings: UserSettings, shouldRegenerate?: boolean) => void;
    onRegenerate: () => void;
    onScheduleUpdate: () => void;
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function SettingsPanel({ isOpen, onClose, settings, schedule, onSave, onRegenerate, onScheduleUpdate }: SettingsPanelProps) {
    const { showToast } = useToast();
    const { theme, setTheme, accentColor, setAccentColor } = useAppTheme();
    const { data: session } = useSession();
    const [localSettings, setLocalSettings] = useState<UserSettings>(settings);
    const [hasChanges, setHasChanges] = useState(false);
    const [initialTheme, setInitialTheme] = useState(theme);
    const [initialAccentColor, setInitialAccentColor] = useState(accentColor);
    const [pushbulletKey, setPushbulletKey] = useState("");
    const [isCustomScheduleOpen, setIsCustomScheduleOpen] = useState(false);
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [backups, setBackups] = useState<Array<{ path: string; name: string; timestamp: string; display: string }>>([]);
    const [showBackups, setShowBackups] = useState(false);
    const [showRecurringPatterns, setShowRecurringPatterns] = useState(false);
    const [isPatternBuilderOpen, setIsPatternBuilderOpen] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // Ensure optional_items has all default keys
            const defaultOptional = {
                slippery_elm: false,
                l_glutamine: false,
                collagen: false,
                melatonin: false
            };
            const mergedSettings = {
                ...settings,
                enable_supplements: settings.enable_supplements ?? false, // Default to false for new users
                optional_items: {
                    ...defaultOptional,
                    ...(settings.optional_items || {})
                }
            };
            setLocalSettings(mergedSettings);
            setHasChanges(false);
            setInitialTheme(theme);
            setInitialAccentColor(accentColor);
            loadPushbulletKey().then((result) => {
                if (result.has_key) {
                    setPushbulletKey(result.masked_key || "");
                }
            }).catch(() => {});
            if (showBackups) {
                listBackups().then((result) => {
                    setBackups(result.backups || []);
                }).catch(() => {});
            }
        }
    }, [isOpen, settings, theme, accentColor, showBackups]);

    // Track changes to theme and accent color
    useEffect(() => {
        if (isOpen && (theme !== initialTheme || accentColor !== initialAccentColor)) {
            setHasChanges(true);
        }
    }, [theme, accentColor, initialTheme, initialAccentColor, isOpen]);

    if (!isOpen) return null;

    const updateSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
        setLocalSettings((prev) => ({ ...prev, [key]: value }));
        setHasChanges(true);
    };

    const updateBreakfastDay = (index: number, value: boolean) => {
        const newDays = [...localSettings.breakfast_days];
        newDays[index] = value;
        updateSetting("breakfast_days", newDays);
    };

    const updateWorkoutDay = (index: number, value: boolean) => {
        const newDays = [...localSettings.workout_days];
        newDays[index] = value;
        updateSetting("workout_days", newDays);
    };

    const updateOptionalItem = (key: string, value: boolean) => {
        updateSetting("optional_items", {
            ...localSettings.optional_items,
            [key]: value,
        });
    };

    const updateFeedingWindow = (key: "start" | "end", value: string) => {
        updateSetting("feeding_window", {
            ...localSettings.feeding_window,
            [key]: value,
        });
    };

    const handleSave = (shouldRegenerate: boolean = false) => {
        // Ensure optional_items is always included with all default keys
        const defaultOptional = {
            slippery_elm: false,
            l_glutamine: false,
            collagen: false,
            melatonin: false
        };
        const settingsToSave = {
            ...localSettings,
            optional_items: {
                ...defaultOptional,
                ...(localSettings.optional_items || {})
            }
        };
        onSave(settingsToSave, shouldRegenerate);
        setHasChanges(false);
        if (!shouldRegenerate) {
            showToast("Settings saved", "success");
        }
    };

    const handleFastingChange = (value: string) => {
        updateSetting("fasting", value);
        if (value === "yes") {
            updateSetting("breakfast_mode", "no");
            updateSetting("lunch_mode", "no");
            updateSetting("dinner_mode", "yes");
        }
    };

    const handleExport = async (format: 'csv' | 'ical' | 'json' | 'pdf') => {
        try {
            await exportSchedule(format);
            showToast(`Exported as ${format.toUpperCase()}`, "success");
        } catch (error: any) {
            console.error("Export failed", error);
            const message = error?.message || String(error);
            if (message.includes("reportlab")) {
                alert("PDF export requires the reportlab library. Please contact support or use another format.");
            } else {
                alert(`Export failed: ${message}`);
            }
        }
    };

    const handlePushbulletSave = async () => {
        try {
            await savePushbulletKey(pushbulletKey);
            showToast("Pushbullet API key saved", "success");
        } catch (error) {
            showToast("Failed to save API key", "error");
        }
    };

    const handleTestNotification = async () => {
        try {
            await testNotification();
            showToast("Test notification sent", "success");
        } catch (error) {
            showToast("Failed to send test notification", "error");
        }
    };

    const handleChangePassword = async () => {
        if (newPassword !== confirmPassword) {
            alert("New passwords do not match");
            return;
        }
        if (newPassword.length < 6) {
            alert("Password must be at least 6 characters");
            return;
        }
        try {
            await changePassword(oldPassword, newPassword);
            showToast("Password changed successfully", "success");
            setOldPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (error: any) {
            alert(error?.message || "Failed to change password");
        }
    };

    return (
        <>
        <AnimatePresence mode="wait">
            {isOpen && (
                <div key="settings-panel" className="fixed inset-0 z-50 overflow-hidden">
                    <motion.div
                        key="settings-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/50"
                        onClick={onClose}
                    />
                    <motion.div
                        key="settings-content"
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 30, stiffness: 300 }}
                        className="absolute right-0 top-0 h-full w-full max-w-2xl bg-white dark:bg-gray-900 shadow-xl overflow-y-auto"
                    >
                        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b dark:border-gray-800 z-10 px-6 py-4 flex items-center justify-between">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h2>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                            >
                                <X size={24} className="text-gray-600 dark:text-gray-400" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Supplements Toggle */}
                            <section className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b dark:border-gray-800 pb-2 flex items-center">
                                    <Pill size={18} className="mr-2" />
                                    Supplements
                                </h3>
                                <div className="space-y-3">
                                    <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer">
                                        <div className="flex-1">
                                            <div className="font-medium text-gray-900 dark:text-white mb-1">Enable Supplements</div>
                                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                                Track vitamins, minerals, and other supplements
                                            </div>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={localSettings.enable_supplements ?? false}
                                            onChange={(e) => {
                                                updateSetting("enable_supplements", e.target.checked);
                                                // Trigger smooth transition
                                                setTimeout(() => {
                                                    window.dispatchEvent(new CustomEvent("supplements-toggled", { 
                                                        detail: { enabled: e.target.checked } 
                                                    }));
                                                }, 100);
                                            }}
                                            className="w-6 h-6 text-primary-600 rounded focus:ring-2 focus:ring-primary-500 transition-all duration-300"
                                        />
                                    </label>
                                    {!localSettings.enable_supplements && (
                                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex items-start gap-3">
                                            <Info size={20} className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                                            <div className="text-sm text-blue-800 dark:text-blue-300">
                                                <p className="font-medium mb-1">Supplements are disabled</p>
                                                <p className="mb-2">You can still use the app for nutrition tracking, meal planning, recipes, and general wellness. Enable supplements above to add supplement tracking to your schedule.</p>
                                                <p className="text-xs italic">💡 Your supplement data is preserved and will be restored when you re-enable supplements.</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* User Profile */}
                            <section className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b dark:border-gray-800 pb-2 flex items-center">
                                    <User size={18} className="mr-2" />
                                    User Profile
                                </h3>
                                <div className="space-y-2">
                                    <div>
                                        <label className="text-sm text-gray-600 dark:text-gray-400">Name</label>
                                        <p className="text-gray-900 dark:text-white font-medium">{session?.user?.name || "N/A"}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm text-gray-600 dark:text-gray-400">Email</label>
                                        <p className="text-gray-900 dark:text-white font-medium">{session?.user?.email || "N/A"}</p>
                                    </div>
                                </div>

                                <div className="space-y-3 pt-4 border-t dark:border-gray-800">
                                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Change Password</h4>
                                    <input
                                        type="password"
                                        placeholder="Current password"
                                        value={oldPassword}
                                        onChange={(e) => setOldPassword(e.target.value)}
                                        className="w-full px-3 py-2 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-md"
                                    />
                                    <input
                                        type="password"
                                        placeholder="New password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full px-3 py-2 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-md"
                                    />
                                    <input
                                        type="password"
                                        placeholder="Confirm new password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full px-3 py-2 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-md"
                                    />
                                    <button
                                        onClick={handleChangePassword}
                                        className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
                                    >
                                        Change Password
                                    </button>
                                </div>
                            </section>

                            {/* Appearance */}
                            <section className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b dark:border-gray-800 pb-2 flex items-center">
                                    <Palette size={18} className="mr-2" />
                                    Appearance
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Theme</label>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    setTheme("light");
                                                    setHasChanges(true);
                                                }}
                                                className={clsx(
                                                    "flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors",
                                                    theme === "light"
                                                        ? "bg-primary-100 dark:bg-primary-900 border-primary-500 text-primary-700 dark:text-primary-300"
                                                        : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300"
                                                )}
                                            >
                                                <Sun size={16} />
                                                Light
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setTheme("dark");
                                                    setHasChanges(true);
                                                }}
                                                className={clsx(
                                                    "flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors",
                                                    theme === "dark"
                                                        ? "bg-primary-100 dark:bg-primary-900 border-primary-500 text-primary-700 dark:text-primary-300"
                                                        : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300"
                                                )}
                                            >
                                                <Moon size={16} />
                                                Dark
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setTheme("system");
                                                    setHasChanges(true);
                                                }}
                                                className={clsx(
                                                    "flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors",
                                                    theme === "system"
                                                        ? "bg-primary-100 dark:bg-primary-900 border-primary-500 text-primary-700 dark:text-primary-300"
                                                        : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300"
                                                )}
                                            >
                                                <Sparkles size={16} />
                                                System
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Accent Color</label>
                                        <div className="flex flex-wrap gap-2">
                                            {Object.entries(accentColors).map(([key, value]) => (
                                                <button
                                                    key={key}
                                                    onClick={() => {
                                                        setAccentColor(key as typeof accentColor);
                                                        setHasChanges(true);
                                                    }}
                                                    className={clsx(
                                                        "w-10 h-10 rounded-full border-2 transition-all",
                                                        accentColor === key ? "border-gray-900 dark:border-white scale-110" : "border-gray-300 dark:border-gray-700"
                                                    )}
                                                    style={{ backgroundColor: `var(--color-${value.class}-500)` }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Daily Schedule */}
                            <section className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b dark:border-gray-800 pb-2">Daily Schedule</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Wake Time</label>
                                        <input
                                            type="time"
                                            value={localSettings.wake_time}
                                            onChange={(e) => updateSetting("wake_time", e.target.value)}
                                            className="w-full px-3 py-2 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-md"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bedtime</label>
                                        <input
                                            type="time"
                                            value={localSettings.bedtime}
                                            onChange={(e) => updateSetting("bedtime", e.target.value)}
                                            className="w-full px-3 py-2 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-md"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Dinner Time</label>
                                        <input
                                            type="time"
                                            value={localSettings.dinner_time}
                                            onChange={(e) => updateSetting("dinner_time", e.target.value)}
                                            className="w-full px-3 py-2 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-md"
                                        />
                                    </div>
                                </div>
                            </section>

                            {/* Meal Schedule */}
                            <section className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b dark:border-gray-800 pb-2">Meal Schedule</h3>
                                <div className="space-y-3">
                                    {(["breakfast", "lunch", "dinner"] as const).map((meal) => (
                                        <div key={meal} className="flex items-center justify-between">
                                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">{meal}</label>
                                            <select
                                                value={localSettings[`${meal}_mode` as keyof UserSettings] as string}
                                                onChange={(e) => updateSetting(`${meal}_mode` as keyof UserSettings, e.target.value)}
                                                className="px-3 py-1 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-md"
                                            >
                                                <option value="yes">Yes</option>
                                                <option value="no">No</option>
                                                {meal === "breakfast" && <option value="sometimes">Sometimes</option>}
                                            </select>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* Study Block */}
                            <section className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b dark:border-gray-800 pb-2 flex items-center">
                                    <Clock size={18} className="mr-2" />
                                    Study Block
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Time</label>
                                        <input
                                            type="time"
                                            value={localSettings.study_start}
                                            onChange={(e) => updateSetting("study_start", e.target.value)}
                                            className="w-full px-3 py-2 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-md"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Time</label>
                                        <input
                                            type="time"
                                            value={localSettings.study_end}
                                            onChange={(e) => updateSetting("study_end", e.target.value)}
                                            className="w-full px-3 py-2 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-md"
                                        />
                                    </div>
                                </div>
                            </section>

                            {/* Electrolyte Intensity - Only show if supplements are enabled */}
                            {localSettings.enable_supplements && (
                            <section className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b dark:border-gray-800 pb-2 flex items-center">
                                    <Droplets size={18} className="mr-2" />
                                    Electrolyte Intensity
                                </h3>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => updateSetting("electrolyte_intensity", "light")}
                                        className={clsx(
                                            "flex-1 px-4 py-2 rounded-lg border transition-colors",
                                            localSettings.electrolyte_intensity === "light"
                                                ? "bg-primary-600 text-white border-primary-600"
                                                : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300"
                                        )}
                                    >
                                        Light Day
                                    </button>
                                    <button
                                        onClick={() => updateSetting("electrolyte_intensity", "sweaty")}
                                        className={clsx(
                                            "flex-1 px-4 py-2 rounded-lg border transition-colors",
                                            localSettings.electrolyte_intensity === "sweaty"
                                                ? "bg-primary-600 text-white border-primary-600"
                                                : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300"
                                        )}
                                    >
                                        Sweaty Day
                                    </button>
                                </div>
                            </section>
                            )}

                            {/* Workout Days */}
                            <section className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b dark:border-gray-800 pb-2">Workout Days</h3>
                                <div className="grid grid-cols-7 gap-2">
                                    {DAY_NAMES.map((day, index) => (
                                        <label key={day} className="flex flex-col items-center cursor-pointer">
                                            <span className="text-xs text-gray-600 dark:text-gray-400 mb-1">{day.slice(0, 3)}</span>
                                            <input
                                                type="checkbox"
                                                checked={localSettings.workout_days[index]}
                                                onChange={(e) => updateWorkoutDay(index, e.target.checked)}
                                                className="w-5 h-5 text-primary-600 rounded"
                                            />
                                        </label>
                                    ))}
                                </div>
                            </section>

                            {/* Fasting Mode */}
                            <section className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b dark:border-gray-800 pb-2">Fasting Mode</h3>
                                <div className="space-y-3">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleFastingChange("no")}
                                            className={clsx(
                                                "flex-1 px-4 py-2 rounded-lg border transition-colors",
                                                localSettings.fasting === "no"
                                                    ? "bg-primary-600 text-white border-primary-600"
                                                    : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300"
                                            )}
                                        >
                                            No
                                        </button>
                                        <button
                                            onClick={() => handleFastingChange("yes")}
                                            className={clsx(
                                                "flex-1 px-4 py-2 rounded-lg border transition-colors",
                                                localSettings.fasting === "yes"
                                                    ? "bg-primary-600 text-white border-primary-600"
                                                    : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300"
                                            )}
                                        >
                                            Yes
                                        </button>
                                    </div>
                                    {localSettings.fasting === "yes" && (
                                        <>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fasting Level</label>
                                                <select
                                                    value={localSettings.fasting_level}
                                                    onChange={(e) => updateSetting("fasting_level", e.target.value)}
                                                    className="w-full px-3 py-2 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-md"
                                                >
                                                    <option value="light">Light</option>
                                                    <option value="strict">Strict</option>
                                                </select>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Feeding Window Start</label>
                                                    <input
                                                        type="time"
                                                        value={localSettings.feeding_window.start}
                                                        onChange={(e) => updateFeedingWindow("start", e.target.value)}
                                                        className="w-full px-3 py-2 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-md"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Feeding Window End</label>
                                                    <input
                                                        type="time"
                                                        value={localSettings.feeding_window.end}
                                                        onChange={(e) => updateFeedingWindow("end", e.target.value)}
                                                        className="w-full px-3 py-2 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-md"
                                                    />
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </section>

                            {/* Optional Items - Only show if supplements are enabled */}
                            {localSettings.enable_supplements && Object.keys(localSettings.optional_items || {}).length > 0 && (
                                <section className="space-y-4">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b dark:border-gray-800 pb-2 flex items-center">
                                        <Pill size={18} className="mr-2" />
                                        Optional Supplements
                                    </h3>
                                    <div className="space-y-2">
                                        {Object.entries(localSettings.optional_items || {}).map(([key, value]) => (
                                            <label key={key} className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded">
                                                <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">{key.replace(/_/g, " ")}</span>
                                                <input
                                                    type="checkbox"
                                                    checked={value || false}
                                                    onChange={(e) => updateOptionalItem(key, e.target.checked)}
                                                    className="w-5 h-5 text-primary-600 rounded"
                                                />
                                            </label>
                                        ))}
                                    </div>
                                    {hasChanges && (
                                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex items-start gap-2">
                                            <Info size={18} className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                                            <div className="text-sm text-blue-800 dark:text-blue-300">
                                                <p className="font-medium mb-1">⚠️ Don't forget to save!</p>
                                                <p>Scroll to the bottom and click <strong>"Save & Regenerate"</strong> to apply your changes and update your schedule.</p>
                                            </div>
                                        </div>
                                    )}
                                </section>
                            )}

                            {/* Notifications - Phase 29 */}
                            <NotificationSettingsPanel />

                            {/* Legacy Pushbullet Notifications (Optional) */}
                            <section className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b dark:border-gray-800 pb-2 flex items-center">
                                    <Bell size={18} className="mr-2" />
                                    Pushbullet (Legacy)
                                </h3>
                                <div className="space-y-3">
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Legacy Pushbullet integration. Use the notification settings above for modern push notifications.
                                    </p>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">API Key</label>
                                        <input
                                            type="password"
                                            value={pushbulletKey}
                                            onChange={(e) => setPushbulletKey(e.target.value)}
                                            placeholder="Enter your Pushbullet API key"
                                            className="w-full px-3 py-2 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-md"
                                        />
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Get your key at pushbullet.com</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handlePushbulletSave}
                                            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
                                        >
                                            Save Key
                                        </button>
                                        <button
                                            onClick={handleTestNotification}
                                            className="px-4 py-2 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                        >
                                            Test Notification
                                        </button>
                                    </div>
                                </div>
                            </section>

                            {/* Recurring Patterns (Phase 25) */}
                            <section className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b dark:border-gray-800 pb-2 flex items-center flex-1">
                                        <Repeat size={18} className="mr-2" />
                                        Recurring Patterns
                                    </h3>
                                    <button
                                        onClick={() => setShowRecurringPatterns(!showRecurringPatterns)}
                                        className="px-3 py-1 text-sm text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-md transition-colors"
                                    >
                                        {showRecurringPatterns ? "Hide" : "Show"}
                                    </button>
                                </div>
                                {showRecurringPatterns && (
                                    <div className="space-y-3">
                                        <button
                                            onClick={() => setIsPatternBuilderOpen(true)}
                                            className="w-full px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Plus size={16} />
                                            Create Recurring Pattern
                                        </button>
                                        <PatternTemplateLibrary
                                            onRefresh={() => {
                                                onScheduleUpdate();
                                            }}
                                        />
                                    </div>
                                )}
                            </section>

                            {/* Reset & Regenerate */}
                            <section className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b dark:border-gray-800 pb-2 flex items-center">
                                    <RefreshCw size={18} className="mr-2" />
                                    Reset & Regenerate
                                </h3>
                                <div className="space-y-2">
                                    <button
                                        onClick={() => {
                                            setIsCustomScheduleOpen(true);
                                        }}
                                        className="w-full px-4 py-2 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Plus size={16} />
                                        Create Custom Schedule
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (hasChanges) {
                                                handleSave(true);
                                            } else {
                                                onRegenerate();
                                            }
                                        }}
                                        className={clsx(
                                            "w-full px-4 py-2 rounded-md transition-colors",
                                            hasChanges
                                                ? "bg-green-600 text-white hover:bg-green-700"
                                                : "bg-primary-600 text-white hover:bg-primary-700"
                                        )}
                                    >
                                        {hasChanges ? "Save & Regenerate Schedule" : "Regenerate Schedule"}
                                    </button>
                                </div>
                            </section>
                        </div>

                        {/* Spacer to ensure footer is visible */}
                        <div className="h-32"></div>

                        {/* Footer with Export and Save Buttons */}
                        <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t dark:border-gray-800 px-6 py-4 flex flex-col gap-3 shadow-lg z-10">
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => handleExport('csv')}
                                    className="flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 bg-white border border-gray-300 dark:border-gray-600 dark:bg-gray-800 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    <Download size={16} className="mr-2" />
                                    CSV
                                </button>
                                <button
                                    onClick={() => handleExport('ical')}
                                    className="flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 bg-white border border-gray-300 dark:border-gray-600 dark:bg-gray-800 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    <Download size={16} className="mr-2" />
                                    iCal
                                </button>
                                <button
                                    onClick={() => handleExport('json')}
                                    className="flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 bg-white border border-gray-300 dark:border-gray-600 dark:bg-gray-800 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    <Download size={16} className="mr-2" />
                                    JSON
                                </button>
                                <button
                                    onClick={() => handleExport('pdf')}
                                    className="flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 bg-white border border-gray-300 dark:border-gray-600 dark:bg-gray-800 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    <Download size={16} className="mr-2" />
                                    PDF
                                </button>
                            </div>

                            <div className="flex gap-2 justify-end">
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleSave(false)}
                                    disabled={!hasChanges}
                                    className={clsx(
                                        "px-4 py-2 rounded-md transition-colors",
                                        hasChanges
                                            ? "bg-primary-600 text-white hover:bg-primary-700"
                                            : "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                                    )}
                                >
                                    Save Settings
                                </button>
                                <button
                                    onClick={() => handleSave(true)}
                                    disabled={!hasChanges}
                                    className={clsx(
                                        "px-4 py-2 rounded-md transition-colors",
                                        hasChanges
                                            ? "bg-green-600 text-white hover:bg-green-700"
                                            : "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                                    )}
                                >
                                    Save & Regenerate
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>

        {/* Recurring Pattern Builder Modal - Outside AnimatePresence to avoid key conflicts */}
        <RecurringPatternBuilder
            isOpen={isPatternBuilderOpen}
            onClose={() => setIsPatternBuilderOpen(false)}
            onSuccess={() => {
                onScheduleUpdate();
                setShowRecurringPatterns(true);
            }}
        />

        {/* Custom Schedule Modal - Outside AnimatePresence to avoid key conflicts */}
        <CustomScheduleModal
            isOpen={isCustomScheduleOpen}
            onClose={() => setIsCustomScheduleOpen(false)}
            settings={localSettings}
            onSave={(newSettings) => {
                setLocalSettings(newSettings);
                setHasChanges(true);
            }}
        />
        </>
    );
}
