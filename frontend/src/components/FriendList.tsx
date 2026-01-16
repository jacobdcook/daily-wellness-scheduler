"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, UserCheck, UserX, Users, Send, Check, X, Search, Shield, ShieldOff, Eye } from "lucide-react";
import { getFriends, sendFriendRequest, acceptFriendRequest, declineFriendRequest, cancelFriendRequest, blockUser, unblockUser, removeFriend, searchUsers, UserSearchResult, FriendsData, Friend, getUsername } from "@/utils/api";
import { clsx } from "clsx";

interface FriendListProps {
    onFriendSelect?: (friendId: string) => void;
}

export function FriendList({ onFriendSelect }: FriendListProps) {
    const router = useRouter();
    const [friendsData, setFriendsData] = useState<FriendsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [userSearchQuery, setUserSearchQuery] = useState("");
    const [requestingUserId, setRequestingUserId] = useState<string | null>(null);
    const [addFriendEmail, setAddFriendEmail] = useState("");
    const [showAddFriend, setShowAddFriend] = useState(false);
    const [addingFriend, setAddingFriend] = useState(false);
    const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
    const [searching, setSearching] = useState(false);
    const [showSearchResults, setShowSearchResults] = useState(false);

    useEffect(() => {
        loadFriends();
    }, []);

    const loadFriends = async () => {
        try {
            setLoading(true);
            const data = await getFriends();
            setFriendsData(data);
        } catch (error) {
            console.error("Failed to load friends:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSendRequest = async (targetUserId: string) => {
        try {
            setRequestingUserId(targetUserId);
            await sendFriendRequest(targetUserId);
            await loadFriends();
            // Refresh search results to update relationship status
            if (userSearchQuery) {
                handleSearchUsers(userSearchQuery);
            }
        } catch (error: any) {
            const errorMessage = error?.message || error?.toString() || "Failed to send friend request";
            alert(errorMessage);
        } finally {
            setRequestingUserId(null);
        }
    };

    const handleAcceptRequest = async (fromUserId: string) => {
        try {
            await acceptFriendRequest(fromUserId);
            await loadFriends();
            setShowSearchResults(false);
        } catch (error: any) {
            alert(error.message || "Failed to accept friend request");
        }
    };

    const handleDeclineRequest = async (fromUserId: string) => {
        try {
            await declineFriendRequest(fromUserId);
            await loadFriends();
            setShowSearchResults(false);
        } catch (error: any) {
            alert(error.message || "Failed to decline friend request");
        }
    };

    const handleCancelRequest = async (targetUserId: string) => {
        try {
            await cancelFriendRequest(targetUserId);
            await loadFriends();
            setShowSearchResults(false);
        } catch (error: any) {
            alert(error.message || "Failed to cancel friend request");
        }
    };

    const handleBlockUser = async (targetUserId: string) => {
        if (!confirm(`Are you sure you want to block ${targetUserId}? They won't be able to send you friend requests.`)) {
            return;
        }
        try {
            await blockUser(targetUserId);
            await loadFriends();
            setShowSearchResults(false);
            // Refresh search results if search is active
            if (userSearchQuery) {
                handleSearchUsers(userSearchQuery);
            }
        } catch (error: any) {
            alert(error.message || "Failed to block user");
        }
    };

    const handleUnblockUser = async (targetUserId: string) => {
        try {
            await unblockUser(targetUserId);
            await loadFriends();
            // Refresh search results if search is active
            if (userSearchQuery) {
                handleSearchUsers(userSearchQuery);
            }
        } catch (error: any) {
            alert(error.message || "Failed to unblock user");
        }
    };

    const handleRemoveFriend = async (friendId: string) => {
        if (!confirm(`Are you sure you want to remove ${friendId} as a friend?`)) {
            return;
        }
        try {
            await removeFriend(friendId);
            await loadFriends();
        } catch (error: any) {
            alert(error.message || "Failed to remove friend");
        }
    };

    const handleSearchUsers = async (query: string) => {
        if (!query || query.length < 2) {
            setSearchResults([]);
            setShowSearchResults(false);
            return;
        }

        try {
            setSearching(true);
            const results = await searchUsers(query);
            setSearchResults(results);
            setShowSearchResults(true);
        } catch (error) {
            console.error("Failed to search users:", error);
            setSearchResults([]);
        } finally {
            setSearching(false);
        }
    };

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (userSearchQuery) {
                handleSearchUsers(userSearchQuery);
            } else {
                setSearchResults([]);
                setShowSearchResults(false);
            }
        }, 300); // Debounce search

        return () => clearTimeout(timeoutId);
    }, [userSearchQuery]);

    if (loading) {
        return (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                Loading friends...
            </div>
        );
    }

    if (!friendsData) {
        return null;
    }

    const filteredFriends = friendsData.friends.filter(friend =>
        friend.id.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleAddFriend = async () => {
        if (!addFriendEmail.trim()) {
            alert("Please enter an email address");
            return;
        }
        
        try {
            setAddingFriend(true);
            await handleSendRequest(addFriendEmail.trim());
            setAddFriendEmail("");
            setShowAddFriend(false);
        } catch (error: any) {
            alert(error.message || "Failed to send friend request");
        } finally {
            setAddingFriend(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Add Friend Section */}
            <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border dark:border-gray-800">
                {!showAddFriend ? (
                    <button
                        onClick={() => setShowAddFriend(true)}
                        className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
                    >
                        <UserPlus className="w-4 h-4" />
                        Add Friend
                    </button>
                ) : (
                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Friend's Email or User ID
                            </label>
                            <input
                                type="text"
                                placeholder="Enter email or user ID"
                                value={addFriendEmail}
                                onChange={(e) => setAddFriendEmail(e.target.value)}
                                onKeyPress={(e) => e.key === "Enter" && handleAddFriend()}
                                className="w-full px-4 py-2 border dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-white"
                                autoFocus
                            />
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleAddFriend}
                                disabled={addingFriend || !addFriendEmail.trim()}
                                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {addingFriend ? "Sending..." : "Send Request"}
                            </button>
                            <button
                                onClick={() => {
                                    setShowAddFriend(false);
                                    setAddFriendEmail("");
                                }}
                                className="px-4 py-2 border dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Search Users */}
            <div className="space-y-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Search for users by email..."
                        value={userSearchQuery}
                        onChange={(e) => setUserSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-white"
                    />
                </div>
                
                {/* Search Results */}
                {showSearchResults && userSearchQuery && (
                    <div className="bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-800 p-4 max-h-96 overflow-y-auto">
                        {searching ? (
                            <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                                Searching...
                            </div>
                        ) : searchResults.length === 0 ? (
                            <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                                No users found
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                    Search Results
                                </h4>
                                {searchResults.map((user) => (
                                    <div
                                        key={user.user_id}
                                        className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg flex items-center justify-between"
                                    >
                                        <div className="flex-1">
                                            <p className="font-medium text-gray-900 dark:text-white">
                                                @{user.username || user.display_name}
                                            </p>
                                            <div className="flex gap-4 mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                <span>{user.completion_rate.toFixed(1)}% complete</span>
                                                <span>{user.current_streak} day streak</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            {user.relationship === "none" && (
                                                <button
                                                    onClick={() => handleSendRequest(user.user_id)}
                                                    disabled={requestingUserId === user.user_id}
                                                    className="px-3 py-1 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                                                >
                                                    {requestingUserId === user.user_id ? "Sending..." : "Add"}
                                                </button>
                                            )}
                                            {user.relationship === "friend" && (
                                                <span className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-sm rounded-lg">
                                                    Friends
                                                </span>
                                            )}
                                            {user.relationship === "pending_sent" && (
                                                <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 text-sm rounded-lg">
                                                    Pending
                                                </span>
                                            )}
                                            {user.relationship === "pending_received" && (
                                                <>
                                                    <button
                                                        onClick={() => handleAcceptRequest(user.user_id)}
                                                        className="p-1.5 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
                                                        title="Accept"
                                                    >
                                                        <Check size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeclineRequest(user.user_id)}
                                                        className="p-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                                        title="Decline"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </>
                                            )}
                                            {user.relationship !== "self" && (
                                                <button
                                                    onClick={() => handleBlockUser(user.user_id)}
                                                    className="p-1.5 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
                                                    title="Block"
                                                >
                                                    <Shield size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Search Friends (existing friends only) */}
            {!showSearchResults && (
                <div>
                    <input
                        type="text"
                        placeholder="Search your friends..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-4 py-2 border dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-white"
                    />
                </div>
            )}

            {/* Pending Received Requests */}
            {friendsData.pending_received.length > 0 && (
                <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                        <UserPlus size={18} />
                        Pending Requests ({friendsData.pending_received.length})
                    </h3>
                    <div className="space-y-2">
                        {friendsData.pending_received.map((request) => (
                            <div
                                key={request.id}
                                className="p-3 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg flex items-center justify-between"
                            >
                                <span className="text-gray-900 dark:text-white">{request.id}</span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleAcceptRequest(request.id)}
                                        className="p-2 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
                                    >
                                        <Check size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDeclineRequest(request.id)}
                                        className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                        title="Decline"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Friends List */}
            <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <Users size={18} />
                    Friends ({friendsData.friends.length})
                </h3>
                {filteredFriends.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                        <Users size={48} className="mx-auto mb-4 opacity-50" />
                        <p>No friends yet.</p>
                        <p className="text-sm mt-2">Add friends to compete in challenges!</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {filteredFriends.map((friend) => (
                            <div
                                key={friend.id}
                                onClick={() => {
                                    if (!onFriendSelect) {
                                        const username = friend.username || friend.id;
                                        router.push(`/profile/${encodeURIComponent(username)}`);
                                    } else {
                                        onFriendSelect(friend.id);
                                    }
                                }}
                                className={clsx(
                                    "p-3 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                )}
                            >
                                <div className="flex items-center gap-3 flex-1">
                                    <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                                        <UserCheck size={20} className="text-primary-600 dark:text-primary-400" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium text-gray-900 dark:text-white">
                                            @{friend.username || friend.id}
                                        </p>
                                        {friend.added_at && (
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                Added {new Date(friend.added_at).toLocaleDateString()}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const username = friend.username || friend.id;
                                            router.push(`/profile/${encodeURIComponent(username)}`);
                                        }}
                                        className="p-2 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                                        title="View profile"
                                    >
                                        <Eye size={16} />
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleRemoveFriend(friend.id);
                                        }}
                                        className="px-3 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                        title="Remove friend"
                                    >
                                        Remove
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleBlockUser(friend.id);
                                        }}
                                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                        title="Block user"
                                    >
                                        <Shield size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Pending Sent Requests */}
            {friendsData.pending_sent.length > 0 && (
                <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                        <Send size={18} />
                        Sent Requests ({friendsData.pending_sent.length})
                    </h3>
                    <div className="space-y-2">
                        {friendsData.pending_sent.map((request) => (
                            <div
                                key={request.id}
                                className="p-3 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg flex items-center justify-between"
                            >
                                <span className="text-gray-900 dark:text-white">{request.id}</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                        Pending...
                                    </span>
                                    <button
                                        onClick={() => handleCancelRequest(request.id)}
                                        className="px-3 py-1 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                        title="Cancel request"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Blocked Users */}
            {friendsData.blocked && friendsData.blocked.length > 0 && (
                <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                        <Shield size={18} />
                        Blocked Users ({friendsData.blocked.length})
                    </h3>
                    <div className="space-y-2">
                        {friendsData.blocked.map((blockedUser) => (
                            <div
                                key={typeof blockedUser === "string" ? blockedUser : (blockedUser as any).id || blockedUser}
                                className="p-3 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg flex items-center justify-between"
                            >
                                <span className="text-gray-900 dark:text-white">
                                    {typeof blockedUser === "string" ? blockedUser : ((blockedUser as any).id || (blockedUser as any).username || blockedUser)}
                                </span>
                                <button
                                    onClick={() => handleUnblockUser(typeof blockedUser === "string" ? blockedUser : ((blockedUser as any).id || blockedUser))}
                                    className="px-3 py-1 text-xs text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors flex items-center gap-1"
                                    title="Unblock user"
                                >
                                    <ShieldOff size={14} />
                                    Unblock
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

