# main.py - Consolidated and Corrected

from fastapi.responses import HTMLResponse, RedirectResponse
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
static_path = os.path.join(BASE_DIR, "../Frontend1/static")
templates_path = os.path.join(BASE_DIR, "../Frontend1/templates")

# --- FastAPI Application Instance and Template Setup ---
app = FastAPI(
    title="1Project API & Web App",
    description="Serves the 1Project API and the main web application frontend.",
    version="1.0.0"
)

app.mount("/static", StaticFiles(directory=static_path), name="static")
templates = Jinja2Templates(directory=templates_path)

# --- Pydantic Models ---

class FolderCreate(BaseModel):
    folder_name: str

class FolderItem(BaseModel):
    folder_id: int
    user_id: str
    folder_name: str
    creation_date: str

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

class NoteCreate(BaseModel):
    title: Optional[str] = "Untitled Note"
    content: Optional[str] = ""
    folder_id: Optional[int] = None # This is important for creating and updating

class NoteItem(BaseModel):
    note_id: int
    user_id: str
    title: str
    content: Optional[str]
    creation_date: str
    last_modified_date: str
    folder_id: Optional[int] # Ensure this is in the response model

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
    # ... (existing CREATE TABLE for CollectedItems, Stacks, Flashcards) ...
    cursor.execute('''CREATE TABLE IF NOT EXISTS Flashcards (flashcard_id INTEGER PRIMARY KEY, user_id TEXT NOT NULL, collected_item_id INTEGER NOT NULL, front_text TEXT NOT NULL, back_text TEXT, creation_date TEXT NOT NULL, last_reviewed_date TEXT, next_review_date TEXT, stack_id INTEGER NOT NULL, review_level INTEGER NOT NULL DEFAULT 1, FOREIGN KEY (collected_item_id) REFERENCES CollectedItems(item_id) ON DELETE CASCADE, FOREIGN KEY (stack_id) REFERENCES Stacks(stack_id) ON DELETE CASCADE)''')

    # ADDED: This creates the new table for folders.
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS Folders (
            folder_id INTEGER PRIMARY KEY,
            user_id TEXT NOT NULL,
            folder_name TEXT NOT NULL,
            creation_date TEXT NOT NULL
        )
    ''')
    
    # MODIFIED: This updates the Notes table to include a folder_id link.
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS Notes (
            note_id INTEGER PRIMARY KEY,
            user_id TEXT NOT NULL,
            title TEXT,
            content TEXT,
            creation_date TEXT NOT NULL,
            last_modified_date TEXT NOT NULL,
            folder_id INTEGER,
            FOREIGN KEY (folder_id) REFERENCES Folders(folder_id) ON DELETE SET NULL
        )
    ''')

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

@app.get("/translate", response_class=RedirectResponse, include_in_schema=False)
async def redirect_translate_to_home(request: Request):
    return RedirectResponse(url=request.url_for('home_page'))

@app.get("/collections", response_class=RedirectResponse, include_in_schema=False)
async def redirect_translate_to_home(request: Request):
    return RedirectResponse(url=request.url_for('home_page'))

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

# --- API ENDPOINTS FOR NOTES ---

@app.post("/api/v1/notes", response_model=NoteItem, status_code=status.HTTP_201_CREATED)
async def create_new_note(note_data: NoteCreate = Body(...)):
    user_id = "default-user" # Placeholder user ID
    ts = datetime.now(timezone.utc).isoformat()
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO Notes (user_id, title, content, folder_id, creation_date, last_modified_date) VALUES (?, ?, ?, ?, ?, ?)",
            (user_id, note_data.title, note_data.content, note_data.folder_id, ts, ts)
        )
        new_note_id = cursor.lastrowid
        conn.commit()
        
        # Use a consistent select method to fetch the newly created note
        new_note = conn.execute("SELECT * FROM Notes WHERE note_id = ?", (new_note_id,)).fetchone()
        return dict(new_note)
        
    except sqlite3.Error as e:
        if conn: conn.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Database error: {e}")
    finally:
        if conn: conn.close()

@app.get("/api/v1/notes", response_model=List[NoteItem])
async def get_all_notes():
    user_id = "default-user"
    conn = get_db_connection()
    try:
        notes_raw = conn.execute(
            "SELECT * FROM Notes WHERE user_id = ? ORDER BY last_modified_date DESC", (user_id,)
        ).fetchall()
        return [dict(row) for row in notes_raw]
    finally:
        if conn: conn.close()

@app.get("/api/v1/notes/{note_id}", response_model=NoteItem)
async def get_note(note_id: int):
    user_id = "default-user"
    conn = get_db_connection()
    try:
        note = conn.execute("SELECT * FROM Notes WHERE note_id = ? AND user_id = ?", (note_id, user_id)).fetchone()
        if not note:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found.")
        return dict(note)
    finally:
        if conn: conn.close()

@app.put("/api/v1/notes/{note_id}", response_model=NoteItem)
async def update_note(note_id: int, note_data: NoteCreate = Body(...)):
    user_id = "default-user"
    ts = datetime.now(timezone.utc).isoformat()
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        
        # --- THIS IS THE CORRECTED PART ---
        # It now includes folder_id in the update, making it more robust
        cursor.execute(
            "UPDATE Notes SET title = ?, content = ?, folder_id = ?, last_modified_date = ? WHERE note_id = ? AND user_id = ?",
            (note_data.title, note_data.content, note_data.folder_id, ts, note_id, user_id)
        )
        # --- END OF CORRECTION ---

        if cursor.rowcount == 0:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found.")
        conn.commit()

        updated_note = conn.execute("SELECT * FROM Notes WHERE note_id = ?", (note_id,)).fetchone()
        return dict(updated_note)
        
    except sqlite3.Error as e:
        if conn: conn.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Database error: {e}")
    finally:
        if conn: conn.close()

@app.delete("/api/v1/notes/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_note(note_id: int):
    user_id = "default-user"
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM Notes WHERE note_id = ? AND user_id = ?", (note_id, user_id))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found.")
        conn.commit()
    finally:
        if conn: conn.close()

# --- API ENDPOINTS FOR FOLDERS ---

@app.post("/api/v1/folders", response_model=FolderItem, status_code=status.HTTP_201_CREATED)
async def create_new_folder(folder_data: FolderCreate = Body(...)):
    user_id = "default-user"
    ts = datetime.now(timezone.utc).isoformat()
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO Folders (user_id, folder_name, creation_date) VALUES (?, ?, ?)",
            (user_id, folder_data.folder_name, ts)
        )
        new_folder_id = cursor.lastrowid
        conn.commit()
        
        new_folder = conn.execute("SELECT * FROM Folders WHERE folder_id = ?", (new_folder_id,)).fetchone()
        return dict(new_folder)
        
    except sqlite3.Error as e:
        if conn: conn.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Database error: {e}")
    finally:
        if conn: conn.close()

@app.get("/api/v1/folders", response_model=List[FolderItem])
async def get_all_folders():
    user_id = "default-user"
    conn = get_db_connection()
    try:
        folders_raw = conn.execute(
            "SELECT * FROM Folders WHERE user_id = ? ORDER BY folder_name ASC", (user_id,)
        ).fetchall()
        return [dict(row) for row in folders_raw]
    finally:
        if conn: conn.close()

@app.get("/api/v1/folders/{folder_id}/notes", response_model=List[NoteItem])
async def get_notes_in_folder(folder_id: int):
    user_id = "default-user"
    conn = get_db_connection()
    try:
        # First, check if the folder exists for the user
        folder = conn.execute("SELECT folder_id FROM Folders WHERE folder_id = ? AND user_id = ?", (folder_id, user_id)).fetchone()
        if not folder:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folder not found.")
        
        # Then, fetch all notes within that folder
        notes_raw = conn.execute(
            "SELECT * FROM Notes WHERE user_id = ? AND folder_id = ? ORDER BY last_modified_date DESC",
            (user_id, folder_id)
        ).fetchall()
        return [dict(row) for row in notes_raw]
    finally:
        if conn: conn.close()

@app.get("/notes", response_class=RedirectResponse, include_in_schema=False)
async def redirect_notes_to_home(request: Request):
    return RedirectResponse(url=request.url_for('home_page'))
        
@app.delete("/api/v1/folders/{folder_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_folder(folder_id: int, user_id: str = "default-user"):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        
        # First, ensure the folder exists for the user
        folder = cursor.execute("SELECT folder_id FROM Folders WHERE folder_id = ? AND user_id = ?", (folder_id, user_id)).fetchone()
        if not folder:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folder not found.")

        # Delete all notes within that folder
        cursor.execute("DELETE FROM Notes WHERE folder_id = ? AND user_id = ?", (folder_id, user_id))
        
        # Then, delete the folder itself
        cursor.execute("DELETE FROM Folders WHERE folder_id = ? AND user_id = ?", (folder_id, user_id))
        
        conn.commit()
        
    except sqlite3.Error as e:
        if conn: conn.rollback()
        logger.error(f"Database error deleting folder {folder_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Database operation failed.")
    finally:
        if conn: conn.close()