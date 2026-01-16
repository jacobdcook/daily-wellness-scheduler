"use client";

import { useState } from "react";
import { Trash2, Edit2, Check, X, Plus, Minus } from "lucide-react";
import { FoodEntry, updateNutritionEntry } from "@/utils/api";
import { useToast } from "@/context/ToastContext";
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from "framer-motion";

interface EnhancedFoodEntryProps {
    entry: FoodEntry;
    onDelete: (entryId: string) => void;
    onUpdate: () => void;
}

export function EnhancedFoodEntry({ entry, onDelete, onUpdate }: EnhancedFoodEntryProps) {
    const { showToast } = useToast();
    const [isEditing, setIsEditing] = useState(false);
    const [quantity, setQuantity] = useState(entry.quantity.toString());
    const [unit, setUnit] = useState(entry.unit);
    const [saving, setSaving] = useState(false);
    
    // Swipe gesture for delete
    const x = useMotionValue(0);
    const opacity = useTransform(x, [-150, -80, 0], [1, 0.8, 1]);
    const deleteOpacity = useTransform(x, [-120, -60], [1, 0]);

    const handleQuickMultiply = async (multiplier: number) => {
        const newQuantity = entry.quantity * multiplier;
        await updateEntryQuantity(newQuantity, entry.unit);
    };

    const updateEntryQuantity = async (newQuantity: number, newUnit: string = entry.unit) => {
        if (newQuantity <= 0) {
            showToast("Quantity must be greater than 0", "error");
            return;
        }

        setSaving(true);
        try {
            // Calculate new nutrition values based on ratio
            const ratio = newQuantity / entry.quantity;
            const updatedNutrition = {
                calories: Math.round(entry.nutrition.calories * ratio),
                protein: Math.round(entry.nutrition.protein * ratio * 10) / 10,
                carbs: Math.round(entry.nutrition.carbs * ratio * 10) / 10,
                fats: Math.round(entry.nutrition.fats * ratio * 10) / 10,
                fiber: entry.nutrition.fiber ? Math.round(entry.nutrition.fiber * ratio * 10) / 10 : undefined,
                sugar: entry.nutrition.sugar ? Math.round(entry.nutrition.sugar * ratio * 10) / 10 : undefined,
                sodium: entry.nutrition.sodium ? Math.round(entry.nutrition.sodium * ratio * 10) / 10 : undefined,
            };

            // Update the entry via API
            await updateNutritionEntry(entry.id, {
                quantity: newQuantity,
                unit: newUnit,
                nutrition: updatedNutrition,
            });

            setQuantity(newQuantity.toString());
            setUnit(newUnit);
            setIsEditing(false);
            showToast("Entry updated", "success");
            onUpdate();
        } catch (error) {
            console.error("Failed to update entry:", error);
            showToast("Failed to update entry", "error");
        } finally {
            setSaving(false);
        }
    };

    const handleSave = async () => {
        const qty = parseFloat(quantity);
        if (isNaN(qty) || qty <= 0) {
            showToast("Please enter a valid quantity", "error");
            return;
        }
        await updateEntryQuantity(qty, unit);
    };

    const handleCancel = () => {
        setQuantity(entry.quantity.toString());
        setUnit(entry.unit);
        setIsEditing(false);
    };

    const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        // Swipe left to delete (threshold: -120px for better UX)
        if (info.offset.x < -120 && !isEditing) {
            // Small delay for visual feedback before delete
            setTimeout(() => {
                onDelete(entry.id);
            }, 100);
        } else {
            // Reset position if not enough swipe
            x.set(0);
        }
    };

    const availableUnits = ["serving", "gram", "oz", "cup", "tbsp", "tsp", "piece", "slice"];

    return (
        <div className="relative overflow-hidden rounded-xl">
            {/* Swipe Background - Delete Action */}
            <motion.div
                className="absolute inset-0 flex items-center justify-end pr-6 bg-red-500 z-0"
                style={{ opacity: deleteOpacity }}
            >
                <div className="flex items-center gap-2 text-white font-bold">
                    <Trash2 size={24} />
                    <span>Delete</span>
                </div>
            </motion.div>

            {/* Main Card */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10, x: -300 }}
                drag={isEditing ? false : "x"}
                dragConstraints={{ left: -150, right: 0 }}
                dragElastic={0.2}
                onDragEnd={handleDragEnd}
                style={{ x, opacity }}
                className="relative z-10 bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-orange-500/20 hover:border-orange-500/40 transition-colors"
            >
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-white font-semibold truncate">
                            {entry.food_item.name}
                        </span>
                        {entry.food_item.brand && (
                            <span className="text-xs text-gray-400 whitespace-nowrap">
                                {entry.food_item.brand}
                            </span>
                        )}
                    </div>

                    {!isEditing ? (
                        <>
                            <div className="flex items-center gap-3 mb-2">
                                <span className="text-sm text-gray-400">
                                    {entry.quantity} {entry.unit}
                                </span>
                                {/* Quick Multiplier Buttons */}
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => handleQuickMultiply(0.5)}
                                        disabled={saving}
                                        className="px-2 py-1 text-xs bg-slate-700/50 hover:bg-slate-700 text-gray-300 rounded transition-colors disabled:opacity-50"
                                        title="Half"
                                    >
                                        ½
                                    </button>
                                    <button
                                        onClick={() => handleQuickMultiply(2)}
                                        disabled={saving}
                                        className="px-2 py-1 text-xs bg-slate-700/50 hover:bg-slate-700 text-gray-300 rounded transition-colors disabled:opacity-50"
                                        title="Double"
                                    >
                                        2×
                                    </button>
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        disabled={saving}
                                        className="px-2 py-1 text-xs bg-slate-700/50 hover:bg-slate-700 text-gray-300 rounded transition-colors disabled:opacity-50 flex items-center gap-1"
                                        title="Edit"
                                    >
                                        <Edit2 size={12} />
                                    </button>
                                </div>
                            </div>
                            <div className="flex gap-4 text-sm flex-wrap">
                                <span className="text-orange-400">
                                    {entry.nutrition.calories.toFixed(0)} cal
                                </span>
                                <span className="text-purple-400">
                                    P: {entry.nutrition.protein.toFixed(1)}g
                                </span>
                                <span className="text-blue-400">
                                    C: {entry.nutrition.carbs.toFixed(1)}g
                                </span>
                                <span className="text-yellow-400">
                                    F: {entry.nutrition.fats.toFixed(1)}g
                                </span>
                            </div>
                        </>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <div className="flex-1">
                                    <label className="block text-xs text-gray-400 mb-1">Quantity</label>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => {
                                                const qty = parseFloat(quantity) || 1;
                                                setQuantity(Math.max(0.1, qty - 0.5).toString());
                                            }}
                                            className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded transition-colors"
                                        >
                                            <Minus size={14} className="text-gray-300" />
                                        </button>
                                        <input
                                            type="number"
                                            value={quantity}
                                            onChange={(e) => setQuantity(e.target.value)}
                                            step="0.1"
                                            min="0.1"
                                            className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                            autoFocus
                                        />
                                        <button
                                            onClick={() => {
                                                const qty = parseFloat(quantity) || 1;
                                                setQuantity((qty + 0.5).toString());
                                            }}
                                            className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded transition-colors"
                                        >
                                            <Plus size={14} className="text-gray-300" />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs text-gray-400 mb-1">Unit</label>
                                    <select
                                        value={unit}
                                        onChange={(e) => setUnit(e.target.value)}
                                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    >
                                        {availableUnits.map((u) => (
                                            <option key={u} value={u}>
                                                {u}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {saving ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Check size={16} />
                                            Save
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={handleCancel}
                                    disabled={saving}
                                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-gray-300 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                                >
                                    <X size={16} />
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {!isEditing && (
                    <button
                        onClick={() => onDelete(entry.id)}
                        className="p-2 hover:bg-red-500/20 rounded-lg transition-colors flex-shrink-0"
                        title="Delete"
                    >
                        <Trash2 className="w-5 h-5 text-red-400" />
                    </button>
                )}
            </div>
        </motion.div>
        </div>
    );
}

