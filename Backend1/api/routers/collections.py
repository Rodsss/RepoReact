# FILE: Backend1/api/routers/collections.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

# --- CORRECTED IMPORTS ---
# We now import each specific Model and Schema class we need
from Backend1 import models  # Import the entire models module
from Backend1.schemas import StackResponseItem, StackCreate, FlashcardItem
from Backend1.models import User, Stack, Flashcard # Also import specific models for type hinting
from Backend1.database import get_db
from Backend1.security import get_current_active_user

router = APIRouter(
    prefix="/collections",
    tags=["Collections & Stacks"]
)

@router.get("/stacks", response_model=List[StackResponseItem])
def get_user_stacks(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    """
    Gets all stacks for the currently authenticated user.
    """
    # Now that 'models' is imported, this line will work
    stacks = db.query(models.Stack).filter(models.Stack.user_id == current_user.id).order_by(models.Stack.creation_date.desc()).all()
    return stacks

@router.post("/stacks", response_model=StackResponseItem)
def create_user_stack(stack: StackCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    """
    Creates a new stack for the currently authenticated user.
    """
    # This line will also now work
    db_stack = db_stack = models.Stack(**stack.model_dump(), user_id=current_user.id)
    db.add(db_stack)
    db.commit()
    db.refresh(db_stack)
    return db_stack

@router.get("/stacks/{stack_id}/flashcards", response_model=List[FlashcardItem])
def get_flashcards_in_stack(stack_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    """
    Gets all flashcards from a specific stack owned by the currently authenticated user.
    """
    stack = db.query(models.Stack).filter(models.Stack.stack_id == stack_id, models.Stack.user_id == current_user.id).first()
    if not stack:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stack not found for this user.")
    
    flashcards = db.query(models.Flashcard).filter(models.Flashcard.stack_id == stack_id).order_by(models.Flashcard.creation_date.desc()).all()
    return flashcards
    
@router.delete("/stacks/{stack_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_stack(stack_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    """
    Deletes a stack owned by the currently authenticated user.
    """
    stack_to_delete = db.query(models.Stack).filter(models.Stack.stack_id == stack_id, models.Stack.user_id == current_user.id).first()
    if not stack_to_delete:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stack not found for this user.")
    
    db.delete(stack_to_delete)
    db.commit()
    return