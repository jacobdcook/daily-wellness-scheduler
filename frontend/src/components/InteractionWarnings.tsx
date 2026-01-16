"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, X, Info, ChevronRight } from "lucide-react";
import { getScheduleInteractions, DetectedInteraction, ScheduleInteractions } from "@/utils/api";
import { InteractionDetailsModal } from "./InteractionDetailsModal";
import { format } from "date-fns";

interface InteractionWarningsProps {
    date?: string; // ISO date string, if not provided shows today
    onInteractionClick?: (interaction: DetectedInteraction) => void;
}

export function InteractionWarnings({ date, onInteractionClick }: InteractionWarningsProps) {
    const [interactions, setInteractions] = useState<ScheduleInteractions | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedInteraction, setSelectedInteraction] = useState<DetectedInteraction | null>(null);
    const [showDetails, setShowDetails] = useState(false);
    const [dismissed, setDismissed] = useState<Set<string>>(new Set());

    useEffect(() => {
        async function loadInteractions() {
            try {
                setLoading(true);
                const data = await getScheduleInteractions(date);
                setInteractions(data);
            } catch (error) {
                console.error("Failed to load interactions:", error);
            } finally {
                setLoading(false);
            }
        }
        loadInteractions();
    }, [date]);

    if (loading) {
        return (
            <div className="card-surface p-4">
                <div className="animate-pulse space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                </div>
            </div>
        );
    }

    if (!interactions || interactions.count === 0) {
        return null;
    }

    const handleInteractionClick = (interaction: DetectedInteraction) => {
        setSelectedInteraction(interaction);
        setShowDetails(true);
        if (onInteractionClick) {
            onInteractionClick(interaction);
        }
    };

    const handleDismiss = (interaction: DetectedInteraction, e: React.MouseEvent) => {
        e.stopPropagation();
        const key = `${interaction.supplement1}-${interaction.supplement2}-${interaction.time1}`;
        setDismissed(new Set(dismissed).add(key));
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case "high":
                return "border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20";
            case "moderate":
                return "border-orange-300 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20";
            case "low":
                return "border-blue-300 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20";
            default:
                return "border-gray-300 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/20";
        }
    };

    const getSeverityIcon = (severity: string) => {
        switch (severity) {
            case "high":
                return <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />;
            case "moderate":
                return <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400" />;
            case "low":
                return <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
            default:
                return <Info className="w-4 h-4" />;
        }
    };

    // Filter out dismissed interactions
    const visibleInteractions = interactions.interactions.filter(interaction => {
        const key = `${interaction.supplement1}-${interaction.supplement2}-${interaction.time1}`;
        return !dismissed.has(key);
    });

    if (visibleInteractions.length === 0) {
        return null;
    }

    // Group by severity
    const highSeverity = visibleInteractions.filter(i => i.severity === "high");
    const moderateSeverity = visibleInteractions.filter(i => i.severity === "moderate");
    const lowSeverity = visibleInteractions.filter(i => i.severity === "low");

    const conflicts = visibleInteractions.filter(i => !i.spacing_adequate);

    return (
        <>
            <div className="card-surface space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                            Supplement Interactions
                        </h3>
                    </div>
                    {conflicts.length > 0 && (
                        <span className="px-2 py-1 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full">
                            {conflicts.length} conflict{conflicts.length !== 1 ? "s" : ""}
                        </span>
                    )}
                </div>

                {/* High Severity */}
                {highSeverity.length > 0 && (
                    <div className="space-y-2">
                        {highSeverity.map((interaction, idx) => (
                            <div
                                key={idx}
                                onClick={() => handleInteractionClick(interaction)}
                                className={`p-3 rounded-lg border cursor-pointer hover:shadow-md transition-all ${getSeverityColor(interaction.severity)}`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start space-x-2 flex-1">
                                        {getSeverityIcon(interaction.severity)}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center space-x-2">
                                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                    {interaction.supplement1} + {interaction.supplement2}
                                                </p>
                                                {!interaction.spacing_adequate && (
                                                    <span className="px-2 py-0.5 text-xs font-medium bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200 rounded">
                                                        Too Close
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                                {interaction.interaction.description}
                                            </p>
                                            {interaction.time_diff_hours !== null && (
                                                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                                    Spacing: {interaction.time_diff_hours.toFixed(1)}h (required: {interaction.interaction.spacing_hours}h)
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-1 ml-2">
                                        <button
                                            onClick={(e) => handleDismiss(interaction, e)}
                                            className="p-1 hover:bg-white/50 dark:hover:bg-gray-800/50 rounded"
                                        >
                                            <X className="w-4 h-4 text-gray-400" />
                                        </button>
                                        <ChevronRight className="w-4 h-4 text-gray-400" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Moderate Severity */}
                {moderateSeverity.length > 0 && (
                    <div className="space-y-2">
                        {moderateSeverity.map((interaction, idx) => (
                            <div
                                key={idx}
                                onClick={() => handleInteractionClick(interaction)}
                                className={`p-3 rounded-lg border cursor-pointer hover:shadow-md transition-all ${getSeverityColor(interaction.severity)}`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start space-x-2 flex-1">
                                        {getSeverityIcon(interaction.severity)}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center space-x-2">
                                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                    {interaction.supplement1} + {interaction.supplement2}
                                                </p>
                                                {!interaction.spacing_adequate && (
                                                    <span className="px-2 py-0.5 text-xs font-medium bg-orange-200 dark:bg-orange-800 text-orange-800 dark:text-orange-200 rounded">
                                                        Consider Spacing
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                                {interaction.interaction.description}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-1 ml-2">
                                        <button
                                            onClick={(e) => handleDismiss(interaction, e)}
                                            className="p-1 hover:bg-white/50 dark:hover:bg-gray-800/50 rounded"
                                        >
                                            <X className="w-4 h-4 text-gray-400" />
                                        </button>
                                        <ChevronRight className="w-4 h-4 text-gray-400" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Low Severity (Synergistic) */}
                {lowSeverity.length > 0 && (
                    <div className="space-y-2">
                        {lowSeverity.map((interaction, idx) => (
                            <div
                                key={idx}
                                onClick={() => handleInteractionClick(interaction)}
                                className={`p-3 rounded-lg border cursor-pointer hover:shadow-md transition-all ${getSeverityColor(interaction.severity)}`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start space-x-2 flex-1">
                                        {getSeverityIcon(interaction.severity)}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                {interaction.supplement1} + {interaction.supplement2}
                                            </p>
                                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                                {interaction.interaction.description}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-1 ml-2">
                                        <button
                                            onClick={(e) => handleDismiss(interaction, e)}
                                            className="p-1 hover:bg-white/50 dark:hover:bg-gray-800/50 rounded"
                                        >
                                            <X className="w-4 h-4 text-gray-400" />
                                        </button>
                                        <ChevronRight className="w-4 h-4 text-gray-400" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Summary */}
                {visibleInteractions.length > 3 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center pt-2">
                        {visibleInteractions.length} interaction{visibleInteractions.length !== 1 ? "s" : ""} detected
                    </p>
                )}
            </div>

            {/* Details Modal */}
            {showDetails && selectedInteraction && (
                <InteractionDetailsModal
                    interaction={selectedInteraction.interaction}
                    supplement1={selectedInteraction.supplement1}
                    supplement2={selectedInteraction.supplement2}
                    onClose={() => {
                        setShowDetails(false);
                        setSelectedInteraction(null);
                    }}
                />
            )}
        </>
    );
}

