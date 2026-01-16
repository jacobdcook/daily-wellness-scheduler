"use client";

import { useState, useEffect } from "react";
import { ArrowRight, TrendingUp, CheckCircle, Plus } from "lucide-react";
import { FoodItem } from "@/utils/api";
import { FoodHealthBadge } from "./FoodHealthBadge";
import { useRouter } from "next/navigation";
import { useToast } from "@/context/ToastContext";

interface Alternative {
    food: FoodItem;
    health_score: number;
    score_improvement: number;
    similarity: number;
    explanation: string;
}

interface HealthierAlternativesProps {
    currentFood: FoodItem;
    onAddToMeal?: (food: FoodItem) => void;
}

export function HealthierAlternatives({ currentFood, onAddToMeal }: HealthierAlternativesProps) {
    const router = useRouter();
    const { showToast } = useToast();
    const [alternatives, setAlternatives] = useState<Alternative[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadAlternatives();
    }, [currentFood.id]);

    const loadAlternatives = async () => {
        try {
            setLoading(true);
            const { getAuthHeaders } = await import("@/utils/api");
            const headers = await getAuthHeaders();
            const foodId = currentFood.id || currentFood.name;
            const response = await fetch(`/backend/nutrition/health/${encodeURIComponent(foodId)}/alternatives?limit=5`, {
                headers
            });

            if (response.ok) {
                const data = await response.json();
                setAlternatives(data.alternatives || []);
            }
        } catch (error) {
            console.error("Failed to load alternatives:", error);
        } finally {
            setLoading(false);
        }
    };

    const currentScore = currentFood.health?.health_score || 0;

    if (loading) {
        return (
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-2"></div>
                    <p className="text-sm text-gray-400">Finding healthier alternatives...</p>
                </div>
            </div>
        );
    }

    if (alternatives.length === 0) {
        return null;
    }

    return (
        <div className="bg-gradient-to-br from-green-900/20 to-slate-800 rounded-xl p-6 border-2 border-green-500/20">
            <div className="flex items-center gap-3 mb-4">
                <TrendingUp className="w-6 h-6 text-green-400" />
                <h3 className="text-xl font-bold text-white">Healthier Alternatives</h3>
            </div>
            <p className="text-gray-400 mb-6">
                We found {alternatives.length} healthier option{alternatives.length !== 1 ? 's' : ''} with better health scores:
            </p>

            <div className="space-y-4">
                {alternatives.map((alt, idx) => (
                    <div
                        key={alt.food.id || idx}
                        className="bg-slate-700/50 rounded-lg p-4 border border-slate-600 hover:border-green-500/40 transition-all"
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <h4 className="text-lg font-semibold text-white">{alt.food.name}</h4>
                                    <FoodHealthBadge 
                                        health={alt.food.health} 
                                        size="sm" 
                                        showLabel={true} 
                                    />
                                </div>
                                
                                {alt.food.brand && (
                                    <p className="text-sm text-gray-400 mb-2">{alt.food.brand}</p>
                                )}

                                <div className="flex items-center gap-2 mb-3">
                                    <div className="px-2 py-1 bg-green-900/30 text-green-300 text-xs rounded border border-green-700/50">
                                        +{alt.score_improvement} points better
                                    </div>
                                    <div className="text-xs text-gray-400">
                                        {Math.round(alt.similarity * 100)}% similar nutrition
                                    </div>
                                </div>

                                <p className="text-sm text-gray-300 mb-3">{alt.explanation}</p>

                                <div className="flex items-center gap-2 text-xs text-gray-400">
                                    <span>{alt.food.calories || 0} cal</span>
                                    <span>•</span>
                                    <span>{alt.food.protein || 0}g protein</span>
                                    <span>•</span>
                                    <span>{alt.food.carbs || 0}g carbs</span>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                <button
                                    onClick={() => router.push(`/nutrition/food/${encodeURIComponent(alt.food.id || alt.food.name)}`)}
                                    className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
                                >
                                    View Details
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                                {onAddToMeal && (
                                    <button
                                        onClick={() => onAddToMeal(alt.food)}
                                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Add to Meal
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

