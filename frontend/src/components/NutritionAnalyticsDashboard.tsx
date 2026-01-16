"use client";

import { useState, useEffect } from "react";
import { Calendar, TrendingUp, BarChart3, PieChart as PieChartIcon, UtensilsCrossed, Activity, Lightbulb, Download, Info, Trophy, AlertCircle, CheckCircle2 } from "lucide-react";
import { 
    getNutritionStats,
    NutritionStats,
    getNutritionGoals,
    NutritionGoal
} from "@/utils/api";
import { 
    LineChart, 
    Line, 
    BarChart, 
    Bar, 
    AreaChart,
    Area,
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer, 
    PieChart, 
    Pie, 
    Cell,
    Legend
} from "recharts";
import { format, subDays, parseISO } from "date-fns";

type DateRangePreset = "7" | "30" | "90" | "all";

export function NutritionAnalyticsDashboard() {
    const [stats, setStats] = useState<NutritionStats | null>(null);
    const [goals, setGoals] = useState<NutritionGoal | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [datePreset, setDatePreset] = useState<DateRangePreset>("30");
    const [customStartDate, setCustomStartDate] = useState<string>("");
    const [customEndDate, setCustomEndDate] = useState<string>("");
    const [useCustomRange, setUseCustomRange] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);

    useEffect(() => {
        loadAnalytics();
    }, [datePreset, useCustomRange, customStartDate, customEndDate]);

    const loadAnalytics = async () => {
        setLoading(true);
        setError(null);
        try {
            let statsData: NutritionStats;
            
            if (useCustomRange && customStartDate && customEndDate) {
                statsData = await getNutritionStats(undefined, customStartDate, customEndDate);
            } else {
                const days = datePreset === "all" ? undefined : parseInt(datePreset);
                statsData = await getNutritionStats(days);
            }
            
            setStats(statsData);
            
            // Load goals for comparison
            try {
                const goalsData = await getNutritionGoals();
                setGoals(goalsData);
            } catch (e) {
                // Goals not set, that's okay
            }
        } catch (err) {
            console.error("Failed to load analytics:", err);
            setError(err instanceof Error ? err.message : "Failed to load analytics");
        } finally {
            setLoading(false);
        }
    };

    const COLORS = {
        protein: '#3b82f6', // blue
        carbs: '#10b981',   // green
        fats: '#f59e0b',    // amber
        calories: '#fb923c', // orange
        breakfast: '#8b5cf6', // purple
        lunch: '#06b6d4',     // cyan
        dinner: '#ef4444',    // red
        snack: '#f97316'      // orange
    };

    if (loading) {
        return (
            <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-400"></div>
                <p className="mt-4 text-gray-400">Loading analytics...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-12">
                <p className="text-red-400 mb-4">Error: {error}</p>
                <button
                    onClick={loadAnalytics}
                    className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                >
                    Retry
                </button>
            </div>
        );
    }

    if (!stats || stats.days_tracked === 0) {
        return (
            <div className="text-center py-12">
                <Activity className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No Data Yet</h3>
                <p className="text-gray-400 mb-4">
                    Start logging your meals to see analytics and insights here.
                </p>
            </div>
        );
    }

    // Prepare data for charts
    const calorieChartData = stats.calorie_trends.map(t => ({
        date: format(parseISO(t.date), "MMM d"),
        calories: t.calories,
        fullDate: t.date
    }));

    const macroChartData = stats.macro_trends.map(t => ({
        date: format(parseISO(t.date), "MMM d"),
        Protein: t.protein,
        Carbs: t.carbs,
        Fats: t.fats,
        fullDate: t.date
    }));

    const mostLoggedFoodsData = stats.most_logged_foods.slice(0, 10).map(f => ({
        name: f.name.length > 20 ? f.name.substring(0, 20) + "..." : f.name,
        fullName: f.name,
        count: f.count,
        avgCalories: f.avg_calories
    }));

    const mealAveragesData = [
        { name: "Breakfast", calories: stats.meal_averages.breakfast },
        { name: "Lunch", calories: stats.meal_averages.lunch },
        { name: "Dinner", calories: stats.meal_averages.dinner },
        { name: "Snack", calories: stats.meal_averages.snack }
    ];

    const macroPieData = stats.patterns.avg_daily_calories > 0 ? [
        { 
            name: "Protein", 
            value: Math.round((stats.patterns.protein_percentage / 100) * stats.patterns.avg_daily_calories),
            percentage: stats.patterns.protein_percentage
        },
        { 
            name: "Carbs", 
            value: Math.round(((100 - stats.patterns.protein_percentage - (stats.patterns.avg_daily_calories * 0.3 / stats.patterns.avg_daily_calories * 100)) / 100) * stats.patterns.avg_daily_calories),
            percentage: 100 - stats.patterns.protein_percentage - 30
        },
        { 
            name: "Fats", 
            value: Math.round((0.3 * stats.patterns.avg_daily_calories)),
            percentage: 30
        }
    ] : [];

    // Calculate macro percentages from averages if patterns not available
    let actualMacroPieData = macroPieData;
    if (stats.average_protein && stats.average_carbs && stats.average_fats && stats.average_calories) {
        const proteinCal = stats.average_protein * 4;
        const carbsCal = stats.average_carbs * 4;
        const fatsCal = stats.average_fats * 9;
        const totalCal = proteinCal + carbsCal + fatsCal;
        
        if (totalCal > 0) {
            actualMacroPieData = [
                { name: "Protein", value: Math.round(proteinCal), percentage: (proteinCal / totalCal * 100) },
                { name: "Carbs", value: Math.round(carbsCal), percentage: (carbsCal / totalCal * 100) },
                { name: "Fats", value: Math.round(fatsCal), percentage: (fatsCal / totalCal * 100) }
            ];
        }
    }

    // Calculate insights
    const calculateInsights = () => {
        if (!stats) return [];
        
        const insights: Array<{ type: "info" | "success" | "warning"; title: string; description: string }> = [];
        
        // Pattern insights
        if (stats.patterns.dinner_percentage > 40) {
            insights.push({
                type: "info",
                title: "Evening-Heavy Eating Pattern",
                description: `You consume ${stats.patterns.dinner_percentage.toFixed(0)}% of your daily calories at dinner. Consider redistributing calories throughout the day for better energy levels.`
            });
        }
        
        if (stats.patterns.protein_percentage < 20) {
            insights.push({
                type: "warning",
                title: "Low Protein Intake",
                description: `Your protein intake is ${stats.patterns.protein_percentage.toFixed(0)}% of calories. Aim for 20-30% protein for optimal muscle maintenance and satiety.`
            });
        } else if (stats.patterns.protein_percentage >= 25) {
            insights.push({
                type: "success",
                title: "Great Protein Intake",
                description: `You're getting ${stats.patterns.protein_percentage.toFixed(0)}% of calories from protein. This supports muscle maintenance and helps with satiety.`
            });
        }
        
        // Goal progress
        if (goals && stats.average_calories) {
            const diff = stats.average_calories - goals.daily_calories;
            const diffPercent = (diff / goals.daily_calories) * 100;
            
            if (Math.abs(diffPercent) < 5) {
                insights.push({
                    type: "success",
                    title: "On Track with Goals",
                    description: `You're averaging ${stats.average_calories.toFixed(0)} cal/day, which is very close to your goal of ${goals.daily_calories} cal/day. Keep it up!`
                });
            } else if (diffPercent > 10) {
                insights.push({
                    type: "warning",
                    title: "Above Calorie Goal",
                    description: `You're averaging ${stats.average_calories.toFixed(0)} cal/day, which is ${Math.abs(diffPercent).toFixed(0)}% above your goal of ${goals.daily_calories} cal/day.`
                });
            } else if (diffPercent < -10) {
                insights.push({
                    type: "info",
                    title: "Below Calorie Goal",
                    description: `You're averaging ${stats.average_calories.toFixed(0)} cal/day, which is ${Math.abs(diffPercent).toFixed(0)}% below your goal of ${goals.daily_calories} cal/day.`
                });
            }
        }
        
        // Meal timing insights
        const mealTotals = {
            breakfast: stats.meal_averages.breakfast,
            lunch: stats.meal_averages.lunch,
            dinner: stats.meal_averages.dinner,
            snack: stats.meal_averages.snack
        };
        const totalMealCal = mealTotals.breakfast + mealTotals.lunch + mealTotals.dinner + mealTotals.snack;
        
        if (totalMealCal > 0 && mealTotals.breakfast / totalMealCal < 0.2) {
            insights.push({
                type: "info",
                title: "Light Breakfast",
                description: "Your breakfast is relatively light. Consider adding more protein and calories to breakfast for better energy throughout the day."
            });
        }
        
        // Trend insights (compare first half vs second half of data)
        if (stats.calorie_trends.length >= 14) {
            const midpoint = Math.floor(stats.calorie_trends.length / 2);
            const firstHalf = stats.calorie_trends.slice(0, midpoint);
            const secondHalf = stats.calorie_trends.slice(midpoint);
            
            const firstAvg = firstHalf.reduce((sum, d) => sum + d.calories, 0) / firstHalf.length;
            const secondAvg = secondHalf.reduce((sum, d) => sum + d.calories, 0) / secondHalf.length;
            
            const trendPercent = ((secondAvg - firstAvg) / firstAvg) * 100;
            
            if (Math.abs(trendPercent) > 10) {
                insights.push({
                    type: trendPercent > 0 ? "warning" : "success",
                    title: trendPercent > 0 ? "Increasing Calorie Trend" : "Decreasing Calorie Trend",
                    description: `Your average daily calories have ${trendPercent > 0 ? "increased" : "decreased"} by ${Math.abs(trendPercent).toFixed(0)}% in the second half of this period.`
                });
            }
        }
        
        return insights;
    };

    const insights = calculateInsights();

    // Calculate best/worst days and streak
    const calculateBestWorstDays = () => {
        if (!stats || stats.calorie_trends.length === 0) return null;
        
        const sortedByCalories = [...stats.calorie_trends].sort((a, b) => a.calories - b.calories);
        const bestDay = sortedByCalories[0];
        const worstDay = sortedByCalories[sortedByCalories.length - 1];
        
        // Calculate current streak (days logged in a row from today backwards)
        let streak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        for (let i = 0; i < 365; i++) {
            const checkDate = new Date(today);
            checkDate.setDate(today.getDate() - i);
            const dateStr = format(checkDate, "yyyy-MM-dd");
            
            if (stats.calorie_trends.some(t => t.date.startsWith(dateStr))) {
                streak++;
            } else {
                break;
            }
        }
        
        return {
            bestDay: {
                date: bestDay.date,
                calories: bestDay.calories
            },
            worstDay: {
                date: worstDay.date,
                calories: worstDay.calories
            },
            streak
        };
    };

    const bestWorstDays = calculateBestWorstDays();

    // Export functions
    const exportToCSV = () => {
        if (!stats) return;
        
        let csv = "Date,Calories,Protein (g),Carbs (g),Fats (g)\n";
        
        // Match calorie and macro trends by date
        const dateMap = new Map<string, { calories: number; protein: number; carbs: number; fats: number }>();
        
        stats.calorie_trends.forEach(t => {
            dateMap.set(t.date, { calories: t.calories, protein: 0, carbs: 0, fats: 0 });
        });
        
        stats.macro_trends.forEach(t => {
            const existing = dateMap.get(t.date);
            if (existing) {
                existing.protein = t.protein;
                existing.carbs = t.carbs;
                existing.fats = t.fats;
            }
        });
        
        // Sort by date
        const sortedDates = Array.from(dateMap.entries()).sort((a, b) => 
            a[0].localeCompare(b[0])
        );
        
        sortedDates.forEach(([date, data]) => {
            csv += `${date},${data.calories},${data.protein},${data.carbs},${data.fats}\n`;
        });
        
        // Add summary section
        csv += "\nSummary\n";
        csv += `Days Tracked,${stats.days_tracked}\n`;
        csv += `Average Calories,${stats.average_calories?.toFixed(1) || "N/A"}\n`;
        csv += `Average Protein,${stats.average_protein?.toFixed(1) || "N/A"}\n`;
        csv += `Average Carbs,${stats.average_carbs?.toFixed(1) || "N/A"}\n`;
        csv += `Average Fats,${stats.average_fats?.toFixed(1) || "N/A"}\n`;
        
        // Download
        const blob = new Blob([csv], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        const dateRange = stats.date_range 
            ? `${stats.date_range.start}_to_${stats.date_range.end}`
            : `last_${datePreset}_days`;
        a.href = url;
        a.download = `nutrition_analytics_${dateRange}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        setShowExportMenu(false);
    };

    const exportToJSON = () => {
        if (!stats) return;
        
        const exportData = {
            date_range: stats.date_range,
            summary: {
                days_tracked: stats.days_tracked,
                average_calories: stats.average_calories,
                average_protein: stats.average_protein,
                average_carbs: stats.average_carbs,
                average_fats: stats.average_fats,
                patterns: stats.patterns,
                meal_averages: stats.meal_averages
            },
            daily_data: stats.calorie_trends.map((cal, idx) => {
                const macro = stats.macro_trends[idx];
                return {
                    date: cal.date,
                    calories: cal.calories,
                    protein: macro?.protein || 0,
                    carbs: macro?.carbs || 0,
                    fats: macro?.fats || 0
                };
            }),
            most_logged_foods: stats.most_logged_foods,
            weekly_summaries: stats.weekly_summaries,
            exported_at: new Date().toISOString()
        };
        
        const json = JSON.stringify(exportData, null, 2);
        const blob = new Blob([json], { type: "application/json" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        const dateRange = stats.date_range 
            ? `${stats.date_range.start}_to_${stats.date_range.end}`
            : `last_${datePreset}_days`;
        a.href = url;
        a.download = `nutrition_analytics_${dateRange}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        setShowExportMenu(false);
    };

    return (
        <div className="space-y-6">
            {/* Date Range Selector with Export */}
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-orange-400" />
                        <h3 className="text-lg font-semibold text-white">Date Range</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Export Button */}
                        <div className="relative">
                            <button
                                onClick={() => setShowExportMenu(!showExportMenu)}
                                className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                            >
                                <Download className="w-4 h-4" />
                                <span>Export</span>
                            </button>
                            {showExportMenu && (
                                <>
                                    <div
                                        className="fixed inset-0 z-10"
                                        onClick={() => setShowExportMenu(false)}
                                    />
                                    <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-20">
                                        <button
                                            onClick={exportToCSV}
                                            className="w-full text-left px-4 py-2 text-white hover:bg-gray-700 rounded-t-lg transition-colors"
                                        >
                                            Export as CSV
                                        </button>
                                        <button
                                            onClick={exportToJSON}
                                            className="w-full text-left px-4 py-2 text-white hover:bg-gray-700 rounded-b-lg transition-colors"
                                        >
                                            Export as JSON
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {(["7", "30", "90", "all"] as DateRangePreset[]).map((preset) => (
                            <button
                                key={preset}
                                onClick={() => {
                                    setDatePreset(preset);
                                    setUseCustomRange(false);
                                }}
                                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                                    !useCustomRange && datePreset === preset
                                        ? "bg-orange-500 text-white"
                                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                                }`}
                            >
                                {preset === "all" ? "All Time" : `${preset} Days`}
                            </button>
                        ))}
                        <button
                            onClick={() => setUseCustomRange(!useCustomRange)}
                            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                                useCustomRange
                                    ? "bg-orange-500 text-white"
                                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                            }`}
                        >
                            Custom
                        </button>
                    </div>
                </div>
                {useCustomRange && (
                    <div className="mt-4 flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <label className="block text-sm text-gray-400 mb-1">Start Date</label>
                            <input
                                type="date"
                                value={customStartDate}
                                onChange={(e) => setCustomStartDate(e.target.value)}
                                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-sm text-gray-400 mb-1">End Date</label>
                            <input
                                type="date"
                                value={customEndDate}
                                onChange={(e) => setCustomEndDate(e.target.value)}
                                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                            />
                        </div>
                    </div>
                )}
                {stats.date_range && (
                    <p className="mt-2 text-sm text-gray-400">
                        Showing data from {format(parseISO(stats.date_range.start), "MMM d, yyyy")} to {format(parseISO(stats.date_range.end), "MMM d, yyyy")}
                    </p>
                )}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                    <div className="flex items-center gap-2 mb-1">
                        <Activity className="w-4 h-4 text-gray-400" />
                        <p className="text-sm text-gray-400">Days Tracked</p>
                    </div>
                    <p className="text-2xl font-bold text-white">{stats.days_tracked}</p>
                    {bestWorstDays && bestWorstDays.streak > 0 && (
                        <p className="text-xs text-green-400 mt-1">
                            {bestWorstDays.streak} day streak 🔥
                        </p>
                    )}
                </div>
                <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                    <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="w-4 h-4 text-gray-400" />
                        <p className="text-sm text-gray-400">Avg Daily Calories</p>
                    </div>
                    <p className="text-2xl font-bold text-orange-400">
                        {stats.average_calories?.toFixed(0) || "N/A"}
                    </p>
                    {goals && stats.average_calories && (
                        <p className="text-xs text-gray-500 mt-1">
                            Goal: {goals.daily_calories} cal
                        </p>
                    )}
                </div>
                <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                    <div className="flex items-center gap-2 mb-1">
                        <Info className="w-4 h-4 text-gray-400" />
                        <p className="text-sm text-gray-400">Avg Protein</p>
                    </div>
                    <p className="text-2xl font-bold text-blue-400">
                        {stats.average_protein?.toFixed(0) || "N/A"}g
                    </p>
                    {goals && goals.protein_grams && (
                        <p className="text-xs text-gray-500 mt-1">
                            Goal: {goals.protein_grams}g
                        </p>
                    )}
                </div>
                <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                    <div className="flex items-center gap-2 mb-1">
                        <Info className="w-4 h-4 text-gray-400" />
                        <p className="text-sm text-gray-400">Avg Carbs</p>
                    </div>
                    <p className="text-2xl font-bold text-green-400">
                        {stats.average_carbs?.toFixed(0) || "N/A"}g
                    </p>
                    {goals && goals.carbs_grams && (
                        <p className="text-xs text-gray-500 mt-1">
                            Goal: {goals.carbs_grams}g
                        </p>
                    )}
                </div>
            </div>

            {/* Best/Worst Days */}
            {bestWorstDays && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                        <div className="flex items-center gap-2 mb-2">
                            <Trophy className="w-5 h-5 text-green-400" />
                            <h3 className="text-lg font-semibold text-white">Best Day</h3>
                        </div>
                        <p className="text-sm text-gray-400">
                            {format(parseISO(bestWorstDays.bestDay.date), "MMM d, yyyy")}
                        </p>
                        <p className="text-2xl font-bold text-green-400 mt-1">
                            {bestWorstDays.bestDay.calories.toFixed(0)} cal
                        </p>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                        <div className="flex items-center gap-2 mb-2">
                            <AlertCircle className="w-5 h-5 text-orange-400" />
                            <h3 className="text-lg font-semibold text-white">Highest Day</h3>
                        </div>
                        <p className="text-sm text-gray-400">
                            {format(parseISO(bestWorstDays.worstDay.date), "MMM d, yyyy")}
                        </p>
                        <p className="text-2xl font-bold text-orange-400 mt-1">
                            {bestWorstDays.worstDay.calories.toFixed(0)} cal
                        </p>
                    </div>
                </div>
            )}

            {/* Insights Section */}
            {insights.length > 0 && (
                <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
                    <div className="flex items-center gap-2 mb-4">
                        <Lightbulb className="w-5 h-5 text-orange-400" />
                        <h3 className="text-lg font-semibold text-white">Insights & Recommendations</h3>
                    </div>
                    <div className="space-y-3">
                        {insights.map((insight, idx) => (
                            <div
                                key={idx}
                                className={`rounded-lg p-4 border ${
                                    insight.type === "success"
                                        ? "bg-green-500/10 border-green-500/30"
                                        : insight.type === "warning"
                                        ? "bg-yellow-500/10 border-yellow-500/30"
                                        : "bg-blue-500/10 border-blue-500/30"
                                }`}
                            >
                                <div className="flex items-start gap-3">
                                    {insight.type === "success" && (
                                        <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                                    )}
                                    {insight.type === "warning" && (
                                        <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                                    )}
                                    {insight.type === "info" && (
                                        <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                                    )}
                                    <div className="flex-1">
                                        <h4 className="font-semibold text-white mb-1">{insight.title}</h4>
                                        <p className="text-sm text-gray-300">{insight.description}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Calorie Trends Line Chart */}
            {calorieChartData.length > 0 && (
                <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
                    <div className="flex items-center gap-2 mb-4">
                        <TrendingUp className="w-5 h-5 text-orange-400" />
                        <h3 className="text-lg font-semibold text-white">Daily Calorie Intake</h3>
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={calorieChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis 
                                dataKey="date" 
                                stroke="#9ca3af"
                                tick={{ fill: '#9ca3af' }}
                                angle={-45}
                                textAnchor="end"
                                height={80}
                            />
                            <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af' }} />
                            <Tooltip 
                                contentStyle={{ 
                                    backgroundColor: '#1f2937', 
                                    border: '1px solid #374151',
                                    borderRadius: '8px',
                                    color: '#fff'
                                }}
                            />
                            <Line 
                                type="monotone" 
                                dataKey="calories" 
                                stroke={COLORS.calories} 
                                strokeWidth={2}
                                dot={{ fill: COLORS.calories, r: 4 }}
                                activeDot={{ r: 6 }}
                            />
                            {goals && (
                                <Line 
                                    type="monotone" 
                                    dataKey={() => goals.daily_calories} 
                                    stroke="#ef4444" 
                                    strokeWidth={2}
                                    strokeDasharray="5 5"
                                    name="Goal"
                                />
                            )}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Macro Trends Stacked Area Chart */}
            {macroChartData.length > 0 && (
                <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
                    <div className="flex items-center gap-2 mb-4">
                        <BarChart3 className="w-5 h-5 text-orange-400" />
                        <h3 className="text-lg font-semibold text-white">Macro Distribution Over Time</h3>
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={macroChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis 
                                dataKey="date" 
                                stroke="#9ca3af"
                                tick={{ fill: '#9ca3af' }}
                                angle={-45}
                                textAnchor="end"
                                height={80}
                            />
                            <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af' }} />
                            <Tooltip 
                                contentStyle={{ 
                                    backgroundColor: '#1f2937', 
                                    border: '1px solid #374151',
                                    borderRadius: '8px',
                                    color: '#fff'
                                }}
                            />
                            <Legend />
                            <Area 
                                type="monotone" 
                                dataKey="Protein" 
                                stackId="1" 
                                stroke={COLORS.protein} 
                                fill={COLORS.protein}
                                fillOpacity={0.6}
                            />
                            <Area 
                                type="monotone" 
                                dataKey="Carbs" 
                                stackId="1" 
                                stroke={COLORS.carbs} 
                                fill={COLORS.carbs}
                                fillOpacity={0.6}
                            />
                            <Area 
                                type="monotone" 
                                dataKey="Fats" 
                                stackId="1" 
                                stroke={COLORS.fats} 
                                fill={COLORS.fats}
                                fillOpacity={0.6}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Charts Grid - Most Logged Foods & Meal Averages */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Most Logged Foods */}
                {mostLoggedFoodsData.length > 0 && (
                    <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
                        <div className="flex items-center gap-2 mb-4">
                            <UtensilsCrossed className="w-5 h-5 text-orange-400" />
                            <h3 className="text-lg font-semibold text-white">Most Logged Foods</h3>
                        </div>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={mostLoggedFoodsData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis type="number" stroke="#9ca3af" tick={{ fill: '#9ca3af' }} />
                                <YAxis 
                                    type="category" 
                                    dataKey="name" 
                                    stroke="#9ca3af" 
                                    tick={{ fill: '#9ca3af' }}
                                    width={100}
                                />
                                <Tooltip 
                                    contentStyle={{ 
                                        backgroundColor: '#1f2937', 
                                        border: '1px solid #374151',
                                        borderRadius: '8px',
                                        color: '#fff'
                                    }}
                                    formatter={(value: number, name: string, props: any) => {
                                        if (name === "count") {
                                            return [`${value} times`, "Logged"];
                                        }
                                        return [value, name];
                                    }}
                                />
                                <Bar dataKey="count" fill={COLORS.calories} radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}

                {/* Meal Averages */}
                <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
                    <div className="flex items-center gap-2 mb-4">
                        <PieChartIcon className="w-5 h-5 text-orange-400" />
                        <h3 className="text-lg font-semibold text-white">Average Calories per Meal</h3>
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={mealAveragesData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="name" stroke="#9ca3af" tick={{ fill: '#9ca3af' }} />
                            <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af' }} />
                            <Tooltip 
                                contentStyle={{ 
                                    backgroundColor: '#1f2937', 
                                    border: '1px solid #374151',
                                    borderRadius: '8px',
                                    color: '#fff'
                                }}
                                formatter={(value: number) => [`${value.toFixed(0)} cal`, "Calories"]}
                            />
                            <Bar dataKey="calories" fill={COLORS.calories} radius={[4, 4, 0, 0]}>
                                {mealAveragesData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={
                                        entry.name === "Breakfast" ? COLORS.breakfast :
                                        entry.name === "Lunch" ? COLORS.lunch :
                                        entry.name === "Dinner" ? COLORS.dinner :
                                        COLORS.snack
                                    } />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Macro Distribution Pie Chart */}
            {actualMacroPieData.length > 0 && (
                <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
                    <div className="flex items-center gap-2 mb-4">
                        <PieChartIcon className="w-5 h-5 text-orange-400" />
                        <h3 className="text-lg font-semibold text-white">Average Macro Distribution</h3>
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={actualMacroPieData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
                                outerRadius={100}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {actualMacroPieData.map((entry, index) => (
                                    <Cell 
                                        key={`cell-${index}`} 
                                        fill={
                                            entry.name === "Protein" ? COLORS.protein :
                                            entry.name === "Carbs" ? COLORS.carbs :
                                            COLORS.fats
                                        } 
                                    />
                                ))}
                            </Pie>
                            <Tooltip 
                                contentStyle={{ 
                                    backgroundColor: '#1f2937', 
                                    border: '1px solid #374151',
                                    borderRadius: '8px',
                                    color: '#fff'
                                }}
                                formatter={(value: number, name: string, props: any) => {
                                    const percentage = props.payload.percentage;
                                    return [`${value} cal (${percentage.toFixed(1)}%)`, name];
                                }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            )}

        </div>
    );
}
