"use client";

import { useState, useEffect, useRef } from "react";
import { X, Share2, Download, Copy, Check, Twitter, Facebook, Linkedin, MessageCircle, Mail } from "lucide-react";
import { generateShareCard, ProgressCard } from "@/utils/api";
import { clsx } from "clsx";

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ShareModal({ isOpen, onClose }: ShareModalProps) {
    const [card, setCard] = useState<ProgressCard | null>(null);
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            loadCard();
        }
    }, [isOpen]);

    const loadCard = async () => {
        try {
            setLoading(true);
            const data = await generateShareCard();
            setCard(data);
        } catch (error) {
            console.error("Failed to generate share card:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = async () => {
        if (!card) return;

        const text = `${card.message}\n\n📊 Stats:\n• Completion Rate: ${card.completion_rate}%\n• Current Streak: ${card.current_streak} days\n• Total Items Completed: ${card.total_items_completed}\n• Days Active: ${card.total_days_active}`;

        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error("Failed to copy:", error);
        }
    };

    const handleDownload = async () => {
        if (!card || !cardRef.current) return;
        
        try {
            setDownloading(true);
            
            // Dynamically import html2canvas
            let html2canvas;
            try {
                const html2canvasModule = await import("html2canvas");
                html2canvas = html2canvasModule.default || html2canvasModule;
            } catch (importError) {
                console.error("Failed to import html2canvas:", importError);
                alert("Image download feature is not available. Please install html2canvas package.");
                return;
            }
            
            if (!html2canvas) {
                throw new Error("html2canvas is not available");
            }
            
            // Clone the element and convert oklch colors to rgb/hex
            const element = cardRef.current;
            const clone = element.cloneNode(true) as HTMLElement;
            
            // Create a wrapper div with matching background to eliminate any gaps
            const wrapper = document.createElement("div");
            wrapper.style.position = "absolute";
            wrapper.style.left = "-9999px";
            wrapper.style.top = "0";
            wrapper.style.margin = "0";
            wrapper.style.padding = "0";
            wrapper.style.border = "none";
            wrapper.style.background = "linear-gradient(to bottom right, rgb(99, 102, 241), rgb(79, 70, 229))";
            wrapper.style.width = `${element.offsetWidth}px`;
            wrapper.style.height = `${element.offsetHeight}px`;
            wrapper.style.overflow = "hidden";
            
            // Remove margins/padding from clone
            clone.style.margin = "0";
            clone.style.padding = "0";
            clone.style.border = "none";
            clone.style.outline = "none";
            clone.style.boxShadow = "none";
            clone.style.borderRadius = "0.5rem";
            
            wrapper.appendChild(clone);
            document.body.appendChild(wrapper);
            
            // Use the gradient start color as background
            const backgroundColor = "#6366f1"; // primary-500
            
            try {
                const canvas = await html2canvas(wrapper, {
                    backgroundColor: backgroundColor,
                    scale: 2,
                    logging: false,
                    useCORS: true,
                    allowTaint: false,
                    removeContainer: true,
                    width: wrapper.offsetWidth,
                    height: wrapper.offsetHeight,
                    x: 0,
                    y: 0,
                    ignoreElements: (element) => {
                        // Ignore elements that might cause issues
                        return element.classList?.contains("ignore-on-capture") || false;
                    },
                    onclone: (clonedDoc, element) => {
                        // Remove any borders and ensure background covers entire element
                        const body = clonedDoc.body;
                        if (body) {
                            body.style.margin = "0";
                            body.style.padding = "0";
                            body.style.backgroundColor = backgroundColor;
                        }
                        
                        const rootElement = clonedDoc.body.firstElementChild as HTMLElement;
                        if (rootElement) {
                            rootElement.style.margin = "0";
                            rootElement.style.padding = "0";
                            rootElement.style.border = "none";
                            rootElement.style.outline = "none";
                            rootElement.style.boxShadow = "none";
                            rootElement.style.backgroundColor = backgroundColor;
                        }
                        
                        // Force all colors to RGB format to avoid oklch parsing issues
                        const allElements = clonedDoc.querySelectorAll("*");
                        allElements.forEach((el) => {
                            const htmlEl = el as HTMLElement;
                            
                            // Remove borders, outlines, and shadows
                            htmlEl.style.border = "none";
                            htmlEl.style.outline = "none";
                            htmlEl.style.boxShadow = "none";
                            htmlEl.style.borderWidth = "0";
                            htmlEl.style.borderStyle = "none";
                            
                            // Get computed styles from original element
                            const originalSelector = Array.from(element.querySelectorAll("*")).find(
                                orig => orig.textContent === htmlEl.textContent && orig.tagName === htmlEl.tagName
                            ) as HTMLElement;
                            
                            if (originalSelector) {
                                const computed = window.getComputedStyle(originalSelector);
                                
                                // Force background to RGB
                                if (computed.backgroundColor && computed.backgroundColor !== "rgba(0, 0, 0, 0)") {
                                    htmlEl.style.backgroundColor = computed.backgroundColor;
                                }
                                
                                // Force text color to RGB
                                if (computed.color) {
                                    htmlEl.style.color = computed.color;
                                }
                            }
                            
                            // Also check for gradient backgrounds and convert
                            const bgImage = htmlEl.style.backgroundImage || window.getComputedStyle(htmlEl).backgroundImage;
                            if (bgImage && bgImage.includes("gradient")) {
                                // Replace with explicit RGB gradient that extends to edges
                                htmlEl.style.background = "linear-gradient(to bottom right, rgb(99, 102, 241), rgb(79, 70, 229))";
                                htmlEl.style.backgroundClip = "border-box";
                                htmlEl.style.backgroundOrigin = "border-box";
                            }
                        });
                    }
                });
                
                // Clean up wrapper (which contains clone)
                document.body.removeChild(wrapper);
                
                // Crop 1-2 pixels from each edge to remove any black borders
                const cropSize = 2;
                const croppedCanvas = document.createElement("canvas");
                croppedCanvas.width = canvas.width - (cropSize * 2);
                croppedCanvas.height = canvas.height - (cropSize * 2);
                const ctx = croppedCanvas.getContext("2d");
                
                if (ctx) {
                    // Draw the cropped portion
                    ctx.drawImage(
                        canvas,
                        cropSize, cropSize, // source x, y
                        croppedCanvas.width, croppedCanvas.height, // source width, height
                        0, 0, // destination x, y
                        croppedCanvas.width, croppedCanvas.height // destination width, height
                    );
                    
                    // Use cropped canvas for download
                    croppedCanvas.toBlob((blob) => {
                        if (!blob) {
                            throw new Error("Failed to create image blob");
                        }
                        
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement("a");
                        link.href = url;
                        link.download = `wellness-progress-${new Date().toISOString().split("T")[0]}.png`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        URL.revokeObjectURL(url);
                    }, "image/png");
                } else {
                    // Fallback to original canvas if cropping fails
                    canvas.toBlob((blob) => {
                        if (!blob) {
                            throw new Error("Failed to create image blob");
                        }
                        
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement("a");
                        link.href = url;
                        link.download = `wellness-progress-${new Date().toISOString().split("T")[0]}.png`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        URL.revokeObjectURL(url);
                    }, "image/png");
                }
            } catch (renderError) {
                // Clean up wrapper on error
                if (document.body.contains(wrapper)) {
                    document.body.removeChild(wrapper);
                }
                throw renderError;
            }
        } catch (error: any) {
            console.error("Failed to download image:", error);
            const errorMessage = error?.message || "Unknown error";
            alert(`Failed to download image: ${errorMessage}. Please try again or use the copy/share options.`);
        } finally {
            setDownloading(false);
        }
    };

    const getShareText = () => {
        if (!card) return "";
        return `${card.message}\n\n📊 Stats:\n• Completion Rate: ${card.completion_rate}%\n• Current Streak: ${card.current_streak} days\n• Total Items Completed: ${card.total_items_completed}\n• Days Active: ${card.total_days_active}`;
    };

    const getShareUrl = () => {
        // In a production app, this would be your app's URL
        return typeof window !== "undefined" ? window.location.origin : "";
    };

    const handleShareTwitter = () => {
        if (!card) return;
        const text = encodeURIComponent(`${card.message} Check out my wellness progress!`);
        const url = encodeURIComponent(getShareUrl());
        window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, "_blank", "width=550,height=420");
    };

    const handleShareFacebook = () => {
        if (!card) return;
        const url = encodeURIComponent(getShareUrl());
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, "_blank", "width=550,height=420");
    };

    const handleShareLinkedIn = () => {
        if (!card) return;
        const text = encodeURIComponent(`${card.message} Check out my wellness progress!`);
        const url = encodeURIComponent(getShareUrl());
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, "_blank", "width=550,height=420");
    };

    const handleShareWhatsApp = () => {
        if (!card) return;
        const text = encodeURIComponent(getShareText());
        window.open(`https://wa.me/?text=${text}`, "_blank");
    };

    const handleShareEmail = () => {
        if (!card) return;
        const subject = encodeURIComponent("My Wellness Progress");
        const body = encodeURIComponent(getShareText());
        window.location.href = `mailto:?subject=${subject}&body=${body}`;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[10000] overflow-hidden flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />

            <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md">
                <div className="flex items-center justify-between p-4 border-b dark:border-gray-800">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Share2 size={20} />
                        Share Your Progress
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    {loading ? (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            Generating share card...
                        </div>
                    ) : card ? (
                        <div className="space-y-4">
                            {/* Share Card Preview */}
                            <div 
                                ref={cardRef}
                                className="p-6 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg text-white"
                                style={{
                                    background: "linear-gradient(to bottom right, rgb(99, 102, 241), rgb(79, 70, 229))",
                                    color: "rgb(255, 255, 255)",
                                    padding: "1.5rem",
                                    borderRadius: "0.5rem",
                                    border: "none",
                                    outline: "none",
                                    boxShadow: "none",
                                    margin: "0"
                                }}
                            >
                                <div className="text-center" style={{ color: "rgb(255, 255, 255)" }}>
                                    <p className="text-2xl font-bold mb-4" style={{ color: "rgb(255, 255, 255)" }}>{card.message}</p>
                                    <div className="grid grid-cols-2 gap-4 mt-6">
                                        <div>
                                            <p className="text-sm opacity-90" style={{ color: "rgba(255, 255, 255, 0.9)" }}>Completion Rate</p>
                                            <p className="text-3xl font-bold" style={{ color: "rgb(255, 255, 255)" }}>{card.completion_rate}%</p>
                                        </div>
                                        <div>
                                            <p className="text-sm opacity-90" style={{ color: "rgba(255, 255, 255, 0.9)" }}>Current Streak</p>
                                            <p className="text-3xl font-bold" style={{ color: "rgb(255, 255, 255)" }}>{card.current_streak} days</p>
                                        </div>
                                        <div>
                                            <p className="text-sm opacity-90" style={{ color: "rgba(255, 255, 255, 0.9)" }}>Items Completed</p>
                                            <p className="text-3xl font-bold" style={{ color: "rgb(255, 255, 255)" }}>{card.total_items_completed}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm opacity-90" style={{ color: "rgba(255, 255, 255, 0.9)" }}>Days Active</p>
                                            <p className="text-3xl font-bold" style={{ color: "rgb(255, 255, 255)" }}>{card.total_days_active}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Social Media Sharing */}
                            <div>
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                    Share on Social Media
                                </p>
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        onClick={handleShareTwitter}
                                        className="p-3 bg-[#1DA1F2] text-white rounded-lg hover:bg-[#1a8cd8] transition-colors flex flex-col items-center justify-center gap-1"
                                        title="Share on Twitter"
                                    >
                                        <Twitter size={20} />
                                        <span className="text-xs">Twitter</span>
                                    </button>
                                    <button
                                        onClick={handleShareFacebook}
                                        className="p-3 bg-[#1877F2] text-white rounded-lg hover:bg-[#166fe5] transition-colors flex flex-col items-center justify-center gap-1"
                                        title="Share on Facebook"
                                    >
                                        <Facebook size={20} />
                                        <span className="text-xs">Facebook</span>
                                    </button>
                                    <button
                                        onClick={handleShareLinkedIn}
                                        className="p-3 bg-[#0077B5] text-white rounded-lg hover:bg-[#006399] transition-colors flex flex-col items-center justify-center gap-1"
                                        title="Share on LinkedIn"
                                    >
                                        <Linkedin size={20} />
                                        <span className="text-xs">LinkedIn</span>
                                    </button>
                                    <button
                                        onClick={handleShareWhatsApp}
                                        className="p-3 bg-[#25D366] text-white rounded-lg hover:bg-[#20ba5a] transition-colors flex flex-col items-center justify-center gap-1"
                                        title="Share on WhatsApp"
                                    >
                                        <MessageCircle size={20} />
                                        <span className="text-xs">WhatsApp</span>
                                    </button>
                                    <button
                                        onClick={handleShareEmail}
                                        className="p-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex flex-col items-center justify-center gap-1"
                                        title="Share via Email"
                                    >
                                        <Mail size={20} />
                                        <span className="text-xs">Email</span>
                                    </button>
                                    <button
                                        onClick={handleCopy}
                                        className={clsx(
                                            "p-3 rounded-lg transition-colors flex flex-col items-center justify-center gap-1",
                                            copied
                                                ? "bg-green-500 text-white hover:bg-green-600"
                                                : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                                        )}
                                        title="Copy to Clipboard"
                                    >
                                        {copied ? <Check size={20} /> : <Copy size={20} />}
                                        <span className="text-xs">{copied ? "Copied!" : "Copy"}</span>
                                    </button>
                                </div>
                            </div>

                            {/* Download Image */}
                            <button
                                onClick={handleDownload}
                                disabled={downloading}
                                className="w-full px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Download size={18} />
                                {downloading ? "Generating Image..." : "Download as Image"}
                            </button>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            Failed to generate share card
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

