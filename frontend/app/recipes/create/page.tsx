"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChefHat, Plus, Trash2, ArrowUp, ArrowDown, Save, X } from "lucide-react";
import { createRecipe, calculateRecipeNutrition, Ingredient, RecipeNutrition } from "@/utils/api";
import { useToast } from "@/context/ToastContext";
import { IngredientSearchModal } from "@/components/IngredientSearchModal";
import { FoodItem } from "@/utils/api";
import { BottomNav } from "@/components/BottomNav";

const UNITS = [
    { value: "g", label: "g (grams)" },
    { value: "kg", label: "kg (kilograms)" },
    { value: "oz", label: "oz (ounces)" },
    { value: "lb", label: "lb (pounds)" },
    { value: "ml", label: "ml (milliliters)" },
    { value: "l", label: "l (liters)" },
    { value: "cup", label: "cup" },
    { value: "tbsp", label: "tbsp (tablespoon)" },
    { value: "tsp", label: "tsp (teaspoon)" },
    { value: "fl oz", label: "fl oz (fluid ounce)" },
    { value: "piece", label: "piece" },
    { value: "item", label: "item" },
];

const CUISINES = [
    "general", "american", "italian", "mexican", "asian", "mediterranean",
    "indian", "french", "japanese", "chinese", "thai", "greek", "spanish"
];

const DIFFICULTIES = ["easy", "medium", "hard"];

const COMMON_TAGS = [
    "vegetarian", "vegan", "gluten-free", "dairy-free", "low-carb",
    "high-protein", "keto", "paleo", "low-fat", "sugar-free"
];

export default function CreateRecipePage() {
    const router = useRouter();
    const { showToast } = useToast();
    
    // Basic info
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [servings, setServings] = useState(1);
    const [prepTime, setPrepTime] = useState(0);
    const [cookTime, setCookTime] = useState(0);
    const [cuisine, setCuisine] = useState("general");
    const [difficulty, setDifficulty] = useState("medium");
    const [tags, setTags] = useState<string[]>([]);
    
    // Ingredients
    const [ingredients, setIngredients] = useState<Array<Ingredient & { id: string }>>([]);
    const [showIngredientSearch, setShowIngredientSearch] = useState(false);
    const [editingIngredientIndex, setEditingIngredientIndex] = useState<number | null>(null);
    
    // Instructions
    const [instructions, setInstructions] = useState<string[]>([]);
    
    // Nutrition
    const [nutrition, setNutrition] = useState<RecipeNutrition | null>(null);
    const [calculatingNutrition, setCalculatingNutrition] = useState(false);
    
    // Saving
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Calculate nutrition whenever ingredients change
    useEffect(() => {
        if (ingredients.length > 0) {
            const timeoutId = setTimeout(() => {
                calculateNutrition();
            }, 500); // Debounce for 500ms
            
            return () => clearTimeout(timeoutId);
        } else {
            setNutrition(null);
        }
    }, [ingredients]);

    const calculateNutrition = async () => {
        if (ingredients.length === 0) {
            setNutrition(null);
            return;
        }

        try {
            setCalculatingNutrition(true);
            const result = await calculateRecipeNutrition(ingredients);
            setNutrition(result);
        } catch (error: any) {
            console.error("Failed to calculate nutrition:", error);
            showToast("Failed to calculate nutrition", "error");
        } finally {
            setCalculatingNutrition(false);
        }
    };

    const handleSelectIngredient = (food: FoodItem) => {
        const newIngredient: Ingredient & { id: string } = {
            id: `ing_${Date.now()}_${Math.random()}`,
            name: food.name,
            quantity: 100,
            unit: "g",
            food_id: food.id,
        };

        if (editingIngredientIndex !== null) {
            // Replace existing ingredient
            const updated = [...ingredients];
            updated[editingIngredientIndex] = newIngredient;
            setIngredients(updated);
            setEditingIngredientIndex(null);
        } else {
            // Add new ingredient
            setIngredients([...ingredients, newIngredient]);
        }
        setShowIngredientSearch(false);
    };

    const handleUpdateIngredient = (index: number, updates: Partial<Ingredient>) => {
        const updated = [...ingredients];
        updated[index] = { ...updated[index], ...updates };
        setIngredients(updated);
    };

    const handleRemoveIngredient = (index: number) => {
        setIngredients(ingredients.filter((_, i) => i !== index));
    };

    const handleAddInstruction = () => {
        setInstructions([...instructions, ""]);
    };

    const handleUpdateInstruction = (index: number, value: string) => {
        const updated = [...instructions];
        updated[index] = value;
        setInstructions(updated);
    };

    const handleRemoveInstruction = (index: number) => {
        setInstructions(instructions.filter((_, i) => i !== index));
    };

    const handleMoveInstruction = (index: number, direction: "up" | "down") => {
        if (direction === "up" && index === 0) return;
        if (direction === "down" && index === instructions.length - 1) return;

        const updated = [...instructions];
        const newIndex = direction === "up" ? index - 1 : index + 1;
        [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
        setInstructions(updated);
    };

    const toggleTag = (tag: string) => {
        if (tags.includes(tag)) {
            setTags(tags.filter(t => t !== tag));
        } else {
            setTags([...tags, tag]);
        }
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!name.trim()) {
            newErrors.name = "Recipe name is required";
        }

        if (ingredients.length === 0) {
            newErrors.ingredients = "At least one ingredient is required";
        }

        ingredients.forEach((ing, index) => {
            if (!ing.name.trim()) {
                newErrors[`ingredient_${index}_name`] = "Ingredient name is required";
            }
            if (ing.quantity <= 0) {
                newErrors[`ingredient_${index}_quantity`] = "Quantity must be greater than 0";
            }
        });

        if (servings <= 0) {
            newErrors.servings = "Servings must be greater than 0";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
        if (!validateForm()) {
            showToast("Please fix the errors in the form", "error");
            return;
        }

        try {
            setSaving(true);
            const recipeData = {
                name: name.trim(),
                description: description.trim(),
                servings,
                prep_time_minutes: prepTime,
                cook_time_minutes: cookTime,
                cuisine,
                difficulty,
                tags,
                ingredients: ingredients.map(({ id, ...ing }) => ing),
                instructions: instructions.filter(inst => inst.trim().length > 0),
            };

            const recipe = await createRecipe(recipeData);
            showToast("Recipe created successfully! 🎉", "success");
            router.push(`/recipes/${recipe.id}`);
        } catch (error: any) {
            console.error("Failed to create recipe:", error);
            showToast(error.message || "Failed to create recipe", "error");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800 pb-20">
            <div className="max-w-4xl mx-auto px-4 py-6">
                {/* Header */}
                <div className="mb-6">
                    <div className="flex items-center gap-3 mb-4">
                        <ChefHat className="w-8 h-8 text-orange-400" />
                        <h1 className="text-3xl font-bold text-white">Create Recipe</h1>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Basic Info */}
                    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-orange-500/20">
                        <h2 className="text-xl font-bold text-white mb-4">Basic Information</h2>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Recipe Name <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className={`w-full px-4 py-2 bg-slate-700 text-white rounded-lg border ${
                                        errors.name ? "border-red-500" : "border-orange-500/20"
                                    } focus:border-orange-500 focus:outline-none`}
                                    placeholder="e.g., Chicken Stir Fry"
                                />
                                {errors.name && <p className="mt-1 text-sm text-red-400">{errors.name}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={3}
                                    className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg border border-orange-500/20 focus:border-orange-500 focus:outline-none"
                                    placeholder="Describe your recipe..."
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Servings <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={servings}
                                        onChange={(e) => setServings(parseInt(e.target.value) || 1)}
                                        className={`w-full px-4 py-2 bg-slate-700 text-white rounded-lg border ${
                                            errors.servings ? "border-red-500" : "border-orange-500/20"
                                        } focus:border-orange-500 focus:outline-none`}
                                    />
                                    {errors.servings && <p className="mt-1 text-sm text-red-400">{errors.servings}</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Prep Time (min)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={prepTime}
                                        onChange={(e) => setPrepTime(parseInt(e.target.value) || 0)}
                                        className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg border border-orange-500/20 focus:border-orange-500 focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Cook Time (min)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={cookTime}
                                        onChange={(e) => setCookTime(parseInt(e.target.value) || 0)}
                                        className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg border border-orange-500/20 focus:border-orange-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Cuisine</label>
                                    <select
                                        value={cuisine}
                                        onChange={(e) => setCuisine(e.target.value)}
                                        className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg border border-orange-500/20 focus:border-orange-500 focus:outline-none"
                                    >
                                        {CUISINES.map(c => (
                                            <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Difficulty</label>
                                    <div className="flex gap-2">
                                        {DIFFICULTIES.map(d => (
                                            <button
                                                key={d}
                                                onClick={() => setDifficulty(d)}
                                                className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                                                    difficulty === d
                                                        ? "bg-orange-500 text-white"
                                                        : "bg-slate-700 text-gray-300 hover:bg-slate-600"
                                                }`}
                                            >
                                                {d.charAt(0).toUpperCase() + d.slice(1)}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Tags</label>
                                <div className="flex flex-wrap gap-2">
                                    {COMMON_TAGS.map(tag => (
                                        <button
                                            key={tag}
                                            onClick={() => toggleTag(tag)}
                                            className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                                                tags.includes(tag)
                                                    ? "bg-orange-500 text-white"
                                                    : "bg-slate-700 text-gray-300 hover:bg-slate-600"
                                            }`}
                                        >
                                            {tag}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Ingredients */}
                    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-orange-500/20">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-white">Ingredients</h2>
                            <button
                                onClick={() => {
                                    setEditingIngredientIndex(null);
                                    setShowIngredientSearch(true);
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                Add Ingredient
                            </button>
                        </div>

                        {errors.ingredients && (
                            <p className="mb-4 text-sm text-red-400">{errors.ingredients}</p>
                        )}

                        {ingredients.length === 0 ? (
                            <div className="text-center py-8 text-gray-400">
                                No ingredients added yet. Click "Add Ingredient" to get started.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {ingredients.map((ingredient, index) => (
                                    <div
                                        key={ingredient.id}
                                        className="p-4 bg-slate-700/50 rounded-lg border border-slate-600"
                                    >
                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                                            <div className="md:col-span-4">
                                                <label className="block text-xs text-gray-400 mb-1">Ingredient</label>
                                                <input
                                                    type="text"
                                                    value={ingredient.name}
                                                    onChange={(e) => handleUpdateIngredient(index, { name: e.target.value })}
                                                    className={`w-full px-3 py-2 bg-slate-800 text-white rounded-lg border ${
                                                        errors[`ingredient_${index}_name`] ? "border-red-500" : "border-slate-600"
                                                    } focus:border-orange-500 focus:outline-none`}
                                                />
                                                {errors[`ingredient_${index}_name`] && (
                                                    <p className="mt-1 text-xs text-red-400">{errors[`ingredient_${index}_name`]}</p>
                                                )}
                                            </div>

                                            <div className="md:col-span-3">
                                                <label className="block text-xs text-gray-400 mb-1">Quantity</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.1"
                                                    value={ingredient.quantity}
                                                    onChange={(e) => handleUpdateIngredient(index, { quantity: parseFloat(e.target.value) || 0 })}
                                                    className={`w-full px-3 py-2 bg-slate-800 text-white rounded-lg border ${
                                                        errors[`ingredient_${index}_quantity`] ? "border-red-500" : "border-slate-600"
                                                    } focus:border-orange-500 focus:outline-none`}
                                                />
                                                {errors[`ingredient_${index}_quantity`] && (
                                                    <p className="mt-1 text-xs text-red-400">{errors[`ingredient_${index}_quantity`]}</p>
                                                )}
                                            </div>

                                            <div className="md:col-span-3">
                                                <label className="block text-xs text-gray-400 mb-1">Unit</label>
                                                <select
                                                    value={ingredient.unit}
                                                    onChange={(e) => handleUpdateIngredient(index, { unit: e.target.value })}
                                                    className="w-full px-3 py-2 bg-slate-800 text-white rounded-lg border border-slate-600 focus:border-orange-500 focus:outline-none"
                                                >
                                                    {UNITS.map(unit => (
                                                        <option key={unit.value} value={unit.value}>{unit.label}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="md:col-span-2 flex gap-2">
                                                <button
                                                    onClick={() => {
                                                        setEditingIngredientIndex(index);
                                                        setShowIngredientSearch(true);
                                                    }}
                                                    className="flex-1 px-3 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors text-sm"
                                                >
                                                    Search
                                                </button>
                                                <button
                                                    onClick={() => handleRemoveIngredient(index)}
                                                    className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Nutrition Preview */}
                    {nutrition && (
                        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-orange-500/20">
                            <h2 className="text-xl font-bold text-white mb-4">Nutrition (Total Recipe)</h2>
                            {calculatingNutrition ? (
                                <div className="text-center py-4">
                                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-orange-400"></div>
                                    <p className="mt-2 text-gray-400 text-sm">Calculating...</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="bg-slate-700/50 rounded-lg p-4">
                                        <p className="text-sm text-gray-400">Calories</p>
                                        <p className="text-2xl font-bold text-orange-400">{nutrition.calories.toFixed(0)}</p>
                                        <p className="text-xs text-gray-500 mt-1">{(nutrition.calories / servings).toFixed(0)} per serving</p>
                                    </div>
                                    <div className="bg-slate-700/50 rounded-lg p-4">
                                        <p className="text-sm text-gray-400">Protein</p>
                                        <p className="text-2xl font-bold text-blue-400">{nutrition.protein.toFixed(1)}g</p>
                                        <p className="text-xs text-gray-500 mt-1">{(nutrition.protein / servings).toFixed(1)}g per serving</p>
                                    </div>
                                    <div className="bg-slate-700/50 rounded-lg p-4">
                                        <p className="text-sm text-gray-400">Carbs</p>
                                        <p className="text-2xl font-bold text-green-400">{nutrition.carbs.toFixed(1)}g</p>
                                        <p className="text-xs text-gray-500 mt-1">{(nutrition.carbs / servings).toFixed(1)}g per serving</p>
                                    </div>
                                    <div className="bg-slate-700/50 rounded-lg p-4">
                                        <p className="text-sm text-gray-400">Fats</p>
                                        <p className="text-2xl font-bold text-yellow-400">{nutrition.fats.toFixed(1)}g</p>
                                        <p className="text-xs text-gray-500 mt-1">{(nutrition.fats / servings).toFixed(1)}g per serving</p>
                                    </div>
                                </div>
                            )}
                            {nutrition._missing_ingredients && nutrition._missing_ingredients.length > 0 && (
                                <div className="mt-4 p-3 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
                                    <p className="text-sm text-yellow-400">
                                        ⚠️ Could not find nutrition data for: {nutrition._missing_ingredients.join(", ")}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Instructions */}
                    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-orange-500/20">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-white">Instructions</h2>
                            <button
                                onClick={handleAddInstruction}
                                className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                Add Step
                            </button>
                        </div>

                        {instructions.length === 0 ? (
                            <div className="text-center py-8 text-gray-400">
                                No instructions added yet. Click "Add Step" to get started.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {instructions.map((instruction, index) => (
                                    <div
                                        key={index}
                                        className="flex gap-2 items-start"
                                    >
                                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 font-bold mt-2">
                                            {index + 1}
                                        </div>
                                        <textarea
                                            value={instruction}
                                            onChange={(e) => handleUpdateInstruction(index, e.target.value)}
                                            rows={2}
                                            className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-orange-500 focus:outline-none"
                                            placeholder={`Step ${index + 1}...`}
                                        />
                                        <div className="flex flex-col gap-1">
                                            <button
                                                onClick={() => handleMoveInstruction(index, "up")}
                                                disabled={index === 0}
                                                className="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <ArrowUp className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleMoveInstruction(index, "down")}
                                                disabled={index === instructions.length - 1}
                                                className="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <ArrowDown className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleRemoveInstruction(index)}
                                                className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Save Button */}
                    <div className="flex gap-4">
                        <button
                            onClick={() => router.back()}
                            className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex-1 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {saving ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="w-5 h-5" />
                                    Save Recipe
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            <IngredientSearchModal
                isOpen={showIngredientSearch}
                onClose={() => {
                    setShowIngredientSearch(false);
                    setEditingIngredientIndex(null);
                }}
                onSelect={handleSelectIngredient}
            />

            <BottomNav />
        </div>
    );
}

