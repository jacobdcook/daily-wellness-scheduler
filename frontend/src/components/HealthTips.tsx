"use client";

import { Info, BookOpen, AlertTriangle, CheckCircle, Lightbulb } from "lucide-react";
import { useState } from "react";

interface HealthData {
    health_score?: number;
    health_grade?: string;
    nutri_score?: {
        grade?: string;
        description?: string;
    };
    nova?: {
        group?: number;
        description?: string;
    };
    additives?: {
        has_harmful?: boolean;
        total?: number;
    };
}

interface HealthTipsProps {
    health?: HealthData;
}

export function HealthTips({ health }: HealthTipsProps) {
    const [expandedTip, setExpandedTip] = useState<string | null>(null);

    if (!health) {
        return null;
    }

    const score = health.health_score || 0;
    const tips: Array<{ id: string; icon: any; title: string; content: string; type: "info" | "warning" | "success" }> = [];

    // Score-based tips
    if (score < 40) {
        tips.push({
            id: "low-score",
            icon: AlertTriangle,
            title: "Low Health Score",
            content: "This food has a low health score. Consider choosing whole, unprocessed foods with fewer additives for better nutrition.",
            type: "warning"
        });
    } else if (score >= 80) {
        tips.push({
            id: "high-score",
            icon: CheckCircle,
            title: "Excellent Choice!",
            content: "This is a healthy food option. Keep making choices like this for optimal nutrition and wellness.",
            type: "success"
        });
    }

    // NOVA-based tips
    if (health.nova?.group === 4) {
        tips.push({
            id: "ultra-processed",
            icon: AlertTriangle,
            title: "Ultra-Processed Food",
            content: "This food is highly processed (NOVA 4). Ultra-processed foods often contain many additives and have been linked to health issues. Try to limit consumption and opt for whole foods when possible.",
            type: "warning"
        });
    } else if (health.nova?.group === 1) {
        tips.push({
            id: "unprocessed",
            icon: CheckCircle,
            title: "Minimally Processed",
            content: "Great! This food is unprocessed or minimally processed, which means it's closer to its natural state and typically more nutritious.",
            type: "success"
        });
    }

    // Additives tips
    if (health.additives?.has_harmful) {
        tips.push({
            id: "harmful-additives",
            icon: AlertTriangle,
            title: "Contains Harmful Additives",
            content: "This product contains additives that may have negative health effects. Look for products with fewer or no artificial additives for better health outcomes.",
            type: "warning"
        });
    } else if (health.additives && health.additives.total === 0) {
        tips.push({
            id: "no-additives",
            icon: CheckCircle,
            title: "No Additives",
            content: "Excellent! This product contains no additives, making it a cleaner, more natural choice.",
            type: "success"
        });
    }

    // Nutri-Score tips
    if (health.nutri_score?.grade === "E" || health.nutri_score?.grade === "D") {
        tips.push({
            id: "poor-nutri",
            icon: AlertTriangle,
            title: "Poor Nutritional Quality",
            content: "The Nutri-Score indicates this food has poor nutritional quality. Look for foods with Nutri-Score A or B for better nutrition.",
            type: "warning"
        });
    }

    // General tips
    tips.push({
        id: "nutri-score-info",
        icon: Info,
        title: "About Nutri-Score",
        content: "Nutri-Score is a nutritional rating system (A-E) that evaluates foods based on their nutritional composition. A is the best, E is the worst. It considers calories, sugar, salt, protein, fiber, and more.",
        type: "info"
    });

    tips.push({
        id: "nova-info",
        icon: Info,
        title: "About NOVA Classification",
        content: "NOVA classifies foods by processing level: 1 = Unprocessed, 2 = Processed ingredients, 3 = Processed foods, 4 = Ultra-processed. Lower numbers are generally healthier.",
        type: "info"
    });

    if (tips.length === 0) {
        return null;
    }

    return (
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
                <Lightbulb className="w-6 h-6 text-orange-400" />
                <h3 className="text-xl font-bold text-white">Health Tips & Education</h3>
            </div>

            <div className="space-y-3">
                {tips.map((tip) => {
                    const Icon = tip.icon;
                    const isExpanded = expandedTip === tip.id;
                    
                    return (
                        <div
                            key={tip.id}
                            className={`rounded-lg border transition-all ${
                                tip.type === "warning"
                                    ? "bg-orange-900/20 border-orange-500/30"
                                    : tip.type === "success"
                                    ? "bg-green-900/20 border-green-500/30"
                                    : "bg-blue-900/20 border-blue-500/30"
                            }`}
                        >
                            <button
                                onClick={() => setExpandedTip(isExpanded ? null : tip.id)}
                                className="w-full p-4 flex items-start gap-3 text-left"
                            >
                                <Icon
                                    className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                                        tip.type === "warning"
                                            ? "text-orange-400"
                                            : tip.type === "success"
                                            ? "text-green-400"
                                            : "text-blue-400"
                                    }`}
                                />
                                <div className="flex-1">
                                    <h4 className="font-semibold text-white mb-1">{tip.title}</h4>
                                    {isExpanded && (
                                        <p className="text-sm text-gray-300 leading-relaxed">{tip.content}</p>
                                    )}
                                </div>
                                {!isExpanded && (
                                    <BookOpen className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                )}
                            </button>
                        </div>
                    );
                })}
            </div>

            <div className="mt-6 pt-6 border-t border-slate-700">
                <p className="text-xs text-gray-400 text-center">
                    💡 Tip: Click on any tip above to learn more about health scoring and nutrition
                </p>
            </div>
        </div>
    );
}

