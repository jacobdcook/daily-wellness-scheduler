"""
Comprehensive supplement database for caloric detection.
This database contains common supplements, foods, and their fasting behavior.
Only uses AI for truly unknown items.
"""

# Format: {name_lower: {caloric: bool, fasting_action: str, fasting_notes: str}}
SUPPLEMENT_DATABASE = {
    # Common Foods (Caloric)
    "banana": {"caloric": True, "fasting_action": "skip", "fasting_notes": "Fruit contains calories; will break a fast. Skip during fasting or move to feeding window."},
    "apple": {"caloric": True, "fasting_action": "skip", "fasting_notes": "Fruit contains calories; will break a fast. Skip during fasting or move to feeding window."},
    "orange": {"caloric": True, "fasting_action": "skip", "fasting_notes": "Fruit contains calories; will break a fast. Skip during fasting or move to feeding window."},
    "fruit": {"caloric": True, "fasting_action": "skip", "fasting_notes": "Fruit contains calories; will break a fast. Skip during fasting or move to feeding window."},
    "berries": {"caloric": True, "fasting_action": "skip", "fasting_notes": "Fruit contains calories; will break a fast. Skip during fasting or move to feeding window."},
    "bread": {"caloric": True, "fasting_action": "skip", "fasting_notes": "Food contains calories; will break a fast. Skip during fasting or move to feeding window."},
    "rice": {"caloric": True, "fasting_action": "skip", "fasting_notes": "Food contains calories; will break a fast. Skip during fasting or move to feeding window."},
    "pasta": {"caloric": True, "fasting_action": "skip", "fasting_notes": "Food contains calories; will break a fast. Skip during fasting or move to feeding window."},
    "chicken": {"caloric": True, "fasting_action": "skip", "fasting_notes": "Food contains calories; will break a fast. Skip during fasting or move to feeding window."},
    "beef": {"caloric": True, "fasting_action": "skip", "fasting_notes": "Food contains calories; will break a fast. Skip during fasting or move to feeding window."},
    "fish": {"caloric": True, "fasting_action": "skip", "fasting_notes": "Food contains calories; will break a fast. Skip during fasting or move to feeding window."},
    "egg": {"caloric": True, "fasting_action": "skip", "fasting_notes": "Food contains calories; will break a fast. Skip during fasting or move to feeding window."},
    "eggs": {"caloric": True, "fasting_action": "skip", "fasting_notes": "Food contains calories; will break a fast. Skip during fasting or move to feeding window."},
    "yogurt": {"caloric": True, "fasting_action": "skip", "fasting_notes": "Food contains calories; will break a fast. Skip during fasting or move to feeding window."},
    "cheese": {"caloric": True, "fasting_action": "skip", "fasting_notes": "Food contains calories; will break a fast. Skip during fasting or move to feeding window."},
    "chocolate": {"caloric": True, "fasting_action": "skip", "fasting_notes": "Food contains calories; will break a fast. Skip during fasting or move to feeding window."},
    
    # Proteins (Caloric)
    "whey protein": {"caloric": True, "fasting_action": "defer", "fasting_notes": "Protein contains calories; move to feeding window"},
    "casein protein": {"caloric": True, "fasting_action": "defer", "fasting_notes": "Protein contains calories; move to feeding window"},
    "plant protein": {"caloric": True, "fasting_action": "defer", "fasting_notes": "Protein contains calories; move to feeding window"},
    "pea protein": {"caloric": True, "fasting_action": "defer", "fasting_notes": "Protein contains calories; move to feeding window"},
    "rice protein": {"caloric": True, "fasting_action": "defer", "fasting_notes": "Protein contains calories; move to feeding window"},
    "hemp protein": {"caloric": True, "fasting_action": "defer", "fasting_notes": "Protein contains calories; move to feeding window"},
    "soy protein": {"caloric": True, "fasting_action": "defer", "fasting_notes": "Protein contains calories; move to feeding window"},
    "collagen": {"caloric": True, "fasting_action": "defer", "fasting_notes": "Protein contains calories; move to feeding window"},
    "collagen peptides": {"caloric": True, "fasting_action": "defer", "fasting_notes": "Protein contains calories; move to feeding window"},
    "hydrolyzed collagen": {"caloric": True, "fasting_action": "defer", "fasting_notes": "Protein contains calories; move to feeding window"},
    
    # Amino Acids (Caloric)
    "bcaa": {"caloric": True, "fasting_action": "defer", "fasting_notes": "Branched-chain amino acids contain calories; move to feeding window"},
    "branched chain amino acids": {"caloric": True, "fasting_action": "defer", "fasting_notes": "Amino acids contain calories; move to feeding window"},
    "l-glutamine": {"caloric": True, "fasting_action": "defer", "fasting_notes": "Amino acid has calories; defer on light fast; skip on strict"},
    "glutamine": {"caloric": True, "fasting_action": "defer", "fasting_notes": "Amino acid has calories; defer on light fast; skip on strict"},
    "creatine": {"caloric": False, "fasting_action": "allow", "fasting_notes": "Non-caloric; safe during fasting"},
    "creatine monohydrate": {"caloric": False, "fasting_action": "allow", "fasting_notes": "Non-caloric; safe during fasting"},
    
    # Meal Replacements & Shakes (Caloric)
    "meal replacement": {"caloric": True, "fasting_action": "skip", "fasting_notes": "High-calorie meal replacement; skip during fasting"},
    "protein shake": {"caloric": True, "fasting_action": "defer", "fasting_notes": "Contains calories; move to feeding window"},
    "mass gainer": {"caloric": True, "fasting_action": "skip", "fasting_notes": "High-calorie supplement; skip during fasting"},
    "weight gainer": {"caloric": True, "fasting_action": "skip", "fasting_notes": "High-calorie supplement; skip during fasting"},
    
    # Vitamins & Minerals (Non-Caloric)
    "vitamin d": {"caloric": False, "fasting_action": "allow", "fasting_notes": "Non-caloric vitamin; safe during fasting"},
    "vitamin d3": {"caloric": False, "fasting_action": "allow", "fasting_notes": "Non-caloric vitamin; safe during fasting"},
    "vitamin c": {"caloric": False, "fasting_action": "allow", "fasting_notes": "Non-caloric vitamin; safe during fasting"},
    "vitamin b": {"caloric": False, "fasting_action": "allow", "fasting_notes": "Non-caloric vitamin; safe during fasting"},
    "vitamin b12": {"caloric": False, "fasting_action": "allow", "fasting_notes": "Non-caloric vitamin; safe during fasting"},
    "vitamin b complex": {"caloric": False, "fasting_action": "allow", "fasting_notes": "Non-caloric vitamin; safe during fasting"},
    "multivitamin": {"caloric": False, "fasting_action": "allow", "fasting_notes": "Non-caloric; safe during fasting"},
    "magnesium": {"caloric": False, "fasting_action": "allow", "fasting_notes": "Non-caloric mineral; safe during fasting"},
    "magnesium glycinate": {"caloric": False, "fasting_action": "allow", "fasting_notes": "Non-caloric mineral; safe during fasting"},
    "magnesium citrate": {"caloric": False, "fasting_action": "allow", "fasting_notes": "Non-caloric mineral; safe during fasting"},
    "zinc": {"caloric": False, "fasting_action": "allow", "fasting_notes": "Non-caloric mineral; safe during fasting"},
    "zinc picolinate": {"caloric": False, "fasting_action": "allow", "fasting_notes": "Non-caloric mineral; safe during fasting"},
    "iron": {"caloric": False, "fasting_action": "allow", "fasting_notes": "Non-caloric mineral; safe during fasting"},
    "calcium": {"caloric": False, "fasting_action": "allow", "fasting_notes": "Non-caloric mineral; safe during fasting"},
    "potassium": {"caloric": False, "fasting_action": "allow", "fasting_notes": "Non-caloric mineral; safe during fasting"},
    "sodium": {"caloric": False, "fasting_action": "allow", "fasting_notes": "Non-caloric mineral; safe during fasting"},
    
    # Electrolytes (Non-Caloric)
    "electrolyte": {"caloric": False, "fasting_action": "allow", "fasting_notes": "Non-caloric electrolyte; safe during fasting"},
    "electrolyte mix": {"caloric": False, "fasting_action": "allow", "fasting_notes": "Non-caloric electrolyte; safe during fasting"},
    "electrolyte powder": {"caloric": False, "fasting_action": "allow", "fasting_notes": "Non-caloric electrolyte; safe during fasting"},
    "lmnt": {"caloric": False, "fasting_action": "allow", "fasting_notes": "Non-caloric electrolyte; safe during fasting"},
    "liquid iv": {"caloric": True, "fasting_action": "defer", "fasting_notes": "Contains sugar/calories; move to feeding window"},
    "pedialyte": {"caloric": True, "fasting_action": "defer", "fasting_notes": "Contains sugar/calories; move to feeding window"},
    "gatorade": {"caloric": True, "fasting_action": "skip", "fasting_notes": "High sugar content; skip during fasting"},
    
    # Herbs & Botanicals (Non-Caloric)
    "ashwagandha": {"caloric": False, "fasting_action": "allow", "fasting_notes": "Non-caloric herb; safe during fasting"},
    "rhodiola": {"caloric": False, "fasting_action": "allow", "fasting_notes": "Non-caloric herb; safe during fasting"},
    "ginseng": {"caloric": False, "fasting_action": "allow", "fasting_notes": "Non-caloric herb; safe during fasting"},
    "turmeric": {"caloric": False, "fasting_action": "allow", "fasting_notes": "Non-caloric herb; safe during fasting"},
    "curcumin": {"caloric": False, "fasting_action": "allow", "fasting_notes": "Non-caloric herb; safe during fasting"},
    "ginger": {"caloric": False, "fasting_action": "allow", "fasting_notes": "Non-caloric herb; safe during fasting"},
    "echinacea": {"caloric": False, "fasting_action": "allow", "fasting_notes": "Non-caloric herb; safe during fasting"},
    "milk thistle": {"caloric": False, "fasting_action": "allow", "fasting_notes": "Non-caloric herb; safe during fasting"},
    "slippery elm": {"caloric": True, "fasting_action": "defer", "fasting_notes": "Tea with calories; defer to feeding window"},
    "slippery elm tea": {"caloric": True, "fasting_action": "defer", "fasting_notes": "Tea with calories; defer to feeding window"},
    
    # Probiotics & Digestive (Non-Caloric)
    "probiotic": {"caloric": False, "fasting_action": "allow", "fasting_notes": "Non-caloric probiotic; safe during fasting"},
    "probiotics": {"caloric": False, "fasting_action": "allow", "fasting_notes": "Non-caloric probiotic; safe during fasting"},
    "digestive enzyme": {"caloric": False, "fasting_action": "allow", "fasting_notes": "Non-caloric enzyme; safe during fasting"},
    "bromelain": {"caloric": False, "fasting_action": "allow", "fasting_notes": "Non-caloric enzyme; safe during fasting"},
    "papain": {"caloric": False, "fasting_action": "allow", "fasting_notes": "Non-caloric enzyme; safe during fasting"},
    "dgl": {"caloric": False, "fasting_action": "allow", "fasting_notes": "Non-caloric; safe during fasting"},
    "dgl plus": {"caloric": False, "fasting_action": "allow", "fasting_notes": "Non-caloric; safe during fasting"},
    "pepzin gi": {"caloric": False, "fasting_action": "allow", "fasting_notes": "Non-caloric zinc-carnosine; safe during fasting"},
    "aloe vera": {"caloric": False, "fasting_action": "allow", "fasting_notes": "Non-caloric; safe during fasting"},
    "aloe vera juice": {"caloric": True, "fasting_action": "defer", "fasting_notes": "Juice may contain calories; check label"},
    
    # Omega & Fats (Caloric)
    "omega 3": {"caloric": True, "fasting_action": "defer", "fasting_notes": "Fat contains calories; move to feeding window"},
    "fish oil": {"caloric": True, "fasting_action": "defer", "fasting_notes": "Fat contains calories; move to feeding window"},
    "cod liver oil": {"caloric": True, "fasting_action": "defer", "fasting_notes": "Fat contains calories; move to feeding window"},
    "mct oil": {"caloric": True, "fasting_action": "defer", "fasting_notes": "Fat contains calories; some people allow MCT during fasting"},
    "coconut oil": {"caloric": True, "fasting_action": "skip", "fasting_notes": "High-calorie fat; skip during fasting"},
    
    # Sleep & Mood (Non-Caloric)
    "melatonin": {"caloric": False, "fasting_action": "allow", "fasting_notes": "Non-caloric hormone; safe during fasting"},
    "5-htp": {"caloric": False, "fasting_action": "allow", "fasting_notes": "Non-caloric; safe during fasting"},
    "l-theanine": {"caloric": False, "fasting_action": "allow", "fasting_notes": "Non-caloric amino acid; safe during fasting"},
    "theanine": {"caloric": False, "fasting_action": "allow", "fasting_notes": "Non-caloric amino acid; safe during fasting"},
    "gaba": {"caloric": False, "fasting_action": "allow", "fasting_notes": "Non-caloric; safe during fasting"},
    
    # Energy & Pre-Workout (Mixed)
    "pre workout": {"caloric": False, "fasting_action": "allow", "fasting_notes": "Usually non-caloric; safe during fasting"},
    "caffeine": {"caloric": False, "fasting_action": "allow", "fasting_notes": "Non-caloric; safe during fasting"},
    "coffee": {"caloric": False, "fasting_action": "allow", "fasting_notes": "Black coffee is non-caloric; safe during fasting"},
    "green tea": {"caloric": False, "fasting_action": "allow", "fasting_notes": "Non-caloric tea; safe during fasting"},
    "matcha": {"caloric": False, "fasting_action": "allow", "fasting_notes": "Non-caloric tea; safe during fasting"},
    
    # Fiber & Gut Health (Non-Caloric)
    "psyllium": {"caloric": False, "fasting_action": "allow", "fasting_notes": "Non-caloric fiber; safe during fasting"},
    "psyllium husk": {"caloric": False, "fasting_action": "allow", "fasting_notes": "Non-caloric fiber; safe during fasting"},
    "fiber": {"caloric": False, "fasting_action": "allow", "fasting_notes": "Non-caloric fiber; safe during fasting"},
    "inulin": {"caloric": False, "fasting_action": "allow", "fasting_notes": "Non-caloric prebiotic fiber; safe during fasting"},
    
    # Antioxidants (Non-Caloric)
    "resveratrol": {"caloric": False, "fasting_action": "allow", "fasting_notes": "Non-caloric antioxidant; safe during fasting"},
    "coq10": {"caloric": False, "fasting_action": "allow", "fasting_notes": "Non-caloric coenzyme; safe during fasting"},
    "coenzyme q10": {"caloric": False, "fasting_action": "allow", "fasting_notes": "Non-caloric coenzyme; safe during fasting"},
    "alpha lipoic acid": {"caloric": False, "fasting_action": "allow", "fasting_notes": "Non-caloric antioxidant; safe during fasting"},
    "n-acetyl cysteine": {"caloric": False, "fasting_action": "allow", "fasting_notes": "Non-caloric amino acid; safe during fasting"},
    "nac": {"caloric": False, "fasting_action": "allow", "fasting_notes": "Non-caloric amino acid; safe during fasting"},
    
    # Joint & Bone Health (Non-Caloric)
    "glucosamine": {"caloric": False, "fasting_action": "allow", "fasting_notes": "Non-caloric; safe during fasting"},
    "chondroitin": {"caloric": False, "fasting_action": "allow", "fasting_notes": "Non-caloric; safe during fasting"},
    "msm": {"caloric": False, "fasting_action": "allow", "fasting_notes": "Non-caloric; safe during fasting"},
    "vitamin k2": {"caloric": False, "fasting_action": "allow", "fasting_notes": "Non-caloric vitamin; safe during fasting"},
    
    # Hormone Support (Non-Caloric)
    "dhea": {"caloric": False, "fasting_action": "allow", "fasting_notes": "Non-caloric hormone; safe during fasting"},
    "pregnenolone": {"caloric": False, "fasting_action": "allow", "fasting_notes": "Non-caloric hormone; safe during fasting"},
    
    # Nootropics (Non-Caloric)
    "lion's mane": {"caloric": False, "fasting_action": "allow", "fasting_notes": "Non-caloric mushroom; safe during fasting"},
    "cordyceps": {"caloric": False, "fasting_action": "allow", "fasting_notes": "Non-caloric mushroom; safe during fasting"},
    "reishi": {"caloric": False, "fasting_action": "allow", "fasting_notes": "Non-caloric mushroom; safe during fasting"},
    "alpha gpc": {"caloric": False, "fasting_action": "allow", "fasting_notes": "Non-caloric; safe during fasting"},
    "citicoline": {"caloric": False, "fasting_action": "allow", "fasting_notes": "Non-caloric; safe during fasting"},
}

# Category-based matching (for partial matches)
CALORIC_CATEGORIES = {
    "protein": True,
    "amino": True,
    "bcaa": True,
    "shake": True,
    "smoothie": True,
    "juice": True,
    "bar": True,
    "gummy": True,
    "chewable": True,
    "meal": True,
    "mass": True,
    "gainer": True,
    "honey": True,
    "sugar": True,
    "syrup": True,
    "oil": True,
    "fat": True,
}

NON_CALORIC_CATEGORIES = {
    "vitamin": False,
    "mineral": False,
    "electrolyte": False,
    "probiotic": False,
    "enzyme": False,
    "herb": False,
    "extract": False,
    "capsule": False,
    "tablet": False,
    "pill": False,
    "powder": False,
    "supplement": False,
}

def lookup_supplement(name: str, dose: str = "") -> dict | None:
    """
    Look up supplement in database.
    Returns dict with caloric, fasting_action, fasting_notes if found, None otherwise.
    """
    name_lower = name.lower().strip()
    dose_lower = dose.lower().strip() if dose else ""
    combined = f"{name_lower} {dose_lower}".strip()
    
    # Try exact match first
    if name_lower in SUPPLEMENT_DATABASE:
        return SUPPLEMENT_DATABASE[name_lower]
    
    # Try combined match
    if combined in SUPPLEMENT_DATABASE:
        return SUPPLEMENT_DATABASE[combined]
    
    # Try partial matches (check if database key is contained in input)
    for db_key, db_value in SUPPLEMENT_DATABASE.items():
        if db_key in name_lower or db_key in combined:
            return db_value
    
    # Try reverse partial (if input is contained in database key)
    for db_key, db_value in SUPPLEMENT_DATABASE.items():
        if name_lower in db_key:
            return db_value
    
    # Try category matching
    for category, is_caloric in CALORIC_CATEGORIES.items():
        if category in name_lower or category in combined:
            return {
                "caloric": is_caloric,
                "fasting_action": "defer" if is_caloric else "allow",
                "fasting_notes": f"Contains {category}; {'move to feeding window' if is_caloric else 'safe during fasting'}"
            }
    
    for category, is_caloric in NON_CALORIC_CATEGORIES.items():
        if category in name_lower or category in combined:
            return {
                "caloric": is_caloric,
                "fasting_action": "allow",
                "fasting_notes": f"Non-caloric {category}; safe during fasting"
            }
    
    return None

