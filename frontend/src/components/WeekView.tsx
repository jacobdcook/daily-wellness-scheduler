"use client";

import { Schedule, UserSettings } from "@/types";
import { format, addDays, startOfWeek, isSameDay } from "date-fns";
import { clsx } from "clsx";

interface WeekViewProps {
    selectedDate: Date;
    schedule: Schedule | null;
    progress: Record<string, Record<string, number>>;
    settings: UserSettings;
}

export function WeekView({ selectedDate, schedule, progress }: WeekViewProps) {
    // Get start of week (Sunday)
    const start = startOfWeek(selectedDate);
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(start, i));

    if (!schedule) {
        return (
            <div className="text-center py-12 bg-white rounded-xl border border-dashed">
                <p className="text-gray-500">No schedule available.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                {weekDays.map((date) => {
                    const dateStr = format(date, "yyyy-MM-dd");
                    const dayItems = schedule[dateStr] || [];
                    const dayProgress = progress[dateStr] || {};
                    const isToday = isSameDay(date, new Date());
                    const isSelected = isSameDay(date, selectedDate);

                    // Sort items by time
                    const sortedItems = [...dayItems].sort((a, b) =>
                        new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime()
                    );

                    return (
                        <div
                            key={dateStr}
                            className={clsx(
                                "bg-white rounded-xl border p-3 flex flex-col h-full min-h-[200px]",
                                isToday ? "border-blue-300 ring-1 ring-blue-100" : "border-gray-200",
                                isSelected && !isToday ? "border-gray-400" : ""
                            )}
                        >
                            {/* Header */}
                            <div className={clsx(
                                "text-center pb-2 border-b mb-2",
                                isToday ? "text-blue-600" : "text-gray-900"
                            )}>
                                <div className="text-xs font-medium uppercase tracking-wider opacity-70">
                                    {format(date, "EEE")}
                                </div>
                                <div className="text-lg font-bold">
                                    {format(date, "d")}
                                </div>
                            </div>

                            {/* Items */}
                            <div className="flex-grow space-y-2 overflow-y-auto max-h-[400px] md:max-h-none">
                                {sortedItems.length > 0 ? (
                                    sortedItems.map((item, idx) => {
                                        const itemKey = `${item.item.name}-${idx}`;
                                        const state = dayProgress[itemKey] || 0; // 0=pending, 1=progress, 2=done

                                        return (
                                            <div
                                                key={idx}
                                                className={clsx(
                                                    "text-xs p-1.5 rounded border flex items-start gap-1.5",
                                                    state === 2
                                                        ? "bg-green-50 border-green-100 text-gray-500 line-through opacity-70"
                                                        : state === 1
                                                            ? "bg-orange-50 border-orange-100"
                                                            : "bg-gray-50 border-gray-100"
                                                )}
                                            >
                                                <div className={clsx(
                                                    "w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0",
                                                    state === 2 ? "bg-green-500" : state === 1 ? "bg-orange-400" : "bg-gray-300"
                                                )} />
                                                <div>
                                                    <div className="font-medium truncate leading-tight">
                                                        {item.item.name}
                                                    </div>
                                                    <div className="text-[10px] opacity-70 mt-0.5">
                                                        {format(new Date(item.scheduled_time), "h:mm a")}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="text-center text-xs text-gray-400 py-4 italic">
                                        Rest Day
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

