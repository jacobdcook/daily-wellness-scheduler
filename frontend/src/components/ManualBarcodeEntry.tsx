"use client";

import { useState, useRef, useEffect } from "react";
import { X, Search, AlertCircle, Hash } from "lucide-react";
import { useToast } from "@/context/ToastContext";
import { useRouter } from "next/navigation";

interface ManualBarcodeEntryProps {
    isOpen: boolean;
    onClose: () => void;
    onBarcodeFound?: (barcode: string, food?: any) => void;
    title?: string;
    description?: string;
}

export function ManualBarcodeEntry({
    isOpen,
    onClose,
    onBarcodeFound,
    title = "Enter Barcode Manually",
    description = "Enter the barcode number to look up product information"
}: ManualBarcodeEntryProps) {
    const [barcode, setBarcode] = useState("");
    const [loading, setLoading] = useState(false);
    const { showToast } = useToast();
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) {
            setBarcode("");
            setLoading(false);
        }
    }, [isOpen]);

    const handleScan = async () => {
        if (!barcode.trim()) {
            showToast("Please enter a barcode", "error");
            return;
        }

        // Basic validation - barcodes are typically 8-13 digits
        const cleanBarcode = barcode.trim().replace(/\D/g, "");
        if (cleanBarcode.length < 8 || cleanBarcode.length > 13) {
            showToast("Barcode should be 8-13 digits long", "error");
            return;
        }

        try {
            setLoading(true);
            const headers = await getAuthHeaders();

            // Try the nutrition/recognize-photo endpoint with a dummy image but barcode
            const formData = new FormData();
            // Create a small dummy image
            const canvas = document.createElement('canvas');
            canvas.width = 1;
            canvas.height = 1;
            canvas.toBlob(async (blob) => {
                if (blob) {
                    formData.append('file', blob, 'dummy.jpg');
                    formData.append('barcode', cleanBarcode);

                    const response = await fetch('/backend/nutrition/recognize-photo', {
                        method: 'POST',
                        headers: {
                            'x-user-id': headers['x-user-id'] as string || '',
                        },
                        body: formData,
                    });

                    if (response.ok) {
                        const data = await response.json();
                        if (data.foods && data.foods.length > 0) {
                            const food = data.foods[0];
                            const foodId = food.id || cleanBarcode;
                            showToast(`Product found!`, "success");

                            if (onBarcodeFound) {
                                onBarcodeFound(cleanBarcode, food);
                            } else {
                                // Default behavior - navigate to food details
                                router.push(`/nutrition/food/${encodeURIComponent(foodId)}`);
                            }
                            onClose();
                        } else {
                            // No food found, but barcode was valid - search for it
                            showToast(`Barcode found! Searching for product...`, "info");
                            if (onBarcodeFound) {
                                onBarcodeFound(cleanBarcode);
                            }
                            onClose();
                        }
                    } else {
                        throw new Error('Product not found');
                    }
                }
            }, 'image/jpeg', 0.1);

        } catch (error: any) {
            console.error("Barcode lookup error:", error);
            showToast(error.message || "Product not found. Try a different barcode.", "error");
        } finally {
            setLoading(false);
        }
    };

    const getAuthHeaders = async () => {
        const { getAuthHeaders } = await import("@/utils/api");
        return await getAuthHeaders();
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            handleScan();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-800 rounded-xl border-2 border-orange-500/30 max-w-md w-full p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Hash className="w-5 h-5" />
                        {title}
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Barcode Number
                        </label>
                        <div className="flex gap-2">
                            <input
                                ref={inputRef}
                                type="text"
                                value={barcode}
                                onChange={(e) => setBarcode(e.target.value.replace(/\D/g, ""))}
                                onKeyPress={handleKeyPress}
                                placeholder="Enter 8-13 digit barcode"
                                className="flex-1 px-4 py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-orange-500 focus:outline-none text-lg"
                                maxLength={13}
                            />
                            <button
                                onClick={handleScan}
                                disabled={loading || !barcode.trim()}
                                className="px-6 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-semibold flex items-center justify-center"
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <Search className="w-5 h-5" />
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                            <div className="text-sm text-gray-300">
                                <p className="font-semibold mb-1">How to find barcodes:</p>
                                <ul className="list-disc list-inside space-y-1 text-gray-400">
                                    <li>Look for the barcode on product packaging</li>
                                    <li>Usually found on the back or bottom of items</li>
                                    <li>Barcodes are typically 8-13 digits long</li>
                                    <li>UPC, EAN, or JAN codes are supported</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <p className="text-xs text-gray-400 text-center">
                        We'll search our database for the product information
                    </p>
                </div>
            </div>
        </div>
    );
}