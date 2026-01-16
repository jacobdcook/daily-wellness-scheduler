"use client";

import { useState, useEffect } from "react";
import { UserSettings, InventoryItem, Schedule } from "@/types";
import { Plus, Minus, AlertTriangle, ShoppingCart, Plane, RefreshCw, DollarSign, Link2 } from "lucide-react";
import { saveSettings } from "@/utils/api";
import { addDays, format } from "date-fns";
import { clsx } from "clsx";

interface InventoryViewProps {
    settings: UserSettings;
    schedule: Schedule | null;
    onUpdate: (newSettings: UserSettings) => void;
    onOpenTravelPlanner: () => void;
}

export function InventoryView({ settings, schedule, onUpdate, onOpenTravelPlanner }: InventoryViewProps) {
    const ensureShape = (item?: InventoryItem): InventoryItem => ({
        current_stock: 0,
        low_stock_threshold: 10,
        unit: "units",
        refill_size: 30,
        average_daily_usage: 0,
        unit_cost: 0,
        preferred_vendor: "",
        auto_refill: false,
        ...item,
    });

    const calculateScheduleAverage = (itemName: string): number => {
        if (!schedule) return 0;
        const days = Object.keys(schedule).length || 1;
        let total = 0;
        Object.values(schedule).forEach((entries) => {
            total += entries.filter(entry => entry.item.name === itemName).length;
        });
        return Number((total / days).toFixed(2));
    };

    const initialInventory = () => {
        const inventory = { ...(settings.inventory || {}) };

        if (schedule) {
            Object.values(schedule).flat().forEach(item => {
                if (!inventory[item.item.name]) {
                    inventory[item.item.name] = ensureShape();
                } else {
                    inventory[item.item.name] = ensureShape(inventory[item.item.name]);
                }
            });
        }
        return inventory;
    };

    const [localInventory, setLocalInventory] = useState<Record<string, InventoryItem>>(initialInventory);

    // Sync with props when they change
    useEffect(() => {
        const inventory = { ...(settings.inventory || {}) };
        Object.keys(inventory).forEach((key) => {
            inventory[key] = ensureShape(inventory[key]);
        });
        
        if (schedule) {
            Object.values(schedule).flat().forEach(item => {
                const itemName = item.item.name;
                if (!inventory[itemName]) {
                    inventory[itemName] = ensureShape();
                }
            });
        }
        
        setLocalInventory(inventory);
    }, [schedule, settings.inventory]);

    const updateInventoryItem = (name: string, updates: Partial<InventoryItem>) => {
        setLocalInventory(prev => ({
            ...prev,
            [name]: {
                ...ensureShape(prev[name]),
                ...updates
            }
        }));
    };

    const updateStock = (name: string, delta: number) => {
        const current = ensureShape(localInventory[name]);
        const newStock = Math.max(0, current.current_stock + delta);
        updateInventoryItem(name, { current_stock: newStock });
    };

    const handleRefill = (name: string) => {
        const item = ensureShape(localInventory[name]);
        updateStock(name, item.refill_size || 30);
        updateInventoryItem(name, { last_restocked: new Date().toISOString() });
    };

    const handleSmartAverage = (name: string) => {
        const smart = calculateScheduleAverage(name);
        if (smart > 0) {
            updateInventoryItem(name, { average_daily_usage: smart });
        }
    };

    const handleSave = async () => {
        const newSettings = { ...settings, inventory: localInventory };
        try {
            await saveSettings(newSettings);
            onUpdate(newSettings);
            alert("Inventory saved successfully!");
        } catch (error) {
            alert("Failed to save inventory");
        }
    };

    // Get list of all items from inventory
    const inventoryItems = Object.keys(localInventory).sort();

    return (
        <div className="pb-24 px-4">
            <div className="flex items-center justify-between mb-6 pt-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <ShoppingCart size={28} className="text-primary-600" />
                    Inventory
                </h2>
                <button
                    onClick={onOpenTravelPlanner}
                    className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-200 rounded-lg text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/50 flex items-center gap-2 transition-colors"
                >
                    <Plane size={16} />
                    Plan Trip
                </button>
            </div>

            <div className="space-y-4">
                {inventoryItems.length === 0 ? (
                    <div className="text-center text-gray-500 py-12 card-surface rounded-xl">
                        <p className="mb-2">No items found in schedule.</p>
                        <p className="text-xs text-gray-400">Generate a schedule first to track inventory.</p>
                    </div>
                ) : null}

                {inventoryItems.map(name => {
                    const item = ensureShape(localInventory[name]);
                    const isLow = item.current_stock <= item.low_stock_threshold;
                    const dailyUsage = item.average_daily_usage && item.average_daily_usage > 0 ? item.average_daily_usage : calculateScheduleAverage(name);
                    const daysRemaining = dailyUsage > 0 ? Math.floor(item.current_stock / dailyUsage) : null;
                    const unitCost = item.unit_cost ?? 0;
                    const monthlyCost = dailyUsage > 0 && unitCost > 0 ? dailyUsage * 30 * unitCost : 0;
                    const reorderDate = daysRemaining !== null ? format(addDays(new Date(), Math.max(0, daysRemaining - 2)), "MMM d") : null;

                    return (
                        <div
                            key={name}
                            className={clsx(
                                "card-surface border space-y-3 p-4 rounded-xl shadow-sm",
                                isLow ? "border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10" : "border-gray-200 dark:border-gray-700"
                            )}
                        >
                            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                <div>
                                    <div className="font-medium text-gray-900 dark:text-white flex items-center gap-2 text-lg">
                                        {name}
                                        {isLow && (
                                            <span className="text-xs bg-yellow-200 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                                <AlertTriangle size={10} /> LOW
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 flex flex-wrap gap-3 mt-1">
                                        <span>Threshold {item.low_stock_threshold} {item.unit}</span>
                                        {daysRemaining !== null && <span>~{daysRemaining} days remaining</span>}
                                        {monthlyCost > 0 && <span>${monthlyCost.toFixed(2)}/month</span>}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 mt-2 md:mt-0">
                                    <button
                                        onClick={() => handleRefill(name)}
                                        className="p-1.5 mr-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-md transition-colors flex items-center gap-1 text-xs font-medium border border-transparent hover:border-green-200 dark:hover:border-green-900/40"
                                        title={`Refill (+${item.refill_size || 30})`}
                                    >
                                        <RefreshCw size={14} />
                                        Refill
                                    </button>
                                    <button
                                        onClick={() => updateStock(name, -1)}
                                        className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-500 dark:text-gray-300 transition-colors border dark:border-gray-700"
                                    >
                                        <Minus size={18} />
                                    </button>
                                    <input
                                        type="number"
                                        value={item.current_stock}
                                        onChange={(e) => {
                                            const val = Math.max(0, parseInt(e.target.value) || 0);
                                            updateInventoryItem(name, { current_stock: val });
                                        }}
                                        className="w-20 text-center font-mono font-bold text-xl border rounded-lg py-1 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white dark:bg-gray-900 dark:border-gray-700 dark:text-white"
                                    />
                                    <button
                                        onClick={() => updateStock(name, 1)}
                                        className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-500 dark:text-gray-300 transition-colors border dark:border-gray-700"
                                    >
                                        <Plus size={18} />
                                    </button>
                                </div>
                            </div>

                            <div className="grid sm:grid-cols-2 gap-3 text-sm bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
                                <label className="flex flex-col gap-1 text-gray-600 dark:text-gray-300">
                                    <span className="flex items-center gap-1 text-xs uppercase tracking-wide">
                                        <DollarSign size={12} />
                                        Unit cost
                                    </span>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={item.unit_cost ?? ""}
                                        onChange={(e) => updateInventoryItem(name, { unit_cost: parseFloat(e.target.value) || 0 })}
                                        className="px-3 py-2 border rounded-md focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-900 dark:border-gray-700"
                                    />
                                </label>
                                <label className="flex flex-col gap-1 text-gray-600 dark:text-gray-300">
                                    <span className="flex items-center gap-1 text-xs uppercase tracking-wide">
                                        Avg per day
                                    </span>
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.1"
                                            value={item.average_daily_usage ?? ""}
                                            onChange={(e) => updateInventoryItem(name, { average_daily_usage: parseFloat(e.target.value) || 0 })}
                                            className="flex-1 px-3 py-2 border rounded-md focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-900 dark:border-gray-700"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => handleSmartAverage(name)}
                                            className="px-3 py-2 text-xs border rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 bg-white dark:bg-gray-900"
                                        >
                                            Smart
                                        </button>
                                    </div>
                                </label>
                            </div>

                            <div className="grid sm:grid-cols-2 gap-3 text-sm">
                                <label className="flex flex-col gap-1 text-gray-600 dark:text-gray-300">
                                    <span className="flex items-center gap-1 text-xs uppercase tracking-wide">
                                        <Link2 size={12} />
                                        Vendor link
                                    </span>
                                    <input
                                        type="text"
                                        value={item.preferred_vendor || ""}
                                        onChange={(e) => updateInventoryItem(name, { preferred_vendor: e.target.value })}
                                        placeholder="https://..."
                                        className="px-3 py-2 border rounded-md focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-900 dark:border-gray-700"
                                    />
                                </label>
                                <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 mt-5">
                                    <input
                                        type="checkbox"
                                        checked={item.auto_refill || false}
                                        onChange={(e) => updateInventoryItem(name, { auto_refill: e.target.checked })}
                                        className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                                    />
                                    Auto refill reminder
                                    {item.auto_refill && reorderDate && (
                                        <span className="text-[11px] text-gray-500 dark:text-gray-400 ml-1">- Target {reorderDate}</span>
                                    )}
                                </label>
                            </div>

                            {daysRemaining !== null && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
                                    <span>Refill suggestion: order by <strong>{reorderDate}</strong></span>
                                    {item.preferred_vendor && (
                                        <a href={item.preferred_vendor} target="_blank" rel="noreferrer" className="text-primary-600 dark:text-primary-300 underline text-xs">
                                            Open vendor
                                        </a>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="fixed bottom-[70px] right-4 z-40">
                <button 
                    onClick={handleSave} 
                    className="shadow-lg px-6 py-3 bg-primary-600 text-white rounded-full font-bold hover:bg-primary-700 transition-all flex items-center gap-2"
                >
                    Save Inventory
                </button>
            </div>
        </div>
    );
}

