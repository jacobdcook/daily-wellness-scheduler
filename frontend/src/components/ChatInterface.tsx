"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Send, X, Bot, User, Trash2, Reply, History } from "lucide-react";
import { clsx } from "clsx";
import { format, isToday, isYesterday } from "date-fns";

import { getAuthHeaders } from "@/utils/api";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp?: string;
}

const API_URL = "/backend";
const CHAT_EVENT = "wellness-chat-open";
const SCHEDULE_REFRESH_EVENT = "wellness-schedule-refresh";

export function ChatInterface() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [swipedMessageId, setSwipedMessageId] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const loadingRef = useRef(false);

    useEffect(() => {
        if (isOpen) {
            const loadHistory = async () => {
                try {
                    const headers = await getAuthHeaders();
                    const res = await fetch(`${API_URL}/chat/history`, { headers });
                    if (res.ok) {
                        const history = await res.json();
                        if (Array.isArray(history) && history.length > 0) {
                            // Ensure timestamp exists (backfill if needed)
                            const processedHistory = history.map((msg: any) => ({
                                ...msg,
                                timestamp: msg.timestamp || new Date().toISOString()
                            }));
                            setMessages(processedHistory);
                        }
                    }
                } catch (e) {
                    console.error("Failed to load history", e);
                }
            };
            loadHistory();
        }
    }, [isOpen]);

    const clearHistory = async () => {
        if (!confirm("Are you sure you want to clear your chat history?")) return;
        try {
            const headers = await getAuthHeaders();
            await fetch(`${API_URL}/chat/clear`, { method: "POST", headers });
            setMessages([]);
        } catch (e) {
            console.error("Failed to clear history", e);
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        loadingRef.current = loading;
    }, [loading]);

    const sendMessage = useCallback(async (rawMessage: string, isRevert = false) => {
        const content = rawMessage.trim();
        if (!content || loadingRef.current) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: "user",
            content,
            timestamp: new Date().toISOString()
        };

        setMessages(prev => [...prev, userMsg]);
        setInput("");
        setLoading(true);
        loadingRef.current = true;
        setSwipedMessageId(null);

        try {
            const headers = await getAuthHeaders();
            const response = await fetch(`${API_URL}/chat`, {
                method: "POST",
                headers,
                body: JSON.stringify({ message: content })
            });

            if (!response.ok) throw new Error("Failed to get response");

            const data = await response.json();
            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: data.reply,
                timestamp: new Date().toISOString()
            };
            setMessages(prev => [...prev, aiMsg]);

            // Add a small delay to ensure backend file write is fully complete and accessible
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent(SCHEDULE_REFRESH_EVENT, {
                    detail: {
                        source: "ai",
                        prompt: content,
                        reply: data.reply
                    }
                }));
            }, 500);
            
        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: "Sorry, I'm having trouble connecting. Please try again.",
                timestamp: new Date().toISOString()
            }]);
        } finally {
            setLoading(false);
            loadingRef.current = false;
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        sendMessage(input);
    };

    const handleSwipe = (msgId: string) => {
        if (swipedMessageId === msgId) {
            setSwipedMessageId(null);
        } else {
            setSwipedMessageId(msgId);
        }
    };

    const handleRevert = (msg: Message) => {
        const revertPrompt = `Cancel the action from this message: "${msg.content}"`;
        sendMessage(revertPrompt, true);
    };

    const formatMessageTime = (timestamp?: string) => {
        if (!timestamp) return "";
        const date = new Date(timestamp);
        if (isToday(date)) {
            return format(date, "h:mm a");
        } else if (isYesterday(date)) {
            return `Yesterday ${format(date, "h:mm a")}`;
        }
        return format(date, "MMM d, h:mm a");
    };

    useEffect(() => {
        const handleExternalPrompt = (event: Event) => {
            const customEvent = event as CustomEvent<{ message?: string; autoSend?: boolean }>;
            const detail = customEvent.detail || {};
            setIsOpen(true);

            if (detail.message) {
                if (detail.autoSend) {
                    sendMessage(detail.message);
                } else {
                    setInput(detail.message);
                }
            }
        };

        window.addEventListener(CHAT_EVENT, handleExternalPrompt as EventListener);
        return () => {
            window.removeEventListener(CHAT_EVENT, handleExternalPrompt as EventListener);
        };
    }, [sendMessage]);

    return (
        <>
            <AnimatePresence>
                {!isOpen && (
                    <motion.button
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        onClick={() => setIsOpen(true)}
                        className="fixed bottom-20 right-4 sm:bottom-24 sm:right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center z-[60] hover:bg-blue-700 transition-colors"
                    >
                        <MessageCircle size={28} />
                    </motion.button>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ y: "100%", opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: "100%", opacity: 0 }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed bottom-16 right-0 w-full sm:w-96 sm:bottom-24 sm:right-6 h-[calc(100vh-8rem)] sm:h-[600px] bg-white dark:bg-gray-900 sm:rounded-2xl shadow-2xl z-[100] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700"
                    >
                        {/* Header */}
                        <div className="p-4 bg-blue-600 text-white flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                                    <Bot size={20} />
                                </div>
                                <div>
                                    <h3 className="font-semibold">Wellness Assistant</h3>
                                    <p className="text-xs text-blue-100">Powered by AI</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={clearHistory} className="p-1 hover:bg-white/20 rounded-lg transition-colors text-blue-100 hover:text-white" title="Clear History">
                                    <Trash2 size={18} />
                                </button>
                                <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-950">
                            {messages.length === 0 && (
                                <div className="text-center text-gray-500 mt-8">
                                    <p className="text-sm">Hi! I'm your wellness assistant.</p>
                                    <p className="text-xs mt-1">Ask me about your schedule, or mark items as done.</p>
                                </div>
                            )}
                            {messages.map((msg) => (
                                <motion.div
                                    key={msg.id}
                                    className="group relative"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                >
                                    {/* Swipe Actions (Revert) */}
                                    <AnimatePresence>
                                        {swipedMessageId === msg.id && msg.role === "assistant" && (
                                            <motion.div
                                                initial={{ opacity: 0, x: 10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: 10 }}
                                                className="absolute right-0 -top-8 bg-white dark:bg-gray-800 shadow-lg rounded-lg border border-gray-200 dark:border-gray-700 p-1 flex gap-1 z-10"
                                            >
                                                <button
                                                    onClick={() => handleRevert(msg)}
                                                    className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                                >
                                                    <History size={12} />
                                                    Revert / Cancel
                                                </button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <div
                                        className={clsx(
                                            "flex gap-2 max-w-[85%]",
                                            msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                                        )}
                                        onClick={() => msg.role === "assistant" && handleSwipe(msg.id)}
                                    >
                                        <div className={clsx(
                                            "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                                            msg.role === "user" ? "bg-blue-600 text-white" : "bg-green-600 text-white"
                                        )}>
                                            {msg.role === "user" ? <User size={16} /> : <Bot size={16} />}
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <div className={clsx(
                                                "p-3 rounded-2xl text-sm relative cursor-pointer",
                                                msg.role === "user"
                                                    ? "bg-blue-600 text-white rounded-tr-none"
                                                    : "bg-white border border-gray-200 text-gray-800 rounded-tl-none shadow-sm dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                                            )}>
                                                {msg.content}
                                            </div>
                                            <div className={clsx(
                                                "text-[10px] text-gray-400 px-1",
                                                msg.role === "user" ? "text-right" : "text-left"
                                            )}>
                                                {formatMessageTime(msg.timestamp)}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                            {loading && (
                                <div className="flex gap-2 mr-auto max-w-[85%]">
                                    <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center flex-shrink-0">
                                        <Bot size={16} />
                                    </div>
                                    <div className="bg-white border border-gray-200 dark:bg-gray-800 dark:border-gray-700 p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1">
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75" />
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150" />
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <form onSubmit={handleSubmit} className="p-4 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Ask anything..."
                                    className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-full focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:bg-gray-900 dark:text-gray-100"
                                />
                                <button
                                    type="submit"
                                    disabled={loading || !input.trim()}
                                    className="p-2 bg-blue-600 text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
                                >
                                    <Send size={20} />
                                </button>
                            </div>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

