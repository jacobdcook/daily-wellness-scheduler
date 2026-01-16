"use client";

import { useEffect, useState } from "react";
import { getSchedule, defaultSettings, loadProgress, saveProgress } from "@/utils/api";
import { Schedule, ScheduledItem, UserSettings, ScheduleItemType } from "@/types";
import { ScheduleCard, ItemState } from "@/components/ScheduleCard";
import { DailyCheckIn } from "@/components/DailyCheckIn";
import { InsightsPanel } from "@/components/InsightsPanel";
import { AddItemTypeModal } from "@/components/AddItemTypeModal";
import { CustomScheduleModal } from "@/components/CustomScheduleModal";
import { format } from "date-fns";
import { Settings, Droplets, Sun, LogOut, Plus, Pill, Utensils, Dumbbell } from "lucide-react";
import { clsx } from "clsx";
import { useSession, signOut } from "next-auth/react";

export default function Home() {
    const { data: session } = useSession();
    const [schedule, setSchedule] = useState<Schedule | null>(null);
    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState<UserSettings>(defaultSettings);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [mode, setMode] = useState<"light" | "sweaty">("light");
    const [progress, setProgress] = useState<Record<string, Record<string, number>>>({});
    const [showAddItemModal, setShowAddItemModal] = useState(false);
    const [showCustomScheduleModal, setShowCustomScheduleModal] = useState(false);
    const [selectedItemType, setSelectedItemType] = useState<ScheduleItemType | undefined>();

    useEffect(() => {
        if (!session) return; // Wait for session

        async function loadData() {
            setLoading(true);
            try {
                const newSettings = { ...settings, electrolyte_intensity: mode };
                const [scheduleData, progressData] = await Promise.all([
                    getSchedule(),
                    loadProgress()
                ]);
                setSchedule(scheduleData);
                setProgress(progressData);
            } catch (error) {
                console.error("Failed to load data", error);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [mode, settings, session]); // Add session dependency

    // ... (handlers)

    const handleStateChange = async (item: ScheduledItem, newState: ItemState) => {
        const dateStr = format(selectedDate, "yyyy-MM-dd");
        const itemId = item.id;

        // Map state string to number for backend (0=pending, 1=in_progress, 2=completed)
        let stateNum = 0;
        if (newState === "in_progress") stateNum = 1;
        if (newState === "completed") stateNum = 2;

        const newProgress = {
            ...progress,
            [dateStr]: {
                ...(progress[dateStr] || {}),
                [itemId]: stateNum
            }
        };

        setProgress(newProgress);
        await saveProgress(newProgress);
    };

    const handleCheckInSave = async (data: { energy: number; mood: number; sleep: number }) => {
        const dateStr = format(selectedDate, "yyyy-MM-dd");
        const newProgress = {
            ...progress,
            [dateStr]: {
                ...(progress[dateStr] || {}),
                ...data
            }
        };
        setProgress(newProgress);
        await saveProgress(newProgress);
    };

    const handleEdit = (item: ScheduledItem) => {
        console.log("Edit item:", item);
        // TODO: Implement edit modal
    };

    const todayStr = format(selectedDate, "yyyy-MM-dd");
    const daysItems = schedule ? schedule[todayStr] || [] : [];
    const sortedItems = [...daysItems].sort((a, b) =>
        new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime()
    );

    const currentDayProgress = progress[todayStr] || {};
    const checkInInitialData = {
        energy: currentDayProgress.energy as number || 0,
        mood: currentDayProgress.mood as number || 0,
        sleep: currentDayProgress.sleep as number || 0
    };

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
            {/* Header */}
            <header className="bg-white border-b sticky top-0 z-10">
                <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
                            W
                        </div>
                        <div>
                            <h1 className="font-bold text-xl tracking-tight leading-none">Wellness Scheduler</h1>
                            {session?.user?.name && (
                                <p className="text-xs text-gray-500">Hi, {session.user.name}</p>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => setMode(mode === "light" ? "sweaty" : "light")}
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
                        <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full">
                            <Settings size={20} />
                        </button>
                        <button
                            onClick={async (e) => {
                                e.preventDefault();
                                try {
                                    await signOut();
                                } catch (error) {
                                    console.error('Logout failed:', error);
                                }
                            }}
                            className="p-2 text-gray-500 hover:bg-red-50 hover:text-red-600 rounded-full"
                            title="Sign Out"
                        >
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4 py-8">
                {/* Date Header */}
                <div className="mb-8">
                    <h2 className="text-3xl font-bold text-gray-900 mb-1">
                        {format(selectedDate, "EEEE, MMMM do")}
                    </h2>
                    <p className="text-gray-500">
                        {sortedItems.length} items scheduled for today
                    </p>
                </div>

                <InsightsPanel correlations={[]} />

                <DailyCheckIn
                    date={todayStr}
                    initialData={checkInInitialData}
                    onSave={handleCheckInSave}
                />

                {/* Quick Add Buttons */}
                <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Quick Add</h3>
                        <button
                            onClick={() => setShowAddItemModal(true)}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                        >
                            <Plus size={16} />
                            More Options
                        </button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <button
                            onClick={() => setShowAddItemModal(true)}
                            className="flex flex-col items-center justify-center p-4 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition-colors"
                        >
                            <Pill className="w-6 h-6 text-green-600 mb-2" />
                            <span className="text-sm font-medium text-green-700">Supplement</span>
                        </button>
                        <button
                            onClick={() => setShowAddItemModal(true)}
                            className="flex flex-col items-center justify-center p-4 bg-orange-50 hover:bg-orange-100 rounded-lg border border-orange-200 transition-colors"
                        >
                            <Utensils className="w-6 h-6 text-orange-600 mb-2" />
                            <span className="text-sm font-medium text-orange-700">Meal</span>
                        </button>
                        <button
                            onClick={() => setShowAddItemModal(true)}
                            className="flex flex-col items-center justify-center p-4 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors"
                        >
                            <Dumbbell className="w-6 h-6 text-red-600 mb-2" />
                            <span className="text-sm font-medium text-red-700">Workout</span>
                        </button>
                        <button
                            onClick={() => setShowAddItemModal(true)}
                            className="flex flex-col items-center justify-center p-4 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
                        >
                            <Droplets className="w-6 h-6 text-blue-600 mb-2" />
                            <span className="text-sm font-medium text-blue-700">Water</span>
                        </button>
                    </div>
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
                                const dateStr = format(selectedDate, "yyyy-MM-dd");
                                const itemProgress = progress[dateStr]?.[item.id] || 0;
                                let state: ItemState = "pending";
                                if (itemProgress === 1) state = "in_progress";
                                if (itemProgress === 2) state = "completed";

                                return (
                                    <ScheduleCard
                                        key={`${item.item.name}-${index}`}
                                        item={item}
                                        state={state}
                                        onStateChange={(newState) => handleStateChange(item, newState)}
                                        onEdit={handleEdit}
                                    />
                                );
                            })
                        ) : (
                            <div className="text-center py-12 bg-white rounded-xl border border-dashed">
                                <p className="text-gray-500">No items scheduled for this day.</p>
                                <p className="text-sm text-gray-400 mt-2">Use the buttons above to add supplements, meals, workouts, or other wellness items.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Add Item Type Modal */}
                <AddItemTypeModal
                    isOpen={showAddItemModal}
                    onClose={() => setShowAddItemModal(false)}
                    onSelectType={(type) => {
                        setSelectedItemType(type);
                        setShowAddItemModal(false);
                        setShowCustomScheduleModal(true);
                    }}
                />

                {/* Custom Schedule Modal */}
                <CustomScheduleModal
                    isOpen={showCustomScheduleModal}
                    onClose={() => setShowCustomScheduleModal(false)}
                    settings={settings}
                    onSave={(newSettings) => {
                        // This would save the settings - for now just close
                        setShowCustomScheduleModal(false);
                        setSelectedItemType(undefined);
                    }}
                    selectedItemType={selectedItemType}
                />
            </main>
        </div>
    );
}
