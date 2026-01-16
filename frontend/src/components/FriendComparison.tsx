"use client";

import { useState, useEffect } from "react";
import { TrendingUp, Award, Trophy, Users, Calendar, ArrowUp, ArrowDown, Minus } from "lucide-react";
import { getFriends, getSocialStats, getFriendProfile } from "@/utils/api";
import { clsx } from "clsx";

interface FriendStats {
    user_id: string;
    username: string;
    stats: {
        completion_rate: number;
        current_streak: number;
        total_items_completed: number;
        total_days_active: number;
        average_items_per_day: number;
    };
}

export function FriendComparison() {
    const [myStats, setMyStats] = useState<any>(null);
    const [friendStats, setFriendStats] = useState<FriendStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedFriend, setSelectedFriend] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [myStatsData, friendsData] = await Promise.all([
                getSocialStats(),
                getFriends()
            ]);
            
            setMyStats(myStatsData);
            
            // Load stats for all friends
            const friendStatsPromises = friendsData.friends.map(async (friend) => {
                try {
                    const profile = await getFriendProfile(friend.username || friend.id);
                    return {
                        user_id: friend.id,
                        username: friend.username || friend.id,
                        stats: profile.stats
                    };
                } catch (error) {
                    console.error(`Failed to load stats for ${friend.id}:`, error);
                    return null;
                }
            });
            
            const loadedStats = await Promise.all(friendStatsPromises);
            setFriendStats(loadedStats.filter((s): s is FriendStats => s !== null));
        } catch (error) {
            console.error("Failed to load comparison data:", error);
        } finally {
            setLoading(false);
        }
    };

    const getComparison = (myValue: number, friendValue: number) => {
        if (myValue > friendValue) {
            // Calculate percentage only if friendValue is not 0
            const percent = friendValue > 0 ? ((myValue - friendValue) / friendValue) * 100 : null;
            return { type: "better", diff: myValue - friendValue, percent };
        } else if (myValue < friendValue) {
            // Calculate percentage only if myValue is not 0
            const percent = myValue > 0 ? ((friendValue - myValue) / myValue) * 100 : null;
            return { type: "worse", diff: friendValue - myValue, percent };
        } else {
            return { type: "equal", diff: 0, percent: 0 };
        }
    };

    const formatComparison = (comparison: ReturnType<typeof getComparison>, isPercentage: boolean = false) => {
        if (comparison.type === "equal") {
            return <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1"><Minus size={14} />Tied</span>;
        }
        
        const diff = isPercentage 
            ? `${comparison.diff.toFixed(1)}%` 
            : comparison.diff.toFixed(0);
        
        // Only show percentage if it's a valid number (not null/Infinity)
        let percent = "";
        if (comparison.percent !== null && isFinite(comparison.percent) && comparison.percent > 0) {
            percent = ` (${comparison.percent.toFixed(0)}%)`;
        } else if (comparison.percent === null) {
            // Friend has 0, so we're ahead but can't calculate percentage
            percent = " (New)";
        }
        
        if (comparison.type === "better") {
            return (
                <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                    <ArrowUp size={14} />
                    +{diff}{percent}
                </span>
            );
        } else {
            return (
                <span className="text-red-600 dark:text-red-400 flex items-center gap-1">
                    <ArrowDown size={14} />
                    -{diff}{percent}
                </span>
            );
        }
    };

    if (loading) {
        return (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                Loading comparison data...
            </div>
        );
    }

    if (!myStats) {
        return (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                Failed to load your stats
            </div>
        );
    }

    if (friendStats.length === 0) {
        return (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                <Users size={48} className="mx-auto mb-4 opacity-50" />
                <p>No friends to compare with yet.</p>
                <p className="text-sm mt-2">Add friends to see how you stack up!</p>
            </div>
        );
    }

    // Calculate average friend stats
    const avgFriendStats = {
        completion_rate: friendStats.reduce((sum, f) => sum + f.stats.completion_rate, 0) / friendStats.length,
        current_streak: friendStats.reduce((sum, f) => sum + f.stats.current_streak, 0) / friendStats.length,
        total_items_completed: friendStats.reduce((sum, f) => sum + f.stats.total_items_completed, 0) / friendStats.length,
        total_days_active: friendStats.reduce((sum, f) => sum + f.stats.total_days_active, 0) / friendStats.length,
        average_items_per_day: friendStats.reduce((sum, f) => sum + f.stats.average_items_per_day, 0) / friendStats.length,
    };

    return (
        <div className="space-y-6">
            {/* Comparison with Average */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    You vs. Friends Average
                </h3>
                <div className="space-y-4">
                    {/* Completion Rate */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        <div className="flex items-center gap-2">
                            <TrendingUp size={18} className="text-primary-600 dark:text-primary-400" />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Completion Rate</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                {myStats.completion_rate?.toFixed(1) || 0}%
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                vs {avgFriendStats.completion_rate.toFixed(1)}%
                            </span>
                            {formatComparison(getComparison(myStats.completion_rate || 0, avgFriendStats.completion_rate), true)}
                        </div>
                    </div>

                    {/* Current Streak */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        <div className="flex items-center gap-2">
                            <Award size={18} className="text-primary-600 dark:text-primary-400" />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Current Streak</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                {myStats.current_streak || 0} days
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                vs {avgFriendStats.current_streak.toFixed(0)} days
                            </span>
                            {formatComparison(getComparison(myStats.current_streak || 0, avgFriendStats.current_streak))}
                        </div>
                    </div>

                    {/* Items Completed */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        <div className="flex items-center gap-2">
                            <Trophy size={18} className="text-primary-600 dark:text-primary-400" />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Items Completed</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                {myStats.total_items_completed || 0}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                vs {avgFriendStats.total_items_completed.toFixed(0)}
                            </span>
                            {formatComparison(getComparison(myStats.total_items_completed || 0, avgFriendStats.total_items_completed))}
                        </div>
                    </div>

                    {/* Days Active */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        <div className="flex items-center gap-2">
                            <Calendar size={18} className="text-primary-600 dark:text-primary-400" />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Days Active</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                {myStats.total_days_active || 0}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                vs {avgFriendStats.total_days_active.toFixed(0)}
                            </span>
                            {formatComparison(getComparison(myStats.total_days_active || 0, avgFriendStats.total_days_active))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Individual Friend Comparisons */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Compare with Individual Friends
                </h3>
                <div className="space-y-3">
                    {friendStats.map((friend) => {
                        const isSelected = selectedFriend === friend.user_id;
                        return (
                            <div
                                key={friend.user_id}
                                className={clsx(
                                    "p-4 rounded-lg border cursor-pointer transition-all",
                                    isSelected
                                        ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                                        : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 hover:border-primary-300 dark:hover:border-primary-700"
                                )}
                                onClick={() => setSelectedFriend(isSelected ? null : friend.user_id)}
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                                            {friend.username.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="font-medium text-gray-900 dark:text-white">
                                            @{friend.username}
                                        </span>
                                    </div>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                        {isSelected ? "Click to collapse" : "Click to expand"}
                                    </span>
                                </div>
                                
                                {isSelected && (
                                    <div className="space-y-2 mt-3 pt-3 border-t dark:border-gray-700">
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            <div>
                                                <span className="text-gray-600 dark:text-gray-400">Completion Rate</span>
                                                <div className="flex items-center justify-between mt-1">
                                                    <span className="font-semibold">{myStats.completion_rate?.toFixed(1) || 0}%</span>
                                                    <span className="text-xs text-gray-500">vs</span>
                                                    <span className="font-semibold">{friend.stats.completion_rate.toFixed(1)}%</span>
                                                    {formatComparison(getComparison(myStats.completion_rate || 0, friend.stats.completion_rate), true)}
                                                </div>
                                            </div>
                                            <div>
                                                <span className="text-gray-600 dark:text-gray-400">Streak</span>
                                                <div className="flex items-center justify-between mt-1">
                                                    <span className="font-semibold">{myStats.current_streak || 0}</span>
                                                    <span className="text-xs text-gray-500">vs</span>
                                                    <span className="font-semibold">{friend.stats.current_streak}</span>
                                                    {formatComparison(getComparison(myStats.current_streak || 0, friend.stats.current_streak))}
                                                </div>
                                            </div>
                                            <div>
                                                <span className="text-gray-600 dark:text-gray-400">Items</span>
                                                <div className="flex items-center justify-between mt-1">
                                                    <span className="font-semibold">{myStats.total_items_completed || 0}</span>
                                                    <span className="text-xs text-gray-500">vs</span>
                                                    <span className="font-semibold">{friend.stats.total_items_completed}</span>
                                                    {formatComparison(getComparison(myStats.total_items_completed || 0, friend.stats.total_items_completed))}
                                                </div>
                                            </div>
                                            <div>
                                                <span className="text-gray-600 dark:text-gray-400">Days Active</span>
                                                <div className="flex items-center justify-between mt-1">
                                                    <span className="font-semibold">{myStats.total_days_active || 0}</span>
                                                    <span className="text-xs text-gray-500">vs</span>
                                                    <span className="font-semibold">{friend.stats.total_days_active}</span>
                                                    {formatComparison(getComparison(myStats.total_days_active || 0, friend.stats.total_days_active))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

