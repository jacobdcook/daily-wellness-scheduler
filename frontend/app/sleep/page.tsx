"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Moon, ArrowLeft, Plus, Trash2, Star, TrendingUp, Clock, Calendar } from "lucide-react";
import { 
    getSleepEntries, 
    createSleepEntry, 
    deleteSleepEntry,
    getSleepStats,
    getSleepSettings,
    updateSleepSettings,
    SleepEntry,
    SleepStats,
    SleepSettings
} from "@/utils/api";
import { BottomNav } from "@/components/BottomNav";
import { useToast } from "@/context/ToastContext";
import { format, parseISO, subDays } from "date-fns";

export default function SleepPage() {
    const router = useRouter();
    const { data: session } = useSession();
    const { showToast } = useToast();
    const [entries, setEntries] = useState<SleepEntry[]>([]);
    const [stats, setStats] = useState<SleepStats | null>(null);
    const [settings, setSettings] = useState<SleepSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newEntry, setNewEntry] = useState({
        date: format(subDays(new Date(), 1), "yyyy-MM-dd"), // Default to last night
        bedtime: "22:00",
        wake_time: "07:00",
        quality_rating: 3,
        notes: "",
    });

    useEffect(() => {
        if (session) {
            loadData();
        }
    }, [session]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [entriesData, statsData, settingsData] = await Promise.all([
                getSleepEntries(30),
                getSleepStats(30),
                getSleepSettings(),
            ]);
            setEntries(entriesData.entries);
            setStats(statsData);
            setSettings(settingsData);
        } catch (error) {
            console.error("Failed to load sleep data:", error);
            showToast("Failed to load sleep data", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleAddEntry = async () => {
        if (!newEntry.bedtime || !newEntry.wake_time) {
            showToast("Please enter both bedtime and wake time", "error");
            return;
        }

        try {
            await createSleepEntry(newEntry);
            showToast("Sleep entry saved! 🌙", "success");
            setShowAddModal(false);
            setNewEntry({
                date: format(subDays(new Date(), 1), "yyyy-MM-dd"),
                bedtime: "22:00",
                wake_time: "07:00",
                quality_rating: 3,
                notes: "",
            });
            loadData();
        } catch (error) {
            console.error("Failed to save sleep entry:", error);
            showToast("Failed to save sleep entry", "error");
        }
    };

    const handleDeleteEntry = async (entryId: string) => {
        if (!confirm("Delete this sleep entry?")) return;

        try {
            await deleteSleepEntry(entryId);
            showToast("Sleep entry deleted", "success");
            loadData();
        } catch (error) {
            console.error("Failed to delete sleep entry:", error);
            showToast("Failed to delete sleep entry", "error");
        }
    };

    const handleUpdateSettings = async (updates: Partial<SleepSettings>) => {
        if (!settings) return;

        try {
            const updated = { ...settings, ...updates };
            await updateSleepSettings(updates);
            setSettings(updated);
            showToast("Settings saved!", "success");
        } catch (error) {
            console.error("Failed to update settings:", error);
            showToast("Failed to update settings", "error");
        }
    };

    const calculateDuration = (bedtime: string, wakeTime: string): number => {
        const [bedHour, bedMin] = bedtime.split(":").map(Number);
        const [wakeHour, wakeMin] = wakeTime.split(":").map(Number);
        
        let bedMinutes = bedHour * 60 + bedMin;
        let wakeMinutes = wakeHour * 60 + wakeMin;
        
        if (wakeMinutes <= bedMinutes) {
            wakeMinutes += 24 * 60; // Next day
        }
        
        return (wakeMinutes - bedMinutes) / 60;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
                <div className="text-white text-xl">Loading sleep data...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 pb-20">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-slate-900/80 backdrop-blur-sm border-b border-purple-500/20">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2 hover:bg-purple-500/20 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-6 h-6 text-white" />
                    </button>
                    <Moon className="w-8 h-8 text-purple-400" />
                    <h1 className="text-2xl font-bold text-white flex-1">Sleep Tracking</h1>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="p-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                    >
                        <Plus className="w-6 h-6 text-white" />
                    </button>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
                {/* Stats Overview */}
                {stats && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-purple-500/20">
                            <div className="text-purple-400 text-sm mb-1">Avg Duration</div>
                            <div className="text-2xl font-bold text-white">
                                {stats.average_duration ? `${stats.average_duration.toFixed(1)}h` : "—"}
                            </div>
                        </div>
                        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-purple-500/20">
                            <div className="text-purple-400 text-sm mb-1">Avg Quality</div>
                            <div className="text-2xl font-bold text-white flex items-center gap-1">
                                {stats.average_quality ? (
                                    <>
                                        {stats.average_quality.toFixed(1)}
                                        <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                                    </>
                                ) : "—"}
                            </div>
                        </div>
                        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-purple-500/20">
                            <div className="text-purple-400 text-sm mb-1">Total Nights</div>
                            <div className="text-2xl font-bold text-white">{stats.total_nights}</div>
                        </div>
                        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-purple-500/20">
                            <div className="text-purple-400 text-sm mb-1">Consistency</div>
                            <div className="text-2xl font-bold text-white">
                                {stats.consistency_score !== null ? `${stats.consistency_score.toFixed(0)}%` : "—"}
                            </div>
                        </div>
                    </div>
                )}

                {/* Target Sleep Hours */}
                {settings && (
                    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-purple-500/20">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-purple-400 text-sm mb-1">Target Sleep Hours</div>
                                <div className="text-2xl font-bold text-white">{settings.target_sleep_hours}h</div>
                            </div>
                            <div className="flex gap-2">
                                {[7, 8, 9].map(hours => (
                                    <button
                                        key={hours}
                                        onClick={() => handleUpdateSettings({ target_sleep_hours: hours })}
                                        className={`px-4 py-2 rounded-lg transition-colors ${
                                            settings.target_sleep_hours === hours
                                                ? "bg-purple-600 text-white"
                                                : "bg-slate-700 text-gray-300 hover:bg-slate-600"
                                        }`}
                                    >
                                        {hours}h
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Recent Entries */}
                <div>
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-purple-400" />
                        Recent Sleep
                    </h2>
                    <div className="space-y-3">
                        {entries.length === 0 ? (
                            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-8 text-center border border-purple-500/20">
                                <Moon className="w-12 h-12 text-purple-400 mx-auto mb-4 opacity-50" />
                                <p className="text-gray-400">No sleep entries yet. Add your first entry!</p>
                            </div>
                        ) : (
                            entries.map(entry => {
                                const entryDate = parseISO(entry.date);
                                const duration = entry.sleep_duration_hours || calculateDuration(entry.bedtime, entry.wake_time);
                                
                                return (
                                    <div
                                        key={entry.id}
                                        className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-purple-500/20"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <div className="text-white font-semibold">
                                                        {format(entryDate, "MMM d, yyyy")}
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        {[...Array(5)].map((_, i) => (
                                                            <Star
                                                                key={i}
                                                                className={`w-4 h-4 ${
                                                                    i < entry.quality_rating
                                                                        ? "text-yellow-400 fill-yellow-400"
                                                                        : "text-gray-600"
                                                                }`}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-3 gap-4 text-sm">
                                                    <div>
                                                        <div className="text-purple-400">Bedtime</div>
                                                        <div className="text-white font-medium">{entry.bedtime}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-purple-400">Wake Time</div>
                                                        <div className="text-white font-medium">{entry.wake_time}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-purple-400">Duration</div>
                                                        <div className="text-white font-medium">{duration.toFixed(1)}h</div>
                                                    </div>
                                                </div>
                                                {entry.notes && (
                                                    <div className="mt-2 text-gray-400 text-sm">{entry.notes}</div>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => handleDeleteEntry(entry.id)}
                                                className="p-2 hover:bg-red-500/20 rounded-lg transition-colors ml-4"
                                            >
                                                <Trash2 className="w-5 h-5 text-red-400" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* Add Entry Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full border border-purple-500/20">
                        <h2 className="text-xl font-bold text-white mb-4">Log Sleep</h2>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-purple-400 text-sm mb-2">Date (Night of)</label>
                                <input
                                    type="date"
                                    value={newEntry.date}
                                    onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })}
                                    className="w-full bg-slate-700 text-white rounded-lg px-4 py-2 border border-purple-500/20 focus:border-purple-500 focus:outline-none"
                                />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-purple-400 text-sm mb-2">Bedtime</label>
                                    <input
                                        type="time"
                                        value={newEntry.bedtime}
                                        onChange={(e) => setNewEntry({ ...newEntry, bedtime: e.target.value })}
                                        className="w-full bg-slate-700 text-white rounded-lg px-4 py-2 border border-purple-500/20 focus:border-purple-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-purple-400 text-sm mb-2">Wake Time</label>
                                    <input
                                        type="time"
                                        value={newEntry.wake_time}
                                        onChange={(e) => setNewEntry({ ...newEntry, wake_time: e.target.value })}
                                        className="w-full bg-slate-700 text-white rounded-lg px-4 py-2 border border-purple-500/20 focus:border-purple-500 focus:outline-none"
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-purple-400 text-sm mb-2">Quality Rating</label>
                                <div className="flex gap-2">
                                    {[1, 2, 3, 4, 5].map(rating => (
                                        <button
                                            key={rating}
                                            onClick={() => setNewEntry({ ...newEntry, quality_rating: rating })}
                                            className={`flex-1 py-2 rounded-lg transition-colors ${
                                                newEntry.quality_rating === rating
                                                    ? "bg-purple-600 text-white"
                                                    : "bg-slate-700 text-gray-300 hover:bg-slate-600"
                                            }`}
                                        >
                                            {rating} ⭐
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-purple-400 text-sm mb-2">Notes (Optional)</label>
                                <textarea
                                    value={newEntry.notes}
                                    onChange={(e) => setNewEntry({ ...newEntry, notes: e.target.value })}
                                    placeholder="How did you sleep?"
                                    className="w-full bg-slate-700 text-white rounded-lg px-4 py-2 border border-purple-500/20 focus:border-purple-500 focus:outline-none resize-none"
                                    rows={3}
                                />
                            </div>
                        </div>
                        
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddEntry}
                                className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <BottomNav />
        </div>
    );
}

