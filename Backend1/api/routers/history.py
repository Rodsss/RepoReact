from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from Backend1 import models, schemas, security
from Backend1.database import get_db
from Backend1.security import get_current_active_user

router = APIRouter(
    prefix="/history",
    tags=["History"]
)

@router.post("/log", response_model=schemas.GenericSuccessResponse)
def log_history_item(item: schemas.TextItemCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    """
    Logs a collected item to the user's history.
    This would typically save to a 'CollectedItems' table.
    """
    # This is a simplified example. You would save the item to your database here.
    # For example, creating a new models.CollectedItem
    print(f"User {current_user.email} logged history item: '{item.text}'")
    
    return {"success": True, "message": "Item logged to history."}