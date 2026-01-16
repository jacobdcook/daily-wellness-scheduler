"use client";

import { useState, useEffect } from "react";
import { 
    TrendingUp, TrendingDown, Minus, Target, AlertCircle, 
    Info, CheckCircle, Calendar, BarChart3, Lightbulb,
    Clock, Activity, ChefHat, ArrowRight, RefreshCw
} from "lucide-react";
import { 
    getInsightsSummary, 
    getWeeklyReport,
    NutritionPattern,
    NutritionRecommendation,
    DetectedPattern,
    WeeklyReport
} from "@/utils/api";
import { useToast } from "@/context/ToastContext";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const COLORS = {
    calories: "#f97316",
    protein: "#3b82f6",
    carbs: "#22c55e",
    fats: "#eab308",
    warning: "#ef4444",
    info: "#3b82f6",
    success: "#22c55e"
};

export default function NutritionInsightsPage() {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [patterns, setPatterns] = useState<NutritionPattern | null>(null);
    const [recommendations, setRecommendations] = useState<NutritionRecommendation[]>([]);
    const [detectedPatterns, setDetectedPatterns] = useState<DetectedPattern[]>([]);
    const [weeklyReport, setWeeklyReport] = useState<WeeklyReport | null>(null);
    const [days, setDays] = useState(30);
    const [activeTab, setActiveTab] = useState<"overview" | "recommendations" | "weekly" | "patterns">("overview");

    useEffect(() => {
        loadInsights();
    }, [days]);

    const loadInsights = async () => {
        setLoading(true);
        try {
            const summary = await getInsightsSummary(days);
            setPatterns(summary.patterns);
            setRecommendations(summary.recommendations);
            setDetectedPatterns(summary.detected_patterns);
            
            const report = await getWeeklyReport();
            setWeeklyReport(report);
        } catch (error) {
            showToast("Failed to load insights", "error");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-950 p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center py-20">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-400"></div>
                        <p className="mt-4 text-gray-400">Analyzing your nutrition data...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!patterns?.has_data) {
        return (
            <div className="min-h-screen bg-gray-950 p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="bg-gray-900 rounded-lg p-12 text-center">
                        <BarChart3 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-white mb-2">No Data Yet</h2>
                        <p className="text-gray-400 mb-6">
                            Start logging your meals to get personalized insights and recommendations!
                        </p>
                        <a
                            href="/nutrition"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors"
                        >
                            Log Your First Meal
                            <ArrowRight className="w-4 h-4" />
                        </a>
                    </div>
                </div>
            </div>
        );
    }

    const TrendIcon = ({ trend }: { trend: string }) => {
        if (trend === "increasing") return <TrendingUp className="w-5 h-5 text-red-400" />;
        if (trend === "decreasing") return <TrendingDown className="w-5 h-5 text-green-400" />;
        return <Minus className="w-5 h-5 text-gray-400" />;
    };

    const getRecommendationIcon = (type: string) => {
        switch (type) {
            case "warning": return <AlertCircle className="w-5 h-5 text-red-400" />;
            case "success": return <CheckCircle className="w-5 h-5 text-green-400" />;
            default: return <Info className="w-5 h-5 text-blue-400" />;
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case "high": return "border-red-500/50 bg-red-500/10";
            case "medium": return "border-yellow-500/50 bg-yellow-500/10";
            default: return "border-blue-500/50 bg-blue-500/10";
        }
    };

    // Prepare chart data
    const dailyChartData = patterns.daily_totals?.slice(-14).map(d => ({
        date: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        Calories: Math.round(d.calories),
        Protein: Math.round(d.protein),
        Carbs: Math.round(d.carbs),
        Fats: Math.round(d.fats),
    })) || [];

    const mealBreakdownData = patterns.meal_breakdown ? Object.entries(patterns.meal_breakdown).map(([meal, cals]) => ({
        name: meal.charAt(0).toUpperCase() + meal.slice(1),
        calories: Math.round(cals),
    })) : [];

    return (
        <div className="min-h-screen bg-gray-950 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">Nutrition Insights</h1>
                        <p className="text-gray-400">Personalized analysis and recommendations</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <select
                            value={days}
                            onChange={(e) => setDays(Number(e.target.value))}
                            className="bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2"
                        >
                            <option value={7}>Last 7 days</option>
                            <option value={30}>Last 30 days</option>
                            <option value={60}>Last 60 days</option>
                            <option value={90}>Last 90 days</option>
                        </select>
                        <button
                            onClick={loadInsights}
                            className="p-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
                        >
                            <RefreshCw className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6 border-b border-gray-800">
                    {[
                        { id: "overview", label: "Overview", icon: BarChart3 },
                        { id: "recommendations", label: "Recommendations", icon: Lightbulb },
                        { id: "weekly", label: "Weekly Report", icon: Calendar },
                        { id: "patterns", label: "Patterns", icon: Activity },
                    ].map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            onClick={() => setActiveTab(id as any)}
                            className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                                activeTab === id
                                    ? "border-orange-500 text-orange-400"
                                    : "border-transparent text-gray-400 hover:text-white"
                            }`}
                        >
                            <Icon className="w-4 h-4" />
                            {label}
                        </button>
                    ))}
                </div>

                {/* Overview Tab */}
                {activeTab === "overview" && (
                    <div className="space-y-6">
                        {/* Key Metrics */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-gray-400 text-sm">Avg Calories</span>
                                    <Target className="w-5 h-5 text-orange-400" />
                                </div>
                                <div className="text-2xl font-bold text-white">
                                    {Math.round(patterns.averages?.calories || 0)}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">per day</div>
                            </div>

                            <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-gray-400 text-sm">Avg Protein</span>
                                    <Activity className="w-5 h-5 text-blue-400" />
                                </div>
                                <div className="text-2xl font-bold text-white">
                                    {Math.round(patterns.averages?.protein || 0)}g
                                </div>
                                <div className="text-xs text-gray-500 mt-1">per day</div>
                            </div>

                            <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-gray-400 text-sm">Consistency</span>
                                    <TrendIcon trend={patterns.trends?.calorie_trend || "stable"} />
                                </div>
                                <div className="text-2xl font-bold text-white">
                                    {Math.round(patterns.trends?.consistency_score || 0)}%
                                </div>
                                <div className="text-xs text-gray-500 mt-1">score</div>
                            </div>

                            <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-gray-400 text-sm">Days Analyzed</span>
                                    <Calendar className="w-5 h-5 text-green-400" />
                                </div>
                                <div className="text-2xl font-bold text-white">
                                    {patterns.days_analyzed || 0}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">total days</div>
                            </div>
                        </div>

                        {/* Trend Analysis */}
                        {patterns.trends && (
                            <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
                                <h3 className="text-lg font-semibold text-white mb-4">Trend Analysis</h3>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <TrendIcon trend={patterns.trends.calorie_trend} />
                                        <span className="text-gray-300">
                                            Calories are {patterns.trends.calorie_trend}
                                        </span>
                                        {patterns.trends.calorie_change_percent !== 0 && (
                                            <span className={`text-sm ${
                                                patterns.trends.calorie_change_percent > 0 ? "text-red-400" : "text-green-400"
                                            }`}>
                                                ({Math.abs(patterns.trends.calorie_change_percent).toFixed(1)}%)
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Daily Trends Chart */}
                        {dailyChartData.length > 0 && (
                            <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
                                <h3 className="text-lg font-semibold text-white mb-4">Daily Nutrition Trends (Last 14 Days)</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <LineChart data={dailyChartData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                        <XAxis dataKey="date" stroke="#9ca3af" />
                                        <YAxis stroke="#9ca3af" />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "8px" }}
                                            labelStyle={{ color: "#fff" }}
                                        />
                                        <Legend />
                                        <Line type="monotone" dataKey="Calories" stroke={COLORS.calories} strokeWidth={2} />
                                        <Line type="monotone" dataKey="Protein" stroke={COLORS.protein} strokeWidth={2} />
                                        <Line type="monotone" dataKey="Carbs" stroke={COLORS.carbs} strokeWidth={2} />
                                        <Line type="monotone" dataKey="Fats" stroke={COLORS.fats} strokeWidth={2} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        )}

                        {/* Meal Breakdown */}
                        {mealBreakdownData.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
                                    <h3 className="text-lg font-semibold text-white mb-4">Average Calories by Meal</h3>
                                    <ResponsiveContainer width="100%" height={250}>
                                        <BarChart data={mealBreakdownData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                            <XAxis dataKey="name" stroke="#9ca3af" />
                                            <YAxis stroke="#9ca3af" />
                                            <Tooltip 
                                                contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "8px" }}
                                                labelStyle={{ color: "#fff" }}
                                            />
                                            <Bar dataKey="calories" fill={COLORS.calories} radius={[8, 8, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* Weekday vs Weekend */}
                                {patterns.weekday_vs_weekend && (
                                    <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
                                        <h3 className="text-lg font-semibold text-white mb-4">Weekday vs Weekend</h3>
                                        <div className="space-y-4">
                                            <div>
                                                <div className="flex justify-between mb-2">
                                                    <span className="text-gray-400">Weekday Average</span>
                                                    <span className="text-white font-semibold">
                                                        {Math.round(patterns.weekday_vs_weekend.weekday_avg)} cal
                                                    </span>
                                                </div>
                                                <div className="w-full bg-gray-800 rounded-full h-3">
                                                    <div 
                                                        className="bg-blue-500 h-3 rounded-full"
                                                        style={{ width: "50%" }}
                                                    ></div>
                                                </div>
                                            </div>
                                            <div>
                                                <div className="flex justify-between mb-2">
                                                    <span className="text-gray-400">Weekend Average</span>
                                                    <span className="text-white font-semibold">
                                                        {Math.round(patterns.weekday_vs_weekend.weekend_avg)} cal
                                                    </span>
                                                </div>
                                                <div className="w-full bg-gray-800 rounded-full h-3">
                                                    <div 
                                                        className="bg-orange-500 h-3 rounded-full"
                                                        style={{ width: "50%" }}
                                                    ></div>
                                                </div>
                                            </div>
                                            {patterns.weekday_vs_weekend.weekend_higher && (
                                                <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                                                    <p className="text-sm text-yellow-300">
                                                        You consume {Math.round(patterns.weekday_vs_weekend.difference)} more calories on weekends
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Top Foods */}
                        {patterns.top_foods && patterns.top_foods.length > 0 && (
                            <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
                                <h3 className="text-lg font-semibold text-white mb-4">Most Logged Foods</h3>
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                    {patterns.top_foods.slice(0, 10).map((food, idx) => (
                                        <div key={idx} className="text-center">
                                            <div className="text-2xl font-bold text-orange-400">{food.count}</div>
                                            <div className="text-sm text-gray-400 mt-1 truncate">{food.name}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Recommendations Tab */}
                {activeTab === "recommendations" && (
                    <div className="space-y-4">
                        {recommendations.length === 0 ? (
                            <div className="bg-gray-900 rounded-lg p-12 text-center border border-gray-800">
                                <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                                <h3 className="text-xl font-semibold text-white mb-2">All Good!</h3>
                                <p className="text-gray-400">No recommendations at this time. Keep up the great work!</p>
                            </div>
                        ) : (
                            recommendations.map((rec, idx) => (
                                <div
                                    key={idx}
                                    className={`bg-gray-900 rounded-lg p-6 border-2 ${getPriorityColor(rec.priority)}`}
                                >
                                    <div className="flex items-start gap-4">
                                        {getRecommendationIcon(rec.type)}
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <h3 className="text-lg font-semibold text-white">{rec.title}</h3>
                                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                                    rec.priority === "high" ? "bg-red-500/20 text-red-300" :
                                                    rec.priority === "medium" ? "bg-yellow-500/20 text-yellow-300" :
                                                    "bg-blue-500/20 text-blue-300"
                                                }`}>
                                                    {rec.priority.toUpperCase()}
                                                </span>
                                            </div>
                                            <p className="text-gray-300 mb-2">{rec.message}</p>
                                            {rec.suggestion && (
                                                <div className="mt-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                                                    <p className="text-sm text-gray-300">
                                                        <strong className="text-white">💡 Suggestion:</strong> {rec.suggestion}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* Weekly Report Tab */}
                {activeTab === "weekly" && weeklyReport && (
                    <div className="space-y-6">
                        {weeklyReport.has_data ? (
                            <>
                                {/* Summary */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
                                        <div className="text-gray-400 text-sm mb-2">Total Calories</div>
                                        <div className="text-2xl font-bold text-white">
                                            {Math.round(weeklyReport.summary?.total_calories || 0)}
                                        </div>
                                    </div>
                                    <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
                                        <div className="text-gray-400 text-sm mb-2">Days Logged</div>
                                        <div className="text-2xl font-bold text-white">
                                            {weeklyReport.summary?.days_logged || 0}/7
                                        </div>
                                    </div>
                                    <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
                                        <div className="text-gray-400 text-sm mb-2">Total Meals</div>
                                        <div className="text-2xl font-bold text-white">
                                            {weeklyReport.summary?.total_meals || 0}
                                        </div>
                                    </div>
                                    <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
                                        <div className="text-gray-400 text-sm mb-2">Avg per Day</div>
                                        <div className="text-2xl font-bold text-white">
                                            {Math.round(weeklyReport.averages?.calories || 0)}
                                        </div>
                                    </div>
                                </div>

                                {/* Goal Comparison */}
                                {weeklyReport.goal_comparison && (
                                    <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
                                        <h3 className="text-lg font-semibold text-white mb-4">Goal Progress</h3>
                                        <div className="space-y-4">
                                            {Object.entries(weeklyReport.goal_comparison).map(([macro, data]) => (
                                                <div key={macro}>
                                                    <div className="flex justify-between mb-2">
                                                        <span className="text-gray-300 capitalize">{macro}</span>
                                                        <span className={`font-semibold ${data.met ? "text-green-400" : "text-red-400"}`}>
                                                            {data.percent.toFixed(0)}% ({data.actual.toFixed(0)}/{data.goal.toFixed(0)})
                                                        </span>
                                                    </div>
                                                    <div className="w-full bg-gray-800 rounded-full h-3">
                                                        <div
                                                            className={`h-3 rounded-full ${data.met ? "bg-green-500" : "bg-red-500"}`}
                                                            style={{ width: `${Math.min(data.percent, 100)}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Daily Breakdown Chart */}
                                {weeklyReport.daily_breakdown && (
                                    <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
                                        <h3 className="text-lg font-semibold text-white mb-4">Daily Breakdown</h3>
                                        <ResponsiveContainer width="100%" height={300}>
                                            <BarChart data={Object.entries(weeklyReport.daily_breakdown).map(([date, data]) => ({
                                                date: new Date(date).toLocaleDateString("en-US", { weekday: "short" }),
                                                Calories: data.calories,
                                                Protein: data.protein,
                                                Carbs: data.carbs,
                                                Fats: data.fats,
                                            }))}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                                <XAxis dataKey="date" stroke="#9ca3af" />
                                                <YAxis stroke="#9ca3af" />
                                                <Tooltip 
                                                    contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "8px" }}
                                                    labelStyle={{ color: "#fff" }}
                                                />
                                                <Legend />
                                                <Bar dataKey="Calories" fill={COLORS.calories} />
                                                <Bar dataKey="Protein" fill={COLORS.protein} />
                                                <Bar dataKey="Carbs" fill={COLORS.carbs} />
                                                <Bar dataKey="Fats" fill={COLORS.fats} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="bg-gray-900 rounded-lg p-12 text-center border border-gray-800">
                                <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                                <h3 className="text-xl font-semibold text-white mb-2">No Weekly Data</h3>
                                <p className="text-gray-400">{weeklyReport.message}</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Patterns Tab */}
                {activeTab === "patterns" && (
                    <div className="space-y-4">
                        {detectedPatterns.length === 0 ? (
                            <div className="bg-gray-900 rounded-lg p-12 text-center border border-gray-800">
                                <Activity className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                                <h3 className="text-xl font-semibold text-white mb-2">No Patterns Detected</h3>
                                <p className="text-gray-400">Keep logging meals to detect nutrition patterns!</p>
                            </div>
                        ) : (
                            detectedPatterns.map((pattern, idx) => (
                                <div
                                    key={idx}
                                    className={`bg-gray-900 rounded-lg p-6 border-2 ${
                                        pattern.severity === "high" ? "border-red-500/50 bg-red-500/10" :
                                        pattern.severity === "medium" ? "border-yellow-500/50 bg-yellow-500/10" :
                                        "border-blue-500/50 bg-blue-500/10"
                                    }`}
                                >
                                    <div className="flex items-start gap-4">
                                        <Activity className={`w-5 h-5 ${
                                            pattern.severity === "high" ? "text-red-400" :
                                            pattern.severity === "medium" ? "text-yellow-400" :
                                            "text-blue-400"
                                        }`} />
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <h3 className="text-lg font-semibold text-white">{pattern.title}</h3>
                                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                                    pattern.severity === "high" ? "bg-red-500/20 text-red-300" :
                                                    pattern.severity === "medium" ? "bg-yellow-500/20 text-yellow-300" :
                                                    "bg-blue-500/20 text-blue-300"
                                                }`}>
                                                    {pattern.severity.toUpperCase()}
                                                </span>
                                            </div>
                                            <p className="text-gray-300 mb-3">{pattern.description}</p>
                                            <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                                                <p className="text-sm text-gray-300">
                                                    <strong className="text-white">💡 Suggestion:</strong> {pattern.suggestion}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

