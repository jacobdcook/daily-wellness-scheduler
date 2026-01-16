"use client";

import { useState, useEffect } from "react";
import { Sparkles, Target, TrendingUp, Calendar, MessageSquare, Star, Crown, AlertCircle } from "lucide-react";
import { 
    getDailyRecommendations, 
    getWeeklyPlan, 
    getWellnessAnalysis,
    getPremiumStatus,
    subscribePremium,
    DailyRecommendation,
    WeeklyPlan,
    WellnessAnalysis
} from "@/utils/api";
import { useToast } from "@/context/ToastContext";
import { useRouter } from "next/navigation";

export function AICoachDashboard() {
    const { showToast } = useToast();
    const router = useRouter();
    const [recommendations, setRecommendations] = useState<DailyRecommendation[]>([]);
    const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan | null>(null);
    const [analysis, setAnalysis] = useState<WellnessAnalysis | null>(null);
    const [isPremium, setIsPremium] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);

    useEffect(() => {
        loadCoachingData();
    }, []);

    const loadCoachingData = async () => {
        setLoading(true);
        try {
            const [recsData, planData, analysisData, premiumData] = await Promise.all([
                getDailyRecommendations().catch(() => ({ recommendations: [], date: new Date().toISOString().split('T')[0] })),
                getWeeklyPlan().catch(() => null),
                getWellnessAnalysis(7).catch(() => null),
                getPremiumStatus().catch(() => ({ is_premium: false, expires_at: null, plan: "free" }))
            ]);

            setRecommendations(recsData.recommendations || []);
            setWeeklyPlan(planData);
            setAnalysis(analysisData);
            setIsPremium(premiumData.is_premium);
        } catch (error) {
            console.error("Failed to load coaching data:", error);
            showToast("Failed to load coaching data", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleUpgrade = async (plan: "monthly" | "yearly") => {
        try {
            await subscribePremium(plan);
            setIsPremium(true);
            setShowUpgradeModal(false);
            showToast("Premium activated! Welcome to AI Coaching!", "success");
            loadCoachingData();
        } catch (error) {
            showToast("Failed to upgrade. Please try again.", "error");
        }
    };

    if (loading) {
        return (
            <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-400"></div>
                <p className="mt-4 text-gray-400">Loading your AI coach...</p>
            </div>
        );
    }

    if (!isPremium) {
        return (
            <div className="space-y-6">
                <div className="bg-gradient-to-r from-orange-500/20 to-orange-600/20 rounded-lg p-8 border border-orange-500/30 text-center">
                    <Crown className="w-16 h-16 text-orange-400 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-2">Unlock AI Coaching</h2>
                    <p className="text-gray-300 mb-6">
                        Get personalized daily recommendations, weekly plans, and AI-powered insights to reach your goals faster.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto mb-6">
                        <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
                            <div className="text-3xl font-bold text-white mb-2">$9.99</div>
                            <div className="text-sm text-gray-400 mb-4">per month</div>
                            <button
                                onClick={() => handleUpgrade("monthly")}
                                className="w-full px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors"
                            >
                                Subscribe Monthly
                            </button>
                        </div>
                        <div className="bg-gray-800/50 rounded-lg p-6 border border-orange-500/50 relative">
                            <div className="absolute top-2 right-2 bg-orange-500 text-white text-xs px-2 py-1 rounded">Best Value</div>
                            <div className="text-3xl font-bold text-white mb-2">$99.99</div>
                            <div className="text-sm text-gray-400 mb-4">per year</div>
                            <button
                                onClick={() => handleUpgrade("yearly")}
                                className="w-full px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors"
                            >
                                Subscribe Yearly
                            </button>
                        </div>
                    </div>
                    <div className="text-sm text-gray-400">
                        <p>✓ Daily personalized recommendations</p>
                        <p>✓ Weekly goal-based plans</p>
                        <p>✓ Comprehensive wellness analysis</p>
                        <p>✓ AI-powered insights</p>
                    </div>
                </div>
            </div>
        );
    }

    const priorityColors = {
        high: "border-red-500/50 bg-red-500/10",
        medium: "border-yellow-500/50 bg-yellow-500/10",
        low: "border-blue-500/50 bg-blue-500/10"
    };

    const typeIcons = {
        nutrition: "🍎",
        sleep: "😴",
        water: "💧",
        habits: "✅",
        weight: "⚖️",
        general: "💡"
    };

    return (
        <div className="space-y-6">
            {/* Premium Badge */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Crown className="w-5 h-5 text-orange-400" />
                    <span className="text-orange-400 font-medium">Premium AI Coaching</span>
                </div>
            </div>

            {/* Overall Score */}
            {analysis && (
                <div className="bg-gradient-to-r from-orange-500/20 to-orange-600/20 rounded-lg p-6 border border-orange-500/30">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-white">Your Wellness Score</h3>
                        <Star className="w-5 h-5 text-orange-400 fill-orange-400" />
                    </div>
                    <div className="text-4xl font-bold text-white mb-2">{analysis.overall_score}/100</div>
                    <div className="w-full bg-gray-700 rounded-full h-3">
                        <div
                            className="bg-gradient-to-r from-orange-500 to-orange-600 h-3 rounded-full transition-all"
                            style={{ width: `${analysis.overall_score}%` }}
                        />
                    </div>
                    <p className="text-sm text-gray-300 mt-2">
                        {analysis.overall_score >= 80 
                            ? "Excellent! You're doing great!" 
                            : analysis.overall_score >= 60 
                            ? "Good progress! Keep it up!"
                            : "Let's work on improving your wellness score."}
                    </p>
                </div>
            )}

            {/* Daily Recommendations */}
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-5 h-5 text-orange-400" />
                    <h3 className="text-lg font-semibold text-white">Today's Recommendations</h3>
                </div>
                {recommendations.length === 0 ? (
                    <div className="bg-gray-800/50 rounded-lg p-8 border border-gray-700 text-center">
                        <p className="text-gray-400">No recommendations yet. Start tracking your wellness data to get personalized advice!</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {recommendations.map((rec) => (
                            <div
                                key={rec.id}
                                className={`rounded-lg p-5 border ${priorityColors[rec.priority as keyof typeof priorityColors] || priorityColors.medium}`}
                            >
                                <div className="flex items-start gap-3 mb-3">
                                    <div className="text-2xl">{typeIcons[rec.type as keyof typeof typeIcons] || "💡"}</div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="font-semibold text-white">{rec.title}</h4>
                                            <span className={`text-xs px-2 py-1 rounded ${
                                                rec.priority === "high" ? "bg-red-500/20 text-red-400" :
                                                rec.priority === "medium" ? "bg-yellow-500/20 text-yellow-400" :
                                                "bg-blue-500/20 text-blue-400"
                                            }`}>
                                                {rec.priority}
                                            </span>
                                        </div>
                                        <p className="text-gray-300 text-sm mb-3">{rec.message}</p>
                                        <div className="bg-gray-900/50 rounded-lg p-3 mb-3">
                                            <p className="text-xs text-gray-400 mb-2">Action Items:</p>
                                            <ul className="space-y-1">
                                                {rec.action_items.map((item, idx) => (
                                                    <li key={idx} className="text-sm text-gray-300 flex items-start gap-2">
                                                        <span className="text-orange-400 mt-1">•</span>
                                                        <span>{item}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                        <p className="text-xs text-gray-400 italic">"{rec.reasoning}"</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Weekly Plan */}
            {weeklyPlan && (
                <div>
                    <div className="flex items-center gap-2 mb-4">
                        <Calendar className="w-5 h-5 text-orange-400" />
                        <h3 className="text-lg font-semibold text-white">This Week's Plan</h3>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
                        <div className="mb-4">
                            <p className="text-sm text-gray-400 mb-2">Focus Areas:</p>
                            <div className="flex flex-wrap gap-2">
                                {weeklyPlan.focus_areas.map((area, idx) => (
                                    <span key={idx} className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded-full text-sm">
                                        {area}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-3">
                            {weeklyPlan.goals.map((goal, idx) => (
                                <div key={idx} className="bg-gray-900/50 rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="font-medium text-white">{goal.goal}</h4>
                                        <Target className="w-4 h-4 text-orange-400" />
                                    </div>
                                    <div className="flex items-center gap-4 text-sm">
                                        <span className="text-gray-400">Current: <span className="text-white">{goal.current}</span></span>
                                        <span className="text-gray-400">Target: <span className="text-orange-400">{goal.target}</span></span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

