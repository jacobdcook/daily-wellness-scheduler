import { useState, useEffect } from "react";
import { UserSettings } from "@/types";
import { X, Download } from "lucide-react";
import { clsx } from "clsx";
import { exportSchedule } from "@/utils/api";

interface SettingsPanelProps {
    isOpen: boolean;
    onClose: () => void;
    settings: UserSettings;
    onSave: (settings: UserSettings, shouldRegenerate?: boolean) => void;
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function SettingsPanel({ isOpen, onClose, settings, onSave }: SettingsPanelProps) {
    const [localSettings, setLocalSettings] = useState<UserSettings>(settings);
    const [hasChanges, setHasChanges] = useState(false);



    useEffect(() => {
        if (isOpen) {
            console.log("SettingsPanel is now open");
        }
    }, [isOpen]);

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

    const handleSave = () => {
        onSave(localSettings, false);
        setHasChanges(false);
    };

    const handleSaveAndRegenerate = () => {
        onSave(localSettings, true);
        setHasChanges(false);
    };

    const handleFastingChange = (value: string) => {
        updateSetting("fasting", value);
        if (value === "yes") {
            // Auto-switch meals to fasting mode: breakfast no, lunch no, dinner yes
            updateSetting("breakfast_mode", "no");
            updateSetting("lunch_mode", "no");
            updateSetting("dinner_mode", "yes");
        }
    };

    const handleExport = async (format: 'csv' | 'ical') => {
        try {
            await exportSchedule(format);
        } catch (error) {
            console.error("Export failed", error);
            alert(`Export failed: ${error}`);
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-hidden" style={{ zIndex: 9999 }}>
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50"
                onClick={onClose}
                style={{ zIndex: 9998 }}
            />

            {/* Panel */}
            <div
                className="absolute right-0 top-0 h-full w-full max-w-2xl bg-white shadow-xl overflow-y-auto transform transition-transform duration-300 ease-in-out"
                style={{ zIndex: 9999 }}
            >
                <div className="sticky top-0 bg-white border-b z-10 px-6 py-4 flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Daily Schedule */}
                    <section className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                            Daily Schedule
                        </h3>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Wake Time
                                </label>
                                <input
                                    type="time"
                                    value={localSettings.wake_time}
                                    onChange={(e) => updateSetting("wake_time", e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Bedtime
                                </label>
                                <input
                                    type="time"
                                    value={localSettings.bedtime}
                                    onChange={(e) => updateSetting("bedtime", e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Dinner Time
                                </label>
                                <input
                                    type="time"
                                    value={localSettings.dinner_time}
                                    onChange={(e) => updateSetting("dinner_time", e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    </section>

                    {/* Meal Schedule */}
                    <section className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                            Meal Schedule
                        </h3>
                        <div className="space-y-3">
                            {[
                                { key: "breakfast_mode" as const, label: "Breakfast", allowSometimes: true },
                                { key: "lunch_mode" as const, label: "Lunch", allowSometimes: false },
                                { key: "dinner_mode" as const, label: "Dinner", allowSometimes: false },
                            ].map(({ key, label, allowSometimes }) => (
                                <div key={key} className="flex items-center justify-between">
                                    <label className="text-sm font-medium text-gray-700">
                                        {label}
                                    </label>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name={key}
                                                value="yes"
                                                checked={localSettings[key] === "yes"}
                                                onChange={(e) => updateSetting(key, e.target.value)}
                                                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="text-sm text-gray-700">Yes</span>
                                        </label>
                                        {allowSometimes && (
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name={key}
                                                    value="sometimes"
                                                    checked={localSettings[key] === "sometimes"}
                                                    onChange={(e) => updateSetting(key, e.target.value)}
                                                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                                                />
                                                <span className="text-sm text-gray-700">Sometimes</span>
                                            </label>
                                        )}
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name={key}
                                                value="no"
                                                checked={localSettings[key] === "no"}
                                                onChange={(e) => updateSetting(key, e.target.value)}
                                                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="text-sm text-gray-700">No</span>
                                        </label>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Study Block */}
                    <section className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                            Study Block
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Start Time
                                </label>
                                <input
                                    type="time"
                                    value={localSettings.study_start}
                                    onChange={(e) => updateSetting("study_start", e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    End Time
                                </label>
                                <input
                                    type="time"
                                    value={localSettings.study_end}
                                    onChange={(e) => updateSetting("study_end", e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    </section>

                    {/* Electrolyte Intensity */}
                    <section className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                            Electrolyte Intensity
                        </h3>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="electrolyte_intensity"
                                    value="light"
                                    checked={localSettings.electrolyte_intensity === "light"}
                                    onChange={(e) => updateSetting("electrolyte_intensity", e.target.value)}
                                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700">Light Day</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="electrolyte_intensity"
                                    value="sweaty"
                                    checked={localSettings.electrolyte_intensity === "sweaty"}
                                    onChange={(e) => updateSetting("electrolyte_intensity", e.target.value)}
                                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700">Sweaty Day</span>
                            </label>
                        </div>
                    </section>

                    {/* Optional Items */}
                    <section className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                            Optional Items
                        </h3>
                        <div className="space-y-2">
                            {[
                                { key: "slippery_elm", label: "Slippery Elm" },
                                { key: "l_glutamine", label: "L-Glutamine" },
                                { key: "collagen", label: "Collagen Peptides" },
                                { key: "melatonin", label: "Melatonin" },
                            ].map(({ key, label }) => (
                                <label key={key} className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={localSettings.optional_items[key] || false}
                                        onChange={(e) => updateOptionalItem(key, e.target.checked)}
                                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-gray-700">{label}</span>
                                </label>
                            ))}
                        </div>
                    </section>

                    {/* Fasting Mode */}
                    <section className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                            Fasting Mode
                        </h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-gray-700">Fasting</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="fasting"
                                            value="no"
                                            checked={localSettings.fasting === "no"}
                                            onChange={(e) => handleFastingChange(e.target.value)}
                                            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-sm text-gray-700">No</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="fasting"
                                            value="yes"
                                            checked={localSettings.fasting === "yes"}
                                            onChange={(e) => handleFastingChange(e.target.value)}
                                            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-sm text-gray-700">Yes</span>
                                    </label>
                                </div>
                            </div>

                            {localSettings.fasting === "yes" && (
                                <>
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium text-gray-700">
                                            Fasting Level
                                        </label>
                                        <div className="flex gap-4">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="fasting_level"
                                                    value="light"
                                                    checked={localSettings.fasting_level === "light"}
                                                    onChange={(e) => updateSetting("fasting_level", e.target.value)}
                                                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                                                />
                                                <span className="text-sm text-gray-700">Light</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="fasting_level"
                                                    value="strict"
                                                    checked={localSettings.fasting_level === "strict"}
                                                    onChange={(e) => updateSetting("fasting_level", e.target.value)}
                                                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                                                />
                                                <span className="text-sm text-gray-700">Strict</span>
                                            </label>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Feeding Window
                                        </label>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">
                                                    Start
                                                </label>
                                                <input
                                                    type="time"
                                                    value={localSettings.feeding_window.start}
                                                    onChange={(e) => updateFeedingWindow("start", e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">
                                                    End
                                                </label>
                                                <input
                                                    type="time"
                                                    value={localSettings.feeding_window.end}
                                                    onChange={(e) => updateFeedingWindow("end", e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                        </div>
                                        <p className="mt-2 text-xs text-gray-500">
                                            Light: Caloric items move to feeding window. Strict: Caloric items skipped.
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>
                    </section>

                    {/* Workout Days */}
                    <section className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                            Workout Days
                        </h3>
                        <div className="grid grid-cols-2 gap-2">
                            {DAY_NAMES.map((day, index) => (
                                <label
                                    key={day}
                                    className="flex items-center gap-2 cursor-pointer p-2 hover:bg-gray-50 rounded"
                                >
                                    <input
                                        type="checkbox"
                                        checked={localSettings.workout_days[index] || false}
                                        onChange={(e) => updateWorkoutDay(index, e.target.checked)}
                                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-gray-700">{day}</span>
                                </label>
                            ))}
                        </div>
                        {localSettings.workout_days.some((day) => day) && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Workout Time
                                </label>
                                <input
                                    type="time"
                                    value={localSettings.workout_time}
                                    onChange={(e) => updateSetting("workout_time", e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        )}
                    </section>

                    {/* Breakfast Days */}
                    {localSettings.breakfast_mode === "sometimes" && (
                        <section className="space-y-4">
                            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                                Breakfast Days
                            </h3>
                            <div className="grid grid-cols-2 gap-2">
                                {DAY_NAMES.map((day, index) => (
                                    <label
                                        key={day}
                                        className="flex items-center gap-2 cursor-pointer p-2 hover:bg-gray-50 rounded"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={localSettings.breakfast_days[index] || false}
                                            onChange={(e) => updateBreakfastDay(index, e.target.checked)}
                                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                        />
                                        <span className="text-sm text-gray-700">{day}</span>
                                    </label>
                                ))}
                            </div>
                        </section>
                    )}
                </div>

                {/* Footer with Export and Save Buttons */}
                <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex flex-col sm:flex-row justify-between gap-3">
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleExport('csv')}
                            className="flex items-center px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                        >
                            <Download size={16} className="mr-2" />
                            CSV
                        </button>
                        <button
                            onClick={() => handleExport('ical')}
                            className="flex items-center px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                        >
                            <Download size={16} className="mr-2" />
                            iCal
                        </button>
                    </div>

                    <div className="flex gap-2 justify-end">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!hasChanges}
                            className={clsx(
                                "px-4 py-2 rounded-md transition-colors",
                                hasChanges
                                    ? "bg-blue-600 text-white hover:bg-blue-700"
                                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                            )}
                        >
                            Save Settings
                        </button>
                        <button
                            onClick={handleSaveAndRegenerate}
                            disabled={!hasChanges}
                            className={clsx(
                                "px-4 py-2 rounded-md transition-colors",
                                hasChanges
                                    ? "bg-green-600 text-white hover:bg-green-700"
                                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                            )}
                        >
                            Save & Regenerate Schedule
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

