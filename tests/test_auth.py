# FILE: Backend1/tests/test_auth.py

from fastapi.testclient import TestClient

def test_create_user_success(test_client: TestClient):
    """
    Tests that a new user can be created successfully.
    """
    response = test_client.post("/users/", json={
        "email": "testuser@example.com",
        "password": "testpassword"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "testuser@example.com"
    assert "id" in data
    assert "hashed_password" not in data # Ensure password is not returned

def test_create_existing_user_fails(test_client: TestClient):
    """
    Tests that creating a user with an existing email fails.
    """
    # First, create the user
    test_client.post("/users/", json={"email": "test@example.com", "password": "password123"})
    
    # Then, try to create it again
    response = test_client.post("/users/", json={"email": "test@example.com", "password": "password123"})
    
    assert response.status_code == 400
    assert response.json() == {"detail": "Email already registered"}

def test_login_success(test_client: TestClient):
    """
    Tests that a registered user can log in successfully and get a token.
    """
    # 1. Create a user to log in with
    user_email = "logintest@example.com"
    user_password = "a-secure-password"
    test_client.post("/users/", json={"email": user_email, "password": user_password})

    # 2. Attempt to log in
    response = test_client.post("/token", data={
        "username": user_email,
        "password": user_password
    })

    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

def test_login_wrong_password_fails(test_client: TestClient):
    """
    Tests that logging in with an incorrect password fails.
    """
    user_email = "wrongpass@example.com"
    user_password = "correctpassword"
    test_client.post("/users/", json={"email": user_email, "password": user_password})

    response = test_client.post("/token", data={
        "username": user_email,
        "password": "incorrectpassword"
    })

    assert response.status_code == 401
    assert response.json() == {"detail": "Incorrect email or password"}