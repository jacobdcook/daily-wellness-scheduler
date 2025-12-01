import { ScheduledItem } from "@/types";
import { Check, Clock, Info } from "lucide-react";
import { useState } from "react";
import { clsx } from "clsx";

interface ScheduleCardProps {
    item: ScheduledItem;
}

export function ScheduleCard({ item }: ScheduleCardProps) {
    const [status, setStatus] = useState<"pending" | "done">("pending");

    const toggleStatus = () => {
        setStatus(status === "pending" ? "done" : "pending");
    };

    const time = new Date(item.scheduled_time).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
    });

    return (
        <div
            className={clsx(
                "flex items-center p-4 rounded-xl border transition-all duration-200",
                status === "done"
                    ? "bg-green-50 border-green-200 opacity-70"
                    : "bg-white border-gray-100 shadow-sm hover:shadow-md"
            )}
        >
            <button
                onClick={toggleStatus}
                className={clsx(
                    "flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center mr-4 transition-colors",
                    status === "done"
                        ? "bg-green-500 border-green-500 text-white"
                        : "border-gray-300 hover:border-green-400 text-transparent"
                )}
            >
                <Check size={16} strokeWidth={3} />
            </button>

            <div className="flex-grow">
                <div className="flex items-center text-sm text-gray-500 mb-1">
                    <Clock size={14} className="mr-1" />
                    <span className={status === "done" ? "line-through" : ""}>{time}</span>
                </div>
                <h3
                    className={clsx(
                        "font-semibold text-lg",
                        status === "done" ? "text-gray-500 line-through" : "text-gray-900"
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
