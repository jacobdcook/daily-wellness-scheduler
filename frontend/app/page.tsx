"use client";

import { useEffect, useState, useRef } from "react";
import { getSchedule, defaultSettings, loadSettings, saveSettings, loadProgress, saveProgress, checkMissedItems, checkUpcomingSupplements, regenerateSchedule, updateItem, deleteItem } from "@/utils/api";
import { Schedule, ScheduledItem, UserSettings } from "@/types";
import { ScheduleCard, ItemState } from "@/components/ScheduleCard";
import { SettingsPanel } from "@/components/SettingsPanel";
import { EditItemModal } from "@/components/EditItemModal";
import { WeekView } from "@/components/WeekView";
import { SixWeekView } from "@/components/SixWeekView";
import { format, isSameDay, parseISO, addDays, subDays } from "date-fns";
import { Settings, Calendar as CalendarIcon, Droplets, Sun, ChevronLeft, ChevronRight, AlignJustify, Grid } from "lucide-react";
import { clsx } from "clsx";

export default function Home() {
    const [schedule, setSchedule] = useState<Schedule | null>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [settings, setSettings] = useState<UserSettings>(defaultSettings);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<ScheduledItem | null>(null);
    const [progress, setProgress] = useState<Record<string, Record<string, number>>>({});
    const [view, setView] = useState<"today" | "week" | "six-week">("today");
    const notifiedItemsRef = useRef<Set<string>>(new Set());
    const hasCheckedMissedRef = useRef(false);
    
    const mode = (settings.electrolyte_intensity as "light" | "sweaty") || "light";

    // Load settings and progress on mount
    useEffect(() => {
        async function initData() {
            try {
                const [loadedSettings, loadedProgress] = await Promise.all([
                    loadSettings(),
                    loadProgress()
                ]);
                setSettings(loadedSettings);
                setProgress(loadedProgress);
            } catch (error) {
                console.error("Failed to load data", error);
            }
        }
        initData();
    }, []);

    useEffect(() => {
        async function loadSchedule() {
            setLoading(true);
            try {
                // Use getSchedule to load persistent schedule (or generate if missing)
                const data = await getSchedule(settings);
                setSchedule(data);
            } catch (error) {
                console.error("Failed to load schedule", error);
            } finally {
                setLoading(false);
            }
        }
        loadSchedule();
    }, []); // Only run on mount (and when manually refreshed via regeneration)

    const handleRegenerate = async () => {
        if (!confirm("This will overwrite your current schedule with a new one based on your settings. Any manual edits will be lost. Continue?")) {
            return;
        }
        setProcessing(true);
        try {
            const data = await regenerateSchedule(settings);
            setSchedule(data);
        } catch (error) {
            console.error("Failed to regenerate schedule", error);
            alert("Failed to regenerate schedule. Please try again.");
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
            // Use refs to get current values without causing re-renders
            checkUpcomingSupplements(schedule, progressRef.current, notifiedItemsRef.current).then((result: { status: string; notified_items: string[]; sent_count?: number }) => {
                if (result.status === "checked" && result.notified_items) {
                    notifiedItemsRef.current = new Set(result.notified_items);
                    if (result.sent_count && result.sent_count > 0) {
                        console.log(`Sent ${result.sent_count} upcoming supplement notifications`);
                    }
                }
            });
        };

        // Check immediately on mount
        checkUpcoming();

        // Then check every 60 seconds
        const interval = setInterval(checkUpcoming, 60000);

        return () => clearInterval(interval);
    }, [schedule]); // Only depend on schedule - use refs for progress and notifiedItems

    const handleSettingsSave = async (newSettings: UserSettings) => {
        setSettings(newSettings);
        setIsSettingsOpen(false);
        setProcessing(true);
        try {
            await saveSettings(newSettings);
            // We don't automatically regenerate anymore to preserve manual edits
        } catch (error) {
            console.error("Failed to save settings", error);
            alert("Failed to save settings.");
        } finally {
            setProcessing(false);
        }
    };

    const handleProgressChange = async (itemId: string, newState: ItemState) => {
        const todayKey = format(selectedDate, "yyyy-MM-dd");
        const stateValue = newState === "pending" ? 0 : newState === "in_progress" ? 1 : 2;
        
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
        }
    };

    const handleItemUpdate = async (itemId: string, updates: any) => {
        const dateKey = format(selectedDate, "yyyy-MM-dd");
        try {
            const newSchedule = await updateItem(dateKey, itemId, updates);
            setSchedule(newSchedule);
        } catch (error) {
            console.error("Failed to update item", error);
            alert("Failed to update item");
        }
    };

    const handleItemDelete = async (itemId: string) => {
        const dateKey = format(selectedDate, "yyyy-MM-dd");
        try {
            const newSchedule = await deleteItem(dateKey, itemId);
            setSchedule(newSchedule);
        } catch (error) {
            console.error("Failed to delete item", error);
            alert("Failed to delete item");
        }
    };

    const todayStr = format(selectedDate, "yyyy-MM-dd");
    const daysItems = schedule ? schedule[todayStr] || [] : [];
    const sortedItems = [...daysItems].sort((a, b) =>
        new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime()
    );

    // Calculate progress percentage
    const totalItems = sortedItems.length;
    const todayProgress = progress[todayStr] || {};
    const completedCount = Object.values(todayProgress).filter(v => v === 2).length;
    const percentComplete = totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
            {/* Header */}
            <header className="bg-white border-b sticky top-0 z-10">
                <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
                            W
                        </div>
                        <h1 className="font-bold text-xl tracking-tight">Wellness Scheduler</h1>
                    </div>

                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => {
                                const newMode = mode === "light" ? "sweaty" : "light";
                                setSettings({ ...settings, electrolyte_intensity: newMode });
                            }}
                            className={clsx(
                                "px-3 py-1.5 rounded-full text-sm font-medium flex items-center transition-colors",
                                mode === "sweaty"
                                    ? "bg-orange-100 text-orange-700 hover:bg-orange-200"
                                    : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                            )}
                        >
                            {mode === "sweaty" ? <Droplets size={16} className="mr-1.5" /> : <Sun size={16} className="mr-1.5" />}
                            {mode === "sweaty" ? "Sweaty Day" : "Light Day"}
                        </button>
                        
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log("SETTINGS BUTTON CLICKED!");
                                alert("Settings button was clicked!");
                                setIsSettingsOpen(true);
                            }}
                            className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors relative z-20"
                            aria-label="Open settings"
                        >
                            <Settings size={20} />
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4 py-8">
                {/* Navigation and View Toggle */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    {/* Date Navigation */}
                    <div className="flex items-center justify-between bg-white rounded-xl p-1 border shadow-sm">
                        <button 
                            onClick={() => setSelectedDate(subDays(selectedDate, 1))}
                            className="p-2 hover:bg-gray-50 rounded-lg text-gray-600"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <div className="flex items-center px-4 font-medium text-gray-900">
                            <CalendarIcon size={18} className="mr-2 text-blue-600" />
                            {format(selectedDate, "MMM do")}
                        </div>
                        <button 
                            onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                            className="p-2 hover:bg-gray-50 rounded-lg text-gray-600"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>

                    {/* View Tabs */}
                    <div className="flex bg-gray-100 p-1 rounded-xl">
                        <button
                            onClick={() => setView("today")}
                            className={clsx(
                                "px-4 py-1.5 text-sm font-medium rounded-lg transition-all",
                                view === "today" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                            )}
                        >
                            Today
                        </button>
                        <button
                            onClick={() => setView("week")}
                            className={clsx(
                                "px-4 py-1.5 text-sm font-medium rounded-lg transition-all",
                                view === "week" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                            )}
                        >
                            Week
                        </button>
                        <button
                            onClick={() => setView("six-week")}
                            className={clsx(
                                "px-4 py-1.5 text-sm font-medium rounded-lg transition-all",
                                view === "six-week" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                            )}
                        >
                            6-Week
                        </button>
                    </div>
                </div>

                {/* Content Views */}
                {view === "today" && (
                    <div>
                        <div className="mb-6">
                            <h2 className="text-3xl font-bold text-gray-900 mb-1">
                                {format(selectedDate, "EEEE, MMMM do")}
                            </h2>
                            <p className="text-gray-500">
                                {sortedItems.length} supplements scheduled for today
                            </p>
                            
                            {/* Progress Bar */}
                            {sortedItems.length > 0 && (
                                <div className="mt-4">
                                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                                        <span>Progress</span>
                                        <span>{percentComplete}% ({completedCount}/{totalItems})</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                                        <div 
                                            className="bg-green-500 h-2.5 rounded-full transition-all duration-500" 
                                            style={{ width: `${percentComplete}%` }}
                                        ></div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Schedule List */}
                        {loading ? (
                            <div className="space-y-4">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="h-24 bg-white rounded-xl animate-pulse" />
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {sortedItems.length > 0 ? (
                                    sortedItems.map((item, index) => {
                                        const itemKey = `${item.item.name}-${index}`;
                                        const todayKey = format(selectedDate, "yyyy-MM-dd");
                                        const stateValue = (progress[todayKey] || {})[itemKey] || 0;
                                        const state: ItemState = stateValue === 0 ? "pending" : stateValue === 1 ? "in_progress" : "completed";
                                        
                                        return (
                                            <ScheduleCard 
                                                key={itemKey} 
                                                item={item} 
                                                state={state}
                                                onStateChange={(newState) => handleProgressChange(itemKey, newState)}
                                                onEdit={() => setEditingItem(item)}
                                            />
                                        );
                                    })
                                ) : (
                                    <div className="text-center py-12 bg-white rounded-xl border border-dashed">
                                        <p className="text-gray-500">No supplements scheduled for this day.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {view === "week" && (
                    <WeekView 
                        selectedDate={selectedDate} 
                        schedule={schedule} 
                        progress={progress}
                        settings={settings}
                    />
                )}

                {view === "six-week" && (
                    <SixWeekView 
                        schedule={schedule} 
                        progress={progress}
                    />
                )}
            </main>

            {/* Edit Item Modal */}
            <EditItemModal
                isOpen={!!editingItem}
                onClose={() => setEditingItem(null)}
                item={editingItem}
                onSave={handleItemUpdate}
                onDelete={handleItemDelete}
            />

            {/* Processing Overlay */}
            {processing && (
                <div className="fixed inset-0 bg-black/20 z-[20000] flex items-center justify-center backdrop-blur-sm">
                    <div className="bg-white p-4 rounded-xl shadow-xl flex items-center gap-3">
                        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        <span className="font-medium text-gray-700">Processing...</span>
                    </div>
                </div>
            )}

            {/* Processing Overlay */}
            {processing && (
                <div className="fixed inset-0 bg-black/20 z-[20000] flex items-center justify-center backdrop-blur-sm">
                    <div className="bg-white p-4 rounded-xl shadow-xl flex items-center gap-3">
                        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        <span className="font-medium text-gray-700">Processing...</span>
                    </div>
                </div>
            )}

            {/* Settings Panel */}
            <SettingsPanel
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                settings={settings}
                onSave={handleSettingsSave}
                onRegenerate={handleRegenerate}
            />
        </div>
    );
}
