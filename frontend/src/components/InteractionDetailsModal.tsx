"use client";

import { X, AlertTriangle, Info, CheckCircle, AlertCircle } from "lucide-react";
import { Interaction } from "@/utils/api";

interface InteractionDetailsModalProps {
    interaction: Interaction | null;
    supplement1: string;
    supplement2: string;
    onClose: () => void;
}

export function InteractionDetailsModal({ interaction, supplement1, supplement2, onClose }: InteractionDetailsModalProps) {
    if (!interaction) {
        return null;
    }

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case "high":
                return "text-red-600 dark:text-red-400";
            case "moderate":
                return "text-orange-600 dark:text-orange-400";
            case "low":
                return "text-blue-600 dark:text-blue-400";
            default:
                return "text-gray-600 dark:text-gray-400";
        }
    };

    const getSeverityIcon = (severity: string) => {
        switch (severity) {
            case "high":
                return <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />;
            case "moderate":
                return <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />;
            case "low":
                return <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
            default:
                return <Info className="w-5 h-5" />;
        }
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case "absorption_conflict":
                return "Absorption Conflict";
            case "synergistic":
                return "Synergistic (Beneficial)";
            case "contraindication":
                return "Contraindication";
            default:
                return type;
        }
    };

    const isSynergistic = interaction.type === "synergistic";

    return (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white dark:bg-gray-900 border-b dark:border-gray-800 p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        {getSeverityIcon(interaction.severity)}
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                Interaction Details
                            </h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                {supplement1} + {supplement2}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Type and Severity */}
                    <div className="flex items-center justify-between">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            isSynergistic 
                                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                                : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                        }`}>
                            {getTypeLabel(interaction.type)}
                        </span>
                        <span className={`text-sm font-medium ${getSeverityColor(interaction.severity)}`}>
                            Severity: {interaction.severity.toUpperCase()}
                        </span>
                    </div>

                    {/* Description */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Description
                        </h3>
                        <p className="text-gray-900 dark:text-gray-100">
                            {interaction.description}
                        </p>
                    </div>

                    {/* Recommendation */}
                    <div className={`p-4 rounded-lg ${
                        isSynergistic
                            ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                            : "bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800"
                    }`}>
                        <div className="flex items-start space-x-2">
                            {isSynergistic ? (
                                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                            ) : (
                                <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                            )}
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                                    Recommendation
                                </h3>
                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                    {interaction.recommendation}
                                </p>
                                {interaction.spacing_hours > 0 && !isSynergistic && (
                                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                                        Required spacing: <strong>{interaction.spacing_hours} hours</strong>
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Scientific Evidence */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Scientific Evidence
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                            {interaction.scientific_evidence}
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 border-t dark:border-gray-800 p-4">
                    <button
                        onClick={onClose}
                        className="w-full px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors font-medium"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

