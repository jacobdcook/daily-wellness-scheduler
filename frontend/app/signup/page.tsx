"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";

export default function SignupPage() {
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [username, setUsername] = useState("");
    const [usernameError, setUsernameError] = useState("");
    const [checkingUsername, setCheckingUsername] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();

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

        // Validate username if provided
        if (username && !/^[a-z0-9]{3,20}$/.test(username)) {
            setUsernameError("Username must be 3-20 characters, lowercase letters and numbers only");
            return;
        }

        try {
            const res = await fetch("/backend/auth/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    first_name: firstName,
                    last_name: lastName,
                    email,
                    password,
                    username: username || undefined,
                }),
            });

            const data = await res.json();

            if (res.ok) {
                router.push("/login?signup=success");
            } else {
                setError(data.detail || "Signup failed");
            }
        } catch (err) {
            setError("An error occurred. Please try again.");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-black text-white p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md bg-gray-800/50 backdrop-blur-xl p-8 rounded-2xl shadow-2xl border border-gray-700"
            >
                <h1 className="text-3xl font-bold mb-6 text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
                    Create Account
                </h1>

                {error && (
                    <div className="bg-red-500/20 text-red-300 p-3 rounded-lg mb-4 text-sm text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">First Name</label>
                            <input
                                type="text"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                className="w-full bg-gray-900/50 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                placeholder="John"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Last Name</label>
                            <input
                                type="text"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                className="w-full bg-gray-900/50 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                placeholder="Doe"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-gray-900/50 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            placeholder="you@example.com"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                            Username <span className="text-gray-500 text-xs">(optional)</span>
                        </label>
                        <input
                            type="text"
                            value={username}
                            onChange={handleUsernameChange}
                            className={`w-full bg-gray-900/50 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 transition-all ${
                                usernameError 
                                    ? "border-red-500 focus:ring-red-500" 
                                    : "border-gray-600 focus:ring-blue-500"
                            }`}
                            placeholder="johndoe"
                            maxLength={20}
                            pattern="[a-z0-9]{3,20}"
                        />
                        {checkingUsername && (
                            <p className="text-xs text-gray-500 mt-1">Checking availability...</p>
                        )}
                        {usernameError && (
                            <p className="text-xs text-red-400 mt-1">{usernameError}</p>
                        )}
                        {username && !usernameError && !checkingUsername && (
                            <p className="text-xs text-green-400 mt-1">✓ Username available</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                            Leave blank to auto-generate from email
                        </p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-gray-900/50 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-2 px-4 rounded-lg transition-all transform hover:scale-[1.02]"
                    >
                        Sign Up
                    </button>
                </form>

                <p className="mt-6 text-center text-sm text-gray-400">
                    Already have an account?{" "}
                    <Link href="/login" className="text-blue-400 hover:text-blue-300 transition-colors">
                        Sign in
                    </Link>
                </p>
            </motion.div>
        </div>
    );
}
