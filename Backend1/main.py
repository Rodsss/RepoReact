# main.py

from fastapi import FastAPI, HTTPException, Body, status, Path, Request
from fastapi.middleware.cors import CORSMiddleware 
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, validator
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




class ListItemCreate(BaseModel):
    collected_item_id: int

class CollectedItemResponse(BaseModel):
    item_id: int
    user_id: str
    source_text: str
    translated_text: Optional[str] = None
    source_url: Optional[str] = None
    timestamp_collected: str

class ListItemsResponse(BaseModel):
    list_id: int
    list_name: str
    items: List[CollectedItemResponse]


class SnippetCreate(BaseModel):
    selectedText: str; sourceUrl: Optional[str] = None; pageTitle: Optional[str] = None; timestamp: str
class TranslationLogCreate(BaseModel):
    originalText: str; translatedText: str; sourceLanguage: str; targetLanguage: str
    sourceUrl: Optional[str] = None; timestamp: str
class StackCreate(BaseModel):
    stack_name: str
class FlashcardManualCreate(BaseModel): 
    front_text: str; back_text: Optional[str] = None
class FlashcardUpdate(BaseModel):
    front_text: Optional[str] = None; back_text: Optional[str] = None
    @validator('*', pre=True, always=True)
    def check_at_least_one_value(cls, v, values):
        if not values: return v 
        if all(value is None for value in values.values()): raise ValueError("At least one field must be provided.")
        return v
class FlashcardReview(BaseModel): 
    outcome: str = Field(..., pattern="^(correct|incorrect)$")
class StackImport(BaseModel):
    user_id: str
    stack_name: str = Field(..., min_length=1, max_length=100)
    delimiter: str = Field(..., pattern="^(tab|comma|newline)$")
    data: str = Field(..., min_length=1)
class MediaClip(BaseModel):
    videoId: str; videoTitle: str; channelTitle: str; startTime: float

class SnippetResponse(BaseModel):
    success: bool; message: str; itemId: Optional[int] = None; flashcardId: Optional[int] = None 
class TranslationLogResponse(BaseModel):
    success: bool; message: str; logId: Optional[int] = None; flashcardId: Optional[int] = None
class StackResponseItem(BaseModel): 
    stack_id: int; user_id: str; stack_name: str; creation_date: str; is_default_stack: bool
class StackDetailResponse(BaseModel): 
    success: bool; message: str; stack: Optional[StackResponseItem] = None 
class FlashcardItem(BaseModel): 
    flashcard_id: int; user_id: str; collected_item_id: int; front_text: str; back_text: Optional[str] = None; creation_date: str; 
    last_reviewed_date: Optional[str] = None; next_review_date: Optional[str] = None; stack_id: int;
    review_level: int
class FlashcardDetailResponse(BaseModel): 
    success: bool; message: str; flashcard: Optional[FlashcardItem] = None
class GenericSuccessResponse(BaseModel):
    success: bool; message: str

# --- CORS Middleware ---
origins = ["*"]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# --- Database Setup & Helper Functions ---
def get_db_connection():
    conn = sqlite3.connect(DATABASE_URL); conn.row_factory = sqlite3.Row; return conn

def create_tables_if_not_exist():
    conn = None 
    try:
        conn = get_db_connection(); cursor = conn.cursor(); cursor.execute("PRAGMA foreign_keys = ON;")
        
        cursor.execute('''CREATE TABLE IF NOT EXISTS CollectedItems (item_id INTEGER PRIMARY KEY, user_id TEXT NOT NULL, selected_text TEXT, source_url TEXT, page_title TEXT, is_translation BOOLEAN DEFAULT 0, original_text TEXT, translated_text TEXT, source_language TEXT, target_language TEXT, timestamp_collected TEXT NOT NULL)''')
        cursor.execute('''CREATE TABLE IF NOT EXISTS Stacks (stack_id INTEGER PRIMARY KEY, user_id TEXT NOT NULL, stack_name TEXT NOT NULL, creation_date TEXT NOT NULL, is_default_stack BOOLEAN DEFAULT 0, UNIQUE(user_id, stack_name))''')
        cursor.execute('''CREATE TABLE IF NOT EXISTS Flashcards (flashcard_id INTEGER PRIMARY KEY, user_id TEXT NOT NULL, collected_item_id INTEGER NOT NULL, front_text TEXT NOT NULL, back_text TEXT, creation_date TEXT NOT NULL, last_reviewed_date TEXT, next_review_date TEXT, stack_id INTEGER NOT NULL, review_level INTEGER NOT NULL DEFAULT 1, FOREIGN KEY (collected_item_id) REFERENCES CollectedItems(item_id) ON DELETE CASCADE, FOREIGN KEY (stack_id) REFERENCES Stacks(stack_id) ON DELETE CASCADE)''')
        
        try:
            cursor.execute("SELECT review_level FROM Flashcards LIMIT 1")
        except sqlite3.OperationalError:
            logger.info("Column 'review_level' not found in Flashcards table. Adding it now...")
            cursor.execute("ALTER TABLE Flashcards ADD COLUMN review_level INTEGER NOT NULL DEFAULT 1")
        
        conn.commit()
        logger.info("All tables checked/created successfully.")
    except sqlite3.Error as e:
        logger.error(f"Database error during table creation: {e}", exc_info=True) 
    finally:
        if conn: conn.close()

def _get_or_create_default_stack(conn: sqlite3.Connection, user_id: str) -> Optional[int]:
    cursor = conn.cursor(); default_stack_name = "My First Collection"
    cursor.execute("SELECT stack_id FROM Stacks WHERE user_id = ? AND stack_name = ?", (user_id, default_stack_name))
    stack = cursor.fetchone()
    if stack: return stack["stack_id"]
    try:
        cursor.execute("INSERT INTO Stacks (user_id, stack_name, creation_date, is_default_stack) VALUES (?, ?, ?, ?)", (user_id, default_stack_name, datetime.now(timezone.utc).isoformat(), True))
        return cursor.lastrowid
    except sqlite3.Error as e:
        logger.error(f"SQLite error creating default stack for user {user_id}: {e}"); return None 

def _create_flashcard_in_db(conn: sqlite3.Connection, user_id: str, collected_item_id: int, front_text: str, back_text: Optional[str], target_stack_id: int) -> Optional[int]:
    if target_stack_id is None: return None 
    ts = datetime.now(timezone.utc).isoformat()
    try:
        cursor = conn.cursor()
        cursor.execute("INSERT INTO Flashcards (user_id, collected_item_id, front_text, back_text, creation_date, next_review_date, stack_id) VALUES (?, ?, ?, ?, ?, ?, ?)", (user_id, collected_item_id, front_text, back_text, ts, ts, target_stack_id))
        return cursor.lastrowid
    except sqlite3.Error as e:
        logger.error(f"SQLite error creating flashcard for collected_item_id {collected_item_id}: {e}"); return None

@app.on_event("startup")
async def startup_event():
    logger.info("FastAPI application starting up..."); create_tables_if_not_exist()

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
    return HTMLResponse(content="<h1>Collections Page (Placeholder)</h1>")

@app.get("/dive", response_class=HTMLResponse)
async def dive_page(request: Request):
    return HTMLResponse(content="<h1>Dive Page (Placeholder)</h1>")




#====================================================
# --- API DATA ENDPOINTS ---
#====================================================




@app.delete("/api/v1/users/{user_id}/lists/{list_id}/items/{item_id}", response_model=GenericSuccessResponse)
async def remove_item_from_list(
    user_id: str = Path(...),
    list_id: int = Path(...),
    item_id: int = Path(...)
):
    """
    Removes a specific CollectedItem from a specific CustomList for a user.
    Note: This only removes the association; it does not delete the CollectedItem itself.
    """
    logger.info(f"Attempting to remove item {item_id} from list {list_id} for user {user_id}.")
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # First, ensure the list exists and belongs to the user
        cursor.execute("SELECT list_id FROM CustomLists WHERE list_id = ? AND user_id = ?", (list_id, user_id))
        if not cursor.fetchone():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="List not found for this user.")

        # Execute the delete operation on the linking table
        cursor.execute(
            "DELETE FROM CustomListItems WHERE list_id = ? AND collected_item_id = ?",
            (list_id, item_id)
        )
        conn.commit()

        if cursor.rowcount == 0:
            # This means the item was not in the list to begin with.
            # Returning a success message is acceptable, or a 404 could be used.
            logger.warn(f"Item {item_id} was not found in list {list_id} to be removed.")
            return GenericSuccessResponse(success=True, message="Item was not in the list, but the state is now consistent.")

        logger.info(f"Item {item_id} removed from list {list_id} successfully.")
        return GenericSuccessResponse(success=True, message="Item removed from list successfully.")
        
    except sqlite3.Error as e:
        logger.error(f"Database error removing item from list {list_id}: {e}", exc_info=True)
        if conn: conn.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Database error: {str(e)}")
    finally:
        if conn:
            conn.close()



@app.post("/api/v1/users/{user_id}/lists/{list_id}/items", response_model=GenericSuccessResponse)
async def add_item_to_list(
    user_id: str = Path(...),
    list_id: int = Path(...),
    item_data: ListItemCreate = Body(...)
):
    """
    Adds an existing CollectedItem to a specific custom list for a user.
    """
    logger.info(f"Attempting to add item {item_data.collected_item_id} to list {list_id} for user {user_id}.")
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # First, ensure the list and the collected item exist and belong to the user
        cursor.execute("SELECT list_id FROM CustomLists WHERE list_id = ? AND user_id = ?", (list_id, user_id))
        if not cursor.fetchone():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="List not found for this user.")

        cursor.execute("SELECT item_id FROM CollectedItems WHERE item_id = ? AND user_id = ?", (item_data.collected_item_id, user_id))
        if not cursor.fetchone():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collected item not found for this user.")

        # Insert the link into the linking table
        timestamp = datetime.now(timezone.utc).isoformat()
        cursor.execute(
            "INSERT INTO CustomListItems (list_id, collected_item_id, timestamp_added) VALUES (?, ?, ?)",
            (list_id, item_data.collected_item_id, timestamp)
        )
        conn.commit()

        return GenericSuccessResponse(success=True, message="Item added to list successfully.")
    except sqlite3.IntegrityError:
        # This will catch violations of the UNIQUE(list_id, collected_item_id) constraint
        logger.warn(f"Item {item_data.collected_item_id} already exists in list {list_id}.")
        if conn: conn.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This item is already in the list.")
    except sqlite3.Error as e:
        logger.error(f"Database error adding item to list {list_id}: {e}", exc_info=True)
        if conn: conn.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Database error.")
    finally:
        if conn:
            conn.close()


@app.get("/api/v1/users/{user_id}/lists/{list_id}/items", response_model=ListItemsResponse)
async def get_items_in_list(
    user_id: str = Path(...),
    list_id: int = Path(...)
):
    """
    Retrieves all collected items associated with a specific custom list for a user.
    """
    logger.info(f"Attempting to retrieve items for list {list_id} for user {user_id}.")
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # First, ensure the list exists and belongs to the user
        cursor.execute("SELECT list_name FROM CustomLists WHERE list_id = ? AND user_id = ?", (list_id, user_id))
        list_record = cursor.fetchone()
        if not list_record:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="List not found for this user.")

        # Join CustomListItems with CollectedItems to get the item details
        cursor.execute("""
            SELECT ci.*
            FROM CustomListItems cli
            JOIN CollectedItems ci ON cli.collected_item_id = ci.item_id
            WHERE cli.list_id = ? AND ci.user_id = ?
            ORDER BY cli.timestamp_added DESC
        """, (list_id, user_id))
        
        items_raw = cursor.fetchall()
        items = [CollectedItemResponse(**dict(row)) for row in items_raw]

        logger.info(f"Found {len(items)} items in list {list_id}.")
        return ListItemsResponse(
            list_id=list_id,
            list_name=list_record["list_name"],
            items=items
        )
    except sqlite3.Error as e:
        logger.error(f"Database error retrieving items for list {list_id}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Database error.")
    finally:
        if conn:
            conn.close()



@app.delete("/api/v1/users/{user_id}/lists/{list_id}", response_model=GenericSuccessResponse)
async def delete_custom_list(
    user_id: str = Path(..., description="The ID of the user who owns the list."),
    list_id: int = Path(..., description="The ID of the list to delete.")
):
    """
    Deletes a specific custom list and all its associated items
    (due to ON DELETE CASCADE).
    """
    logger.info(f"Attempting to delete list {list_id} for user {user_id}.")
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # First, ensure the list exists and belongs to the user before deleting
        cursor.execute("SELECT list_id FROM CustomLists WHERE list_id = ? AND user_id = ?", (list_id, user_id))
        if not cursor.fetchone():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="List not found for this user.")

        # Execute the delete operation
        cursor.execute("DELETE FROM CustomLists WHERE list_id = ? AND user_id = ?", (list_id, user_id))
        conn.commit()

        if cursor.rowcount == 0:
            # This case is unlikely if the first check passed, but is a good safeguard
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="List not found during delete operation.")

        logger.info(f"List {list_id} deleted successfully for user {user_id}.")
        return GenericSuccessResponse(success=True, message=f"List {list_id} deleted successfully.")
        
    except sqlite3.Error as e:
        logger.error(f"Database error deleting list {list_id}: {e}", exc_info=True)
        if conn: conn.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Database error: {str(e)}")
    finally:
        if conn:
            conn.close()





@app.post("/api/v1/stacks/import", response_model=StackDetailResponse, status_code=status.HTTP_201_CREATED)
async def import_stack_from_text(import_data: StackImport = Body(...)):
    conn = None
    try:
        conn = get_db_connection(); cursor = conn.cursor(); cursor.execute("BEGIN TRANSACTION")
        try:
            cursor.execute( "INSERT INTO Stacks (user_id, stack_name, creation_date, is_default_stack) VALUES (?, ?, ?, ?)", (import_data.user_id, import_data.stack_name, datetime.now(timezone.utc).isoformat(), False))
            new_stack_id = cursor.lastrowid
            if new_stack_id is None: raise sqlite3.Error("Failed to retrieve lastrowid for new stack.")
        except sqlite3.IntegrityError:
            conn.rollback(); raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"A stack with the name '{import_data.stack_name}' already exists.")
        delimiter_char = {'tab': '\t', 'comma': ',', 'newline': '\n'}.get(import_data.delimiter)
        if delimiter_char is None: raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid delimiter specified.")
        lines = [line.strip() for line in import_data.data.strip().split('\n') if line.strip()]
        if not lines: raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Import data cannot be empty.")
        for line in lines:
            parts = line.split(delimiter_char, 1); front_text = parts[0].strip(); back_text = parts[1].strip() if len(parts) > 1 else ""
            if not front_text: continue
            cursor.execute("INSERT INTO CollectedItems (user_id, selected_text, source_url, page_title, timestamp_collected) VALUES (?, ?, ?, ?, ?)", (import_data.user_id, front_text, "bulk_import", f"Imported to '{import_data.stack_name}'", datetime.now(timezone.utc).isoformat()))
            new_collected_item_id = cursor.lastrowid
            if new_collected_item_id is None: raise sqlite3.Error("Failed to create backing CollectedItem.")
            new_flashcard_id = _create_flashcard_in_db(conn, import_data.user_id, new_collected_item_id, front_text, back_text, new_stack_id)
            if new_flashcard_id is None: raise sqlite3.Error(f"Failed to create flashcard for line: '{line}'")
        conn.commit()
        cursor.execute("SELECT * FROM Stacks WHERE stack_id = ?", (new_stack_id,)); created_stack_raw = cursor.fetchone()
        return StackDetailResponse(success=True, message=f"Stack created with {len(lines)} flashcards.", stack=StackResponseItem(**dict(created_stack_raw)))
    except (sqlite3.Error, HTTPException) as e:
        if conn: conn.rollback()
        if isinstance(e, HTTPException): raise
        else: raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Database error: {str(e)}")
    finally:
        if conn: conn.close()

@app.get("/api/v1/users/{user_id}/stacks", response_model=List[StackResponseItem])
async def get_user_stacks(user_id: str = Path(...)):
    conn = get_db_connection()
    try:
        stacks_raw = conn.execute("SELECT * FROM Stacks WHERE user_id = ?", (user_id,)).fetchall()
        return [StackResponseItem(**dict(row)) for row in stacks_raw]
    finally:
        if conn: conn.close()

@app.get("/api/v1/users/{user_id}/stacks/{stack_id}/flashcards", response_model=List[FlashcardItem])
async def get_flashcards_in_stack(user_id: str = Path(...), stack_id: int = Path(...)):
    conn = get_db_connection()
    try:
        stack = conn.execute("SELECT stack_id FROM Stacks WHERE stack_id = ? AND user_id = ?", (stack_id, user_id)).fetchone()
        if not stack: raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stack not found for this user.")
        flashcards_raw = conn.execute("SELECT * FROM Flashcards WHERE user_id = ? AND stack_id = ? ORDER BY review_level ASC, last_reviewed_date ASC", (user_id, stack_id)).fetchall()
        return [FlashcardItem(**dict(row)) for row in flashcards_raw]
    finally:
        if conn: conn.close()

@app.post("/api/v1/users/{user_id}/stacks", response_model=StackDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_user_stack(user_id: str = Path(...), stack_data: StackCreate = Body(...)):
    conn = None
    try:
        conn = get_db_connection(); cursor = conn.cursor()
        cursor.execute("INSERT INTO Stacks (user_id, stack_name, creation_date, is_default_stack) VALUES (?, ?, ?, ?)", (user_id, stack_data.stack_name, datetime.now(timezone.utc).isoformat(), False))
        new_stack_id = cursor.lastrowid
        conn.commit()
        if new_stack_id is None: raise sqlite3.Error("Failed to retrieve lastrowid.")
        created_stack_raw = conn.execute("SELECT * FROM Stacks WHERE stack_id = ?", (new_stack_id,)).fetchone()
        return StackDetailResponse(success=True, message=f"Stack '{created_stack_raw['stack_name']}' created.", stack=StackResponseItem(**dict(created_stack_raw)))
    except sqlite3.IntegrityError:
        if conn: conn.rollback(); raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Stack with name '{stack_data.stack_name}' already exists.")
    except sqlite3.Error as e:
        if conn: conn.rollback(); raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Database error: {str(e)}")
    finally:
        if conn: conn.close()

@app.post("/api/v1/users/{user_id}/flashcards/{flashcard_id}/review", response_model=GenericSuccessResponse)
async def review_flashcard(user_id: str = Path(...), flashcard_id: int = Path(...), review_data: FlashcardReview = Body(...)):
    conn = None; MAX_REVIEW_LEVEL = 5 
    try:
        conn = get_db_connection(); cursor = conn.cursor()
        flashcard = cursor.execute("SELECT review_level FROM Flashcards WHERE flashcard_id = ? AND user_id = ?", (flashcard_id, user_id)).fetchone()
        if not flashcard: raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Flashcard {flashcard_id} not found.")
        current_level = flashcard["review_level"]
        new_level = min(current_level + 1, MAX_REVIEW_LEVEL) if review_data.outcome == 'correct' else 1
        review_ts = datetime.now(timezone.utc).isoformat()
        cursor.execute("UPDATE Flashcards SET review_level = ?, last_reviewed_date = ? WHERE flashcard_id = ?", (new_level, review_ts, flashcard_id))
        conn.commit()
        if cursor.rowcount == 0: raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Flashcard not updated.")
        return GenericSuccessResponse(success=True, message=f"Flashcard review status updated to level {new_level}.")
    except (sqlite3.Error, HTTPException) as e:
        if conn: conn.rollback()
        if isinstance(e, HTTPException): raise
        else: raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Database error: {str(e)}")
    finally:
        if conn: conn.close()

@app.put("/api/v1/users/{user_id}/flashcards/{flashcard_id}", response_model=FlashcardDetailResponse)
async def update_flashcard(user_id: str = Path(...), flashcard_id: int = Path(...), flashcard_update_data: FlashcardUpdate = Body(...)):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        existing = cursor.execute("SELECT 1 FROM Flashcards WHERE flashcard_id = ? AND user_id = ?", (flashcard_id, user_id)).fetchone()
        if not existing: raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Flashcard not found for this user.")
        update_fields = []; update_values = []
        if flashcard_update_data.front_text is not None: update_fields.append("front_text = ?"); update_values.append(flashcard_update_data.front_text)
        if flashcard_update_data.back_text is not None: update_fields.append("back_text = ?"); update_values.append(flashcard_update_data.back_text)
        if not update_fields: raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update.")
        update_query = f"UPDATE Flashcards SET {', '.join(update_fields)} WHERE flashcard_id = ? AND user_id = ?"
        update_values.extend([flashcard_id, user_id]); cursor.execute(update_query, tuple(update_values)); conn.commit()
        updated_flashcard_raw = conn.execute("SELECT * FROM Flashcards WHERE flashcard_id = ?", (flashcard_id,)).fetchone()
        return FlashcardDetailResponse(success=True, message="Flashcard updated.", flashcard=FlashcardItem(**dict(updated_flashcard_raw)))
    finally:
        if conn: conn.close()

@app.delete("/api/v1/users/{user_id}/flashcards/{flashcard_id}", response_model=GenericSuccessResponse)
async def delete_flashcard(user_id: str = Path(...), flashcard_id: int = Path(...)):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        flashcard = cursor.execute("SELECT collected_item_id FROM Flashcards WHERE flashcard_id = ? AND user_id = ?", (flashcard_id, user_id)).fetchone()
        if not flashcard: raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Flashcard not found for this user.")
        cursor.execute("DELETE FROM CollectedItems WHERE item_id = ? AND user_id = ?", (flashcard["collected_item_id"], user_id)); conn.commit()
        return GenericSuccessResponse(success=True, message=f"Flashcard {flashcard_id} deleted.")
    finally:
        if conn: conn.close()

@app.delete("/api/v1/users/{user_id}/stacks/{stack_id}", response_model=GenericSuccessResponse)
async def delete_user_stack(user_id: str = Path(...), stack_id: int = Path(...)):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        stack = cursor.execute("SELECT stack_id, is_default_stack FROM Stacks WHERE stack_id = ? AND user_id = ?", (stack_id, user_id)).fetchone()
        if not stack: raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stack not found for this user.")
        if stack["is_default_stack"]: raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete the default collection stack.")
        cursor.execute("DELETE FROM Stacks WHERE stack_id = ? AND user_id = ?", (stack_id, user_id)); conn.commit()
        return GenericSuccessResponse(success=True, message=f"Stack {stack_id} and its contents deleted.")
    finally:
        if conn: conn.close()