"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Trophy, Users, Award, TrendingUp, Plus, Crown, Target, Calendar, Zap } from "lucide-react";
import { 
    getChallenges, 
    getMyChallenges, 
    joinChallenge, 
    getLeaderboard, 
    getUserPoints, 
    getUserAchievements,
    Challenge,
    LeaderboardEntry,
    Achievement
} from "@/utils/api";
import { BottomNav } from "@/components/BottomNav";
import { useToast } from "@/context/ToastContext";
import { format } from "date-fns";

type Tab = "challenges" | "leaderboard" | "achievements";

export default function CommunityPage() {
    const router = useRouter();
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState<Tab>("challenges");
    const [challenges, setChallenges] = useState<Challenge[]>([]);
    const [myChallenges, setMyChallenges] = useState<Challenge[]>([]);
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [achievements, setAchievements] = useState<Achievement[]>([]);
    const [points, setPoints] = useState({ points: 0, level: 1, points_to_next_level: 100 });
    const [loading, setLoading] = useState(true);
    const [leaderboardType, setLeaderboardType] = useState<"global" | "friends">("global");

    useEffect(() => {
        loadData();
    }, [activeTab, leaderboardType]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (activeTab === "challenges") {
                const [allChallenges, myChallengesData] = await Promise.all([
                    getChallenges().catch(() => ({ challenges: [] })),
                    getMyChallenges().catch(() => ({ challenges: [] }))
                ]);
                setChallenges(allChallenges.challenges || []);
                setMyChallenges(myChallengesData.challenges || []);
            } else if (activeTab === "leaderboard") {
                const leaderboardData = await getLeaderboard(leaderboardType);
                setLeaderboard(leaderboardData.leaderboard || []);
            } else if (activeTab === "achievements") {
                const [achievementsData, pointsData] = await Promise.all([
                    getUserAchievements().catch(() => ({ achievements: [] })),
                    getUserPoints().catch(() => ({ points: 0, level: 1, points_to_next_level: 100 }))
                ]);
                setAchievements(achievementsData.achievements || []);
                setPoints(pointsData);
            }
        } catch (error) {
            console.error("Failed to load community data:", error);
            showToast("Failed to load community data", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleJoinChallenge = async (challengeId: string) => {
        try {
            await joinChallenge(challengeId);
            showToast("Joined challenge!", "success");
            loadData();
        } catch (error) {
            showToast("Failed to join challenge", "error");
        }
    };

    const isParticipating = (challengeId: string) => {
        return myChallenges.some(c => c.id === challengeId);
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

    if (loading && activeTab === "challenges") {
        return (
            <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800 pb-20">
                <div className="max-w-4xl mx-auto px-4 py-6">
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-400"></div>
                        <p className="mt-4 text-gray-400">Loading challenges...</p>
                    </div>
                </div>
                <BottomNav />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800 pb-20">
            <div className="max-w-4xl mx-auto px-4 py-6">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-white mb-2">Community</h1>
                    <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-orange-400" />
                            <span className="text-gray-300">{points.points} points</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Trophy className="w-4 h-4 text-yellow-400" />
                            <span className="text-gray-300">Level {points.level}</span>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 border-b border-orange-500/20 mb-6 overflow-x-auto">
                    <button
                        onClick={() => setActiveTab("challenges")}
                        className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
                            activeTab === "challenges"
                                ? "text-orange-400 border-b-2 border-orange-400"
                                : "text-gray-400 hover:text-white"
                        }`}
                    >
                        <Target className="w-4 h-4 inline mr-2" />
                        Challenges
                    </button>
                    <button
                        onClick={() => setActiveTab("leaderboard")}
                        className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
                            activeTab === "leaderboard"
                                ? "text-orange-400 border-b-2 border-orange-400"
                                : "text-gray-400 hover:text-white"
                        }`}
                    >
                        <TrendingUp className="w-4 h-4 inline mr-2" />
                        Leaderboard
                    </button>
                    <button
                        onClick={() => setActiveTab("achievements")}
                        className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
                            activeTab === "achievements"
                                ? "text-orange-400 border-b-2 border-orange-400"
                                : "text-gray-400 hover:text-white"
                        }`}
                    >
                        <Award className="w-4 h-4 inline mr-2" />
                        Achievements
                    </button>
                </div>

                {/* Tab Content */}
                {activeTab === "challenges" && (
                    <div className="space-y-6">
                        {/* My Challenges */}
                        {myChallenges.length > 0 && (
                            <div>
                                <h2 className="text-xl font-semibold text-white mb-4">My Challenges</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {myChallenges.map((challenge) => (
                                        <div
                                            key={challenge.id}
                                            onClick={() => router.push(`/community/challenge/${challenge.id}`)}
                                            className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 hover:border-orange-500/50 transition-colors cursor-pointer"
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-2xl">{getChallengeTypeIcon(challenge.type)}</span>
                                                    <h3 className="font-semibold text-white">{challenge.name}</h3>
                                                </div>
                                                {challenge.is_premium && (
                                                    <Crown className="w-4 h-4 text-orange-400" />
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-400 mb-3">{challenge.description}</p>
                                            <div className="flex items-center gap-4 text-xs text-gray-500">
                                                <span className="flex items-center gap-1">
                                                    <Users className="w-3 h-3" />
                                                    {challenge.participants.length} participants
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {format(new Date(challenge.end_date), "MMM d")}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* All Challenges */}
                        <div>
                            <h2 className="text-xl font-semibold text-white mb-4">Available Challenges</h2>
                            {challenges.length === 0 ? (
                                <div className="bg-gray-800/50 rounded-lg p-12 border border-gray-700 text-center">
                                    <Target className="w-16 h-16 text-gray-600 mx-auto mb-4 opacity-50" />
                                    <p className="text-gray-400">No challenges available yet</p>
                                    <p className="text-sm text-gray-500 mt-2">Check back soon for new challenges!</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {challenges.map((challenge) => {
                                        const participating = isParticipating(challenge.id);
                                        return (
                                            <div
                                                key={challenge.id}
                                                className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 hover:border-orange-500/50 transition-colors"
                                            >
                                                <div className="flex items-start justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-2xl">{getChallengeTypeIcon(challenge.type)}</span>
                                                        <h3 className="font-semibold text-white">{challenge.name}</h3>
                                                    </div>
                                                    {challenge.is_premium && (
                                                        <Crown className="w-4 h-4 text-orange-400" />
                                                    )}
                                                </div>
                                                <p className="text-sm text-gray-400 mb-3">{challenge.description}</p>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-4 text-xs text-gray-500">
                                                        <span className="flex items-center gap-1">
                                                            <Users className="w-3 h-3" />
                                                            {challenge.participants.length}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Calendar className="w-3 h-3" />
                                                            {format(new Date(challenge.end_date), "MMM d")}
                                                        </span>
                                                    </div>
                                                    {participating ? (
                                                        <button
                                                            onClick={() => router.push(`/community/challenge/${challenge.id}`)}
                                                            className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded-lg text-sm font-medium"
                                                        >
                                                            View
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleJoinChallenge(challenge.id)}
                                                            className="px-3 py-1 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors"
                                                        >
                                                            Join
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === "leaderboard" && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold text-white">Leaderboard</h2>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setLeaderboardType("global")}
                                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                                        leaderboardType === "global"
                                            ? "bg-orange-500 text-white"
                                            : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                                    }`}
                                >
                                    Global
                                </button>
                                <button
                                    onClick={() => setLeaderboardType("friends")}
                                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                                        leaderboardType === "friends"
                                            ? "bg-orange-500 text-white"
                                            : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                                    }`}
                                >
                                    Friends
                                </button>
                            </div>
                        </div>
                        {loading ? (
                            <div className="text-center py-12">
                                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-400"></div>
                            </div>
                        ) : leaderboard.length === 0 ? (
                            <div className="bg-gray-800/50 rounded-lg p-12 border border-gray-700 text-center">
                                <TrendingUp className="w-16 h-16 text-gray-600 mx-auto mb-4 opacity-50" />
                                <p className="text-gray-400">No leaderboard data yet</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {leaderboard.map((entry, idx) => (
                                    <div
                                        key={entry.user_id}
                                        className={`bg-gray-800/50 rounded-lg p-4 border ${
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
                                                    <p className="text-sm text-gray-400">Level {Math.floor(entry.score / 100) + 1}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-lg font-bold text-orange-400">{entry.score.toLocaleString()}</div>
                                                <div className="text-xs text-gray-400">points</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === "achievements" && (
                    <div className="space-y-6">
                        {/* Points & Level */}
                        <div className="bg-gradient-to-r from-orange-500/20 to-orange-600/20 rounded-lg p-6 border border-orange-500/30">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h2 className="text-xl font-semibold text-white mb-1">Your Progress</h2>
                                    <p className="text-sm text-gray-300">Level {points.level} • {points.points} points</p>
                                </div>
                                <Trophy className="w-12 h-12 text-orange-400" />
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-3">
                                <div
                                    className="bg-gradient-to-r from-orange-500 to-orange-600 h-3 rounded-full transition-all"
                                    style={{ width: `${(points.points / (points.level * points.level * 100)) * 100}%` }}
                                />
                            </div>
                            <p className="text-xs text-gray-400 mt-2">
                                {points.points_to_next_level} points to next level
                            </p>
                        </div>

                        {/* Achievements */}
                        <div>
                            <h2 className="text-xl font-semibold text-white mb-4">Achievements</h2>
                            {achievements.length === 0 ? (
                                <div className="bg-gray-800/50 rounded-lg p-12 border border-gray-700 text-center">
                                    <Award className="w-16 h-16 text-gray-600 mx-auto mb-4 opacity-50" />
                                    <p className="text-gray-400">No achievements yet</p>
                                    <p className="text-sm text-gray-500 mt-2">Complete challenges and track your wellness to earn achievements!</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {achievements.map((achievement) => (
                                        <div
                                            key={achievement.id}
                                            className="bg-gray-800/50 rounded-lg p-4 border border-gray-700"
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="text-3xl">{achievement.icon}</div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h3 className="font-semibold text-white">{achievement.name}</h3>
                                                        <span className={`text-xs px-2 py-1 rounded ${
                                                            achievement.rarity === "legendary" ? "bg-purple-500/20 text-purple-400" :
                                                            achievement.rarity === "epic" ? "bg-blue-500/20 text-blue-400" :
                                                            achievement.rarity === "rare" ? "bg-green-500/20 text-green-400" :
                                                            "bg-gray-500/20 text-gray-400"
                                                        }`}>
                                                            {achievement.rarity}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-gray-400 mb-2">{achievement.description}</p>
                                                    {achievement.unlocked_at && (
                                                        <p className="text-xs text-gray-500">
                                                            Unlocked {format(new Date(achievement.unlocked_at), "MMM d, yyyy")}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
            <BottomNav />
        </div>
    );
}

