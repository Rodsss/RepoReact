# FILE: tests/conftest.py (Corrected for Cleanup)

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os

from Backend1.main import app
from Backend1.database import Base, get_db

# --- Test Database Setup ---
TEST_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    TEST_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# --- Pytest Fixtures ---

@pytest.fixture(scope="function")
def db_session():
    # Create the database tables for each test
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        # Drop all tables after each test to ensure isolation
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def test_client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            db_session.close()

    app.dependency_overrides[get_db] = override_get_db
    
    with TestClient(app) as client:
        yield client
    
    del app.dependency_overrides[get_db]

@pytest.fixture(scope="function")
def authenticated_client(test_client):
    """
    Creates a user, logs them in, and yields a TestClient instance
    with the authentication token already set in the headers.
    """
    # Create a user
    user_data = {"email": "testuser@example.com", "password": "testpassword"}
    test_client.post("/users/", json=user_data)

    # Log the user in to get a token
    login_response = test_client.post("/token", data={
        "username": user_data["email"],
        "password": user_data["password"]
    })
    token = login_response.json()["access_token"]

    # Set the authentication header for the client
    test_client.headers["Authorization"] = f"Bearer {token}"

    yield test_client