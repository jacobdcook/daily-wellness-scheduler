"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, User, TrendingUp, Calendar, CheckCircle, Award } from "lucide-react";
import { getFriendProfile, FriendProfile } from "@/utils/api";
import { useSession } from "next-auth/react";

export default function FriendProfilePage() {
    const params = useParams();
    const router = useRouter();
    const { data: session } = useSession();
    const userId = params?.userId as string;
    
    const [profile, setProfile] = useState<FriendProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!userId) return;
        
        async function loadProfile() {
            try {
                setLoading(true);
                setError(null);
                const profileData = await getFriendProfile(userId);
                setProfile(profileData);
            } catch (err: any) {
                setError(err.message || "Failed to load profile");
            } finally {
                setLoading(false);
            }
        }
        
        loadProfile();
    }, [userId]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-gray-100">
                <div className="max-w-3xl mx-auto px-4 py-8 pt-24 pb-24">
                    <div className="space-y-4">
                        <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                        <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
                        <div className="grid grid-cols-2 gap-4">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="h-32 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-gray-100">
                <div className="max-w-3xl mx-auto px-4 py-8 pt-24 pb-24">
                    <button
                        onClick={() => router.back()}
                        className="mb-4 flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                    >
                        <ArrowLeft size={20} />
                        Back
                    </button>
                    <div className="bg-white dark:bg-gray-900 rounded-xl p-8 border dark:border-gray-800 text-center">
                        <p className="text-red-600 dark:text-red-400 mb-4">{error || "Profile not found"}</p>
                        <button
                            onClick={() => router.push("/social")}
                            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                        >
                            Go to Social
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const stats = profile.stats;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-gray-100">
            <div className="max-w-3xl mx-auto px-4 py-8 pt-24 pb-24">
                {/* Back Button */}
                <button
                    onClick={() => router.back()}
                    className="mb-6 flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                >
                    <ArrowLeft size={20} />
                    Back
                </button>

                {/* Profile Header */}
                <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border dark:border-gray-800 mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-20 h-20 bg-primary-600 rounded-full flex items-center justify-center text-white text-3xl font-bold">
                            {profile.display_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                                {profile.display_name}
                            </h1>
                            <p className="text-gray-500 dark:text-gray-400 text-sm">
                                {profile.is_friend ? "Friend" : "User"}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    {/* Completion Rate */}
                    <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border dark:border-gray-800">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {stats.completion_rate.toFixed(1)}%
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Completion Rate</p>
                            </div>
                        </div>
                    </div>

                    {/* Current Streak */}
                    <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border dark:border-gray-800">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                                <Award className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {stats.current_streak}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Day Streak</p>
                            </div>
                        </div>
                    </div>

                    {/* Total Items Completed */}
                    <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border dark:border-gray-800">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                                <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {stats.total_items_completed}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Items Completed</p>
                            </div>
                        </div>
                    </div>

                    {/* Days Active */}
                    <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border dark:border-gray-800">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                                <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {stats.total_days_active}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Days Active</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Additional Stats */}
                <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border dark:border-gray-800">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Activity Summary</h2>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600 dark:text-gray-400">Average Items per Day</span>
                            <span className="font-semibold text-gray-900 dark:text-white">
                                {stats.average_items_per_day.toFixed(1)}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600 dark:text-gray-400">Total Items Completed</span>
                            <span className="font-semibold text-gray-900 dark:text-white">
                                {stats.total_items_completed}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600 dark:text-gray-400">Current Streak</span>
                            <span className="font-semibold text-gray-900 dark:text-white">
                                {stats.current_streak} {stats.current_streak === 1 ? "day" : "days"}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

