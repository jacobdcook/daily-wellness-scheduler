"use client";

import { X, AlertTriangle, Info } from "lucide-react";
import { FoodHealthBadge } from "./FoodHealthBadge";
import { NutriScoreDisplay } from "./NutriScoreDisplay";
import { NovaBadge } from "./NovaBadge";
import { AdditivesList } from "./AdditivesList";
import { IngredientAnalysis } from "./IngredientAnalysis";
import { HealthBreakdown } from "./HealthBreakdown";

interface HealthData {
    health_score?: number;
    health_grade?: string;
    breakdown?: {
        nutri_score_points?: number;
        nova_points?: number;
        additives_points?: number;
        ingredient_quality_points?: number;
        final_score?: number;
        grade?: string;
    };
    nutri_score?: {
        grade?: string;
        description?: string;
    };
    nova?: {
        group?: number;
        description?: string;
    };
    additives?: {
        total?: number;
        harmful?: string[];
        questionable?: string[];
        safe?: string[];
        has_harmful?: boolean;
        has_questionable?: boolean;
    };
    ingredients_analysis?: string[];
    recommendation?: string;
    ecoscore?: string;
}

interface FoodItem {
    name: string;
    brand?: string;
    health?: HealthData;
    ingredients_text?: string;
}

interface FoodHealthDetailsProps {
    food: FoodItem;
    isOpen: boolean;
    onClose: () => void;
}

export function FoodHealthDetails({ food, isOpen, onClose }: FoodHealthDetailsProps) {
    if (!isOpen) return null;

    const health = food.health;

    return (
        <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onClose();
                }
            }}
        >
            <div className="bg-slate-800 rounded-xl border-2 border-orange-500/30 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-4 flex items-center justify-between z-10">
                    <div>
                        <h2 className="text-xl font-bold text-white">{food.name}</h2>
                        {food.brand && (
                            <p className="text-sm text-gray-400">{food.brand}</p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Health Score */}
                    {health && (
                        <>
                            <div className="bg-gradient-to-br from-slate-700/80 to-slate-800/80 rounded-xl p-6 border-2 border-slate-600 shadow-lg">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h3 className="text-xl font-bold text-white mb-1">Overall Health Score</h3>
                                        <p className="text-xs text-gray-400">Based on nutrition, processing, and additives</p>
                                    </div>
                                    <FoodHealthBadge health={health} size="lg" />
                                </div>
                                
                                {health.recommendation && (
                                    <div className="mt-4 p-4 bg-slate-600/60 rounded-lg border border-orange-500/30 shadow-md">
                                        <div className="flex items-start gap-3">
                                            <Info className="w-5 h-5 text-orange-400 mt-0.5 flex-shrink-0" />
                                            <p className="text-sm text-gray-200 leading-relaxed">{health.recommendation}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Score Breakdown */}
                            {health.breakdown && (
                                <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                                    <HealthBreakdown breakdown={health.breakdown} showChart={true} />
                                </div>
                            )}

                            {/* Nutri-Score & NOVA */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-gradient-to-br from-blue-900/20 to-slate-700/50 rounded-xl p-5 border-2 border-blue-500/20 shadow-md hover:border-blue-500/40 transition-all">
                                    <h4 className="text-sm font-semibold text-blue-300 mb-3 uppercase tracking-wide">Nutri-Score</h4>
                                    <div className="flex items-center gap-3">
                                        <NutriScoreDisplay
                                            grade={health.nutri_score?.grade}
                                            description={health.nutri_score?.description}
                                            size="lg"
                                            showDescription={true}
                                        />
                                        {health.nutri_score?.description && (
                                            <p className="text-xs text-gray-400 flex-1">{health.nutri_score.description}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="bg-gradient-to-br from-orange-900/20 to-slate-700/50 rounded-xl p-5 border-2 border-orange-500/20 shadow-md hover:border-orange-500/40 transition-all">
                                    <h4 className="text-sm font-semibold text-orange-300 mb-3 uppercase tracking-wide">Processing Level</h4>
                                    <div className="flex items-center gap-3">
                                        <NovaBadge
                                            group={health.nova?.group}
                                            description={health.nova?.description}
                                            size="md"
                                            showDescription={true}
                                        />
                                        {health.nova?.description && (
                                            <p className="text-xs text-gray-400 flex-1">{health.nova.description}</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Additives */}
                            {health.additives && (
                                <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                                    <h4 className="text-sm font-medium text-gray-400 mb-3">Additives</h4>
                                    <AdditivesList additives={health.additives} compact={false} />
                                </div>
                            )}

                            {/* Ingredients */}
                            <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                                <h4 className="text-sm font-medium text-gray-400 mb-3">Ingredients</h4>
                                <IngredientAnalysis
                                    ingredients={health.ingredients_analysis}
                                    ingredientsText={food.ingredients_text}
                                    compact={false}
                                />
                            </div>

                            {/* Ecoscore */}
                            {health.ecoscore && (
                                <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                                    <h4 className="text-sm font-medium text-gray-400 mb-2">Environmental Impact</h4>
                                    <div className="text-2xl font-bold text-green-400">
                                        {health.ecoscore.toUpperCase()}
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">Ecoscore rating</p>
                                </div>
                            )}
                        </>
                    )}

                    {!health && (
                        <div className="text-center py-8 text-gray-400">
                            Health analysis not available for this food item.
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-slate-800 border-t border-slate-700 p-4">
                    <button
                        onClick={onClose}
                        className="w-full py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

