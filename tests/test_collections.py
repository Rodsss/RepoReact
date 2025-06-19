# FILE: tests/test_collections.py

from fastapi.testclient import TestClient

# Test for success when unauthenticated (should fail)
def test_get_stacks_unauthenticated(test_client: TestClient):
    """
    Tests that an unauthenticated user receives a 401 Unauthorized error.
    """
    response = test_client.get("/collections/stacks")
    assert response.status_code == 401 # Expect "Unauthorized"

# Test for success when authenticated
def test_get_stacks_authenticated_success(authenticated_client: TestClient):
    """
    Tests that a logged-in user can successfully fetch their (empty) stacks.
    """
    response = authenticated_client.get("/collections/stacks")
    assert response.status_code == 200
    assert response.json() == [] # Expect an empty list for a new user

def test_create_stack_success(authenticated_client: TestClient):
    """
    Tests that a logged-in user can successfully create a new stack.
    """
    response = authenticated_client.post("/collections/stacks", json={
        "stack_name": "My First Collection"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["stack_name"] == "My First Collection"
    assert "stack_id" in data

    # Verify the stack was actually created
    get_response = authenticated_client.get("/collections/stacks")
    assert len(get_response.json()) == 1
    assert get_response.json()[0]["stack_name"] == "My First Collection"