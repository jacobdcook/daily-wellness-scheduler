"use client";

import { useState, useEffect } from "react";
import { X, Trophy, Users, Globe, UserPlus } from "lucide-react";
import { createChallenge, Challenge, getFriends, FriendsData } from "@/utils/api";
import { useToast } from "@/context/ToastContext";

interface CreateChallengeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated: () => void;
}

export function CreateChallengeModal({ isOpen, onClose, onCreated }: CreateChallengeModalProps) {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [friends, setFriends] = useState<FriendsData | null>(null);
    const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        challengeType: "completion_rate" as "completion_rate" | "streak" | "items_completed",
        targetValue: 80,
        durationDays: 7,
        isGlobal: false,
    });

    useEffect(() => {
        if (isOpen) {
            loadFriends();
        }
    }, [isOpen]);

    const loadFriends = async () => {
        try {
            const friendsData = await getFriends();
            setFriends(friendsData);
        } catch (error) {
            console.error("Failed to load friends:", error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.name.trim()) {
            showToast("Please enter a challenge name", "error");
            return;
        }

        if (formData.targetValue <= 0) {
            showToast("Target value must be greater than 0", "error");
            return;
        }

        if (formData.durationDays <= 0) {
            showToast("Duration must be at least 1 day", "error");
            return;
        }

        try {
            setLoading(true);
            await createChallenge({
                name: formData.name,
                description: formData.description,
                type: formData.challengeType,
                target_value: formData.targetValue,
                duration_days: formData.durationDays,
                is_global: formData.isGlobal,
                friend_ids: selectedFriends.length > 0 ? selectedFriends : undefined
            } as any);
            showToast("Challenge created successfully!", "success");
            onCreated();
            onClose();
            // Reset form
            setFormData({
                name: "",
                description: "",
                challengeType: "completion_rate",
                targetValue: 80,
                durationDays: 7,
                isGlobal: false,
            });
            setSelectedFriends([]);
        } catch (error: any) {
            console.error("Failed to create challenge:", error);
            showToast(error.message || "Failed to create challenge", "error");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[10000] overflow-hidden flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />

            <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-4 border-b dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-10">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Trophy size={20} />
                        Create Challenge
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Challenge Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Challenge Name *
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g., 7-Day Completion Challenge"
                            className="w-full px-4 py-2 border dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-white"
                            required
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Description
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Describe your challenge..."
                            rows={3}
                            className="w-full px-4 py-2 border dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-white"
                        />
                    </div>

                    {/* Challenge Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Challenge Type *
                        </label>
                        <select
                            value={formData.challengeType}
                            onChange={(e) => setFormData({ ...formData, challengeType: e.target.value as any })}
                            className="w-full px-4 py-2 border dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-white"
                        >
                            <option value="completion_rate">Completion Rate (%)</option>
                            <option value="streak">Streak (days)</option>
                            <option value="items_completed">Items Completed (count)</option>
                        </select>
                    </div>

                    {/* Target Value */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Target Value *
                        </label>
                        <input
                            type="number"
                            value={formData.targetValue}
                            onChange={(e) => setFormData({ ...formData, targetValue: parseFloat(e.target.value) || 0 })}
                            min="1"
                            step={formData.challengeType === "completion_rate" ? "1" : "1"}
                            className="w-full px-4 py-2 border dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-white"
                            required
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {formData.challengeType === "completion_rate" && "Target completion percentage (e.g., 80)"}
                            {formData.challengeType === "streak" && "Target streak in days (e.g., 7)"}
                            {formData.challengeType === "items_completed" && "Target number of items (e.g., 100)"}
                        </p>
                    </div>

                    {/* Duration */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Duration (days) *
                        </label>
                        <input
                            type="number"
                            value={formData.durationDays}
                            onChange={(e) => setFormData({ ...formData, durationDays: parseInt(e.target.value) || 7 })}
                            min="1"
                            max="365"
                            className="w-full px-4 py-2 border dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-white"
                            required
                        />
                    </div>

                    {/* Invite Friends */}
                    {!formData.isGlobal && friends && friends.friends.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                <UserPlus size={16} className="inline mr-1" />
                                Invite Friends (Optional)
                            </label>
                            <div className="max-h-32 overflow-y-auto border dark:border-gray-700 rounded-lg p-2 space-y-2">
                                {friends.friends.map((friend) => (
                                    <label
                                        key={friend.id}
                                        className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded cursor-pointer"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedFriends.includes(friend.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedFriends([...selectedFriends, friend.id]);
                                                } else {
                                                    setSelectedFriends(selectedFriends.filter(id => id !== friend.id));
                                                }
                                            }}
                                            className="w-4 h-4 text-primary-600 rounded"
                                        />
                                        <span className="text-sm text-gray-700 dark:text-gray-300">
                                            {friend.username || friend.display_name || friend.email || friend.id}
                                        </span>
                                    </label>
                                ))}
                            </div>
                            {selectedFriends.length > 0 && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {selectedFriends.length} friend{selectedFriends.length !== 1 ? 's' : ''} selected
                                </p>
                            )}
                        </div>
                    )}

                    {/* Global Challenge */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="flex items-center gap-2">
                            <Globe size={18} className="text-gray-600 dark:text-gray-400" />
                            <div>
                                <p className="font-medium text-gray-900 dark:text-gray-100">Global Challenge</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Make this challenge visible to all users</p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={formData.isGlobal}
                                onChange={(e) => {
                                    setFormData({ ...formData, isGlobal: e.target.checked });
                                    if (e.target.checked) {
                                        setSelectedFriends([]); // Clear friend selection when global is enabled
                                    }
                                }}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                        </label>
                    </div>

                    {/* Submit Buttons */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? "Creating..." : "Create Challenge"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

