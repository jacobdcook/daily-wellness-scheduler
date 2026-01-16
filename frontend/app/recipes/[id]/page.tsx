"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Clock, Users, Star, Heart, Plus, ChefHat, ShoppingCart, Calendar, Edit, Trash2 } from "lucide-react";
import { getRecipe, favoriteRecipe, getFavoriteRecipes, createNutritionEntry, deleteRecipe, getMyRecipes } from "@/utils/api";
import { BottomNav } from "@/components/BottomNav";
import { useToast } from "@/context/ToastContext";
import { Recipe } from "@/utils/api";

export default function RecipeDetailPage() {
    const router = useRouter();
    const params = useParams();
    const { showToast } = useToast();
    const recipeId = params.id as string;
    const [recipe, setRecipe] = useState<Recipe | null>(null);
    const [isFavorite, setIsFavorite] = useState(false);
    const [isOwner, setIsOwner] = useState(false);
    const [loading, setLoading] = useState(true);
    const [servings, setServings] = useState(1);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        if (recipeId) {
            loadRecipe();
            checkFavorite();
            checkOwnership();
        }
    }, [recipeId]);

    const loadRecipe = async () => {
        setLoading(true);
        try {
            const data = await getRecipe(recipeId);
            setRecipe(data);
            setServings(data.servings || 1);
        } catch (error) {
            console.error("Failed to load recipe:", error);
            showToast("Failed to load recipe", "error");
        } finally {
            setLoading(false);
        }
    };

    const checkFavorite = async () => {
        try {
            const data = await getFavoriteRecipes();
            setIsFavorite(data.recipes.some(r => r.id === recipeId));
        } catch (error) {
            // Silently fail
        }
    };

    const checkOwnership = async () => {
        try {
            const data = await getMyRecipes();
            setIsOwner(data.recipes.some(r => r.id === recipeId));
        } catch (error) {
            // Silently fail
        }
    };

    const handleDelete = async () => {
        if (!recipe) return;
        
        if (!confirm(`Are you sure you want to delete "${recipe.name}"? This action cannot be undone.`)) {
            return;
        }

        try {
            setDeleting(true);
            await deleteRecipe(recipeId);
            showToast("Recipe deleted successfully", "success");
            router.push("/recipes/my");
        } catch (error: any) {
            console.error("Failed to delete recipe:", error);
            showToast(error.message || "Failed to delete recipe", "error");
        } finally {
            setDeleting(false);
        }
    };

    const handleFavorite = async () => {
        try {
            await favoriteRecipe(recipeId);
            setIsFavorite(!isFavorite);
            showToast(isFavorite ? "Removed from favorites" : "Added to favorites", "success");
        } catch (error) {
            showToast("Failed to update favorite", "error");
        }
    };

    const handleAddToMealPlan = () => {
        // Navigate to meal planner with recipe pre-selected
        router.push(`/meal-planner?recipe=${recipeId}`);
    };

    const handleLogMeal = async (mealType: string) => {
        if (!recipe) return;

        try {
            // Calculate nutrition per serving
            const nutritionPerServing = {
                calories: recipe.nutrition.calories / (recipe.servings || 1) * servings,
                protein: recipe.nutrition.protein / (recipe.servings || 1) * servings,
                carbs: recipe.nutrition.carbs / (recipe.servings || 1) * servings,
                fats: recipe.nutrition.fats / (recipe.servings || 1) * servings,
            };

            await createNutritionEntry({
                food_item: { id: recipe.id, name: recipe.name } as any,
                quantity: servings,
                unit: "serving",
                meal_type: mealType,
                date: new Date().toISOString().split('T')[0],
                nutrition: nutritionPerServing,
            });

            showToast(`${recipe.name} logged to ${mealType}!`, "success");
        } catch (error) {
            showToast("Failed to log meal", "error");
        }
    };

    const adjustServings = (delta: number) => {
        setServings(Math.max(1, servings + delta));
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800 pb-20">
                <div className="max-w-4xl mx-auto px-4 py-6">
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-400"></div>
                        <p className="mt-4 text-gray-400">Loading recipe...</p>
                    </div>
                </div>
                <BottomNav />
            </div>
        );
    }

    if (!recipe) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800 pb-20">
                <div className="max-w-4xl mx-auto px-4 py-6">
                    <button
                        onClick={() => router.back()}
                        className="text-gray-400 hover:text-white transition-colors mb-4"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="bg-gray-800/50 rounded-lg p-12 border border-gray-700 text-center">
                        <p className="text-gray-400">Recipe not found</p>
                    </div>
                </div>
                <BottomNav />
            </div>
        );
    }

    const nutritionPerServing = {
        calories: (recipe.nutrition.calories / (recipe.servings || 1) * servings).toFixed(0),
        protein: (recipe.nutrition.protein / (recipe.servings || 1) * servings).toFixed(1),
        carbs: (recipe.nutrition.carbs / (recipe.servings || 1) * servings).toFixed(1),
        fats: (recipe.nutrition.fats / (recipe.servings || 1) * servings).toFixed(1),
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800 pb-20">
            <div className="max-w-4xl mx-auto px-4 py-6">
                <button
                    onClick={() => router.back()}
                    className="text-gray-400 hover:text-white transition-colors mb-4"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>

                {/* Recipe Image */}
                {recipe.image_url && (
                    <div className="w-full h-64 md:h-96 bg-gray-700 rounded-lg mb-6 overflow-hidden">
                        <img
                            src={recipe.image_url}
                            alt={recipe.name}
                            className="w-full h-full object-cover"
                        />
                    </div>
                )}

                {/* Recipe Header */}
                <div className="mb-6">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                            <h1 className="text-3xl font-bold text-white mb-2">{recipe.name}</h1>
                            <p className="text-gray-300">{recipe.description}</p>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                            {isOwner && (
                                <>
                                    <button
                                        onClick={() => router.push(`/recipes/edit/${recipeId}`)}
                                        className="p-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors"
                                        title="Edit Recipe"
                                    >
                                        <Edit className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={handleDelete}
                                        disabled={deleting}
                                        className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors disabled:opacity-50"
                                        title="Delete Recipe"
                                    >
                                        {deleting ? (
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-400"></div>
                                        ) : (
                                            <Trash2 className="w-5 h-5" />
                                        )}
                                    </button>
                                </>
                            )}
                            <button
                                onClick={handleFavorite}
                                className={`p-2 ${isFavorite ? "text-red-400" : "text-gray-400"} hover:text-red-400 transition-colors`}
                            >
                                <Heart className={`w-6 h-6 ${isFavorite ? "fill-current" : ""}`} />
                            </button>
                        </div>
                    </div>

                    {/* Recipe Meta */}
                    <div className="flex flex-wrap gap-4 text-sm text-gray-400 mb-4">
                        <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {recipe.prep_time_minutes} min prep • {recipe.cook_time_minutes} min cook
                        </span>
                        <span className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {recipe.servings} servings
                        </span>
                        {recipe.rating > 0 && (
                            <span className="flex items-center gap-1 text-yellow-400">
                                <Star className="w-4 h-4 fill-current" />
                                {recipe.rating.toFixed(1)} ({recipe.review_count} reviews)
                            </span>
                        )}
                    </div>

                    {/* Tags */}
                    {recipe.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {recipe.tags.map(tag => (
                                <span key={tag} className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded-full text-sm">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Nutrition Info */}
                <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700 mb-6">
                    <h2 className="text-xl font-semibold text-white mb-4">Nutrition (per {servings} {servings === 1 ? 'serving' : 'servings'})</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <div className="text-2xl font-bold text-orange-400">{nutritionPerServing.calories}</div>
                            <div className="text-sm text-gray-400">Calories</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-blue-400">{nutritionPerServing.protein}g</div>
                            <div className="text-sm text-gray-400">Protein</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-green-400">{nutritionPerServing.carbs}g</div>
                            <div className="text-sm text-gray-400">Carbs</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-yellow-400">{nutritionPerServing.fats}g</div>
                            <div className="text-sm text-gray-400">Fats</div>
                        </div>
                    </div>
                </div>

                {/* Servings Adjuster */}
                <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 mb-6">
                    <div className="flex items-center justify-between">
                        <span className="text-white font-medium">Servings</span>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => adjustServings(-1)}
                                className="w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-bold transition-colors"
                            >
                                -
                            </button>
                            <span className="text-white font-semibold w-8 text-center">{servings}</span>
                            <button
                                onClick={() => adjustServings(1)}
                                className="w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-bold transition-colors"
                            >
                                +
                            </button>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                    <button
                        onClick={handleAddToMealPlan}
                        className="px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                        <Calendar className="w-4 h-4" />
                        Add to Meal Plan
                    </button>
                    <button
                        onClick={() => router.push(`/shopping-list?recipe=${recipeId}`)}
                        className="px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                        <ShoppingCart className="w-4 h-4" />
                        Shopping List
                    </button>
                </div>

                {/* Quick Log */}
                <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 mb-6">
                    <p className="text-sm text-gray-400 mb-3">Quick Log to Nutrition Tracker:</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {["breakfast", "lunch", "dinner", "snack"].map(mealType => (
                            <button
                                key={mealType}
                                onClick={() => handleLogMeal(mealType)}
                                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors capitalize"
                            >
                                {mealType}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Ingredients */}
                <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700 mb-6">
                    <h2 className="text-xl font-semibold text-white mb-4">Ingredients</h2>
                    <ul className="space-y-2">
                        {recipe.ingredients.map((ingredient, idx) => {
                            const adjustedQuantity = (ingredient.quantity / (recipe.servings || 1)) * servings;
                            return (
                                <li key={idx} className="flex items-start gap-3 text-gray-300">
                                    <span className="text-orange-400 mt-1">•</span>
                                    <span>
                                        <span className="font-medium">{adjustedQuantity.toFixed(1)} {ingredient.unit}</span> {ingredient.name}
                                        {ingredient.notes && (
                                            <span className="text-gray-500 text-sm"> ({ingredient.notes})</span>
                                        )}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                </div>

                {/* Instructions */}
                <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
                    <h2 className="text-xl font-semibold text-white mb-4">Instructions</h2>
                    <ol className="space-y-4">
                        {recipe.instructions.map((instruction, idx) => (
                            <li key={idx} className="flex gap-4">
                                <span className="flex-shrink-0 w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold">
                                    {idx + 1}
                                </span>
                                <span className="text-gray-300 flex-1 pt-1">{instruction}</span>
                            </li>
                        ))}
                    </ol>
                </div>
            </div>
            <BottomNav />
        </div>
    );
}

