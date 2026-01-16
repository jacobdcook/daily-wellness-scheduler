"use client";

import { BottomNav } from "@/components/BottomNav";
import { Award, Trophy, Target, TrendingUp, Calendar, Flame, ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";
import { getStats } from "@/utils/api";
import { format } from "date-fns";
import { useRouter } from "next/navigation";

export default function AchievementsPage() {
    const router = useRouter();
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            const data = await getStats();
            setStats(data);
        } catch (error) {
            console.error("Failed to load stats:", error);
        } finally {
            setLoading(false);
        }
    };

    const achievements = [
        {
            id: "first_complete",
            title: "First Steps",
            description: "Complete your first supplement",
            icon: Target,
            unlocked: stats?.total_completed && stats.total_completed > 0,
            progress: stats?.total_completed > 0 ? 100 : 0,
        },
        {
            id: "week_streak",
            title: "Week Warrior",
            description: "Maintain a 7-day streak",
            icon: Calendar,
            unlocked: stats?.current_streak && stats.current_streak >= 7,
            progress: stats?.current_streak ? Math.min((stats.current_streak / 7) * 100, 100) : 0,
        },
        {
            id: "month_streak",
            title: "Monthly Master",
            description: "Maintain a 30-day streak",
            icon: Flame,
            unlocked: stats?.current_streak && stats.current_streak >= 30,
            progress: stats?.current_streak ? Math.min((stats.current_streak / 30) * 100, 100) : 0,
        },
        {
            id: "perfect_day",
            title: "Perfect Day",
            description: "Complete 100% of items in a day",
            icon: Trophy,
            unlocked: stats?.best_completion_rate && stats.best_completion_rate >= 100,
            progress: stats?.best_completion_rate ? Math.min(stats.best_completion_rate, 100) : 0,
        },
        {
            id: "hundred_complete",
            title: "Century Club",
            description: "Complete 100 supplements total",
            icon: TrendingUp,
            unlocked: stats?.total_completed && stats.total_completed >= 100,
            progress: stats?.total_completed ? Math.min((stats.total_completed / 100) * 100, 100) : 0,
        },
    ];

    const unlockedCount = achievements.filter(a => a.unlocked).length;

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-black">
                <header className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b dark:border-gray-800 fixed top-0 left-0 right-0 z-50">
                    <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <Award className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                            <h1 className="font-bold text-xl tracking-tight">Achievements</h1>
                        </div>
                    </div>
                </header>
                <main className="max-w-3xl mx-auto px-4 py-8 pt-24 pb-24">
                    <div className="text-center text-gray-500 dark:text-gray-400">Loading...</div>
                </main>
                <BottomNav />
            </div>
        );
    }

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
                        <div className="flex items-center space-x-2">
                            <Award className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                            <h1 className="font-bold text-xl tracking-tight">Achievements</h1>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4 py-8 pt-24 pb-24">
                {/* Stats Overview */}
                <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border dark:border-gray-800 mb-6">
                    <div className="text-center">
                        <div className="text-4xl font-bold text-primary-600 dark:text-primary-400 mb-2">
                            {unlockedCount}/{achievements.length}
                        </div>
                        <p className="text-gray-600 dark:text-gray-400">Achievements Unlocked</p>
                    </div>
                </div>

                {/* Current Stats */}
                {stats && (
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border dark:border-gray-800">
                            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                {stats.current_streak || 0}
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Day Streak</p>
                        </div>
                        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border dark:border-gray-800">
                            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                {stats.total_completed || 0}
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Total Completed</p>
                        </div>
                    </div>
                )}

                {/* Achievements List */}
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">All Achievements</h2>
                    {achievements.map((achievement) => {
                        const Icon = achievement.icon;
                        return (
                            <div
                                key={achievement.id}
                                className={`bg-white dark:bg-gray-900 rounded-xl p-4 border dark:border-gray-800 ${
                                    achievement.unlocked
                                        ? "border-green-300 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10"
                                        : ""
                                }`}
                            >
                                <div className="flex items-start space-x-4">
                                    <div
                                        className={`p-3 rounded-lg ${
                                            achievement.unlocked
                                                ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                                                : "bg-gray-100 dark:bg-gray-800 text-gray-400"
                                        }`}
                                    >
                                        <Icon size={24} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <h3
                                                className={`font-semibold ${
                                                    achievement.unlocked
                                                        ? "text-gray-900 dark:text-gray-100"
                                                        : "text-gray-500 dark:text-gray-400"
                                                }`}
                                            >
                                                {achievement.title}
                                            </h3>
                                            {achievement.unlocked && (
                                                <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded-full">
                                                    Unlocked
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                            {achievement.description}
                                        </p>
                                        {!achievement.unlocked && (
                                            <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2">
                                                <div
                                                    className="bg-primary-600 h-2 rounded-full transition-all"
                                                    style={{ width: `${achievement.progress}%` }}
                                                ></div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </main>

            <BottomNav />
        </div>
    );
}

