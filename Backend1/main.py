# FILE: src/Backend1/main.py (Final Modularized Version)

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.templating import Jinja2Templates
from starlette.staticfiles import StaticFiles
import os

# Import all routers from their new locations
from Backend1.api.routers import collections, auth, notes, flashcards, media_search, translation

# Import database and models for initial table creation
from Backend1.database import Base, engine
from Backend1 import models

# This line tells SQLAlchemy to create all tables defined in models.py
# that inherit from Base. This replaces your old create_tables_if_not_exist() function.
models.Base.metadata.create_all(bind=engine)

# --- Path Configuration ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Paths are relative to this file's location inside 'src'
static_path = os.path.join(BASE_DIR, "../Frontend1/static")
templates_path = os.path.join(BASE_DIR, "../Frontend1/templates")


# --- FastAPI App Instance ---
app = FastAPI(
    title="1Project API & Web App",
    description="A modular and secure API for the 1Project application.",
    version="1.1.0"
)

# --- Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to your frontend's domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Static Files and Templates ---
app.mount("/static", StaticFiles(directory=static_path), name="static")
templates = Jinja2Templates(directory=templates_path)

# --- Include All Routers ---
# The application now delegates all API routes to these router files.
app.include_router(auth.router)
app.include_router(collections.router)
app.include_router(notes.router)
app.include_router(flashcards.router)
app.include_router(media_search.router)
app.include_router(translation.router)

# --- HTML Page-Serving Endpoint ---
@app.get("/", response_class=HTMLResponse)
async def home_page(request: Request):
    """
    Serves the main single-page application.
    """
    return templates.TemplateResponse("home.html", {"request": request})