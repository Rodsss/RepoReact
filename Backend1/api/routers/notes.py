
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

# --- CORRECTED IMPORTS ---
# Ensure that 'models' and 'schemas' are imported so they can be referenced
from Backend1 import models
from Backend1 import schemas
from Backend1.database import get_db
from Backend1.security import get_current_active_user

router = APIRouter(
    prefix="/notes",
    tags=["Notes & Folders"]
)

# --- FOLDERS ---

@router.post("/folders", response_model=schemas.FolderItem, status_code=status.HTTP_201_CREATED)
def create_new_folder(folder: schemas.FolderCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    """
    Creates a new folder for the currently authenticated user.
    """
    db_folder = models.Folder(**folder.dict(), user_id=current_user.id)
    db.add(db_folder)
    db.commit()
    db.refresh(db_folder)
    return db_folder

@router.get("/folders", response_model=List[schemas.FolderItem])
def get_all_folders(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    """
    Retrieves all folders for the currently authenticated user.
    """
    return db.query(models.Folder).filter(models.Folder.user_id == current_user.id).order_by(models.Folder.folder_name).all()

@router.delete("/folders/{folder_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_folder(folder_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    """
    Deletes a folder and un-links any notes within it for the currently authenticated user.
    """
    folder_to_delete = db.query(models.Folder).filter(models.Folder.folder_id == folder_id, models.Folder.user_id == current_user.id).first()
    if not folder_to_delete:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folder not found.")
    
    # The relationship in models.py with `ondelete="SET NULL"` will handle un-linking notes
    db.delete(folder_to_delete)
    db.commit()
    return

# --- NOTES ---

@router.post("/", response_model=schemas.NoteItem, status_code=status.HTTP_201_CREATED)
def create_new_note(note: schemas.NoteCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    """
    Creates a new note for the currently authenticated user.
    """
    db_note = models.Note(**note.dict(), user_id=current_user.id)
    db.add(db_note)
    db.commit()
    db.refresh(db_note)
    return db_note

@router.get("/", response_model=List[schemas.NoteItem])
def get_all_notes(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    """
    Retrieves all notes for the currently authenticated user.
    """
    return db.query(models.Note).filter(models.Note.user_id == current_user.id).order_by(models.Note.last_modified_date.desc()).all()

@router.get("/{note_id}", response_model=schemas.NoteItem)
def get_note(note_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    """
    Retrieves a specific note by its ID for the currently authenticated user.
    """
    note = db.query(models.Note).filter(models.Note.note_id == note_id, models.Note.user_id == current_user.id).first()
    if not note:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found.")
    return note

@router.put("/{note_id}", response_model=schemas.NoteItem)
def update_note(note_id: int, note_data: schemas.NoteCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    """
    Updates a specific note for the currently authenticated user.
    """
    note_query = db.query(models.Note).filter(models.Note.note_id == note_id, models.Note.user_id == current_user.id)
    db_note = note_query.first()

    if not db_note:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found.")
    
    note_query.update(note_data.dict(), synchronize_session=False)
    db.commit()
    db.refresh(db_note)
    return db_note

@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_note(note_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    """
    Deletes a specific note for the currently authenticated user.
    """
    note_to_delete = db.query(models.Note).filter(models.Note.note_id == note_id, models.Note.user_id == current_user.id).first()
    if not note_to_delete:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found.")
        
    db.delete(note_to_delete)
    db.commit()
    return