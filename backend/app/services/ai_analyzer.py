import re
import math
from typing import Dict, Any, List, Tuple
from app.core.database import get_db_connection

# Category vocabulary weights for transparent, deterministic NLP classification
CATEGORY_KEYWORDS = {
    'flood': {
        'keywords': ['flood', 'flooding', 'flooded', 'water', 'river', 'overflow', 'submerged', 'inundated', 'drowning', 'dam', 'spillway', 'drainage', 'deluge', 'rainfall', 'waterlogging', 'washed away'],
        'weight': 1.0
    },
    'fire': {
        'keywords': ['fire', 'flames', 'blaze', 'burning', 'smoke', 'wildfire', 'explosion', 'gas leak', 'combustion', 'scorched', 'inferno', 'spark', 'flare'],
        'weight': 1.0
    },
    'earthquake': {
        'keywords': ['earthquake', 'tremor', 'quake', 'shaking', 'aftershock', 'richter', 'seismic', 'epicenter', 'building collapse', 'structural crack', 'rubble'],
        'weight': 1.0
    },
    'cyclone': {
        'keywords': ['cyclone', 'storm', 'hurricane', 'typhoon', 'gale', 'wind', 'squall', 'landfall', 'storm surge', 'tornado', 'gusts'],
        'weight': 1.0
    },
    'medical': {
        'keywords': ['medical', 'injured', 'injury', 'casualty', 'casualties', 'bleeding', 'unconscious', 'cardiac', 'ambulance', 'hospital', 'paramedic', 'burns', 'fracture', 'poisoning'],
        'weight': 1.0
    },
    'landslide': {
        'keywords': ['landslide', 'mudslide', 'rockfall', 'debris', 'slope collapse', 'hillside', 'avalanche', 'boulders', 'blocked highway'],
        'weight': 1.0
    }
}

PRIORITY_TRIGGERS = {
    'Critical': [
        'trapped', 'people stranded', 'unconscious', 'heavy casualties', 'collapse', 
        'immediate rescue needed', 'drowning', 'suffocating', 'fire spreading rapidly', 
        'children', 'infants', 'elderly trapped', 'hospital generator failure', 'bleeding severely'
    ],
    'High': [
        'rising fast', 'injured', 'submerged', 'urgent', 'blocked road', 
        'smoke inhalation', 'power line snapped', 'evacuation needed', 'structural damage'
    ],
    'Medium': [
        'waterlogging', 'crack in wall', 'strong winds', 'property damage', 
        'trees fallen', 'monitoring required'
    ]
}

INDIAN_CITY_NAMES = [
    'Mumbai', 'Delhi', 'Guwahati', 'Chennai', 'Kolkata', 'Bengaluru', 'Hyderabad', 
    'Pune', 'Ahmedabad', 'Patna', 'Kochi', 'Bhubaneswar', 'Visakhapatnam', 'Shimla', 
    'Dehradun', 'Dispur', 'Kurla', 'Andheri', 'Dharavi', 'Assam', 'Kerala', 'Odisha', 
    'Uttarakhand', 'Maharashtra', 'Gujarat', 'Tamil Nadu', 'West Bengal'
]

def tokenize(text: str) -> List[str]:
    return re.findall(r'\b[a-zA-Z]{3,}\b', text.lower())

def calculate_similarity(text1: str, text2: str) -> float:
    """Jaccard similarity on token sets."""
    words1 = set(tokenize(text1))
    words2 = set(tokenize(text2))
    if not words1 or not words2:
        return 0.0
    intersection = words1.intersection(words2)
    union = words1.union(words2)
    return round(len(intersection) / len(union), 3)

def analyze_incident_text(text: str, existing_report_id: str = None) -> Dict[str, Any]:
    """
    Transparent, explainable baseline AI Incident Analyzer.
    Categorizes disaster type, assigns priority, extracts entities, and checks duplicate reports.
    """
    clean_text = text.lower()
    tokens = tokenize(text)
    token_set = set(tokens)
    
    # 1. Category Classification
    scores = {}
    triggered_words = {}
    for cat, info in CATEGORY_KEYWORDS.items():
        matched = [kw for kw in info['keywords'] if kw in clean_text or kw in token_set]
        scores[cat] = len(matched) * info['weight']
        if matched:
            triggered_words[cat] = matched
            
    sorted_categories = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    best_cat, best_score = sorted_categories[0]
    
    if best_score == 0:
        suggested_category = "other"
        confidence = 0.40
        confidence_band = "Preliminary"
        explanation = "No distinct hazard terms detected. Classified as Other/Unknown pending dispatcher inspection."
    else:
        suggested_category = best_cat
        total_matched = sum(scores.values())
        raw_conf = best_score / total_matched if total_matched > 0 else 0.5
        confidence = round(min(0.95, max(0.55, 0.50 + raw_conf * 0.45)), 2)
        confidence_band = "High" if confidence >= 0.80 else "Moderate"
        keywords_str = ", ".join(f"'{w}'" for w in triggered_words[best_cat][:4])
        explanation = f"Classified as '{suggested_category.capitalize()}' due to matching domain terms: {keywords_str}."

    # 2. Priority Assignment
    suggested_priority = "Low"
    priority_reasons = []
    
    for term in PRIORITY_TRIGGERS['Critical']:
        if term in clean_text:
            suggested_priority = "Critical"
            priority_reasons.append(f"urgent distress marker: '{term}'")
            break
            
    if suggested_priority != "Critical":
        for term in PRIORITY_TRIGGERS['High']:
            if term in clean_text:
                suggested_priority = "High"
                priority_reasons.append(f"high-risk condition: '{term}'")
                break
                
    if suggested_priority not in ["Critical", "High"]:
        for term in PRIORITY_TRIGGERS['Medium']:
            if term in clean_text:
                suggested_priority = "Medium"
                priority_reasons.append(f"moderate condition: '{term}'")
                break

    if priority_reasons:
        explanation += f" Priority assessed as '{suggested_priority}' due to {priority_reasons[0]}."
    else:
        suggested_priority = "Medium"
        explanation += " Standard baseline priority assigned (Medium)."

    # 3. Entity & Location Extraction
    extracted_locations = []
    for city in INDIAN_CITY_NAMES:
        if re.search(r'\b' + re.escape(city) + r'\b', text, re.IGNORECASE):
            extracted_locations.append(city)
            
    # Extract numbers or quantities (e.g., '15 people', '3 families')
    entities = []
    quantity_matches = re.findall(r'\b\d+\s+(?:people|families|children|houses|persons|patients|buildings)\b', text, re.IGNORECASE)
    entities.extend(quantity_matches)
    
    # 4. Duplicate Report Detection
    possible_duplicates = []
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, title, description, location_name FROM emergency_reports
        ORDER BY created_at DESC LIMIT 50;
    """)
    rows = cursor.fetchall()
    conn.close()
    
    for row in rows:
        r_id = row['id']
        if existing_report_id and r_id == existing_report_id:
            continue
        sim = calculate_similarity(text, f"{row['title']} {row['description']}")
        if sim >= 0.28:
            possible_duplicates.append({
                "report_id": r_id,
                "title": row['title'],
                "similarity_score": sim,
                "location_name": row['location_name']
            })
            
    possible_duplicates.sort(key=lambda x: x['similarity_score'], reverse=True)
    possible_duplicates = possible_duplicates[:3]
    
    # Review action recommendation
    if suggested_priority == "Critical":
        action = "Immediate Verification: Dispatch search & rescue team and alert area responders."
    elif possible_duplicates:
        action = f"Check Duplicate: Verify against existing report '{possible_duplicates[0]['title']}'."
    else:
        action = "Standard Review: Confirm coordinates and assign to local surveillance unit."

    return {
        "suggested_category": suggested_category,
        "suggested_priority": suggested_priority,
        "confidence": confidence,
        "confidence_band": confidence_band,
        "explanation": explanation,
        "extracted_locations": extracted_locations,
        "extracted_entities": entities,
        "suggested_review_action": action,
        "possible_duplicates": possible_duplicates,
        "baseline_mode": "transparent_rule_heuristic"
    }
