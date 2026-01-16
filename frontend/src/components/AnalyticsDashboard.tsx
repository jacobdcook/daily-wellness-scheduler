"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { TrendingUp, TrendingDown, Calendar, Clock, Award, Target, Activity, Plus, X } from "lucide-react";
import { getAnalyticsOverview, getAnalyticsTrends, getTimeAnalytics, getGoals, createGoal, deleteGoal, AnalyticsOverview, TimeAnalytics, TrendDataPoint, Goal } from "@/utils/api";
import { format, parseISO, subDays } from "date-fns";
import { clsx } from "clsx";

export function AnalyticsDashboard() {
    const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
    const [trends, setTrends] = useState<TrendDataPoint[]>([]);
    const [timeAnalytics, setTimeAnalytics] = useState<TimeAnalytics | null>(null);
    const [goals, setGoals] = useState<Goal[]>([]);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState<"7" | "30" | "90">("30");
    const [error, setError] = useState<string | null>(null);
    const [showGoalForm, setShowGoalForm] = useState(false);
    const [newGoal, setNewGoal] = useState({ name: "", type: "completion_rate" as Goal["type"], target_value: 80, end_date: "" });

    useEffect(() => {
        async function loadAnalytics() {
            setLoading(true);
            setError(null);
            try {
                const endDate = new Date().toISOString().split('T')[0];
                const startDate = subDays(new Date(), parseInt(dateRange)).toISOString().split('T')[0];
                
                const [overviewData, trendsData, timeData, goalsData] = await Promise.all([
                    getAnalyticsOverview(startDate, endDate),
                    getAnalyticsTrends(parseInt(dateRange)),
                    getTimeAnalytics(),
                    getGoals()
                ]);
                
                setOverview(overviewData);
                setTrends(trendsData.trend_data);
                setTimeAnalytics(timeData);
                setGoals(goalsData.goals || []);
            } catch (err) {
                console.error("Failed to load analytics", err);
                setError("Failed to load analytics. Please try again.");
            } finally {
                setLoading(false);
            }
        }
        loadAnalytics();
    }, [dateRange]);

    if (loading) {
        return (
            <div className="space-y-6">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-64 bg-white dark:bg-gray-900 rounded-xl animate-pulse" />
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-xl border border-dashed">
                <p className="text-red-500">{error}</p>
            </div>
        );
    }

    if (!overview || !timeAnalytics) {
        return (
            <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-xl border border-dashed">
                <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                    No analytics data available yet. Complete some items to see your analytics!
                </p>
            </div>
        );
    }

    // Format trend data for chart
    const formattedTrends = trends.map(t => ({
        date: format(parseISO(t.date), "MMM d"),
        rate: t.completion_rate,
        completed: t.completed,
        total: t.total
    }));

    // Format hour data for chart
    const hourData = timeAnalytics.hour_rates.map(h => ({
        hour: `${h.hour}:00`,
        rate: h.completion_rate,
        total: h.total
    }));

    // Format day data for chart
    const dayData = timeAnalytics.day_rates.map(d => ({
        day: d.day.substring(0, 3),
        rate: d.completion_rate,
        total: d.total
    }));

    // Top performing items
    const topItems = overview.item_performance.slice(0, 5);
    const bottomItems = overview.item_performance.slice(-5).reverse();

    // Color for trend direction
    const trendColor = overview.overview.trend_direction === "improving" 
        ? "text-green-600 dark:text-green-400" 
        : overview.overview.trend_direction === "declining"
        ? "text-red-600 dark:text-red-400"
        : "text-gray-600 dark:text-gray-400";

    const TrendIcon = overview.overview.trend_direction === "improving" 
        ? TrendingUp 
        : overview.overview.trend_direction === "declining"
        ? TrendingDown
        : Activity;

    return (
        <div className="space-y-6">
            {/* Date Range Selector */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Analytics Dashboard</h2>
                <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                    {(["7", "30", "90"] as const).map((range) => (
                        <button
                            key={range}
                            onClick={() => setDateRange(range)}
                            className={clsx(
                                "px-3 py-1 text-sm font-medium rounded-md transition-colors",
                                dateRange === range
                                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                            )}
                        >
                            {range} days
                        </button>
                    ))}
                </div>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border dark:border-gray-800">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-500 dark:text-gray-400">Completion Rate</span>
                        <Target className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                        {overview.overview.overall_completion_rate}%
                    </div>
                    <div className={clsx("text-sm mt-1 flex items-center gap-1", trendColor)}>
                        <TrendIcon className="w-4 h-4" />
                        {overview.overview.trend_direction === "improving" && "+"}
                        {overview.overview.trend_magnitude > 0 && `${overview.overview.trend_magnitude}%`}
                        {overview.overview.trend_direction === "stable" && "Stable"}
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border dark:border-gray-800">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-500 dark:text-gray-400">Total Items</span>
                        <Activity className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                        {overview.overview.total_items}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {overview.overview.average_items_per_day.toFixed(1)} avg/day
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border dark:border-gray-800">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-500 dark:text-gray-400">Completed</span>
                        <Award className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                        {overview.overview.completed_count}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {overview.overview.pending_count} pending
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border dark:border-gray-800">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-500 dark:text-gray-400">Days Tracked</span>
                        <Calendar className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                        {overview.overview.total_days}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Last {dateRange} days
                    </div>
                </div>
            </div>

            {/* Completion Rate Trend Chart */}
            {formattedTrends.length > 0 && (
                <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border dark:border-gray-800">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                        Completion Rate Trend
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={formattedTrends}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                            <XAxis 
                                dataKey="date" 
                                className="text-xs"
                                tick={{ fill: 'currentColor' }}
                            />
                            <YAxis 
                                domain={[0, 100]}
                                className="text-xs"
                                tick={{ fill: 'currentColor' }}
                            />
                            <Tooltip 
                                contentStyle={{ 
                                    backgroundColor: 'var(--bg-color, white)',
                                    border: '1px solid var(--border-color, #e5e7eb)',
                                    borderRadius: '8px'
                                }}
                            />
                            <Line 
                                type="monotone" 
                                dataKey="rate" 
                                stroke="#3b82f6" 
                                strokeWidth={2}
                                dot={{ fill: '#3b82f6', r: 4 }}
                                name="Completion %"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Time Analysis Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Hour of Day Chart */}
                {hourData.length > 0 && (
                    <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border dark:border-gray-800">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                            Completion by Hour
                        </h3>
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={hourData}>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                                <XAxis 
                                    dataKey="hour" 
                                    className="text-xs"
                                    tick={{ fill: 'currentColor' }}
                                />
                                <YAxis 
                                    domain={[0, 100]}
                                    className="text-xs"
                                    tick={{ fill: 'currentColor' }}
                                />
                                <Tooltip 
                                    contentStyle={{ 
                                        backgroundColor: 'var(--bg-color, white)',
                                        border: '1px solid var(--border-color, #e5e7eb)',
                                        borderRadius: '8px'
                                    }}
                                />
                                <Bar dataKey="rate" name="Completion %">
                                    {hourData.map((entry, index) => (
                                        <Cell 
                                            key={`cell-${index}`} 
                                            fill={entry.rate >= 70 ? "#10b981" : entry.rate >= 50 ? "#f59e0b" : "#ef4444"} 
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                        {timeAnalytics.best_hour && timeAnalytics.worst_hour && (
                            <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                                <p>Best: {timeAnalytics.best_hour.hour}:00 ({timeAnalytics.best_hour.completion_rate}%)</p>
                                <p>Worst: {timeAnalytics.worst_hour.hour}:00 ({timeAnalytics.worst_hour.completion_rate}%)</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Day of Week Chart */}
                {dayData.length > 0 && (
                    <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border dark:border-gray-800">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                            Completion by Day
                        </h3>
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={dayData}>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                                <XAxis 
                                    dataKey="day" 
                                    className="text-xs"
                                    tick={{ fill: 'currentColor' }}
                                />
                                <YAxis 
                                    domain={[0, 100]}
                                    className="text-xs"
                                    tick={{ fill: 'currentColor' }}
                                />
                                <Tooltip 
                                    contentStyle={{ 
                                        backgroundColor: 'var(--bg-color, white)',
                                        border: '1px solid var(--border-color, #e5e7eb)',
                                        borderRadius: '8px'
                                    }}
                                />
                                <Bar dataKey="rate" name="Completion %">
                                    {dayData.map((entry, index) => (
                                        <Cell 
                                            key={`cell-${index}`} 
                                            fill={entry.rate >= 70 ? "#10b981" : entry.rate >= 50 ? "#f59e0b" : "#ef4444"} 
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                        {timeAnalytics.best_day && timeAnalytics.worst_day && (
                            <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                                <p>Best: {timeAnalytics.best_day.day} ({timeAnalytics.best_day.completion_rate}%)</p>
                                <p>Worst: {timeAnalytics.worst_day.day} ({timeAnalytics.worst_day.completion_rate}%)</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Item Performance */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Performers */}
                {topItems.length > 0 && (
                    <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border dark:border-gray-800">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                            Top Performing Items
                        </h3>
                        <div className="space-y-3">
                            {topItems.map((item, index) => (
                                <div key={item.name} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={clsx(
                                            "w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm",
                                            index === 0 ? "bg-yellow-500" : index === 1 ? "bg-gray-400" : index === 2 ? "bg-orange-600" : "bg-gray-300"
                                        )}>
                                            {index + 1}
                                        </div>
                                        <span className="font-medium text-gray-900 dark:text-gray-100">{item.name}</span>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-semibold text-green-600 dark:text-green-400">
                                            {item.completion_rate}%
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                            {item.completed}/{item.total}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Needs Improvement */}
                {bottomItems.length > 0 && (
                    <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border dark:border-gray-800">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                            Needs Improvement
                        </h3>
                        <div className="space-y-3">
                            {bottomItems.map((item) => (
                                <div key={item.name} className="flex items-center justify-between">
                                    <span className="font-medium text-gray-900 dark:text-gray-100">{item.name}</span>
                                    <div className="text-right">
                                        <div className="font-semibold text-red-600 dark:text-red-400">
                                            {item.completion_rate}%
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                            {item.completed}/{item.total}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Goals Section */}
            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border dark:border-gray-800">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <Target className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                        Goals
                    </h3>
                    <button
                        onClick={() => setShowGoalForm(!showGoalForm)}
                        className="px-3 py-1.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors flex items-center gap-2"
                    >
                        <Plus size={16} />
                        Add Goal
                    </button>
                </div>

                {showGoalForm && (
                    <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3">
                        <input
                            type="text"
                            placeholder="Goal name (e.g., 90% completion rate)"
                            value={newGoal.name}
                            onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })}
                            className="w-full px-3 py-2 border dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-md"
                        />
                        <select
                            value={newGoal.type}
                            onChange={(e) => setNewGoal({ ...newGoal, type: e.target.value as Goal["type"] })}
                            className="w-full px-3 py-2 border dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-md"
                        >
                            <option value="completion_rate">Completion Rate (%)</option>
                            <option value="streak">Streak (days)</option>
                        </select>
                        <input
                            type="number"
                            placeholder="Target value"
                            value={newGoal.target_value}
                            onChange={(e) => setNewGoal({ ...newGoal, target_value: parseFloat(e.target.value) || 0 })}
                            className="w-full px-3 py-2 border dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-md"
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={async () => {
                                    try {
                                        const result = await createGoal({
                                            ...newGoal,
                                            start_date: new Date().toISOString().split('T')[0],
                                            end_date: newGoal.end_date || undefined
                                        });
                                        setGoals([...goals, result.goal]);
                                        setNewGoal({ name: "", type: "completion_rate", target_value: 80, end_date: "" });
                                        setShowGoalForm(false);
                                    } catch (err) {
                                        console.error("Failed to create goal", err);
                                    }
                                }}
                                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
                            >
                                Create Goal
                            </button>
                            <button
                                onClick={() => setShowGoalForm(false)}
                                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {goals.length > 0 ? (
                    <div className="space-y-3">
                        {goals.map((goal) => {
                            const progress = goal.current_value !== undefined && goal.target_value > 0
                                ? Math.min(100, (goal.current_value / goal.target_value) * 100)
                                : 0;
                            
                            return (
                                <div key={goal.id} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-medium text-gray-900 dark:text-gray-100">{goal.name}</span>
                                                {goal.achieved && (
                                                    <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded-full">
                                                        Achieved! 🎉
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                                                <span>Current: {goal.current_value?.toFixed(1) || 0}{goal.type === "completion_rate" ? "%" : ""}</span>
                                                <span>Target: {goal.target_value}{goal.type === "completion_rate" ? "%" : ""}</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={async () => {
                                                if (goal.id) {
                                                    try {
                                                        await deleteGoal(goal.id);
                                                        setGoals(goals.filter(g => g.id !== goal.id));
                                                    } catch (err) {
                                                        console.error("Failed to delete goal", err);
                                                    }
                                                }
                                            }}
                                            className="ml-4 p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>
                                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                        <div
                                            className={clsx(
                                                "h-2 rounded-full transition-all",
                                                goal.achieved ? "bg-green-500" : "bg-primary-600"
                                            )}
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                        No goals yet. Create one to track your progress!
                    </p>
                )}
            </div>
        </div>
    );
}

