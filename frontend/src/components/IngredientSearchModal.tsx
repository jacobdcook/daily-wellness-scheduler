"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Search, X } from "lucide-react";
import { searchFoods, FoodItem } from "@/utils/api";
import { useToast } from "@/context/ToastContext";

interface IngredientSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (food: FoodItem) => void;
}

export function IngredientSearchModal({ isOpen, onClose, onSelect }: IngredientSearchModalProps) {
    const { showToast } = useToast();
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<FoodItem[]>([]);
    const [searching, setSearching] = useState(false);
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
            
            const result = await searchFoods(currentQuery);
            
            if (lastSearchQueryRef.current === currentQuery) {
                setSearchResults(result.foods || []);
                setSearching(false);
            }
        } catch (error) {
            console.error("Failed to search foods:", error);
            showToast("Failed to search foods", "error");
            if (lastSearchQueryRef.current === trimmedQuery) {
                setSearchResults([]);
                setSearching(false);
            }
        }
    }, [showToast, searchResults.length]);

    useEffect(() => {
        if (!isOpen) {
            setSearchQuery("");
            setSearchResults([]);
            setSearching(false);
            lastSearchQueryRef.current = "";
        }
    }, [isOpen]);

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

    const handleSelectFood = (food: FoodItem) => {
        onSelect(food);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-800 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-orange-500/20">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-white">Search Ingredient</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-white" />
                    </button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col">
                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Search for ingredient... (Press Enter or click Search)"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyPress={handleKeyPress}
                            className="w-full pl-10 pr-24 py-3 bg-slate-700 text-white rounded-lg border border-orange-500/20 focus:border-orange-500 focus:outline-none"
                        />
                        <button
                            onClick={handleSearchClick}
                            disabled={searching}
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 px-4 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors disabled:opacity-50"
                        >
                            {searching ? "Searching..." : "Search"}
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {searching ? (
                            <div className="text-center py-8">
                                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-400"></div>
                                <p className="mt-4 text-gray-400">Searching...</p>
                            </div>
                        ) : searchResults.length === 0 && searchQuery.trim().length >= 2 ? (
                            <div className="text-center py-8 text-gray-400">
                                No results found
                            </div>
                        ) : searchResults.length > 0 ? (
                            <div className="space-y-2">
                                {searchResults.map((food) => (
                                    <button
                                        key={food.id}
                                        onClick={() => handleSelectFood(food)}
                                        className="w-full text-left p-4 bg-slate-700/50 hover:bg-slate-700 rounded-lg border border-slate-600 hover:border-orange-500/50 transition-colors"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <h3 className="font-semibold text-white">{food.name}</h3>
                                                {food.brand && (
                                                    <p className="text-sm text-gray-400">{food.brand}</p>
                                                )}
                                                <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                                                    {food.calories > 0 && (
                                                        <span>{food.calories} cal</span>
                                                    )}
                                                    {food.protein > 0 && (
                                                        <span>{food.protein}g protein</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-400">
                                Enter at least 2 characters to search
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

