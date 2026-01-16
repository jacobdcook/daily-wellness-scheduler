"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Droplet, Droplets, Plus, Settings, TrendingUp, Award, Calendar } from "lucide-react";
import { getWaterIntake, addWaterIntake, getWaterSettings, updateWaterSettings, getWaterStats, WaterIntake, WaterSettings, WaterStats } from "@/utils/api";
import { BottomNav } from "@/components/BottomNav";
import { useToast } from "@/context/ToastContext";

export default function WaterPage() {
    const { data: session } = useSession();
    const { showToast } = useToast();
    const [intake, setIntake] = useState<WaterIntake | null>(null);
    const [settings, setSettings] = useState<WaterSettings | null>(null);
    const [stats, setStats] = useState<WaterStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [progressPercent, setProgressPercent] = useState(0);
    const [showSettings, setShowSettings] = useState(false);
    const [goalInput, setGoalInput] = useState<string>("");
    const [goalHasChanges, setGoalHasChanges] = useState(false);

    useEffect(() => {
        if (session) {
            loadData();
        }
    }, [session]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [intakeData, settingsData, statsData] = await Promise.all([
                getWaterIntake(),
                getWaterSettings(),
                getWaterStats(30)
            ]);
            setIntake(intakeData.intake);
            setSettings(settingsData);
            setProgressPercent(intakeData.progress_percent);
            setStats(statsData);
            // Initialize goal input with current goal
            const currentGoal = settingsData.unit === "oz" ? settingsData.daily_goal_oz : settingsData.daily_goal_ml;
            setGoalInput(currentGoal.toString());
            setGoalHasChanges(false);
        } catch (error) {
            console.error("Failed to load water data:", error);
            showToast("Failed to load water data", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleAddWater = async (amount: number) => {
        if (!settings) return;
        
        try {
            const unit = settings.unit;
            const result = await addWaterIntake(amount, unit);
            setIntake(result.intake);
            setProgressPercent(result.progress_percent);
            
            if (result.goal_met && result.message.includes("🎉")) {
                showToast(result.message, "success");
            } else {
                showToast(`${amount}${unit === "oz" ? "oz" : "ml"} added! 💧`, "success");
            }
            
            // Reload stats
            const statsData = await getWaterStats(30);
            setStats(statsData);
        } catch (error) {
            console.error("Failed to add water:", error);
            showToast("Failed to record water intake", "error");
        }
    };

    const handleUpdateSettings = async (newSettings: Partial<WaterSettings>) => {
        if (!settings) return;
        
        try {
            const updated = { ...settings, ...newSettings };
            await updateWaterSettings(updated);
            setSettings(updated);
            setShowSettings(false);
            showToast("Settings updated! 💧", "success");
            await loadData(); // Reload to update progress
        } catch (error) {
            console.error("Failed to update settings:", error);
            showToast("Failed to update settings", "error");
        }
    };

    const handleGoalChange = (value: string) => {
        setGoalInput(value);
        setGoalHasChanges(true);
    };

    const handleSaveGoal = async () => {
        if (!settings || !goalInput) return;
        
        const value = parseFloat(goalInput);
        if (isNaN(value) || value <= 0) {
            showToast("Please enter a valid number", "error");
            return;
        }
        
        try {
            if (settings.unit === "oz") {
                await handleUpdateSettings({ daily_goal_oz: value, daily_goal_ml: value * 29.5735 });
            } else {
                await handleUpdateSettings({ daily_goal_ml: value, daily_goal_oz: value / 29.5735 });
            }
            setGoalHasChanges(false);
        } catch (error) {
            console.error("Failed to save goal:", error);
        }
    };

    const handlePresetGoal = async (presetValue: number) => {
        if (!settings) return;
        setGoalInput(presetValue.toString());
        if (settings.unit === "oz") {
            await handleUpdateSettings({ daily_goal_oz: presetValue, daily_goal_ml: presetValue * 29.5735 });
        } else {
            const mlValue = presetValue * 29.5735;
            await handleUpdateSettings({ daily_goal_ml: mlValue, daily_goal_oz: presetValue });
        }
        setGoalHasChanges(false);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 text-gray-900 dark:text-gray-100">
                <div className="max-w-4xl mx-auto px-4 py-8 pt-24 pb-24">
                    <div className="space-y-6">
                        <div className="h-12 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
                        <div className="h-96 bg-gray-200 dark:bg-gray-800 rounded-3xl animate-pulse" />
                    </div>
                </div>
                <BottomNav />
            </div>
        );
    }

    if (!settings || !intake) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 text-gray-900 dark:text-gray-100">
                <div className="max-w-4xl mx-auto px-4 py-8 pt-24 pb-24">
                    <p className="text-center text-gray-500 dark:text-gray-400">Loading water tracker...</p>
                </div>
                <BottomNav />
            </div>
        );
    }

    const unit = settings.unit;
    const current = unit === "oz" ? intake.total_oz : intake.total_ml;
    const goal = unit === "oz" ? settings.daily_goal_oz : settings.daily_goal_ml;
    const remaining = Math.max(0, goal - current);
    const isGoalMet = intake.goal_met;

    // Quick add button sizes
    const quickAddSizes = unit === "oz" 
        ? [4, 8, 12, 16, 20, 32] 
        : [120, 240, 360, 480, 600, 960]; // ml equivalents

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 text-gray-900 dark:text-gray-100">
            <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b dark:border-gray-800 fixed top-0 left-0 right-0 z-50">
                <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                            <Droplets className="w-6 h-6 text-white" />
                        </div>
                        <h1 className="font-bold text-xl tracking-tight bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                            Water Tracker
                        </h1>
                    </div>
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </button>
                </div>
            </header>

            <div className="max-w-4xl mx-auto px-4 py-8 pt-24 pb-24">
                {/* Settings Panel */}
                {showSettings && (
                    <div className="mb-6 bg-white dark:bg-gray-900 rounded-2xl p-6 border dark:border-gray-800 shadow-lg">
                        <h2 className="text-lg font-semibold mb-4">Water Settings</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Unit</label>
                                <select
                                    value={settings.unit}
                                    onChange={(e) => handleUpdateSettings({ unit: e.target.value as "oz" | "ml" })}
                                    className="w-full px-4 py-2 border dark:border-gray-700 rounded-lg dark:bg-gray-800"
                                >
                                    <option value="oz">Ounces (oz)</option>
                                    <option value="ml">Milliliters (ml)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Reminders</label>
                                <div className="flex items-center space-x-3">
                                    <input
                                        type="checkbox"
                                        checked={settings.reminders_enabled}
                                        onChange={(e) => handleUpdateSettings({ reminders_enabled: e.target.checked })}
                                        className="w-5 h-5"
                                    />
                                    <span>Enable water reminders</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Reminder Interval (hours)</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="6"
                                    value={settings.reminder_interval_hours}
                                    onChange={(e) => handleUpdateSettings({ reminder_interval_hours: parseInt(e.target.value) || 2 })}
                                    className="w-full px-4 py-2 border dark:border-gray-700 rounded-lg dark:bg-gray-800"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Daily Goal Display - Prominent */}
                <div className="mb-6 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl p-6 text-white shadow-lg">
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <p className="text-sm opacity-90 mb-2">Daily Goal</p>
                                <div className="flex items-baseline gap-2">
                                    <input
                                        type="number"
                                        inputMode="numeric"
                                        value={goalInput}
                                        onChange={(e) => handleGoalChange(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                handleSaveGoal();
                                            }
                                        }}
                                        onBlur={handleSaveGoal}
                                        className="bg-white/20 border border-white/30 rounded-lg px-3 py-2 text-2xl font-bold text-white w-28 focus:outline-none focus:ring-2 focus:ring-white/50"
                                        placeholder={unit === "oz" ? settings.daily_goal_oz.toString() : settings.daily_goal_ml.toString()}
                                    />
                                    <span className="text-lg opacity-90">{unit}</span>
                                    {goalHasChanges && (
                                        <button
                                            onClick={handleSaveGoal}
                                            className="ml-2 px-3 py-1 bg-white/30 hover:bg-white/40 rounded-lg text-sm font-medium transition-colors"
                                        >
                                            Save
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-sm opacity-90 mb-1">Today</p>
                                <p className="text-2xl font-bold">{current.toFixed(0)} {unit}</p>
                            </div>
                        </div>
                        
                        {/* Preset Goal Buttons */}
                        <div className="flex flex-wrap gap-2 pt-2 border-t border-white/20">
                            <p className="text-xs opacity-75 w-full mb-1">Quick Set:</p>
                            {unit === "oz" ? (
                                <>
                                    <button
                                        onClick={() => handlePresetGoal(64)}
                                        className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        64 oz (8 cups)
                                    </button>
                                    <button
                                        onClick={() => handlePresetGoal(80)}
                                        className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        80 oz
                                    </button>
                                    <button
                                        onClick={() => handlePresetGoal(96)}
                                        className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        96 oz
                                    </button>
                                    <button
                                        onClick={() => handlePresetGoal(128)}
                                        className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        128 oz (1 gallon)
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={() => handlePresetGoal(1920)}
                                        className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        1.9L (8 cups)
                                    </button>
                                    <button
                                        onClick={() => handlePresetGoal(2400)}
                                        className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        2.4L
                                    </button>
                                    <button
                                        onClick={() => handlePresetGoal(3000)}
                                        className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        3L
                                    </button>
                                    <button
                                        onClick={() => handlePresetGoal(3785)}
                                        className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        3.8L (1 gallon)
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Main Water Bottle Visual */}
                <div className="mb-8 bg-white dark:bg-gray-900 rounded-3xl p-8 border dark:border-gray-800 shadow-xl">
                    <div className="flex flex-col items-center">
                        {/* Water Bottle */}
                        <div className="relative w-48 h-96 mb-6">
                            {/* Bottle Outline */}
                            <div className="absolute inset-0 border-8 border-blue-300 dark:border-blue-700 rounded-t-3xl rounded-b-2xl bg-white dark:bg-gray-800"></div>
                            
                            {/* Water Fill */}
                            <div 
                                className="absolute bottom-0 left-0 right-0 rounded-b-xl transition-all duration-1000 ease-out"
                                style={{
                                    height: `${Math.min(progressPercent, 100)}%`,
                                    background: isGoalMet 
                                        ? "linear-gradient(to top, #10b981, #34d399, #6ee7b7)"
                                        : "linear-gradient(to top, #0ea5e9, #38bdf8, #7dd3fc)",
                                    borderRadius: "0 0 0.75rem 0.75rem"
                                }}
                            >
                                {/* Water Ripple Effect */}
                                <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-white/30 to-transparent"></div>
                            </div>
                            
                            {/* Goal Met Celebration */}
                            {isGoalMet && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="text-6xl animate-bounce">🎉</div>
                                </div>
                            )}
                            
                            {/* Amount Display */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
                                <div className="text-4xl font-bold text-gray-800 dark:text-white mb-1">
                                    {current.toFixed(0)}
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-400 uppercase">
                                    {unit}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                                    of {goal.toFixed(0)} {unit}
                                </div>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full max-w-md">
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-gray-600 dark:text-gray-400">Progress</span>
                                <span className="font-semibold text-blue-600 dark:text-blue-400">
                                    {progressPercent.toFixed(0)}%
                                </span>
                            </div>
                            <div className="w-full h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div 
                                    className="h-full transition-all duration-1000 ease-out rounded-full"
                                    style={{
                                        width: `${progressPercent}%`,
                                        background: isGoalMet 
                                            ? "linear-gradient(to right, #10b981, #34d399)"
                                            : "linear-gradient(to right, #0ea5e9, #38bdf8)"
                                    }}
                                ></div>
                            </div>
                            {remaining > 0 && (
                                <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-2">
                                    {remaining.toFixed(0)} {unit} remaining today
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Quick Add Buttons */}
                <div className="mb-8 bg-white dark:bg-gray-900 rounded-2xl p-6 border dark:border-gray-800 shadow-lg">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Plus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        Quick Add
                    </h2>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                        {quickAddSizes.map((size) => (
                            <button
                                key={size}
                                onClick={() => handleAddWater(size)}
                                className="group relative p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl hover:border-blue-400 dark:hover:border-blue-600 hover:scale-105 transition-all duration-200 active:scale-95"
                            >
                                <Droplet className="w-6 h-6 text-blue-600 dark:text-blue-400 mx-auto mb-1 group-hover:animate-bounce" />
                                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                    +{size}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {unit}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Stats Cards */}
                {stats && (
                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border dark:border-gray-800">
                            <div className="flex items-center gap-2 mb-2">
                                <Award className="w-5 h-5 text-orange-500" />
                                <span className="text-sm text-gray-600 dark:text-gray-400">Current Streak</span>
                            </div>
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                {stats.current_streak}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-500">days</div>
                        </div>
                        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border dark:border-gray-800">
                            <div className="flex items-center gap-2 mb-2">
                                <TrendingUp className="w-5 h-5 text-green-500" />
                                <span className="text-sm text-gray-600 dark:text-gray-400">Goal Completion</span>
                            </div>
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                {stats.goal_completion_rate.toFixed(0)}%
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-500">last 30 days</div>
                        </div>
                    </div>
                )}

                {/* Recent Entries */}
                {intake.entries.length > 0 && (
                    <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border dark:border-gray-800 shadow-lg">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            Today's Intake
                        </h2>
                        <div className="space-y-2">
                            {intake.entries.slice().reverse().map((entry, index) => (
                                <div
                                    key={index}
                                    className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg"
                                >
                                    <div className="flex items-center gap-3">
                                        <Droplet className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                        <span className="font-semibold text-gray-900 dark:text-white">
                                            {unit === "oz" ? entry.amount_oz.toFixed(0) : entry.amount_ml.toFixed(0)} {unit}
                                        </span>
                                    </div>
                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                        {entry.time}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <BottomNav />
        </div>
    );
}

