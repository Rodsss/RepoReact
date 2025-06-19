# FILE: src/Backend1/schemas.py

from __future__ import annotations
from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

# Define the new configuration once to be reused across all schemas
# This replaces the old `class Config: orm_mode = True` and fixes the warnings.
model_config = ConfigDict(from_attributes=True)


# --- User & Auth Schemas ---

class UserBase(BaseModel):
    email: str

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    is_active: bool
    model_config = model_config

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None


# --- Folder & Note Schemas ---

class FolderBase(BaseModel):
    folder_name: str

class FolderCreate(FolderBase):
    pass

class FolderItem(FolderBase):
    folder_id: int
    user_id: str
    creation_date: datetime
    model_config = model_config

class NoteBase(BaseModel):
    title: Optional[str] = "Untitled Note"
    content: Optional[str] = ""
    folder_id: Optional[int] = None

class NoteCreate(NoteBase):
    pass

class NoteItem(NoteBase):
    note_id: int
    user_id: str
    creation_date: datetime
    last_modified_date: datetime
    model_config = model_config


# --- Stack (Collection) & Flashcard Schemas ---

class StackBase(BaseModel):
    stack_name: str

class StackCreate(StackBase):
    pass

class StackResponseItem(StackBase):
    stack_id: int
    user_id: str
    creation_date: datetime
    is_default_stack: bool
    model_config = model_config
    
class FlashcardBase(BaseModel):
    front_text: str
    back_text: Optional[str] = None
    
class FlashcardItem(FlashcardBase):
    flashcard_id: int
    stack_id: int
    model_config = model_config

class ItemForDeck(BaseModel):
    text: str

class DeckFromItemsCreate(BaseModel):
    deck_name: str
    items: List[ItemForDeck]


# --- Other Feature Schemas ---

class MediaSearchResult(BaseModel):
    id: str
    media_type: str
    title: str
    author: str
    url: str
    thumbnail_url: str
    transcript: Optional[List[dict]] = None
    model_config = model_config

class TranslateRequest(BaseModel):
    text: str
    source_lang: str = 'auto'
    target_lang: str = 'en'

class TranslationLogCreate(BaseModel):
    originalText: str
    translatedText: str
    sourceLanguage: str
    targetLanguage: str
    sourceUrl: Optional[str] = None
    timestamp: str

class TranslationLogResponse(BaseModel):
    success: bool
    message: str
    logId: Optional[int] = None
    model_config = model_config


class GenericSuccessResponse(BaseModel):
    success: bool
    message: str

# Add this class to your schemas.py file

class TextItemCreate(BaseModel):
    text: str
    source_url: Optional[str] = None
    page_title: Optional[str] = None