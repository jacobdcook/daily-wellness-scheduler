"use client";

import { BottomNav } from "@/components/BottomNav";
import { AnalyticsDashboard } from "@/components/AnalyticsDashboard";
import { InsightsPanel } from "@/components/InsightsPanel";
import { ChatInterface } from "@/components/ChatInterface";
import { ShareModal } from "@/components/ShareModal";
import { useEffect, useState } from "react";
import { getInsights, getStats } from "@/utils/api";
import { BarChart3, ArrowLeft, Share2 } from "lucide-react";
import { useRouter } from "next/navigation";

const CHAT_EVENT = "wellness-chat-open";

export default function InsightsPage() {
    const router = useRouter();
    const [insights, setInsights] = useState<any>(null);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);

    const handleAskAi = (message?: string, autoSend: boolean = false) => {
        if (typeof window === "undefined") return;
        window.dispatchEvent(new CustomEvent(CHAT_EVENT, { 
            detail: { message: message && message.trim() ? message : undefined, autoSend } 
        }));
    };

    useEffect(() => {
        async function loadData() {
            try {
                const [insightsData, statsData] = await Promise.all([
                    getInsights(),
                    getStats()
                ]);
                setInsights(insightsData);
                setStats(statsData);
            } catch (error) {
                console.error("Failed to load insights", error);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-gray-100">
            <header className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b dark:border-gray-800 fixed top-0 left-0 right-0 z-50">
                <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={() => router.back()}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        </button>
                        <div className="flex items-center space-x-2">
                            <BarChart3 className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                            <h1 className="font-bold text-xl tracking-tight">Insights</h1>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsShareModalOpen(true)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors flex items-center gap-2 text-primary-600 dark:text-primary-400"
                    >
                        <Share2 className="w-5 h-5" />
                        <span className="hidden sm:inline font-medium">Share</span>
                    </button>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-8 pt-24 pb-24">
                {loading ? (
                    <div className="space-y-6">
                        {/* Loading Skeletons */}
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="bg-white dark:bg-gray-900 rounded-xl p-6 border dark:border-gray-800 animate-pulse">
                                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
                                <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Analytics Dashboard */}
                        <AnalyticsDashboard />

                        {/* AI Insights Panel */}
                        {insights && (
                            <div className="mt-8">
                                <InsightsPanel
                                    correlations={insights.correlations || []}
                                    prediction={insights.prediction}
                                    recommendations={insights.recommendations}
                                    trends={insights.trends}
                                    patterns={insights.patterns}
                                    onAskAi={handleAskAi}
                                />
                            </div>
                        )}
                    </div>
                )}
            </main>

            <ChatInterface />
            <ShareModal
                isOpen={isShareModalOpen}
                onClose={() => setIsShareModalOpen(false)}
            />
            <BottomNav />
        </div>
    );
}

