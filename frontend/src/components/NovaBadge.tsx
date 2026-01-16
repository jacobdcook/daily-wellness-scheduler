"use client";

import { Info, AlertTriangle } from "lucide-react";
import { useState } from "react";

interface NovaBadgeProps {
    group?: number;
    description?: string;
    size?: "sm" | "md" | "lg";
    showDescription?: boolean;
}

export function NovaBadge({ 
    group, 
    description, 
    size = "md",
    showDescription = false 
}: NovaBadgeProps) {
    const [showTooltip, setShowTooltip] = useState(false);

    if (!group || group < 1 || group > 4) {
        return null;
    }

    // NOVA classification colors
    const getColorClasses = () => {
        switch (group) {
            case 1:
                return "bg-green-600 text-white border-green-500";
            case 2:
                return "bg-yellow-600 text-white border-yellow-500";
            case 3:
                return "bg-orange-600 text-white border-orange-500";
            case 4:
                return "bg-red-600 text-white border-red-500";
            default:
                return "bg-slate-600 text-white border-slate-500";
        }
    };

    const sizeClasses = {
        sm: "text-xs px-2 py-1",
        md: "text-sm px-2.5 py-1",
        lg: "text-base px-3 py-1.5"
    };

    const getGroupLabel = () => {
        switch (group) {
            case 1:
                return "Unprocessed";
            case 2:
                return "Processed";
            case 3:
                return "Processed";
            case 4:
                return "Ultra-Processed";
            default:
                return `NOVA ${group}`;
        }
    };

    const isUltraProcessed = group === 4;

    return (
        <div className="relative inline-flex items-center gap-2">
            <div 
                className={`inline-flex items-center gap-1 rounded-full border ${getColorClasses()} ${sizeClasses[size]}`}
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
            >
                {isUltraProcessed && (
                    <AlertTriangle className={`${size === "sm" ? "w-3 h-3" : size === "md" ? "w-3.5 h-3.5" : "w-4 h-4"}`} />
                )}
                <span className="font-semibold">
                    NOVA {group}
                </span>
            </div>
            
            {showDescription && description && (
                <div className="text-xs text-gray-400 max-w-[200px]">
                    {description}
                </div>
            )}

            {showTooltip && description && (
                <div className="absolute bottom-full left-0 mb-2 px-3 py-2 bg-slate-800 text-white text-xs rounded-lg shadow-lg z-10 max-w-[280px] border border-slate-700">
                    <div className="font-semibold mb-1">NOVA {group}: {getGroupLabel()}</div>
                    <div>{description}</div>
                    {isUltraProcessed && (
                        <div className="mt-2 pt-2 border-t border-slate-700 text-orange-400">
                            ⚠️ Highly processed food
                        </div>
                    )}
                    <div className="absolute bottom-0 left-4 transform translate-y-full">
                        <div className="border-4 border-transparent border-t-slate-800"></div>
                    </div>
                </div>
            )}
        </div>
    );
}

