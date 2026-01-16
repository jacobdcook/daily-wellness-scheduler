"use client";

import { useState, useEffect } from "react";
import { Calendar, Clock, Repeat, Trash, Edit, Play, Pause, Eye } from "lucide-react";
import { listPatterns, deletePattern, updatePattern, regeneratePattern, previewPattern, RecurringPattern } from "@/utils/api";
import { clsx } from "clsx";

interface PatternTemplateLibraryProps {
    onEdit?: (pattern: RecurringPattern) => void;
    onRefresh?: () => void;
}

export function PatternTemplateLibrary({ onEdit, onRefresh }: PatternTemplateLibraryProps) {
    const [patterns, setPatterns] = useState<RecurringPattern[]>([]);
    const [loading, setLoading] = useState(true);
    const [previewingId, setPreviewingId] = useState<string | null>(null);
    const [preview, setPreview] = useState<string[]>([]);

    useEffect(() => {
        loadPatterns();
    }, []);

    const loadPatterns = async () => {
        try {
            setLoading(true);
            const result = await listPatterns();
            setPatterns(result.patterns || []);
        } catch (error) {
            console.error("Failed to load patterns:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (patternId: string) => {
        if (!confirm("Delete this pattern? This will also remove all scheduled occurrences.")) {
            return;
        }

        try {
            await deletePattern(patternId, true);
            await loadPatterns();
            onRefresh?.();
        } catch (error: any) {
            alert(error.message || "Failed to delete pattern");
        }
    };

    const handleToggle = async (pattern: RecurringPattern) => {
        try {
            await updatePattern(pattern.id!, { enabled: !pattern.enabled });
            await loadPatterns();
            onRefresh?.();
        } catch (error: any) {
            alert(error.message || "Failed to update pattern");
        }
    };

    const handleRegenerate = async (patternId: string) => {
        try {
            await regeneratePattern(patternId);
            await loadPatterns();
            onRefresh?.();
            alert("Pattern regenerated successfully");
        } catch (error: any) {
            alert(error.message || "Failed to regenerate pattern");
        }
    };

    const handlePreview = async (patternId: string) => {
        if (previewingId === patternId) {
            setPreviewingId(null);
            setPreview([]);
            return;
        }

        try {
            const result = await previewPattern(patternId, 10);
            setPreview(result.preview);
            setPreviewingId(patternId);
        } catch (error: any) {
            alert(error.message || "Failed to preview pattern");
        }
    };

    const formatPatternType = (type: string) => {
        const types: Record<string, string> = {
            daily: "Daily",
            weekly: "Weekly",
            biweekly: "Biweekly",
            monthly: "Monthly",
            custom: "Custom",
        };
        return types[type] || type;
    };

    if (loading) {
        return (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                Loading patterns...
            </div>
        );
    }

    if (patterns.length === 0) {
        return (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                No recurring patterns yet. Create one to get started!
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {patterns.map((pattern) => (
                <div
                    key={pattern.id}
                    className={clsx(
                        "p-4 border rounded-lg transition-colors",
                        pattern.enabled
                            ? "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                            : "bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 opacity-60"
                    )}
                >
                    <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-gray-900 dark:text-white">
                                    {pattern.name}
                                </h3>
                                <span className="px-2 py-0.5 text-xs bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded">
                                    {formatPatternType(pattern.pattern_type)}
                                </span>
                                {!pattern.enabled && (
                                    <span className="px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                                        Disabled
                                    </span>
                                )}
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                {pattern.item_template?.name || "Untitled Item"}
                                {pattern.item_template?.dose && ` • ${pattern.item_template.dose}`}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-500">
                                <span className="flex items-center gap-1">
                                    <Clock size={12} />
                                    {pattern.time}
                                </span>
                                <span className="flex items-center gap-1">
                                    <Calendar size={12} />
                                    Starts {new Date(pattern.start_date).toLocaleDateString()}
                                </span>
                                {pattern.end_date && (
                                    <span className="flex items-center gap-1">
                                        Ends {new Date(pattern.end_date).toLocaleDateString()}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {previewingId === pattern.id && preview.length > 0 && (
                        <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Next 10 occurrences:
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {preview.map((date) => (
                                    <span
                                        key={date}
                                        className="px-2 py-1 bg-white dark:bg-gray-800 rounded text-xs"
                                    >
                                        {new Date(date).toLocaleDateString()}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-2 mt-3 pt-3 border-t dark:border-gray-700">
                        <button
                            onClick={() => handleToggle(pattern)}
                            className={clsx(
                                "px-3 py-1.5 text-xs rounded-lg transition-colors",
                                pattern.enabled
                                    ? "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                                    : "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800"
                            )}
                        >
                            {pattern.enabled ? (
                                <>
                                    <Pause size={12} className="inline mr-1" />
                                    Disable
                                </>
                            ) : (
                                <>
                                    <Play size={12} className="inline mr-1" />
                                    Enable
                                </>
                            )}
                        </button>
                        <button
                            onClick={() => handlePreview(pattern.id!)}
                            className="px-3 py-1.5 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                        >
                            <Eye size={12} className="inline mr-1" />
                            {previewingId === pattern.id ? "Hide" : "Preview"}
                        </button>
                        <button
                            onClick={() => handleRegenerate(pattern.id!)}
                            className="px-3 py-1.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                        >
                            <Repeat size={12} className="inline mr-1" />
                            Regenerate
                        </button>
                        {onEdit && (
                            <button
                                onClick={() => onEdit(pattern)}
                                className="px-3 py-1.5 text-xs bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded-lg hover:bg-primary-200 dark:hover:bg-primary-800 transition-colors"
                            >
                                <Edit size={12} className="inline mr-1" />
                                Edit
                            </button>
                        )}
                        <button
                            onClick={() => handleDelete(pattern.id!)}
                            className="px-3 py-1.5 text-xs bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-800 transition-colors ml-auto"
                        >
                            <Trash size={12} className="inline mr-1" />
                            Delete
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}

