"use client";

import { useState, useRef, useEffect } from "react";
import { 
    Camera, Upload, X, CheckCircle, AlertCircle, 
    Loader2, Plus, Image as ImageIcon, Sparkles
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/context/ToastContext";
import { createNutritionEntry } from "@/utils/api";
import { ManualBarcodeEntry } from "@/components/ManualBarcodeEntry";

interface RecognizedFood {
    name: string;
    brand?: string;
    confidence: number;
    nutrition: {
        calories: number;
        protein: number;
        carbs: number;
        fats: number;
    };
    source: string;
}

interface RecognitionResult {
    foods: RecognizedFood[];
    confidence: number;
    method: string;
    error?: string;
}

export default function PhotoRecognitionPage() {
    const router = useRouter();
    const { showToast } = useToast();
    const [image, setImage] = useState<string | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [recognizing, setRecognizing] = useState(false);
    const [result, setResult] = useState<RecognitionResult | null>(null);
    const [selectedFood, setSelectedFood] = useState<RecognizedFood | null>(null);
    const [quantity, setQuantity] = useState(1.0);
    const [mealType, setMealType] = useState("breakfast");
    const [saving, setSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [showCamera, setShowCamera] = useState(false);
    const [scanning, setScanning] = useState(false);
    const [detectedBarcode, setDetectedBarcode] = useState<string | null>(null);
    const scanIntervalRef = useRef<number | null>(null);
    const lastDetectedBarcodeRef = useRef<string | null>(null);
    const isProcessingBarcodeRef = useRef<boolean>(false);
    const [showManualBarcodeEntry, setShowManualBarcodeEntry] = useState(false);

    useEffect(() => {
        return () => {
            // Cleanup camera stream on unmount
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [stream]);

    // Handle video element when stream is available
    useEffect(() => {
        if (stream && videoRef.current && showCamera) {
            const video = videoRef.current;
            video.srcObject = stream;
            
            // Ensure video plays on mobile
            const playPromise = video.play();
            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        console.log("Video playing successfully");
                        // Start real-time barcode scanning once video is playing
                        startRealTimeScanning();
                    })
                    .catch(err => {
                        console.error("Error playing video:", err);
                        showToast("Could not start camera preview. Try tapping the screen.", "warning");
                    });
            }
        } else {
            // Stop scanning when camera is closed
            stopRealTimeScanning();
        }
        
        return () => {
            // Cleanup when component unmounts or stream changes
            stopRealTimeScanning();
            if (videoRef.current && videoRef.current.srcObject) {
                const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
                tracks.forEach(track => track.stop());
                videoRef.current.srcObject = null;
            }
        };
    }, [stream, showCamera]);

    const startRealTimeScanning = () => {
        if (scanIntervalRef.current) return; // Already scanning
        
        setScanning(true);
        setDetectedBarcode(null);
        lastDetectedBarcodeRef.current = null;
        isProcessingBarcodeRef.current = false;
        
        // Scan every 800ms to balance performance and responsiveness
        const scanFrame = async () => {
            // Skip if already processing a barcode
            if (isProcessingBarcodeRef.current) return;
            
            if (!videoRef.current || !canvasRef.current || !stream) {
                return;
            }
            
            const video = videoRef.current;
            const canvas = canvasRef.current;
            
            // Check if video is ready
            if (video.readyState !== video.HAVE_ENOUGH_DATA) {
                return;
            }
            
            // Capture frame
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            
            ctx.drawImage(video, 0, 0);
            
            // Convert canvas to blob and send for barcode detection
            canvas.toBlob(async (blob) => {
                if (!blob || isProcessingBarcodeRef.current) return;
                
                try {
                    const formData = new FormData();
                    formData.append('file', blob, 'scan.jpg');
                    
                    // Get auth headers
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
                            
                            // Auto-process the barcode result
                            if (data.foods && data.foods.length > 0) {
                                setResult(data);
                                setSelectedFood(data.foods[0]);
                                showToast(`Barcode found!`, "success");
                                stopCamera();
                                
                                // Create a file from the current frame for the preview
                                canvas.toBlob((previewBlob) => {
                                    if (previewBlob) {
                                        const file = new File([previewBlob], 'barcode-scan.jpg', { type: 'image/jpeg' });
                                        setImageFile(file);
                                        const reader = new FileReader();
                                        reader.onload = (e) => {
                                            setImage(e.target?.result as string);
                                        };
                                        reader.readAsDataURL(file);
                                    }
                                }, 'image/jpeg', 0.9);
                            }
                        }
                    }
                } catch (error) {
                    // Silently fail - we're scanning continuously, errors are expected
                    console.debug("Scan frame error (expected during continuous scanning):", error);
                    // Reset processing flag on error so scanning can continue
                    isProcessingBarcodeRef.current = false;
                }
            }, 'image/jpeg', 0.7); // Lower quality for faster processing
        };
        
        // Start scanning loop - increased interval for better detection
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
            // Show camera view first
            setShowCamera(true);
            
            // Wait a bit for the video element to be rendered
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { 
                    facingMode: 'environment', // Use back camera on mobile
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                }
            });
            
            setStream(mediaStream);
        } catch (error: any) {
            setShowCamera(false);
            console.error("Camera error:", error);
            if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                showToast("Camera permission denied. Please allow camera access in your browser settings.", "error");
            } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
                showToast("No camera found. Please use file upload instead.", "error");
            } else {
                showToast("Could not access camera. Please use file upload instead.", "error");
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

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(video, 0, 0);
                canvas.toBlob((blob) => {
                    if (blob) {
                        const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
                        handleImageSelect(file);
                        stopCamera();
                    }
                }, 'image/jpeg', 0.9);
            }
        }
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            handleImageSelect(file);
        }
    };

    const handleImageSelect = (file: File) => {
        // Validate file type
        if (!file.type.startsWith('image/')) {
            showToast("Please select an image file", "error");
            return;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            showToast("Image file too large (max 10MB)", "error");
            return;
        }

        setImageFile(file);
        setResult(null);
        setSelectedFood(null);

        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => {
            setImage(e.target?.result as string);
        };
        reader.readAsDataURL(file);
    };

    const recognizeFood = async () => {
        if (!imageFile) return;

        setRecognizing(true);
        setResult(null);

        try {
            const formData = new FormData();
            formData.append('file', imageFile);

            // Get auth headers
            const { getAuthHeaders } = await import('@/utils/api');
            const authHeaders = await getAuthHeaders();
            
            // Remove Content-Type to let browser set it with boundary for FormData
            const headers: HeadersInit = {};
            if (authHeaders['x-user-id']) {
                headers['x-user-id'] = authHeaders['x-user-id'] as string;
            }

            const response = await fetch('/backend/nutrition/recognize-photo', {
                method: 'POST',
                headers,
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Recognition failed');
            }

            const data: RecognitionResult = await response.json();
            setResult(data);

            if (data.foods && data.foods.length > 0) {
                // Auto-select highest confidence food
                setSelectedFood(data.foods[0]);
                showToast(`Recognized ${data.foods.length} food(s)!`, "success");
            } else if (data.error) {
                showToast(data.error, "warning");
            }
        } catch (error: any) {
            showToast(error.message || "Failed to recognize food", "error");
        } finally {
            setRecognizing(false);
        }
    };

    const handleSaveEntry = async () => {
        if (!selectedFood) return;

        setSaving(true);
        try {
            await createNutritionEntry({
                food_item: {
                    id: `photo_${Date.now()}`,
                    name: selectedFood.name,
                    brand: selectedFood.brand,
                    serving_size: "1 serving",
                    calories: selectedFood.nutrition.calories,
                    protein: selectedFood.nutrition.protein,
                    carbs: selectedFood.nutrition.carbs,
                    fats: selectedFood.nutrition.fats,
                    source: "photo_recognition"
                },
                quantity: quantity,
                unit: "serving",
                meal_type: mealType,
                date: new Date().toISOString().split('T')[0],
                nutrition: {
                    calories: selectedFood.nutrition.calories * quantity,
                    protein: selectedFood.nutrition.protein * quantity,
                    carbs: selectedFood.nutrition.carbs * quantity,
                    fats: selectedFood.nutrition.fats * quantity,
                },
            });

            showToast(`${selectedFood.name} added to ${mealType}!`, "success");
            router.push("/nutrition");
        } catch (error) {
            showToast("Failed to save food entry", "error");
        } finally {
            setSaving(false);
        }
    };

    const reset = () => {
        setImage(null);
        setImageFile(null);
        setResult(null);
        setSelectedFood(null);
        setQuantity(1.0);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    return (
        <div className="min-h-screen bg-gray-950 p-4 md:p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-white mb-2">Food Photo Recognition</h1>
                    <p className="text-gray-400">Take a photo or upload an image to identify food and log nutrition</p>
                </div>

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
                                        style={{ transform: 'scaleX(-1)' }} // Mirror the preview
                                    />
                                    {/* Scanning overlay */}
                                    {scanning && (
                                        <div className="absolute inset-0 pointer-events-none">
                                            {/* Scanning frame indicator */}
                                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-40 border-2 border-blue-500 rounded-lg shadow-lg">
                                                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-lg"></div>
                                                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-lg"></div>
                                                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-lg"></div>
                                                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-lg"></div>
                                                <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-white text-sm font-medium bg-black/70 px-3 py-1 rounded">
                                                    {detectedBarcode ? `Found: ${detectedBarcode}` : "Point camera at barcode"}
                                                </div>
                                            </div>
                                            {/* Scanning line animation */}
                                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-1 bg-blue-500/50 animate-pulse"></div>
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
                                    <div className="px-4 py-2 bg-blue-600/90 rounded-full text-white text-sm font-medium flex items-center gap-2">
                                        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                                        Scanning...
                                    </div>
                                )}
                            </div>
                            <div className="absolute bottom-8 left-0 right-0 flex flex-col items-center gap-4 z-10">
                                {!detectedBarcode && (
                                    <button
                                        onClick={capturePhoto}
                                        disabled={!stream}
                                        className="w-20 h-20 rounded-full bg-white border-4 border-gray-300 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-transform"
                                    >
                                        <div className="w-16 h-16 rounded-full bg-white border-2 border-gray-400"></div>
                                    </button>
                                )}
                                <p className="text-white text-sm bg-black/70 px-4 py-2 rounded-full">
                                    {detectedBarcode ? "Barcode detected! Processing..." : "Move camera over barcode or tap to capture photo"}
                                </p>
                            </div>
                        </div>
                        <canvas ref={canvasRef} className="hidden" />
                    </div>
                )}

                {/* Image Upload/Capture */}
                {!image && !showCamera && (
                    <div className="bg-gray-900 rounded-lg p-8 border border-gray-800 mb-6">
                        <div className="flex flex-col md:flex-row gap-4">
                            <button
                                onClick={startCamera}
                                className="flex-1 flex flex-col items-center justify-center p-8 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                            >
                                <Camera className="w-12 h-12 text-white mb-3" />
                                <span className="text-white font-medium">Take Photo</span>
                            </button>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="flex-1 flex flex-col items-center justify-center p-8 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                            >
                                <Upload className="w-12 h-12 text-white mb-3" />
                                <span className="text-white font-medium">Upload Image</span>
                            </button>
                            <button
                                onClick={() => setShowManualBarcodeEntry(true)}
                                className="flex-1 flex flex-col items-center justify-center p-8 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                            >
                                <ImageIcon className="w-12 h-12 text-white mb-3" />
                                <span className="text-white font-medium">Manual Barcode</span>
                            </button>
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                    </div>
                )}

                {/* Image Preview */}
                {image && (
                    <div className="bg-gray-900 rounded-lg p-6 border border-gray-800 mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-white">Photo Preview</h2>
                            <button
                                onClick={reset}
                                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>
                        <div className="relative mb-4">
                            <img
                                src={image}
                                alt="Food photo"
                                className="w-full max-h-96 object-contain rounded-lg"
                            />
                        </div>
                        <button
                            onClick={recognizeFood}
                            disabled={recognizing}
                            className="w-full px-6 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            {recognizing ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Recognizing...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-5 h-5" />
                                    Recognize Food
                                </>
                            )}
                        </button>
                    </div>
                )}

                {/* Recognition Results */}
                {result && (
                    <div className="space-y-4">
                        {result.error ? (
                            <div className="bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5" />
                                    <div>
                                        <h3 className="font-semibold text-yellow-400 mb-1">Recognition Issue</h3>
                                        <p className="text-yellow-300 text-sm">{result.error}</p>
                                    </div>
                                </div>
                            </div>
                        ) : result.foods && result.foods.length > 0 ? (
                            <>
                                <div className="bg-blue-900/20 border border-blue-500/50 rounded-lg p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <CheckCircle className="w-5 h-5 text-blue-400" />
                                        <span className="text-blue-300 font-medium">
                                            Found {result.foods.length} food(s) ({(result.confidence * 100).toFixed(0)}% confidence)
                                        </span>
                                    </div>
                                    <p className="text-blue-400 text-sm">
                                        Method: {result.method.replace('_', ' ').replace('database', 'Database').replace('barcode', 'Barcode').replace('visual', 'Visual')}
                                    </p>
                                </div>

                                {/* Food Selection */}
                                <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
                                    <h3 className="text-lg font-bold text-white mb-4">Select Food</h3>
                                    <div className="space-y-3 mb-6">
                                        {result.foods.map((food, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => setSelectedFood(food)}
                                                className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                                                    selectedFood?.name === food.name
                                                        ? "border-orange-500 bg-orange-500/10"
                                                        : "border-gray-700 bg-gray-800 hover:border-gray-600"
                                                }`}
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <div>
                                                        <h4 className="font-semibold text-white">{food.name}</h4>
                                                        {food.brand && (
                                                            <p className="text-sm text-gray-400">{food.brand}</p>
                                                        )}
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-sm text-orange-400 font-medium">
                                                            {(food.confidence * 100).toFixed(0)}% match
                                                        </div>
                                                        <div className="text-xs text-gray-500">{food.source}</div>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-4 gap-2 text-sm">
                                                    <div>
                                                        <span className="text-gray-400">Cal:</span>
                                                        <span className="text-white ml-1">{Math.round(food.nutrition.calories)}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-400">P:</span>
                                                        <span className="text-white ml-1">{food.nutrition.protein.toFixed(1)}g</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-400">C:</span>
                                                        <span className="text-white ml-1">{food.nutrition.carbs.toFixed(1)}g</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-400">F:</span>
                                                        <span className="text-white ml-1">{food.nutrition.fats.toFixed(1)}g</span>
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>

                                    {/* Log Entry Form */}
                                    {selectedFood && (
                                        <div className="border-t border-gray-700 pt-6 space-y-4">
                                            <h3 className="text-lg font-bold text-white mb-4">Log Entry</h3>
                                            
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-sm text-gray-400 mb-2 block">Meal Type</label>
                                                    <select
                                                        value={mealType}
                                                        onChange={(e) => setMealType(e.target.value)}
                                                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg"
                                                    >
                                                        <option value="breakfast">Breakfast</option>
                                                        <option value="lunch">Lunch</option>
                                                        <option value="dinner">Dinner</option>
                                                        <option value="snack">Snack</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-sm text-gray-400 mb-2 block">Quantity</label>
                                                    <input
                                                        type="number"
                                                        value={quantity}
                                                        onChange={(e) => setQuantity(parseFloat(e.target.value) || 1)}
                                                        min="0.1"
                                                        step="0.1"
                                                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg"
                                                    />
                                                </div>
                                            </div>

                                            <div className="bg-gray-800 rounded-lg p-4">
                                                <div className="text-sm text-gray-400 mb-2">Nutrition (Total)</div>
                                                <div className="grid grid-cols-4 gap-4 text-center">
                                                    <div>
                                                        <div className="text-orange-400 font-bold">
                                                            {Math.round(selectedFood.nutrition.calories * quantity)}
                                                        </div>
                                                        <div className="text-xs text-gray-500">Calories</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-blue-400 font-bold">
                                                            {(selectedFood.nutrition.protein * quantity).toFixed(1)}g
                                                        </div>
                                                        <div className="text-xs text-gray-500">Protein</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-green-400 font-bold">
                                                            {(selectedFood.nutrition.carbs * quantity).toFixed(1)}g
                                                        </div>
                                                        <div className="text-xs text-gray-500">Carbs</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-yellow-400 font-bold">
                                                            {(selectedFood.nutrition.fats * quantity).toFixed(1)}g
                                                        </div>
                                                        <div className="text-xs text-gray-500">Fats</div>
                                                    </div>
                                                </div>
                                            </div>

                                            <button
                                                onClick={handleSaveEntry}
                                                disabled={saving}
                                                className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                                            >
                                                {saving ? (
                                                    <>
                                                        <Loader2 className="w-5 h-5 animate-spin" />
                                                        Saving...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Plus className="w-5 h-5" />
                                                        Add to {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="bg-gray-900 rounded-lg p-6 border border-gray-800 text-center">
                                <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                                <p className="text-gray-400">No foods recognized. Try a clearer photo or different angle.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Manual Barcode Entry Modal */}
                <ManualBarcodeEntry
                    isOpen={showManualBarcodeEntry}
                    onClose={() => setShowManualBarcodeEntry(false)}
                    onBarcodeFound={async (barcode) => {
                        try {
                            setRecognizing(true);
                            setResult(null);

                            // Use the same endpoint as photo recognition but with a dummy image
                            const formData = new FormData();
                            const canvas = document.createElement('canvas');
                            canvas.width = 1;
                            canvas.height = 1;
                            canvas.toBlob(async (blob) => {
                                if (blob) {
                                    formData.append('file', blob, 'dummy.jpg');
                                    formData.append('barcode', barcode);

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
                                        setResult(data);

                                        if (data.foods && data.foods.length > 0) {
                                            setSelectedFood(data.foods[0]);
                                            showToast(`Product found!`, "success");
                                        } else {
                                            showToast("Barcode found but no detailed nutrition data available", "warning");
                                        }

                                        // Create a dummy image preview for consistency
                                        canvas.toBlob((previewBlob) => {
                                            if (previewBlob) {
                                                const file = new File([previewBlob], 'barcode-entry.jpg', { type: 'image/jpeg' });
                                                setImageFile(file);
                                                const reader = new FileReader();
                                                reader.onload = (e) => {
                                                    setImage(e.target?.result as string);
                                                };
                                                reader.readAsDataURL(file);
                                            }
                                        }, 'image/jpeg', 0.1);
                                    } else {
                                        throw new Error('Product not found');
                                    }
                                }
                            }, 'image/jpeg', 0.1);
                        } catch (error: any) {
                            showToast(error.message || "Product not found", "error");
                        } finally {
                            setRecognizing(false);
                        }
                    }}
                    title="Manual Barcode Entry"
                    description="Enter the barcode number to identify the food product"
                />
            </div>
        </div>
    );
}

