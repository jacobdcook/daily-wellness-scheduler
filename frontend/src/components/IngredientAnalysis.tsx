"use client";

import { Leaf, Droplets, Wheat, Heart, Shield } from "lucide-react";

interface IngredientAnalysisProps {
    ingredients?: string[];
    ingredientsText?: string;
    compact?: boolean;
}

export function IngredientAnalysis({ 
    ingredients, 
    ingredientsText,
    compact = false 
}: IngredientAnalysisProps) {
    if (!ingredients || ingredients.length === 0) {
        if (ingredientsText) {
            return (
                <div className="text-sm text-gray-400">
                    <div className="font-medium mb-1">Ingredients:</div>
                    <div className="text-xs">{ingredientsText}</div>
                </div>
            );
        }
        return null;
    }

    // Parse ingredient tags
    const tags = ingredients.map(tag => {
        const clean = tag.replace(/^en:/, '').replace(/-/g, ' ');
        return {
            original: tag,
            display: clean.split(' ').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ')
        };
    });

    // Categorize tags
    const dietary = tags.filter(t => 
        t.original.includes('vegan') || 
        t.original.includes('vegetarian') ||
        t.original.includes('halal') ||
        t.original.includes('kosher')
    );

    const quality = tags.filter(t => 
        t.original.includes('organic') ||
        t.original.includes('fair-trade') ||
        t.original.includes('bio')
    );

    const concerns = tags.filter(t => 
        t.original.includes('palm-oil') ||
        t.original.includes('may-contain') ||
        t.original.includes('allergen')
    );

    const other = tags.filter(t => 
        !dietary.includes(t) && 
        !quality.includes(t) && 
        !concerns.includes(t)
    );

    if (compact) {
        const allTags = [...dietary, ...quality, ...concerns, ...other].slice(0, 3);
        return (
            <div className="flex flex-wrap gap-1.5">
                {allTags.map((tag, idx) => (
                    <span
                        key={idx}
                        className="px-2 py-0.5 bg-slate-700 text-gray-300 text-xs rounded border border-slate-600"
                    >
                        {tag.display}
                    </span>
                ))}
                {tags.length > 3 && (
                    <span className="px-2 py-0.5 text-gray-400 text-xs">
                        +{tags.length - 3} more
                    </span>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {ingredientsText && (
                <div className="text-sm text-gray-300">
                    <div className="font-medium mb-1 text-white">Full Ingredients:</div>
                    <div className="text-xs text-gray-400 leading-relaxed">{ingredientsText}</div>
                </div>
            )}

            <div className="space-y-2">
                {dietary.length > 0 && (
                    <div>
                        <div className="flex items-center gap-2 mb-1.5">
                            <Leaf className="w-4 h-4 text-green-400" />
                            <span className="text-sm font-medium text-white">Dietary</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 pl-6">
                            {dietary.map((tag, idx) => (
                                <span
                                    key={idx}
                                    className="px-2 py-0.5 bg-green-900/30 text-green-300 text-xs rounded border border-green-700/50"
                                >
                                    {tag.display}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {quality.length > 0 && (
                    <div>
                        <div className="flex items-center gap-2 mb-1.5">
                            <Shield className="w-4 h-4 text-blue-400" />
                            <span className="text-sm font-medium text-white">Quality</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 pl-6">
                            {quality.map((tag, idx) => (
                                <span
                                    key={idx}
                                    className="px-2 py-0.5 bg-blue-900/30 text-blue-300 text-xs rounded border border-blue-700/50"
                                >
                                    {tag.display}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {concerns.length > 0 && (
                    <div>
                        <div className="flex items-center gap-2 mb-1.5">
                            <Droplets className="w-4 h-4 text-orange-400" />
                            <span className="text-sm font-medium text-white">Concerns</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 pl-6">
                            {concerns.map((tag, idx) => (
                                <span
                                    key={idx}
                                    className="px-2 py-0.5 bg-orange-900/30 text-orange-300 text-xs rounded border border-orange-700/50"
                                >
                                    {tag.display}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {other.length > 0 && (
                    <div>
                        <div className="flex items-center gap-2 mb-1.5">
                            <Wheat className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-medium text-white">Other</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 pl-6">
                            {other.map((tag, idx) => (
                                <span
                                    key={idx}
                                    className="px-2 py-0.5 bg-slate-700 text-gray-300 text-xs rounded border border-slate-600"
                                >
                                    {tag.display}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

