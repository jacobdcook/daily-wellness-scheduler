"use client";

import { Info } from "lucide-react";
import { useState } from "react";

interface NutriScoreDisplayProps {
    grade?: string;
    description?: string;
    size?: "sm" | "md" | "lg";
    showDescription?: boolean;
}

export function NutriScoreDisplay({ 
    grade, 
    description, 
    size = "md",
    showDescription = false 
}: NutriScoreDisplayProps) {
    const [showTooltip, setShowTooltip] = useState(false);

    if (!grade) {
        return null;
    }

    const gradeUpper = grade.toUpperCase();

    // Nutri-Score color scheme (EU standard)
    const getColorClasses = () => {
        switch (gradeUpper) {
            case "A":
                return "bg-[#0E7F61] text-white border-[#0E7F61]"; // Dark green
            case "B":
                return "bg-[#85BB2F] text-white border-[#85BB2F]"; // Light green
            case "C":
                return "bg-[#FECB02] text-black border-[#FECB02]"; // Yellow
            case "D":
                return "bg-[#EE8100] text-white border-[#EE8100]"; // Orange
            case "E":
                return "bg-[#E63E11] text-white border-[#E63E11]"; // Red
            default:
                return "bg-slate-600 text-white border-slate-500";
        }
    };

    const sizeClasses = {
        sm: "text-xs w-8 h-8",
        md: "text-sm w-10 h-10",
        lg: "text-base w-12 h-12"
    };

    return (
        <div className="relative inline-flex items-center gap-2">
            <div 
                className={`flex items-center justify-center rounded border-2 font-bold ${getColorClasses()} ${sizeClasses[size]}`}
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
            >
                {gradeUpper}
            </div>
            
            {showDescription && description && (
                <div className="text-xs text-gray-400 max-w-[200px]">
                    {description}
                </div>
            )}

            {showTooltip && description && (
                <div className="absolute bottom-full left-0 mb-2 px-3 py-2 bg-slate-800 text-white text-xs rounded-lg shadow-lg z-10 max-w-[250px] border border-slate-700">
                    <div className="font-semibold mb-1">Nutri-Score: {gradeUpper}</div>
                    <div>{description}</div>
                    <div className="absolute bottom-0 left-4 transform translate-y-full">
                        <div className="border-4 border-transparent border-t-slate-800"></div>
                    </div>
                </div>
            )}
        </div>
    );
}

