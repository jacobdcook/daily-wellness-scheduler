"use client";

import { BottomNav } from "@/components/BottomNav";
import { SocialFeed } from "@/components/SocialFeed";
import { FriendList } from "@/components/FriendList";
import { FriendComparison } from "@/components/FriendComparison";
import { Users, Trophy, ArrowLeft, BarChart3 } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SocialPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<"friends" | "feed" | "compare">("friends");

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-gray-100">
            <header className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b dark:border-gray-800 fixed top-0 left-0 right-0 z-50">
                <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={() => router.back()}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        </button>
                        <div className="flex items-center space-x-2">
                            <Users className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                            <h1 className="font-bold text-xl tracking-tight">Social</h1>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4 py-8 pt-24 pb-24">
                {/* Tab Navigation */}
                <div className="flex bg-gray-100 dark:bg-gray-900 p-1 rounded-xl mb-6">
                    <button
                        onClick={() => setActiveTab("friends")}
                        className={`flex-1 px-3 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm ${
                            activeTab === "friends"
                                ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm"
                                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                        }`}
                    >
                        <Users size={16} />
                        Friends
                    </button>
                    <button
                        onClick={() => setActiveTab("feed")}
                        className={`flex-1 px-3 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm ${
                            activeTab === "feed"
                                ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm"
                                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                        }`}
                    >
                        <Trophy size={16} />
                        Challenges
                    </button>
                    <button
                        onClick={() => setActiveTab("compare")}
                        className={`flex-1 px-3 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm ${
                            activeTab === "compare"
                                ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm"
                                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                        }`}
                    >
                        <BarChart3 size={16} />
                        Compare
                    </button>
                </div>

                {/* Content */}
                {activeTab === "friends" && <FriendList />}
                {activeTab === "feed" && <SocialFeed />}
                {activeTab === "compare" && <FriendComparison />}
            </main>

            <BottomNav />
        </div>
    );
}

