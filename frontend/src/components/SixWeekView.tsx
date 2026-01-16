"use client";

import { Schedule } from "@/types";
import { format, addDays, startOfWeek, isSameDay, addWeeks, startOfDay } from "date-fns";
import { clsx } from "clsx";
import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

interface SixWeekViewProps {
    schedule: Schedule | null;
    progress: Record<string, Record<string, number>>;
}

export function SixWeekView({ schedule, progress }: SixWeekViewProps) {
    const [expandedWeeks, setExpandedWeeks] = useState<Record<number, boolean>>({ 0: true });

    if (!schedule) {
        return (
            <div className="text-center py-12 bg-white rounded-xl border border-dashed">
                <p className="text-gray-500">No schedule available.</p>
            </div>
        );
    }

    // Calculate 6 weeks starting from today (or start of current week)
    const today = startOfDay(new Date());
    const start = startOfWeek(today);

    const weeks = Array.from({ length: 6 }, (_, w) => {
        const weekStart = addWeeks(start, w);
        const days = Array.from({ length: 7 }, (_, d) => addDays(weekStart, d));
        return { weekNum: w + 1, start: weekStart, days };
    });

    const toggleWeek = (weekIndex: number) => {
        setExpandedWeeks(prev => ({
            ...prev,
            [weekIndex]: !prev[weekIndex]
        }));
    };

    return (
        <div className="space-y-4">
            {weeks.map((week, weekIdx) => {
                const isExpanded = expandedWeeks[weekIdx];
                const weekLabel = `Week ${week.weekNum} (${format(week.start, "MMM d")} - ${format(addDays(week.start, 6), "MMM d")})`;

                return (
                    <div key={weekIdx} className="bg-white rounded-xl border overflow-hidden">
                        {/* Week Header */}
                        <button
                            onClick={() => toggleWeek(weekIdx)}
                            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                        >
                            <div className="font-medium text-gray-900">{weekLabel}</div>
                            {isExpanded ? <ChevronDown size={20} className="text-gray-500" /> : <ChevronRight size={20} className="text-gray-500" />}
                        </button>

                        {/* Week Content */}
                        {isExpanded && (
                            <div className="p-4 border-t bg-gray-50">
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-7 gap-3">
                                    {week.days.map((date) => {
                                        const dateStr = format(date, "yyyy-MM-dd");
                                        const dayItems = schedule[dateStr] || [];
                                        const dayProgress = progress[dateStr] || {};
                                        const isToday = isSameDay(date, today);

                                        const total = dayItems.length;
                                        const completed = Object.values(dayProgress).filter(v => v === 2).length;

                                        return (
                                            <div
                                                key={dateStr}
                                                className={clsx(
                                                    "bg-white p-3 rounded-lg border text-sm",
                                                    isToday ? "border-blue-300 ring-1 ring-blue-100" : "border-gray-200"
                                                )}
                                            >
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="font-medium text-gray-700">{format(date, "EEE d")}</span>
                                                    {total > 0 && (
                                                        <span className={clsx(
                                                            "text-[10px] px-1.5 py-0.5 rounded-full",
                                                            completed === total ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                                                        )}>
                                                            {completed}/{total}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="space-y-1">
                                                    {dayItems.slice(0, 3).map((item, i) => (
                                                        <div key={i} className="truncate text-gray-500 text-xs">
                                                            • {item.item.name}
                                                        </div>
                                                    ))}
                                                    {dayItems.length > 3 && (
                                                        <div className="text-xs text-blue-500 font-medium pt-1">
                                                            + {dayItems.length - 3} more
                                                        </div>
                                                    )}
                                                    {dayItems.length === 0 && (
                                                        <div className="text-gray-400 italic">Rest</div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

