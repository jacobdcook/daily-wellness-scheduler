"use client";

import { Stats } from "@/utils/api";
import { Flame, Trophy, Calendar, Target, Award, Sparkles } from "lucide-react";
import clsx from "clsx";

interface StatsPanelProps {
    stats: Stats | null;
    enableSupplements?: boolean; // Optional prop for future use
}

export function StatsPanel({ stats, enableSupplements = true }: StatsPanelProps) {
    if (!stats) return null;

    // Sanitize stats to prevent NaN
    const safeStats = {
        total_days_completed: Number(stats.total_days_completed) || 0,
        this_week_completed: Number(stats.this_week_completed) || 0,
        current_streak: Number(stats.current_streak) || 0,
        longest_streak: Number(stats.longest_streak) || 0,
        weekly_completion_rate: Number(stats.weekly_completion_rate) || 0,
        this_week_total: Number(stats.this_week_total) || 7,
        achievements: stats.achievements || []
    };

    const totalXp = safeStats.total_days_completed * 120 + safeStats.this_week_completed * 40 + safeStats.current_streak * 25;
    const xpPerLevel = 800;
    const level = Math.max(1, Math.floor(totalXp / xpPerLevel) + 1);
    const xpIntoLevel = totalXp % xpPerLevel;
    const levelProgress = Math.min(100, Math.round((xpIntoLevel / xpPerLevel) * 100));
    const xpToNext = xpPerLevel - xpIntoLevel;

    const streakGradient =
        safeStats.current_streak >= 30
            ? "from-purple-500 to-pink-500"
            : safeStats.current_streak >= 14
            ? "from-blue-500 to-cyan-500"
            : safeStats.current_streak >= 7
            ? "from-green-500 to-emerald-500"
            : "from-orange-500 to-red-500";

    return (
        <div className="space-y-4">
            <div className="card-surface p-5 space-y-4">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-300 text-white flex flex-col items-center justify-center shadow-lg">
                        <span className="text-[10px] uppercase tracking-[0.2em] opacity-80">Level</span>
                        <span className="text-2xl font-bold">{level}</span>
                    </div>
                    <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                            <span>{xpIntoLevel} XP earned</span>
                            <span>{xpToNext} XP to next level</span>
                        </div>
                        <div className="h-2.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-primary-500 to-primary-300 transition-all" style={{ width: `${levelProgress}%` }} />
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-xs uppercase text-gray-500 dark:text-gray-400 font-semibold">Streak</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{safeStats.current_streak}d</p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    {[
                        safeStats.weekly_completion_rate >= 80 ? "Weekly Hero" : "Consistency Rising",
                        safeStats.longest_streak >= 7 ? "Firestarter" : "Warm Up"
                    ].map((badge, idx) => (
                        <span
                            key={idx}
                            className="chip bg-primary-50/70 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 border-primary-100 dark:border-primary-900/40"
                        >
                            <Sparkles size={12} />
                            {badge}
                        </span>
                    ))}
                </div>
            </div>

            <div className={`p-6 rounded-2xl text-white shadow-lg bg-gradient-to-br ${streakGradient}`}>
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <Flame size={24} className="fill-current" />
                        <span className="text-sm font-medium opacity-90">Current Streak</span>
                    </div>
                    <div className="text-right">
                        <div className="text-3xl font-bold">{safeStats.current_streak}</div>
                        <div className="text-xs opacity-75">days</div>
                    </div>
                </div>
                <div className="text-sm opacity-90 mt-2">
                    {safeStats.current_streak === 0 ? "Start your streak today!" : "Keep it going! You're on fire 🔥"}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="card-surface space-y-1">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                        <Trophy size={18} />
                        <span className="text-sm font-medium">Longest Streak</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{safeStats.longest_streak}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">days</div>
                </div>
                <div className="card-surface space-y-1">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                        <Calendar size={18} />
                        <span className="text-sm font-medium">Total Days</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{safeStats.total_days_completed}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">completed</div>
                </div>
            </div>

            <div className="card-surface p-5 space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Target size={18} className="text-primary-600" />
                        <span className="font-semibold text-gray-900 dark:text-white">This Week</span>
                    </div>
                    <span className="text-sm font-bold text-primary-600">{safeStats.weekly_completion_rate}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2.5">
                    <div
                        className="bg-gradient-to-r from-primary-500 to-primary-300 h-2.5 rounded-full transition-all duration-500"
                        style={{ width: `${safeStats.weekly_completion_rate}%` }}
                    />
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>{safeStats.this_week_completed} of {safeStats.this_week_total} days completed</span>
                    <span>{Math.max(0, safeStats.this_week_total - safeStats.this_week_completed)} remaining</span>
                </div>
            </div>

            {safeStats.achievements && safeStats.achievements.length > 0 && (
                <div className="card-surface p-5 space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                        <Award size={18} className="text-yellow-500" />
                        <span className="font-semibold text-gray-900 dark:text-white">Achievements</span>
                    </div>
                    <div className="space-y-2">
                        {safeStats.achievements.slice(0, 3).map((achievement, idx) => (
                            <div
                                key={idx}
                                className={clsx(
                                    "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                                    achievement.unlocked
                                        ? "bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200"
                                        : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-70"
                                )}
                            >
                                <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center flex-shrink-0">
                                    <Trophy size={16} className="text-yellow-900" />
                                </div>
                                <div className="flex-grow">
                                    <div className="font-semibold text-gray-900 dark:text-white text-sm">{achievement.name}</div>
                                    <div className="text-xs text-gray-600 dark:text-gray-400">{achievement.description}</div>
                                </div>
                                {achievement.unlocked && <span className="chip bg-white/80 dark:bg-white/10 text-yellow-700 dark:text-yellow-200">Unlocked</span>}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {safeStats.current_streak >= 7 && (
                <div className="card-surface bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/20 border border-green-100 dark:border-green-900/30">
                    <div className="text-sm text-green-800 dark:text-green-200">
                        <strong>Consistent excellence!</strong> Your routine is locked in. Keep stacking those wins.
                    </div>
                </div>
            )}
            {safeStats.current_streak > 0 && safeStats.current_streak < 7 && (
                <div className="card-surface bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/20 border border-blue-100 dark:border-blue-900/30">
                    <div className="text-sm text-blue-800 dark:text-blue-200">
                        <strong>You&apos;re building momentum!</strong> Finish this week strong to unlock a new badge.
                    </div>
                </div>
            )}
            {safeStats.current_streak === 0 && safeStats.total_days_completed > 0 && (
                <div className="card-surface bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/30 dark:to-red-900/20 border border-orange-100 dark:border-orange-900/30">
                    <div className="text-sm text-orange-800 dark:text-orange-200">
                        <strong>Reset ready!</strong> Complete today once to reignite your streak and reclaim bonuses.
                    </div>
                </div>
            )}
        </div>
    );
}

