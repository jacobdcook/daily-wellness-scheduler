"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/BottomNav";
import { Heart, Activity, Moon, Droplets, TrendingUp, ArrowRight, UtensilsCrossed } from "lucide-react";

export default function WellnessPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-gray-100">
            <header className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b dark:border-gray-800 fixed top-0 left-0 right-0 z-50">
                <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <Heart className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                        <h1 className="font-bold text-xl tracking-tight">Wellness Hub</h1>
                    </div>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4 py-8 pt-24 pb-24">
                <div className="space-y-6">
                    <div className="text-center py-8 bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-800">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                            Track Your Wellness Journey
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400 mb-6">
                            Monitor health metrics, track nutrition, build habits, track sleep, and stay hydrated
                        </p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {/* Hydration - Already Implemented */}
                        <button
                            onClick={() => router.push("/water")}
                            className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl border border-blue-200 dark:border-blue-800 hover:shadow-lg transition-all group"
                        >
                            <Droplets className="w-8 h-8 text-blue-600 dark:text-blue-400 mx-auto mb-3 group-hover:scale-110 transition-transform" />
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Hydration</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Track daily water intake</p>
                            <div className="flex items-center justify-center text-blue-600 dark:text-blue-400 text-xs font-medium">
                                Open <ArrowRight className="w-3 h-3 ml-1" />
                            </div>
                        </button>

                        {/* Health Metrics - Implemented */}
                        <button
                            onClick={() => router.push("/health-metrics")}
                            className="p-6 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl border border-green-200 dark:border-green-800 hover:shadow-lg transition-all group"
                        >
                            <Activity className="w-8 h-8 text-green-600 dark:text-green-400 mx-auto mb-3 group-hover:scale-110 transition-transform" />
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Health Metrics</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Track weight, blood pressure, etc.</p>
                            <div className="flex items-center justify-center text-green-600 dark:text-green-400 text-xs font-medium">
                                Open <ArrowRight className="w-3 h-3 ml-1" />
                            </div>
                        </button>

                        {/* Habits - Implemented */}
                        <button
                            onClick={() => router.push("/habits")}
                            className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl border border-purple-200 dark:border-purple-800 hover:shadow-lg transition-all group"
                        >
                            <TrendingUp className="w-8 h-8 text-purple-600 dark:text-purple-400 mx-auto mb-3 group-hover:scale-110 transition-transform" />
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Habits</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Build and track daily habits</p>
                            <div className="flex items-center justify-center text-purple-600 dark:text-purple-400 text-xs font-medium">
                                Open <ArrowRight className="w-3 h-3 ml-1" />
                            </div>
                        </button>

                        {/* Sleep - Implemented */}
                        <button
                            onClick={() => router.push("/sleep")}
                            className="p-6 bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 rounded-xl border border-indigo-200 dark:border-indigo-800 hover:shadow-lg transition-all group"
                        >
                            <Moon className="w-8 h-8 text-indigo-600 dark:text-indigo-400 mx-auto mb-3 group-hover:scale-110 transition-transform" />
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Sleep</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Track sleep quality & duration</p>
                            <div className="flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-xs font-medium">
                                Open <ArrowRight className="w-3 h-3 ml-1" />
                            </div>
                        </button>

                        {/* Nutrition - Implemented */}
                        <button
                            onClick={() => router.push("/nutrition")}
                            className="p-6 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-xl border border-orange-200 dark:border-orange-800 hover:shadow-lg transition-all group"
                        >
                            <UtensilsCrossed className="w-8 h-8 text-orange-600 dark:text-orange-400 mx-auto mb-3 group-hover:scale-110 transition-transform" />
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Nutrition</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Track calories & macros</p>
                            <div className="flex items-center justify-center text-orange-600 dark:text-orange-400 text-xs font-medium">
                                Open <ArrowRight className="w-3 h-3 ml-1" />
                            </div>
                        </button>
                    </div>

                    <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-xs text-blue-800 dark:text-blue-300 font-medium mb-2">💡 How it works:</p>
                        <p className="text-xs text-blue-700 dark:text-blue-400">
                            <strong>Schedule tab</strong> = Your daily calendar (supplements, meditation, workouts, meals - all time-based items)<br/>
                            <strong>Wellness tab</strong> = Health tracking hub (metrics, trends, goals, journal, long-term progress)
                        </p>
                    </div>
                </div>
            </main>

            <BottomNav />
        </div>
    );
}

