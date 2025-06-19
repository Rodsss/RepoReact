from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from typing import List

# --- CORRECTED IMPORTS ---
from Backend1 import models
from Backend1 import schemas
from Backend1.database import get_db
# Assuming security is handled by a higher-level dependency or is not yet implemented for these specific routes
# from Backend1.security import get_current_active_user

router = APIRouter(
    prefix="/api/v1",  # Set prefix to match frontend API calls
    tags=["Collections & Stacks"]
)

@router.get("/users/{user_id}/stacks", response_model=List[schemas.StackResponseItem])
def get_user_stacks(user_id: str, db: Session = Depends(get_db)):
    """
    Gets all stacks for a given user.
    """
    # Note: In a real app, you'd verify the user_id against the authenticated user.
    stacks = db.query(models.Stack).filter(models.Stack.user_id == user_id).order_by(models.Stack.creation_date.desc()).all()
    return stacks

@router.post("/stacks", response_model=schemas.StackResponseItem)
def create_user_stack(stack: schemas.StackCreate, db: Session = Depends(get_db)):
    """
    Creates a new stack for the user.
    """
    # Corrected creation logic using the provided schema
    db_stack = models.Stack(**stack.model_dump(), user_id="default-user") # Using placeholder user
    db.add(db_stack)
    db.commit()
    db.refresh(db_stack)
    return db_stack

@router.post("/stacks/{stack_id}/items", response_model=schemas.GenericSuccessResponse)
def add_item_to_stack(stack_id: int, item: schemas.TextItemCreate, db: Session = Depends(get_db)):
    """
    Adds a collected text item to a specific stack.
    This creates a CollectedItem and a linking Flashcard.
    """
    # Verify stack exists for the user
    stack = db.query(models.Stack).filter(models.Stack.stack_id == stack_id, models.Stack.user_id == "default-user").first()
    if not stack:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stack not found.")

    # Create the base CollectedItem
    db_item = models.CollectedItem(
        user_id="default-user",
        selected_text=item.text,
        source_url=item.source_url,
        page_title=item.page_title
    )
    db.add(db_item)
    db.flush() # Use flush to get the item_id before committing fully

    # Create the Flashcard that links the item to the stack
    db_flashcard = models.Flashcard(
        user_id="default-user",
        collected_item_id=db_item.item_id,
        stack_id=stack_id,
        front_text=item.text
    )
    db.add(db_flashcard)
    db.commit()
    
    return schemas.GenericSuccessResponse(success=True, message="Item added to stack successfully.")


# --- The following are other useful endpoints from your original file, kept for completeness ---

@router.get("/stacks/{stack_id}/flashcards", response_model=List[schemas.FlashcardItem])
def get_flashcards_in_stack(stack_id: int, db: Session = Depends(get_db)):
    """
    Gets all flashcards from a specific stack.
    """
    stack = db.query(models.Stack).filter(models.Stack.stack_id == stack_id, models.Stack.user_id == "default-user").first()
    if not stack:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stack not found for this user.")
    
    flashcards = db.query(models.Flashcard).filter(models.Flashcard.stack_id == stack_id).order_by(models.Flashcard.creation_date.desc()).all()
    return flashcards
    
@router.delete("/stacks/{stack_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_stack(stack_id: int, db: Session = Depends(get_db)):
    """
    Deletes a stack owned by the user.
    """
    stack_to_delete = db.query(models.Stack).filter(models.Stack.stack_id == stack_id, models.Stack.user_id == "default-user").first()
    if not stack_to_delete:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stack not found for this user.")
    
    db.delete(stack_to_delete)
    db.commit()
    return