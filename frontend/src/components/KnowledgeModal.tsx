"use client";

import { useState, useEffect } from "react";
import { X, BookOpen, Clock, FlaskConical, Zap, ShieldAlert, Sparkles } from "lucide-react";
import { getKnowledge, KnowledgeItem } from "@/utils/api";
import { clsx } from "clsx";

interface KnowledgeModalProps {
    isOpen: boolean;
    onClose: () => void;
    itemName: string;
}

export function KnowledgeModal({ isOpen, onClose, itemName }: KnowledgeModalProps) {
    const [data, setData] = useState<KnowledgeItem | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen && itemName) {
            setLoading(true);
            setData(null);
            getKnowledge(itemName)
                .then(setData)
                .catch(console.error)
                .finally(() => setLoading(false));
        }
    }, [isOpen, itemName]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[10000] overflow-hidden flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            
            <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-5 border-b dark:border-gray-800 flex justify-between items-start bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-t-2xl">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white capitalize tracking-tight">
                            {data?.name || itemName}
                        </h2>
                        <span className="text-sm text-blue-600 dark:text-blue-300 font-medium bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 rounded-full mt-2 inline-block">
                            {data?.category || "Supplement"}
                        </span>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/50 dark:hover:bg-gray-800 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="overflow-y-auto p-6 space-y-6">
                    {loading ? (
                        <div className="space-y-4 animate-pulse">
                            <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4" />
                            <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/2" />
                            <div className="h-24 bg-gray-200 dark:bg-gray-800 rounded-xl" />
                        </div>
                    ) : data ? (
                        <>
                            {/* Summary */}
                            <div className="text-gray-700 dark:text-gray-300 leading-relaxed text-lg">
                                {data.summary}
                            </div>

                            {/* Benefits */}
                            <div className="grid grid-cols-2 gap-3">
                                {data.benefits.map((benefit, idx) => (
                                    <div key={idx} className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 p-3 rounded-xl border border-green-100 dark:border-green-900/30">
                                        <Sparkles size={16} className="text-green-600 dark:text-green-400 flex-shrink-0" />
                                        <span className="text-sm font-medium text-green-800 dark:text-green-200">{benefit}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Timing */}
                            <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30 space-y-2">
                                <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200 font-semibold">
                                    <Clock size={18} />
                                    <h3>Best Timing</h3>
                                </div>
                                <p className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed">
                                    {data.timing_rationale}
                                </p>
                            </div>

                            {/* Mechanism */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-gray-900 dark:text-white font-semibold">
                                    <FlaskConical size={18} className="text-purple-500" />
                                    <h3>Mechanism of Action</h3>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
                                    {data.mechanism}
                                </p>
                            </div>

                            {/* Synergies & Antagonists */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {data.synergies.length > 0 && (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                                            <Zap size={16} className="text-yellow-500" />
                                            Works well with
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {data.synergies.map((s, i) => (
                                                <span key={i} className="text-xs bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 px-2 py-1 rounded-md border border-yellow-100 dark:border-yellow-900/30">
                                                    {s}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                
                                {data.antagonists.length > 0 && (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                                            <ShieldAlert size={16} className="text-red-500" />
                                            Avoid with
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {data.antagonists.map((s, i) => (
                                                <span key={i} className="text-xs bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-2 py-1 rounded-md border border-red-100 dark:border-red-900/30">
                                                    {s}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-12 space-y-3">
                            <BookOpen size={48} className="mx-auto text-gray-300 dark:text-gray-700" />
                            <p className="text-gray-500 dark:text-gray-400">
                                Detailed knowledge not available for this item yet.
                            </p>
                            <p className="text-xs text-gray-400">
                                Try asking the AI Assistant for more details.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

