"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Share2, AlertTriangle, Info, Award } from "lucide-react";
import { getFoodDetails, searchFoods, FoodItem } from "@/utils/api";
import { useToast } from "@/context/ToastContext";
import { FoodHealthBadge } from "@/components/FoodHealthBadge";
import { NutriScoreDisplay } from "@/components/NutriScoreDisplay";
import { NovaBadge } from "@/components/NovaBadge";
import { AdditivesList } from "@/components/AdditivesList";
import { IngredientAnalysis } from "@/components/IngredientAnalysis";
import { HealthBreakdown } from "@/components/HealthBreakdown";
import { HealthierAlternatives } from "@/components/HealthierAlternatives";
import { HealthTips } from "@/components/HealthTips";

export default function FoodDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const { showToast } = useToast();
    const [food, setFood] = useState<FoodItem | null>(null);
    const [loading, setLoading] = useState(true);
    const loadingRef = useRef(false);

    const foodId = params.id as string;

    useEffect(() => {
        // Only load if not already loading and food ID has changed
        if (!loadingRef.current && foodId) {
            loadFoodDetails();
        }
    }, [foodId]);

    const loadFoodDetails = async () => {
        // Prevent concurrent loads
        if (loadingRef.current) return;
        
        try {
            loadingRef.current = true;
            setLoading(true);
            const decodedId = decodeURIComponent(foodId);
            
            // Try to get food details directly
            try {
                const result = await getFoodDetails(decodedId);
                setFood(result);
            } catch (error: any) {
                console.error("Direct lookup failed, trying search:", error);
                // If direct lookup fails, try searching
                try {
                    const searchResult = await searchFoods(decodedId);
                    if (searchResult.foods && searchResult.foods.length > 0) {
                        // Find exact match by ID, barcode, or name
                        const found = searchResult.foods.find(
                            f => f.id === decodedId || 
                                 f.barcode === decodedId ||
                                 f.name.toLowerCase() === decodedId.toLowerCase()
                        ) || searchResult.foods[0];
                        setFood(found);
                    } else {
                        throw new Error("Food not found in search results");
                    }
                } catch (searchError) {
                    console.error("Search also failed:", searchError);
                    throw new Error("Food not found");
                }
            }
        } catch (error: any) {
            console.error("Failed to load food details:", error);
            showToast(error.message || "Failed to load food details", "error");
        } finally {
            setLoading(false);
            loadingRef.current = false;
        }
    };

    const handleShare = async () => {
        if (!food) return;

        const shareData = {
            title: `${food.name} - Health Score: ${food.health?.health_score || 'N/A'}/100`,
            text: `Check out the health analysis for ${food.name}`,
            url: window.location.href,
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                // Fallback: copy to clipboard
                await navigator.clipboard.writeText(window.location.href);
                showToast("Link copied to clipboard!", "success");
            }
        } catch (error) {
            console.error("Error sharing:", error);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading food details...</p>
                </div>
            </div>
        );
    }

    if (!food) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
                <div className="text-center max-w-md">
                    <AlertTriangle className="w-16 h-16 text-orange-400 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-2">Food Not Found</h2>
                    <p className="text-gray-400 mb-6">The food item you're looking for doesn't exist or has been removed.</p>
                    <button
                        onClick={() => router.push("/nutrition/health-scanner")}
                        className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
                    >
                        Back to Scanner
                    </button>
                </div>
            </div>
        );
    }

    const health = food.health;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            <div className="max-w-4xl mx-auto p-4 md:p-6">
                {/* Header */}
                <div className="mb-6">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        <span>Back</span>
                    </button>

                    <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                            <h1 className="text-4xl font-bold text-white mb-2">{food.name}</h1>
                            {food.brand && (
                                <p className="text-xl text-gray-400">{food.brand}</p>
                            )}
                        </div>
                        <button
                            onClick={handleShare}
                            className="p-3 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                            title="Share"
                        >
                            <Share2 className="w-5 h-5 text-gray-300" />
                        </button>
                    </div>
                </div>

                {/* Health Score - Hero Section */}
                {health && (
                    <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-2xl p-8 border-2 border-orange-500/30 shadow-2xl mb-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-white mb-2">Overall Health Score</h2>
                                <p className="text-gray-400">Comprehensive analysis based on nutrition, processing, and additives</p>
                            </div>
                            <FoodHealthBadge health={health} size="lg" showLabel={true} />
                        </div>

                        {health.recommendation && (
                            <div className="p-4 bg-slate-600/60 rounded-xl border border-orange-500/30">
                                <div className="flex items-start gap-3">
                                    <Info className="w-6 h-6 text-orange-400 mt-0.5 flex-shrink-0" />
                                    <p className="text-base text-gray-200 leading-relaxed">{health.recommendation}</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Score Breakdown */}
                {health?.breakdown && (
                    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 mb-6">
                        <HealthBreakdown breakdown={health.breakdown} showChart={true} />
                    </div>
                )}

                {/* Nutri-Score & NOVA */}
                {health && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div className="bg-gradient-to-br from-blue-900/20 to-slate-800 rounded-xl p-6 border-2 border-blue-500/20">
                            <h3 className="text-lg font-semibold text-blue-300 mb-4 uppercase tracking-wide">Nutri-Score</h3>
                            <div className="flex items-center gap-4">
                                <NutriScoreDisplay
                                    grade={health.nutri_score?.grade}
                                    description={health.nutri_score?.description}
                                    size="lg"
                                    showDescription={true}
                                />
                                {health.nutri_score?.description && (
                                    <p className="text-sm text-gray-400 flex-1">{health.nutri_score.description}</p>
                                )}
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-orange-900/20 to-slate-800 rounded-xl p-6 border-2 border-orange-500/20">
                            <h3 className="text-lg font-semibold text-orange-300 mb-4 uppercase tracking-wide">Processing Level</h3>
                            <div className="flex items-center gap-4">
                                <NovaBadge
                                    group={health.nova?.group}
                                    description={health.nova?.description}
                                    size="md"
                                    showDescription={true}
                                />
                                {health.nova?.description && (
                                    <p className="text-sm text-gray-400 flex-1">{health.nova.description}</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Nutrition Facts */}
                <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 mb-6">
                    <h3 className="text-xl font-bold text-white mb-4">Nutrition Facts</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-4 bg-slate-700/50 rounded-lg">
                            <div className="text-2xl font-bold text-orange-400">{food.calories}</div>
                            <div className="text-sm text-gray-400 mt-1">Calories</div>
                        </div>
                        <div className="text-center p-4 bg-slate-700/50 rounded-lg">
                            <div className="text-2xl font-bold text-purple-400">{food.protein}g</div>
                            <div className="text-sm text-gray-400 mt-1">Protein</div>
                        </div>
                        <div className="text-center p-4 bg-slate-700/50 rounded-lg">
                            <div className="text-2xl font-bold text-blue-400">{food.carbs}g</div>
                            <div className="text-sm text-gray-400 mt-1">Carbs</div>
                        </div>
                        <div className="text-center p-4 bg-slate-700/50 rounded-lg">
                            <div className="text-2xl font-bold text-yellow-400">{food.fats}g</div>
                            <div className="text-sm text-gray-400 mt-1">Fats</div>
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 text-center mt-4">Per {food.serving_size}</p>
                </div>

                {/* Additives */}
                {health?.additives && (
                    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 mb-6">
                        <h3 className="text-xl font-bold text-white mb-4">Additives</h3>
                        <AdditivesList additives={health.additives} compact={false} />
                    </div>
                )}

                {/* Ingredients */}
                <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 mb-6">
                    <h3 className="text-xl font-bold text-white mb-4">Ingredients</h3>
                    <IngredientAnalysis
                        ingredients={health?.ingredients_analysis}
                        ingredientsText={food.ingredients_text}
                        compact={false}
                    />
                </div>

                {/* Ecoscore */}
                {health?.ecoscore && (
                    <div className="bg-gradient-to-br from-green-900/20 to-slate-800 rounded-xl p-6 border-2 border-green-500/20 mb-6">
                        <h3 className="text-lg font-semibold text-green-300 mb-4 uppercase tracking-wide">Environmental Impact</h3>
                        <div className="text-4xl font-bold text-green-400 mb-2">
                            {health.ecoscore.toUpperCase()}
                        </div>
                        <p className="text-sm text-gray-400">Ecoscore rating</p>
                    </div>
                )}

                {/* Healthier Alternatives */}
                {health && health.health_score !== undefined && health.health_score < 80 && (
                    <div className="mb-6">
                        <HealthierAlternatives currentFood={food} />
                    </div>
                )}

                {/* Health Tips & Education */}
                <div className="mb-6">
                    <HealthTips health={health} />
                </div>
            </div>
        </div>
    );
}

