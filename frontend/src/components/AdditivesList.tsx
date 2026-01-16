"use client";

import { AlertTriangle, CheckCircle, HelpCircle } from "lucide-react";
import { useState } from "react";

interface AdditivesData {
    total?: number;
    harmful?: string[];
    questionable?: string[];
    safe?: string[];
    has_harmful?: boolean;
    has_questionable?: boolean;
}

interface AdditivesListProps {
    additives?: AdditivesData;
    compact?: boolean;
}

export function AdditivesList({ additives, compact = false }: AdditivesListProps) {
    const [expanded, setExpanded] = useState(false);

    if (!additives || additives.total === 0 || !additives.total) {
        return (
            <div className="flex items-center gap-2 text-green-400 text-sm">
                <CheckCircle className="w-4 h-4" />
                <span>No additives</span>
            </div>
        );
    }

    const hasWarnings = additives.has_harmful || additives.has_questionable;
    const harmfulCount = additives.harmful?.length || 0;
    const questionableCount = additives.questionable?.length || 0;

    if (compact) {
        return (
            <div className="flex items-center gap-2">
                {additives.has_harmful && (
                    <div className="flex items-center gap-1 text-red-400 text-xs">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>{harmfulCount} harmful</span>
                    </div>
                )}
                {additives.has_questionable && !additives.has_harmful && (
                    <div className="flex items-center gap-1 text-yellow-400 text-xs">
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>{questionableCount} questionable</span>
                    </div>
                )}
                {!hasWarnings && (
                    <div className="text-xs text-gray-400">
                        {additives.total} additive{additives.total !== 1 ? 's' : ''}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {hasWarnings ? (
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                    ) : (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                    )}
                    <span className="text-sm font-medium text-white">
                        {additives.total} Additive{additives.total !== 1 ? 's' : ''}
                    </span>
                </div>
                {(harmfulCount > 0 || questionableCount > 0) && (
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="text-xs text-orange-400 hover:text-orange-300"
                    >
                        {expanded ? "Hide" : "Show"} details
                    </button>
                )}
            </div>

            {expanded && (
                <div className="space-y-3 pl-7">
                    {harmfulCount > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <AlertTriangle className="w-4 h-4 text-red-400" />
                                <span className="text-sm font-medium text-red-400">
                                    {harmfulCount} Harmful Additive{harmfulCount !== 1 ? 's' : ''}
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {additives.harmful?.map((additive, idx) => (
                                    <span
                                        key={idx}
                                        className="px-2 py-0.5 bg-red-900/30 text-red-300 text-xs rounded border border-red-700/50"
                                    >
                                        {additive}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {questionableCount > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <HelpCircle className="w-4 h-4 text-yellow-400" />
                                <span className="text-sm font-medium text-yellow-400">
                                    {questionableCount} Questionable Additive{questionableCount !== 1 ? 's' : ''}
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {additives.questionable?.map((additive, idx) => (
                                    <span
                                        key={idx}
                                        className="px-2 py-0.5 bg-yellow-900/30 text-yellow-300 text-xs rounded border border-yellow-700/50"
                                    >
                                        {additive}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {additives.safe && additives.safe.length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <CheckCircle className="w-4 h-4 text-green-400" />
                                <span className="text-sm font-medium text-green-400">
                                    {additives.safe.length} Safe Additive{additives.safe.length !== 1 ? 's' : ''}
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {additives.safe.slice(0, 5).map((additive, idx) => (
                                    <span
                                        key={idx}
                                        className="px-2 py-0.5 bg-green-900/30 text-green-300 text-xs rounded border border-green-700/50"
                                    >
                                        {additive}
                                    </span>
                                ))}
                                {additives.safe.length > 5 && (
                                    <span className="px-2 py-0.5 text-gray-400 text-xs">
                                        +{additives.safe.length - 5} more
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {!expanded && hasWarnings && (
                <div className="pl-7 text-xs text-gray-400">
                    Click "Show details" to see additive breakdown
                </div>
            )}
        </div>
    );
}

