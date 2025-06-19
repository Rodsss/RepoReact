# FILE: check_imports.py

import sys
import os

# This ensures the project root is on the path, similar to what pytest.ini should do
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

print("Attempting to import application components...")

try:
    from Backend1.main import app
    from Backend1.api.routers import collections, auth, notes
    from Backend1.schemas import StackResponseItem, NoteItem, User
    from Backend1.models import Stack, Note

    print("\n==============================================")
    print("SUCCESS: All modules imported correctly.")
    print("This means the project structure and Python's path are OK.")
    print("The issue is likely with pytest's specific configuration.")
    print("==============================================")

except ImportError as e:
    print("\n==============================================")
    print(f"IMPORT FAILED: {e}")
    print("This means there is a fundamental issue with the project structure or Python's path.")
    print("==============================================")
except Exception as e:
    print(f"\nAN UNEXPECTED ERROR OCCURRED: {e}")