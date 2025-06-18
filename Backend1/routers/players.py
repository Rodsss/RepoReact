from fastapi import APIRouter
from typing import List
from .. import schemas

router = APIRouter()

# In-memory "database" for demonstration
fake_players_db = [
    {"id": 1, "name": "Player 1", "position": "Forward"},
    {"id": 2, "name": "Player 2", "position": "Defender"},
]

@router.get("/players", response_model=List[schemas.Player])
async def get_players():
    return fake_players_db

@router.get("/players/{player_id}", response_model=schemas.Player)
async def get_player(player_id: int):
    for player in fake_players_db:
        if player["id"] == player_id:
            return player
    return {"error": "Player not found"}