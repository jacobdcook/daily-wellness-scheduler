"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Search, X, Plus } from "lucide-react";
import { searchFoods, getFoodDetails, FoodItem } from "@/utils/api";
import { useToast } from "@/context/ToastContext";

interface FoodSearchModalForTemplateProps {
    isOpen: boolean;
    onClose: () => void;
    mealType: string;
    onFoodSelected: (foodItem: FoodItem, quantity: number, unit: string) => void;
}

export function FoodSearchModalForTemplate({ isOpen, onClose, mealType, onFoodSelected }: FoodSearchModalForTemplateProps) {
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
    const lastSearchQueryRef = useRef<string>("");

    const handleSearch = useCallback(async (query: string) => {
        const trimmedQuery = query.trim();
        if (!trimmedQuery || trimmedQuery.length < 2) {
            setSearchResults([]);
            lastSearchQueryRef.current = "";
            setSearching(false);
            return;
        }

        if (lastSearchQueryRef.current === trimmedQuery && searchResults.length > 0) {
            return;
        }

        try {
            setSearching(true);
            const currentQuery = trimmedQuery;
            lastSearchQueryRef.current = currentQuery;

            const results = await searchFoods(trimmedQuery);
            if (lastSearchQueryRef.current === currentQuery) {
                setSearchResults(results);
                setSearching(false);
            }
        } catch (error) {
            console.error("Search error:", error);
            if (lastSearchQueryRef.current === trimmedQuery) {
                setSearchResults([]);
                setSearching(false);
            }
        }
    }, [searchResults.length]);

    useEffect(() => {
        if (isOpen && searchQuery) {
            const timeoutId = setTimeout(() => {
                handleSearch(searchQuery);
            }, 300);
            return () => clearTimeout(timeoutId);
        }
    }, [searchQuery, isOpen, handleSearch]);

    const handleFoodSelect = async (food: FoodItem) => {
        try {
            setLoadingDetails(true);
            const details = await getFoodDetails(food.id);
            setFoodDetails(details);
            setSelectedFood(details);
            setQuantity("1");
            setUnit(details.serving_unit || "serving");
        } catch (error) {
            console.error("Error fetching food details:", error);
            showToast("Failed to load food details", "error");
        } finally {
            setLoadingDetails(false);
        }
    };

    const handleAdd = () => {
        if (!selectedFood) return;

        const qty = parseFloat(quantity);
        if (isNaN(qty) || qty <= 0) {
            showToast("Please enter a valid quantity", "error");
            return;
        }

        onFoodSelected(selectedFood, qty, unit);
        setSelectedFood(null);
        setFoodDetails(null);
        setQuantity("1");
        setUnit("serving");
        setSearchQuery("");
        setSearchResults([]);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Add Food to Template</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    {!selectedFood ? (
                        <div className="space-y-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search for food..."
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>

                            {searching && (
                                <div className="text-center py-4 text-gray-500">Searching...</div>
                            )}

                            {!searching && searchResults.length > 0 && (
                                <div className="space-y-2">
                                    {searchResults.map((food) => (
                                        <button
                                            key={food.id}
                                            onClick={() => handleFoodSelect(food)}
                                            className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors"
                                        >
                                            <div className="font-medium text-gray-900 dark:text-white">{food.name}</div>
                                            {food.brand && (
                                                <div className="text-sm text-gray-500 dark:text-gray-400">{food.brand}</div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
                                <div className="text-center py-8 text-gray-500">No results found</div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{selectedFood.name}</h3>
                                {selectedFood.brand && (
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{selectedFood.brand}</p>
                                )}
                                {foodDetails?.nutrition && (
                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                        Per {foodDetails.serving_unit || "serving"}: {Math.round(foodDetails.nutrition.calories || 0)} cal
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Quantity
                                </label>
                                <input
                                    type="number"
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                    min="0.1"
                                    step="0.1"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Unit
                                </label>
                                <input
                                    type="text"
                                    value={unit}
                                    onChange={(e) => setUnit(e.target.value)}
                                    placeholder="serving, cup, oz, etc."
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setSelectedFood(null);
                                        setFoodDetails(null);
                                    }}
                                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={handleAdd}
                                    className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
                                >
                                    Add to Template
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

