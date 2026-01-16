"use client";

import { useState, useEffect } from "react";
import { X, Sparkles, Plus, Heart, Clock, ChefHat, Star, Target, TrendingUp, Info, Eye } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { getMealSuggestions, saveFavoriteMeal, createNutritionEntry, MealSuggestion } from "@/utils/api";
import { useToast } from "@/context/ToastContext";

interface MealSuggestionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    mealType: string;
    date?: string;
    onMealAdded?: () => void;
}

export function MealSuggestionsModal({ isOpen, onClose, mealType, date, onMealAdded }: MealSuggestionsModalProps) {
    const { showToast } = useToast();
    const router = useRouter();
    const [suggestions, setSuggestions] = useState<MealSuggestion[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedSuggestion, setSelectedSuggestion] = useState<MealSuggestion | null>(null);
    const [macroGaps, setMacroGaps] = useState<any>(null);
    const [targetCalories, setTargetCalories] = useState<number | null>(null);

    useEffect(() => {
        if (isOpen && mealType) {
            loadSuggestions();
        }
    }, [isOpen, mealType, date]);

    const loadSuggestions = async () => {
        setLoading(true);
        try {
            const data = await getMealSuggestions(mealType, date);
            setSuggestions(data.suggestions || []);
            setMacroGaps(data.macro_gaps || null);
            setTargetCalories(data.target_calories || null);
        } catch (error) {
            showToast("Failed to load meal suggestions", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleAddMeal = async (suggestion: MealSuggestion) => {
        try {
            await createNutritionEntry({
                food_item: { id: suggestion.food_item_id, name: suggestion.food_name } as any,
                quantity: 1,
                unit: suggestion.serving_size,
                meal_type: mealType,
                date: date || new Date().toISOString().split('T')[0],
                nutrition: {
                    calories: suggestion.calories,
                    protein: suggestion.protein,
                    carbs: suggestion.carbs,
                    fats: suggestion.fats,
                },
            });
            showToast(`${suggestion.food_name} added to ${mealType}!`, "success");
            onMealAdded?.();
            onClose();
        } catch (error) {
            showToast("Failed to add meal", "error");
        }
    };

    const handleSaveFavorite = async (suggestion: MealSuggestion) => {
        try {
            await saveFavoriteMeal({
                name: suggestion.food_name,
                food_entries: [{
                    food_item_id: suggestion.food_item_id,
                    food_name: suggestion.food_name,
                    quantity: 1,
                    unit: suggestion.serving_size,
                }],
                total_calories: suggestion.calories,
                total_protein: suggestion.protein,
                total_carbs: suggestion.carbs,
                total_fats: suggestion.fats,
                meal_type: mealType,
            });
            showToast("Saved to favorites!", "success");
        } catch (error) {
            showToast("Failed to save favorite", "error");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                <div className="flex items-center justify-between p-6 border-b border-gray-800">
                    <div className="flex items-center gap-3">
                        <Sparkles className="w-5 h-5 text-orange-400" />
                        <h2 className="text-xl font-bold text-white">
                            AI Meal Suggestions for {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="text-center py-12">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-400"></div>
                            <p className="mt-4 text-gray-400">Finding perfect meals for you...</p>
                        </div>
                    ) : suggestions.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-gray-400">No suggestions available. Try logging some meals first!</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Summary Info & Macro Gaps */}
                            <div className="space-y-3">
                                <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
                                    <div className="flex items-start gap-3">
                                        <Info className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                                        <div className="text-sm text-blue-300 flex-1">
                                            <p className="font-medium mb-1">Personalized Recommendations</p>
                                            <p className="text-blue-400">
                                                Suggestions are ranked by how well they fit your goals, preferences, and macro needs.
                                                {suggestions.some(s => s.is_recipe) && " Recipes from your collection are prioritized."}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Macro Gap Analysis */}
                                {macroGaps && (
                                    <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-800/50 rounded-lg p-4">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Target className="w-5 h-5 text-purple-400" />
                                            <h3 className="font-semibold text-white">Your Macro Needs</h3>
                                        </div>
                                        <div className="grid grid-cols-3 gap-3">
                                            {macroGaps.needs_protein && (
                                                <div className="bg-blue-500/10 rounded-lg p-2 border border-blue-500/20">
                                                    <div className="text-xs text-gray-400 mb-1">Need More</div>
                                                    <div className="text-sm font-bold text-blue-400">Protein</div>
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        {macroGaps.protein_percent?.toFixed(0) || 0}% of goal
                                                    </div>
                                                </div>
                                            )}
                                            {macroGaps.needs_carbs && (
                                                <div className="bg-green-500/10 rounded-lg p-2 border border-green-500/20">
                                                    <div className="text-xs text-gray-400 mb-1">Need More</div>
                                                    <div className="text-sm font-bold text-green-400">Carbs</div>
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        {macroGaps.carbs_percent?.toFixed(0) || 0}% of goal
                                                    </div>
                                                </div>
                                            )}
                                            {macroGaps.needs_fats && (
                                                <div className="bg-yellow-500/10 rounded-lg p-2 border border-yellow-500/20">
                                                    <div className="text-xs text-gray-400 mb-1">Need More</div>
                                                    <div className="text-sm font-bold text-yellow-400">Fats</div>
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        {macroGaps.fats_percent?.toFixed(0) || 0}% of goal
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        {targetCalories && (
                                            <div className="mt-3 pt-3 border-t border-gray-700">
                                                <div className="text-xs text-gray-400">Target for this meal</div>
                                                <div className="text-lg font-bold text-orange-400">{Math.round(targetCalories)} calories</div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {suggestions.map((suggestion, idx) => {
                                const isRecipe = suggestion.is_recipe || suggestion.source === "recipe";
                                const isFavorite = suggestion.source === "favorite";
                                const macroFit = suggestion.macro_fit_score || 0;
                                const fitPercentage = Math.round(macroFit * 100);
                                
                                return (
                                    <motion.div
                                        key={idx}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className={`bg-gray-800/50 rounded-lg p-5 border transition-all ${
                                            idx === 0 
                                                ? "border-orange-500/50 shadow-lg shadow-orange-500/10" 
                                                : "border-gray-700 hover:border-orange-500/30"
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                    {isRecipe && (
                                                        <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded text-xs font-medium flex items-center gap-1">
                                                            <ChefHat size={12} />
                                                            Recipe
                                                        </span>
                                                    )}
                                                    {isFavorite && (
                                                        <span className="px-2 py-0.5 bg-red-500/20 text-red-300 rounded text-xs font-medium flex items-center gap-1">
                                                            <Heart size={12} />
                                                            Favorite
                                                        </span>
                                                    )}
                                                    {suggestion.source === "usda" && idx < 3 && (
                                                        <span className="px-2 py-0.5 bg-green-500/20 text-green-300 rounded text-xs font-medium flex items-center gap-1">
                                                            <Star size={12} />
                                                            Top Pick
                                                        </span>
                                                    )}
                                                    <h3 className="font-semibold text-white truncate">{suggestion.food_name}</h3>
                                                    {suggestion.brand && (
                                                        <span className="text-xs text-gray-400">({suggestion.brand})</span>
                                                    )}
                                                </div>
                                                
                                                <p className="text-sm text-gray-300 mb-3 leading-relaxed">{suggestion.reason}</p>
                                                
                                                {/* Macro Breakdown */}
                                                <div className="grid grid-cols-4 gap-3 mb-3">
                                                    <div className="bg-orange-500/10 rounded-lg p-2 border border-orange-500/20">
                                                        <div className="text-xs text-gray-400 mb-0.5">Calories</div>
                                                        <div className="text-lg font-bold text-orange-400">{Math.round(suggestion.calories)}</div>
                                                    </div>
                                                    <div className="bg-blue-500/10 rounded-lg p-2 border border-blue-500/20">
                                                        <div className="text-xs text-gray-400 mb-0.5">Protein</div>
                                                        <div className="text-lg font-bold text-blue-400">{suggestion.protein.toFixed(1)}g</div>
                                                    </div>
                                                    <div className="bg-green-500/10 rounded-lg p-2 border border-green-500/20">
                                                        <div className="text-xs text-gray-400 mb-0.5">Carbs</div>
                                                        <div className="text-lg font-bold text-green-400">{suggestion.carbs.toFixed(1)}g</div>
                                                    </div>
                                                    <div className="bg-yellow-500/10 rounded-lg p-2 border border-yellow-500/20">
                                                        <div className="text-xs text-gray-400 mb-0.5">Fats</div>
                                                        <div className="text-lg font-bold text-yellow-400">{suggestion.fats.toFixed(1)}g</div>
                                                    </div>
                                                </div>
                                                
                                                {/* Fit Score & Serving Info */}
                                                <div className="flex items-center gap-4 text-xs text-gray-400">
                                                    <div className="flex items-center gap-1.5">
                                                        <Clock size={14} />
                                                        <span>{suggestion.serving_size}</span>
                                                    </div>
                                                    {macroFit > 0 && (
                                                        <div className="flex items-center gap-1.5">
                                                            <Target size={14} className="text-green-400" />
                                                            <span className="text-green-400 font-medium">
                                                                {fitPercentage}% goal fit
                                                            </span>
                                                        </div>
                                                    )}
                                                    <div className="flex items-center gap-1.5">
                                                        <TrendingUp size={14} className="text-orange-400" />
                                                        <span className="text-orange-400">
                                                            {Math.round(suggestion.confidence * 100)}% match
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="flex flex-col gap-2 flex-shrink-0">
                                                <button
                                                    onClick={() => handleAddMeal(suggestion)}
                                                    className={`px-4 py-2 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                                                        idx === 0
                                                            ? "bg-orange-600 hover:bg-orange-700 shadow-md"
                                                            : "bg-orange-500 hover:bg-orange-600"
                                                    }`}
                                                >
                                                    <Plus className="w-4 h-4" />
                                                    Add
                                                </button>
                                                {isRecipe && suggestion.recipe_id && (
                                                    <button
                                                        onClick={() => {
                                                            router.push(`/recipes/${suggestion.recipe_id}`);
                                                            onClose();
                                                        }}
                                                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                        View Recipe
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleSaveFavorite(suggestion)}
                                                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                                                >
                                                    <Heart className="w-4 h-4" />
                                                    Save
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

