"use client";

import { Award, AlertTriangle } from "lucide-react";

interface HealthData {
    health_score?: number;
    health_grade?: string;
    nutri_score?: {
        grade?: string;
        description?: string;
    };
    nova?: {
        group?: number;
        description?: string;
    };
    additives?: {
        has_harmful?: boolean;
        total?: number;
    };
    recommendation?: string;
}

interface FoodHealthBadgeProps {
    health?: HealthData;
    size?: "sm" | "md" | "lg";
    showLabel?: boolean;
}

export function FoodHealthBadge({ health, size = "md", showLabel = true }: FoodHealthBadgeProps) {
    if (!health || health.health_score === undefined) {
        return null;
    }

    const score = health.health_score;
    const grade = health.health_grade || getGradeFromScore(score);

    // Determine color based on score
    const getColorClasses = () => {
        if (score >= 80) return "bg-green-600 text-white border-green-500";
        if (score >= 60) return "bg-yellow-600 text-white border-yellow-500";
        if (score >= 40) return "bg-orange-600 text-white border-orange-500";
        return "bg-red-600 text-white border-red-500";
    };

    // Size classes
    const sizeClasses = {
        sm: "text-xs px-2 py-1",
        md: "text-sm px-3 py-1.5",
        lg: "text-base px-4 py-2"
    };

    return (
        <div className={`inline-flex items-center gap-1.5 rounded-full border-2 shadow-lg transition-all hover:scale-105 ${getColorClasses()} ${sizeClasses[size]}`}>
            <Award className={`${size === "sm" ? "w-3 h-3" : size === "md" ? "w-4 h-4" : "w-5 h-5"}`} />
            {showLabel && (
                <span className="font-bold">
                    {score}/100
                </span>
            )}
            {!showLabel && (
                <span className="font-bold text-lg">{grade}</span>
            )}
        </div>
    );
}

function getGradeFromScore(score: number): string {
    if (score >= 80) return "A";
    if (score >= 60) return "B";
    if (score >= 40) return "C";
    if (score >= 20) return "D";
    return "E";
}

