"""
Food Health Scoring Engine - Yuka-like feature
Calculates health scores based on Nutri-Score, NOVA classification, additives, and ingredients
All data from Open Food Facts (FREE, no licensing required)
"""
from typing import Dict, List, Optional, Any, Tuple

# Harmful additives (E-numbers) - known to be problematic
HARMFUL_ADDITIVES = {
    "e621", "e951", "e621i", "e951i",  # MSG, Aspartame
    "e250", "e251", "e252",  # Nitrites/Nitrates
    "e102", "e104", "e110", "e122", "e124", "e129",  # Artificial colors (azo dyes)
    "e211", "e212", "e213", "e214", "e215", "e216", "e217", "e218", "e219",  # Benzoates
    "e220", "e221", "e222", "e223", "e224", "e225", "e226", "e227", "e228",  # Sulfites
    "e249", "e250",  # Nitrites
    "e320", "e321",  # BHA, BHT (antioxidants)
    "e407", "e407a",  # Carrageenan (controversial)
    "e450", "e451", "e452",  # Phosphates
    "e621", "e622", "e623", "e624", "e625",  # Glutamates
}

# Questionable additives - mixed research
QUESTIONABLE_ADDITIVES = {
    "e100", "e101", "e120", "e133", "e140", "e141", "e150", "e151", "e153", "e154", "e155",  # Colors
    "e200", "e201", "e202", "e203", "e210",  # Preservatives
    "e300", "e301", "e302", "e303", "e304", "e306", "e307", "e308", "e309",  # Antioxidants
    "e400", "e401", "e402", "e403", "e404", "e405", "e406", "e410", "e412", "e415",  # Emulsifiers/thickeners
    "e420", "e421", "e422", "e950", "e951", "e952", "e953", "e954", "e955", "e956", "e957", "e959",  # Sweeteners
}

def calculate_health_score(food_data: Dict[str, Any]) -> Tuple[int, Dict[str, Any]]:
    """
    Calculate health score (0-100) based on multiple factors.
    Returns: (score, breakdown_dict)
    """
    breakdown = {
        "nutri_score_points": 0,
        "nova_points": 0,
        "additives_points": 0,
        "ingredient_quality_points": 0,
    }
    
    # 1. Nutri-Score (40% weight)
    nutri_score_grade = food_data.get("nutri_score", "").upper() if food_data.get("nutri_score") else None
    if nutri_score_grade:
        nutri_score_map = {"A": 100, "B": 80, "C": 60, "D": 40, "E": 20}
        breakdown["nutri_score_points"] = nutri_score_map.get(nutri_score_grade, 50)
    else:
        # If no Nutri-Score, estimate from nutrition data
        breakdown["nutri_score_points"] = estimate_nutri_score_from_nutrition(food_data)
    
    # 2. NOVA Classification (30% weight)
    nova_group = food_data.get("nova_group")
    if nova_group:
        nova_score_map = {1: 100, 2: 75, 3: 50, 4: 25}
        breakdown["nova_points"] = nova_score_map.get(nova_group, 50)
    else:
        # If no NOVA, estimate from ingredients
        breakdown["nova_points"] = estimate_nova_from_ingredients(food_data)
    
    # 3. Additives (20% weight)
    additives = food_data.get("additives", []) or []
    breakdown["additives_points"] = score_additives(additives)
    
    # 4. Ingredient Quality (10% weight)
    ingredients_analysis = food_data.get("ingredients_analysis", []) or []
    ingredients_text = food_data.get("ingredients_text", "").lower()
    breakdown["ingredient_quality_points"] = score_ingredient_quality(ingredients_analysis, ingredients_text)
    
    # Calculate weighted total
    total_score = (
        breakdown["nutri_score_points"] * 0.40 +
        breakdown["nova_points"] * 0.30 +
        breakdown["additives_points"] * 0.20 +
        breakdown["ingredient_quality_points"] * 0.10
    )
    
    # Round to integer
    final_score = max(0, min(100, int(round(total_score))))
    
    breakdown["final_score"] = final_score
    breakdown["grade"] = get_health_grade(final_score)
    
    return final_score, breakdown

def estimate_nutri_score_from_nutrition(food_data: Dict[str, Any]) -> int:
    """Estimate Nutri-Score points from basic nutrition data when Nutri-Score is not available"""
    calories = food_data.get("calories", 0) or 0
    protein = food_data.get("protein", 0) or 0
    sugar = food_data.get("sugar", 0) or 0
    sodium = food_data.get("sodium", 0) or 0
    fiber = food_data.get("fiber", 0) or 0
    
    # Simple heuristic: lower calories, higher protein/fiber, lower sugar/sodium = better
    score = 50  # Start at neutral
    
    # Calories (per 100g)
    if calories < 100:
        score += 10
    elif calories < 200:
        score += 5
    elif calories > 400:
        score -= 15
    elif calories > 300:
        score -= 10
    
    # Protein
    if protein > 20:
        score += 10
    elif protein > 10:
        score += 5
    elif protein < 3:
        score -= 5
    
    # Sugar
    if sugar < 5:
        score += 10
    elif sugar < 10:
        score += 5
    elif sugar > 20:
        score -= 15
    elif sugar > 15:
        score -= 10
    
    # Sodium
    if sodium < 300:
        score += 5
    elif sodium > 1000:
        score -= 10
    elif sodium > 600:
        score -= 5
    
    # Fiber
    if fiber > 5:
        score += 10
    elif fiber > 3:
        score += 5
    
    return max(20, min(100, score))

def estimate_nova_from_ingredients(food_data: Dict[str, Any]) -> int:
    """Estimate NOVA group from ingredients when NOVA is not available"""
    ingredients_text = (food_data.get("ingredients_text", "") or "").lower()
    
    if not ingredients_text:
        return 50  # Unknown
    
    # Ultra-processed indicators
    ultra_processed_keywords = [
        "hydrogenated", "modified", "starch", "dextrose", "fructose", "corn syrup",
        "high fructose", "maltodextrin", "carrageenan", "xanthan gum", "guar gum",
        "artificial", "flavor", "flavoring", "color", "coloring", "preservative",
        "sodium benzoate", "potassium sorbate", "bha", "bht", "tbhq"
    ]
    
    # Processed indicators
    processed_keywords = [
        "salt", "sugar", "oil", "butter", "cheese", "bread", "canned", "frozen"
    ]
    
    ultra_processed_count = sum(1 for keyword in ultra_processed_keywords if keyword in ingredients_text)
    processed_count = sum(1 for keyword in processed_keywords if keyword in ingredients_text)
    
    if ultra_processed_count >= 3:
        return 25  # NOVA 4 (ultra-processed)
    elif ultra_processed_count >= 1:
        return 50  # NOVA 3 (processed)
    elif processed_count >= 2:
        return 75  # NOVA 2 (processed culinary ingredients)
    else:
        return 100  # NOVA 1 (unprocessed/minimally processed)

def score_additives(additives: List[str]) -> int:
    """Score additives: 100 = no additives, lower = more/harmful additives"""
    if not additives or len(additives) == 0:
        return 100
    
    harmful_count = 0
    questionable_count = 0
    
    for additive in additives:
        additive_lower = additive.lower().replace("en:", "").replace("e", "e")
        
        # Check if it's an E-number
        if additive_lower.startswith("e") and len(additive_lower) >= 3:
            if additive_lower in HARMFUL_ADDITIVES:
                harmful_count += 1
            elif additive_lower in QUESTIONABLE_ADDITIVES:
                questionable_count += 1
    
    # Calculate score
    score = 100
    score -= harmful_count * 15  # -15 points per harmful additive
    score -= questionable_count * 5  # -5 points per questionable additive
    score -= (len(additives) - harmful_count - questionable_count) * 2  # -2 points per other additive
    
    return max(0, min(100, score))

def score_ingredient_quality(ingredients_analysis: List[str], ingredients_text: str) -> int:
    """Score ingredient quality based on analysis tags and text"""
    score = 50  # Start neutral
    
    # Positive indicators
    positive_tags = ["en:vegan", "en:vegetarian", "en:organic", "en:palm-oil-free", 
                     "en:no-additives", "en:no-preservatives", "en:no-artificial-colors"]
    for tag in ingredients_analysis:
        if any(pos in tag.lower() for pos in positive_tags):
            score += 5
    
    # Negative indicators
    negative_keywords = ["artificial", "hydrogenated", "trans fat", "high fructose", 
                        "corn syrup", "sodium nitrite", "sodium benzoate"]
    negative_count = sum(1 for keyword in negative_keywords if keyword in ingredients_text.lower())
    score -= negative_count * 5
    
    return max(0, min(100, score))

def get_health_grade(score: int) -> str:
    """Convert numeric score to letter grade"""
    if score >= 80:
        return "A"
    elif score >= 60:
        return "B"
    elif score >= 40:
        return "C"
    elif score >= 20:
        return "D"
    else:
        return "E"

def get_nutri_score_description(grade: Optional[str]) -> str:
    """Get description for Nutri-Score grade"""
    if not grade:
        return "Not available"
    
    descriptions = {
        "A": "Excellent nutritional quality",
        "B": "Good nutritional quality",
        "C": "Average nutritional quality",
        "D": "Poor nutritional quality",
        "E": "Very poor nutritional quality"
    }
    return descriptions.get(grade.upper(), "Unknown")

def get_nova_description(group: Optional[int]) -> str:
    """Get description for NOVA classification"""
    if not group:
        return "Not available"
    
    descriptions = {
        1: "Unprocessed or minimally processed foods",
        2: "Processed culinary ingredients",
        3: "Processed foods",
        4: "Ultra-processed foods"
    }
    return descriptions.get(group, "Unknown")

def get_additive_analysis(additives: List[str]) -> Dict[str, Any]:
    """Analyze additives and categorize them"""
    harmful = []
    questionable = []
    safe = []
    
    for additive in additives:
        additive_lower = additive.lower().replace("en:", "").replace("e", "e")
        
        if additive_lower.startswith("e") and len(additive_lower) >= 3:
            if additive_lower in HARMFUL_ADDITIVES:
                harmful.append(additive)
            elif additive_lower in QUESTIONABLE_ADDITIVES:
                questionable.append(additive)
            else:
                safe.append(additive)
        else:
            safe.append(additive)
    
    return {
        "total": len(additives),
        "harmful": harmful,
        "questionable": questionable,
        "safe": safe,
        "has_harmful": len(harmful) > 0,
        "has_questionable": len(questionable) > 0
    }

def get_health_recommendation(score: int, breakdown: Dict[str, Any]) -> str:
    """Get health recommendation based on score"""
    if score >= 80:
        return "Excellent choice! This is a healthy food."
    elif score >= 60:
        return "Good choice. This food is generally healthy."
    elif score >= 40:
        return "Moderate choice. Consider healthier alternatives."
    elif score >= 20:
        return "Poor choice. This food has significant health concerns."
    else:
        return "Very poor choice. Avoid this food if possible."

def analyze_food_health(food_data: Dict[str, Any]) -> Dict[str, Any]:
    """Complete health analysis of a food item"""
    score, breakdown = calculate_health_score(food_data)
    additives_analysis = get_additive_analysis(food_data.get("additives", []) or [])
    
    return {
        "health_score": score,
        "health_grade": breakdown["grade"],
        "breakdown": breakdown,
        "nutri_score": {
            "grade": food_data.get("nutri_score"),
            "description": get_nutri_score_description(food_data.get("nutri_score"))
        },
        "nova": {
            "group": food_data.get("nova_group"),
            "description": get_nova_description(food_data.get("nova_group"))
        },
        "additives": additives_analysis,
        "ingredients_analysis": food_data.get("ingredients_analysis", []),
        "ecoscore": food_data.get("ecoscore"),
        "recommendation": get_health_recommendation(score, breakdown)
    }

def find_healthier_alternatives(
    current_food: Dict[str, Any],
    all_foods: List[Dict[str, Any]],
    limit: int = 5
) -> List[Dict[str, Any]]:
    """
    Find healthier alternatives to the current food.
    Returns list of alternative foods with better health scores and similar nutrition profile.
    """
    from .food_database import search_local_database
    
    if not current_food:
        return []
    
    current_score = current_food.get("health", {}).get("health_score", 0) if isinstance(current_food.get("health"), dict) else 0
    current_name = current_food.get("name", "").lower()
    
    # Extract key terms from food name (remove brand names, common words)
    name_words = current_name.split()
    key_terms = [w for w in name_words if len(w) > 3 and w not in ["the", "and", "with", "from", "organic", "fresh"]]
    
    if not key_terms:
        return []
    
    # Search for similar foods using the main ingredient/food type
    search_query = key_terms[0] if key_terms else current_name
    similar_foods = search_local_database(search_query, limit=50)
    
    alternatives = []
    for food in similar_foods:
        # Skip if it's the same food
        if food.get("id") == current_food.get("id") or food.get("name", "").lower() == current_name:
            continue
        
        # Calculate health score if not present
        if not food.get("health"):
            try:
                health_analysis = analyze_food_health(food)
                food["health"] = health_analysis
            except:
                continue
        
        food_score = food.get("health", {}).get("health_score", 0) if isinstance(food.get("health"), dict) else 0
        
        # Only include foods with better health scores
        if food_score > current_score:
            # Calculate similarity score based on nutrition profile
            similarity = calculate_nutrition_similarity(current_food, food)
            
            alternatives.append({
                "food": food,
                "health_score": food_score,
                "score_improvement": food_score - current_score,
                "similarity": similarity,
                "explanation": generate_alternative_explanation(current_food, food, current_score, food_score)
            })
    
    # Sort by score improvement and similarity
    alternatives.sort(key=lambda x: (x["score_improvement"], x["similarity"]), reverse=True)
    
    return alternatives[:limit]

def calculate_nutrition_similarity(food1: Dict[str, Any], food2: Dict[str, Any]) -> float:
    """Calculate similarity between two foods based on nutrition profile (0-1)"""
    # Compare calories, protein, carbs, fats
    cal1 = food1.get("calories", 0) or 0
    cal2 = food2.get("calories", 0) or 0
    prot1 = food1.get("protein", 0) or 0
    prot2 = food2.get("protein", 0) or 0
    carb1 = food1.get("carbs", 0) or 0
    carb2 = food2.get("carbs", 0) or 0
    fat1 = food1.get("fats", 0) or 0
    fat2 = food2.get("fats", 0) or 0
    
    # Normalize differences (use relative differences)
    cal_diff = abs(cal1 - cal2) / max(cal1, cal2, 1)
    prot_diff = abs(prot1 - prot2) / max(prot1, prot2, 1)
    carb_diff = abs(carb1 - carb2) / max(carb1, carb2, 1)
    fat_diff = abs(fat1 - fat2) / max(fat1, fat2, 1)
    
    # Average similarity (lower difference = higher similarity)
    avg_diff = (cal_diff + prot_diff + carb_diff + fat_diff) / 4
    similarity = max(0, 1 - avg_diff)
    
    return similarity

def generate_alternative_explanation(
    current_food: Dict[str, Any],
    alternative_food: Dict[str, Any],
    current_score: int,
    alternative_score: int
) -> str:
    """Generate explanation of why the alternative is better"""
    reasons = []
    
    current_health = current_food.get("health", {}) if isinstance(current_food.get("health"), dict) else {}
    alt_health = alternative_food.get("health", {}) if isinstance(alternative_food.get("health"), dict) else {}
    
    # Compare Nutri-Score
    current_nutri = current_health.get("nutri_score", {}).get("grade") if isinstance(current_health.get("nutri_score"), dict) else None
    alt_nutri = alt_health.get("nutri_score", {}).get("grade") if isinstance(alt_health.get("nutri_score"), dict) else None
    
    if alt_nutri and current_nutri:
        nutri_order = {"E": 0, "D": 1, "C": 2, "B": 3, "A": 4}
        if nutri_order.get(alt_nutri, 0) > nutri_order.get(current_nutri, 0):
            reasons.append(f"Better Nutri-Score ({alt_nutri} vs {current_nutri})")
    
    # Compare NOVA
    current_nova = current_health.get("nova", {}).get("group") if isinstance(current_health.get("nova"), dict) else None
    alt_nova = alt_health.get("nova", {}).get("group") if isinstance(alt_health.get("nova"), dict) else None
    
    if alt_nova and current_nova and alt_nova < current_nova:
        reasons.append(f"Less processed (NOVA {alt_nova} vs {current_nova})")
    
    # Compare additives
    current_additives = current_health.get("additives", {}) if isinstance(current_health.get("additives"), dict) else {}
    alt_additives = alt_health.get("additives", {}) if isinstance(alt_health.get("additives"), dict) else {}
    
    current_harmful = current_additives.get("harmful", []) or []
    alt_harmful = alt_additives.get("harmful", []) or []
    
    if len(alt_harmful) < len(current_harmful):
        reasons.append(f"Fewer harmful additives ({len(alt_harmful)} vs {len(current_harmful)})")
    
    # Compare nutrition
    if (alternative_food.get("sugar", 0) or 0) < (current_food.get("sugar", 0) or 0):
        reasons.append("Lower sugar content")
    if (alternative_food.get("protein", 0) or 0) > (current_food.get("protein", 0) or 0):
        reasons.append("Higher protein content")
    if (alternative_food.get("fiber", 0) or 0) > (current_food.get("fiber", 0) or 0):
        reasons.append("Higher fiber content")
    
    if not reasons:
        reasons.append(f"Better overall health score ({alternative_score} vs {current_score})")
    
    return " • ".join(reasons[:3])  # Limit to 3 reasons
