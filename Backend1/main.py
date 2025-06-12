# main.py - Consolidated and Corrected

from fastapi import FastAPI, HTTPException, Body, status, Path, Request
from fastapi.middleware.cors import CORSMiddleware 
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from starlette.staticfiles import StaticFiles # CORRECTED IMPORT
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone 
import logging
import sqlite3 
import os

# Configure basic logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- Absolute Path Configuration ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE_URL = os.path.join(BASE_DIR, "1project_mvp.db")
static_path = os.path.join(BASE_DIR, "static")
templates_path = os.path.join(BASE_DIR, "templates")

# --- FastAPI Application Instance and Template Setup ---
app = FastAPI(
    title="1Project API & Web App",
    description="Serves the 1Project API and the main web application frontend.",
    version="1.0.0"
)

app.mount("/static", StaticFiles(directory=static_path), name="static")
templates = Jinja2Templates(directory=templates_path)

# --- Pydantic Models ---
class FlashcardItem(BaseModel): 
    flashcard_id: int
    user_id: str
    collected_item_id: int
    front_text: str
    back_text: Optional[str] = None
    creation_date: str
    last_reviewed_date: Optional[str] = None
    next_review_date: Optional[str] = None
    stack_id: int
    review_level: int
    # Add fields from the JOIN for a complete response model
    source_url: Optional[str] = None
    page_title: Optional[str] = None
    is_translation: Optional[bool] = None
    original_text: Optional[str] = None

class SnippetCreate(BaseModel):
    selectedText: str
    sourceUrl: Optional[str] = None
    pageTitle: Optional[str] = None
    timestamp: str

class TranslationLogCreate(BaseModel):
    originalText: str
    translatedText: str
    sourceLanguage: str
    targetLanguage: str
    sourceUrl: Optional[str] = None
    timestamp: str
    
class TranslateRequest(BaseModel):
    text: str
    source_lang: str = 'auto'
    target_lang: str = 'en'

class TextItemCreate(BaseModel):
    text: str
    source_url: Optional[str] = None
    page_title: Optional[str] = None

class StackCreate(BaseModel):
    stack_name: str

class SnippetResponse(BaseModel):
    success: bool
    message: str
    itemId: Optional[int] = None
    flashcardId: Optional[int] = None 

class TranslationLogResponse(BaseModel):
    success: bool
    message: str
    logId: Optional[int] = None
    flashcardId: Optional[int] = None

class GenericSuccessResponse(BaseModel):
    success: bool
    message: str
    
class StackResponseItem(BaseModel): 
    stack_id: int
    user_id: str
    stack_name: str
    creation_date: str
    is_default_stack: bool

# --- CORRECTED: CORS Middleware Configuration ---
origins = ["*"] # For local development
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])


# --- Database Setup & Helper Functions ---
def get_db_connection():
    conn = sqlite3.connect(DATABASE_URL)
    conn.row_factory = sqlite3.Row
    return conn

def create_tables_if_not_exist():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("PRAGMA foreign_keys = ON;")
    cursor.execute('''CREATE TABLE IF NOT EXISTS CollectedItems (item_id INTEGER PRIMARY KEY, user_id TEXT NOT NULL, selected_text TEXT, source_url TEXT, page_title TEXT, is_translation BOOLEAN DEFAULT 0, original_text TEXT, translated_text TEXT, source_language TEXT, target_language TEXT, timestamp_collected TEXT NOT NULL)''')
    cursor.execute('''CREATE TABLE IF NOT EXISTS Stacks (stack_id INTEGER PRIMARY KEY, user_id TEXT NOT NULL, stack_name TEXT NOT NULL, creation_date TEXT NOT NULL, is_default_stack BOOLEAN DEFAULT 0, UNIQUE(user_id, stack_name))''')
    cursor.execute('''CREATE TABLE IF NOT EXISTS Flashcards (flashcard_id INTEGER PRIMARY KEY, user_id TEXT NOT NULL, collected_item_id INTEGER NOT NULL, front_text TEXT NOT NULL, back_text TEXT, creation_date TEXT NOT NULL, last_reviewed_date TEXT, next_review_date TEXT, stack_id INTEGER NOT NULL, review_level INTEGER NOT NULL DEFAULT 1, FOREIGN KEY (collected_item_id) REFERENCES CollectedItems(item_id) ON DELETE CASCADE, FOREIGN KEY (stack_id) REFERENCES Stacks(stack_id) ON DELETE CASCADE)''')
    conn.commit()
    conn.close()
    logger.info("All tables checked/created successfully.")

def _get_or_create_default_stack(conn: sqlite3.Connection, user_id: str) -> Optional[int]:
    cursor = conn.cursor()
    default_stack_name = "My First Collection"
    cursor.execute("SELECT stack_id FROM Stacks WHERE user_id = ? AND stack_name = ?", (user_id, default_stack_name))
    stack = cursor.fetchone()
    if stack: return stack["stack_id"]
    try:
        cursor.execute("INSERT INTO Stacks (user_id, stack_name, creation_date, is_default_stack) VALUES (?, ?, ?, ?)", (user_id, default_stack_name, datetime.now(timezone.utc).isoformat(), True))
        return cursor.lastrowid
    except sqlite3.Error as e:
        logger.error(f"SQLite error creating default stack for user {user_id}: {e}")
        return None 

def _create_flashcard_in_db(conn: sqlite3.Connection, user_id: str, collected_item_id: int, front_text: str, back_text: Optional[str], target_stack_id: int) -> Optional[int]:
    ts = datetime.now(timezone.utc).isoformat()
    try:
        cursor = conn.cursor()
        cursor.execute("INSERT INTO Flashcards (user_id, collected_item_id, front_text, back_text, creation_date, next_review_date, stack_id, review_level) VALUES (?, ?, ?, ?, ?, ?, ?, 1)", (user_id, collected_item_id, front_text, back_text, ts, ts, target_stack_id))
        return cursor.lastrowid
    except sqlite3.Error as e:
        logger.error(f"SQLite error creating flashcard for collected_item_id {collected_item_id}: {e}")
        return None

@app.on_event("startup")
async def startup_event():
    logger.info("FastAPI application starting up...")
    create_tables_if_not_exist()

#====================================================
# --- HTML PAGE-SERVING ENDPOINTS ---
#====================================================
@app.get("/", response_class=HTMLResponse)
async def home_page(request: Request):
    return templates.TemplateResponse("home.html", {"request": request})

@app.get("/translate", response_class=HTMLResponse)
async def translate_page(request: Request):
    return templates.TemplateResponse("translate.html", {"request": request})

@app.get("/collections", response_class=HTMLResponse)
async def collections_page(request: Request):
    return templates.TemplateResponse("collections.html", {"request": request})

#====================================================
# --- API DATA ENDPOINTS ---
#====================================================

@app.post("/api/v1/translate", status_code=status.HTTP_200_OK)
async def handle_translation_request(translate_request: TranslateRequest = Body(...)):
    user_id = "default-user"
    original_text = translate_request.text
    translated_text = f"[MOCK Translated: {original_text}]"
    # ... (Full implementation as provided in previous steps) ...
    return {"translated_text": translated_text}

@app.post("/api/v1/stacks/{stack_id}/items", response_model=SnippetResponse, status_code=status.HTTP_201_CREATED)
async def add_item_to_stack(stack_id: int = Path(...), item_data: TextItemCreate = Body(...)):
    user_id = "default-user" 
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        
        # 1. Create the CollectedItem
        ts = datetime.now(timezone.utc).isoformat()
        cursor.execute(
            "INSERT INTO CollectedItems (user_id, selected_text, source_url, page_title, timestamp_collected) VALUES (?, ?, ?, ?, ?)",
            (user_id, item_data.text, item_data.source_url, item_data.page_title, ts)
        )
        item_id = cursor.lastrowid

        # 2. Create the Flashcard linked to the stack
        flashcard_id = _create_flashcard_in_db(conn, user_id, item_id, item_data.text, None, stack_id)
        
        if flashcard_id:
            conn.commit()
            return SnippetResponse(success=True, message="Item added successfully", itemId=item_id, flashcardId=flashcard_id)
        else:
            conn.rollback()
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create flashcard.")

    except sqlite3.Error as e:
        if conn: conn.rollback()
        logger.error(f"Database error adding item to stack {stack_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Database operation failed.")
    finally:
        if conn: conn.close()

        # In main.py, you can add this function before the get_all_collected_items endpoint

@app.get("/api/v1/users/{user_id}/stacks", response_model=List[StackResponseItem])
async def get_user_stacks(user_id: str = Path(...)):
    conn = get_db_connection()
    try:
        stacks_raw = conn.execute(
            "SELECT * FROM Stacks WHERE user_id = ? ORDER BY creation_date DESC",
            (user_id,)
        ).fetchall()
        return [dict(row) for row in stacks_raw]
    finally:
        if conn: conn.close()


@app.get("/api/v1/users/{user_id}/collected_items", response_model=List[FlashcardItem])
async def get_all_collected_items(user_id: str = Path(...)):
    conn = get_db_connection()
    try:
        items_raw = conn.execute(
            """
            SELECT f.*, ci.source_url, ci.page_title, ci.is_translation, ci.original_text
            FROM Flashcards f 
            JOIN CollectedItems ci ON f.collected_item_id = ci.item_id
            WHERE f.user_id = ? 
            ORDER BY ci.timestamp_collected DESC
            """,
            (user_id,)
        ).fetchall()
        return [dict(row) for row in items_raw]
    finally:
        if conn: conn.close()

@app.get("/api/v1/users/{user_id}/stacks/{stack_id}/flashcards", response_model=List[FlashcardItem])
async def get_flashcards_in_stack(user_id: str = Path(...), stack_id: int = Path(...)):
    conn = get_db_connection()
    try:
        stack = conn.execute("SELECT stack_id FROM Stacks WHERE stack_id = ? AND user_id = ?", (stack_id, user_id)).fetchone()
        if not stack: raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stack not found for this user.")
        flashcards_raw = conn.execute("SELECT * FROM Flashcards WHERE user_id = ? AND stack_id = ? ORDER BY creation_date DESC", (user_id, stack_id)).fetchall()
        return [dict(row) for row in flashcards_raw]
    finally:
        if conn: conn.close()


# In main.py, you can add these after the existing API endpoints

@app.delete("/api/v1/users/{user_id}/stacks/{stack_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_stack(user_id: str = Path(...), stack_id: int = Path(...)):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        # The ON DELETE CASCADE in the table definitions will handle deleting associated flashcards
        cursor.execute("DELETE FROM Stacks WHERE stack_id = ? AND user_id = ?", (stack_id, user_id))
        conn.commit()
        if cursor.rowcount == 0:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stack not found for this user.")
    except sqlite3.Error as e:
        if conn: conn.rollback()
        logger.error(f"Database error deleting stack {stack_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Database operation failed.")
    finally:
        if conn: conn.close()


@app.delete("/api/v1/users/{user_id}/flashcards/{flashcard_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_flashcard(user_id: str = Path(...), flashcard_id: int = Path(...)):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM Flashcards WHERE flashcard_id = ? AND user_id = ?", (flashcard_id, user_id))
        conn.commit()
        if cursor.rowcount == 0:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Flashcard not found for this user.")
    except sqlite3.Error as e:
        if conn: conn.rollback()
        logger.error(f"Database error deleting flashcard {flashcard_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Database operation failed.")
    finally:
        if conn: conn.close()








# ... (Include other functional endpoints like get_user_stacks, create_user_stack, flashcard review/delete, etc.)