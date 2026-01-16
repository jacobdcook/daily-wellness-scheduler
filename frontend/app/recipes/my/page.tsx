"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChefHat, Plus, Search, Edit, Trash2, Calendar } from "lucide-react";
import { getMyRecipes, deleteRecipe, Recipe } from "@/utils/api";
import { BottomNav } from "@/components/BottomNav";
import { useToast } from "@/context/ToastContext";

export default function MyRecipesPage() {
    const router = useRouter();
    const { showToast } = useToast();
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        loadRecipes();
    }, []);

    const loadRecipes = async () => {
        setLoading(true);
        try {
            const data = await getMyRecipes();
            setRecipes(data.recipes || []);
        } catch (error) {
            console.error("Failed to load recipes:", error);
            showToast("Failed to load your recipes", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (recipeId: string, recipeName: string) => {
        if (!confirm(`Are you sure you want to delete "${recipeName}"? This action cannot be undone.`)) {
            return;
        }

        try {
            setDeletingId(recipeId);
            await deleteRecipe(recipeId);
            showToast("Recipe deleted successfully", "success");
            loadRecipes(); // Reload list
        } catch (error: any) {
            console.error("Failed to delete recipe:", error);
            showToast(error.message || "Failed to delete recipe", "error");
        } finally {
            setDeletingId(null);
        }
    };

    const handleDuplicate = (recipe: Recipe) => {
        // Navigate to create page with recipe data as query params or state
        // For now, we'll navigate to create page and user can manually copy
        router.push(`/recipes/create?duplicate=${recipe.id}`);
    };

    const filteredRecipes = recipes.filter(recipe => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();
        return (
            recipe.name.toLowerCase().includes(query) ||
            recipe.description.toLowerCase().includes(query) ||
            recipe.cuisine.toLowerCase().includes(query) ||
            recipe.tags.some(tag => tag.toLowerCase().includes(query))
        );
    });

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800 pb-20">
            <div className="max-w-4xl mx-auto px-4 py-6">
                {/* Header */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <ChefHat className="w-8 h-8 text-orange-400" />
                            <h1 className="text-3xl font-bold text-white">My Recipes</h1>
                        </div>
                        <button
                            onClick={() => router.push("/recipes/create")}
                            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
                        >
                            <Plus className="w-5 h-5" />
                            Create New Recipe
                        </button>
                    </div>

                    {/* Search Bar */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search your recipes..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500"
                        />
                    </div>
                </div>

                {/* Recipes List */}
                {loading ? (
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-400"></div>
                        <p className="mt-4 text-gray-400">Loading recipes...</p>
                    </div>
                ) : filteredRecipes.length === 0 ? (
                    <div className="bg-gray-800/50 rounded-lg p-12 border border-gray-700 text-center">
                        <ChefHat className="w-16 h-16 text-gray-600 mx-auto mb-4 opacity-50" />
                        <p className="text-gray-400 mb-2">
                            {searchQuery ? "No recipes match your search" : "You haven't created any recipes yet"}
                        </p>
                        {!searchQuery && (
                            <button
                                onClick={() => router.push("/recipes/create")}
                                className="mt-4 px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
                            >
                                Create Your First Recipe
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredRecipes.map((recipe) => (
                            <div
                                key={recipe.id}
                                className="bg-gray-800/50 rounded-lg border border-gray-700 hover:border-orange-500/50 transition-colors overflow-hidden"
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
                                        <h3
                                            className="font-semibold text-white text-lg flex-1 cursor-pointer hover:text-orange-400 transition-colors"
                                            onClick={() => router.push(`/recipes/${recipe.id}`)}
                                        >
                                            {recipe.name}
                                        </h3>
                                    </div>
                                    <p className="text-sm text-gray-400 mb-3 line-clamp-2">{recipe.description}</p>
                                    
                                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                                        <span>{recipe.servings} servings</span>
                                        <span>{recipe.total_time_minutes} min</span>
                                        {recipe.nutrition && (
                                            <span className="text-orange-400">
                                                {Math.round(recipe.nutrition.calories / recipe.servings)} cal/serving
                                            </span>
                                        )}
                                    </div>

                                    {recipe.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mb-3">
                                            {recipe.tags.slice(0, 3).map(tag => (
                                                <span key={tag} className="px-2 py-1 bg-gray-700 text-xs text-gray-300 rounded">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {formatDate(recipe.created_at)}
                                        </span>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex gap-2 pt-3 border-t border-gray-700">
                                        <button
                                            onClick={() => router.push(`/recipes/${recipe.id}`)}
                                            className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
                                        >
                                            View
                                        </button>
                                        <button
                                            onClick={() => router.push(`/recipes/edit/${recipe.id}`)}
                                            className="px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors"
                                            title="Edit"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(recipe.id, recipe.name)}
                                            disabled={deletingId === recipe.id}
                                            className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors disabled:opacity-50"
                                            title="Delete"
                                        >
                                            {deletingId === recipe.id ? (
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-400"></div>
                                            ) : (
                                                <Trash2 className="w-4 h-4" />
                                            )}
                                        </button>
                                    </div>
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

