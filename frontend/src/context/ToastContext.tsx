"use client";

import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, AlertCircle, X, Info } from "lucide-react";
import { clsx } from "clsx";

export type ToastType = "success" | "error" | "info";

interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const toastCounterRef = useRef(0);

    const showToast = useCallback((message: string, type: ToastType = "success") => {
        // Generate unique ID using timestamp + counter + random to prevent collisions
        toastCounterRef.current += 1;
        const id = `${Date.now()}-${toastCounterRef.current}-${Math.random().toString(36).substr(2, 9)}`;
        setToasts((prev) => [...prev, { id, message, type }]);
        
        // Auto dismiss
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 3000);
    }, []);

    const removeToast = (id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="fixed top-4 right-4 left-4 z-[10000] flex flex-col items-center sm:items-end pointer-events-none gap-2">
                <AnimatePresence>
                    {toasts.map((toast) => (
                        <motion.div
                            key={toast.id}
                            initial={{ opacity: 0, y: -20, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                            layout
                            className={clsx(
                                "pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border backdrop-blur-sm min-w-[300px] max-w-md",
                                toast.type === "success" && "bg-white/90 border-green-200 text-green-800",
                                toast.type === "error" && "bg-white/90 border-red-200 text-red-800",
                                toast.type === "info" && "bg-white/90 border-blue-200 text-blue-800"
                            )}
                        >
                            <div className={clsx(
                                "p-1 rounded-full",
                                toast.type === "success" && "bg-green-100 text-green-600",
                                toast.type === "error" && "bg-red-100 text-red-600",
                                toast.type === "info" && "bg-blue-100 text-blue-600"
                            )}>
                                {toast.type === "success" && <Check size={16} strokeWidth={3} />}
                                {toast.type === "error" && <AlertCircle size={16} strokeWidth={2.5} />}
                                {toast.type === "info" && <Info size={16} strokeWidth={2.5} />}
                            </div>
                            <p className="text-sm font-medium flex-grow">{toast.message}</p>
                            <button 
                                onClick={() => removeToast(toast.id)}
                                className="p-1 hover:bg-black/5 rounded-full transition-colors"
                            >
                                <X size={14} className="opacity-50" />
                            </button>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (context === undefined) {
        throw new Error("useToast must be used within a ToastProvider");
    }
    return context;
}

