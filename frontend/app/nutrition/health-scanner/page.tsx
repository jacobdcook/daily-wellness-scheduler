"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Filter, SlidersHorizontal, Award, TrendingUp, Clock, X, Camera, Upload, Loader2 } from "lucide-react";
import { searchFoods, FoodItem } from "@/utils/api";
import { useToast } from "@/context/ToastContext";
import { FoodHealthBadge } from "@/components/FoodHealthBadge";
import { NutriScoreDisplay } from "@/components/NutriScoreDisplay";
import { NovaBadge } from "@/components/NovaBadge";
import { AdditivesList } from "@/components/AdditivesList";
import { FoodHealthDetails } from "@/components/FoodHealthDetails";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { ManualBarcodeEntry } from "@/components/ManualBarcodeEntry";
import Link from "next/link";

export default function HealthScannerPage() {
    const router = useRouter();
    const { showToast } = useToast();
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<FoodItem[]>([]);
    const [searching, setSearching] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [showHealthDetails, setShowHealthDetails] = useState<FoodItem | null>(null);
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
    const [showManualBarcodeEntry, setShowManualBarcodeEntry] = useState(false);
    const [cameraFailed, setCameraFailed] = useState(false);
    
    // Camera states
    const [showCamera, setShowCamera] = useState(false);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [scanning, setScanning] = useState(false);
    const [detectedBarcode, setDetectedBarcode] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const scanIntervalRef = useRef<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const lastDetectedBarcodeRef = useRef<string | null>(null);
    const isProcessingBarcodeRef = useRef<boolean>(false);
    
    // Filter states
    const [minHealthScore, setMinHealthScore] = useState<number | null>(null);
    const [maxHealthScore, setMaxHealthScore] = useState<number | null>(null);
    const [novaFilter, setNovaFilter] = useState<number | null>(null);
    const [noHarmfulAdditives, setNoHarmfulAdditives] = useState(false);
    const [sortBy, setSortBy] = useState<"relevance" | "healthiest" | "lowest">("relevance");

    // Load recent searches from localStorage
    useEffect(() => {
        const saved = localStorage.getItem("health_scanner_recent_searches");
        if (saved) {
            try {
                setRecentSearches(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to load recent searches:", e);
            }
        }
    }, []);

    const handleSearch = useCallback(async (query: string) => {
        const trimmedQuery = query.trim();
        if (!trimmedQuery || trimmedQuery.length < 2) {
            setSearchResults([]);
            return;
        }

        try {
            setSearching(true);
            const result = await searchFoods(trimmedQuery);
            let foods = result.foods || [];

            // Apply filters
            foods = applyFilters(foods);

            // Apply sorting
            foods = applySorting(foods, sortBy);

            setSearchResults(foods);

            // Save to recent searches
            if (trimmedQuery && !recentSearches.includes(trimmedQuery)) {
                const updated = [trimmedQuery, ...recentSearches].slice(0, 10);
                setRecentSearches(updated);
                localStorage.setItem("health_scanner_recent_searches", JSON.stringify(updated));
            }
        } catch (error) {
            console.error("Failed to search foods:", error);
            showToast("Failed to search foods", "error");
            setSearchResults([]);
        } finally {
            setSearching(false);
        }
    }, [sortBy, minHealthScore, maxHealthScore, novaFilter, noHarmfulAdditives, showToast, recentSearches]);

    const applyFilters = (foods: FoodItem[]): FoodItem[] => {
        return foods.filter(food => {
            // Health score filter
            if (minHealthScore !== null && (!food.health || (food.health.health_score || 0) < minHealthScore)) {
                return false;
            }
            if (maxHealthScore !== null && (!food.health || (food.health.health_score || 100) > maxHealthScore)) {
                return false;
            }

            // NOVA filter
            if (novaFilter !== null && (!food.health || food.health.nova?.group !== novaFilter)) {
                return false;
            }

            // No harmful additives filter
            if (noHarmfulAdditives && food.health?.additives?.has_harmful) {
                return false;
            }

            return true;
        });
    };

    const applySorting = (foods: FoodItem[], sort: string): FoodItem[] => {
        const sorted = [...foods];
        
        if (sort === "healthiest") {
            sorted.sort((a, b) => {
                const scoreA = a.health?.health_score || 0;
                const scoreB = b.health?.health_score || 0;
                return scoreB - scoreA;
            });
        } else if (sort === "lowest") {
            sorted.sort((a, b) => {
                const scoreA = a.health?.health_score || 0;
                const scoreB = b.health?.health_score || 0;
                return scoreA - scoreB;
            });
        }
        // "relevance" keeps original order

        return sorted;
    };

    const handleSearchClick = () => {
        if (searchQuery.trim().length >= 2) {
            handleSearch(searchQuery);
        } else {
            showToast("Please enter at least 2 characters", "error");
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            handleSearchClick();
        }
    };

    const handleRecentSearch = (query: string) => {
        setSearchQuery(query);
        handleSearch(query);
    };

    const clearFilters = () => {
        setMinHealthScore(null);
        setMaxHealthScore(null);
        setNovaFilter(null);
        setNoHarmfulAdditives(false);
        setSortBy("relevance");
        if (searchQuery) {
            handleSearch(searchQuery);
        }
    };

    const hasActiveFilters = minHealthScore !== null || maxHealthScore !== null || novaFilter !== null || noHarmfulAdditives;

    // Camera cleanup
    useEffect(() => {
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            stopRealTimeScanning();
        };
    }, [stream]);

    // Handle video element when stream is available
    useEffect(() => {
        if (stream && videoRef.current && showCamera) {
            const video = videoRef.current;
            video.srcObject = stream;
            
            const playPromise = video.play();
            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        console.log("Video playing successfully");
                        startRealTimeScanning();
                    })
                    .catch(err => {
                        console.error("Error playing video:", err);
                        showToast("Could not start camera preview. Try tapping the screen.", "warning");
                    });
            }
        } else {
            stopRealTimeScanning();
        }
        
        return () => {
            stopRealTimeScanning();
            if (videoRef.current && videoRef.current.srcObject) {
                const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
                tracks.forEach(track => track.stop());
                videoRef.current.srcObject = null;
            }
        };
    }, [stream, showCamera]);

    const startRealTimeScanning = () => {
        if (scanIntervalRef.current) return;
        
        setScanning(true);
        setDetectedBarcode(null);
        lastDetectedBarcodeRef.current = null;
        isProcessingBarcodeRef.current = false;
        
        const scanFrame = async () => {
            // Skip if already processing a barcode
            if (isProcessingBarcodeRef.current) return;
            
            if (!videoRef.current || !canvasRef.current || !stream) {
                return;
            }
            
            const video = videoRef.current;
            const canvas = canvasRef.current;
            
            if (video.readyState !== video.HAVE_ENOUGH_DATA) {
                return;
            }
            
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            
            ctx.drawImage(video, 0, 0);
            
            canvas.toBlob(async (blob) => {
                if (!blob || isProcessingBarcodeRef.current) return;
                
                try {
                    const formData = new FormData();
                    formData.append('file', blob, 'scan.jpg');
                    
                    const { getAuthHeaders } = await import('@/utils/api');
                    const authHeaders = await getAuthHeaders();
                    
                    const headers: HeadersInit = {};
                    if (authHeaders['x-user-id']) {
                        headers['x-user-id'] = authHeaders['x-user-id'] as string;
                    }
                    
                    const response = await fetch('/backend/nutrition/recognize-photo', {
                        method: 'POST',
                        headers,
                        body: formData,
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        if (data.barcode && data.method === 'barcode') {
                            // Only process if this is a new barcode (not the same one we just detected)
                            if (lastDetectedBarcodeRef.current === data.barcode) {
                                return; // Already processed this barcode
                            }
                            
                            // Mark as processing to prevent duplicate detections
                            isProcessingBarcodeRef.current = true;
                            lastDetectedBarcodeRef.current = data.barcode;
                            setDetectedBarcode(data.barcode);
                            stopRealTimeScanning();
                            
                            // If food found, navigate to health details
                            if (data.foods && data.foods.length > 0) {
                                const food = data.foods[0];
                                const foodId = food.id || data.barcode;
                                showToast(`Barcode found!`, "success");
                                stopCamera();
                                
                                // Navigate to food health details page
                                router.push(`/nutrition/food/${encodeURIComponent(foodId)}`);
                            } else {
                                // Barcode detected but no food found - try searching by barcode
                                showToast(`Barcode found! Searching...`, "info");
                                stopCamera();
                                setSearchQuery(data.barcode);
                                handleSearch(data.barcode);
                            }
                        }
                    }
                } catch (error) {
                    console.debug("Scan frame error:", error);
                    // Reset processing flag on error so scanning can continue
                    isProcessingBarcodeRef.current = false;
                }
            }, 'image/jpeg', 0.7);
        };
        
        // Increased interval to 800ms for better detection and less CPU usage
        scanIntervalRef.current = window.setInterval(scanFrame, 800);
    };

    const stopRealTimeScanning = () => {
        if (scanIntervalRef.current) {
            clearInterval(scanIntervalRef.current);
            scanIntervalRef.current = null;
        }
        setScanning(false);
        isProcessingBarcodeRef.current = false;
    };

    const startCamera = async () => {
        try {
            setCameraFailed(false);
            setShowCamera(true);
            await new Promise(resolve => setTimeout(resolve, 100));

            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                }
            });

            setStream(mediaStream);
        } catch (error: any) {
            setShowCamera(false);
            setCameraFailed(true);
            console.error("Camera error:", error);
            if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                showToast("Camera permission denied. Try manual barcode entry instead.", "warning");
                setShowManualBarcodeEntry(true);
            } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
                showToast("No camera found. Try manual barcode entry instead.", "warning");
                setShowManualBarcodeEntry(true);
            } else {
                showToast("Could not access camera. Try manual barcode entry instead.", "warning");
                setShowManualBarcodeEntry(true);
            }
        }
    };

    const stopCamera = () => {
        stopRealTimeScanning();
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        setShowCamera(false);
        setDetectedBarcode(null);
        lastDetectedBarcodeRef.current = null;
        isProcessingBarcodeRef.current = false;
    };

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            showToast("Please select an image file", "error");
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            showToast("Image file too large (max 10MB)", "error");
            return;
        }

        try {
            const formData = new FormData();
            formData.append('file', file);
            
            const { getAuthHeaders } = await import('@/utils/api');
            const authHeaders = await getAuthHeaders();
            
            const headers: HeadersInit = {};
            if (authHeaders['x-user-id']) {
                headers['x-user-id'] = authHeaders['x-user-id'] as string;
            }
            
            showToast("Processing image...", "info");
            const response = await fetch('/backend/nutrition/recognize-photo', {
                method: 'POST',
                headers,
                body: formData,
            });

            if (response.ok) {
                const data = await response.json();
                if (data.barcode && data.method === 'barcode') {
                    if (data.foods && data.foods.length > 0) {
                        const food = data.foods[0];
                        const foodId = food.id || data.barcode;
                        showToast(`Barcode found!`, "success");
                        router.push(`/nutrition/food/${encodeURIComponent(foodId)}`);
                    } else {
                        showToast(`Barcode found! Searching...`, "info");
                        setSearchQuery(data.barcode);
                        handleSearch(data.barcode);
                    }
                } else {
                    showToast("No barcode detected in image", "warning");
                }
            }
        } catch (error) {
            showToast("Failed to process image", "error");
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h1 className="text-3xl font-bold text-white mb-2">Food Health Scanner</h1>
                            <p className="text-gray-400">Discover the health quality of any food product</p>
                        </div>
                        <Link
                            href="/nutrition"
                            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                        >
                            Back to Nutrition
                        </Link>
                    </div>

                    {/* Search Bar */}
                    <div className="relative">
                        <div className="flex gap-2 flex-wrap">
                            <button
                                onClick={startCamera}
                                className="px-4 py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-xl transition-colors flex items-center gap-2 font-semibold shadow-lg shadow-orange-500/20"
                                title="Scan barcode with camera"
                            >
                                <Camera className="w-5 h-5" />
                                <span className="hidden sm:inline">Scan Barcode</span>
                                <span className="sm:hidden">Scan</span>
                            </button>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="px-4 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-colors flex items-center gap-2 font-semibold"
                                title="Upload image to scan barcode"
                            >
                                <Upload className="w-5 h-5" />
                                <span className="hidden sm:inline">Upload</span>
                            </button>
                            <button
                                onClick={() => setShowManualBarcodeEntry(true)}
                                className="px-4 py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-colors flex items-center gap-2 font-semibold"
                                title="Manually enter barcode number"
                            >
                                <Search className="w-5 h-5" />
                                <span className="hidden sm:inline">Manual Entry</span>
                                <span className="sm:hidden">Manual</span>
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleFileSelect}
                                className="hidden"
                            />
                            <div className="flex-1 relative min-w-[200px]">
                                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    placeholder="Search for any food product..."
                                    className="w-full pl-12 pr-4 py-4 bg-slate-700 text-white rounded-xl border-2 border-orange-500/20 focus:border-orange-500 focus:outline-none text-lg"
                                />
                            </div>
                            <button
                                onClick={handleSearchClick}
                                disabled={searching || searchQuery.trim().length < 2}
                                className="px-6 py-4 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-colors font-semibold"
                            >
                                {searching ? "Searching..." : "Search"}
                            </button>
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`px-4 py-4 rounded-xl transition-colors ${
                                    showFilters || hasActiveFilters
                                        ? "bg-orange-600 hover:bg-orange-700 text-white"
                                        : "bg-slate-700 hover:bg-slate-600 text-gray-300"
                                }`}
                                title="Filters"
                            >
                                <SlidersHorizontal className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Filters Panel */}
                    {showFilters && (
                        <div className="mt-4 p-4 bg-slate-800 rounded-xl border border-slate-700">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-white">Filters</h3>
                                {hasActiveFilters && (
                                    <button
                                        onClick={clearFilters}
                                        className="text-sm text-orange-400 hover:text-orange-300"
                                    >
                                        Clear All
                                    </button>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {/* Health Score Range */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Min Health Score
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={minHealthScore || ""}
                                        onChange={(e) => setMinHealthScore(e.target.value ? parseInt(e.target.value) : null)}
                                        placeholder="0"
                                        className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-orange-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Max Health Score
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={maxHealthScore || ""}
                                        onChange={(e) => setMaxHealthScore(e.target.value ? parseInt(e.target.value) : null)}
                                        placeholder="100"
                                        className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-orange-500 focus:outline-none"
                                    />
                                </div>

                                {/* NOVA Filter */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Processing Level (NOVA)
                                    </label>
                                    <select
                                        value={novaFilter || ""}
                                        onChange={(e) => setNovaFilter(e.target.value ? parseInt(e.target.value) : null)}
                                        className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-orange-500 focus:outline-none"
                                    >
                                        <option value="">All</option>
                                        <option value="1">1 - Unprocessed</option>
                                        <option value="2">2 - Processed Ingredients</option>
                                        <option value="3">3 - Processed</option>
                                        <option value="4">4 - Ultra-Processed</option>
                                    </select>
                                </div>

                                {/* Sort By */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Sort By
                                    </label>
                                    <select
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value as any)}
                                        className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-orange-500 focus:outline-none"
                                    >
                                        <option value="relevance">Relevance</option>
                                        <option value="healthiest">Healthiest First</option>
                                        <option value="lowest">Lowest Score First</option>
                                    </select>
                                </div>
                            </div>

                            {/* Checkbox Filters */}
                            <div className="mt-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={noHarmfulAdditives}
                                        onChange={(e) => setNoHarmfulAdditives(e.target.checked)}
                                        className="w-4 h-4 text-orange-600 bg-slate-700 border-slate-600 rounded focus:ring-orange-500"
                                    />
                                    <span className="text-sm text-gray-300">No harmful additives</span>
                                </label>
                            </div>
                        </div>
                    )}
                </div>

                {/* Recent Searches */}
                {recentSearches.length > 0 && searchResults.length === 0 && !searching && (
                    <div className="mb-6">
                        <div className="flex items-center gap-2 mb-3">
                            <Clock className="w-5 h-5 text-gray-400" />
                            <h3 className="text-lg font-semibold text-white">Recent Searches</h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {recentSearches.map((query, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleRecentSearch(query)}
                                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-gray-300 rounded-lg transition-colors text-sm"
                                >
                                    {query}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Search Results */}
                <div>
                    {searching ? (
                        <div className="text-center py-12 text-gray-400">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
                            Searching for foods...
                        </div>
                    ) : searchResults.length === 0 && searchQuery.trim().length >= 2 ? (
                        <div className="text-center py-12 text-gray-400">
                            <Search className="w-16 h-16 mx-auto mb-4 opacity-50" />
                            <p className="text-lg">No foods found matching your criteria.</p>
                            <p className="text-sm mt-2">Try adjusting your filters or search terms.</p>
                        </div>
                    ) : searchResults.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <Award className="w-16 h-16 mx-auto mb-4 opacity-50" />
                            <p className="text-lg">Start searching to discover food health scores</p>
                            <p className="text-sm mt-2">Search for any food product to see its health analysis</p>
                        </div>
                    ) : (
                        <>
                            <div className="mb-4 flex items-center justify-between">
                                <p className="text-gray-400">
                                    Found <span className="font-semibold text-white">{searchResults.length}</span> result{searchResults.length !== 1 ? 's' : ''}
                                </p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {searchResults.map((food) => (
                                    <div
                                        key={food.id || `${food.name}-${food.calories}`}
                                        className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl p-5 border-2 border-slate-600 hover:border-orange-500/40 transition-all shadow-lg hover:shadow-xl cursor-pointer"
                                        onClick={() => router.push(`/nutrition/food/${encodeURIComponent(food.id || food.name)}`)}
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-lg font-bold text-white mb-1 truncate">{food.name}</h3>
                                                {food.brand && (
                                                    <p className="text-sm text-gray-400 mb-2">{food.brand}</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Health Score - Prominent */}
                                        {food.health && food.health.health_score !== undefined && (
                                            <div className="mb-3">
                                                <FoodHealthBadge health={food.health} size="md" showLabel={true} />
                                            </div>
                                        )}

                                        {/* Quick Stats */}
                                        <div className="flex items-center gap-2 mb-3 flex-wrap">
                                            <span className="text-sm text-orange-400 font-medium">
                                                {food.calories || 0} cal
                                            </span>
                                            {food.health?.nutri_score?.grade && (
                                                <NutriScoreDisplay 
                                                    grade={food.health.nutri_score.grade}
                                                    size="sm"
                                                />
                                            )}
                                            {food.health?.nova?.group && (
                                                <NovaBadge 
                                                    group={food.health.nova.group}
                                                    size="sm"
                                                />
                                            )}
                                        </div>

                                        {/* Warning for harmful additives */}
                                        {food.health?.additives?.has_harmful && (
                                            <div className="mt-3 p-2 bg-red-900/20 border border-red-700/30 rounded-lg">
                                                <AdditivesList additives={food.health.additives} compact={true} />
                                            </div>
                                        )}

                                        <div className="mt-4 pt-4 border-t border-slate-600">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setShowHealthDetails(food);
                                                }}
                                                className="w-full py-2 text-sm text-orange-400 hover:text-orange-300 font-medium"
                                            >
                                                View Full Analysis →
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Health Details Modal */}
            {showHealthDetails && (
                <FoodHealthDetails
                    food={showHealthDetails}
                    isOpen={!!showHealthDetails}
                    onClose={() => setShowHealthDetails(null)}
                />
            )}

            {/* Camera View */}
            {showCamera && (
                <div className="fixed inset-0 bg-black z-50 flex flex-col">
                    <div className="flex-1 relative flex items-center justify-center">
                        {!stream ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-black">
                                <div className="text-center">
                                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
                                    <p className="text-white">Starting camera...</p>
                                </div>
                            </div>
                        ) : (
                            <>
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className="w-full h-full object-cover"
                                    style={{ transform: 'scaleX(-1)' }}
                                />
                                {/* Scanning overlay */}
                                {scanning && (
                                    <div className="absolute inset-0 pointer-events-none">
                                        {/* Scanning frame indicator */}
                                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-40 border-2 border-orange-500 rounded-lg shadow-lg">
                                            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-orange-500 rounded-tl-lg"></div>
                                            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-orange-500 rounded-tr-lg"></div>
                                            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-orange-500 rounded-bl-lg"></div>
                                            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-orange-500 rounded-br-lg"></div>
                                            <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-white text-sm font-medium bg-black/70 px-3 py-1 rounded">
                                                {detectedBarcode ? `Found: ${detectedBarcode}` : "Point camera at barcode"}
                                            </div>
                                        </div>
                                        {/* Scanning line animation */}
                                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-1 bg-orange-500/50 animate-pulse"></div>
                                    </div>
                                )}
                            </>
                        )}
                        <div className="absolute top-4 left-4 right-4 flex justify-between z-10">
                            <button
                                onClick={stopCamera}
                                className="p-3 bg-black/70 hover:bg-black/90 rounded-full text-white backdrop-blur-sm"
                            >
                                <X className="w-6 h-6" />
                            </button>
                            {scanning && (
                                <div className="px-4 py-2 bg-orange-600/90 rounded-full text-white text-sm font-medium flex items-center gap-2">
                                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                                    Scanning...
                                </div>
                            )}
                        </div>
                        <div className="absolute bottom-8 left-0 right-0 flex flex-col items-center gap-4 z-10">
                            <p className="text-white text-sm bg-black/70 px-4 py-2 rounded-full">
                                {detectedBarcode ? "Barcode detected! Processing..." : "Move camera over barcode"}
                            </p>
                        </div>
                    </div>
                    <canvas ref={canvasRef} className="hidden" />
                </div>
            )}

            {/* Manual Barcode Entry Modal */}
            <ManualBarcodeEntry
                isOpen={showManualBarcodeEntry}
                onClose={() => setShowManualBarcodeEntry(false)}
                onBarcodeFound={(barcode, food) => {
                    if (food) {
                        // Food found, navigate to details
                        const foodId = food.id || barcode;
                        router.push(`/nutrition/food/${encodeURIComponent(foodId)}`);
                    } else {
                        // No food found, search for the barcode
                        setSearchQuery(barcode);
                        handleSearch(barcode);
                    }
                }}
                title="Manual Barcode Entry"
                description="Enter the barcode number to look up the product"
            />

            {/* Barcode Scanner Modal (legacy - keeping for compatibility) */}
            {showBarcodeScanner && (
                <BarcodeScanner
                    onScanComplete={(food) => {
                        router.push(`/nutrition/food/${encodeURIComponent(food.id || food.name)}`);
                        setShowBarcodeScanner(false);
                    }}
                    onClose={() => setShowBarcodeScanner(false)}
                />
            )}
        </div>
    );
}

