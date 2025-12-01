"use client";

import { useEffect, useState } from "react";
import { generateSchedule, defaultSettings } from "@/utils/api";
import { Schedule, ScheduledItem, UserSettings } from "@/types";
import { ScheduleCard } from "@/components/ScheduleCard";
import { format, isSameDay, parseISO } from "date-fns";
import { Settings, Calendar as CalendarIcon, Droplets, Sun } from "lucide-react";
import { clsx } from "clsx";

export default function Home() {
    const [schedule, setSchedule] = useState<Schedule | null>(null);
    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState<UserSettings>(defaultSettings);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [mode, setMode] = useState<"light" | "sweaty">("light");

    useEffect(() => {
        async function loadSchedule() {
            setLoading(true);
            try {
                const newSettings = { ...settings, electrolyte_intensity: mode };
                const data = await generateSchedule(newSettings);
                setSchedule(data);
            } catch (error) {
                console.error("Failed to load schedule", error);
            } finally {
                setLoading(false);
            }
        }
        loadSchedule();
    }, [mode, settings]);

    const todayStr = format(selectedDate, "yyyy-MM-dd");
    const daysItems = schedule ? schedule[todayStr] || [] : [];
    const sortedItems = [...daysItems].sort((a, b) =>
        new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime()
    );

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
                        {sortedItems.length} supplements scheduled for today
                    </p>
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
                            sortedItems.map((item, index) => (
                                <ScheduleCard key={`${item.item.name}-${index}`} item={item} />
                            ))
                        ) : (
                            <div className="text-center py-12 bg-white rounded-xl border border-dashed">
                                <p className="text-gray-500">No supplements scheduled for this day.</p>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
