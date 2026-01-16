"use client";

import { BottomNav } from "@/components/BottomNav";
import { Shield, Download, Trash2, Database, Lock, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { exportSchedule, getPrivacySettings, updatePrivacySettings, deleteAccount, PrivacySettings } from "@/utils/api";
import { useToast } from "@/context/ToastContext";

export default function PrivacyPage() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const { showToast } = useToast();
    const [exporting, setExporting] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({
        profile_visibility: "private",
        progress_sharing: true,
        show_in_search: true,
        allow_friend_requests: true,
    });
    const [originalSettings, setOriginalSettings] = useState<PrivacySettings | null>(null);
    const [loadingSettings, setLoadingSettings] = useState(true);
    const [saving, setSaving] = useState(false);
    const loading = status === "loading";

    useEffect(() => {
        loadPrivacySettings();
    }, []);

    const loadPrivacySettings = async () => {
        try {
            setLoadingSettings(true);
            const settings = await getPrivacySettings();
            setPrivacySettings(settings);
            setOriginalSettings(settings);
        } catch (error) {
            console.error("Failed to load privacy settings:", error);
        } finally {
            setLoadingSettings(false);
        }
    };

    const handlePrivacyChange = (key: keyof PrivacySettings, value: any) => {
        const updated = { ...privacySettings, [key]: value };
        setPrivacySettings(updated);
    };

    const handleSaveSettings = async () => {
        try {
            setSaving(true);
            await updatePrivacySettings(privacySettings);
            setOriginalSettings(privacySettings);
            showToast("Privacy settings saved", "success");
        } catch (error: any) {
            console.error("Failed to save privacy settings:", error);
            showToast(error.message || "Failed to save privacy settings", "error");
            // Revert on error
            if (originalSettings) {
                setPrivacySettings(originalSettings);
            }
        } finally {
            setSaving(false);
        }
    };

    const hasUnsavedChanges = originalSettings && JSON.stringify(privacySettings) !== JSON.stringify(originalSettings);

    const handleExportData = async () => {
        try {
            setExporting(true);
            await exportSchedule("json");
            showToast("Data exported successfully", "success");
        } catch (error: any) {
            console.error("Failed to export data:", error);
            showToast(error.message || "Failed to export data", "error");
        } finally {
            setExporting(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (!confirm("Are you sure you want to delete your account? This action cannot be undone and will delete all your data.")) {
            return;
        }
        
        const confirmation = prompt("This will permanently delete ALL your data including schedules, progress, and settings. Type 'DELETE' to confirm:");
        if (confirmation !== "DELETE") {
            showToast("Account deletion cancelled", "info");
            return;
        }

        try {
            setDeleting(true);
            await deleteAccount();
            showToast("Account deleted successfully. Redirecting to login...", "success");
            // Redirect to login after a short delay
            setTimeout(() => {
                window.location.href = "/login";
            }, 2000);
        } catch (error: any) {
            console.error("Failed to delete account:", error);
            showToast(error.message || "Failed to delete account", "error");
        } finally {
            setDeleting(false);
        }
    };

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
                            <Shield className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                            <h1 className="font-bold text-xl tracking-tight">Privacy & Data</h1>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4 py-8 pt-24 pb-24">
                {loading ? (
                    <div className="space-y-6">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="bg-white dark:bg-gray-900 rounded-xl p-6 border dark:border-gray-800 animate-pulse">
                                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-2"></div>
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-6">
                    {/* Data Storage */}
                    <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border dark:border-gray-800">
                        <div className="flex items-center space-x-3 mb-4">
                            <Database className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Data Storage</h2>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            Your data is stored locally on your device and on our servers. We use industry-standard encryption to protect your information.
                        </p>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <div>
                                    <p className="font-medium text-gray-900 dark:text-gray-100">User ID</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{session?.user?.email || "N/A"}</p>
                                </div>
                                <Lock className="w-4 h-4 text-gray-400" />
                            </div>
                        </div>
                    </div>

                    {/* Data Export */}
                    <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border dark:border-gray-800">
                        <div className="flex items-center space-x-3 mb-4">
                            <Download className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Export Your Data</h2>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            Download a copy of all your data including schedules, progress, and settings.
                        </p>
                        <button
                            onClick={handleExportData}
                            disabled={exporting}
                            className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            <Download className="w-4 h-4" />
                            {exporting ? "Exporting..." : "Export All Data"}
                        </button>
                    </div>

                    {/* Privacy Settings */}
                    <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border dark:border-gray-800">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-3">
                                <Eye className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Privacy Settings</h2>
                            </div>
                            {hasUnsavedChanges && (
                                <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">Unsaved changes</span>
                            )}
                        </div>
                        {loadingSettings ? (
                            <div className="space-y-4">
                                <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
                                <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-gray-100">Profile Visibility</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Control who can see your profile</p>
                                    </div>
                                    <select
                                        value={privacySettings.profile_visibility}
                                        onChange={(e) => handlePrivacyChange("profile_visibility", e.target.value)}
                                        disabled={saving}
                                        className="px-3 py-1 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm disabled:opacity-50"
                                    >
                                        <option value="private">Private</option>
                                        <option value="friends_only">Friends Only</option>
                                        <option value="public">Public</option>
                                    </select>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-gray-100">Progress Sharing</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Allow friends to see your progress</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={privacySettings.progress_sharing}
                                            onChange={(e) => handlePrivacyChange("progress_sharing", e.target.checked)}
                                            disabled={saving}
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600 disabled:opacity-50"></div>
                                    </label>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-gray-100">Show in Search</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Allow others to find you in search</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={privacySettings.show_in_search}
                                            onChange={(e) => handlePrivacyChange("show_in_search", e.target.checked)}
                                            disabled={saving}
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600 disabled:opacity-50"></div>
                                    </label>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-gray-100">Allow Friend Requests</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Let others send you friend requests</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={privacySettings.allow_friend_requests}
                                            onChange={(e) => handlePrivacyChange("allow_friend_requests", e.target.checked)}
                                            disabled={saving}
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600 disabled:opacity-50"></div>
                                    </label>
                                </div>
                            </div>
                        )}
                        {!loadingSettings && (
                            <button
                                onClick={handleSaveSettings}
                                disabled={saving || !hasUnsavedChanges}
                                className="w-full mt-4 px-4 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {saving ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Shield className="w-4 h-4" />
                                        Save Privacy Settings
                                    </>
                                )}
                            </button>
                        )}
                    </div>

                    {/* Account Deletion */}
                    <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6 border border-red-200 dark:border-red-800">
                        <div className="flex items-center space-x-3 mb-4">
                            <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                            <h2 className="text-lg font-semibold text-red-900 dark:text-red-100">Danger Zone</h2>
                        </div>
                        <p className="text-sm text-red-700 dark:text-red-300 mb-4">
                            Permanently delete your account and all associated data. This action cannot be undone.
                        </p>
                        <button
                            onClick={handleDeleteAccount}
                            disabled={deleting}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {deleting ? "Deleting..." : "Delete Account"}
                        </button>
                    </div>
                </div>
                )}
            </main>

            <BottomNav />
        </div>
    );
}

