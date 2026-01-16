"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { TrendingUp, Plus, ArrowLeft, Trash2, Edit2, Check, X, Flame, Target, Calendar } from "lucide-react";
import { 
    getHabits, 
    createHabit, 
    updateHabit,
    deleteHabit, 
    toggleHabitEntry,
    getHabitStats,
    Habit,
    HabitStats
} from "@/utils/api";
import { BottomNav } from "@/components/BottomNav";
import { useToast } from "@/context/ToastContext";
import { format } from "date-fns";

const HABIT_COLORS = [
    "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6",
    "#EC4899", "#06B6D4", "#84CC16", "#F97316", "#6366F1"
];

export default function HabitsPage() {
    const router = useRouter();
    const { data: session } = useSession();
    const { showToast } = useToast();
    const [habits, setHabits] = useState<Habit[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);
    const [habitStats, setHabitStats] = useState<Record<string, HabitStats>>({});
    const [newHabit, setNewHabit] = useState({
        name: "",
        description: "",
        color: HABIT_COLORS[0],
        reminder_time: "",
        reminder_enabled: false,
    });

    useEffect(() => {
        if (session) {
            loadData();
        }
    }, [session]);

    const loadData = async () => {
        try {
            setLoading(true);
            const habitsData = await getHabits();
            setHabits(habitsData.habits.filter(h => h.enabled));
            
            // Load stats for all habits
            const statsPromises = habitsData.habits.map(habit => 
                getHabitStats(habit.id).then(stats => [habit.id, stats] as const)
            );
            const statsResults = await Promise.all(statsPromises);
            const statsMap: Record<string, HabitStats> = {};
            statsResults.forEach(([id, stats]) => {
                statsMap[id] = stats;
            });
            setHabitStats(statsMap);
        } catch (error) {
            console.error("Failed to load habits:", error);
            showToast("Failed to load habits", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleToggleHabit = async (habit: Habit) => {
        const today = format(new Date(), "yyyy-MM-dd");
        const newCompleted = !habit.today_completed;
        
        try {
            await toggleHabitEntry(habit.id, today, newCompleted);
            showToast(newCompleted ? "Habit completed! 🔥" : "Habit unchecked", "success");
            loadData();
        } catch (error) {
            console.error("Failed to toggle habit:", error);
            showToast("Failed to update habit", "error");
        }
    };

    const handleAddHabit = async () => {
        if (!newHabit.name.trim()) {
            showToast("Please enter a habit name", "error");
            return;
        }

        try {
            await createHabit({
                ...newHabit,
                enabled: true,
            });
            showToast("Habit created!", "success");
            setShowAddModal(false);
            setNewHabit({ name: "", description: "", color: HABIT_COLORS[0], reminder_time: "", reminder_enabled: false });
            loadData();
        } catch (error) {
            console.error("Failed to create habit:", error);
            showToast("Failed to create habit", "error");
        }
    };

    const handleDeleteHabit = async (habitId: string) => {
        if (!confirm("Are you sure you want to delete this habit? This will also delete all its history.")) return;

        try {
            await deleteHabit(habitId);
            showToast("Habit deleted", "success");
            loadData();
        } catch (error) {
            console.error("Failed to delete habit:", error);
            showToast("Failed to delete habit", "error");
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-gray-100">
            <header className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b dark:border-gray-800 fixed top-0 left-0 right-0 z-50">
                <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={() => router.back()}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        </button>
                        <TrendingUp className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                        <h1 className="font-bold text-xl tracking-tight">Habits</h1>
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                    >
                        <Plus size={20} />
                    </button>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4 py-8 pt-24 pb-24">
                {loading ? (
                    <div className="text-center py-12 text-gray-500">Loading...</div>
                ) : habits.length === 0 ? (
                    <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-xl border border-dashed dark:border-gray-800">
                        <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500 dark:text-gray-400 mb-4">No habits yet</p>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                        >
                            Create Your First Habit
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {habits.map((habit) => {
                            const stats = habitStats[habit.id];
                            return (
                                <div
                                    key={habit.id}
                                    className="bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-800 p-4"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3 flex-1">
                                            <div
                                                className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                                                style={{ backgroundColor: habit.color }}
                                            >
                                                {habit.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="font-semibold text-lg">{habit.name}</h3>
                                                {habit.description && (
                                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                                        {habit.description}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteHabit(habit.id)}
                                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>

                                    {/* Stats */}
                                    {stats && (
                                        <div className="grid grid-cols-3 gap-3 mb-4">
                                            <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                                <div className="flex items-center justify-center gap-1 text-orange-500 mb-1">
                                                    <Flame size={16} />
                                                </div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">Streak</p>
                                                <p className="text-lg font-bold">{stats.current_streak}</p>
                                            </div>
                                            <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                                <div className="flex items-center justify-center gap-1 text-blue-500 mb-1">
                                                    <Target size={16} />
                                                </div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">Rate</p>
                                                <p className="text-lg font-bold">{stats.completion_rate}%</p>
                                            </div>
                                            <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                                <div className="flex items-center justify-center gap-1 text-purple-500 mb-1">
                                                    <Calendar size={16} />
                                                </div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">Best</p>
                                                <p className="text-lg font-bold">{stats.longest_streak}</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Today's Check */}
                                    <button
                                        onClick={() => handleToggleHabit(habit)}
                                        className={`w-full py-3 rounded-lg font-medium transition-all ${
                                            habit.today_completed
                                                ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-2 border-green-500"
                                                : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-2 border-gray-300 dark:border-gray-700 hover:border-primary-500"
                                        }`}
                                    >
                                        <div className="flex items-center justify-center gap-2">
                                            {habit.today_completed ? (
                                                <>
                                                    <Check size={20} />
                                                    <span>Completed Today</span>
                                                </>
                                            ) : (
                                                <>
                                                    <X size={20} />
                                                    <span>Mark as Complete</span>
                                                </>
                                            )}
                                        </div>
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* Add Habit Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold mb-4">Create New Habit</h2>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Habit Name *</label>
                                <input
                                    type="text"
                                    value={newHabit.name}
                                    onChange={(e) => setNewHabit({ ...newHabit, name: e.target.value })}
                                    className="w-full px-4 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                                    placeholder="e.g., Meditate, Exercise, Read"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Description (optional)</label>
                                <textarea
                                    value={newHabit.description}
                                    onChange={(e) => setNewHabit({ ...newHabit, description: e.target.value })}
                                    className="w-full px-4 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                                    rows={2}
                                    placeholder="Add a description..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Color</label>
                                <div className="flex gap-2 flex-wrap">
                                    {HABIT_COLORS.map((color) => (
                                        <button
                                            key={color}
                                            onClick={() => setNewHabit({ ...newHabit, color })}
                                            className={`w-10 h-10 rounded-lg border-2 transition-all ${
                                                newHabit.color === color
                                                    ? "border-gray-900 dark:border-white scale-110"
                                                    : "border-gray-300 dark:border-gray-700"
                                            }`}
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => {
                                    setShowAddModal(false);
                                    setNewHabit({ name: "", description: "", color: HABIT_COLORS[0], reminder_time: "", reminder_enabled: false });
                                }}
                                className="flex-1 px-4 py-2 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddHabit}
                                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                            >
                                Create Habit
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <BottomNav />
        </div>
    );
}

