"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Trophy, Users, Target, Calendar, TrendingUp, Crown } from "lucide-react";
import { 
    getChallenges, 
    getChallengeLeaderboard,
    Challenge,
    LeaderboardEntry
} from "@/utils/api";
import { BottomNav } from "@/components/BottomNav";
import { useToast } from "@/context/ToastContext";
import { format } from "date-fns";

export default function ChallengeDetailPage() {
    const router = useRouter();
    const params = useParams();
    const { showToast } = useToast();
    const challengeId = params.id as string;
    const [challenge, setChallenge] = useState<Challenge | null>(null);
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (challengeId) {
            loadChallengeData();
        }
    }, [challengeId]);

    const loadChallengeData = async () => {
        setLoading(true);
        try {
            const [challengesData, leaderboardData] = await Promise.all([
                getChallenges(),
                getChallengeLeaderboard(challengeId).catch(() => ({ leaderboard: [] }))
            ]);
            
            const foundChallenge = challengesData.challenges.find(c => c.id === challengeId);
            setChallenge(foundChallenge || null);
            setLeaderboard(leaderboardData.leaderboard || []);
        } catch (error) {
            console.error("Failed to load challenge:", error);
            showToast("Failed to load challenge", "error");
        } finally {
            setLoading(false);
        }
    };

    const getChallengeTypeIcon = (type: string) => {
        switch (type) {
            case "nutrition": return "🍎";
            case "water": return "💧";
            case "habits": return "✅";
            case "weight": return "⚖️";
            default: return "🎯";
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800 pb-20">
                <div className="max-w-4xl mx-auto px-4 py-6">
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-400"></div>
                        <p className="mt-4 text-gray-400">Loading challenge...</p>
                    </div>
                </div>
                <BottomNav />
            </div>
        );
    }

    if (!challenge) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800 pb-20">
                <div className="max-w-4xl mx-auto px-4 py-6">
                    <button
                        onClick={() => router.back()}
                        className="text-gray-400 hover:text-white transition-colors mb-4"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="bg-gray-800/50 rounded-lg p-12 border border-gray-700 text-center">
                        <p className="text-gray-400">Challenge not found</p>
                    </div>
                </div>
                <BottomNav />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800 pb-20">
            <div className="max-w-4xl mx-auto px-4 py-6">
                <button
                    onClick={() => router.back()}
                    className="text-gray-400 hover:text-white transition-colors mb-4"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>

                {/* Challenge Header */}
                <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700 mb-6">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <span className="text-4xl">{getChallengeTypeIcon(challenge.type)}</span>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className="text-2xl font-bold text-white">{challenge.name}</h1>
                                    {challenge.is_premium && (
                                        <Crown className="w-5 h-5 text-orange-400" />
                                    )}
                                </div>
                                <p className="text-sm text-gray-400 capitalize mt-1">{challenge.type} Challenge</p>
                            </div>
                        </div>
                    </div>
                    <p className="text-gray-300 mb-4">{challenge.description}</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-gray-900/50 rounded-lg p-3">
                            <div className="text-xs text-gray-400 mb-1">Goal</div>
                            <div className="text-white font-semibold">{challenge.goal}</div>
                        </div>
                        <div className="bg-gray-900/50 rounded-lg p-3">
                            <div className="text-xs text-gray-400 mb-1">Target</div>
                            <div className="text-white font-semibold">{challenge.target_value} {challenge.unit}</div>
                        </div>
                        <div className="bg-gray-900/50 rounded-lg p-3">
                            <div className="text-xs text-gray-400 mb-1">Start Date</div>
                            <div className="text-white font-semibold">{format(new Date(challenge.start_date), "MMM d")}</div>
                        </div>
                        <div className="bg-gray-900/50 rounded-lg p-3">
                            <div className="text-xs text-gray-400 mb-1">End Date</div>
                            <div className="text-white font-semibold">{format(new Date(challenge.end_date), "MMM d")}</div>
                        </div>
                    </div>
                </div>

                {/* Leaderboard */}
                <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-orange-400" />
                            <h2 className="text-xl font-semibold text-white">Leaderboard</h2>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                            <Users className="w-4 h-4" />
                            <span>{challenge.participants.length} participants</span>
                        </div>
                    </div>
                    {leaderboard.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-gray-400">No leaderboard data yet</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {leaderboard.map((entry, idx) => (
                                <div
                                    key={entry.user_id}
                                    className={`bg-gray-900/50 rounded-lg p-4 border ${
                                        idx < 3 ? "border-orange-500/50" : "border-gray-700"
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                                                idx === 0 ? "bg-yellow-500 text-white" :
                                                idx === 1 ? "bg-gray-400 text-white" :
                                                idx === 2 ? "bg-orange-600 text-white" :
                                                "bg-gray-700 text-gray-300"
                                            }`}>
                                                {idx < 3 ? "🏆" : entry.rank}
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-white">{entry.username}</h3>
                                                <p className="text-sm text-gray-400">Progress: {entry.progress.toFixed(1)}%</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-lg font-bold text-orange-400">{entry.score.toFixed(1)}%</div>
                                            <div className="text-xs text-gray-400">complete</div>
                                        </div>
                                    </div>
                                    <div className="mt-3 w-full bg-gray-700 rounded-full h-2">
                                        <div
                                            className="bg-gradient-to-r from-orange-500 to-orange-600 h-2 rounded-full transition-all"
                                            style={{ width: `${Math.min(entry.progress, 100)}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            <BottomNav />
        </div>
    );
}

