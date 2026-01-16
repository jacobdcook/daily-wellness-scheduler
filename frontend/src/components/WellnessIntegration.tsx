"use client";

import { useEffect, useState } from "react";
import { 
    getWellnessScore, 
    getWellnessCorrelations, 
    getWellnessInsights,
    getNutritionChallenges,
    createNutritionChallenge,
    shareMealPlan,
    getFriends,
    WellnessScore,
    WellnessCorrelation,
    WellnessInsight
} from "@/utils/api";
import { useToast } from "@/context/ToastContext";
import { TrendingUp, TrendingDown, Activity, Droplets, Moon, UtensilsCrossed, Target, AlertCircle, Trophy, Users, Share2, Plus } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface WellnessIntegrationProps {
    days?: number;
}

export function WellnessIntegration({ days = 30 }: WellnessIntegrationProps) {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [wellnessScore, setWellnessScore] = useState<WellnessScore | null>(null);
    const [correlations, setCorrelations] = useState<WellnessCorrelation[]>([]);
    const [insights, setInsights] = useState<WellnessInsight[]>([]);
    const [challenges, setChallenges] = useState<any[]>([]);
    const [friends, setFriends] = useState<any[]>([]);
    const [showChallengeModal, setShowChallengeModal] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);

    useEffect(() => {
        loadData();
    }, [days]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [scoreData, correlationsData, insightsData, challengesData, friendsData] = await Promise.all([
                getWellnessScore(days).catch(() => null),
                getWellnessCorrelations(days).catch(() => ({ correlations: [] })),
                getWellnessInsights(days).catch(() => ({ insights: [] })),
                getNutritionChallenges().catch(() => ({ challenges: [] })),
                getFriends().catch(() => ({ friends: [] }))
            ]);
            
            setWellnessScore(scoreData);
            setCorrelations(correlationsData.correlations);
            setInsights(insightsData.insights);
            setChallenges(challengesData.challenges || []);
            setFriends(friendsData.friends || []);
        } catch (error) {
            console.error("Failed to load wellness data:", error);
            showToast("Failed to load wellness data", "error");
        } finally {
            setLoading(false);
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return "text-green-400";
        if (score >= 60) return "text-yellow-400";
        return "text-red-400";
    };

    const getScoreBgColor = (score: number) => {
        if (score >= 80) return "bg-green-500";
        if (score >= 60) return "bg-yellow-500";
        return "bg-red-500";
    };

    if (loading) {
        return (
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-orange-500/20">
                <div className="text-white text-center">Loading wellness data...</div>
            </div>
        );
    }

    // Prepare chart data for correlations
    const correlationChartData = correlations.map(corr => ({
        name: `${corr.metric1} vs ${corr.metric2}`,
        correlation: corr.correlation,
        strength: corr.strength
    }));

    // Prepare pie chart data for wellness score breakdown
    const scoreBreakdown = wellnessScore ? [
        { name: "Nutrition", value: wellnessScore.nutrition_score, color: "#f97316" },
        { name: "Sleep", value: wellnessScore.sleep_score, color: "#6366f1" },
        { name: "Water", value: wellnessScore.water_score, color: "#3b82f6" },
        { name: "Habits", value: wellnessScore.habits_score, color: "#a855f7" },
        { name: "Supplements", value: wellnessScore.supplements_score, color: "#10b981" }
    ] : [];

    return (
        <div className="space-y-6">
            {/* Wellness Score Card */}
            {wellnessScore && (
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-orange-500/20">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-1">Wellness Score</h2>
                            <p className="text-gray-400 text-sm">Overall health across all metrics</p>
                        </div>
                        <div className={`text-5xl font-bold ${getScoreColor(wellnessScore.total_score)}`}>
                            {wellnessScore.total_score.toFixed(0)}
                            <span className="text-2xl text-gray-400">/100</span>
                        </div>
                    </div>

                    {/* Score Breakdown */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                        {wellnessScore.breakdown && Object.entries(wellnessScore.breakdown).map(([key, data]: [string, any]) => (
                            <div key={key} className="text-center">
                                <div className="text-xs text-gray-400 mb-1 capitalize">{key}</div>
                                <div className="text-white font-semibold">{data.score.toFixed(0)}/{data.max}</div>
                                <div className="w-full bg-slate-700 rounded-full h-2 mt-2">
                                    <div
                                        className={`h-2 rounded-full ${getScoreBgColor(data.score)}`}
                                        style={{ width: `${(data.score / data.max) * 100}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Score Breakdown Pie Chart */}
                    {scoreBreakdown.length > 0 && (
                        <div className="mt-6">
                            <h3 className="text-lg font-semibold text-white mb-4">Score Breakdown</h3>
                            <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                    <Pie
                                        data={scoreBreakdown}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, value }) => `${name}: ${value.toFixed(0)}`}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {scoreBreakdown.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
            )}

            {/* Insights Cards */}
            {insights.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-white">Insights</h2>
                    {insights.map((insight, index) => (
                        <div
                            key={index}
                            className={`bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border ${
                                insight.type === "positive" 
                                    ? "border-green-500/20" 
                                    : insight.type === "negative"
                                    ? "border-red-500/20"
                                    : "border-orange-500/20"
                            }`}
                        >
                            <div className="flex items-start gap-4">
                                {insight.type === "positive" ? (
                                    <TrendingUp className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
                                ) : insight.type === "negative" ? (
                                    <TrendingDown className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
                                ) : (
                                    <AlertCircle className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-1" />
                                )}
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-white mb-2">{insight.title}</h3>
                                    <p className="text-gray-300 mb-3">{insight.description}</p>
                                    {insight.recommendation && (
                                        <div className="bg-slate-700/50 rounded-lg p-3">
                                            <p className="text-sm text-gray-300">
                                                <span className="font-semibold text-orange-400">💡 Recommendation: </span>
                                                {insight.recommendation}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Correlations Chart */}
            {correlations.length > 0 && (
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-orange-500/20">
                    <h2 className="text-xl font-bold text-white mb-6">Metric Correlations</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={correlationChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis 
                                dataKey="name" 
                                stroke="#9CA3AF"
                                angle={-45}
                                textAnchor="end"
                                height={100}
                            />
                            <YAxis 
                                stroke="#9CA3AF"
                                domain={[-1, 1]}
                            />
                            <Tooltip 
                                contentStyle={{ 
                                    backgroundColor: "#1F2937", 
                                    border: "1px solid #374151",
                                    borderRadius: "8px"
                                }}
                            />
                            <Legend />
                            <Line 
                                type="monotone" 
                                dataKey="correlation" 
                                stroke="#f97316" 
                                strokeWidth={2}
                                dot={{ fill: "#f97316", r: 4 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                    
                    {/* Correlation Details */}
                    <div className="mt-6 space-y-3">
                        {correlations.map((corr, index) => (
                            <div key={index} className="bg-slate-700/50 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-white font-medium">
                                        {corr.metric1.replace("_", " ")} ↔ {corr.metric2.replace("_", " ")}
                                    </span>
                                    <span className={`text-sm font-semibold ${
                                        corr.correlation > 0 ? "text-green-400" : "text-red-400"
                                    }`}>
                                        {corr.correlation > 0 ? "+" : ""}{corr.correlation.toFixed(2)}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-400">{corr.insight}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {!wellnessScore && insights.length === 0 && correlations.length === 0 && (
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-12 border border-orange-500/20 text-center">
                    <Activity className="w-16 h-16 text-orange-400 mx-auto mb-4 opacity-50" />
                    <p className="text-gray-400 mb-2">No wellness data available yet</p>
                    <p className="text-sm text-gray-500">
                        Start tracking nutrition, sleep, water, and habits to see holistic insights
                    </p>
                </div>
            )}
        </div>
    );
}

