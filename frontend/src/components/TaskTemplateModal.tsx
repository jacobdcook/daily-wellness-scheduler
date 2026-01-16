"use client";

import { useState, useEffect } from "react";
import { X, Sparkles, Clock, Calendar, Check, Undo2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getTaskTemplates, applyTaskTemplate, revertTemplateApplication } from "@/utils/api";
import { useToast } from "@/context/ToastContext";
import { format } from "date-fns";

interface TaskTemplateModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedDate?: Date;
    onApplied?: () => void;
}

interface TaskTemplate {
    id: string;
    name: string;
    description: string;
    category: string;
    icon?: string;
    tasks: Array<{
        name: string;
        description: string;
        category: string;
        time_offset: string;
        duration_minutes?: number;
        notes?: string;
    }>;
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function TaskTemplateModal({ isOpen, onClose, selectedDate, onApplied }: TaskTemplateModalProps) {
    const { showToast } = useToast();
    const [templates, setTemplates] = useState<TaskTemplate[]>([]);
    const [loading, setLoading] = useState(false);
    const [applying, setApplying] = useState<string | null>(null);
    const [applyMode, setApplyMode] = useState<"single" | "weekly">("single");
    const [selectedDays, setSelectedDays] = useState<number[]>([]);
    const [lastBackupFile, setLastBackupFile] = useState<string | null>(null);
    const [reverting, setReverting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadTemplates();
        }
    }, [isOpen]);

    const loadTemplates = async () => {
        setLoading(true);
        try {
            const data = await getTaskTemplates();
            setTemplates(data.templates || []);
        } catch (error) {
            console.error("Failed to load templates", error);
            showToast("Failed to load templates", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleApplyTemplate = async (templateId: string) => {
        setApplying(templateId);
        try {
            const dateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : undefined;
            const daysOfWeek = applyMode === "weekly" ? selectedDays : undefined;

            const result = await applyTaskTemplate(templateId, dateStr, daysOfWeek);
            
            // Store backup file for revert
            if (result.backup_file) {
                setLastBackupFile(result.backup_file);
            }
            
            showToast(
                `Applied "${result.template}" to ${result.dates_applied} day(s). Added ${result.items_added} items.`,
                "success"
            );
            
            if (onApplied) {
                onApplied();
            }
            // Don't close modal - allow user to revert if needed
        } catch (error: any) {
            console.error("Failed to apply template", error);
            showToast(error.message || "Failed to apply template", "error");
        } finally {
            setApplying(null);
        }
    };

    const toggleDay = (dayIndex: number) => {
        setSelectedDays(prev => 
            prev.includes(dayIndex)
                ? prev.filter(d => d !== dayIndex)
                : [...prev, dayIndex]
        );
    };

    const handleRevert = async () => {
        if (!lastBackupFile) return;
        
        setReverting(true);
        try {
            await revertTemplateApplication(lastBackupFile);
            showToast("Template application reverted successfully", "success");
            setLastBackupFile(null);
            if (onApplied) {
                onApplied();
            }
            onClose();
        } catch (error: any) {
            console.error("Failed to revert template", error);
            showToast(error.message || "Failed to revert template", "error");
        } finally {
            setReverting(false);
        }
    };

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case "habit": return "✨";
            case "workout": return "💪";
            case "hydration": return "💧";
            case "meal": return "🍽️";
            case "medication": return "💊";
            default: return "📋";
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 overflow-hidden">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/50"
                    onClick={onClose}
                />
                <motion.div
                    initial={{ x: "100%" }}
                    animate={{ x: 0 }}
                    exit={{ x: "100%" }}
                    transition={{ type: "spring", damping: 30, stiffness: 300 }}
                    className="absolute right-0 top-0 h-full w-full max-w-2xl bg-white dark:bg-gray-900 shadow-xl overflow-y-auto"
                >
                    <div className="sticky top-0 bg-white dark:bg-gray-900 border-b dark:border-gray-800 z-10 px-6 py-4">
                        <div className="flex items-center justify-between mb-2">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Task Templates</h2>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                    Apply pre-built routines to your schedule
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                            >
                                <X size={24} className="text-gray-600 dark:text-gray-400" />
                            </button>
                        </div>
                        {lastBackupFile && (
                            <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200">
                                    <span>Template applied. You can revert this change.</span>
                                </div>
                                <button
                                    onClick={handleRevert}
                                    disabled={reverting}
                                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                                >
                                    {reverting ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            Reverting...
                                        </>
                                    ) : (
                                        <>
                                            <Undo2 size={16} />
                                            Revert
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="p-6 space-y-6">
                        {/* Apply Mode Selection */}
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Apply to:
                            </label>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setApplyMode("single")}
                                    className={applyMode === "single"
                                        ? "px-4 py-2 bg-primary-600 text-white rounded-lg font-medium"
                                        : "px-4 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg border border-gray-300 dark:border-gray-600"
                                    }
                                >
                                    {selectedDate ? format(selectedDate, "MMM d") : "Today"}
                                </button>
                                <button
                                    onClick={() => setApplyMode("weekly")}
                                    className={applyMode === "weekly"
                                        ? "px-4 py-2 bg-primary-600 text-white rounded-lg font-medium"
                                        : "px-4 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg border border-gray-300 dark:border-gray-600"
                                    }
                                >
                                    Weekly (Select Days)
                                </button>
                            </div>

                            {applyMode === "weekly" && (
                                <div className="grid grid-cols-7 gap-2 mt-3">
                                    {DAY_NAMES.map((day, index) => (
                                        <button
                                            key={day}
                                            onClick={() => toggleDay(index)}
                                            className={selectedDays.includes(index)
                                                ? "px-2 py-2 bg-primary-600 text-white rounded-lg text-xs font-medium"
                                                : "px-2 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg border border-gray-300 dark:border-gray-600 text-xs"
                                            }
                                        >
                                            {day.slice(0, 3)}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {loading ? (
                            <div className="text-center py-12">
                                <div className="inline-block w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
                                <p className="mt-4 text-gray-600 dark:text-gray-400">Loading templates...</p>
                            </div>
                        ) : templates.length === 0 ? (
                            <div className="text-center py-12">
                                <Sparkles size={48} className="mx-auto text-gray-400 mb-4" />
                                <p className="text-gray-600 dark:text-gray-400">No templates available</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {templates.map((template) => (
                                    <motion.div
                                        key={template.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow"
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-2xl">{getCategoryIcon(template.category)}</span>
                                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                                        {template.name}
                                                    </h3>
                                                </div>
                                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                                    {template.description}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Template Tasks Preview */}
                                        {template.tasks && template.tasks.length > 0 && (
                                            <div className="mb-4 space-y-2">
                                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                                    Includes ({template.tasks.length} tasks):
                                                </p>
                                                <div className="space-y-1">
                                                    {template.tasks.slice(0, 3).map((task, idx) => (
                                                        <div key={idx} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                                            <Clock size={14} className="text-gray-400" />
                                                            <span>{task.name}</span>
                                                            {task.duration_minutes && (
                                                                <span className="text-xs text-gray-500">
                                                                    ({task.duration_minutes} min)
                                                                </span>
                                                            )}
                                                        </div>
                                                    ))}
                                                    {template.tasks.length > 3 && (
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 pl-6">
                                                            +{template.tasks.length - 3} more tasks
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        <button
                                            onClick={() => handleApplyTemplate(template.id)}
                                            disabled={applying === template.id || (applyMode === "weekly" && selectedDays.length === 0)}
                                            className={applying === template.id
                                                ? "w-full px-4 py-2 bg-gray-400 text-white rounded-lg font-medium cursor-not-allowed flex items-center justify-center gap-2"
                                                : "w-full px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
                                            }
                                        >
                                            {applying === template.id ? (
                                                <>
                                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                    Applying...
                                                </>
                                            ) : (
                                                <>
                                                    <Check size={18} />
                                                    Apply Template
                                                </>
                                            )}
                                        </button>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}

