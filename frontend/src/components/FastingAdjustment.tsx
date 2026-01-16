"use client";

import { useState, useEffect } from "react";
import { AlertCircle, Clock } from "lucide-react";
import { getFastingAdjustment } from "@/utils/api";

interface FastingAdjustmentProps {
    settings: any;
}

export function FastingAdjustment({ settings }: FastingAdjustmentProps) {
    const [adjustment, setAdjustment] = useState<any>(null);

    useEffect(() => {
        if (settings.fasting === "yes") {
            loadAdjustment();
        }
    }, [settings.fasting]);

    const loadAdjustment = async () => {
        try {
            const data = await getFastingAdjustment();
            setAdjustment(data);
        } catch (error) {
            console.error("Failed to load fasting adjustment", error);
        }
    };

    if (!adjustment || !adjustment.suggestion || adjustment.suggestion === "maintain") {
        return null;
    }

    return (
        <div className={`mb-6 p-4 rounded-xl border ${
            adjustment.suggestion === "break_early" 
                ? "bg-orange-50 border-orange-200" 
                : "bg-blue-50 border-blue-200"
        }`}>
            <div className="flex items-start gap-3">
                <AlertCircle size={20} className={`mt-0.5 ${
                    adjustment.suggestion === "break_early" ? "text-orange-600" : "text-blue-600"
                }`} />
                <div className="flex-grow">
                    <h4 className="font-semibold text-gray-900 mb-1">Fasting Adjustment Suggestion</h4>
                    <p className="text-sm text-gray-700 mb-2">{adjustment.reason}</p>
                    {adjustment.suggested_window && (
                        <div className="flex items-center gap-2 text-sm">
                            <Clock size={14} className="text-gray-500" />
                            <span className="text-gray-600">
                                Suggested window: <span className="font-semibold">{adjustment.suggested_window}</span>
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

