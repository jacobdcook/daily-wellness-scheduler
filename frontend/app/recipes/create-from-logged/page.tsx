"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChefHat, Plus, Trash2, Save, X, Calendar, Clock } from "lucide-react";
import { getNutritionEntries, FoodEntry, createRecipe, Ingredient } from "@/utils/api";
import { useToast } from "@/context/ToastContext";
import { BottomNav } from "@/components/BottomNav";
import { format } from "date-fns";

const CUISINES = [
    "general", "american", "italian", "mexican", "asian", "mediterranean",
    "indian", "french", "japanese", "chinese", "thai", "greek", "spanish"
];

const DIFFICULTIES = ["easy", "medium", "hard"];

const COMMON_TAGS = [
    "vegetarian", "vegan", "gluten-free", "dairy-free", "low-carb",
    "high-protein", "keto", "paleo", "low-fat", "sugar-free"
];

export default function CreateRecipeFromLoggedPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { showToast } = useToast();
    
    const [selectedDate, setSelectedDate] = useState(searchParams.get("date") || format(new Date(), "yyyy-MM-dd"));
    const [selectedMeal, setSelectedMeal] = useState<"breakfast" | "lunch" | "dinner" | "snack">(
        (searchParams.get("meal") as any) || "breakfast"
    );
    const [entries, setEntries] = useState<FoodEntry[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Recipe form
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [servings, setServings] = useState(1);
    const [prepTime, setPrepTime] = useState(0);
    const [cookTime, setCookTime] = useState(0);
    const [cuisine, setCuisine] = useState("general");
    const [difficulty, setDifficulty] = useState("medium");
    const [tags, setTags] = useState<string[]>([]);
    const [instructions, setInstructions] = useState<string[]>([]);
    
    // Selected entries to include in recipe
    const [selectedEntryIds, setSelectedEntryIds] = useState<Set<string>>(new Set());
    const [ingredients, setIngredients] = useState<Array<Ingredient & { id: string }>>([]);
    const [nutrition, setNutrition] = useState<any>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadEntries();
    }, [selectedDate, selectedMeal]);

    useEffect(() => {
        // Auto-select all entries when they load
        if (entries.length > 0 && selectedEntryIds.size === 0) {
            setSelectedEntryIds(new Set(entries.map(e => e.id)));
        }
    }, [entries]);

    useEffect(() => {
        // Convert selected entries to ingredients
        const selectedEntries = entries.filter(e => selectedEntryIds.has(e.id));
        const newIngredients: Array<Ingredient & { id: string }> = selectedEntries.map(entry => ({
            id: entry.id,
            food_item: entry.food_item,
            quantity: entry.quantity,
            unit: entry.unit
        }));
        setIngredients(newIngredients);
        
        // Calculate nutrition directly from logged entries (already calculated!)
        if (selectedEntries.length > 0) {
            const totalNutrition = selectedEntries.reduce((acc, entry) => {
                const nut = entry.nutrition;
                return {
                    total_calories: acc.total_calories + (nut.calories || 0),
                    total_protein: acc.total_protein + (nut.protein || 0),
                    total_carbs: acc.total_carbs + (nut.carbs || 0),
                    total_fats: acc.total_fats + (nut.fats || 0),
                    total_fiber: acc.total_fiber + (nut.fiber || 0),
                    total_sugar: acc.total_sugar + (nut.sugar || 0),
                    total_sodium: acc.total_sodium + (nut.sodium || 0),
                };
            }, {
                total_calories: 0,
                total_protein: 0,
                total_carbs: 0,
                total_fats: 0,
                total_fiber: 0,
                total_sugar: 0,
                total_sodium: 0,
            });
            setNutrition(totalNutrition);
        } else {
            setNutrition(null);
        }
        
        // Auto-generate recipe name from selected items
        if (selectedEntries.length > 0 && !name) {
            const itemNames = selectedEntries.map(e => e.food_item.name).join(", ");
            if (itemNames.length > 50) {
                setName(itemNames.substring(0, 47) + "...");
            } else {
                setName(itemNames);
            }
        }
    }, [selectedEntryIds, entries]);

    const loadEntries = async () => {
        try {
            setLoading(true);
            const data = await getNutritionEntries(selectedDate, 1);
            const mealEntries = data.entries.filter(e => e.meal_type === selectedMeal);
            setEntries(mealEntries);
        } catch (error) {
            console.error("Failed to load entries:", error);
            showToast("Failed to load logged items", "error");
        } finally {
            setLoading(false);
        }
    };

    const toggleEntrySelection = (entryId: string) => {
        const newSelected = new Set(selectedEntryIds);
        if (newSelected.has(entryId)) {
            newSelected.delete(entryId);
        } else {
            newSelected.add(entryId);
        }
        setSelectedEntryIds(newSelected);
    };

    // Nutrition is now calculated directly from logged entries in useEffect above
    // No need for separate calculateNutrition function

    const handleSave = async () => {
        if (!name.trim()) {
            showToast("Please enter a recipe name", "error");
            return;
        }

        if (ingredients.length === 0) {
            showToast("Please select at least one item", "error");
            return;
        }

        try {
            setSaving(true);
            // Convert ingredients to format expected by backend
            const formattedIngredients = ingredients.map(ing => ({
                name: ing.food_item.name,
                quantity: ing.quantity,
                unit: ing.unit,
                food_id: ing.food_item.id || ing.food_item.barcode
            }));
            
            const recipeData = {
                name: name.trim(),
                description: description.trim() || undefined,
                servings,
                prep_time_minutes: prepTime,
                cook_time_minutes: cookTime,
                cuisine,
                difficulty,
                tags,
                ingredients: formattedIngredients,
                instructions: instructions.filter(i => i.trim().length > 0)
            };

            await createRecipe(recipeData);
            showToast("Recipe created successfully!", "success");
            router.push("/recipes/my");
        } catch (error: any) {
            console.error("Failed to create recipe:", error);
            showToast(error.message || "Failed to create recipe", "error");
        } finally {
            setSaving(false);
        }
    };

    const addInstruction = () => {
        setInstructions([...instructions, ""]);
    };

    const updateInstruction = (index: number, value: string) => {
        const newInstructions = [...instructions];
        newInstructions[index] = value;
        setInstructions(newInstructions);
    };

    const removeInstruction = (index: number) => {
        setInstructions(instructions.filter((_, i) => i !== index));
    };

    const moveInstruction = (index: number, direction: "up" | "down") => {
        if (direction === "up" && index === 0) return;
        if (direction === "down" && index === instructions.length - 1) return;

        const newInstructions = [...instructions];
        const targetIndex = direction === "up" ? index - 1 : index + 1;
        [newInstructions[index], newInstructions[targetIndex]] = [newInstructions[targetIndex], newInstructions[index]];
        setInstructions(newInstructions);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading logged items...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800 pb-20">
            <div className="max-w-4xl mx-auto px-4 py-6">
                {/* Header */}
                <div className="mb-6">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"
                    >
                        <X className="w-5 h-5" />
                        <span>Back</span>
                    </button>
                    <div className="flex items-center gap-3 mb-4">
                        <ChefHat className="w-8 h-8 text-orange-400" />
                        <h1 className="text-3xl font-bold text-white">Create Recipe from Logged Items</h1>
                    </div>
                </div>

                {/* Date and Meal Selector */}
                <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-2">Date</label>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-2">Meal Type</label>
                            <select
                                value={selectedMeal}
                                onChange={(e) => setSelectedMeal(e.target.value as any)}
                                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                            >
                                <option value="breakfast">Breakfast</option>
                                <option value="lunch">Lunch</option>
                                <option value="dinner">Dinner</option>
                                <option value="snack">Snack</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Select Items */}
                <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700 mb-6">
                    <h2 className="text-xl font-bold text-white mb-4">Select Items to Include</h2>
                    {entries.length === 0 ? (
                        <p className="text-gray-400 text-center py-8">
                            No items logged for {selectedMeal} on {selectedDate}
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {entries.map((entry) => (
                                <label
                                    key={entry.id}
                                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                        selectedEntryIds.has(entry.id)
                                            ? "bg-orange-500/20 border-orange-500"
                                            : "bg-gray-700/50 border-gray-600 hover:bg-gray-700"
                                    }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedEntryIds.has(entry.id)}
                                        onChange={() => toggleEntrySelection(entry.id)}
                                        className="w-5 h-5 text-orange-500 rounded focus:ring-orange-500"
                                    />
                                    <div className="flex-1">
                                        <div className="font-semibold text-white">{entry.food_item.name}</div>
                                        <div className="text-sm text-gray-400">
                                            {entry.quantity} {entry.unit} • {entry.nutrition.calories} cal
                                        </div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    )}
                </div>

                {/* Recipe Form */}
                {ingredients.length > 0 && (
                    <>
                        {/* Basic Info */}
                        <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700 mb-6">
                            <h2 className="text-xl font-bold text-white mb-4">Recipe Details</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Recipe Name *</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="e.g., Lentils Sausage Bacon Soup"
                                        className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Description</label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Describe your recipe..."
                                        rows={3}
                                        className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-2">Servings</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={servings}
                                            onChange={(e) => setServings(parseInt(e.target.value) || 1)}
                                            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-2">Prep Time (min)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={prepTime}
                                            onChange={(e) => setPrepTime(parseInt(e.target.value) || 0)}
                                            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-2">Cook Time (min)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={cookTime}
                                            onChange={(e) => setCookTime(parseInt(e.target.value) || 0)}
                                            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-2">Cuisine</label>
                                        <select
                                            value={cuisine}
                                            onChange={(e) => setCuisine(e.target.value)}
                                            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                                        >
                                            {CUISINES.map(c => (
                                                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-2">Difficulty</label>
                                        <select
                                            value={difficulty}
                                            onChange={(e) => setDifficulty(e.target.value)}
                                            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                                        >
                                            {DIFFICULTIES.map(d => (
                                                <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Tags</label>
                                    <div className="flex flex-wrap gap-2">
                                        {COMMON_TAGS.map(tag => (
                                            <button
                                                key={tag}
                                                onClick={() => {
                                                    if (tags.includes(tag)) {
                                                        setTags(tags.filter(t => t !== tag));
                                                    } else {
                                                        setTags([...tags, tag]);
                                                    }
                                                }}
                                                className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                                                    tags.includes(tag)
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
                        </div>

                        {/* Ingredients Preview */}
                        <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700 mb-6">
                            <h2 className="text-xl font-bold text-white mb-4">Ingredients</h2>
                            <div className="space-y-2">
                                {ingredients.map((ing, idx) => (
                                    <div key={ing.id} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                                        <div>
                                            <div className="font-semibold text-white">{ing.food_item.name}</div>
                                            <div className="text-sm text-gray-400">
                                                {ing.quantity} {ing.unit}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Nutrition Preview */}
                        {nutrition && (
                            <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700 mb-6">
                                <h2 className="text-xl font-bold text-white mb-4">Nutrition (Total)</h2>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="text-center p-3 bg-gray-700/50 rounded-lg">
                                        <div className="text-2xl font-bold text-orange-400">{nutrition.total_calories?.toFixed(0) || 0}</div>
                                        <div className="text-sm text-gray-400">Calories</div>
                                    </div>
                                    <div className="text-center p-3 bg-gray-700/50 rounded-lg">
                                        <div className="text-2xl font-bold text-purple-400">{nutrition.total_protein?.toFixed(1) || 0}g</div>
                                        <div className="text-sm text-gray-400">Protein</div>
                                    </div>
                                    <div className="text-center p-3 bg-gray-700/50 rounded-lg">
                                        <div className="text-2xl font-bold text-blue-400">{nutrition.total_carbs?.toFixed(1) || 0}g</div>
                                        <div className="text-sm text-gray-400">Carbs</div>
                                    </div>
                                    <div className="text-center p-3 bg-gray-700/50 rounded-lg">
                                        <div className="text-2xl font-bold text-yellow-400">{nutrition.total_fats?.toFixed(1) || 0}g</div>
                                        <div className="text-sm text-gray-400">Fats</div>
                                    </div>
                                </div>
                                {servings > 0 && (
                                    <div className="mt-4 pt-4 border-t border-gray-700">
                                        <h3 className="text-sm font-semibold text-gray-400 mb-2">Per Serving ({servings} servings)</h3>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <div className="text-center">
                                                <div className="text-lg font-bold text-orange-400">{(nutrition.total_calories / servings).toFixed(0)}</div>
                                                <div className="text-xs text-gray-400">Cal</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-lg font-bold text-purple-400">{(nutrition.total_protein / servings).toFixed(1)}g</div>
                                                <div className="text-xs text-gray-400">Protein</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-lg font-bold text-blue-400">{(nutrition.total_carbs / servings).toFixed(1)}g</div>
                                                <div className="text-xs text-gray-400">Carbs</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-lg font-bold text-yellow-400">{(nutrition.total_fats / servings).toFixed(1)}g</div>
                                                <div className="text-xs text-gray-400">Fats</div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Instructions */}
                        <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700 mb-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold text-white">Instructions (Optional)</h2>
                                <button
                                    onClick={addInstruction}
                                    className="flex items-center gap-2 px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add Step
                                </button>
                            </div>
                            {instructions.length === 0 ? (
                                <p className="text-gray-400 text-center py-4">No instructions added yet</p>
                            ) : (
                                <div className="space-y-2">
                                    {instructions.map((instruction, index) => (
                                        <div key={index} className="flex items-start gap-2 p-3 bg-gray-700/50 rounded-lg">
                                            <div className="flex flex-col gap-1 mt-1">
                                                <button
                                                    onClick={() => moveInstruction(index, "up")}
                                                    disabled={index === 0}
                                                    className="p-1 text-gray-400 hover:text-white disabled:opacity-30"
                                                >
                                                    ↑
                                                </button>
                                                <button
                                                    onClick={() => moveInstruction(index, "down")}
                                                    disabled={index === instructions.length - 1}
                                                    className="p-1 text-gray-400 hover:text-white disabled:opacity-30"
                                                >
                                                    ↓
                                                </button>
                                            </div>
                                            <div className="flex-1">
                                                <div className="text-sm text-gray-400 mb-1">Step {index + 1}</div>
                                                <textarea
                                                    value={instruction}
                                                    onChange={(e) => updateInstruction(index, e.target.value)}
                                                    placeholder="Enter instruction..."
                                                    rows={2}
                                                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm"
                                                />
                                            </div>
                                            <button
                                                onClick={() => removeInstruction(index)}
                                                className="p-2 text-red-400 hover:text-red-300 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Save Button */}
                        <div className="flex gap-4">
                            <button
                                onClick={handleSave}
                                disabled={saving || !name.trim() || ingredients.length === 0}
                                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-semibold"
                            >
                                <Save className="w-5 h-5" />
                                {saving ? "Saving..." : "Save Recipe"}
                            </button>
                            <button
                                onClick={() => router.back()}
                                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </>
                )}
            </div>
            <BottomNav />
        </div>
    );
}

