"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

function SetupUsernameContent() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [username, setUsername] = useState("");
    const [usernameError, setUsernameError] = useState("");
    const [checkingUsername, setCheckingUsername] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        // Redirect if not authenticated
        if (status === "unauthenticated") {
            router.push("/login");
        }
    }, [status, router]);

    const checkUsernameAvailability = async (usernameToCheck: string) => {
        if (!usernameToCheck || usernameToCheck.length < 3) {
            setUsernameError("");
            return;
        }

        // Validate format client-side
        if (!/^[a-z0-9]{3,20}$/.test(usernameToCheck)) {
            setUsernameError("Username must be 3-20 characters, lowercase letters and numbers only");
            return;
        }

        setCheckingUsername(true);
        setUsernameError("");
        try {
            const res = await fetch(`/backend/username/check/${encodeURIComponent(usernameToCheck)}`);
            const data = await res.json();
            if (!data.available) {
                setUsernameError(data.reason || "Username not available");
            } else {
                setUsernameError("");
            }
        } catch (err) {
            // Silently fail - will be caught on submit
        } finally {
            setCheckingUsername(false);
        }
    };

    const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "");
        setUsername(value);
        if (value.length >= 3) {
            // Debounce the check
            const timeoutId = setTimeout(() => checkUsernameAvailability(value), 500);
            return () => clearTimeout(timeoutId);
        } else {
            setUsernameError("");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setUsernameError("");

        if (!username || username.length < 3) {
            setUsernameError("Username must be at least 3 characters");
            return;
        }

        if (!/^[a-z0-9]{3,20}$/.test(username)) {
            setUsernameError("Username must be 3-20 characters, lowercase letters and numbers only");
            return;
        }

        setSaving(true);
        try {
            // Check if username is available one more time
            const checkRes = await fetch(`/backend/username/check/${encodeURIComponent(username)}`);
            const checkData = await checkRes.json();
            
            if (!checkData.available) {
                setUsernameError(checkData.reason || "Username not available");
                setSaving(false);
                return;
            }

            // Save username via backend
            const userEmail = session?.user?.email || session?.user?.id;
            if (!userEmail) {
                setError("Unable to identify user. Please try logging in again.");
                setSaving(false);
                return;
            }

            // Use the username engine to save
            const res = await fetch(`/backend/username/${encodeURIComponent(userEmail)}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username }),
            });

            if (res.ok) {
                // Redirect to home
                const redirectTo = searchParams.get("callbackUrl") || "/";
                router.push(redirectTo);
            } else {
                const data = await res.json();
                setError(data.detail || "Failed to save username. Please try again.");
            }
        } catch (err) {
            setError("An error occurred. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    if (status === "unauthenticated") {
        return null;
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-black text-white p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md bg-gray-800/50 backdrop-blur-xl p-8 rounded-2xl shadow-2xl border border-gray-700"
            >
                <h1 className="text-3xl font-bold mb-2 text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
                    Choose Your Username
                </h1>
                <p className="text-center text-gray-400 mb-6 text-sm">
                    Pick a unique username for your profile
                </p>

                {error && (
                    <div className="bg-red-500/20 text-red-300 p-3 rounded-lg mb-4 text-sm text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                            Username
                        </label>
                        <input
                            type="text"
                            value={username}
                            onChange={handleUsernameChange}
                            className={`w-full bg-gray-900/50 border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 transition-all ${
                                usernameError 
                                    ? "border-red-500 focus:ring-red-500" 
                                    : "border-gray-600 focus:ring-blue-500"
                            }`}
                            placeholder="johndoe"
                            maxLength={20}
                            pattern="[a-z0-9]{3,20}"
                            required
                            autoFocus
                        />
                        {checkingUsername && (
                            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Checking availability...
                            </p>
                        )}
                        {usernameError && (
                            <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                                <XCircle className="w-3 h-3" />
                                {usernameError}
                            </p>
                        )}
                        {username && !usernameError && !checkingUsername && username.length >= 3 && (
                            <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                Username available
                            </p>
                        )}
                        <p className="text-xs text-gray-500 mt-2">
                            3-20 characters, lowercase letters and numbers only
                        </p>
                    </div>

                    <button
                        type="submit"
                        disabled={saving || !!usernameError || username.length < 3}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-all transform hover:scale-[1.02] disabled:hover:scale-100 flex items-center justify-center gap-2"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            "Continue"
                        )}
                    </button>
                </form>
            </motion.div>
        </div>
    );
}

export default function SetupUsernamePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        }>
            <SetupUsernameContent />
        </Suspense>
    );
}

