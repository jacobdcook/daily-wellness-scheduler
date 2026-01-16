"use client";

import { useState, useRef, useEffect } from "react";
import { Camera, X, Search, AlertCircle } from "lucide-react";
import { useToast } from "@/context/ToastContext";
import { useRouter } from "next/navigation";

interface BarcodeScannerProps {
    onScanComplete?: (food: any) => void;
    onClose?: () => void;
}

export function BarcodeScanner({ onScanComplete, onClose }: BarcodeScannerProps) {
    const [scanning, setScanning] = useState(false);
    const [barcode, setBarcode] = useState("");
    const [loading, setLoading] = useState(false);
    const { showToast } = useToast();
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (scanning && inputRef.current) {
            inputRef.current.focus();
        }
    }, [scanning]);

    const handleScan = async () => {
        if (!barcode.trim()) {
            showToast("Please enter a barcode", "error");
            return;
        }

        try {
            setLoading(true);
            const headers = await getAuthHeaders();
            const response = await fetch(`/backend/nutrition/scan/${encodeURIComponent(barcode.trim())}`, {
                headers
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || "Product not found");
            }

            const data = await response.json();
            
            if (!data.food) {
                throw new Error("No food data returned");
            }
            
            // Use barcode as ID if food doesn't have an ID, or use the food's ID
            const foodId = data.food.id || data.food.barcode || barcode.trim() || data.food.name;
            
            if (onScanComplete) {
                onScanComplete({ ...data.food, id: foodId });
            } else {
                // Navigate to food details page
                router.push(`/nutrition/food/${encodeURIComponent(foodId)}`);
            }
            
            showToast("Product found!", "success");
            setBarcode("");
            setScanning(false);
        } catch (error: any) {
            console.error("Barcode scan error:", error);
            showToast(error.message || "Failed to scan barcode", "error");
        } finally {
            setLoading(false);
        }
    };

    const getAuthHeaders = async () => {
        const { getAuthHeaders } = await import("@/utils/api");
        return await getAuthHeaders();
    };

    if (!scanning) {
        return (
            <button
                onClick={() => setScanning(true)}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
                <Camera className="w-5 h-5" />
                Scan Barcode
            </button>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-800 rounded-xl border-2 border-orange-500/30 max-w-md w-full p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-white">Scan Barcode</h3>
                    <button
                        onClick={() => {
                            setScanning(false);
                            setBarcode("");
                            onClose?.();
                        }}
                        className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Enter Barcode Number
                        </label>
                        <div className="flex gap-2">
                            <input
                                ref={inputRef}
                                type="text"
                                value={barcode}
                                onChange={(e) => setBarcode(e.target.value.replace(/\D/g, ""))}
                                onKeyPress={(e) => {
                                    if (e.key === "Enter") {
                                        handleScan();
                                    }
                                }}
                                placeholder="Enter 8-13 digit barcode"
                                className="flex-1 px-4 py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-orange-500 focus:outline-none text-lg"
                                maxLength={13}
                            />
                            <button
                                onClick={handleScan}
                                disabled={loading || !barcode.trim()}
                                className="px-6 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-semibold"
                            >
                                {loading ? "Scanning..." : <Search className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                            <div className="text-sm text-gray-300">
                                <p className="font-semibold mb-1">How to use:</p>
                                <ul className="list-disc list-inside space-y-1 text-gray-400">
                                    <li>Enter the barcode number from the product</li>
                                    <li>Barcodes are usually 8-13 digits</li>
                                    <li>We'll look up the product in our database</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <p className="text-xs text-gray-400 text-center">
                        Note: Camera-based scanning coming soon. For now, manually enter the barcode.
                    </p>
                </div>
            </div>
        </div>
    );
}

