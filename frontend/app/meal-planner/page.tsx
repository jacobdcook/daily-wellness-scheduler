"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Calendar, Plus, ChefHat, ShoppingCart, Save, Target, TrendingUp, TrendingDown, Minus, Copy, Trash2, Download, Upload, Sparkles, Clock, CheckSquare, Square, MoreVertical, X } from "lucide-react";
import { getMealPlan, createMealPlan, generateShoppingList, searchRecipes, Recipe, getNutritionGoals, NutritionGoal, getRecipe, getMyRecipes, getFavoriteRecipes } from "@/utils/api";
import { BottomNav } from "@/components/BottomNav";
import { useToast } from "@/context/ToastContext";
import { format, startOfWeek, addDays, parseISO } from "date-fns";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type MealType = "breakfast" | "lunch" | "dinner" | "snack";

interface MealItem {
    recipe_id: string;
    servings: number;
    recipe?: Recipe;
}

interface DailyNutrition {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
}

function SortableMealItem({ 
    id,
    meal, 
    index, 
    onRemove 
}: { 
    id: string;
    meal: MealItem; 
    index: number; 
    onRemove: () => void;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className="bg-gray-900/50 rounded p-2 text-sm cursor-move hover:bg-gray-900/70 transition-colors"
        >
            <div className="text-white font-medium truncate">
                {meal.recipe?.name || "Recipe"}
            </div>
            <div className="text-gray-400 text-xs">
                {meal.servings} serving{meal.servings !== 1 ? 's' : ''}
            </div>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onRemove();
                }}
                className="text-red-400 text-xs hover:text-red-300 mt-1"
            >
                Remove
            </button>
        </div>
    );
}

function MealPlannerContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { showToast } = useToast();
    const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
    const [mealPlan, setMealPlan] = useState<Record<string, Record<MealType, MealItem[]>>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedDay, setSelectedDay] = useState<string | null>(null);
    const [selectedMeal, setSelectedMeal] = useState<MealType | null>(null);
    const [showRecipeSearch, setShowRecipeSearch] = useState(false);
    const [recipeSearchResults, setRecipeSearchResults] = useState<Recipe[]>([]);
    const [recipeSearchQuery, setRecipeSearchQuery] = useState("");
    const [nutritionGoals, setNutritionGoals] = useState<NutritionGoal | null>(null);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [recipesCache, setRecipesCache] = useState<Record<string, Recipe>>({});
    const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set());
    const [showBulkMenu, setShowBulkMenu] = useState(false);
    const [mealPrepMode, setMealPrepMode] = useState(false);
    const [smartSuggestions, setSmartSuggestions] = useState<Recipe[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [myRecipes, setMyRecipes] = useState<Recipe[]>([]);
    const [favoriteRecipes, setFavoriteRecipes] = useState<Recipe[]>([]);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        loadMealPlan();
        loadNutritionGoals();
        loadSmartSuggestions();
        const recipeId = searchParams.get("recipe");
        if (recipeId) {
            setShowRecipeSearch(true);
        }
    }, [weekStart]);

    const loadNutritionGoals = async () => {
        try {
            const goals = await getNutritionGoals();
            setNutritionGoals(goals);
        } catch (error) {
            console.error("Failed to load nutrition goals:", error);
        }
    };

    const loadSmartSuggestions = async () => {
        try {
            const [myRecipesData, favoritesData] = await Promise.all([
                getMyRecipes().catch(() => ({ recipes: [] })),
                getFavoriteRecipes().catch(() => ({ recipes: [] })),
            ]);
            setMyRecipes(myRecipesData.recipes || []);
            setFavoriteRecipes(favoritesData.recipes || []);
            // Combine and prioritize favorites
            const suggestions = [...(favoritesData.recipes || []), ...(myRecipesData.recipes || [])];
            setSmartSuggestions(suggestions.slice(0, 10));
        } catch (error) {
            console.error("Failed to load suggestions:", error);
        }
    };

    const loadMealPlan = async () => {
        setLoading(true);
        try {
            const weekStartStr = format(weekStart, "yyyy-MM-dd");
            const data = await getMealPlan(weekStartStr);
            
            // Initialize plan for all 7 days
            const plan: Record<string, Record<MealType, MealItem[]>> = {};
            for (let i = 0; i < 7; i++) {
                const date = format(addDays(weekStart, i), "yyyy-MM-dd");
                plan[date] = {
                    breakfast: [],
                    lunch: [],
                    dinner: [],
                    snack: [],
                };
            }

            if (data.meal_plan) {
                // Load recipes for meal plan items
                const recipeIds = new Set<string>();
                for (const [date, meals] of Object.entries(data.meal_plan.meals || {})) {
                    for (const meal of meals as any[]) {
                        if (meal.recipe_id) {
                            recipeIds.add(meal.recipe_id);
                        }
                    }
                }

                // Fetch all recipes in parallel
                const recipePromises = Array.from(recipeIds).map(async (id) => {
                    try {
                        const recipe = await getRecipe(id);
                        return { id, recipe };
                    } catch {
                        return { id, recipe: null };
                    }
                });
                const recipeResults = await Promise.all(recipePromises);
                const cache: Record<string, Recipe> = {};
                recipeResults.forEach(({ id, recipe }) => {
                    if (recipe) cache[id] = recipe;
                });
                setRecipesCache(cache);

                // Populate plan with meals
                for (const [date, meals] of Object.entries(data.meal_plan.meals || {})) {
                    if (plan[date]) {
                        for (const meal of meals as any[]) {
                            const mealType = meal.meal_type as MealType;
                            if (plan[date][mealType]) {
                                plan[date][mealType].push({
                                    recipe_id: meal.recipe_id,
                                    servings: meal.servings || 1,
                                    recipe: cache[meal.recipe_id],
                                });
                            }
                        }
                    }
                }
            }
            setMealPlan(plan);
        } catch (error) {
            console.error("Failed to load meal plan:", error);
            showToast("Failed to load meal plan", "error");
        } finally {
            setLoading(false);
        }
    };

    // Calculate nutrition for a single meal item
    const calculateMealNutrition = (meal: MealItem): DailyNutrition => {
        if (!meal.recipe || !meal.recipe.nutrition) {
            return { calories: 0, protein: 0, carbs: 0, fats: 0 };
        }
        const servings = meal.servings || 1;
        const baseServings = meal.recipe.servings || 1;
        const multiplier = servings / baseServings;
        
        return {
            calories: (meal.recipe.nutrition.calories || 0) * multiplier,
            protein: (meal.recipe.nutrition.protein || 0) * multiplier,
            carbs: (meal.recipe.nutrition.carbs || 0) * multiplier,
            fats: (meal.recipe.nutrition.fats || 0) * multiplier,
        };
    };

    // Calculate daily nutrition
    const calculateDailyNutrition = (date: string): DailyNutrition => {
        const dayMeals = mealPlan[date];
        if (!dayMeals) return { calories: 0, protein: 0, carbs: 0, fats: 0 };

        let total = { calories: 0, protein: 0, carbs: 0, fats: 0 };
        for (const mealType of ["breakfast", "lunch", "dinner", "snack"] as MealType[]) {
            for (const meal of dayMeals[mealType] || []) {
                const nutrition = calculateMealNutrition(meal);
                total.calories += nutrition.calories;
                total.protein += nutrition.protein;
                total.carbs += nutrition.carbs;
                total.fats += nutrition.fats;
            }
        }
        return total;
    };

    // Calculate weekly nutrition
    const weeklyNutrition = useMemo(() => {
        const days = Array.from({ length: 7 }, (_, i) => format(addDays(weekStart, i), "yyyy-MM-dd"));
        const daily: Record<string, DailyNutrition> = {};
        let weekly = { calories: 0, protein: 0, carbs: 0, fats: 0 };

        days.forEach(date => {
            const dayNutrition = calculateDailyNutrition(date);
            daily[date] = dayNutrition;
            weekly.calories += dayNutrition.calories;
            weekly.protein += dayNutrition.protein;
            weekly.carbs += dayNutrition.carbs;
            weekly.fats += dayNutrition.fats;
        });

        return { daily, weekly, average: {
            calories: weekly.calories / 7,
            protein: weekly.protein / 7,
            carbs: weekly.carbs / 7,
            fats: weekly.fats / 7,
        }};
    }, [mealPlan, weekStart]);

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over || active.id === over.id) return;

        // Parse drag data
        const activeId = active.id as string;
        const overId = over.id as string;

        // Extract source info from activeId (format: "meal-{date}-{mealType}-{index}")
        const activeMatch = activeId.match(/^meal-(\d{4}-\d{2}-\d{2})-(breakfast|lunch|dinner|snack)-(\d+)$/);
        if (!activeMatch) return;

        const [, sourceDate, sourceMealType, sourceIndex] = activeMatch;
        const sourceMeal = mealPlan[sourceDate]?.[sourceMealType as MealType]?.[parseInt(sourceIndex)];

        if (!sourceMeal) return;

        // Determine destination
        if (overId.startsWith("meal-")) {
            // Dropping on another meal item (reorder within same meal or move to different meal)
            const overMatch = overId.match(/^meal-(\d{4}-\d{2}-\d{2})-(breakfast|lunch|dinner|snack)-(\d+)$/);
            if (!overMatch) return;

            const [, destDate, destMealType, destIndex] = overMatch;
            
            // Remove from source
            const newPlan = { ...mealPlan };
            newPlan[sourceDate][sourceMealType as MealType] = newPlan[sourceDate][sourceMealType as MealType].filter((_, i) => i !== parseInt(sourceIndex));

            // Add to destination
            if (!newPlan[destDate]) {
                newPlan[destDate] = {
                    breakfast: [],
                    lunch: [],
                    dinner: [],
                    snack: [],
                };
            }
            const destMeals = newPlan[destDate][destMealType as MealType];
            destMeals.splice(parseInt(destIndex), 0, sourceMeal);
            setMealPlan(newPlan);
        } else if (overId.startsWith("dropzone-")) {
            // Dropping on a dropzone (empty meal slot)
            const dropMatch = overId.match(/^dropzone-(\d{4}-\d{2}-\d{2})-(breakfast|lunch|dinner|snack)$/);
            if (!dropMatch) return;

            const [, destDate, destMealType] = dropMatch;

            // Remove from source
            const newPlan = { ...mealPlan };
            newPlan[sourceDate][sourceMealType as MealType] = newPlan[sourceDate][sourceMealType as MealType].filter((_, i) => i !== parseInt(sourceIndex));

            // Add to destination
            if (!newPlan[destDate]) {
                newPlan[destDate] = {
                    breakfast: [],
                    lunch: [],
                    dinner: [],
                    snack: [],
                };
            }
            newPlan[destDate][destMealType as MealType].push(sourceMeal);
            setMealPlan(newPlan);
        }
    };

    const saveMealPlan = async () => {
        setSaving(true);
        try {
            const weekStartStr = format(weekStart, "yyyy-MM-dd");
            const meals: Record<string, any[]> = {};
            for (const [date, dayMeals] of Object.entries(mealPlan)) {
                if (!dayMeals) continue;
                meals[date] = [];
                for (const [mealType, recipes] of Object.entries(dayMeals)) {
                    for (const recipe of recipes) {
                        meals[date].push({
                            meal_type: mealType,
                            recipe_id: recipe.recipe_id,
                            servings: recipe.servings,
                        });
                    }
                }
            }
            await createMealPlan(weekStartStr, meals);
            showToast("Meal plan saved!", "success");
        } catch (error) {
            console.error("Failed to save meal plan:", error);
            showToast("Failed to save meal plan", "error");
        } finally {
            setSaving(false);
        }
    };

    const searchRecipesForMeal = async () => {
        if (!recipeSearchQuery) return;
        try {
            const data = await searchRecipes({ query: recipeSearchQuery, limit: 10 });
            setRecipeSearchResults(data.recipes || []);
        } catch (error) {
            console.error("Failed to search recipes:", error);
        }
    };

    const addRecipeToMeal = async (recipe: Recipe) => {
        if (!selectedDay || !selectedMeal) return;

        // Fetch full recipe if not already cached
        if (!recipesCache[recipe.id]) {
            try {
                const fullRecipe = await getRecipe(recipe.id);
                setRecipesCache(prev => ({ ...prev, [recipe.id]: fullRecipe }));
            } catch {
                // Use partial recipe if fetch fails
            }
        }

        const newPlan = { ...mealPlan };
        if (!newPlan[selectedDay]) {
            newPlan[selectedDay] = {
                breakfast: [],
                lunch: [],
                dinner: [],
                snack: [],
            };
        }
        newPlan[selectedDay][selectedMeal].push({
            recipe_id: recipe.id,
            servings: recipe.servings || 1,
            recipe: recipesCache[recipe.id] || recipe,
        });
        setMealPlan(newPlan);
        setShowRecipeSearch(false);
        setRecipeSearchQuery("");
        showToast(`${recipe.name} added to ${selectedMeal}!`, "success");
    };

    const removeRecipeFromMeal = (date: string, mealType: MealType, index: number) => {
        const newPlan = { ...mealPlan };
        if (!newPlan[date] || !newPlan[date][mealType]) return;
        newPlan[date][mealType].splice(index, 1);
        setMealPlan(newPlan);
    };

    const generateShoppingListFromPlan = async () => {
        try {
            const weekStartStr = format(weekStart, "yyyy-MM-dd");
            const shoppingList = await generateShoppingList(undefined, weekStartStr);
            router.push(`/shopping-list?plan=${weekStartStr}`);
        } catch (error) {
            console.error("Failed to generate shopping list:", error);
            showToast("Failed to generate shopping list", "error");
        }
    };

    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const mealTypes: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

    const getGoalComparison = (actual: number, goal: number | undefined) => {
        if (!goal || goal === 0) return null;
        const diff = actual - goal;
        const percent = (actual / goal) * 100;
        return { diff, percent, isOver: diff > 0, isUnder: diff < -goal * 0.1 };
    };

    // Bulk Operations
    const toggleDaySelection = (dateStr: string) => {
        const newSelected = new Set(selectedDays);
        if (newSelected.has(dateStr)) {
            newSelected.delete(dateStr);
        } else {
            newSelected.add(dateStr);
        }
        setSelectedDays(newSelected);
    };

    const clearSelectedDays = () => {
        const newPlan = { ...mealPlan };
        selectedDays.forEach(dateStr => {
            if (newPlan[dateStr]) {
                newPlan[dateStr] = {
                    breakfast: [],
                    lunch: [],
                    dinner: [],
                    snack: [],
                };
            }
        });
        setMealPlan(newPlan);
        setSelectedDays(new Set());
        showToast(`Cleared ${selectedDays.size} day(s)`, "success");
    };

    const copyDayToSelected = (sourceDate: string) => {
        if (selectedDays.size === 0) {
            showToast("Select days to copy to first", "error");
            return;
        }
        const sourceMeals = mealPlan[sourceDate];
        if (!sourceMeals) return;

        const newPlan = { ...mealPlan };
        selectedDays.forEach(targetDate => {
            if (targetDate !== sourceDate) {
                newPlan[targetDate] = JSON.parse(JSON.stringify(sourceMeals));
            }
        });
        setMealPlan(newPlan);
        showToast(`Copied to ${selectedDays.size} day(s)`, "success");
        setSelectedDays(new Set());
    };

    const fillWeekWithTemplate = (templateDate: string) => {
        const templateMeals = mealPlan[templateDate];
        if (!templateMeals) {
            showToast("Template day is empty", "error");
            return;
        }
        const newPlan = { ...mealPlan };
        days.forEach(day => {
            const dateStr = format(day, "yyyy-MM-dd");
            if (dateStr !== templateDate) {
                newPlan[dateStr] = JSON.parse(JSON.stringify(templateMeals));
            }
        });
        setMealPlan(newPlan);
        showToast("Week filled with template!", "success");
    };

    // Export/Import
    const exportMealPlan = () => {
        const exportData = {
            week_start: format(weekStart, "yyyy-MM-dd"),
            meal_plan: mealPlan,
            exported_at: new Date().toISOString(),
        };
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `meal-plan-${format(weekStart, "yyyy-MM-dd")}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast("Meal plan exported!", "success");
    };

    const exportMealPlanCSV = () => {
        const rows: string[] = ["Date,Meal Type,Recipe Name,Servings,Calories,Protein (g),Carbs (g),Fats (g)"];
        days.forEach(day => {
            const dateStr = format(day, "yyyy-MM-dd");
            const dayMeals = mealPlan[dateStr];
            if (!dayMeals) return;
            mealTypes.forEach(mealType => {
                (dayMeals[mealType] || []).forEach(meal => {
                    const nutrition = calculateMealNutrition(meal);
                    rows.push(
                        `"${dateStr}","${mealType}","${meal.recipe?.name || "Unknown"}",${meal.servings},${Math.round(nutrition.calories)},${Math.round(nutrition.protein)},${Math.round(nutrition.carbs)},${Math.round(nutrition.fats)}`
                    );
                });
            });
        });
        const csv = rows.join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `meal-plan-${format(weekStart, "yyyy-MM-dd")}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        showToast("Meal plan exported as CSV!", "success");
    };

    const importMealPlan = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target?.result as string);
                if (data.meal_plan) {
                    setMealPlan(data.meal_plan);
                    if (data.week_start) {
                        setWeekStart(parseISO(data.week_start));
                    }
                    showToast("Meal plan imported!", "success");
                } else {
                    showToast("Invalid meal plan file", "error");
                }
            } catch (error) {
                showToast("Failed to import meal plan", "error");
            }
        };
        reader.readAsText(file);
    };

    // Meal Prep Calculations
    const calculateMealPrepTime = useMemo(() => {
        const prepDays: Record<string, { recipes: Recipe[], totalTime: number }> = {};
        days.forEach(day => {
            const dateStr = format(day, "yyyy-MM-dd");
            const dayMeals = mealPlan[dateStr];
            if (!dayMeals) return;
            mealTypes.forEach(mealType => {
                (dayMeals[mealType] || []).forEach(meal => {
                    if (meal.recipe) {
                        const prepTime = meal.recipe.prep_time_minutes || 0;
                        const cookTime = meal.recipe.cook_time_minutes || 0;
                        const totalTime = prepTime + cookTime;
                        if (!prepDays[dateStr]) {
                            prepDays[dateStr] = { recipes: [], totalTime: 0 };
                        }
                        prepDays[dateStr].recipes.push(meal.recipe);
                        prepDays[dateStr].totalTime += totalTime;
                    }
                });
            });
        });
        return prepDays;
    }, [mealPlan, days, mealTypes]);

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800 pb-20">
                <div className="max-w-7xl mx-auto px-4 py-6">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <ChefHat className="w-8 h-8 text-orange-400" />
                            <h1 className="text-3xl font-bold text-white">Meal Planner</h1>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            <button
                                onClick={() => setMealPrepMode(!mealPrepMode)}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                                    mealPrepMode 
                                        ? "bg-orange-500 hover:bg-orange-600 text-white" 
                                        : "bg-gray-700 hover:bg-gray-600 text-white"
                                }`}
                            >
                                <Clock className="w-4 h-4" />
                                Meal Prep Mode
                            </button>
                            <div className="relative">
                                <button
                                    onClick={() => setShowBulkMenu(!showBulkMenu)}
                                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                                >
                                    <MoreVertical className="w-4 h-4" />
                                    Bulk Actions
                                </button>
                                {showBulkMenu && (
                                    <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10">
                                        <button
                                            onClick={() => {
                                                exportMealPlan();
                                                setShowBulkMenu(false);
                                            }}
                                            className="w-full px-4 py-2 text-left text-white hover:bg-gray-700 flex items-center gap-2"
                                        >
                                            <Download className="w-4 h-4" />
                                            Export JSON
                                        </button>
                                        <button
                                            onClick={() => {
                                                exportMealPlanCSV();
                                                setShowBulkMenu(false);
                                            }}
                                            className="w-full px-4 py-2 text-left text-white hover:bg-gray-700 flex items-center gap-2"
                                        >
                                            <Download className="w-4 h-4" />
                                            Export CSV
                                        </button>
                                        <label className="w-full px-4 py-2 text-left text-white hover:bg-gray-700 flex items-center gap-2 cursor-pointer">
                                            <Upload className="w-4 h-4" />
                                            Import
                                            <input
                                                type="file"
                                                accept=".json"
                                                onChange={importMealPlan}
                                                className="hidden"
                                                onClick={() => setShowBulkMenu(false)}
                                            />
                                        </label>
                                        {selectedDays.size > 0 && (
                                            <>
                                                <div className="border-t border-gray-700 my-1"></div>
                                                <button
                                                    onClick={() => {
                                                        clearSelectedDays();
                                                        setShowBulkMenu(false);
                                                    }}
                                                    className="w-full px-4 py-2 text-left text-red-400 hover:bg-gray-700 flex items-center gap-2"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                    Clear Selected
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={generateShoppingListFromPlan}
                                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                            >
                                <ShoppingCart className="w-4 h-4" />
                                Shopping List
                            </button>
                            <button
                                onClick={saveMealPlan}
                                disabled={saving}
                                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                                <Save className="w-4 h-4" />
                                {saving ? "Saving..." : "Save Plan"}
                            </button>
                        </div>
                    </div>

                    {/* Week Navigation */}
                    <div className="flex items-center justify-between mb-6">
                        <button
                            onClick={() => setWeekStart(addDays(weekStart, -7))}
                            className="px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white hover:bg-gray-700/50 transition-colors"
                        >
                            ← Previous Week
                        </button>
                        <div className="flex items-center gap-4">
                            <div className="text-white font-medium">
                                {format(weekStart, "MMM d")} - {format(addDays(weekStart, 6), "MMM d, yyyy")}
                            </div>
                            {selectedDays.size > 0 && (
                                <div className="text-sm text-orange-400">
                                    {selectedDays.size} day(s) selected
                                </div>
                            )}
                        </div>
                        <div className="flex gap-2">
                            {selectedDays.size > 0 && (
                                <button
                                    onClick={() => setSelectedDays(new Set())}
                                    className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                                >
                                    Clear Selection
                                </button>
                            )}
                            <button
                                onClick={() => setShowSuggestions(!showSuggestions)}
                                className="px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white hover:bg-gray-700/50 transition-colors flex items-center gap-2"
                            >
                                <Sparkles className="w-4 h-4" />
                                Suggestions
                            </button>
                            <button
                                onClick={() => setWeekStart(addDays(weekStart, 7))}
                                className="px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white hover:bg-gray-700/50 transition-colors"
                            >
                                Next Week →
                            </button>
                        </div>
                    </div>

                    {/* Smart Suggestions Panel */}
                    {showSuggestions && (
                        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-orange-500/20 mb-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-orange-400" />
                                    <h2 className="text-xl font-bold text-white">Smart Suggestions</h2>
                                </div>
                                <button
                                    onClick={() => setShowSuggestions(false)}
                                    className="text-gray-400 hover:text-white"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {smartSuggestions.map(recipe => (
                                    <div
                                        key={recipe.id}
                                        className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 hover:border-orange-500/50 transition-colors cursor-pointer"
                                        onClick={() => {
                                            const today = format(new Date(), "yyyy-MM-dd");
                                            setSelectedDay(today);
                                            setSelectedMeal("dinner");
                                            addRecipeToMeal(recipe);
                                            setShowSuggestions(false);
                                        }}
                                    >
                                        <h3 className="font-semibold text-white">{recipe.name}</h3>
                                        <p className="text-sm text-gray-400 mt-1 line-clamp-2">{recipe.description}</p>
                                        <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                                            <span>{recipe.total_time_minutes} min</span>
                                            {recipe.nutrition && (
                                                <span className="text-orange-400">
                                                    {Math.round(recipe.nutrition.calories)} cal
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Meal Prep Mode Panel */}
                    {mealPrepMode && (
                        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-orange-500/20 mb-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Clock className="w-5 h-5 text-orange-400" />
                                <h2 className="text-xl font-bold text-white">Meal Prep Schedule</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                                {days.map(day => {
                                    const dateStr = format(day, "yyyy-MM-dd");
                                    const prepData = calculateMealPrepTime[dateStr];
                                    return (
                                        <div key={dateStr} className="bg-slate-700/50 rounded-lg p-4">
                                            <p className="text-sm font-medium text-white mb-2">{format(day, "EEE, MMM d")}</p>
                                            {prepData && prepData.recipes.length > 0 ? (
                                                <>
                                                    <p className="text-xs text-gray-400 mb-1">
                                                        {prepData.recipes.length} recipe(s)
                                                    </p>
                                                    <p className="text-lg font-bold text-orange-400">
                                                        {Math.round(prepData.totalTime)} min
                                                    </p>
                                                    <div className="mt-2 space-y-1">
                                                        {prepData.recipes.slice(0, 3).map((r, idx) => (
                                                            <p key={idx} className="text-xs text-gray-500 truncate">
                                                                {r.name}
                                                            </p>
                                                        ))}
                                                        {prepData.recipes.length > 3 && (
                                                            <p className="text-xs text-gray-500">
                                                                +{prepData.recipes.length - 3} more
                                                            </p>
                                                        )}
                                                    </div>
                                                </>
                                            ) : (
                                                <p className="text-xs text-gray-500">No meals planned</p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Nutrition Preview */}
                    {nutritionGoals && (
                        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-orange-500/20 mb-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Target className="w-5 h-5 text-orange-400" />
                                <h2 className="text-xl font-bold text-white">Weekly Nutrition Preview</h2>
                            </div>
                            
                            {/* Average Daily */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                                <div className="bg-slate-700/50 rounded-lg p-4">
                                    <p className="text-sm text-gray-400 mb-1">Avg Daily Calories</p>
                                    <div className="flex items-center gap-2">
                                        <p className="text-2xl font-bold text-orange-400">
                                            {Math.round(weeklyNutrition.average.calories)}
                                        </p>
                                        {nutritionGoals.daily_calories && (() => {
                                            const comp = getGoalComparison(weeklyNutrition.average.calories, nutritionGoals.daily_calories);
                                            if (comp) {
                                                return (
                                                    <div className={`flex items-center gap-1 text-sm ${comp.isOver ? 'text-red-400' : comp.isUnder ? 'text-yellow-400' : 'text-green-400'}`}>
                                                        {comp.isOver ? <TrendingUp className="w-4 h-4" /> : comp.isUnder ? <TrendingDown className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                                                        {comp.diff > 0 ? '+' : ''}{Math.round(comp.diff)}
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })()}
                                    </div>
                                    {nutritionGoals.daily_calories && (
                                        <p className="text-xs text-gray-500 mt-1">
                                            Goal: {nutritionGoals.daily_calories} cal
                                        </p>
                                    )}
                                </div>
                                <div className="bg-slate-700/50 rounded-lg p-4">
                                    <p className="text-sm text-gray-400 mb-1">Avg Daily Protein</p>
                                    <p className="text-2xl font-bold text-blue-400">
                                        {Math.round(weeklyNutrition.average.protein)}g
                                    </p>
                                    {nutritionGoals.protein_grams && (
                                        <p className="text-xs text-gray-500 mt-1">
                                            Goal: {nutritionGoals.protein_grams}g
                                        </p>
                                    )}
                                </div>
                                <div className="bg-slate-700/50 rounded-lg p-4">
                                    <p className="text-sm text-gray-400 mb-1">Avg Daily Carbs</p>
                                    <p className="text-2xl font-bold text-green-400">
                                        {Math.round(weeklyNutrition.average.carbs)}g
                                    </p>
                                    {nutritionGoals.carbs_grams && (
                                        <p className="text-xs text-gray-500 mt-1">
                                            Goal: {nutritionGoals.carbs_grams}g
                                        </p>
                                    )}
                                </div>
                                <div className="bg-slate-700/50 rounded-lg p-4">
                                    <p className="text-sm text-gray-400 mb-1">Avg Daily Fats</p>
                                    <p className="text-2xl font-bold text-yellow-400">
                                        {Math.round(weeklyNutrition.average.fats)}g
                                    </p>
                                    {nutritionGoals.fats_grams && (
                                        <p className="text-xs text-gray-500 mt-1">
                                            Goal: {nutritionGoals.fats_grams}g
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Daily Breakdown */}
                            <div className="mt-4">
                                <p className="text-sm font-medium text-gray-300 mb-2">Daily Breakdown:</p>
                                <div className="grid grid-cols-7 gap-2">
                                    {days.map(day => {
                                        const dateStr = format(day, "yyyy-MM-dd");
                                        const dayNutrition = weeklyNutrition.daily[dateStr] || { calories: 0, protein: 0, carbs: 0, fats: 0 };
                                        const calComp = getGoalComparison(dayNutrition.calories, nutritionGoals.daily_calories);
                                        return (
                                            <div
                                                key={dateStr}
                                                className={`bg-slate-700/30 rounded-lg p-2 border ${
                                                    calComp?.isOver ? 'border-red-500/50' : 
                                                    calComp?.isUnder ? 'border-yellow-500/50' : 
                                                    'border-slate-600'
                                                }`}
                                            >
                                                <p className="text-xs text-gray-400 mb-1">{format(day, "EEE")}</p>
                                                <p className="text-sm font-bold text-white">{Math.round(dayNutrition.calories)}</p>
                                                <p className="text-xs text-gray-500">cal</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Meal Plan Grid */}
                    {loading ? (
                        <div className="text-center py-12">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-400"></div>
                            <p className="mt-4 text-gray-400">Loading meal plan...</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <div className="grid grid-cols-8 gap-4 min-w-[800px]">
                                {/* Header Row */}
                                <div className="font-semibold text-gray-400 text-sm"></div>
                                {days.map(day => {
                                    const dateStr = format(day, "yyyy-MM-dd");
                                    const dayNutrition = weeklyNutrition.daily[dateStr] || { calories: 0, protein: 0, carbs: 0, fats: 0 };
                                    const isSelected = selectedDays.has(dateStr);
                                    return (
                                        <div key={day.toISOString()} className="text-center">
                                            <div className="flex items-center justify-center gap-2 mb-1">
                                                <button
                                                    onClick={() => toggleDaySelection(dateStr)}
                                                    className="text-white hover:text-orange-400 transition-colors"
                                                >
                                                    {isSelected ? (
                                                        <CheckSquare className="w-5 h-5 text-orange-400" />
                                                    ) : (
                                                        <Square className="w-5 h-5" />
                                                    )}
                                                </button>
                                                <div className="text-white font-semibold">{format(day, "EEE")}</div>
                                            </div>
                                            <div className="text-gray-400 text-sm">{format(day, "MMM d")}</div>
                                            <div className="text-xs text-orange-400 mt-1">
                                                {Math.round(dayNutrition.calories)} cal
                                            </div>
                                            {isSelected && (
                                                <div className="mt-2 flex gap-1 justify-center">
                                                    <button
                                                        onClick={() => copyDayToSelected(dateStr)}
                                                        className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
                                                        title="Copy this day to selected days"
                                                    >
                                                        <Copy className="w-3 h-3" />
                                                    </button>
                                                    <button
                                                        onClick={() => fillWeekWithTemplate(dateStr)}
                                                        className="px-2 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded"
                                                        title="Fill week with this template"
                                                    >
                                                        Fill
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                {/* Meal Rows */}
                                {mealTypes.map(mealType => (
                                    <div key={mealType} className="contents">
                                        <div className="font-medium text-gray-300 capitalize py-2">{mealType}</div>
                                        {days.map(day => {
                                            const dateStr = format(day, "yyyy-MM-dd");
                                            const meals = mealPlan[dateStr]?.[mealType] || [];
                                            const dropzoneId = `dropzone-${dateStr}-${mealType}`;
                                            
                                            return (
                                                <div
                                                    key={dateStr}
                                                    id={dropzoneId}
                                                    className="bg-gray-800/50 border border-gray-700 rounded-lg p-2 min-h-[120px]"
                                                >
                                                    <SortableContext
                                                        items={meals.map((_, idx) => `meal-${dateStr}-${mealType}-${idx}`)}
                                                        strategy={verticalListSortingStrategy}
                                                    >
                                                        <div className="space-y-2">
                                                            {meals.map((meal, idx) => (
                                                                <SortableMealItem
                                                                    key={`meal-${dateStr}-${mealType}-${idx}`}
                                                                    id={`meal-${dateStr}-${mealType}-${idx}`}
                                                                    meal={meal}
                                                                    index={idx}
                                                                    onRemove={() => removeRecipeFromMeal(dateStr, mealType, idx)}
                                                                />
                                                            ))}
                                                        </div>
                                                    </SortableContext>
                                                    <button
                                                        onClick={() => {
                                                            setSelectedDay(dateStr);
                                                            setSelectedMeal(mealType);
                                                            setShowRecipeSearch(true);
                                                        }}
                                                        className="w-full mt-2 px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-xs transition-colors flex items-center justify-center gap-1"
                                                    >
                                                        <Plus className="w-3 h-3" />
                                                        Add
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Recipe Search Modal */}
                    {showRecipeSearch && (
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                            <div className="bg-gray-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                                <div className="flex items-center justify-between p-6 border-b border-gray-800">
                                    <h2 className="text-xl font-bold text-white">Add Recipe to {selectedMeal}</h2>
                                    <button
                                        onClick={() => {
                                            setShowRecipeSearch(false);
                                            setRecipeSearchQuery("");
                                        }}
                                        className="text-gray-400 hover:text-white transition-colors"
                                    >
                                        ✕
                                    </button>
                                </div>
                                <div className="p-6 flex-1 overflow-y-auto">
                                    <div className="mb-4">
                                        <input
                                            type="text"
                                            placeholder="Search recipes..."
                                            value={recipeSearchQuery}
                                            onChange={(e) => setRecipeSearchQuery(e.target.value)}
                                            onKeyPress={(e) => e.key === "Enter" && searchRecipesForMeal()}
                                            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500"
                                        />
                                        <div className="flex gap-2 mt-2">
                                            <button
                                                onClick={searchRecipesForMeal}
                                                className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors"
                                            >
                                                Search
                                            </button>
                                            {smartSuggestions.length > 0 && (
                                                <button
                                                    onClick={() => {
                                                        setRecipeSearchResults(smartSuggestions);
                                                    }}
                                                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                                                >
                                                    <Sparkles className="w-4 h-4" />
                                                    Suggestions
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        {recipeSearchResults.map(recipe => (
                                            <div
                                                key={recipe.id}
                                                onClick={() => addRecipeToMeal(recipe)}
                                                className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 hover:border-orange-500/50 transition-colors cursor-pointer"
                                            >
                                                <h3 className="font-semibold text-white">{recipe.name}</h3>
                                                <p className="text-sm text-gray-400 mt-1">{recipe.description}</p>
                                                <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                                                    <span>{recipe.total_time_minutes} min</span>
                                                    <span>{recipe.servings} servings</span>
                                                    {recipe.nutrition && (
                                                        <span className="text-orange-400">
                                                            {Math.round(recipe.nutrition.calories)} cal
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <DragOverlay>
                        {activeId ? (
                            <div className="bg-gray-900/50 rounded p-2 text-sm border border-orange-500">
                                <div className="text-white font-medium">Dragging...</div>
                            </div>
                        ) : null}
                    </DragOverlay>
                </div>
                <BottomNav />
            </div>
        </DndContext>
    );
}

export default function MealPlannerPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800 flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-400"></div>
                    <p className="mt-4 text-gray-400">Loading meal planner...</p>
                </div>
            </div>
        }>
            <MealPlannerContent />
        </Suspense>
    );
}
