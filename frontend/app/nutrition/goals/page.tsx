"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Target, ArrowLeft, Save, Calculator, Scale, Info, User, Activity, TrendingUp, AlertCircle, PieChart as PieChartIcon, HelpCircle, ChevronDown, ChevronUp } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { 
    getNutritionGoals,
    updateNutritionGoals,
    NutritionGoal,
    getWeightGoals,
    updateWeightGoals,
    WeightGoal,
    CalorieTarget
} from "@/utils/api";
import { BottomNav } from "@/components/BottomNav";
import { useToast } from "@/context/ToastContext";

export default function NutritionGoalsPage() {
    const router = useRouter();
    const { data: session } = useSession();
    const { showToast } = useToast();
    const [goals, setGoals] = useState<NutritionGoal | null>(null);
    const [weightGoals, setWeightGoals] = useState<WeightGoal | null>(null);
    const [calorieTarget, setCalorieTarget] = useState<CalorieTarget | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        daily_calories: 2000,
        protein_grams: null as number | null,
        carbs_grams: null as number | null,
        fats_grams: null as number | null,
        protein_percent: null as number | null,
        carbs_percent: null as number | null,
        fats_percent: null as number | null,
        activity_level: "light",
        goal: "maintain",
    });
    // Load unit preferences from localStorage (default to lbs/ft for USA)
    const [weightUnit, setWeightUnit] = useState<"kg" | "lb">(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("nutrition_weight_unit");
            return (saved === "lb" || saved === "kg") ? saved : "lb"; // Default to lbs for USA users
        }
        return "lb";
    });
    const [heightUnit, setHeightUnit] = useState<"cm" | "ft">(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("nutrition_height_unit");
            return (saved === "ft" || saved === "cm") ? saved : "ft"; // Default to ft/in for USA users
        }
        return "ft";
    });
    const [heightFeet, setHeightFeet] = useState<number>(5);
    const [heightInches, setHeightInches] = useState<number>(7);
    const [weightInputValue, setWeightInputValue] = useState<string>("");
    const [heightInputValue, setHeightInputValue] = useState<string>("");
    const [targetWeightInputValue, setTargetWeightInputValue] = useState<string>("");
    const [weeklyChangeInputValue, setWeeklyChangeInputValue] = useState<string>("");
    const [calculating, setCalculating] = useState(false);
    const [calculationResult, setCalculationResult] = useState<{
        bmr: number;
        tdee: number;
        activity_multiplier: number;
        goal_adjustment: number;
        macro_preset: string;
        calorie_goal: number;
        protein_grams: number;
        carbs_grams: number;
        fats_grams: number;
    } | null>(null);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [macroPreset, setMacroPreset] = useState<string>("balanced");
    const [proteinPreset, setProteinPreset] = useState<string>("1.0"); // g per lb
    const [useManualOverride, setUseManualOverride] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    const [weightFormData, setWeightFormData] = useState({
        goal_type: "maintain" as "lose" | "maintain" | "gain",
        current_weight_kg: 70.0,
        target_weight_kg: null as number | null,
        weekly_change_kg: null as number | null,
        activity_level: "light",
        gender: "male" as "male" | "female" | "other",
        age: 30,
        height_cm: 170.0,
    });

    useEffect(() => {
        if (session) {
            loadGoals();
        }
    }, [session]);

    const loadGoals = async () => {
        try {
            setLoading(true);
            const [nutritionData, weightData] = await Promise.all([
                getNutritionGoals().catch(() => null),
                getWeightGoals().catch(() => ({ goals: null, calorie_target: null }))
            ]);
            
            // Load nutrition goals first
            let savedCalories: number | null = null;
            if (nutritionData) {
                setGoals(nutritionData);
                savedCalories = nutritionData.daily_calories || null;

                // Map old activity level names to new ones for backward compatibility
                let activityLevel = nutritionData.activity_level || "light";
                if (activityLevel === "lightly_active") activityLevel = "light";
                else if (activityLevel === "moderately_active") activityLevel = "moderate";
                else if (activityLevel === "very_active") activityLevel = "active";
                else if (activityLevel === "extra_active") activityLevel = "very_active";

                setFormData({
                    daily_calories: nutritionData.daily_calories || 2000,
                    protein_grams: nutritionData.protein_grams || null,
                    carbs_grams: nutritionData.carbs_grams || null,
                    fats_grams: nutritionData.fats_grams || null,
                    protein_percent: nutritionData.protein_percent || null,
                    carbs_percent: nutritionData.carbs_percent || null,
                    fats_percent: nutritionData.fats_percent || null,
                    activity_level: activityLevel,
                    goal: nutritionData.goal || "maintain",
                });
            }
            
            if (weightData.goals) {
                setWeightGoals(weightData.goals);

                // Map old activity level names to new ones for backward compatibility
                let activityLevel = weightData.goals.activity_level || "light";
                if (activityLevel === "lightly_active") activityLevel = "light";
                else if (activityLevel === "moderately_active") activityLevel = "moderate";
                else if (activityLevel === "very_active") activityLevel = "active";
                else if (activityLevel === "extra_active") activityLevel = "very_active";

                setWeightFormData({
                    goal_type: (weightData.goals.goal_type as "lose" | "maintain" | "gain") || "maintain",
                    current_weight_kg: weightData.goals.current_weight_kg || 70.0,
                    target_weight_kg: weightData.goals.target_weight_kg || null,
                    weekly_change_kg: weightData.goals.weekly_change_kg || null,
                    activity_level: activityLevel,
                    gender: (weightData.goals.gender as "male" | "female" | "other") || "male",
                    age: weightData.goals.age || 30,
                    height_cm: weightData.goals.height_cm || 170.0,
                });
                
                // Update height feet/inches if using ft/in unit
                if (heightUnit === "ft" && weightData.goals.height_cm) {
                    const { feet, inches } = convertCmToFtIn(weightData.goals.height_cm);
                    setHeightFeet(feet);
                    setHeightInches(inches);
                }
            }
            
            if (weightData.calorie_target) {
                setCalorieTarget(weightData.calorie_target);
                // Only use calorie_target if no saved calories exist (don't overwrite user's saved value)
                if (!savedCalories && weightData.calorie_target.target_calories) {
                    setFormData(prev => ({
                        ...prev,
                        daily_calories: Math.round(weightData.calorie_target!.target_calories)
                    }));
                }
            }
        } catch (error) {
            console.error("Failed to load goals:", error);
            showToast("Failed to load goals", "error");
        } finally {
            setLoading(false);
        }
    };

    const calculateMacrosFromPercentages = () => {
        if (!formData.protein_percent || !formData.carbs_percent || !formData.fats_percent) {
            return;
        }

        const totalPercent = formData.protein_percent + formData.carbs_percent + formData.fats_percent;
        if (Math.abs(totalPercent - 100) > 0.1) {
            showToast("Macro percentages must add up to 100%", "error");
            return;
        }

        const calories = formData.daily_calories;
        const proteinGrams = Math.round((calories * formData.protein_percent / 100) / 4);
        const carbsGrams = Math.round((calories * formData.carbs_percent / 100) / 4);
        const fatsGrams = Math.round((calories * formData.fats_percent / 100) / 9);

        setFormData({
            ...formData,
            protein_grams: proteinGrams,
            carbs_grams: carbsGrams,
            fats_grams: fatsGrams,
        });
    };

    // Unit conversion helpers
    const convertLbsToKg = (lbs: number): number => lbs / 2.20462;
    const convertKgToLbs = (kg: number): number => kg * 2.20462;
    const convertFtInToCm = (feet: number, inches: number): number => (feet * 30.48) + (inches * 2.54);
    const convertCmToFtIn = (cm: number): { feet: number; inches: number } => {
        const totalInches = cm / 2.54;
        return {
            feet: Math.floor(totalInches / 12),
            inches: Math.round(totalInches % 12)
        };
    };

    // Validate profile form
    const validateProfileForm = (): boolean => {
        const errors: Record<string, string> = {};
        
        if (!weightFormData.age || weightFormData.age < 10 || weightFormData.age > 100) {
            errors.age = "Age must be between 10 and 100";
        }
        
        // Validate weight - always stored in kg internally
        if (!weightFormData.current_weight_kg || weightFormData.current_weight_kg <= 0) {
            errors.weight = "Weight must be a positive number";
        } else if (weightFormData.current_weight_kg < 20) {
            errors.weight = "Weight must be at least 20 kg (44 lbs)";
        } else if (weightFormData.current_weight_kg > 300) {
            errors.weight = "Weight must be less than 300 kg (660 lbs)";
        }
        
        if (!weightFormData.height_cm || weightFormData.height_cm <= 0) {
            errors.height = "Height must be a positive number";
        } else if (weightFormData.height_cm < 100) {
            errors.height = "Height must be at least 100 cm (3'3\")";
        } else if (weightFormData.height_cm > 250) {
            errors.height = "Height must be less than 250 cm (8'2\")";
        }
        
        if (!weightFormData.gender) {
            errors.gender = "Please select a gender";
        }
        
        if (!weightFormData.activity_level) {
            errors.activity_level = "Please select an activity level";
        }
        
        if (weightFormData.goal_type !== "maintain") {
            if (!weightFormData.weekly_change_kg || weightFormData.weekly_change_kg === 0) {
                errors.weekly_change = "Please specify a target rate for weight change";
            }
        }
        
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // Calculate goals from profile
    const calculateGoals = async () => {
        if (!validateProfileForm()) {
            showToast("Please fix the form errors", "error");
            return;
        }
        
        setCalculating(true);
        setCalculationResult(null);
        
        try {
            // Convert units to metric for backend
            let weightKg = weightFormData.current_weight_kg;
            if (weightUnit === "lb") {
                weightKg = convertLbsToKg(weightFormData.current_weight_kg);
            }
            
            let heightCm = weightFormData.height_cm;
            if (heightUnit === "ft") {
                heightCm = convertFtInToCm(heightFeet, heightInches);
            }
            
            // Convert weekly change to lbs/week for backend
            let weeklyChangeLbs = weightFormData.weekly_change_kg || 0;
            if (weightUnit === "kg") {
                weeklyChangeLbs = (weightFormData.weekly_change_kg || 0) * 2.20462;
            }
            
            const response = await updateNutritionGoals({
                age: weightFormData.age,
                weight_kg: weightKg,
                height_cm: heightCm,
                gender: weightFormData.gender,
                activity_level: weightFormData.activity_level,
                goal_type: weightFormData.goal_type,
                target_rate_lbs_per_week: weeklyChangeLbs,
                macro_preset: "balanced" // Default, will be configurable in next prompt
            });
            
            if (response.calculation) {
                setCalculationResult({
                    ...response.calculation,
                    calorie_goal: response.goals.daily_calories,
                    protein_grams: response.goals.protein_grams || 0,
                    carbs_grams: response.goals.carbs_grams || 0,
                    fats_grams: response.goals.fats_grams || 0
                });
                
                // Update form data with calculated values
                setFormData({
                    ...formData,
                    daily_calories: response.goals.daily_calories,
                    protein_grams: response.goals.protein_grams || null,
                    carbs_grams: response.goals.carbs_grams || null,
                    fats_grams: response.goals.fats_grams || null,
                    protein_percent: response.goals.protein_percent || null,
                    carbs_percent: response.goals.carbs_percent || null,
                    fats_percent: response.goals.fats_percent || null,
                    activity_level: weightFormData.activity_level,
                    goal: weightFormData.goal_type
                });
                
                // Set macro preset from calculation
                if (response.calculation.macro_preset) {
                    setMacroPreset(response.calculation.macro_preset);
                }
                
                showToast("Goals calculated successfully! 🎯", "success");
            } else {
                showToast("Calculation completed but no breakdown available", "info");
            }
        } catch (error: any) {
            console.error("Failed to calculate goals:", error);
            showToast(error.message || "Failed to calculate goals", "error");
        } finally {
            setCalculating(false);
        }
    };

    // Macro preset definitions
    const macroPresets = {
        balanced: { name: "Balanced", protein: 30, carbs: 40, fats: 30 },
        high_protein: { name: "High Protein", protein: 40, carbs: 30, fats: 30 },
        keto: { name: "Keto", protein: 25, carbs: 5, fats: 70 },
        low_carb: { name: "Low Carb", protein: 35, carbs: 20, fats: 45 },
        high_carb: { name: "High Carb", protein: 20, carbs: 60, fats: 20 },
        custom: { name: "Custom", protein: 0, carbs: 0, fats: 0 }
    };

    // Apply macro preset
    const applyMacroPreset = (preset: string) => {
        setMacroPreset(preset);
        
        if (preset === "custom") {
            // Don't auto-update, let user set custom values
            return;
        }
        
        const presetData = macroPresets[preset as keyof typeof macroPresets];
        if (!presetData) return;
        
        const calories = formData.daily_calories;
        const proteinCal = (calories * presetData.protein) / 100;
        const carbsCal = (calories * presetData.carbs) / 100;
        const fatsCal = (calories * presetData.fats) / 100;
        
        setFormData({
            ...formData,
            protein_percent: presetData.protein,
            carbs_percent: presetData.carbs,
            fats_percent: presetData.fats,
            protein_grams: Math.round(proteinCal / 4),
            carbs_grams: Math.round(carbsCal / 4),
            fats_grams: Math.round(fatsCal / 9)
        });
    };

    // Recalculate macros when preset changes or calories change
    useEffect(() => {
        if (macroPreset && macroPreset !== "custom" && formData.daily_calories > 0) {
            const presetData = macroPresets[macroPreset as keyof typeof macroPresets];
            if (presetData) {
                const calories = formData.daily_calories;
                const proteinCal = (calories * presetData.protein) / 100;
                const carbsCal = (calories * presetData.carbs) / 100;
                const fatsCal = (calories * presetData.fats) / 100;
                
                setFormData(prev => ({
                    ...prev,
                    protein_percent: presetData.protein,
                    carbs_percent: presetData.carbs,
                    fats_percent: presetData.fats,
                    protein_grams: Math.round(proteinCal / 4),
                    carbs_grams: Math.round(carbsCal / 4),
                    fats_grams: Math.round(fatsCal / 9)
                }));
            }
        }
    }, [formData.daily_calories, macroPreset]);

    const calculatePercentagesFromGrams = () => {
        if (!formData.protein_grams || !formData.carbs_grams || !formData.fats_grams) {
            return;
        }

        const calories = formData.daily_calories;
        const proteinCalories = formData.protein_grams * 4;
        const carbsCalories = formData.carbs_grams * 4;
        const fatsCalories = formData.fats_grams * 9;
        const totalCalories = proteinCalories + carbsCalories + fatsCalories;

        if (totalCalories > calories * 1.1) {
            showToast("Macro calories exceed daily calorie goal", "error");
            return;
        }

        setFormData({
            ...formData,
            protein_percent: Math.round((proteinCalories / calories) * 100),
            carbs_percent: Math.round((carbsCalories / calories) * 100),
            fats_percent: Math.round((fatsCalories / calories) * 100),
        });
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            // Convert null to undefined for API compatibility
            const nutritionGoalsData: Partial<NutritionGoal> & { macro_preset?: string } = {
                daily_calories: formData.daily_calories,
                protein_grams: formData.protein_grams ?? undefined,
                carbs_grams: formData.carbs_grams ?? undefined,
                fats_grams: formData.fats_grams ?? undefined,
                protein_percent: formData.protein_percent ?? undefined,
                carbs_percent: formData.carbs_percent ?? undefined,
                fats_percent: formData.fats_percent ?? undefined,
                activity_level: formData.activity_level,
                goal: formData.goal,
                macro_preset: macroPreset !== "custom" ? macroPreset : undefined,
            };
            const weightGoalsData: Partial<WeightGoal> = {
                goal_type: weightFormData.goal_type,
                current_weight_kg: weightFormData.current_weight_kg,
                target_weight_kg: weightFormData.target_weight_kg ?? undefined,
                weekly_change_kg: weightFormData.weekly_change_kg ?? undefined,
                activity_level: weightFormData.activity_level,
                gender: weightFormData.gender,
                age: weightFormData.age,
                height_cm: weightFormData.height_cm,
            };
            await Promise.all([
                updateNutritionGoals(nutritionGoalsData),
                updateWeightGoals(weightGoalsData)
            ]);
            showToast("Goals saved! 🎯", "success");
            await loadGoals();
        } catch (error: any) {
            console.error("Failed to save goals:", error);
            showToast(error.message || "Failed to save goals", "error");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-orange-900 to-slate-900 flex items-center justify-center">
                <div className="text-white text-xl">Loading goals...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-orange-900 to-slate-900 pb-20">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-slate-900/80 backdrop-blur-sm border-b border-orange-500/20">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2 hover:bg-orange-500/20 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-6 h-6 text-white" />
                    </button>
                    <Target className="w-8 h-8 text-orange-400" />
                    <h1 className="text-2xl font-bold text-white flex-1">Nutrition Goals</h1>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
                {/* User Profile Form */}
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-orange-500/20">
                    <div className="flex items-center gap-2 mb-4">
                        <User className="w-5 h-5 text-orange-400" />
                        <h2 className="text-lg font-bold text-white">Your Profile</h2>
                    </div>
                    <div className="space-y-4">
                        {/* Age */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Age <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="number"
                                min="10"
                                max="100"
                                value={weightFormData.age}
                                onChange={(e) => setWeightFormData({ ...weightFormData, age: parseInt(e.target.value) || 30 })}
                                className={`w-full px-4 py-2 bg-slate-700 text-white rounded-lg border ${
                                    formErrors.age ? "border-red-500" : "border-orange-500/20"
                                } focus:border-orange-500 focus:outline-none`}
                            />
                            {formErrors.age && (
                                <p className="text-xs text-red-400 mt-1">{formErrors.age}</p>
                            )}
                        </div>

                        {/* Gender */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Gender <span className="text-red-400">*</span>
                            </label>
                            <div className="flex gap-4">
                                {(["male", "female", "other"] as const).map((gender) => (
                                    <button
                                        key={gender}
                                        onClick={() => setWeightFormData({ ...weightFormData, gender })}
                                        className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                                            weightFormData.gender === gender
                                                ? "bg-orange-600 text-white"
                                                : "bg-slate-700 text-gray-300 hover:bg-slate-600"
                                        }`}
                                    >
                                        {gender.charAt(0).toUpperCase() + gender.slice(1)}
                                    </button>
                                ))}
                            </div>
                            {formErrors.gender && (
                                <p className="text-xs text-red-400 mt-1">{formErrors.gender}</p>
                            )}
                        </div>

                        {/* Weight */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium text-gray-300">
                                    Current Weight ({weightUnit}) <span className="text-red-400">*</span>
                                </label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            setWeightUnit("kg");
                                            localStorage.setItem("nutrition_weight_unit", "kg");
                                        }}
                                        className={`px-2 py-1 text-xs rounded ${
                                            weightUnit === "kg" ? "bg-orange-600 text-white" : "bg-slate-700 text-gray-300"
                                        }`}
                                    >
                                        kg
                                    </button>
                                    <button
                                        onClick={() => {
                                            setWeightUnit("lb");
                                            localStorage.setItem("nutrition_weight_unit", "lb");
                                        }}
                                        className={`px-2 py-1 text-xs rounded ${
                                            weightUnit === "lb" ? "bg-orange-600 text-white" : "bg-slate-700 text-gray-300"
                                        }`}
                                    >
                                        lbs
                                    </button>
                                </div>
                            </div>
                            <input
                                type="number"
                                min="30"
                                max={weightUnit === "kg" ? "300" : "660"}
                                step="0.1"
                                value={weightInputValue || (weightUnit === "kg" 
                                    ? weightFormData.current_weight_kg.toFixed(1)
                                    : convertKgToLbs(weightFormData.current_weight_kg).toFixed(1)
                                )}
                                onChange={(e) => {
                                    const inputValue = e.target.value;
                                    setWeightInputValue(inputValue);
                                    const value = parseFloat(inputValue);
                                    if (!isNaN(value) && value > 0) {
                                        const kgValue = weightUnit === "kg" ? value : convertLbsToKg(value);
                                        setWeightFormData({ ...weightFormData, current_weight_kg: kgValue });
                                    }
                                }}
                                onBlur={() => {
                                    setWeightInputValue("");
                                }}
                                className={`w-full px-4 py-2 bg-slate-700 text-white rounded-lg border ${
                                    formErrors.weight ? "border-red-500" : "border-orange-500/20"
                                } focus:border-orange-500 focus:outline-none`}
                            />
                            {formErrors.weight && (
                                <p className="text-xs text-red-400 mt-1">{formErrors.weight}</p>
                            )}
                        </div>

                        {/* Height */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium text-gray-300">
                                    Height ({heightUnit === "cm" ? "cm" : "ft/in"}) <span className="text-red-400">*</span>
                                </label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            if (heightUnit === "ft") {
                                                const cm = convertFtInToCm(heightFeet, heightInches);
                                                setWeightFormData({ ...weightFormData, height_cm: cm });
                                            }
                                            setHeightUnit("cm");
                                            localStorage.setItem("nutrition_height_unit", "cm");
                                        }}
                                        className={`px-2 py-1 text-xs rounded ${
                                            heightUnit === "cm" ? "bg-orange-600 text-white" : "bg-slate-700 text-gray-300"
                                        }`}
                                    >
                                        cm
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (heightUnit === "cm") {
                                                const { feet, inches } = convertCmToFtIn(weightFormData.height_cm);
                                                setHeightFeet(feet);
                                                setHeightInches(inches);
                                            }
                                            setHeightUnit("ft");
                                            localStorage.setItem("nutrition_height_unit", "ft");
                                        }}
                                        className={`px-2 py-1 text-xs rounded ${
                                            heightUnit === "ft" ? "bg-orange-600 text-white" : "bg-slate-700 text-gray-300"
                                        }`}
                                    >
                                        ft/in
                                    </button>
                                </div>
                            </div>
                            {heightUnit === "cm" ? (
                                <input
                                    type="number"
                                    min="100"
                                    max="250"
                                    step="0.1"
                                    value={heightInputValue || weightFormData.height_cm.toFixed(1)}
                                    onChange={(e) => {
                                        const inputValue = e.target.value;
                                        setHeightInputValue(inputValue);
                                        const value = parseFloat(inputValue);
                                        if (!isNaN(value) && value > 0) {
                                            setWeightFormData({ ...weightFormData, height_cm: value });
                                        }
                                    }}
                                    onBlur={() => {
                                        setHeightInputValue("");
                                    }}
                                    className={`w-full px-4 py-2 bg-slate-700 text-white rounded-lg border ${
                                        formErrors.height ? "border-red-500" : "border-orange-500/20"
                                    } focus:border-orange-500 focus:outline-none`}
                                />
                            ) : (
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        min="3"
                                        max="8"
                                        value={heightFeet}
                                        onChange={(e) => {
                                            const feet = parseInt(e.target.value) || 5;
                                            setHeightFeet(feet);
                                            const cm = convertFtInToCm(feet, heightInches);
                                            setWeightFormData({ ...weightFormData, height_cm: cm });
                                        }}
                                        className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg border border-orange-500/20 focus:border-orange-500 focus:outline-none"
                                        placeholder="ft"
                                    />
                                    <input
                                        type="number"
                                        min="0"
                                        max="11"
                                        value={heightInches}
                                        onChange={(e) => {
                                            const inches = parseInt(e.target.value) || 0;
                                            setHeightInches(inches);
                                            const cm = convertFtInToCm(heightFeet, inches);
                                            setWeightFormData({ ...weightFormData, height_cm: cm });
                                        }}
                                        className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg border border-orange-500/20 focus:border-orange-500 focus:outline-none"
                                        placeholder="in"
                                    />
                                </div>
                            )}
                            {formErrors.height && (
                                <p className="text-xs text-red-400 mt-1">{formErrors.height}</p>
                            )}
                        </div>

                        {/* Activity Level */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Activity Level <span className="text-red-400">*</span>
                                <Info className="w-4 h-4 inline ml-1 cursor-help" title="How active you are throughout the week" />
                            </label>
                            <select
                                value={weightFormData.activity_level}
                                onChange={(e) => {
                                    setWeightFormData({ ...weightFormData, activity_level: e.target.value });
                                    setFormData({ ...formData, activity_level: e.target.value });
                                }}
                                className={`w-full px-4 py-2 bg-slate-700 text-white rounded-lg border ${
                                    formErrors.activity_level ? "border-red-500" : "border-orange-500/20"
                                } focus:border-orange-500 focus:outline-none`}
                            >
                                <option value="sedentary">Sedentary (little/no exercise)</option>
                                <option value="light">Lightly Active (light exercise 1-3 days/week)</option>
                                <option value="moderate">Moderately Active (moderate exercise 3-5 days/week)</option>
                                <option value="active">Very Active (hard exercise 6-7 days/week)</option>
                                <option value="very_active">Extra Active (very hard exercise, physical job)</option>
                            </select>
                            {formErrors.activity_level && (
                                <p className="text-xs text-red-400 mt-1">{formErrors.activity_level}</p>
                            )}
                        </div>

                        {/* Goal Type */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Goal Type <span className="text-red-400">*</span>
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                {(["lose", "maintain", "gain"] as const).map((goal) => (
                                    <button
                                        key={goal}
                                        onClick={() => {
                                            setWeightFormData({ ...weightFormData, goal_type: goal });
                                            setFormData({ ...formData, goal: goal });
                                        }}
                                        className={`px-4 py-2 rounded-lg transition-colors ${
                                            weightFormData.goal_type === goal
                                                ? "bg-orange-600 text-white"
                                                : "bg-slate-700 text-gray-300 hover:bg-slate-600"
                                        }`}
                                    >
                                        {goal === "lose" ? "Lose Weight" : goal === "maintain" ? "Maintain" : "Gain Weight"}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Target Rate (if not maintain) */}
                        {weightFormData.goal_type !== "maintain" && (
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Target Rate ({weightUnit === "kg" ? "kg" : "lbs"}/week) <span className="text-red-400">*</span>
                                </label>
                                <select
                                    value={weightFormData.weekly_change_kg 
                                        ? (weightUnit === "kg" 
                                            ? weightFormData.weekly_change_kg.toFixed(1)
                                            : (weightFormData.weekly_change_kg * 2.20462).toFixed(1)
                                        )
                                        : ""
                                    }
                                    onChange={(e) => {
                                        const value = parseFloat(e.target.value) || 0;
                                        const kgValue = weightUnit === "kg" ? value : convertLbsToKg(value);
                                        setWeightFormData({ ...weightFormData, weekly_change_kg: kgValue });
                                    }}
                                    className={`w-full px-4 py-2 bg-slate-700 text-white rounded-lg border ${
                                        formErrors.weekly_change ? "border-red-500" : "border-orange-500/20"
                                    } focus:border-orange-500 focus:outline-none`}
                                >
                                    <option value="">Select rate...</option>
                                    {[0.5, 1, 1.5, 2].map(rate => (
                                        <option key={rate} value={rate}>
                                            {rate} {weightUnit === "kg" ? "kg" : "lbs"}/week
                                        </option>
                                    ))}
                                </select>
                                {formErrors.weekly_change && (
                                    <p className="text-xs text-red-400 mt-1">{formErrors.weekly_change}</p>
                                )}
                            </div>
                        )}

                        {/* Calculate Button */}
                        <button
                            onClick={calculateGoals}
                            disabled={calculating}
                            className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            <Calculator className="w-5 h-5" />
                            {calculating ? "Calculating..." : "Calculate My Goals"}
                        </button>
                    </div>
                </div>

                {/* Calculation Results */}
                {calculationResult && (
                    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-green-500/30">
                        <div className="flex items-center gap-2 mb-4">
                            <TrendingUp className="w-5 h-5 text-green-400" />
                            <h2 className="text-lg font-bold text-white">Calculation Results</h2>
                        </div>
                        <div className="space-y-4">
                            {/* BMR */}
                            <div className="bg-slate-900/50 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-gray-300">BMR (Basal Metabolic Rate)</span>
                                        <Info className="w-4 h-4 text-gray-400 cursor-help" title="Calories your body burns at rest, just to stay alive" />
                                    </div>
                                    <span className="text-lg font-bold text-white">{calculationResult.bmr.toFixed(0)} cal/day</span>
                                </div>
                                <p className="text-xs text-gray-400">The minimum calories needed for basic body functions</p>
                            </div>

                            {/* TDEE */}
                            <div className="bg-slate-900/50 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-gray-300">TDEE (Total Daily Energy Expenditure)</span>
                                        <Info className="w-4 h-4 text-gray-400 cursor-help" title="Total calories you burn per day including all activity" />
                                    </div>
                                    <span className="text-lg font-bold text-blue-400">{calculationResult.tdee.toFixed(0)} cal/day</span>
                                </div>
                                <p className="text-xs text-gray-400">
                                    BMR ({calculationResult.bmr.toFixed(0)}) × Activity Multiplier ({calculationResult.activity_multiplier})
                                </p>
                            </div>

                            {/* Goal Adjustment */}
                            {calculationResult.goal_adjustment !== 0 && (
                                <div className="bg-slate-900/50 rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium text-gray-300">Goal Adjustment</span>
                                        <span className={`text-lg font-bold ${calculationResult.goal_adjustment < 0 ? "text-red-400" : "text-green-400"}`}>
                                            {calculationResult.goal_adjustment > 0 ? "+" : ""}{calculationResult.goal_adjustment.toFixed(0)} cal/day
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-400">
                                        {Math.abs(calculationResult.goal_adjustment / 500)} lb/week {calculationResult.goal_adjustment < 0 ? "deficit" : "surplus"} for {weightFormData.goal_type === "lose" ? "weight loss" : "weight gain"}
                                    </p>
                                </div>
                            )}

                            {/* Final Calorie Target */}
                            <div className="bg-orange-500/20 border border-orange-500/50 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-bold text-white">Daily Calorie Target</span>
                                    <span className="text-2xl font-bold text-orange-400">{calculationResult.calorie_goal.toFixed(0)} cal/day</span>
                                </div>
                                <p className="text-xs text-gray-300">This is your recommended daily calorie intake</p>
                            </div>

                            {/* Macro Breakdown */}
                            <div className="bg-slate-900/50 rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-sm font-medium text-gray-300">Macro Targets</span>
                                    <Info className="w-4 h-4 text-gray-400 cursor-help" title="Recommended daily macronutrient intake" />
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <div className="text-xs text-gray-400 mb-1">Protein</div>
                                        <div className="text-lg font-bold text-blue-400">{calculationResult.protein_grams.toFixed(0)}g</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-gray-400 mb-1">Carbs</div>
                                        <div className="text-lg font-bold text-green-400">{calculationResult.carbs_grams.toFixed(0)}g</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-gray-400 mb-1">Fats</div>
                                        <div className="text-lg font-bold text-amber-400">{calculationResult.fats_grams.toFixed(0)}g</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Calorie Goal */}
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-orange-500/20">
                    <h2 className="text-lg font-bold text-white mb-4">Daily Calorie Goal</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Calories per day
                            </label>
                            <input
                                type="number"
                                min="1000"
                                max="5000"
                                step="50"
                                value={formData.daily_calories}
                                onChange={(e) => setFormData({ ...formData, daily_calories: parseInt(e.target.value) || 2000 })}
                                className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg border border-orange-500/20 focus:border-orange-500 focus:outline-none"
                            />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            {[1500, 2000, 2500].map(cal => (
                                <button
                                    key={cal}
                                    onClick={() => setFormData({ ...formData, daily_calories: cal })}
                                    className={`px-4 py-2 rounded-lg transition-colors ${
                                        formData.daily_calories === cal
                                            ? "bg-orange-600 text-white"
                                            : "bg-slate-700 text-gray-300 hover:bg-slate-600"
                                    }`}
                                >
                                    {cal}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Manual Override Toggle */}
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-orange-500/20">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-medium text-white">Calculation Mode</h3>
                            <p className="text-xs text-gray-400">Choose how to set your goals</p>
                        </div>
                        <button
                            onClick={() => setUseManualOverride(!useManualOverride)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                useManualOverride ? "bg-orange-600" : "bg-slate-700"
                            }`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    useManualOverride ? "translate-x-6" : "translate-x-1"
                                }`}
                            />
                        </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                        {useManualOverride ? "Manual Override: Enter goals directly" : "Auto-Calculate: Use profile to calculate goals"}
                    </p>
                </div>

                {/* Macro Goals */}
                {!useManualOverride && calculationResult && (
                    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-orange-500/20">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-white">Macro Goals</h2>
                        </div>
                        
                        {/* Protein Preset Selector */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-300 mb-3">
                                Protein Target
                                <Info className="w-4 h-4 inline ml-1 cursor-help" title="Recommended protein intake based on body weight" />
                            </label>
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {[
                                        { value: "0.8", label: "0.8g/lb", desc: "Minimum" },
                                        { value: "1.0", label: "1.0g/lb", desc: "Recommended" },
                                        { value: "1.2", label: "1.2g/lb", desc: "High" },
                                        { value: "custom", label: "Custom", desc: "Manual" }
                                    ].map((preset) => {
                                        // Calculate protein grams based on weight
                                        const weightInLbs = weightUnit === "kg" 
                                            ? convertKgToLbs(weightFormData.current_weight_kg)
                                            : weightFormData.current_weight_kg;
                                        const proteinGrams = preset.value !== "custom" 
                                            ? Math.round(parseFloat(preset.value) * weightInLbs)
                                            : formData.protein_grams || 0;
                                        
                                        return (
                                            <button
                                                key={preset.value}
                                                onClick={() => {
                                                    setProteinPreset(preset.value);
                                                    if (preset.value !== "custom") {
                                                        // Use current weight (or target weight if losing/gaining)
                                                        const weightToUse = weightFormData.target_weight_kg && weightFormData.goal_type !== "maintain"
                                                            ? (weightUnit === "kg" ? weightFormData.target_weight_kg : convertKgToLbs(weightFormData.target_weight_kg))
                                                            : (weightUnit === "kg" ? convertKgToLbs(weightFormData.current_weight_kg) : weightFormData.current_weight_kg);
                                                        
                                                        const proteinGrams = Math.round(parseFloat(preset.value) * weightToUse);
                                                        const proteinCal = proteinGrams * 4;
                                                        const remainingCal = formData.daily_calories - proteinCal;
                                                        
                                                        // Recalculate carbs and fats based on current macro preset percentages
                                                        const presetData = macroPresets[macroPreset as keyof typeof macroPresets];
                                                        if (presetData && presetData.carbs + presetData.fats > 0) {
                                                            const totalPercent = presetData.carbs + presetData.fats;
                                                            const carbsCal = (remainingCal * presetData.carbs) / totalPercent;
                                                            const fatsCal = (remainingCal * presetData.fats) / totalPercent;
                                                            
                                                            setFormData({
                                                                ...formData,
                                                                protein_grams: proteinGrams,
                                                                carbs_grams: Math.round(carbsCal / 4),
                                                                fats_grams: Math.round(fatsCal / 9),
                                                                protein_percent: Math.round((proteinCal / formData.daily_calories) * 100),
                                                                carbs_percent: Math.round((carbsCal / formData.daily_calories) * 100),
                                                                fats_percent: Math.round((fatsCal / formData.daily_calories) * 100)
                                                            });
                                                        } else {
                                                            // Default to balanced if no preset
                                                            const carbsCal = remainingCal * 0.4;
                                                            const fatsCal = remainingCal * 0.3;
                                                            setFormData({
                                                                ...formData,
                                                                protein_grams: proteinGrams,
                                                                carbs_grams: Math.round(carbsCal / 4),
                                                                fats_grams: Math.round(fatsCal / 9),
                                                                protein_percent: Math.round((proteinCal / formData.daily_calories) * 100),
                                                                carbs_percent: Math.round((carbsCal / formData.daily_calories) * 100),
                                                                fats_percent: Math.round((fatsCal / formData.daily_calories) * 100)
                                                            });
                                                        }
                                                    }
                                                }}
                                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                                    proteinPreset === preset.value
                                                        ? "bg-orange-600 text-white"
                                                        : "bg-slate-700 text-gray-300 hover:bg-slate-600"
                                                }`}
                                            >
                                                <div>{preset.label}</div>
                                                <div className="text-xs opacity-75 mt-1">
                                                    {preset.value !== "custom" ? `${proteinGrams}g` : preset.desc}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                                {proteinPreset !== "custom" && (
                                    <p className="text-xs text-gray-400">
                                        Based on {weightFormData.target_weight_kg && weightFormData.goal_type !== "maintain" ? "target" : "current"} weight ({(() => {
                                            const weightToUse = weightFormData.target_weight_kg && weightFormData.goal_type !== "maintain"
                                                ? (weightUnit === "kg" ? weightFormData.target_weight_kg : convertKgToLbs(weightFormData.target_weight_kg))
                                                : (weightUnit === "kg" ? convertKgToLbs(weightFormData.current_weight_kg) : weightFormData.current_weight_kg);
                                            return weightToUse.toFixed(1);
                                        })()} lbs)
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Macro Preset Selector */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-300 mb-3">
                                Macro Distribution (Carbs & Fats)
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {Object.entries(macroPresets).map(([key, preset]) => (
                                    <button
                                        key={key}
                                        onClick={() => {
                                            setMacroPreset(key);
                                            if (key !== "custom") {
                                                // Keep protein from preset, adjust carbs/fats
                                                const proteinCal = (formData.protein_grams || 0) * 4;
                                                const remainingCal = formData.daily_calories - proteinCal;
                                                const totalPercent = preset.carbs + preset.fats;
                                                
                                                if (totalPercent > 0) {
                                                    const carbsCal = (remainingCal * preset.carbs) / totalPercent;
                                                    const fatsCal = (remainingCal * preset.fats) / totalPercent;
                                                    
                                                    setFormData({
                                                        ...formData,
                                                        carbs_grams: Math.round(carbsCal / 4),
                                                        fats_grams: Math.round(fatsCal / 9),
                                                        carbs_percent: Math.round((carbsCal / formData.daily_calories) * 100),
                                                        fats_percent: Math.round((fatsCal / formData.daily_calories) * 100),
                                                        protein_percent: Math.round((proteinCal / formData.daily_calories) * 100)
                                                    });
                                                }
                                            }
                                        }}
                                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                            macroPreset === key
                                                ? "bg-orange-600 text-white"
                                                : "bg-slate-700 text-gray-300 hover:bg-slate-600"
                                        }`}
                                    >
                                        {preset.name}
                                        {key !== "custom" && (
                                            <div className="text-xs opacity-75 mt-1">
                                                {preset.protein}/{preset.carbs}/{preset.fats}
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Visual Macro Display */}
                        {formData.protein_percent && formData.carbs_percent && formData.fats_percent && (
                            <div className="mb-6">
                                <h3 className="text-sm font-medium text-gray-300 mb-3">Macro Distribution</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Pie Chart */}
                                    <div className="bg-slate-900/50 rounded-lg p-4">
                                        <ResponsiveContainer width="100%" height={200}>
                                            <PieChart>
                                                <Pie
                                                    data={[
                                                        { name: "Protein", value: formData.protein_percent, grams: formData.protein_grams || 0 },
                                                        { name: "Carbs", value: formData.carbs_percent, grams: formData.carbs_grams || 0 },
                                                        { name: "Fats", value: formData.fats_percent, grams: formData.fats_grams || 0 }
                                                    ]}
                                                    cx="50%"
                                                    cy="50%"
                                                    labelLine={false}
                                                    label={({ name, value }) => `${name}: ${value}%`}
                                                    outerRadius={70}
                                                    fill="#8884d8"
                                                    dataKey="value"
                                                >
                                                    <Cell fill="#3b82f6" /> {/* Protein - blue */}
                                                    <Cell fill="#10b981" /> {/* Carbs - green */}
                                                    <Cell fill="#f59e0b" /> {/* Fats - amber */}
                                                </Pie>
                                                <Tooltip 
                                                    contentStyle={{ 
                                                        backgroundColor: '#1f2937', 
                                                        border: '1px solid #374151',
                                                        borderRadius: '8px',
                                                        color: '#fff'
                                                    }}
                                                    formatter={(value: number, name: string, props: any) => {
                                                        return [`${value}% (${props.payload.grams}g)`, name];
                                                    }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    
                                    {/* Macro Breakdown */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                                            <div className="flex items-center gap-2">
                                                <div className="w-4 h-4 rounded bg-blue-500"></div>
                                                <span className="text-sm text-gray-300">Protein</span>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-white font-semibold">{formData.protein_grams || 0}g</div>
                                                <div className="text-xs text-gray-400">{formData.protein_percent}%</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                                            <div className="flex items-center gap-2">
                                                <div className="w-4 h-4 rounded bg-green-500"></div>
                                                <span className="text-sm text-gray-300">Carbs</span>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-white font-semibold">{formData.carbs_grams || 0}g</div>
                                                <div className="text-xs text-gray-400">{formData.carbs_percent}%</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                                            <div className="flex items-center gap-2">
                                                <div className="w-4 h-4 rounded bg-amber-500"></div>
                                                <span className="text-sm text-gray-300">Fats</span>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-white font-semibold">{formData.fats_grams || 0}g</div>
                                                <div className="text-xs text-gray-400">{formData.fats_percent}%</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Manual Macro Input (when override is enabled) */}
                {useManualOverride && (
                    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-orange-500/20">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-white">Macro Goals</h2>
                            <button
                                onClick={calculateMacrosFromPercentages}
                                className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center gap-1"
                                title="Calculate grams from percentages"
                            >
                                <Calculator className="w-3 h-3" />
                                Calc from %
                            </button>
                        </div>

                        {/* Protein Preset Selector (also in manual mode) */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-300 mb-3">
                                Protein Target
                                <Info className="w-4 h-4 inline ml-1 cursor-help" title="Recommended protein intake based on body weight" />
                            </label>
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {[
                                        { value: "0.8", label: "0.8g/lb", desc: "Minimum" },
                                        { value: "1.0", label: "1.0g/lb", desc: "Recommended" },
                                        { value: "1.2", label: "1.2g/lb", desc: "High" },
                                        { value: "custom", label: "Custom", desc: "Manual" }
                                    ].map((preset) => {
                                        const weightInLbs = weightUnit === "kg" 
                                            ? convertKgToLbs(weightFormData.current_weight_kg)
                                            : weightFormData.current_weight_kg;
                                        const proteinGrams = preset.value !== "custom" 
                                            ? Math.round(parseFloat(preset.value) * weightInLbs)
                                            : formData.protein_grams || 0;
                                        
                                        return (
                                            <button
                                                key={preset.value}
                                                onClick={() => {
                                                    setProteinPreset(preset.value);
                                                    if (preset.value !== "custom") {
                                                        // Use current weight (or target weight if losing/gaining)
                                                        const weightToUse = weightFormData.target_weight_kg && weightFormData.goal_type !== "maintain"
                                                            ? (weightUnit === "kg" ? weightFormData.target_weight_kg : convertKgToLbs(weightFormData.target_weight_kg))
                                                            : (weightUnit === "kg" ? convertKgToLbs(weightFormData.current_weight_kg) : weightFormData.current_weight_kg);
                                                        
                                                        const proteinGrams = Math.round(parseFloat(preset.value) * weightToUse);
                                                        setFormData(prev => {
                                                            const proteinCal = proteinGrams * 4;
                                                            const remainingCal = prev.daily_calories - proteinCal;
                                                            const proteinPercent = Math.round((proteinCal / prev.daily_calories) * 100);
                                                            
                                                            return {
                                                                ...prev,
                                                                protein_grams: proteinGrams,
                                                                protein_percent: proteinPercent
                                                            };
                                                        });
                                                        calculatePercentagesFromGrams();
                                                    }
                                                }}
                                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                                    proteinPreset === preset.value
                                                        ? "bg-orange-600 text-white"
                                                        : "bg-slate-700 text-gray-300 hover:bg-slate-600"
                                                }`}
                                            >
                                                <div>{preset.label}</div>
                                                <div className="text-xs opacity-75 mt-1">
                                                    {preset.value !== "custom" ? `${proteinGrams}g` : preset.desc}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                                {proteinPreset !== "custom" && (
                                    <p className="text-xs text-gray-400">
                                        Based on {weightFormData.target_weight_kg && weightFormData.goal_type !== "maintain" ? "target" : "current"} weight ({(() => {
                                            const weightToUse = weightFormData.target_weight_kg && weightFormData.goal_type !== "maintain"
                                                ? (weightUnit === "kg" ? weightFormData.target_weight_kg : convertKgToLbs(weightFormData.target_weight_kg))
                                                : (weightUnit === "kg" ? convertKgToLbs(weightFormData.current_weight_kg) : weightFormData.current_weight_kg);
                                            return weightToUse.toFixed(1);
                                        })()} lbs)
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Macro Preset Selector (also in manual mode) */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-300 mb-3">
                                Macro Distribution Preset
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {Object.entries(macroPresets).map(([key, preset]) => (
                                    <button
                                        key={key}
                                        onClick={() => applyMacroPreset(key)}
                                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                            macroPreset === key
                                                ? "bg-orange-600 text-white"
                                                : "bg-slate-700 text-gray-300 hover:bg-slate-600"
                                        }`}
                                    >
                                        {preset.name}
                                        {key !== "custom" && (
                                            <div className="text-xs opacity-75 mt-1">
                                                {preset.protein}/{preset.carbs}/{preset.fats}
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Visual Macro Display (also in manual mode) */}
                        {formData.protein_percent && formData.carbs_percent && formData.fats_percent && (
                            <div className="mb-6">
                                <h3 className="text-sm font-medium text-gray-300 mb-3">Macro Distribution</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Pie Chart */}
                                    <div className="bg-slate-900/50 rounded-lg p-4">
                                        <ResponsiveContainer width="100%" height={200}>
                                            <PieChart>
                                                <Pie
                                                    data={[
                                                        { name: "Protein", value: formData.protein_percent, grams: formData.protein_grams || 0 },
                                                        { name: "Carbs", value: formData.carbs_percent, grams: formData.carbs_grams || 0 },
                                                        { name: "Fats", value: formData.fats_percent, grams: formData.fats_grams || 0 }
                                                    ]}
                                                    cx="50%"
                                                    cy="50%"
                                                    labelLine={false}
                                                    label={({ name, value }) => `${name}: ${value}%`}
                                                    outerRadius={70}
                                                    fill="#8884d8"
                                                    dataKey="value"
                                                >
                                                    <Cell fill="#3b82f6" /> {/* Protein - blue */}
                                                    <Cell fill="#10b981" /> {/* Carbs - green */}
                                                    <Cell fill="#f59e0b" /> {/* Fats - amber */}
                                                </Pie>
                                                <Tooltip 
                                                    contentStyle={{ 
                                                        backgroundColor: '#1f2937', 
                                                        border: '1px solid #374151',
                                                        borderRadius: '8px',
                                                        color: '#fff'
                                                    }}
                                                    formatter={(value: number, name: string, props: any) => {
                                                        return [`${value}% (${props.payload.grams}g)`, name];
                                                    }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    
                                    {/* Macro Breakdown */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                                            <div className="flex items-center gap-2">
                                                <div className="w-4 h-4 rounded bg-blue-500"></div>
                                                <span className="text-sm text-gray-300">Protein</span>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-white font-semibold">{formData.protein_grams || 0}g</div>
                                                <div className="text-xs text-gray-400">{formData.protein_percent}%</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                                            <div className="flex items-center gap-2">
                                                <div className="w-4 h-4 rounded bg-green-500"></div>
                                                <span className="text-sm text-gray-300">Carbs</span>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-white font-semibold">{formData.carbs_grams || 0}g</div>
                                                <div className="text-xs text-gray-400">{formData.carbs_percent}%</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                                            <div className="flex items-center gap-2">
                                                <div className="w-4 h-4 rounded bg-amber-500"></div>
                                                <span className="text-sm text-gray-300">Fats</span>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-white font-semibold">{formData.fats_grams || 0}g</div>
                                                <div className="text-xs text-gray-400">{formData.fats_percent}%</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    
                    <div className="space-y-4">
                        {/* Protein */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Protein (grams)
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={formData.protein_grams || ""}
                                onChange={(e) => {
                                    const value = e.target.value ? parseInt(e.target.value) : null;
                                    setFormData({ ...formData, protein_grams: value });
                                    if (value) {
                                        setProteinPreset("custom"); // Switch to custom when manually editing
                                    }
                                }}
                                onBlur={calculatePercentagesFromGrams}
                                className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg border border-orange-500/20 focus:border-orange-500 focus:outline-none"
                                placeholder="Auto"
                            />
                            {formData.protein_percent !== null && (
                                <div className="text-xs text-gray-400 mt-1">
                                    {formData.protein_percent}% of calories
                                </div>
                            )}
                            {proteinPreset === "custom" && formData.protein_grams && (
                                <div className="text-xs text-blue-400 mt-1">
                                    ≈ {(formData.protein_grams / (weightUnit === "kg" ? convertKgToLbs(weightFormData.current_weight_kg) : weightFormData.current_weight_kg)).toFixed(2)}g per lb
                                </div>
                            )}
                        </div>

                        {/* Carbs */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Carbs (grams)
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={formData.carbs_grams || ""}
                                onChange={(e) => setFormData({ ...formData, carbs_grams: e.target.value ? parseInt(e.target.value) : null })}
                                onBlur={calculatePercentagesFromGrams}
                                className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg border border-orange-500/20 focus:border-orange-500 focus:outline-none"
                                placeholder="Auto"
                            />
                            {formData.carbs_percent !== null && (
                                <div className="text-xs text-gray-400 mt-1">
                                    {formData.carbs_percent}% of calories
                                </div>
                            )}
                        </div>

                        {/* Fats */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Fats (grams)
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={formData.fats_grams || ""}
                                onChange={(e) => setFormData({ ...formData, fats_grams: e.target.value ? parseInt(e.target.value) : null })}
                                onBlur={calculatePercentagesFromGrams}
                                className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg border border-orange-500/20 focus:border-orange-500 focus:outline-none"
                                placeholder="Auto"
                            />
                            {formData.fats_percent !== null && (
                                <div className="text-xs text-gray-400 mt-1">
                                    {formData.fats_percent}% of calories
                                </div>
                            )}
                        </div>

                        {/* Macro Percentages (Alternative Input) */}
                        <div className="pt-4 border-t border-slate-700">
                            <div className="text-sm font-medium text-gray-300 mb-3">Or set percentages:</div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">Protein %</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={formData.protein_percent || ""}
                                        onChange={(e) => setFormData({ ...formData, protein_percent: e.target.value ? parseInt(e.target.value) : null })}
                                        className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-orange-500/20 focus:border-orange-500 focus:outline-none text-sm"
                                        placeholder="%"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">Carbs %</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={formData.carbs_percent || ""}
                                        onChange={(e) => setFormData({ ...formData, carbs_percent: e.target.value ? parseInt(e.target.value) : null })}
                                        className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-orange-500/20 focus:border-orange-500 focus:outline-none text-sm"
                                        placeholder="%"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">Fats %</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={formData.fats_percent || ""}
                                        onChange={(e) => setFormData({ ...formData, fats_percent: e.target.value ? parseInt(e.target.value) : null })}
                                        className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-orange-500/20 focus:border-orange-500 focus:outline-none text-sm"
                                        placeholder="%"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                )}

                {/* Weight Goals section removed - redundant with Your Profile section above */}
                {/* All profile fields are in "Your Profile" section, and calculated targets are shown in "Calculation Results" */}

                {/* Help Section */}
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-orange-500/20 overflow-hidden">
                    <button
                        onClick={() => setShowHelp(!showHelp)}
                        className="w-full p-4 flex items-center justify-between hover:bg-slate-700/50 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <HelpCircle className="w-5 h-5 text-orange-400" />
                            <h3 className="text-lg font-bold text-white">How It Works</h3>
                        </div>
                        {showHelp ? (
                            <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                    </button>
                    {showHelp && (
                        <div className="p-6 space-y-4 border-t border-slate-700">
                            <div>
                                <h4 className="font-semibold text-white mb-2">BMR (Basal Metabolic Rate)</h4>
                                <p className="text-sm text-gray-300">
                                    The number of calories your body burns at rest, just to maintain basic body functions like breathing, 
                                    circulation, and cell production. Calculated using the Mifflin-St Jeor equation based on your age, 
                                    weight, height, and gender.
                                </p>
                            </div>
                            <div>
                                <h4 className="font-semibold text-white mb-2">TDEE (Total Daily Energy Expenditure)</h4>
                                <p className="text-sm text-gray-300">
                                    Your total daily calorie burn including all activity. Calculated by multiplying your BMR by an 
                                    activity multiplier based on your activity level:
                                </p>
                                <ul className="text-sm text-gray-400 mt-2 space-y-1 ml-4 list-disc">
                                    <li>Sedentary (1.2x): Little/no exercise</li>
                                    <li>Lightly Active (1.375x): Light exercise 1-3 days/week</li>
                                    <li>Moderately Active (1.55x): Moderate exercise 3-5 days/week</li>
                                    <li>Very Active (1.725x): Hard exercise 6-7 days/week</li>
                                    <li>Extra Active (1.9x): Very hard exercise, physical job</li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-white mb-2">Goal Adjustments</h4>
                                <p className="text-sm text-gray-300">
                                    To lose or gain weight, we adjust your TDEE:
                                </p>
                                <ul className="text-sm text-gray-400 mt-2 space-y-1 ml-4 list-disc">
                                    <li>Lose Weight: TDEE - (target_rate × 500 cal/day)</li>
                                    <li>Maintain Weight: TDEE (no adjustment)</li>
                                    <li>Gain Weight: TDEE + (target_rate × 500 cal/day)</li>
                                </ul>
                                <p className="text-xs text-gray-500 mt-2">
                                    Note: 1 lb of fat = ~3,500 calories, so 500 cal/day deficit = 1 lb/week weight loss
                                </p>
                            </div>
                            <div>
                                <h4 className="font-semibold text-white mb-2">Macro Presets</h4>
                                <p className="text-sm text-gray-300 mb-2">
                                    Choose a macro distribution that fits your goals:
                                </p>
                                <ul className="text-sm text-gray-400 space-y-1 ml-4 list-disc">
                                    <li><strong>Balanced (30/40/30):</strong> Standard distribution for general health</li>
                                    <li><strong>High Protein (40/30/30):</strong> Great for muscle building and satiety</li>
                                    <li><strong>Keto (25/5/70):</strong> Very low carb, high fat for ketosis</li>
                                    <li><strong>Low Carb (35/20/45):</strong> Reduced carbs, higher protein and fats</li>
                                    <li><strong>High Carb (20/60/20):</strong> Higher carbs for active individuals</li>
                                    <li><strong>Custom:</strong> Set your own percentages</li>
                                </ul>
                            </div>
                        </div>
                    )}
                </div>

                {/* Save Button */}
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    <Save className="w-5 h-5" />
                    {saving ? "Saving..." : "Save Goals"}
                </button>
            </div>

            <BottomNav />
        </div>
    );
}

