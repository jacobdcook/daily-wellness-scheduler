"use client";

import { BottomNav } from "@/components/BottomNav";
import { User, Settings, Award, Users, Shield, Share2, Trophy } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SettingsPanel } from "@/components/SettingsPanel";
import { ShareModal } from "@/components/ShareModal";
import { defaultSettings, loadSettings } from "@/utils/api";
import type { UserSettings, Schedule } from "@/types";

export default function ProfilePage() {
    const { data: session } = useSession();
    const router = useRouter();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [settings, setSettings] = useState<UserSettings>(defaultSettings);
    const [schedule, setSchedule] = useState<Schedule | null>(null);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-gray-100">
            <header className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b dark:border-gray-800 fixed top-0 left-0 right-0 z-50">
                <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <User className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                        <h1 className="font-bold text-xl tracking-tight">Profile</h1>
                    </div>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4 py-8 pt-24 pb-24">
                <div className="space-y-6">
                    {/* User Info Card */}
                    <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border dark:border-gray-800">
                        <div className="flex items-center space-x-4">
                            <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                                {session?.user?.name?.charAt(0).toUpperCase() || "U"}
                            </div>
                            <div className="flex-1">
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                                    {session?.user?.name || "User"}
                                </h2>
                                <p className="text-gray-500 dark:text-gray-400 text-sm">
                                    {session?.user?.email || ""}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Share Progress Button - Prominent */}
                    <button
                        onClick={() => setIsShareModalOpen(true)}
                        className="w-full p-4 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl font-medium hover:from-primary-600 hover:to-primary-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 active:scale-95"
                    >
                        <Share2 className="w-5 h-5" />
                        Share Your Progress
                    </button>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-2 gap-4">
                        <button 
                            onClick={async () => {
                                const loadedSettings = await loadSettings();
                                setSettings(loadedSettings);
                                setIsSettingsOpen(true);
                            }}
                            className="p-4 bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left active:scale-95"
                        >
                            <Settings className="w-6 h-6 text-primary-600 dark:text-primary-400 mb-2" />
                            <p className="font-medium text-gray-900 dark:text-gray-100">Settings</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Manage preferences</p>
                        </button>
                        <button 
                            onClick={() => router.push("/achievements")}
                            className="p-4 bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left active:scale-95"
                        >
                            <Award className="w-6 h-6 text-primary-600 dark:text-primary-400 mb-2" />
                            <p className="font-medium text-gray-900 dark:text-gray-100">Achievements</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">View progress</p>
                        </button>
                        <button 
                            onClick={() => router.push("/social")}
                            className="p-4 bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left active:scale-95"
                        >
                            <Users className="w-6 h-6 text-primary-600 dark:text-primary-400 mb-2" />
                            <p className="font-medium text-gray-900 dark:text-gray-100">Social</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Friends & challenges</p>
                        </button>
                        <button 
                            onClick={() => router.push("/community")}
                            className="p-4 bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left active:scale-95"
                        >
                            <Trophy className="w-6 h-6 text-primary-600 dark:text-primary-400 mb-2" />
                            <p className="font-medium text-gray-900 dark:text-gray-100">Community</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Challenges & leaderboards</p>
                        </button>
                        <button 
                            onClick={() => router.push("/privacy")}
                            className="p-4 bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left active:scale-95"
                        >
                            <Shield className="w-6 h-6 text-primary-600 dark:text-primary-400 mb-2" />
                            <p className="font-medium text-gray-900 dark:text-gray-100">Privacy</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Data & security</p>
                        </button>
                    </div>


                    {/* Sign Out */}
                    <button
                        onClick={async (e) => {
                            e.preventDefault();
                            try {
                                await signOut({ callbackUrl: "/login" });
                            } catch (error) {
                                console.error('Logout failed:', error);
                                window.location.href = '/login';
                            }
                        }}
                        className="w-full p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                    >
                        Sign Out
                    </button>
                </div>
            </main>

            <SettingsPanel
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                settings={settings}
                schedule={schedule}
                onSave={async (newSettings) => {
                    setSettings(newSettings);
                    const { saveSettings } = await import("@/utils/api");
                    await saveSettings(newSettings);
                }}
                onRegenerate={async () => {
                    const { regenerateSchedule } = await import("@/utils/api");
                    const currentSettings = await loadSettings();
                    const result = await regenerateSchedule(currentSettings);
                    setSchedule(result.schedule);
                    if (result.warnings && result.warnings.length > 0) {
                        console.warn("Schedule generation warnings:", result.warnings);
                    }
                }}
                onScheduleUpdate={async () => {
                    const { getSchedule } = await import("@/utils/api");
                    const newSchedule = await getSchedule();
                    setSchedule(newSchedule);
                }}
            />

            <ShareModal
                isOpen={isShareModalOpen}
                onClose={() => setIsShareModalOpen(false)}
            />

            <BottomNav />
        </div>
    );
}

