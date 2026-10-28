from fastapi import APIRouter
from app.models.schemas import AIAnalyzeRequest, AIAnalyzeResponse
from app.services.ai_analyzer import analyze_incident_text

router = APIRouter(tags=["AI Analyzer"])

@router.post("/ai/analyze", response_model=AIAnalyzeResponse)
def analyze_report(payload: AIAnalyzeRequest):
    """
    Analyzes emergency incident text using transparent offline baseline NLP.
    Suggests category, priority, confidence band, explanation, extracted locations, and possible duplicates.
    Runs locally without paid API key requirements.
    """
    result = analyze_incident_text(payload.text, payload.existing_report_id)
    return result
