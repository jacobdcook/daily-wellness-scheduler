"use client";

import { TrendingUp, Brain, Battery, Moon, MessageCircle, Sparkles, Target, TrendingDown, AlertCircle, Lightbulb, Clock, Calendar } from "lucide-react";
import clsx from "clsx";
import { Prediction, Recommendation, Trends, Patterns } from "@/utils/api";

interface Correlation {
    correlation: "positive" | "negative";
    metric: string;
    lift: number;
    message: string;
}

interface InsightsPanelProps {
    correlations: Correlation[];
    prediction?: Prediction;
    recommendations?: Recommendation[];
    trends?: Trends;
    patterns?: Patterns;
    lastAction?: { summary: string; timestamp: string } | null;
    onAskAi?: (prompt: string, autoSend?: boolean) => void;
}

export function InsightsPanel({ correlations, prediction, recommendations, trends, patterns, lastAction, onAskAi }: InsightsPanelProps) {
    // Show panel if we have any insights data
    const hasData = (correlations && correlations.length > 0) || 
                    prediction || 
                    (recommendations && recommendations.length > 0) || 
                    (trends && trends.data_points > 0) || 
                    patterns;
    
    if (!hasData) {
        return null;
    }

    const getIcon = (metric: string) => {
        if (!metric) return <TrendingUp size={20} className="text-primary-500" />;
        switch (metric.toLowerCase()) {
            case "energy": return <Battery size={20} className="text-yellow-500" />;
            case "mood": return <Brain size={20} className="text-blue-500" />;
            case "sleep": return <Moon size={20} className="text-purple-500" />;
            default: return <TrendingUp size={20} className="text-primary-500" />;
        }
    };

    const quickPrompts = [
        "Suggest a calmer evening stack",
        "Optimize hydration for sweaty days",
        "Shift magnesium to improve sleep tonight"
    ];

    return (
        <div className="card-surface bg-gradient-to-br from-indigo-50/60 to-purple-50/60 dark:from-indigo-900/30 dark:to-purple-900/20 border border-indigo-100/60 dark:border-indigo-900/40">
            <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-indigo-900 dark:text-indigo-100 flex items-center gap-2">
                    <Brain size={20} />
                    Wellness Intelligence
                </h3>
                <span className="chip bg-white/70 dark:bg-white/10 text-indigo-700 dark:text-indigo-200 border-indigo-200/60 dark:border-indigo-900/40">
                    <Sparkles size={14} />
                    AI powered
                </span>
            </div>

            {/* Today's Prediction */}
            {prediction && prediction.predicted_rate > 0 && (
                <div className="card-surface bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Target size={18} className="text-blue-600 dark:text-blue-400" />
                        <span className="font-semibold text-gray-900 dark:text-gray-100">Today's Prediction</span>
                    </div>
                    <div className="flex items-baseline gap-2 mb-2">
                        <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{prediction.predicted_rate}%</span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">completion rate</span>
                        <span className="text-xs text-gray-500 dark:text-gray-500">({Math.round(prediction.confidence * 100)}% confidence)</span>
                    </div>
                    {prediction.factors.length > 0 && (
                        <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                            {prediction.factors.map((factor, idx) => (
                                <div key={idx}>• {factor}</div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Trends */}
            {trends && trends.data_points > 0 && (
                <div className="card-surface bg-white/70 dark:bg-gray-900/40 border border-indigo-100 dark:border-indigo-900/40 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                        {trends.trend_direction === "improving" ? (
                            <TrendingUp size={18} className="text-green-600 dark:text-green-400" />
                        ) : trends.trend_direction === "declining" ? (
                            <TrendingDown size={18} className="text-red-600 dark:text-red-400" />
                        ) : (
                            <TrendingUp size={18} className="text-gray-600 dark:text-gray-400" />
                        )}
                        <span className="font-semibold text-gray-900 dark:text-gray-100">30-Day Trend</span>
                    </div>
                    <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Average Completion:</span>
                            <span className="font-semibold text-gray-900 dark:text-gray-100">{trends.average_completion_rate}%</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Trend:</span>
                            <span className={clsx(
                                "font-semibold",
                                trends.trend_direction === "improving" ? "text-green-600 dark:text-green-400" :
                                trends.trend_direction === "declining" ? "text-red-600 dark:text-red-400" :
                                "text-gray-600 dark:text-gray-400"
                            )}>
                                {trends.trend_direction === "improving" ? "↗ Improving" :
                                 trends.trend_direction === "declining" ? "↘ Declining" :
                                 "→ Stable"} {trends.trend_magnitude > 0 && `(${trends.trend_magnitude}%)`}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Smart Recommendations */}
            {recommendations && recommendations.length > 0 && (
                <div className="mb-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Lightbulb size={18} className="text-yellow-600 dark:text-yellow-400" />
                        <span className="font-semibold text-gray-900 dark:text-gray-100">Smart Recommendations</span>
                    </div>
                    <div className="space-y-2">
                        {recommendations.slice(0, 3).map((rec, idx) => (
                            <div key={idx} className={clsx(
                                "card-surface border-l-4",
                                rec.priority === "high" ? "border-red-500 bg-red-50/50 dark:bg-red-900/10" :
                                rec.priority === "medium" ? "border-yellow-500 bg-yellow-50/50 dark:bg-yellow-900/10" :
                                "border-blue-500 bg-blue-50/50 dark:bg-blue-900/10"
                            )}>
                                <div className="flex items-start gap-2 mb-1">
                                    {rec.priority === "high" && <AlertCircle size={16} className="text-red-600 dark:text-red-400 mt-0.5" />}
                                    <div className="flex-1">
                                        <div className="font-semibold text-sm text-gray-900 dark:text-gray-100">{rec.title}</div>
                                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{rec.message}</p>
                                        {onAskAi && (
                                            <button
                                                onClick={() => onAskAi(rec.action, false)}
                                                className="mt-2 text-xs font-semibold text-primary-600 dark:text-primary-300 underline-offset-2 hover:underline"
                                            >
                                                {rec.action}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Patterns */}
            {patterns && (patterns.best_hour || patterns.best_day) && (
                <div className="card-surface bg-white/70 dark:bg-gray-900/40 border border-indigo-100 dark:border-indigo-900/40 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Clock size={18} className="text-indigo-600 dark:text-indigo-400" />
                        <span className="font-semibold text-gray-900 dark:text-gray-100">Your Patterns</span>
                    </div>
                    <div className="space-y-2 text-sm">
                        {patterns.best_hour && (
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600 dark:text-gray-400">Best Time:</span>
                                <span className="font-semibold text-gray-900 dark:text-gray-100">
                                    {patterns.best_hour.hour}:00 ({patterns.best_hour.rate}% completion)
                                </span>
                            </div>
                        )}
                        {patterns.best_day && (
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600 dark:text-gray-400">Best Day:</span>
                                <span className="font-semibold text-gray-900 dark:text-gray-100">
                                    {patterns.best_day.day} ({patterns.best_day.rate}% completion)
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Correlations */}
            <div className="space-y-3">
                {correlations.slice(0, 4).map((insight, idx) => (
                    <div key={idx} className="card-surface flex items-start gap-3 bg-white/70 dark:bg-gray-900/40 border border-indigo-100 dark:border-indigo-900/40">
                        <div className="mt-1 p-2 bg-white dark:bg-gray-800 rounded-full shadow-sm">
                            {getIcon(insight.metric)}
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-gray-900 dark:text-gray-100 capitalize">{insight.metric || "Metric"}</span>
                                <span
                                    className={clsx(
                                        "text-xs font-bold px-2 py-0.5 rounded-full",
                                        insight.correlation === "positive"
                                            ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-200"
                                            : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-200"
                                    )}
                                >
                                    {insight.correlation === "positive" ? "+" : "-"}
                                    {Math.abs(insight.lift)}%
                                </span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{insight.message}</p>
                            {onAskAi && (
                                <button
                                    onClick={() => onAskAi(`Explain how ${insight.metric} is affected and adjust my plan.`)}
                                    className="mt-2 text-xs font-semibold text-primary-600 dark:text-primary-300 underline-offset-2 hover:underline"
                                >
                                    Ask AI to adjust
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid md:grid-cols-2 gap-4 mt-6">
                <div className="card-surface space-y-3">
                    <div className="flex items-center justify-between text-sm font-semibold text-gray-700 dark:text-gray-200">
                        <span>Interaction checker</span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">AI activity</span>
                    </div>
                    {lastAction ? (
                        <>
                            <p className="text-sm text-gray-900 dark:text-gray-100">{lastAction.summary}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                {new Date(lastAction.timestamp).toLocaleTimeString()}
                            </p>
                        </>
                    ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400">No recent AI actions recorded.</p>
                    )}
                    {onAskAi && (
                        <button
                            onClick={() => onAskAi("Review my plan and highlight anything that looks off.", true)}
                            className="mt-2 inline-flex items-center gap-2 text-sm text-primary-600 dark:text-primary-300"
                        >
                            <MessageCircle size={16} />
                            Ask assistant for a check-up
                        </button>
                    )}
                </div>

                <div className="card-surface space-y-2">
                    <p className="text-sm text-gray-600 dark:text-gray-300">Try a natural language command:</p>
                    <div className="flex flex-wrap gap-2">
                        {quickPrompts.map((prompt) => (
                            <button
                                key={prompt}
                                disabled={!onAskAi}
                                onClick={() => onAskAi && onAskAi(prompt)}
                                className="px-3 py-1.5 text-xs rounded-full border border-indigo-100 dark:border-indigo-900/40 text-indigo-600 dark:text-indigo-200 bg-white/80 dark:bg-gray-900/40 hover:border-primary-300 disabled:opacity-50"
                            >
                                {prompt}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
