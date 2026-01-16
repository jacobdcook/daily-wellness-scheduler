"use client";

import { useState, useEffect } from "react";
import { X, Plus, Trash2, Search } from "lucide-react";
import { MealTemplate, MealTemplateFood, searchFoods, getFoodDetails, FoodItem } from "@/utils/api";
import { useToast } from "@/context/ToastContext";
import { FoodSearchModalForTemplate } from "./FoodSearchModalForTemplate";

interface MealTemplateModalProps {
    isOpen: boolean;
    onClose: () => void;
    template?: MealTemplate | null;
    onSave: (template: Omit<MealTemplate, "id" | "total_nutrition" | "usage_count" | "last_used" | "created_by" | "created_at" | "updated_at">) => void;
}

export function MealTemplateModal({ isOpen, onClose, template, onSave }: MealTemplateModalProps) {
    const { showToast } = useToast();
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState<"breakfast" | "lunch" | "dinner" | "snacks">("breakfast");
    const [foods, setFoods] = useState<MealTemplateFood[]>([]);
    const [showFoodSearch, setShowFoodSearch] = useState(false);
    const [editingFoodIndex, setEditingFoodIndex] = useState<number | null>(null);

    useEffect(() => {
        if (template) {
            setName(template.name);
            setDescription(template.description);
            setCategory(template.category);
            setFoods(template.foods);
        } else {
            setName("");
            setDescription("");
            setCategory("breakfast");
            setFoods([]);
        }
    }, [template, isOpen]);

    const handleAddFood = (foodItem: FoodItem, quantity: number, unit: string) => {
        const nutrition = foodItem.nutrition || {
            calories: 0,
            protein: 0,
            carbs: 0,
            fats: 0,
        };

        const newFood: MealTemplateFood = {
            name: foodItem.name,
            quantity,
            unit,
            nutrition: {
                calories: nutrition.calories || 0,
                protein: nutrition.protein || 0,
                carbs: nutrition.carbs || 0,
                fats: nutrition.fats || 0,
            },
            food_id: foodItem.id,
        };

        if (editingFoodIndex !== null) {
            // Update existing food
            const updatedFoods = [...foods];
            updatedFoods[editingFoodIndex] = newFood;
            setFoods(updatedFoods);
            setEditingFoodIndex(null);
        } else {
            // Add new food
            setFoods([...foods, newFood]);
        }

        setShowFoodSearch(false);
    };

    const handleRemoveFood = (index: number) => {
        setFoods(foods.filter((_, i) => i !== index));
    };

    const handleEditFood = (index: number) => {
        setEditingFoodIndex(index);
        setShowFoodSearch(true);
    };

    const calculateTotalNutrition = () => {
        return foods.reduce(
            (total, food) => ({
                calories: total.calories + food.nutrition.calories * food.quantity,
                protein: total.protein + food.nutrition.protein * food.quantity,
                carbs: total.carbs + food.nutrition.carbs * food.quantity,
                fats: total.fats + food.nutrition.fats * food.quantity,
            }),
            { calories: 0, protein: 0, carbs: 0, fats: 0 }
        );
    };

    const handleSave = () => {
        if (!name.trim()) {
            showToast("Template name is required", "error");
            return;
        }

        if (foods.length === 0) {
            showToast("Template must contain at least one food", "error");
            return;
        }

        onSave({
            name: name.trim(),
            description: description.trim(),
            category,
            foods,
        });

        onClose();
    };

    if (!isOpen) return null;

    const totalNutrition = calculateTotalNutrition();

    return (
        <>
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                            {template ? "Edit Meal Template" : "Create Meal Template"}
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                            <X size={20} className="text-gray-500" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Template Name *
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g., My Usual Breakfast"
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Description
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Optional description..."
                                rows={2}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Category *
                            </label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value as any)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            >
                                <option value="breakfast">Breakfast</option>
                                <option value="lunch">Lunch</option>
                                <option value="dinner">Dinner</option>
                                <option value="snacks">Snacks</option>
                            </select>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Foods *
                                </label>
                                <button
                                    onClick={() => {
                                        setEditingFoodIndex(null);
                                        setShowFoodSearch(true);
                                    }}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors"
                                >
                                    <Plus size={16} />
                                    Add Food
                                </button>
                            </div>

                            {foods.length === 0 ? (
                                <div className="text-center py-8 text-gray-500 dark:text-gray-400 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                                    <p>No foods added yet</p>
                                    <p className="text-sm mt-1">Click "Add Food" to get started</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {foods.map((food, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                                        >
                                            <div className="flex-1">
                                                <div className="font-medium text-gray-900 dark:text-white">
                                                    {food.quantity} {food.unit} {food.name}
                                                </div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                                    {Math.round(food.nutrition.calories * food.quantity)} cal •{" "}
                                                    {Math.round(food.nutrition.protein * food.quantity)}g protein
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleEditFood(index)}
                                                    className="p-1.5 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                                    title="Edit food"
                                                >
                                                    <Search size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleRemoveFood(index)}
                                                    className="p-1.5 text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                                    title="Remove food"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {foods.length > 0 && (
                            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Total Nutrition
                                </h3>
                                <div className="grid grid-cols-4 gap-4 text-sm">
                                    <div>
                                        <div className="text-gray-500 dark:text-gray-400">Calories</div>
                                        <div className="font-semibold text-gray-900 dark:text-white">
                                            {Math.round(totalNutrition.calories)}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-gray-500 dark:text-gray-400">Protein</div>
                                        <div className="font-semibold text-gray-900 dark:text-white">
                                            {Math.round(totalNutrition.protein)}g
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-gray-500 dark:text-gray-400">Carbs</div>
                                        <div className="font-semibold text-gray-900 dark:text-white">
                                            {Math.round(totalNutrition.carbs)}g
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-gray-500 dark:text-gray-400">Fats</div>
                                        <div className="font-semibold text-gray-900 dark:text-white">
                                            {Math.round(totalNutrition.fats)}g
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-end gap-3 p-6 border-t dark:border-gray-700">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
                        >
                            {template ? "Save Changes" : "Create Template"}
                        </button>
                    </div>
                </div>
            </div>

            {showFoodSearch && (
                <FoodSearchModalForTemplate
                    isOpen={showFoodSearch}
                    onClose={() => {
                        setShowFoodSearch(false);
                        setEditingFoodIndex(null);
                    }}
                    mealType={category}
                    onFoodSelected={handleAddFood}
                />
            )}
        </>
    );
}

