"use client";

import { useState, useEffect } from "react";
import { Users, Trophy, TrendingUp, Share2, Plus, Award } from "lucide-react";
import { getChallenges, getBenchmarks, getSocialStats, Challenge, Benchmark } from "@/utils/api";
import { ChallengeCard } from "./ChallengeCard";
import { CreateChallengeModal } from "./CreateChallengeModal";
import { clsx } from "clsx";

export function SocialFeed() {
    const [challenges, setChallenges] = useState<Challenge[]>([]);
    const [benchmark, setBenchmark] = useState<Benchmark | null>(null);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"challenges" | "benchmarks">("challenges");
    const [showCreateModal, setShowCreateModal] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [challengesData, benchmarkData, statsData] = await Promise.all([
                getChallenges().then(data => data.challenges || []),
                getBenchmarks("completion_rate"),
                getSocialStats()
            ]);
            setChallenges(challengesData);
            setBenchmark(benchmarkData);
            setStats(statsData);
        } catch (error) {
            console.error("Failed to load social data:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                Loading social feed...
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Stats Overview - Enhanced */}
            {stats && (
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Your Stats</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700">
                            <div className="flex items-center gap-2 mb-2">
                                <TrendingUp size={18} className="text-primary-600 dark:text-primary-400" />
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Completion Rate</span>
                            </div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                {stats.completion_rate?.toFixed(1) || 0}%
                            </p>
                        </div>
                        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700">
                            <div className="flex items-center gap-2 mb-2">
                                <Award size={18} className="text-primary-600 dark:text-primary-400" />
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Current Streak</span>
                            </div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                {stats.current_streak || 0} days
                            </p>
                        </div>
                        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700">
                            <div className="flex items-center gap-2 mb-2">
                                <Trophy size={18} className="text-primary-600 dark:text-primary-400" />
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Items Completed</span>
                            </div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                {stats.total_items_completed || 0}
                            </p>
                        </div>
                        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700">
                            <div className="flex items-center gap-2 mb-2">
                                <Users size={18} className="text-primary-600 dark:text-primary-400" />
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Days Active</span>
                            </div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                {stats.total_days_active || 0}
                            </p>
                        </div>
                    </div>
                    {stats.average_items_per_day && (
                        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Average Items per Day</span>
                                <span className="text-lg font-bold text-gray-900 dark:text-white">
                                    {stats.average_items_per_day.toFixed(1)}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Benchmark Card */}
            {benchmark && (
                <div className="p-4 bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg text-white">
                    <div className="flex items-center gap-2 mb-2">
                        <Trophy size={20} />
                        <span className="font-semibold">Your Ranking</span>
                    </div>
                    <p className="text-lg mb-1">{benchmark.message}</p>
                    <div className="mt-3 bg-white/20 rounded-full h-2">
                        <div
                            className="bg-white rounded-full h-2 transition-all"
                            style={{ width: `${benchmark.percentile}%` }}
                        />
                    </div>
                    <p className="text-sm mt-2 opacity-90">
                        {benchmark.metric.replace("_", " ")}: {benchmark.value.toFixed(1)}
                    </p>
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 border-b dark:border-gray-700">
                <button
                    onClick={() => setActiveTab("challenges")}
                    className={clsx(
                        "px-4 py-2 font-medium transition-colors",
                        activeTab === "challenges"
                            ? "text-primary-600 dark:text-primary-400 border-b-2 border-primary-600 dark:border-primary-400"
                            : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                    )}
                >
                    Challenges
                </button>
                <button
                    onClick={() => setActiveTab("benchmarks")}
                    className={clsx(
                        "px-4 py-2 font-medium transition-colors",
                        activeTab === "benchmarks"
                            ? "text-primary-600 dark:text-primary-400 border-b-2 border-primary-600 dark:border-primary-400"
                            : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                    )}
                >
                    Benchmarks
                </button>
            </div>

            {/* Content */}
            {activeTab === "challenges" && (
                <div className="space-y-4">
                    {/* Create Challenge Button */}
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="w-full px-4 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
                    >
                        <Plus size={20} />
                        Create Challenge
                    </button>

                    {challenges.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                            <Trophy size={48} className="mx-auto mb-4 opacity-50" />
                            <p>No active challenges yet.</p>
                            <p className="text-sm mt-2">Create one to compete with friends!</p>
                        </div>
                    ) : (
                        challenges.map((challenge) => (
                            <ChallengeCard
                                key={challenge.id}
                                challenge={challenge}
                                onUpdate={loadData}
                            />
                        ))
                    )}
                </div>
            )}

            {activeTab === "benchmarks" && benchmark && (
                <div className="space-y-4">
                    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                            Your Performance
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between mb-2">
                                    <span className="text-sm text-gray-700 dark:text-gray-300">
                                        Completion Rate
                                    </span>
                                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                                        {benchmark.value.toFixed(1)}%
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                                    <div
                                        className="bg-primary-600 rounded-full h-3 transition-all"
                                        style={{ width: `${benchmark.percentile}%` }}
                                    />
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    Top {100 - benchmark.percentile}% of users
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Challenge Modal */}
            <CreateChallengeModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onCreated={loadData}
            />
        </div>
    );
}

