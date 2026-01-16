"use client";

import { useState } from "react";
import { X, Calendar, Clock, Repeat, Check, Plus, Trash } from "lucide-react";
import { createPattern, RecurringPattern } from "@/utils/api";
import { clsx } from "clsx";

interface RecurringPatternBuilderProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialItem?: any; // Item template to create pattern from
}

export function RecurringPatternBuilder({ isOpen, onClose, onSuccess, initialItem }: RecurringPatternBuilderProps) {
    const [name, setName] = useState("");
    const [patternType, setPatternType] = useState<"daily" | "weekly" | "biweekly" | "monthly">("daily");
    const [frequency, setFrequency] = useState(1);
    const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);
    const [daysOfMonth, setDaysOfMonth] = useState<number[]>([]);
    const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
    const [endDate, setEndDate] = useState("");
    const [time, setTime] = useState("12:00");
    const [maxOccurrences, setMaxOccurrences] = useState<number | undefined>(undefined);
    const [exceptions, setExceptions] = useState<string[]>([]);
    const [newException, setNewException] = useState("");
    const [itemName, setItemName] = useState(initialItem?.name || "");
    const [itemDose, setItemDose] = useState(initialItem?.dose || "");
    const [itemNotes, setItemNotes] = useState(initialItem?.notes || "");
    const [loading, setLoading] = useState(false);
    const [preview, setPreview] = useState<string[]>([]);

    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    if (!isOpen) return null;

    const toggleDayOfWeek = (day: number) => {
        setDaysOfWeek(prev => 
            prev.includes(day) 
                ? prev.filter(d => d !== day)
                : [...prev, day].sort()
        );
    };

    const toggleDayOfMonth = (day: number) => {
        setDaysOfMonth(prev => 
            prev.includes(day) 
                ? prev.filter(d => d !== day)
                : [...prev, day].sort()
        );
    };

    const addException = () => {
        if (newException && !exceptions.includes(newException)) {
            setExceptions([...exceptions, newException]);
            setNewException("");
        }
    };

    const removeException = (date: string) => {
        setExceptions(exceptions.filter(e => e !== date));
    };

    const generatePreview = async () => {
        if (!name || !itemName || !startDate) return;

        const pattern: RecurringPattern = {
            name,
            pattern_type: patternType,
            frequency: patternType === "daily" ? frequency : undefined,
            days_of_week: patternType === "weekly" || patternType === "biweekly" ? daysOfWeek : undefined,
            days_of_month: patternType === "monthly" ? daysOfMonth : undefined,
            start_date: startDate,
            end_date: endDate || undefined,
            exceptions,
            max_occurrences: maxOccurrences,
            time,
            item_template: {
                name: itemName,
                dose: itemDose,
                notes: itemNotes,
            },
        };

        // Generate preview locally (simplified)
        const previewDates: string[] = [];
        const start = new Date(startDate);
        const end = new Date();
        end.setDate(end.getDate() + 90);

        let current = new Date(start);
        let count = 0;
        const maxPreview = 10;

        while (current <= end && count < maxPreview) {
            const dateStr = current.toISOString().split("T")[0];
            
            if (exceptions.includes(dateStr)) {
                current.setDate(current.getDate() + 1);
                continue;
            }

            let shouldInclude = false;

            if (patternType === "daily") {
                const daysDiff = Math.floor((current.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                shouldInclude = daysDiff % frequency === 0;
            } else if (patternType === "weekly" || patternType === "biweekly") {
                const dayOfWeek = current.getDay();
                shouldInclude = daysOfWeek.includes(dayOfWeek);
                if (patternType === "biweekly") {
                    const weeksDiff = Math.floor((current.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7));
                    shouldInclude = shouldInclude && weeksDiff % 2 === 0;
                }
            } else if (patternType === "monthly") {
                const dayOfMonth = current.getDate();
                shouldInclude = daysOfMonth.includes(dayOfMonth);
            }

            if (shouldInclude) {
                previewDates.push(dateStr);
                count++;
            }

            current.setDate(current.getDate() + 1);
        }

        setPreview(previewDates);
    };

    const handleSave = async () => {
        if (!name || !itemName || !startDate || !time) {
            alert("Please fill in all required fields");
            return;
        }

        if ((patternType === "weekly" || patternType === "biweekly") && daysOfWeek.length === 0) {
            alert("Please select at least one day of the week");
            return;
        }

        if (patternType === "monthly" && daysOfMonth.length === 0) {
            alert("Please select at least one day of the month");
            return;
        }

        setLoading(true);

        try {
            const pattern: RecurringPattern = {
                name,
                pattern_type: patternType,
                frequency: patternType === "daily" ? frequency : undefined,
                days_of_week: patternType === "weekly" || patternType === "biweekly" ? daysOfWeek : undefined,
                days_of_month: patternType === "monthly" ? daysOfMonth : undefined,
                start_date: startDate,
                end_date: endDate || undefined,
                exceptions,
                max_occurrences: maxOccurrences,
                time,
                item_template: {
                    name: itemName,
                    dose: itemDose,
                    notes: itemNotes,
                },
            };

            await createPattern(pattern);
            onSuccess();
            onClose();
        } catch (error: any) {
            alert(error.message || "Failed to create pattern");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[10000] overflow-y-auto flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            
            <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white dark:bg-gray-900 border-b dark:border-gray-800 p-4 flex items-center justify-between z-10">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Create Recurring Pattern</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Basic Info */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Pattern Name *
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Morning Meditation"
                            className="w-full px-3 py-2 border dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-white"
                        />
                    </div>

                    {/* Item Template */}
                    <div className="space-y-3">
                        <h3 className="font-medium text-gray-900 dark:text-white">Item Details</h3>
                        <input
                            type="text"
                            value={itemName}
                            onChange={(e) => setItemName(e.target.value)}
                            placeholder="Item name *"
                            className="w-full px-3 py-2 border dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-white"
                        />
                        <input
                            type="text"
                            value={itemDose}
                            onChange={(e) => setItemDose(e.target.value)}
                            placeholder="Dose (optional)"
                            className="w-full px-3 py-2 border dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-white"
                        />
                        <textarea
                            value={itemNotes}
                            onChange={(e) => setItemNotes(e.target.value)}
                            placeholder="Notes (optional)"
                            rows={2}
                            className="w-full px-3 py-2 border dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-white"
                        />
                    </div>

                    {/* Pattern Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Pattern Type *
                        </label>
                        <select
                            value={patternType}
                            onChange={(e) => setPatternType(e.target.value as any)}
                            className="w-full px-3 py-2 border dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-white"
                        >
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="biweekly">Biweekly (Every 2 weeks)</option>
                            <option value="monthly">Monthly</option>
                        </select>
                    </div>

                    {/* Pattern-specific options */}
                    {patternType === "daily" && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Every N days
                            </label>
                            <input
                                type="number"
                                min="1"
                                value={frequency}
                                onChange={(e) => setFrequency(parseInt(e.target.value) || 1)}
                                className="w-full px-3 py-2 border dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-white"
                            />
                        </div>
                    )}

                    {(patternType === "weekly" || patternType === "biweekly") && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Days of Week *
                            </label>
                            <div className="flex gap-2 flex-wrap">
                                {weekdays.map((day, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => toggleDayOfWeek(idx)}
                                        className={clsx(
                                            "px-4 py-2 rounded-lg border transition-colors",
                                            daysOfWeek.includes(idx)
                                                ? "bg-primary-600 text-white border-primary-600"
                                                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700"
                                        )}
                                    >
                                        {day}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {patternType === "monthly" && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Days of Month *
                            </label>
                            <div className="flex gap-2 flex-wrap">
                                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                                    <button
                                        key={day}
                                        type="button"
                                        onClick={() => toggleDayOfMonth(day)}
                                        className={clsx(
                                            "px-3 py-1 rounded border text-sm transition-colors",
                                            daysOfMonth.includes(day)
                                                ? "bg-primary-600 text-white border-primary-600"
                                                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700"
                                        )}
                                    >
                                        {day}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Time */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Time *
                        </label>
                        <input
                            type="time"
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            className="w-full px-3 py-2 border dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-white"
                        />
                    </div>

                    {/* Date Range */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Start Date *
                            </label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full px-3 py-2 border dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                End Date (optional)
                            </label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full px-3 py-2 border dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-white"
                            />
                        </div>
                    </div>

                    {/* Max Occurrences */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Max Occurrences (optional)
                        </label>
                        <input
                            type="number"
                            min="1"
                            value={maxOccurrences || ""}
                            onChange={(e) => setMaxOccurrences(e.target.value ? parseInt(e.target.value) : undefined)}
                            placeholder="Leave empty for unlimited"
                            className="w-full px-3 py-2 border dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-white"
                        />
                    </div>

                    {/* Exceptions */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Exception Dates (skip these dates)
                        </label>
                        <div className="flex gap-2 mb-2">
                            <input
                                type="date"
                                value={newException}
                                onChange={(e) => setNewException(e.target.value)}
                                className="flex-1 px-3 py-2 border dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-white"
                            />
                            <button
                                type="button"
                                onClick={addException}
                                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                            >
                                <Plus size={16} />
                            </button>
                        </div>
                        {exceptions.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {exceptions.map((exc) => (
                                    <span
                                        key={exc}
                                        className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm"
                                    >
                                        {exc}
                                        <button
                                            type="button"
                                            onClick={() => removeException(exc)}
                                            className="hover:text-red-600"
                                        >
                                            <X size={14} />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Preview */}
                    {preview.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Preview (next 10 occurrences)
                            </label>
                            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <div className="flex flex-wrap gap-2">
                                    {preview.map((date) => (
                                        <span
                                            key={date}
                                            className="px-2 py-1 bg-white dark:bg-gray-700 rounded text-sm"
                                        >
                                            {new Date(date).toLocaleDateString()}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 border-t dark:border-gray-800">
                        <button
                            type="button"
                            onClick={generatePreview}
                            className="flex-1 px-4 py-2 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                        >
                            Preview
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={loading}
                            className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                        >
                            {loading ? "Creating..." : "Create Pattern"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

