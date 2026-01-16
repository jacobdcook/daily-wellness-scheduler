import os
import json
from typing import Dict, List, Optional
from pydantic import BaseModel

try:
    from groq import Groq
except ImportError:
    Groq = None

# Configuration
CACHE_FILE = "data/knowledge_cache.json"
API_KEY = "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" # Same key as chat_engine

class KnowledgeNode(BaseModel):
    name: str
    category: str  # "Mineral", "Vitamin", "Herb", "Amino Acid", "Lifestyle"
    summary: str
    benefits: List[str]
    mechanism: str
    timing_rationale: str
    synergies: List[str]  # Things that help it
    antagonists: List[str]  # Things to avoid with it
    scientific_confidence: str  # "High", "Medium", "Emerging"

# Static Knowledge Base
KNOWLEDGE_DB: Dict[str, dict] = {
    "magnesium glycinate": {
        "name": "Magnesium Glycinate",
        "category": "Mineral",
        "summary": "A highly bioavailable form of magnesium bound to glycine, promoting relaxation without the laxative effect of other forms.",
        "benefits": ["Sleep Quality", "Muscle Relaxation", "Anxiety Reduction", "Nervous System Health"],
        "mechanism": "Regulates NMDA receptors (calming excitotoxicity) and acts as a cofactor for over 300 enzymatic reactions.",
        "timing_rationale": "Best taken before bed due to its calming properties and ability to lower cortisol.",
        "synergies": ["Vitamin D3", "Vitamin B6", "Zinc"],
        "antagonists": ["Calcium (in high doses simultaneously)", "Zinc (in high doses simultaneously)"],
        "scientific_confidence": "High"
    },
    "vitamin d3": {
        "name": "Vitamin D3",
        "category": "Vitamin",
        "summary": "The 'sunshine vitamin', crucial for immune function, mood regulation, and bone health.",
        "benefits": ["Immune Support", "Mood Regulation", "Bone Strength", "Testosterone Support"],
        "mechanism": "Acts as a steroid hormone regulating gene expression related to immune defense and calcium absorption.",
        "timing_rationale": "Best taken in the morning/mid-day with fat. Taking it at night can suppress melatonin production.",
        "synergies": ["Vitamin K2", "Magnesium", "Omega-3"],
        "antagonists": ["Melatonin (if taken at night)"],
        "scientific_confidence": "High"
    },
    "omega-3": {
        "name": "Omega-3 (EPA/DHA)",
        "category": "Fatty Acid",
        "summary": "Essential fatty acids found in fish oil, critical for brain health and lowering inflammation.",
        "benefits": ["Brain Health", "Reduced Inflammation", "Heart Health", "Joint Mobility"],
        "mechanism": "Incorporates into cell membranes, improving fluidity and reducing pro-inflammatory cytokines.",
        "timing_rationale": "Take with a meal containing fat to maximize absorption.",
        "synergies": ["Vitamin D3", "Curcumin"],
        "antagonists": ["Omega-6 (in excess)"],
        "scientific_confidence": "High"
    },
    "l-glutamine": {
        "name": "L-Glutamine",
        "category": "Amino Acid",
        "summary": "The most abundant amino acid in the body, vital for gut lining integrity and muscle recovery.",
        "benefits": ["Gut Health", "Muscle Recovery", "Immune Support"],
        "mechanism": "Primary fuel source for enterocytes (gut cells), helping seal 'leaky gut' tight junctions.",
        "timing_rationale": "Best taken on an empty stomach or with light meals to prioritize gut repair over muscle synthesis.",
        "synergies": ["Zinc Carnosine", "Probiotics"],
        "antagonists": ["Hot liquids (can degrade it)"],
        "scientific_confidence": "Medium"
    },
    "creatine": {
        "name": "Creatine Monohydrate",
        "category": "Amino Acid Derivative",
        "summary": "The most researched supplement for performance. Increases energy availability (ATP) in muscle and brain tissue.",
        "benefits": ["Muscle Power", "Cognitive Function", "Hydration", "Anaerobic Endurance"],
        "mechanism": "Donates phosphate groups to ADP to rapidly regenerate ATP (energy currency) during intense activity.",
        "timing_rationale": "Timing matters less than consistency. Post-workout may have slight edge, but daily intake is key.",
        "synergies": ["Carbohydrates (improves uptake)", "Water"],
        "antagonists": ["Caffeine (potentially blunts effect if taken simultaneously in high doses)"],
        "scientific_confidence": "Very High"
    },
    "melatonin": {
        "name": "Melatonin",
        "category": "Hormone",
        "summary": "A hormone that regulates the sleep-wake cycle.",
        "benefits": ["Sleep Onset", "Circadian Rhythm Reset", "Antioxidant"],
        "mechanism": "Signals to the body that it is time to sleep, lowering core body temperature.",
        "timing_rationale": "Take 30-60 minutes before bed. Less is often more (0.3mg - 3mg).",
        "synergies": ["Magnesium", "Darkness"],
        "antagonists": ["Blue Light", "Cortisol", "Caffeine"],
        "scientific_confidence": "High"
    },
    "ashwagandha": {
        "name": "Ashwagandha",
        "category": "Adaptogen",
        "summary": "An ancient medicinal herb classified as an adaptogen, helping the body manage stress.",
        "benefits": ["Stress Reduction", "Cortisol Regulation", "Sleep Quality", "Testosterone Support"],
        "mechanism": "Modulates the HPA axis to lower cortisol levels.",
        "timing_rationale": "Can be taken morning or night, but evening use supports sleep and relaxation.",
        "synergies": ["Magnesium", "Theanine"],
        "antagonists": [],
        "scientific_confidence": "Medium"
    },
    "caffeine": {
        "name": "Caffeine",
        "category": "Stimulant",
        "summary": "A natural stimulant found in coffee and tea.",
        "benefits": ["Alertness", "Focus", "Metabolic Rate"],
        "mechanism": "Blocks adenosine receptors in the brain, preventing the sensation of fatigue.",
        "timing_rationale": "Avoid within 8-10 hours of sleep to prevent sleep disruption.",
        "synergies": ["L-Theanine (smooths out jitters)"],
        "antagonists": ["Adenosine", "Melatonin"],
        "scientific_confidence": "Very High"
    },
    "probiotic": {
        "name": "Probiotic",
        "category": "Bacteria",
        "summary": "Live microorganisms that provide health benefits when consumed.",
        "benefits": ["Gut Microbiome Balance", "Digestion", "Immune Function"],
        "mechanism": "Colonizes the gut with beneficial bacteria, crowding out pathogens and producing SCFAs.",
        "timing_rationale": "Often best on empty stomach or 30 mins before meal to survive stomach acid.",
        "synergies": ["Prebiotics (fiber)"],
        "antagonists": ["Antibiotics", "Chlorinated Water"],
        "scientific_confidence": "High"
    },
    "electrolyte mix": {
        "name": "Electrolytes",
        "category": "Mineral Mix",
        "summary": "Essential minerals (Sodium, Potassium, Magnesium) for hydration and nerve function.",
        "benefits": ["Hydration", "Nerve Function", "Muscle Contraction", "Prevents Cramps"],
        "mechanism": "Maintains fluid balance and transmembrane electrical potential.",
        "timing_rationale": "Essential upon waking (rehydration) and before/during sweating.",
        "synergies": ["Water", "Carbohydrates"],
        "antagonists": ["Diuretics"],
        "scientific_confidence": "Very High"
    }
}

def load_cache() -> Dict[str, dict]:
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, "r") as f:
                return json.load(f)
        except:
            pass
    return {}

def save_cache(cache: Dict[str, dict]):
    # Ensure directory exists
    os.makedirs(os.path.dirname(CACHE_FILE), exist_ok=True)
    try:
        with open(CACHE_FILE, "w") as f:
            json.dump(cache, f, indent=2)
    except Exception as e:
        print(f"Failed to save knowledge cache: {e}")

def generate_knowledge_item(name: str) -> Optional[dict]:
    """Use Groq LLM to generate a knowledge card for an unknown item."""
    if not Groq:
        return None
    
    try:
        client = Groq(api_key=API_KEY)
        
        prompt = f"""
        Generate a structured knowledge card for the supplement/activity: "{name}".
        Return ONLY valid JSON matching this structure:
        {{
            "name": "{name}",
            "category": "Vitamin/Mineral/Herb/Activity",
            "summary": "One sentence overview.",
            "benefits": ["Benefit 1", "Benefit 2", "Benefit 3"],
            "mechanism": "Brief explanation of how it works biologically.",
            "timing_rationale": "When to take it/do it and why.",
            "synergies": ["Items that work well with it"],
            "antagonists": ["Items to avoid with it"],
            "scientific_confidence": "High/Medium/Low"
        }}
        Keep it concise and scientific. If it's not a valid health item, make a best guess or return generic safe info.
        """
        
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You are a scientific wellness database API. Return only JSON."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            response_format={"type": "json_object"}
        )
        
        content = completion.choices[0].message.content
        data = json.loads(content)
        return data
        
    except Exception as e:
        print(f"Error generating knowledge for {name}: {e}")
        return None

def get_knowledge_item(name: str) -> Optional[dict]:
    """Fuzzy search for a supplement in the knowledge base, with LLM fallback."""
    name_lower = name.lower()
    
    # 1. Direct match in Static DB
    if name_lower in KNOWLEDGE_DB:
        return KNOWLEDGE_DB[name_lower]
    
    # 2. Partial match in Static DB
    for key, data in KNOWLEDGE_DB.items():
        if key in name_lower or name_lower in key:
            return data
            
    # 3. Alias check
    aliases = {
        "d3": "vitamin d3",
        "fish oil": "omega-3",
        "magnesium": "magnesium glycinate",
        "whey": "protein",
        "glutamine": "l-glutamine"
    }
    
    for alias, target in aliases.items():
        if alias in name_lower:
            return KNOWLEDGE_DB.get(target)
            
    # 4. Check Persistent Cache
    cache = load_cache()
    if name_lower in cache:
        return cache[name_lower]
        
    # 5. Generate via LLM (and cache it)
    print(f"Generating knowledge for: {name}")
    generated = generate_knowledge_item(name)
    if generated:
        # Update cache
        cache[name_lower] = generated
        save_cache(cache)
        return generated
            
    return None
