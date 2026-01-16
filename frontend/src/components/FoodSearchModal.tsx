"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Search, X, Plus, Minus, Clock, Info } from "lucide-react";
import { searchFoods, getFoodDetails, createNutritionEntry, FoodItem, FoodEntry } from "@/utils/api";
import { useToast } from "@/context/ToastContext";
import { format } from "date-fns";
import { FoodHealthBadge } from "./FoodHealthBadge";
import { NutriScoreDisplay } from "./NutriScoreDisplay";
import { NovaBadge } from "./NovaBadge";
import { AdditivesList } from "./AdditivesList";
import { FoodHealthDetails } from "./FoodHealthDetails";

interface FoodSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    mealType: string;
    date?: string;
    onFoodAdded?: () => void;
}

export function FoodSearchModal({ isOpen, onClose, mealType, date, onFoodAdded }: FoodSearchModalProps) {
    const { showToast } = useToast();
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<FoodItem[]>([]);
    const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
    const [foodDetails, setFoodDetails] = useState<FoodItem | null>(null);
    const [quantity, setQuantity] = useState("1");
    const [unit, setUnit] = useState("serving");
    const [loading, setLoading] = useState(false);
    const [searching, setSearching] = useState(false);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [calculatedCalories, setCalculatedCalories] = useState<number | null>(null);
    const lastSearchQueryRef = useRef<string>("");
    const [showHealthDetails, setShowHealthDetails] = useState<FoodItem | null>(null);

    // Memoize handleSearch to prevent unnecessary re-renders
    const handleSearch = useCallback(async (query: string) => {
        const trimmedQuery = query.trim();
        if (!trimmedQuery || trimmedQuery.length < 2) {
            setSearchResults([]);
            lastSearchQueryRef.current = "";
            setSearching(false);
            return;
        }

        // Don't search again if it's the same query and we already have results
        if (lastSearchQueryRef.current === trimmedQuery && searchResults.length > 0) {
            return;
        }

        try {
            setSearching(true);
            const currentQuery = trimmedQuery;
            lastSearchQueryRef.current = currentQuery;
            
            const result = await searchFoods(currentQuery);
            
            // Only update results if this is still the current query (prevent race conditions)
            if (lastSearchQueryRef.current === currentQuery) {
                setSearchResults(result.foods || []);
                setSearching(false);
            }
        } catch (error) {
            console.error("Failed to search foods:", error);
            showToast("Failed to search foods", "error");
            // Only clear if this was the current query
            if (lastSearchQueryRef.current === trimmedQuery) {
                setSearchResults([]);
                setSearching(false);
            }
        }
    }, [showToast, searchResults.length]);

    useEffect(() => {
        if (!isOpen) {
            // Reset state when modal closes
            setSearchQuery("");
            setSearchResults([]);
            setSelectedFood(null);
            setFoodDetails(null);
            setQuantity("1");
            setUnit("serving");
            setCalculatedCalories(null);
            setSearching(false);
            lastSearchQueryRef.current = "";
        }
    }, [isOpen]);

    // Manual search - only search on button click or Enter key (no auto-search)
    const handleSearchClick = () => {
        const trimmedQuery = searchQuery.trim();
        if (trimmedQuery.length >= 2) {
            handleSearch(trimmedQuery);
        } else {
            showToast("Please enter at least 2 characters", "error");
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            handleSearchClick();
        }
    };

    // Calculate calories when quantity/unit changes
    useEffect(() => {
        if (foodDetails && quantity) {
            const qty = parseFloat(quantity);
            if (!isNaN(qty) && qty > 0) {
                let servings = qty;
                
                if (unit === "gram" && foodDetails.serving_weight_grams) {
                    servings = qty / foodDetails.serving_weight_grams;
                } else if (unit === "oz" && foodDetails.serving_weight_grams) {
                    servings = (qty * 28.35) / foodDetails.serving_weight_grams;
                }
                
                setCalculatedCalories(Math.round(foodDetails.calories * servings));
            } else {
                setCalculatedCalories(null);
            }
        }
    }, [foodDetails, quantity, unit]);

    const handleSelectFood = async (food: FoodItem) => {
        try {
            setLoadingDetails(true);
            setSelectedFood(food);
            
            // Get full details if we only have basic info
            if (!food.protein && food.source !== "none") {
                const details = await getFoodDetails(food.id, food.source);
                setFoodDetails(details);
            } else {
                setFoodDetails(food);
            }
        } catch (error) {
            console.error("Failed to load food details:", error);
            showToast("Failed to load food details", "error");
        } finally {
            setLoadingDetails(false);
        }
    };

    const handleAddFood = async () => {
        if (!foodDetails || !quantity) {
            showToast("Please select a food and enter quantity", "error");
            return;
        }

        const qty = parseFloat(quantity);
        if (isNaN(qty) || qty <= 0) {
            showToast("Please enter a valid quantity", "error");
            return;
        }

        try {
            setLoading(true);
            const entryDate = date || format(new Date(), "yyyy-MM-dd");
            
            await createNutritionEntry({
                meal_type: mealType,
                date: entryDate,
                food_item: foodDetails,
                quantity: qty,
                unit: unit,
            });

            showToast("Food added! 🍽️", "success");
            onFoodAdded?.();
            onClose();
        } catch (error: any) {
            console.error("Failed to add food:", error);
            showToast(error.message || "Failed to add food", "error");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-800 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-orange-500/20">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-white">Add Food to {mealType.charAt(0).toUpperCase() + mealType.slice(1)}</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-white" />
                    </button>
                </div>

                {/* Search */}
                {!selectedFood ? (
                    <div className="flex-1 overflow-hidden flex flex-col">
                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Search for food... (Press Enter or click Search)"
                                value={searchQuery}
                                onChange={(e) => {
                                    // Only update the input value, don't clear results
                                    setSearchQuery(e.target.value);
                                }}
                                onKeyPress={handleKeyPress}
                                className="w-full pl-10 pr-24 py-3 bg-slate-700 text-white rounded-lg border border-orange-500/20 focus:border-orange-500 focus:outline-none"
                                autoFocus
                            />
                            <button
                                onClick={handleSearchClick}
                                disabled={searching || searchQuery.trim().length < 2}
                                className="absolute right-2 top-1/2 transform -translate-y-1/2 px-4 py-1.5 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors"
                            >
                                {searching ? "Searching..." : "Search"}
                            </button>
                        </div>

                        {/* Search Results */}
                        <div className="flex-1 overflow-y-auto">
                            {searching ? (
                                <div className="text-center py-8 text-gray-400">Searching...</div>
                            ) : searchResults.length === 0 && searchQuery.trim().length >= 2 ? (
                                <div className="text-center py-8 text-gray-400">
                                    No foods found. Try a different search term.
                                </div>
                            ) : searchResults.length === 0 ? (
                                <div className="text-center py-8 text-gray-400">
                                    {searchQuery.trim().length > 0 && searchQuery.trim().length < 2 
                                        ? "Type at least 2 characters to search..."
                                        : "Start typing to search for foods..."}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {searchResults.map((food) => (
                                        <div
                                            key={food.id || `${food.name}-${food.calories}`}
                                            className="w-full p-4 bg-gradient-to-r from-slate-700 to-slate-700/80 hover:from-slate-600 hover:to-slate-600/80 rounded-xl border border-slate-600 hover:border-orange-500/30 transition-all duration-200 shadow-md hover:shadow-lg"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1.5">
                                                        <div className="text-white font-semibold truncate text-base">{food.name}</div>
                                                        {food.health && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setShowHealthDetails(food);
                                                                }}
                                                                className="p-1.5 hover:bg-slate-500 rounded-lg transition-all hover:scale-110 flex-shrink-0 group"
                                                                title="View detailed health analysis"
                                                            >
                                                                <Info className="w-4 h-4 text-orange-400 group-hover:text-orange-300" />
                                                            </button>
                                                        )}
                                                    </div>
                                                    {food.brand && (
                                                        <div className="text-sm text-gray-400 mb-2">{food.brand}</div>
                                                    )}
                                                    
                                                    {/* Health Score - Prominent Display */}
                                                    {food.health && food.health.health_score !== undefined && (
                                                        <div className="mb-2">
                                                            <FoodHealthBadge health={food.health} size="sm" showLabel={true} />
                                                        </div>
                                                    )}
                                                    
                                                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                                                        <div className="text-sm font-medium text-orange-400">
                                                            {food.calories || 0} cal per {food.serving_size || "serving"}
                                                        </div>
                                                        {food.health && (
                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                {food.health.nutri_score?.grade && (
                                                                    <NutriScoreDisplay 
                                                                        grade={food.health.nutri_score.grade}
                                                                        size="sm"
                                                                    />
                                                                )}
                                                                {food.health.nova?.group && (
                                                                    <NovaBadge 
                                                                        group={food.health.nova.group}
                                                                        size="sm"
                                                                    />
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                    {food.health?.additives && food.health.additives.has_harmful && (
                                                        <div className="mt-2.5 p-2 bg-red-900/20 border border-red-700/30 rounded-lg">
                                                            <AdditivesList additives={food.health.additives} compact={true} />
                                                        </div>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => handleSelectFood(food)}
                                                    className="p-2.5 hover:bg-orange-600 bg-slate-600 rounded-lg transition-all hover:scale-110 flex-shrink-0 shadow-md"
                                                    title="Add to meal"
                                                >
                                                    <Plus className="w-5 h-5 text-white" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    /* Food Details & Quantity */
                    <div className="flex-1 overflow-y-auto">
                        {loadingDetails ? (
                            <div className="text-center py-8 text-gray-400">Loading details...</div>
                        ) : foodDetails ? (
                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-lg font-bold text-white mb-1">{foodDetails.name}</h3>
                                    {foodDetails.brand && (
                                        <p className="text-sm text-gray-400">{foodDetails.brand}</p>
                                    )}
                                </div>

                                {/* Health Score */}
                                {foodDetails.health && (
                                    <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl p-5 border-2 border-orange-500/20 shadow-lg">
                                        <div className="flex items-center justify-between mb-4">
                                            <div>
                                                <h4 className="text-base font-bold text-white mb-1">Health Analysis</h4>
                                                <p className="text-xs text-gray-400">Comprehensive health scoring</p>
                                            </div>
                                            <button
                                                onClick={() => setShowHealthDetails(foodDetails)}
                                                className="px-3 py-1.5 text-xs font-medium text-orange-400 hover:text-orange-300 bg-orange-500/10 hover:bg-orange-500/20 rounded-lg border border-orange-500/30 transition-all"
                                            >
                                                View Full Analysis →
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-3 flex-wrap mb-3">
                                            <FoodHealthBadge health={foodDetails.health} size="md" showLabel={true} />
                                            {foodDetails.health.nutri_score?.grade && (
                                                <NutriScoreDisplay 
                                                    grade={foodDetails.health.nutri_score.grade}
                                                    description={foodDetails.health.nutri_score.description}
                                                    size="md"
                                                />
                                            )}
                                            {foodDetails.health.nova?.group && (
                                                <NovaBadge 
                                                    group={foodDetails.health.nova.group}
                                                    description={foodDetails.health.nova.description}
                                                    size="sm"
                                                />
                                            )}
                                        </div>
                                        {foodDetails.health.additives && foodDetails.health.additives.has_harmful && (
                                            <div className="mt-3 pt-3 border-t border-slate-600">
                                                <AdditivesList additives={foodDetails.health.additives} compact={true} />
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Nutrition Info */}
                                <div className="bg-slate-700 rounded-lg p-4">
                                    <div className="grid grid-cols-4 gap-4 text-center">
                                        <div>
                                            <div className="text-orange-400 font-semibold">{foodDetails.calories}</div>
                                            <div className="text-xs text-gray-400">Cal</div>
                                        </div>
                                        <div>
                                            <div className="text-purple-400 font-semibold">{foodDetails.protein}g</div>
                                            <div className="text-xs text-gray-400">Protein</div>
                                        </div>
                                        <div>
                                            <div className="text-blue-400 font-semibold">{foodDetails.carbs}g</div>
                                            <div className="text-xs text-gray-400">Carbs</div>
                                        </div>
                                        <div>
                                            <div className="text-yellow-400 font-semibold">{foodDetails.fats}g</div>
                                            <div className="text-xs text-gray-400">Fats</div>
                                        </div>
                                    </div>
                                    <div className="text-xs text-gray-400 text-center mt-2">
                                        Per {foodDetails.serving_size}
                                    </div>
                                </div>

                                {/* Enhanced Quantity Input with Quick Multipliers */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Quantity
                                    </label>
                                    <div className="flex gap-2 mb-2">
                                        <div className="flex-1 flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const qty = parseFloat(quantity) || 1;
                                                    setQuantity(Math.max(0.1, qty - 0.5).toString());
                                                }}
                                                className="p-2 bg-slate-600 hover:bg-slate-500 rounded-lg transition-colors"
                                                title="Decrease by 0.5"
                                            >
                                                <Minus size={16} className="text-gray-300" />
                                            </button>
                                            <input
                                                type="number"
                                                min="0.1"
                                                step="0.1"
                                                value={quantity}
                                                onChange={(e) => setQuantity(e.target.value)}
                                                className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg border border-orange-500/20 focus:border-orange-500 focus:outline-none text-center"
                                                placeholder="1"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const qty = parseFloat(quantity) || 1;
                                                    setQuantity((qty + 0.5).toString());
                                                }}
                                                className="p-2 bg-slate-600 hover:bg-slate-500 rounded-lg transition-colors"
                                                title="Increase by 0.5"
                                            >
                                                <Plus size={16} className="text-gray-300" />
                                            </button>
                                        </div>
                                        <select
                                            value={unit}
                                            onChange={(e) => setUnit(e.target.value)}
                                            className="px-4 py-2 bg-slate-700 text-white rounded-lg border border-orange-500/20 focus:border-orange-500 focus:outline-none"
                                        >
                                            <option value="serving">Serving</option>
                                            {foodDetails.serving_weight_grams && (
                                                <>
                                                    <option value="gram">Grams</option>
                                                    <option value="oz">Ounces</option>
                                                </>
                                            )}
                                            <option value="cup">Cup</option>
                                            <option value="piece">Piece</option>
                                        </select>
                                    </div>
                                    {/* Quick Multiplier Buttons */}
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="text-xs text-gray-400">Quick:</span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const qty = parseFloat(quantity) || 1;
                                                setQuantity((qty * 0.5).toFixed(1));
                                            }}
                                            className="px-2 py-1 text-xs bg-slate-600 hover:bg-slate-500 text-gray-300 rounded transition-colors"
                                        >
                                            ½
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const qty = parseFloat(quantity) || 1;
                                                setQuantity((qty * 2).toString());
                                            }}
                                            className="px-2 py-1 text-xs bg-slate-600 hover:bg-slate-500 text-gray-300 rounded transition-colors"
                                        >
                                            2×
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const qty = parseFloat(quantity) || 1;
                                                setQuantity((qty * 1.5).toString());
                                            }}
                                            className="px-2 py-1 text-xs bg-slate-600 hover:bg-slate-500 text-gray-300 rounded transition-colors"
                                        >
                                            1.5×
                                        </button>
                                    </div>
                                    {calculatedCalories !== null && (
                                        <div className="text-sm text-orange-400 mt-2">
                                            ≈ {calculatedCalories} calories
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex gap-3 pt-4">
                                    <button
                                        onClick={() => {
                                            setSelectedFood(null);
                                            setFoodDetails(null);
                                        }}
                                        className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                                    >
                                        Back
                                    </button>
                                    <button
                                        onClick={handleAddFood}
                                        disabled={loading || !quantity}
                                        className="flex-1 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {loading ? "Adding..." : "Add Food"}
                                    </button>
                                </div>
                            </div>
                        ) : null}
                    </div>
                )}
            </div>

            {/* Health Details Modal */}
            {showHealthDetails && (
                <FoodHealthDetails
                    food={showHealthDetails}
                    isOpen={!!showHealthDetails}
                    onClose={() => setShowHealthDetails(null)}
                />
            )}
        </div>
    );
}

