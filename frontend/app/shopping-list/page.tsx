"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShoppingCart, Check, X, ArrowLeft } from "lucide-react";
import { generateShoppingList, ShoppingListItem } from "@/utils/api";
import { BottomNav } from "@/components/BottomNav";
import { useToast } from "@/context/ToastContext";

function ShoppingListContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { showToast } = useToast();
    const [items, setItems] = useState<ShoppingListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [groupedItems, setGroupedItems] = useState<Record<string, ShoppingListItem[]>>({});

    useEffect(() => {
        loadShoppingList();
    }, []);

    useEffect(() => {
        // Group items by category
        const grouped: Record<string, ShoppingListItem[]> = {};
        for (const item of items) {
            const category = item.category || "other";
            if (!grouped[category]) {
                grouped[category] = [];
            }
            grouped[category].push(item);
        }
        setGroupedItems(grouped);
    }, [items]);

    const loadShoppingList = async () => {
        setLoading(true);
        try {
            const weekStart = searchParams.get("plan");
            const recipeId = searchParams.get("recipe");
            
            const data = await generateShoppingList(undefined, weekStart || undefined);
            setItems(data.items || []);
        } catch (error) {
            console.error("Failed to load shopping list:", error);
            showToast("Failed to load shopping list", "error");
        } finally {
            setLoading(false);
        }
    };

    const toggleItem = (index: number, category: string) => {
        const newItems = [...items];
        const itemIndex = items.findIndex((item, idx) => {
            let count = 0;
            for (let i = 0; i < items.length; i++) {
                if (items[i].category === category) {
                    if (count === index) {
                        return i === idx;
                    }
                    count++;
                }
            }
            return false;
        });
        
        if (itemIndex !== -1) {
            newItems[itemIndex].checked = !newItems[itemIndex].checked;
            setItems(newItems);
        }
    };

    const categoryOrder = ["produce", "dairy", "meat", "pantry", "frozen", "other"];
    const categoryNames: Record<string, string> = {
        produce: "Produce",
        dairy: "Dairy",
        meat: "Meat & Seafood",
        pantry: "Pantry",
        frozen: "Frozen",
        other: "Other",
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800 pb-20">
                <div className="max-w-4xl mx-auto px-4 py-6">
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-400"></div>
                        <p className="mt-4 text-gray-400">Loading shopping list...</p>
                    </div>
                </div>
                <BottomNav />
            </div>
        );
    }

    const totalItems = items.length;
    const checkedItems = items.filter(item => item.checked).length;

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800 pb-20">
            <div className="max-w-4xl mx-auto px-4 py-6">
                <button
                    onClick={() => router.back()}
                    className="text-gray-400 hover:text-white transition-colors mb-4"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>

                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <ShoppingCart className="w-8 h-8 text-orange-400" />
                        <div>
                            <h1 className="text-3xl font-bold text-white">Shopping List</h1>
                            <p className="text-sm text-gray-400">
                                {checkedItems} of {totalItems} items
                            </p>
                        </div>
                    </div>
                </div>

                {/* Progress Bar */}
                {totalItems > 0 && (
                    <div className="mb-6">
                        <div className="w-full bg-gray-700 rounded-full h-3">
                            <div
                                className="bg-gradient-to-r from-orange-500 to-orange-600 h-3 rounded-full transition-all"
                                style={{ width: `${(checkedItems / totalItems) * 100}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Shopping List by Category */}
                {items.length === 0 ? (
                    <div className="bg-gray-800/50 rounded-lg p-12 border border-gray-700 text-center">
                        <ShoppingCart className="w-16 h-16 text-gray-600 mx-auto mb-4 opacity-50" />
                        <p className="text-gray-400">No items in shopping list</p>
                        <p className="text-sm text-gray-500 mt-2">Add recipes to your meal plan to generate a shopping list</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {categoryOrder.map(category => {
                            const categoryItems = groupedItems[category] || [];
                            if (categoryItems.length === 0) return null;

                            return (
                                <div key={category} className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
                                    <h2 className="text-xl font-semibold text-white mb-4">
                                        {categoryNames[category] || category}
                                    </h2>
                                    <div className="space-y-2">
                                        {categoryItems.map((item, idx) => {
                                            const globalIndex = items.findIndex(i => i === item);
                                            return (
                                                <div
                                                    key={globalIndex}
                                                    className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                                                        item.checked
                                                            ? "bg-gray-900/50 opacity-60"
                                                            : "bg-gray-900/30 hover:bg-gray-900/50"
                                                    }`}
                                                >
                                                    <button
                                                        onClick={() => toggleItem(idx, category)}
                                                        className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                                                            item.checked
                                                                ? "bg-orange-500 border-orange-500"
                                                                : "border-gray-600 hover:border-orange-500"
                                                        }`}
                                                    >
                                                        {item.checked && <Check className="w-4 h-4 text-white" />}
                                                    </button>
                                                    <div className="flex-1">
                                                        <div className={`font-medium ${item.checked ? "line-through text-gray-500" : "text-white"}`}>
                                                            {item.name}
                                                        </div>
                                                        <div className="text-sm text-gray-400">
                                                            {item.quantity} {item.unit}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
            <BottomNav />
        </div>
    );
}

export default function ShoppingListPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800 pb-20">
                <div className="max-w-4xl mx-auto px-4 py-6">
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-400"></div>
                        <p className="mt-4 text-gray-400">Loading shopping list...</p>
                    </div>
                </div>
                <BottomNav />
            </div>
        }>
            <ShoppingListContent />
        </Suspense>
    );
}

