# FILE: Backend1/models.py

from sqlalchemy import Column, Integer, String, Text, ForeignKey, Boolean, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

class Folder(Base):
    __tablename__ = "Folders"
    folder_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, nullable=False)
    folder_name = Column(String, nullable=False)
    creation_date = Column(DateTime(timezone=True), server_default=func.now())
    notes = relationship("Note", back_populates="folder")

class Note(Base):
    __tablename__ = "Notes"
    note_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, nullable=False)
    title = Column(String, default="Untitled Note")
    content = Column(Text, default="")
    creation_date = Column(DateTime(timezone=True), server_default=func.now())
    last_modified_date = Column(DateTime(timezone=True), onupdate=func.now())
    folder_id = Column(Integer, ForeignKey("Folders.folder_id", ondelete="SET NULL"))
    folder = relationship("Folder", back_populates="notes")

class Stack(Base):
    __tablename__ = "Stacks"
    stack_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, nullable=False)
    stack_name = Column(String, nullable=False)
    creation_date = Column(DateTime(timezone=True), server_default=func.now())
    is_default_stack = Column(Boolean, default=False)
    flashcards = relationship("Flashcard", cascade="all, delete-orphan")

class Flashcard(Base):
    __tablename__ = "Flashcards"
    flashcard_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, nullable=False)
    front_text = Column(Text, nullable=False)
    back_text = Column(Text)
    creation_date = Column(DateTime(timezone=True), server_default=func.now())
    stack_id = Column(Integer, ForeignKey("Stacks.stack_id", ondelete="CASCADE"), nullable=False)
    # Note: We are simplifying for now. The link to CollectedItems can be added back if needed.
    # collected_item_id = Column(Integer, ForeignKey("CollectedItems.item_id"))

# You would continue to define all other tables like CollectedItems, TranslationLogs etc. here


# In Backend1/models.py, add this class

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)

    # Add relationships to other tables if needed, e.g.:
    # notes = relationship("Note", back_populates="owner")