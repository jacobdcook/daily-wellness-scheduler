"use client";

import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";

export function PwaInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showPrompt, setShowPrompt] = useState(false);

    useEffect(() => {
        const handler = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
            // Only show if not already installed/dismissed
            if (!localStorage.getItem("pwa-install-dismissed")) {
                setShowPrompt(true);
            }
        };

        window.addEventListener("beforeinstallprompt", handler);

        return () => window.removeEventListener("beforeinstallprompt", handler);
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") {
            setDeferredPrompt(null);
            setShowPrompt(false);
        }
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        localStorage.setItem("pwa-install-dismissed", "true");
    };

    if (!showPrompt) return null;

    return (
        <div className="fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom-4">
            <div className="bg-primary-600 text-white p-4 rounded-xl shadow-lg flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-full">
                        <Download size={20} />
                    </div>
                    <div>
                        <p className="font-semibold text-sm">Install App</p>
                        <p className="text-xs text-white/80">Add to home screen for offline access</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleDismiss}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X size={18} />
                    </button>
                    <button
                        onClick={handleInstall}
                        className="px-3 py-1.5 bg-white text-primary-600 text-xs font-bold rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
                    >
                        Install
                    </button>
                </div>
            </div>
        </div>
    );
}

