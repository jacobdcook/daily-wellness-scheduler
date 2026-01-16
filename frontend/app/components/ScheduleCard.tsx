import { ScheduledItem } from "@/types";
import { Check, Clock, Info, Circle } from "lucide-react";
import { useState, useEffect } from "react";
import { clsx } from "clsx";

export type ItemState = "pending" | "in_progress" | "completed";

interface ScheduleCardProps {
    item: ScheduledItem;
    state: ItemState;
    onStateChange: (newState: ItemState) => void;
}

export function ScheduleCard({ item, state, onStateChange }: ScheduleCardProps) {
    const toggleStatus = () => {
        // Cycle: pending -> in_progress -> completed -> pending
        if (state === "pending") {
            onStateChange("in_progress");
        } else if (state === "in_progress") {
            onStateChange("completed");
        } else {
            onStateChange("pending");
        }
    };

    const time = new Date(item.scheduled_time).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
    });

    return (
        <div
            className={clsx(
                "flex items-center p-4 rounded-xl border transition-all duration-200",
                state === "completed"
                    ? "bg-green-50 border-green-200 opacity-70"
                    : state === "in_progress"
                    ? "bg-orange-50 border-orange-200 shadow-md"
                    : "bg-white border-gray-100 shadow-sm hover:shadow-md"
            )}
        >
            <button
                onClick={toggleStatus}
                className={clsx(
                    "flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center mr-4 transition-colors",
                    state === "completed"
                        ? "bg-green-500 border-green-500 text-white"
                        : state === "in_progress"
                        ? "bg-orange-400 border-orange-400 text-white"
                        : "border-gray-300 hover:border-green-400 text-transparent"
                )}
                aria-label={`Status: ${state}`}
            >
                {state === "completed" && <Check size={16} strokeWidth={3} />}
                {state === "in_progress" && <div className="w-3 h-3 bg-white rounded-full" />}
            </button>

            <div className="flex-grow">
                <div className="flex items-center text-sm text-gray-500 mb-1">
                    <Clock size={14} className="mr-1" />
                    <span className={state === "completed" ? "line-through" : ""}>{time}</span>
                </div>
                <h3
                    className={clsx(
                        "font-semibold text-lg",
                        state === "completed" ? "text-gray-500 line-through" : "text-gray-900"
                    )}
                >
                    {item.item.name}
                </h3>
                <p className="text-gray-600 text-sm">{item.item.dose}</p>
                {item.item.notes && (
                    <div className="flex items-start mt-2 text-xs text-blue-600 bg-blue-50 p-2 rounded-md">
                        <Info size={12} className="mr-1 mt-0.5 flex-shrink-0" />
                        {item.item.notes}
                    </div>
                )}
            </div>
        </div>
    );
}
