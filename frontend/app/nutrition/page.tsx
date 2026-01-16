"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { UtensilsCrossed, Plus, Trash2, Target, TrendingUp, Scale, ArrowLeft, Settings, Calendar, BarChart3, Activity, Heart, Sparkles, ChefHat, Info, Award, Lightbulb, Camera } from "lucide-react";
import {
    getNutritionEntries,
    deleteNutritionEntry,
    getNutritionSummary,
    getNutritionGoals,
    FoodEntry,
    NutritionSummary,
    NutritionGoal,
    getWeightGoals,
    getWeightStats,
    WeightGoal,
    CalorieTarget,
    WeightStats,
    createWeightEntry,
    getWeightEntries,
    WeightEntry,
    getFavoriteMeals,
    FavoriteMeal,
    createNutritionEntry
} from "@/utils/api";
import { BottomNav } from "@/components/BottomNav";
import { FoodSearchModal } from "@/components/FoodSearchModal";
import { EnhancedFoodEntry } from "@/components/EnhancedFoodEntry";
import { WellnessIntegration } from "@/components/WellnessIntegration";
import { NutritionAnalyticsDashboard } from "@/components/NutritionAnalyticsDashboard";
import { MealSuggestionsModal } from "@/components/MealSuggestionsModal";
import { QuickAddTemplatesModal } from "@/components/QuickAddTemplatesModal";
import { useToast } from "@/context/ToastContext";
import { format, parseISO, subDays } from "date-fns";

type MealType = "breakfast" | "lunch" | "dinner" | "snack";
type NutritionTab = "today" | "analytics" | "wellness" | "favorites" | "templates" | "health-scanner" | "insights";

export default function NutritionPage() {
    const router = useRouter();
    const { data: session } = useSession();
    const { showToast } = useToast();
    const [entries, setEntries] = useState<FoodEntry[]>([]);
    const [summary, setSummary] = useState<NutritionSummary | null>(null);
    const [nutritionGoals, setNutritionGoals] = useState<any>(null);
    const [weightGoals, setWeightGoals] = useState<WeightGoal | null>(null);
    const [calorieTarget, setCalorieTarget] = useState<CalorieTarget | null>(null);
    const [weightStats, setWeightStats] = useState<WeightStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [activeMeal, setActiveMeal] = useState<MealType>("breakfast");
    const [activeTab, setActiveTab] = useState<NutritionTab>("today");
    const [showAddModal, setShowAddModal] = useState(false);
    const [showWeightModal, setShowWeightModal] = useState(false);
    const [showMealSuggestionsModal, setShowMealSuggestionsModal] = useState(false);
    const [showTemplatesModal, setShowTemplatesModal] = useState(false);
    const [weightInput, setWeightInput] = useState("");
    const [favorites, setFavorites] = useState<FavoriteMeal[]>([]);

    useEffect(() => {
        if (session) {
            loadData();
        }
    }, [session, selectedDate]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [entriesData, summaryData, nutritionGoalsData, weightGoalsData, statsData] = await Promise.all([
                getNutritionEntries(selectedDate, 1),
                getNutritionSummary(selectedDate),
                getNutritionGoals().catch(() => null),
                getWeightGoals().catch(() => ({ goals: null, calorie_target: null })),
                getWeightStats(30).catch(() => null)
            ]);
            setEntries(entriesData.entries);
            setSummary(summaryData);
            setNutritionGoals(nutritionGoalsData);
            setWeightGoals(weightGoalsData.goals);
            setCalorieTarget(weightGoalsData.calorie_target);
            setWeightStats(statsData);
        } catch (error) {
            console.error("Failed to load nutrition data:", error);
            showToast("Failed to load nutrition data", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteEntry = async (entryId: string) => {
        if (!confirm("Delete this food entry?")) return;

        try {
            await deleteNutritionEntry(entryId);
            showToast("Food entry deleted", "success");
            loadData();
        } catch (error) {
            console.error("Failed to delete food entry:", error);
            showToast("Failed to delete food entry", "error");
        }
    };

    const handleLogWeight = async () => {
        const weight = parseFloat(weightInput);
        if (!weight || weight <= 0) {
            showToast("Please enter a valid weight", "error");
            return;
        }

        try {
            await createWeightEntry({
                date: selectedDate,
                weight_kg: weight,
                weight_lbs: weight * 2.20462
            });
            showToast("Weight logged successfully", "success");
            setWeightInput("");
            setShowWeightModal(false);
            loadData();
        } catch (error) {
            console.error("Failed to log weight:", error);
            showToast("Failed to log weight", "error");
        }
    };

    const getMealEntries = (mealType: MealType) => {
        return entries.filter(entry => entry.meal_type === mealType);
    };

    const getMealCalories = (mealType: MealType) => {
        return getMealEntries(mealType).reduce((sum, entry) => sum + entry.nutrition.calories, 0);
    };

    const getGoalTypeLabel = (goalType: string) => {
        switch (goalType) {
            case "lose": return "Lose Weight";
            case "gain": return "Gain Weight";
            case "maintain": return "Maintain Weight";
            default: return "Set Goal";
        }
    };

    const getGoalTypeColor = (goalType: string) => {
        switch (goalType) {
            case "lose": return "text-red-400";
            case "gain": return "text-green-400";
            case "maintain": return "text-blue-400";
            default: return "text-gray-400";
        }
    };

    const loadFavorites = async () => {
        try {
            const data = await getFavoriteMeals();
            setFavorites(data.favorites || []);
        } catch (error) {
            console.error("Failed to load favorites:", error);
            showToast("Failed to load favorite meals", "error");
        }
    };

    const handleAddFavorite = async (favorite: FavoriteMeal) => {
        try {
            // Add all food entries from the favorite meal to today
            for (const foodEntry of favorite.food_entries) {
                await createNutritionEntry({
                    date: selectedDate,
                    meal_type: favorite.meal_type,
                    food_item: foodEntry.food_item,
                    quantity: foodEntry.quantity,
                    unit: foodEntry.unit,
                    nutrition: foodEntry.nutrition
                });
            }
            showToast("Favorite meal added to today", "success");
            loadData();
        } catch (error) {
            console.error("Failed to add favorite meal:", error);
            showToast("Failed to add favorite meal", "error");
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-orange-900 to-slate-900 flex items-center justify-center pb-20">
                <div className="text-white text-xl">Loading nutrition data...</div>
                <BottomNav />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-orange-900 to-slate-900 pb-20">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-slate-900/80 backdrop-blur-sm border-b border-orange-500/20">
                <div className="max-w-4xl mx-auto px-2 sm:px-4 py-3 sm:py-4">
                    {/* Top row: Title and buttons */}
                    <div className="flex items-center gap-2 sm:gap-4 mb-2 sm:mb-0">
                        <UtensilsCrossed className="w-6 h-6 sm:w-8 sm:h-8 text-orange-400 flex-shrink-0" />
                        <h1 className="text-xl sm:text-2xl font-bold text-white flex-1 min-w-0">Nutrition</h1>
                        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                            <button
                                onClick={() => router.push("/recipes")}
                                className="p-1.5 sm:p-2 hover:bg-orange-500/20 rounded-lg transition-colors"
                                title="Recipes"
                            >
                                <ChefHat className="w-4 h-4 sm:w-5 sm:h-5 text-orange-400" />
                            </button>
                            <button
                                onClick={() => router.push("/nutrition/goals")}
                                className="p-1.5 sm:p-2 hover:bg-orange-500/20 rounded-lg transition-colors"
                                title="Settings"
                            >
                                <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-orange-400" />
                            </button>
                        </div>
                    </div>
                    {/* Date picker row - full width on mobile */}
                    <div className="flex items-center sm:hidden">
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="w-full px-3 py-1.5 bg-slate-800 text-white rounded-lg border border-orange-500/20 text-sm"
                        />
                    </div>
                    {/* Date picker - inline on desktop */}
                    <div className="hidden sm:flex items-center gap-2">
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="px-3 py-1 bg-slate-800 text-white rounded-lg border border-orange-500/20 text-sm"
                        />
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
                {/* Tabs */}
                <div className="flex gap-2 border-b border-orange-500/20 overflow-x-auto">
                    <button
                        onClick={() => setActiveTab("today")}
                        className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
                            activeTab === "today"
                                ? "text-orange-400 border-b-2 border-orange-400"
                                : "text-gray-400 hover:text-white"
                        }`}
                    >
                        <UtensilsCrossed className="w-4 h-4 inline mr-2" />
                        Today
                    </button>
                    <button
                        onClick={() => setActiveTab("analytics")}
                        className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
                            activeTab === "analytics"
                                ? "text-orange-400 border-b-2 border-orange-400"
                                : "text-gray-400 hover:text-white"
                        }`}
                    >
                        <BarChart3 className="w-4 h-4 inline mr-2" />
                        Analytics
                    </button>
                    <button
                        onClick={() => setActiveTab("wellness")}
                        className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
                            activeTab === "wellness"
                                ? "text-orange-400 border-b-2 border-orange-400"
                                : "text-gray-400 hover:text-white"
                        }`}
                    >
                        <Activity className="w-4 h-4 inline mr-2" />
                        Wellness
                    </button>
                    <button
                        onClick={() => {
                            setActiveTab("favorites");
                            loadFavorites();
                        }}
                        className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
                            activeTab === "favorites"
                                ? "text-orange-400 border-b-2 border-orange-400"
                                : "text-gray-400 hover:text-white"
                        }`}
                    >
                        <Heart className="w-4 h-4 inline mr-2" />
                        Favorites
                    </button>
                    <button
                        onClick={() => {
                            setActiveTab("templates");
                        }}
                        className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
                            activeTab === "templates"
                                ? "text-orange-400 border-b-2 border-orange-400"
                                : "text-gray-400 hover:text-white"
                        }`}
                    >
                        <ChefHat className="w-4 h-4 inline mr-2" />
                        Templates
                    </button>
                    <button
                        onClick={() => setActiveTab("health-scanner")}
                        className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
                            activeTab === "health-scanner"
                                ? "text-orange-400 border-b-2 border-orange-400"
                                : "text-gray-400 hover:text-white"
                        }`}
                    >
                        <Award className="w-4 h-4 inline mr-2" />
                        Health Scanner
                    </button>
                    <button
                        onClick={() => router.push("/nutrition/insights")}
                        className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
                            activeTab === "insights"
                                ? "text-orange-400 border-b-2 border-orange-400"
                                : "text-gray-400 hover:text-white"
                        }`}
                    >
                        <Lightbulb className="w-4 h-4 inline mr-2" />
                        Insights
                    </button>
                    <button
                        onClick={() => router.push("/nutrition/photo-recognition")}
                        className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
                            activeTab === "photo-recognition"
                                ? "text-orange-400 border-b-2 border-orange-400"
                                : "text-gray-400 hover:text-white"
                        }`}
                    >
                        <Camera className="w-4 h-4 inline mr-2" />
                        Photo
                    </button>
                </div>

                {/* Tab Content */}
                {activeTab === "wellness" ? (
                    <WellnessIntegration days={30} />
                ) : activeTab === "analytics" ? (
                    <NutritionAnalyticsDashboard />
                ) : activeTab === "templates" ? (
                    <div className="text-center py-12">
                        <ChefHat className="w-16 h-16 text-orange-400 mx-auto mb-4 opacity-50" />
                        <p className="text-gray-400 mb-4">Manage your meal templates</p>
                        <button
                            onClick={() => router.push("/meal-templates")}
                            className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors"
                        >
                            Go to Meal Templates
                        </button>
                    </div>
                ) : activeTab === "health-scanner" ? (
                    <div className="text-center py-12">
                        <Award className="w-16 h-16 text-orange-400 mx-auto mb-4 opacity-50" />
                        <h3 className="text-xl font-bold text-white mb-2">Food Health Scanner</h3>
                        <p className="text-gray-400 mb-6">Discover the health quality of any food product with comprehensive scoring</p>
                        <button
                            onClick={() => router.push("/nutrition/health-scanner")}
                            className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors"
                        >
                            Open Health Scanner →
                        </button>
                    </div>
                ) : activeTab === "favorites" ? (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-white">Favorite Meals</h3>
                            <button
                                onClick={loadFavorites}
                                className="text-sm text-orange-400 hover:text-orange-300"
                            >
                                Refresh
                            </button>
                        </div>
                        {favorites.length === 0 ? (
                            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-12 border border-orange-500/20 text-center">
                                <Heart className="w-16 h-16 text-orange-400 mx-auto mb-4 opacity-50" />
                                <p className="text-gray-400 mb-2">No favorite meals yet</p>
                                <p className="text-sm text-gray-500">
                                    Save meals from AI suggestions or your logged meals
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {favorites.map((favorite) => (
                                    <div
                                        key={favorite.id}
                                        className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-orange-500/20"
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div>
                                                <h4 className="text-white font-semibold">{favorite.name}</h4>
                                                <p className="text-sm text-gray-400 capitalize">{favorite.meal_type}</p>
                                            </div>
                                            <Heart className="w-5 h-5 text-orange-400 fill-orange-400" />
                                        </div>
                                        <div className="flex flex-wrap gap-3 text-sm mb-4">
                                            <span className="text-orange-400">{favorite.total_calories} cal</span>
                                            <span className="text-blue-400">{favorite.total_protein}g protein</span>
                                            <span className="text-green-400">{favorite.total_carbs}g carbs</span>
                                            <span className="text-yellow-400">{favorite.total_fats}g fats</span>
                                        </div>
                                        <button
                                            onClick={() => handleAddFavorite(favorite)}
                                            className="w-full px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Plus className="w-4 h-4" />
                                            Add to Today
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                        {/* Weight Goal Card */}
                        {weightGoals && (
                    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-orange-500/20">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <Scale className="w-6 h-6 text-orange-400" />
                                <div>
                                    <h2 className="text-lg font-bold text-white">Weight Goal</h2>
                                    <p className={`text-sm font-medium ${getGoalTypeColor(weightGoals.goal_type)}`}>
                                        {getGoalTypeLabel(weightGoals.goal_type)}
                                    </p>
                                </div>
                            </div>
                            {weightStats && weightStats.latest_weight && (
                                <div className="text-right">
                                    <div className="text-2xl font-bold text-white">{weightStats.latest_weight.toFixed(1)} kg</div>
                                    {weightStats.weight_change !== null && weightStats.weight_change !== 0 && (
                                        <div className={`text-sm ${weightStats.weight_change < 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {weightStats.weight_change > 0 ? '+' : ''}{weightStats.weight_change.toFixed(1)} kg
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        {calorieTarget && (
                            <div className="grid grid-cols-3 gap-4 text-center">
                                <div className="relative group">
                                    <div className="text-xs text-gray-400 mb-1 flex items-center justify-center gap-1">
                                        <span>Resting</span>
                                        <div className="relative">
                                            <Info className="w-3 h-3 cursor-help" />
                                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800 text-white text-xs rounded-lg shadow-lg z-10 max-w-[250px] border border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                                                Basal Metabolic Rate (BMR) - Calories your body burns at rest, just to stay alive
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-white font-semibold">{calorieTarget.bmr.toFixed(0)}</div>
                                    <div className="text-[10px] text-gray-500 mt-0.5">cal/day</div>
                                </div>
                                <div className="relative group">
                                    <div className="text-xs text-gray-400 mb-1 flex items-center justify-center gap-1">
                                        <span>Daily</span>
                                        <div className="relative">
                                            <Info className="w-3 h-3 cursor-help" />
                                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800 text-white text-xs rounded-lg shadow-lg z-10 max-w-[280px] border border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                                                Total Daily Energy Expenditure (TDEE) - Total calories you burn per day including activity
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-white font-semibold">{(calorieTarget?.tdee || 2000).toFixed(0)}</div>
                                    <div className="text-[10px] text-gray-500 mt-0.5">cal/day</div>
                                </div>
                                <div className="relative group">
                                    <div className="text-xs text-gray-400 mb-1 flex items-center justify-center gap-1">
                                        <span>Target</span>
                                        <div className="relative">
                                            <Info className="w-3 h-3 cursor-help" />
                                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800 text-white text-xs rounded-lg shadow-lg z-10 max-w-[280px] border border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                                                Your daily calorie intake goal - how many calories you should eat per day to reach your weight goal
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-orange-400 font-semibold">{(summary?.goal_calories || calorieTarget?.target_calories || 2000).toFixed(0)}</div>
                                    <div className="text-[10px] text-gray-500 mt-0.5">cal/day</div>
                                </div>
                            </div>
                        )}
                        <button
                            onClick={() => setShowWeightModal(true)}
                            className="mt-4 w-full px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Log Weight
                        </button>
                    </div>
                )}

                {/* Daily Summary Card */}
                {summary && (
                    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-orange-500/20">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-white">Daily Summary</h2>
                            <div className="text-sm text-gray-400">
                                Target: {(summary.goal_calories || calorieTarget?.target_calories || 2000).toFixed(0)} cal
                            </div>
                        </div>
                        
                        {/* Calories */}
                        <div className="mb-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-orange-400 text-sm">Calories</span>
                                <span className="text-white font-semibold">
                                    {summary.total_calories.toFixed(0)} / {(summary.goal_calories || calorieTarget?.target_calories || 2000).toFixed(0)}
                                </span>
                            </div>
                            <div className="w-full bg-slate-700 rounded-full h-4">
                                {(() => {
                                    const goalCal = summary.goal_calories || calorieTarget?.target_calories || 2000;
                                    const percentage = Math.min((summary.total_calories / goalCal) * 100, 100);
                                    return (
                                        <div
                                            className={`h-4 rounded-full transition-all ${
                                                summary.total_calories > goalCal
                                                    ? "bg-red-500"
                                                    : summary.total_calories > goalCal * 0.9
                                                    ? "bg-yellow-500"
                                                    : "bg-green-500"
                                            }`}
                                            style={{
                                                width: `${percentage}%`
                                            }}
                                        />
                                    );
                                })()}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                                {summary.calories_remaining > 0
                                    ? `${summary.calories_remaining.toFixed(0)} remaining`
                                    : `${Math.abs(summary.calories_remaining).toFixed(0)} over`}
                            </div>
                        </div>

                        {/* Macros */}
                        <div className="space-y-3">
                            {/* Protein */}
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-purple-400 text-xs">Protein</span>
                                    <span className="text-white text-xs font-semibold">
                                        {summary.total_protein.toFixed(0)}g / {(nutritionGoals?.protein_grams || 0).toFixed(0)}g
                                    </span>
                                </div>
                                <div className="w-full bg-slate-700 rounded-full h-2">
                                    <div
                                        className="bg-purple-500 h-2 rounded-full transition-all"
                                        style={{
                                            width: `${Math.min((summary.total_protein / (nutritionGoals?.protein_grams || 1)) * 100, 100)}%`
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Carbs */}
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-blue-400 text-xs">Carbs</span>
                                    <span className="text-white text-xs font-semibold">
                                        {summary.total_carbs.toFixed(0)}g / {(nutritionGoals?.carbs_grams || 0).toFixed(0)}g
                                    </span>
                                </div>
                                <div className="w-full bg-slate-700 rounded-full h-2">
                                    <div
                                        className="bg-blue-500 h-2 rounded-full transition-all"
                                        style={{
                                            width: `${Math.min((summary.total_carbs / (nutritionGoals?.carbs_grams || 1)) * 100, 100)}%`
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Fats */}
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-yellow-400 text-xs">Fats</span>
                                    <span className="text-white text-xs font-semibold">
                                        {summary.total_fats.toFixed(0)}g / {(nutritionGoals?.fats_grams || 0).toFixed(0)}g
                                    </span>
                                </div>
                                <div className="w-full bg-slate-700 rounded-full h-2">
                                    <div
                                        className="bg-yellow-500 h-2 rounded-full transition-all"
                                        style={{
                                            width: `${Math.min((summary.total_fats / (nutritionGoals?.fats_grams || 1)) * 100, 100)}%`
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Quick Add Buttons */}
                <div className="grid grid-cols-4 gap-2 mb-3">
                    {(["breakfast", "lunch", "dinner", "snack"] as MealType[]).map((meal) => (
                        <button
                            key={meal}
                            onClick={() => {
                                setActiveMeal(meal);
                                setShowAddModal(true);
                            }}
                            className="px-4 py-3 bg-slate-800/50 hover:bg-slate-700/50 border border-orange-500/20 rounded-lg transition-colors text-center"
                        >
                            <div className="text-white font-medium text-sm capitalize">{meal}</div>
                            <div className="text-orange-400 text-xs mt-1">
                                {getMealCalories(meal).toFixed(0)} cal
                            </div>
                        </button>
                    ))}
                </div>
                <button
                    onClick={() => {
                        setActiveMeal(activeMeal);
                        setShowMealSuggestionsModal(true);
                    }}
                    className="w-full px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 border border-orange-400 rounded-lg transition-colors text-center flex items-center justify-center gap-2 mb-6"
                >
                    <Sparkles className="w-4 h-4" />
                    <span className="text-white font-medium">Get AI Meal Suggestions</span>
                </button>

                {/* Meal Tabs */}
                <div className="flex gap-2 border-b border-orange-500/20 overflow-x-auto">
                    {(["breakfast", "lunch", "dinner", "snack"] as MealType[]).map((meal) => {
                        const mealCalories = getMealCalories(meal);
                        return (
                            <button
                                key={meal}
                                onClick={() => setActiveMeal(meal)}
                                className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
                                    activeMeal === meal
                                        ? "text-orange-400 border-b-2 border-orange-400"
                                        : "text-gray-400 hover:text-white"
                                }`}
                            >
                                {meal.charAt(0).toUpperCase() + meal.slice(1)}
                                {mealCalories > 0 && (
                                    <span className="ml-2 text-xs">({mealCalories.toFixed(0)})</span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Meal Entries */}
                <div>
                    <div className="flex items-center justify-between mb-4 gap-2">
                        <h3 className="text-lg font-bold text-white capitalize">{activeMeal}</h3>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowTemplatesModal(true)}
                                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                            >
                                <ChefHat className="w-4 h-4" />
                                Use Template
                            </button>
                            {getMealEntries(activeMeal).length > 0 && (
                                <button
                                    onClick={() => router.push(`/recipes/create-from-logged?date=${selectedDate}&meal=${activeMeal}`)}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                                >
                                    <ChefHat className="w-4 h-4" />
                                    Create Recipe
                                </button>
                            )}
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                Add Food
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        {getMealEntries(activeMeal).length === 0 ? (
                            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-8 text-center border border-orange-500/20">
                                <UtensilsCrossed className="w-12 h-12 text-orange-400 mx-auto mb-4 opacity-50" />
                                <p className="text-gray-400">No foods logged for {activeMeal} yet.</p>
                                <button
                                    onClick={() => setShowAddModal(true)}
                                    className="mt-4 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm"
                                >
                                    Add Food
                                </button>
                            </div>
                        ) : (
                            getMealEntries(activeMeal).map((entry) => (
                                <EnhancedFoodEntry
                                    key={entry.id}
                                    entry={entry}
                                    onDelete={handleDeleteEntry}
                                    onUpdate={loadData}
                                />
                            ))
                        )}
                    </div>
                </div>
                    </>
                )}
            </div>

            {/* Add Food Modal */}
            <FoodSearchModal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                mealType={activeMeal}
                date={selectedDate}
                onFoodAdded={loadData}
            />

            {/* Meal Suggestions Modal */}
            <MealSuggestionsModal
                isOpen={showMealSuggestionsModal}
                onClose={() => setShowMealSuggestionsModal(false)}
                mealType={activeMeal}
                date={selectedDate}
                onMealAdded={loadData}
            />

            {/* Quick Add Templates Modal */}
            <QuickAddTemplatesModal
                isOpen={showTemplatesModal}
                onClose={() => setShowTemplatesModal(false)}
                mealType={activeMeal}
                date={selectedDate}
                onTemplatesAdded={loadData}
            />

            {/* Weight Log Modal */}
            {showWeightModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full border border-orange-500/20">
                        <h3 className="text-xl font-bold text-white mb-4">Log Weight</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Weight (kg)</label>
                                <input
                                    type="number"
                                    value={weightInput}
                                    onChange={(e) => setWeightInput(e.target.value)}
                                    placeholder="Enter weight"
                                    className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg border border-orange-500/20 focus:outline-none focus:border-orange-500"
                                    autoFocus
                                />
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowWeightModal(false)}
                                    className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleLogWeight}
                                    className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
                                >
                                    Log
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <BottomNav />
        </div>
    );
}
