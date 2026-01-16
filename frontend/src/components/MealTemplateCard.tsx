"use client";

import { useState } from "react";
import { Edit2, Trash2, Copy, Clock, UtensilsCrossed } from "lucide-react";
import { MealTemplate } from "@/utils/api";

interface MealTemplateCardProps {
    template: MealTemplate;
    onEdit: (template: MealTemplate) => void;
    onDelete: (templateId: string) => void;
    onDuplicate: (template: MealTemplate) => void;
    onUse: (template: MealTemplate) => void;
}

export function MealTemplateCard({ template, onEdit, onDelete, onDuplicate, onUse }: MealTemplateCardProps) {
    const [showConfirmDelete, setShowConfirmDelete] = useState(false);

    const handleDelete = () => {
        if (showConfirmDelete) {
            onDelete(template.id);
            setShowConfirmDelete(false);
        } else {
            setShowConfirmDelete(true);
            setTimeout(() => setShowConfirmDelete(false), 3000);
        }
    };

    const categoryColors = {
        breakfast: "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200",
        lunch: "bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200",
        dinner: "bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-200",
        snacks: "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200",
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{template.name}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${categoryColors[template.category]}`}>
                            {template.category}
                        </span>
                    </div>
                    {template.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{template.description}</p>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => onEdit(template)}
                        className="p-1.5 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        title="Edit template"
                    >
                        <Edit2 size={16} />
                    </button>
                    <button
                        onClick={() => onDuplicate(template)}
                        className="p-1.5 text-gray-500 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                        title="Duplicate template"
                    >
                        <Copy size={16} />
                    </button>
                    <button
                        onClick={handleDelete}
                        className={`p-1.5 transition-colors ${
                            showConfirmDelete
                                ? "text-red-600 dark:text-red-400"
                                : "text-gray-500 hover:text-red-600 dark:hover:text-red-400"
                        }`}
                        title={showConfirmDelete ? "Click again to confirm" : "Delete template"}
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            <div className="mb-3">
                <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-2">
                    <UtensilsCrossed size={12} />
                    <span>{template.foods.length} food{template.foods.length !== 1 ? "s" : ""}</span>
                    {template.usage_count > 0 && (
                        <>
                            <span>•</span>
                            <Clock size={12} />
                            <span>Used {template.usage_count} time{template.usage_count !== 1 ? "s" : ""}</span>
                        </>
                    )}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                    {template.foods.slice(0, 3).map((food, idx) => (
                        <div key={idx} className="truncate">
                            {food.quantity} {food.unit} {food.name}
                        </div>
                    ))}
                    {template.foods.length > 3 && (
                        <div className="text-gray-500">+{template.foods.length - 3} more</div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-3 text-xs">
                <div>
                    <div className="text-gray-500 dark:text-gray-400">Calories</div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                        {Math.round(template.total_nutrition.calories)}
                    </div>
                </div>
                <div>
                    <div className="text-gray-500 dark:text-gray-400">Protein</div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                        {Math.round(template.total_nutrition.protein)}g
                    </div>
                </div>
                <div>
                    <div className="text-gray-500 dark:text-gray-400">Carbs</div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                        {Math.round(template.total_nutrition.carbs)}g
                    </div>
                </div>
                <div>
                    <div className="text-gray-500 dark:text-gray-400">Fats</div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                        {Math.round(template.total_nutrition.fats)}g
                    </div>
                </div>
            </div>

            <button
                onClick={() => onUse(template)}
                className="w-full py-2 px-4 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors text-sm"
            >
                Use Template
            </button>
        </div>
    );
}

