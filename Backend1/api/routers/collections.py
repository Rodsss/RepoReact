# FILE: Backend1/api/routers/collections.py (Final Corrected Imports)

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

# --- CORRECTED IMPORTS ---
# We now import each specific Model and Schema class directly from its file.
from Backend1.models import User, Stack, Flashcard
from Backend1.schemas import StackResponseItem, StackCreate, FlashcardItem

from Backend1.database import get_db
from Backend1.security import get_current_active_user

router = APIRouter(
    prefix="/collections",
    tags=["Collections & Stacks"]
)

# The function signatures now use the directly imported schema classes
@router.post("/stacks", response_model=StackResponseItem)
def create_user_stack(stack: StackCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    # The logic now uses the directly imported SQLAlchemy model
    db_stack = models.Stack(**stack.dict(), user_id=current_user.id)
    db.add(db_stack)
    db.commit()
    db.refresh(db_stack)
    return db_stack

# The response_model and dependencies are also updated with direct references
@router.get("/stacks", response_model=List[StackResponseItem])
def get_user_stacks(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    stacks = db.query(models.Stack).filter(models.Stack.user_id == current_user.id).order_by(models.Stack.creation_date.desc()).all()
    return stacks

@router.get("/stacks/{stack_id}/flashcards", response_model=List[FlashcardItem])
def get_flashcards_in_stack(stack_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    stack = db.query(models.Stack).filter(models.Stack.stack_id == stack_id, models.Stack.user_id == current_user.id).first()
    if not stack:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stack not found for this user.")
    
    flashcards = db.query(models.Flashcard).filter(models.Flashcard.stack_id == stack_id).order_by(models.Flashcard.creation_date.desc()).all()
    return flashcards

@router.delete("/stacks/{stack_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_stack(stack_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    stack_to_delete = db.query(models.Stack).filter(models.Stack.stack_id == stack_id, models.Stack.user_id == current_user.id).first()
    if not stack_to_delete:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stack not found for this user.")
    
    db.delete(stack_to_delete)
    db.commit()
    return