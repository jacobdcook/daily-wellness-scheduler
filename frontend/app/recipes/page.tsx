"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Filter, Clock, Users, Star, Heart, Plus, ChefHat } from "lucide-react";
import { searchRecipes, getFavoriteRecipes, favoriteRecipe, Recipe } from "@/utils/api";
import { BottomNav } from "@/components/BottomNav";
import { useToast } from "@/context/ToastContext";

export default function RecipesPage() {
    const router = useRouter();
    const { showToast } = useToast();
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [favorites, setFavorites] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        cuisine: "",
        difficulty: "",
        tags: [] as string[],
        max_prep_time: undefined as number | undefined,
        min_rating: undefined as number | undefined,
    });

    useEffect(() => {
        loadRecipes();
        loadFavorites();
    }, []);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (searchQuery || Object.values(filters).some(v => v !== "" && v !== undefined && (Array.isArray(v) ? v.length > 0 : true))) {
                performSearch();
            } else {
                loadRecipes();
            }
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [searchQuery, filters]);

    const loadRecipes = async () => {
        setLoading(true);
        try {
            const data = await searchRecipes({ limit: 50 });
            setRecipes(data.recipes || []);
        } catch (error) {
            console.error("Failed to load recipes:", error);
            showToast("Failed to load recipes", "error");
        } finally {
            setLoading(false);
        }
    };

    const loadFavorites = async () => {
        try {
            const data = await getFavoriteRecipes();
            setFavorites(data.recipes.map(r => r.id));
        } catch (error) {
            // Silently fail
        }
    };

    const performSearch = async () => {
        setLoading(true);
        try {
            const data = await searchRecipes({
                query: searchQuery || undefined,
                cuisine: filters.cuisine || undefined,
                difficulty: filters.difficulty || undefined,
                tags: filters.tags.length > 0 ? filters.tags : undefined,
                max_prep_time: filters.max_prep_time,
                min_rating: filters.min_rating,
                limit: 50,
            });
            setRecipes(data.recipes || []);
        } catch (error) {
            console.error("Failed to search recipes:", error);
            showToast("Failed to search recipes", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleFavorite = async (recipeId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await favoriteRecipe(recipeId);
            if (favorites.includes(recipeId)) {
                setFavorites(favorites.filter(id => id !== recipeId));
            } else {
                setFavorites([...favorites, recipeId]);
            }
            showToast("Recipe favorited!", "success");
        } catch (error) {
            showToast("Failed to favorite recipe", "error");
        }
    };

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty) {
            case "easy": return "text-green-400";
            case "medium": return "text-yellow-400";
            case "hard": return "text-red-400";
            default: return "text-gray-400";
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800 pb-20">
            <div className="max-w-4xl mx-auto px-4 py-6">
                {/* Header */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <ChefHat className="w-8 h-8 text-orange-400" />
                            <h1 className="text-3xl font-bold text-white">Recipes</h1>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => router.push("/recipes/create")}
                                className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors font-semibold"
                            >
                                <Plus className="w-5 h-5" />
                                Create Recipe
                            </button>
                            <button
                                onClick={() => router.push("/recipes/create-from-logged")}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-semibold"
                            >
                                <Plus className="w-5 h-5" />
                                From Logged Items
                            </button>
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search recipes..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500"
                        />
                    </div>

                    {/* Filter Toggle */}
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-700/50 transition-colors"
                    >
                        <Filter className="w-4 h-4" />
                        <span>Filters</span>
                    </button>

                    {/* Filters Panel */}
                    {showFilters && (
                        <div className="mt-4 p-4 bg-gray-800/50 border border-gray-700 rounded-lg space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Cuisine</label>
                                    <select
                                        value={filters.cuisine}
                                        onChange={(e) => setFilters({ ...filters, cuisine: e.target.value })}
                                        className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                                    >
                                        <option value="">All</option>
                                        <option value="american">American</option>
                                        <option value="italian">Italian</option>
                                        <option value="mexican">Mexican</option>
                                        <option value="asian">Asian</option>
                                        <option value="mediterranean">Mediterranean</option>
                                        <option value="indian">Indian</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Difficulty</label>
                                    <select
                                        value={filters.difficulty}
                                        onChange={(e) => setFilters({ ...filters, difficulty: e.target.value })}
                                        className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                                    >
                                        <option value="">All</option>
                                        <option value="easy">Easy</option>
                                        <option value="medium">Medium</option>
                                        <option value="hard">Hard</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Max Prep Time (minutes)</label>
                                    <input
                                        type="number"
                                        value={filters.max_prep_time || ""}
                                        onChange={(e) => setFilters({ ...filters, max_prep_time: e.target.value ? parseInt(e.target.value) : undefined })}
                                        placeholder="Any"
                                        className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Min Rating</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="5"
                                        step="0.1"
                                        value={filters.min_rating || ""}
                                        onChange={(e) => setFilters({ ...filters, min_rating: e.target.value ? parseFloat(e.target.value) : undefined })}
                                        placeholder="Any"
                                        className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Tags</label>
                                <div className="flex flex-wrap gap-2">
                                    {["vegetarian", "vegan", "gluten-free", "dairy-free", "low-carb", "high-protein"].map(tag => (
                                        <button
                                            key={tag}
                                            onClick={() => {
                                                if (filters.tags.includes(tag)) {
                                                    setFilters({ ...filters, tags: filters.tags.filter(t => t !== tag) });
                                                } else {
                                                    setFilters({ ...filters, tags: [...filters.tags, tag] });
                                                }
                                            }}
                                            className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                                                filters.tags.includes(tag)
                                                    ? "bg-orange-500 text-white"
                                                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                                            }`}
                                        >
                                            {tag}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Recipes Grid */}
                {loading ? (
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-400"></div>
                        <p className="mt-4 text-gray-400">Loading recipes...</p>
                    </div>
                ) : recipes.length === 0 ? (
                    <div className="bg-gray-800/50 rounded-lg p-12 border border-gray-700 text-center">
                        <ChefHat className="w-16 h-16 text-gray-600 mx-auto mb-4 opacity-50" />
                        <p className="text-gray-400">No recipes found</p>
                        <p className="text-sm text-gray-500 mt-2">Try adjusting your search or filters</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {recipes.map((recipe) => (
                            <div
                                key={recipe.id}
                                onClick={() => router.push(`/recipes/${recipe.id}`)}
                                className="bg-gray-800/50 rounded-lg border border-gray-700 hover:border-orange-500/50 transition-colors cursor-pointer overflow-hidden"
                            >
                                {recipe.image_url && (
                                    <div className="w-full h-48 bg-gray-700 relative">
                                        <img
                                            src={recipe.image_url}
                                            alt={recipe.name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                )}
                                <div className="p-4">
                                    <div className="flex items-start justify-between mb-2">
                                        <h3 className="font-semibold text-white text-lg flex-1">{recipe.name}</h3>
                                        <button
                                            onClick={(e) => handleFavorite(recipe.id, e)}
                                            className={`ml-2 ${favorites.includes(recipe.id) ? "text-red-400" : "text-gray-400"} hover:text-red-400 transition-colors`}
                                        >
                                            <Heart className={`w-5 h-5 ${favorites.includes(recipe.id) ? "fill-current" : ""}`} />
                                        </button>
                                    </div>
                                    <p className="text-sm text-gray-400 mb-3 line-clamp-2">{recipe.description}</p>
                                    <div className="flex items-center gap-4 text-sm text-gray-500">
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-4 h-4" />
                                            {recipe.total_time_minutes} min
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Users className="w-4 h-4" />
                                            {recipe.servings} servings
                                        </span>
                                        <span className={`flex items-center gap-1 ${getDifficultyColor(recipe.difficulty)}`}>
                                            {recipe.difficulty}
                                        </span>
                                        {recipe.rating > 0 && (
                                            <span className="flex items-center gap-1 text-yellow-400">
                                                <Star className="w-4 h-4 fill-current" />
                                                {recipe.rating.toFixed(1)}
                                            </span>
                                        )}
                                    </div>
                                    {recipe.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-3">
                                            {recipe.tags.slice(0, 3).map(tag => (
                                                <span key={tag} className="px-2 py-1 bg-gray-700 text-xs text-gray-300 rounded">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <BottomNav />
        </div>
    );
}

