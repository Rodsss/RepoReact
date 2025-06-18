# FILE: src/Backend1/api/routers/translation.py

from fastapi import APIRouter, Depends, Body
from sqlalchemy.orm import Session

# Import models, schemas, and dependencies from their centralized locations
from Backend1 import models
from Backend1 import schemas
from Backend1.database import get_db
from Backend1.security import get_current_active_user

router = APIRouter(
    prefix="/translation",
    tags=["Translation"]
)

@router.post("/translate")
def handle_translation_request(translate_request: schemas.TranslateRequest, current_user: models.User = Depends(get_current_active_user)):
    """
    Accepts text and returns a mock translation for the authenticated user.
    """
    original_text = translate_request.text
    translated_text = f"[MOCK Translated: {original_text}]"
    
    # In a real application, you would call an external translation service here.
    
    return {"original_text": original_text, "translated_text": translated_text}

@router.post("/logs", response_model=schemas.TranslationLogResponse)
def create_translation_log(log_data: schemas.TranslationLogCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    """
    Logs a translation event to the database for the currently authenticated user.
    
    Note: This requires a `TranslationLog` table in `models.py` and corresponding
    schemas in `schemas.py`.
    """
    # This assumes a `TranslationLog` model exists in `models.py`
    db_log = models.TranslationLog(
        user_id=current_user.id,
        original_text=log_data.originalText,
        translated_text=log_data.translatedText,
        source_language=log_data.sourceLanguage,
        target_language=log_data.targetLanguage,
        source_url=log_data.sourceUrl,
        timestamp=log_data.timestamp
    )
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    
    return {"success": True, "message": "Log created successfully", "logId": db_log.log_id}