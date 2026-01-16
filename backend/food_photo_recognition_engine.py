"""
Food Photo Recognition Engine
Uses AI/ML to identify foods from photos and estimate nutrition
"""
import json
import os
import base64
import requests
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime
import io

# Optional imports for image processing
try:
    from PIL import Image
    import numpy as np
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False
    np = None

# Try to use free/open-source alternatives first
# We'll use a combination of approaches:
# 1. Food101 dataset concepts (common foods)
# 2. Open Food Facts barcode detection if visible
# 3. Fallback to nutrition estimation based on visual analysis

def recognize_food_from_image(image_data: bytes, user_id: str) -> Dict[str, Any]:
    """
    Recognize food from image using multiple strategies
    Returns identified foods with confidence scores and estimated nutrition
    """
    results = {
        "foods": [],
        "confidence": 0.0,
        "method": "visual_estimation",
        "error": None
    }
    
    try:
        # Strategy 1: Try to detect barcode in image
        barcode_result = detect_barcode_in_image(image_data)
        if barcode_result and barcode_result.get("barcode"):
            barcode = barcode_result["barcode"]
            print(f"🔍 Barcode detected: {barcode}, searching database...")
            # If barcode found, use Open Food Facts
            from .food_database import search_food_by_barcode
            food_data = search_food_by_barcode(barcode)
            if food_data:
                print(f"✅ Found food for barcode {barcode}: {food_data.get('name')}")
                results["foods"] = [{
                    "id": food_data.get("id") or barcode,
                    "barcode": barcode,
                    "name": food_data.get("name", "Unknown"),
                    "brand": food_data.get("brand"),
                    "confidence": 0.95,
                    "nutrition": {
                        "calories": food_data.get("calories", 0),
                        "protein": food_data.get("protein", 0),
                        "carbs": food_data.get("carbs", 0),
                        "fats": food_data.get("fats", 0),
                        "fiber": food_data.get("fiber"),
                        "sugar": food_data.get("sugar"),
                        "sodium": food_data.get("sodium"),
                    },
                    "serving_size": food_data.get("serving_size", 100),
                    "serving_unit": food_data.get("serving_unit", "g"),
                    "source": "barcode_scan"
                }]
                results["confidence"] = 0.95
                results["method"] = "barcode"
                results["barcode"] = barcode
                return results
            else:
                print(f"⚠️  No food found for barcode {barcode}, falling back to visual recognition")
        
        # Strategy 2: Visual food recognition using common food patterns
        visual_result = recognize_food_visually(image_data)
        if visual_result and visual_result.get("foods"):
            results["foods"] = visual_result["foods"]
            results["confidence"] = visual_result.get("confidence", 0.7)
            results["method"] = "visual_recognition"
            return results
        
        # Strategy 3: Fallback - ask user to identify
        results["error"] = "Could not automatically identify food. Please enter the food name manually."
        results["method"] = "manual_required"
        
    except Exception as e:
        results["error"] = f"Recognition error: {str(e)}"
    
    return results

def detect_barcode_in_image(image_data: bytes) -> Optional[Dict[str, Any]]:
    """Try to detect and read barcode from image"""
    try:
        # Try using pyzbar if available
        try:
            from pyzbar import pyzbar
            from PIL import Image
            
            image = Image.open(io.BytesIO(image_data))
            
            # Try multiple image processing techniques for better detection
            # 1. Try original image
            barcodes = pyzbar.decode(image)
            
            # 2. If no barcode found, try converting to grayscale
            if not barcodes:
                gray_image = image.convert('L')
                barcodes = pyzbar.decode(gray_image)
            
            # 3. If still no barcode, try enhancing contrast
            if not barcodes and PIL_AVAILABLE:
                from PIL import ImageEnhance
                enhancer = ImageEnhance.Contrast(image)
                enhanced = enhancer.enhance(2.0)
                barcodes = pyzbar.decode(enhanced)
            
            # 4. Try sharpening the image
            if not barcodes and PIL_AVAILABLE:
                from PIL import ImageEnhance, ImageFilter
                sharpened = image.filter(ImageFilter.SHARPEN)
                barcodes = pyzbar.decode(sharpened)
                # Also try sharpened grayscale
                if not barcodes:
                    gray_sharpened = gray_image.filter(ImageFilter.SHARPEN)
                    barcodes = pyzbar.decode(gray_sharpened)
            
            # 5. Try adjusting brightness
            if not barcodes and PIL_AVAILABLE:
                from PIL import ImageEnhance
                brightness_enhancer = ImageEnhance.Brightness(gray_image)
                brighter = brightness_enhancer.enhance(1.3)
                barcodes = pyzbar.decode(brighter)
                if not barcodes:
                    darker = brightness_enhancer.enhance(0.7)
                    barcodes = pyzbar.decode(darker)
            
            # 6. Try resizing if image is too large/small
            if not barcodes:
                width, height = image.size
                if width > 2000 or height > 2000:
                    # Resize large images
                    resized = image.copy()
                    resized.thumbnail((2000, 2000), Image.Resampling.LANCZOS)
                    barcodes = pyzbar.decode(resized)
                    # Also try grayscale resized
                    if not barcodes:
                        gray_resized = gray_image.copy()
                        gray_resized.thumbnail((2000, 2000), Image.Resampling.LANCZOS)
                        barcodes = pyzbar.decode(gray_resized)
                elif width < 500 or height < 500:
                    # Enlarge small images - try multiple scales
                    for scale_factor in [1.5, 2.0, 2.5]:
                        new_size = (int(width * scale_factor), int(height * scale_factor))
                        resized = image.resize(new_size, Image.Resampling.LANCZOS)
                        barcodes = pyzbar.decode(resized)
                        if barcodes:
                            break
                        # Also try grayscale
                        gray_resized = gray_image.resize(new_size, Image.Resampling.LANCZOS)
                        barcodes = pyzbar.decode(gray_resized)
                        if barcodes:
                            break
            
            if barcodes:
                barcode = barcodes[0]
                barcode_str = barcode.data.decode('utf-8')
                
                # Fix EAN-13 barcode format: strip leading zero if present
                # EAN-13 barcodes can have a leading zero that should be removed for lookups
                if str(barcode.type) == "EAN13" and barcode_str.startswith('0') and len(barcode_str) == 13:
                    barcode_str = barcode_str[1:]  # Remove leading zero
                    print(f"✅ Detected EAN-13 barcode (stripped leading zero): {barcode_str}")
                else:
                    print(f"✅ Detected barcode: {barcode_str} (type: {barcode.type})")
                
                return {
                    "barcode": barcode_str,
                    "type": str(barcode.type),
                    "confidence": 0.9
                }
            else:
                print("⚠️  No barcode detected in image")
        except ImportError:
            print("⚠️  pyzbar not installed. Install with: pip install pyzbar Pillow")
            # pyzbar not available, skip barcode detection
            pass
        except Exception as e:
            print(f"⚠️  Barcode detection error: {e}")
            import traceback
            traceback.print_exc()
        
        return None
    except Exception as e:
        print(f"Barcode detection error: {e}")
        import traceback
        traceback.print_exc()
        return None

def recognize_food_visually(image_data: bytes) -> Dict[str, Any]:
    """
    Recognize food from image using visual analysis
    Uses common food patterns and color analysis
    """
    if not PIL_AVAILABLE:
        return {"foods": [], "confidence": 0.0}
    
    try:
        
        image = Image.open(io.BytesIO(image_data))
        
        # Resize for faster processing
        image.thumbnail((800, 800), Image.Resampling.LANCZOS)
        
        # Convert to RGB if needed
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Get image properties
        width, height = image.size
        pixels = np.array(image)
        
        # Analyze colors (dominant colors can indicate food type)
        colors = analyze_colors(pixels)
        
        # Analyze texture/patterns
        texture = analyze_texture(pixels)
        
        # Match against common food patterns
        foods = match_food_patterns(colors, texture, width, height)
        
        return {
            "foods": foods,
            "confidence": 0.6 if foods else 0.0,
            "analysis": {
                "dominant_colors": colors[:3],
                "texture": texture
            }
        }
        
    except Exception as e:
        print(f"Visual recognition error: {e}")
        return {"foods": [], "confidence": 0.0}

def analyze_colors(pixels) -> List[Tuple[int, int, int]]:
    """Analyze dominant colors in image"""
    try:
        # Reshape to list of pixels
        pixels_flat = pixels.reshape(-1, 3)
        
        # Sample pixels (every 10th pixel for speed)
        sample = pixels_flat[::10]
        
        # Simple k-means-like approach: find most common colors
        # Group similar colors
        colors = {}
        for pixel in sample:
            # Quantize to reduce color space
            r, g, b = pixel
            key = (r // 32 * 32, g // 32 * 32, b // 32 * 32)
            colors[key] = colors.get(key, 0) + 1
        
        # Sort by frequency
        sorted_colors = sorted(colors.items(), key=lambda x: x[1], reverse=True)
        return [color for color, count in sorted_colors[:5]]
        
    except Exception:
        return []

def analyze_texture(pixels) -> str:
    """Analyze texture patterns (smooth, rough, etc.)"""
    try:
        # Calculate variance in pixel values (roughness indicator)
        variance = np.var(pixels)
        
        if variance < 500:
            return "smooth"
        elif variance < 2000:
            return "medium"
        else:
            return "rough"
    except Exception:
        return "unknown"

def match_food_patterns(colors: List[Tuple[int, int, int]], texture: str, width: int, height: int) -> List[Dict[str, Any]]:
    """Match visual patterns to common foods"""
    foods = []
    
    # Food pattern database (common foods with visual characteristics)
    food_patterns = {
        "apple": {
            "colors": [(200, 50, 50), (255, 100, 100), (150, 200, 100)],  # Red, green
            "texture": "smooth",
            "nutrition": {"calories": 95, "protein": 0.5, "carbs": 25, "fats": 0.3}
        },
        "banana": {
            "colors": [(255, 220, 100), (200, 180, 50)],  # Yellow
            "texture": "smooth",
            "nutrition": {"calories": 105, "protein": 1.3, "carbs": 27, "fats": 0.4}
        },
        "chicken_breast": {
            "colors": [(200, 150, 120), (180, 130, 100)],  # Beige/tan
            "texture": "medium",
            "nutrition": {"calories": 165, "protein": 31, "carbs": 0, "fats": 3.6}
        },
        "rice": {
            "colors": [(255, 255, 240), (250, 250, 230)],  # White/cream
            "texture": "smooth",
            "nutrition": {"calories": 130, "protein": 2.7, "carbs": 28, "fats": 0.3}
        },
        "salad": {
            "colors": [(50, 150, 50), (100, 200, 100), (150, 200, 150)],  # Green
            "texture": "rough",
            "nutrition": {"calories": 20, "protein": 1, "carbs": 4, "fats": 0.2}
        },
        "pasta": {
            "colors": [(255, 250, 240), (240, 230, 220)],  # Cream/beige
            "texture": "smooth",
            "nutrition": {"calories": 131, "protein": 5, "carbs": 25, "fats": 1.1}
        },
        "bread": {
            "colors": [(220, 200, 160), (200, 180, 140)],  # Brown/tan
            "texture": "medium",
            "nutrition": {"calories": 265, "protein": 9, "carbs": 49, "fats": 3.2}
        },
        "eggs": {
            "colors": [(255, 250, 240), (240, 230, 200)],  # White/cream
            "texture": "smooth",
            "nutrition": {"calories": 155, "protein": 13, "carbs": 1.1, "fats": 11}
        },
        "fish": {
            "colors": [(200, 180, 150), (180, 160, 130)],  # Pink/tan
            "texture": "medium",
            "nutrition": {"calories": 206, "protein": 22, "carbs": 0, "fats": 12}
        },
        "vegetables": {
            "colors": [(50, 150, 50), (100, 200, 100), (200, 100, 50)],  # Green, orange
            "texture": "rough",
            "nutrition": {"calories": 25, "protein": 1, "carbs": 5, "fats": 0.2}
        }
    }
    
    # Match colors and texture
    for food_name, pattern in food_patterns.items():
        score = 0.0
        matches = 0
        
        # Check color matches
        pattern_colors = pattern["colors"]
        for pattern_color in pattern_colors:
            for img_color in colors[:3]:  # Check top 3 dominant colors
                # Calculate color distance
                distance = sum(abs(a - b) for a, b in zip(pattern_color, img_color))
                if distance < 100:  # Close match
                    score += 0.3
                    matches += 1
                    break
        
        # Check texture match
        if pattern["texture"] == texture:
            score += 0.2
        
        # If we have a reasonable match
        if score >= 0.3:
            foods.append({
                "name": food_name.replace("_", " ").title(),
                "confidence": min(score, 0.85),  # Cap confidence
                "nutrition": pattern["nutrition"],
                "source": "visual_pattern"
            })
    
    # Sort by confidence
    foods.sort(key=lambda x: x["confidence"], reverse=True)
    
    # Return top 3 matches
    return foods[:3]

def estimate_portion_size(food_name: str, image_data: bytes) -> Dict[str, Any]:
    """Estimate portion size from image"""
    if not PIL_AVAILABLE:
        return {
            "quantity": 1.0,
            "unit": "serving",
            "estimated_grams": 100,
            "confidence": 0.3
        }
    
    try:
        
        image = Image.open(io.BytesIO(image_data))
        width, height = image.size
        
        # Simple estimation based on image size and food type
        # This is a placeholder - real implementation would use object detection
        
        # Common portion sizes (in grams)
        default_portions = {
            "apple": 182,  # medium apple
            "banana": 118,  # medium banana
            "chicken breast": 100,  # 100g serving
            "rice": 100,  # 100g cooked
            "salad": 100,  # 100g
            "pasta": 100,  # 100g cooked
            "bread": 30,  # 1 slice
            "eggs": 50,  # 1 large egg
            "fish": 100,  # 100g
            "vegetables": 100,  # 100g
        }
        
        # Find matching food
        food_key = food_name.lower().replace(" ", "_")
        base_portion = default_portions.get(food_key, 100)
        
        # Estimate based on image coverage (very rough)
        # In a real implementation, you'd use object detection
        estimated_portion = base_portion
        
        return {
            "quantity": estimated_portion / 100,  # Convert to servings (assuming 100g = 1 serving)
            "unit": "serving",
            "estimated_grams": estimated_portion,
            "confidence": 0.5  # Low confidence for visual estimation
        }
        
    except Exception as e:
        print(f"Portion estimation error: {e}")
        return {
            "quantity": 1.0,
            "unit": "serving",
            "estimated_grams": 100,
            "confidence": 0.3
        }

def enhance_with_nutrition_api(food_name: str) -> Optional[Dict[str, Any]]:
    """Enhance food recognition with nutrition API lookup"""
    try:
        from .food_database import search_food_database
        
        # Search local database first
        results = search_food_database(food_name, limit=1)
        if results:
            food = results[0]
            return {
                "name": food.get("name", food_name),
                "brand": food.get("brand"),
                "nutrition": {
                    "calories": food.get("calories", 0),
                    "protein": food.get("protein", 0),
                    "carbs": food.get("carbs", 0),
                    "fats": food.get("fats", 0),
                },
                "source": "database"
            }
        
        return None
    except Exception:
        return None

