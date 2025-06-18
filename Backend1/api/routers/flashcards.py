# FILE: src/Backend1/api/routers/flashcards.py

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

# --- CORRECTED IMPORTS ---
# Ensure that 'models' and 'schemas' are imported so they can be referenced
from Backend1 import models
from Backend1 import schemas
from Backend1.database import get_db
from Backend1.security import get_current_active_user

router = APIRouter(
    prefix="/flashcards",
    tags=["Flashcards"]
)

@router.post("/decks-from-items", response_model=schemas.StackResponseItem)
def create_deck_from_items(deck_data: schemas.DeckFromItemsCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    """
    Creates a new deck (as a Stack) and populates it with flashcards 
    from a list of items for the currently authenticated user.
    """
    # 1. Create the new deck/stack
    new_deck = models.Stack(
        stack_name=deck_data.deck_name,
        user_id=current_user.id
    )
    db.add(new_deck)
    db.commit()
    db.refresh(new_deck)

    # 2. Create flashcards for each item and associate with the new deck
    for item in deck_data.items:
        new_card = models.Flashcard(
            front_text=item.text,
            back_text="(edit this definition)",
            stack_id=new_deck.stack_id,  # Link to the new stack
            user_id=current_user.id
        )
        db.add(new_card)
    
    db.commit()
    
    return new_deck