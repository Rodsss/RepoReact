# FILE: src/Backend1/api/routers/media_search.py

from fastapi import APIRouter, Depends
from typing import List
import logging

# Import models, schemas, and dependencies from their centralized locations
from Backend1 import models
from Backend1 import schemas
from Backend1.security import get_current_active_user

router = APIRouter(
    prefix="/media-search",
    tags=["Media Search"]
)

logger = logging.getLogger(__name__)

@router.get("/", response_model=List[schemas.MediaSearchResult])
def search_media_mock(query: str = "", current_user: models.User = Depends(get_current_active_user)):
    """
    A mock endpoint that returns a hard-coded but realistic search result
    for a single YouTube video, including a sample transcript.
    This endpoint is protected and requires authentication.
    """
    logger.info(f"Mock media search received for query: '{query}' from user: {current_user.email}")
    
    mock_video_data = {
        "id": "Tk35942nI3o",
        "media_type": "youtube",
        "title": "The new FastAPI framework",
        "author": "Sebastián Ramírez (tiangolo)",
        "url": "https://www.youtube.com/watch?v=Tk35942nI3o",
        "thumbnail_url": "https://i.ytimg.com/vi/Tk35942nI3o/hqdefault.jpg",
        "transcript": [
            {"start": 5.2, "text": "Hi everyone. Thank you for coming."},
            {"start": 7.1, "text": "My name is Sebastián Ramírez, I'm the creator of FastAPI."},
            {"start": 10.5, "text": "And today I'm going to show you a little bit about it."},
            {"start": 13.0, "text": "So FastAPI is a modern web framework for building APIs."},
        ]
    }
    return [mock_video_data]