"use client";

import { useState, useMemo } from "react";
import { UserSettings, Schedule } from "@/types";
import { X, Plane, Briefcase, Check } from "lucide-react";
import { saveSettings } from "@/utils/api";

interface TravelPlannerModalProps {
    isOpen: boolean;
    onClose: () => void;
    settings: UserSettings;
    schedule: Schedule | null;
    onUpdate: (newSettings: UserSettings) => void;
}

export function TravelPlannerModal({ isOpen, onClose, settings, schedule, onUpdate }: TravelPlannerModalProps) {
    const [days, setDays] = useState(3);

    const packingList = useMemo(() => {
        if (!schedule) return {};

        const list: Record<string, number> = {};
        // Use today's date to find scheduled items
        const todayStr = new Date().toISOString().split('T')[0];
        // Fallback to finding ANY day if today has no items (e.g. freshly generated)
        const dateKey = Object.keys(schedule).find(d => schedule[d].length > 0) || todayStr;
        const dailyItems = schedule[dateKey] || [];

        // Find all unique items and their daily frequency
        const dailyCounts: Record<string, number> = {};
        dailyItems.forEach(item => {
            dailyCounts[item.item.name] = (dailyCounts[item.item.name] || 0) + 1;
        });

        Object.entries(dailyCounts).forEach(([name, count]) => {
            list[name] = count * days;
        });

        return list;
    }, [schedule, days]);

    const handleDispense = async () => {
        if (!confirm(`This will deduct items from your inventory for a ${days}-day trip. Continue?`)) return;

        const newInventory = { ...settings.inventory };

        Object.entries(packingList).forEach(([name, count]) => {
            if (newInventory[name]) {
                newInventory[name] = {
                    ...newInventory[name],
                    current_stock: Math.max(0, newInventory[name].current_stock - count)
                };
            }
        });

        const newSettings = { ...settings, inventory: newInventory };
        try {
            await saveSettings(newSettings);
            onUpdate(newSettings);
            onClose();
            alert("Items dispensed! Have a safe trip ✈️");
        } catch {
            alert("Failed to dispense items");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[10050] overflow-hidden flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />

            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <Plane size={24} className="text-blue-600" />
                        Travel Planner
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Trip Duration</label>
                        <div className="flex gap-2">
                            {[3, 5, 7, 14].map(d => (
                                <button
                                    key={d}
                                    onClick={() => setDays(d)}
                                    className={`flex-1 py-2 rounded-lg border ${days === d ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold' : 'border-gray-200 hover:bg-gray-50'}`}
                                >
                                    {d} Days
                                </button>
                            ))}
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                            <span className="text-sm text-gray-500">Or custom days:</span>
                            <input
                                type="number"
                                min="1"
                                max="90"
                                value={days}
                                onChange={(e) => setDays(parseInt(e.target.value) || 1)}
                                className="w-20 border rounded px-2 py-1 text-center"
                            />
                        </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 max-h-[40vh] overflow-y-auto">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <Briefcase size={16} />
                            Packing List
                        </h3>
                        {Object.entries(packingList).length === 0 ? (
                            <p className="text-gray-500 text-sm italic">No scheduled items found to pack.</p>
                        ) : (
                            <div className="space-y-2">
                                {Object.entries(packingList).map(([name, count]) => (
                                    <div key={name} className="flex justify-between items-center text-sm">
                                        <span>{name}</span>
                                        <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border">{count}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleDispense}
                        disabled={Object.keys(packingList).length === 0}
                        className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Check size={20} />
                        Dispense & Pack
                    </button>
                </div>
            </div>
        </div>
    );
}
