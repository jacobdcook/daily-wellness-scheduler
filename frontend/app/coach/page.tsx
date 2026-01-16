"use client";

import { AICoachDashboard } from "@/components/AICoachDashboard";
import { BottomNav } from "@/components/BottomNav";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function CoachPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800 pb-20">
            <div className="max-w-4xl mx-auto px-4 py-6">
                <div className="flex items-center gap-4 mb-6">
                    <button
                        onClick={() => router.back()}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-2xl font-bold text-white">AI Coach</h1>
                </div>
                <AICoachDashboard />
            </div>
            <BottomNav />
        </div>
    );
}

