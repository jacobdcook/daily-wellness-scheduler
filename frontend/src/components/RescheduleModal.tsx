"use client";

import { useState, useEffect } from "react";
import { X, Clock, Check } from "lucide-react";
import { ScheduledItem } from "@/types";
import { suggestReschedule, applyReschedule } from "@/utils/api";
import { format } from "date-fns";

interface RescheduleModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: ScheduledItem | null;
    date: string;
    onRescheduled: () => void;
}

export function RescheduleModal({ isOpen, onClose, item, date, onRescheduled }: RescheduleModalProps) {
    const [options, setOptions] = useState<Array<{ time: string; label: string; reason: string }>>([]);
    const [loading, setLoading] = useState(false);
    const [applying, setApplying] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && item) {
            loadSuggestions();
        }
    }, [isOpen, item]);

    const loadSuggestions = async () => {
        if (!item) return;
        setLoading(true);
        try {
            const data = await suggestReschedule(date, item.id);
            setOptions(data.options);
        } catch (error) {
            console.error("Failed to load suggestions", error);
        } finally {
            setLoading(false);
        }
    };

    const handleApply = async (optionTime: string) => {
        if (!item) return;
        setApplying(optionTime);
        try {
            await applyReschedule(date, item.id, optionTime);
            onRescheduled();
            onClose();
        } catch (error) {
            alert("Failed to reschedule item");
        } finally {
            setApplying(null);
        }
    };

    if (!isOpen || !item) return null;

    const originalTime = format(new Date(item.scheduled_time), "h:mm a");

    return (
        <div className="fixed inset-0 z-[10050] overflow-hidden flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <Clock size={24} className="text-blue-600" />
                        Reschedule Item
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                        <X size={20} />
                    </button>
                </div>

                <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-2">
                        <span className="font-semibold">{item.item.name}</span> was scheduled for <span className="font-semibold">{originalTime}</span>
                    </p>
                    <p className="text-xs text-gray-500">Choose a new time below:</p>
                </div>

                {loading ? (
                    <div className="text-center py-8 text-gray-500">Loading suggestions...</div>
                ) : options.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        No reschedule options available. The item may need to be skipped or taken manually.
                    </div>
                ) : (
                    <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                        {options.map((option, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleApply(option.time)}
                                disabled={applying === option.time}
                                className="w-full p-4 text-left bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-lg transition-all flex items-center justify-between group"
                            >
                                <div>
                                    <div className="font-semibold text-gray-900">{option.label}</div>
                                    <div className="text-xs text-gray-600 mt-1">{option.reason}</div>
                                </div>
                                {applying === option.time ? (
                                    <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <Check size={20} className="text-gray-400 group-hover:text-blue-600" />
                                )}
                            </button>
                        ))}
                    </div>
                )}

                <div className="mt-6 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}

