"use client";

import { useState, useEffect } from "react";
import { X, Search, Clock, ChefHat } from "lucide-react";
import { getRecentMealTemplates, getUserMealTemplates, useMealTemplate, MealTemplate, createNutritionEntry } from "@/utils/api";
import { useToast } from "@/context/ToastContext";
import { format } from "date-fns";

interface QuickAddTemplatesModalProps {
    isOpen: boolean;
    onClose: () => void;
    mealType: "breakfast" | "lunch" | "dinner" | "snack";
    date?: string;
    onTemplatesAdded?: () => void;
}

export function QuickAddTemplatesModal({
    isOpen,
    onClose,
    mealType,
    date,
    onTemplatesAdded,
}: QuickAddTemplatesModalProps) {
    const { showToast } = useToast();
    const [templates, setTemplates] = useState<MealTemplate[]>([]);
    const [recentTemplates, setRecentTemplates] = useState<MealTemplate[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string | null>(mealType === "snack" ? "snacks" : mealType);

    useEffect(() => {
        if (isOpen) {
            loadTemplates();
            loadRecentTemplates();
        }
    }, [isOpen, selectedCategory]);

    const loadTemplates = async () => {
        try {
            setLoading(true);
            const category = selectedCategory || undefined;
            const result = await getUserMealTemplates(category);
            setTemplates(result.templates);
        } catch (error) {
            console.error("Failed to load templates:", error);
            showToast("Failed to load templates", "error");
        } finally {
            setLoading(false);
        }
    };

    const loadRecentTemplates = async () => {
        try {
            const result = await getRecentMealTemplates(5);
            setRecentTemplates(result.templates);
        } catch (error) {
            console.error("Failed to load recent templates:", error);
        }
    };

    const handleUseTemplate = async (template: MealTemplate) => {
        try {
            const entryDate = date || format(new Date(), "yyyy-MM-dd");

            // Add all foods from template to the meal
            for (const food of template.foods) {
                await createNutritionEntry({
                    meal_type: mealType,
                    date: entryDate,
                    food_item: {
                        id: food.food_id || `template-${food.name}`,
                        name: food.name,
                        nutrition: food.nutrition,
                    },
                    quantity: food.quantity,
                    unit: food.unit,
                });
            }

            // Mark template as used
            await useMealTemplate(template.id);

            showToast(`Added "${template.name}" to ${mealType}!`, "success");
            onTemplatesAdded?.();
            onClose();
        } catch (error: any) {
            console.error("Failed to use template:", error);
            showToast(error.message || "Failed to add template", "error");
        }
    };

    const filteredTemplates = searchQuery
        ? templates.filter(
              (t) =>
                  t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  t.description.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : templates;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Use Meal Template</h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Add a saved meal template to {mealType}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Category Filter */}
                    <div className="flex gap-2 flex-wrap">
                        <button
                            onClick={() => setSelectedCategory(null)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                selectedCategory === null
                                    ? "bg-primary-600 text-white"
                                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                            }`}
                        >
                            All
                        </button>
                        {["breakfast", "lunch", "dinner", "snacks"].map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
                                    selectedCategory === cat
                                        ? "bg-primary-600 text-white"
                                        : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search templates..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                    </div>

                    {/* Recent Templates */}
                    {!searchQuery && recentTemplates.length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <Clock size={16} className="text-gray-500" />
                                <h3 className="font-medium text-gray-900 dark:text-white">Recently Used</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {recentTemplates.map((template) => (
                                    <TemplateCard
                                        key={template.id}
                                        template={template}
                                        onUse={() => handleUseTemplate(template)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* All Templates */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <ChefHat size={16} className="text-gray-500" />
                            <h3 className="font-medium text-gray-900 dark:text-white">
                                {searchQuery ? "Search Results" : "All Templates"}
                            </h3>
                        </div>

                        {loading ? (
                            <div className="text-center py-8 text-gray-500">Loading templates...</div>
                        ) : filteredTemplates.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                {searchQuery ? "No templates match your search" : "No templates found"}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {filteredTemplates.map((template) => (
                                    <TemplateCard
                                        key={template.id}
                                        template={template}
                                        onUse={() => handleUseTemplate(template)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function TemplateCard({ template, onUse }: { template: MealTemplate; onUse: () => void }) {
    const categoryColors = {
        breakfast: "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200",
        lunch: "bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200",
        dinner: "bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-200",
        snacks: "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200",
    };

    return (
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600 hover:border-primary-500 transition-colors">
            <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900 dark:text-white">{template.name}</h4>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${categoryColors[template.category]}`}>
                            {template.category}
                        </span>
                    </div>
                    {template.description && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">{template.description}</p>
                    )}
                </div>
            </div>

            <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                {template.foods.length} food{template.foods.length !== 1 ? "s" : ""} •{" "}
                {Math.round(template.total_nutrition.calories)} cal
            </div>

            <button
                onClick={onUse}
                className="w-full py-2 px-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors text-sm"
            >
                Use Template
            </button>
        </div>
    );
}

