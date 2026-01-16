"use client";

import { useState } from "react";
import { Trophy, Users, Calendar, Target, TrendingUp, UserPlus, BarChart3 } from "lucide-react";
import { Challenge, joinChallenge, getChallengeLeaderboard, LeaderboardEntry } from "@/utils/api";
import { clsx } from "clsx";
import { useToast } from "@/context/ToastContext";

interface ChallengeCardProps {
    challenge: Challenge;
    onUpdate?: () => void;
}

export function ChallengeCard({ challenge, onUpdate }: ChallengeCardProps) {
    const { showToast } = useToast();
    const [joining, setJoining] = useState(false);
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
    
    const progress = challenge.user_progress || 0;
    const percentage = challenge.user_percentage || 0;
    const isCompleted = percentage >= 100;
    const isParticipant = challenge.is_participant === true; // Explicitly check if user is a participant

    const formatValue = (value: number, type: string) => {
        if (type === "completion_rate") {
            return `${value.toFixed(1)}%`;
        } else if (type === "streak") {
            return `${value} days`;
        } else {
            return value.toString();
        }
    };

    const handleJoin = async () => {
        try {
            setJoining(true);
            await joinChallenge(challenge.id);
            showToast("Joined challenge successfully! 🎉", "success");
            if (onUpdate) onUpdate();
        } catch (error: any) {
            showToast(error.message || "Failed to join challenge", "error");
        } finally {
            setJoining(false);
        }
    };

    const handleShowLeaderboard = async () => {
        if (showLeaderboard) {
            setShowLeaderboard(false);
            return;
        }
        
        try {
            setLoadingLeaderboard(true);
            const data = await getChallengeLeaderboard(challenge.id);
            setLeaderboard(data.leaderboard);
            setShowLeaderboard(true);
        } catch (error: any) {
            showToast(error.message || "Failed to load leaderboard", "error");
        } finally {
            setLoadingLeaderboard(false);
        }
    };

    return (
        <div className={clsx(
            "p-4 rounded-lg border transition-all",
            isCompleted
                ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
        )}>
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <Trophy size={18} className={clsx(
                            isCompleted ? "text-green-600 dark:text-green-400" : "text-primary-600 dark:text-primary-400"
                        )} />
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                            {challenge.name}
                        </h3>
                        {challenge.is_global && (
                            <span className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                                Global
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {challenge.description}
                    </p>
                </div>
            </div>

            <div className="space-y-3">
                {/* Progress Bar */}
                <div>
                    <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700 dark:text-gray-300">
                            Your Progress
                        </span>
                        <span className="font-medium text-gray-900 dark:text-white">
                            {formatValue(progress, challenge.type)} / {formatValue(challenge.target_value, challenge.type)}
                        </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                        <div
                            className={clsx(
                                "rounded-full h-3 transition-all",
                                isCompleted
                                    ? "bg-green-600"
                                    : "bg-primary-600"
                            )}
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {percentage.toFixed(1)}% complete
                    </p>
                </div>

                {/* Challenge Info */}
                <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                        <Target size={14} />
                        <span>{challenge.type.replace("_", " ")}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Users size={14} />
                        <span>{challenge.participants.length} participants</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Calendar size={14} />
                        <span>
                            {new Date(challenge.end_date).toLocaleDateString()}
                        </span>
                    </div>
                </div>

                {isCompleted && (
                    <div className="mt-2 p-2 bg-green-100 dark:bg-green-900/30 rounded text-sm text-green-800 dark:text-green-300 flex items-center gap-2">
                        <Trophy size={16} />
                        <span className="font-medium">Challenge Completed! 🎉</span>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 mt-3">
                    {!isParticipant && (
                        <button
                            onClick={handleJoin}
                            disabled={joining}
                            className="flex-1 px-3 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            <UserPlus size={16} />
                            {joining ? "Joining..." : "Join Challenge"}
                        </button>
                    )}
                    {isParticipant && (
                        <button
                            onClick={handleShowLeaderboard}
                            disabled={loadingLeaderboard}
                            className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            <BarChart3 size={16} />
                            {loadingLeaderboard ? "Loading..." : showLeaderboard ? "Hide Leaderboard" : "View Leaderboard"}
                        </button>
                    )}
                </div>

                {/* Leaderboard */}
                {showLeaderboard && leaderboard.length > 0 && (
                    <div className="mt-4 pt-4 border-t dark:border-gray-700">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Leaderboard</h4>
                        <div className="space-y-2">
                            {leaderboard.map((entry, index) => (
                                <div
                                    key={entry.user_id}
                                    className={clsx(
                                        "flex items-center justify-between p-2 rounded-lg",
                                        (entry as any).is_current_user
                                            ? "bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800"
                                            : "bg-gray-50 dark:bg-gray-800"
                                    )}
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-gray-500 dark:text-gray-400 w-6">
                                            #{index + 1}
                                        </span>
                                        <span className={clsx(
                                            "text-sm font-medium",
                                            (entry as any).is_current_user
                                                ? "text-primary-700 dark:text-primary-300"
                                                : "text-gray-700 dark:text-gray-300"
                                        )}>
                                            {entry.username} {(entry as any).is_current_user && "(You)"}
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                            {formatValue(entry.progress, challenge.type)}
                                        </span>
                                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                                            {((entry as any).percentage || 0).toFixed(1)}%
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

