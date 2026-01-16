"use client";

import { useState, useEffect } from "react";
import { Star, Zap, Moon, Smile } from "lucide-react";
import { clsx } from "clsx";

interface DailyCheckInProps {
    date: string;
    initialData?: { energy: number; mood: number; sleep: number };
    onSave: (data: { energy: number; mood: number; sleep: number }) => void;
}

export function DailyCheckIn({ date, initialData, onSave }: DailyCheckInProps) {
    const [ratings, setRatings] = useState({ energy: 0, mood: 0, sleep: 0 });

    useEffect(() => {
        if (initialData) setRatings(initialData);
    }, [initialData]);

    const handleRate = (category: 'energy' | 'mood' | 'sleep', value: number) => {
        const newRatings = { ...ratings, [category]: value };
        setRatings(newRatings);
        onSave(newRatings);
    };

    const renderStars = (category: 'energy' | 'mood' | 'sleep', icon: React.ReactNode) => (
        <div className="flex flex-col gap-2 items-center sm:items-start">
            <div className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                {icon}
                <span>{category}</span>
            </div>
            <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((val) => (
                    <button
                        key={val}
                        onClick={() => handleRate(category, val)}
                        className={clsx(
                            "p-2 rounded transition-all hover:scale-110 active:scale-95",
                            ratings[category] >= val ? "text-yellow-400" : "text-gray-200 dark:text-gray-700 hover:text-gray-300 dark:hover:text-gray-500"
                        )}
                        title={`${val}/5`}
                    >
                        <Star size={24} className="sm:w-[18px] sm:h-[18px]" fill={ratings[category] >= val ? "currentColor" : "none"} />
                    </button>
                ))}
            </div>
        </div>
    );

    return (
        <div className="card-surface mb-6 space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="font-bold text-gray-900 dark:text-white">Daily Check-in</h3>
                <span className="chip bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">How do you feel?</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-4">
                {renderStars('energy', <Zap size={14} className="text-orange-500" />)}
                {renderStars('mood', <Smile size={14} className="text-blue-500" />)}
                {renderStars('sleep', <Moon size={14} className="text-purple-500" />)}
            </div>
        </div>
    );
}

