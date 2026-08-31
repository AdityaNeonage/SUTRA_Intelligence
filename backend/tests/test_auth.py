"""Authentication integration coverage."""

from fastapi.testclient import TestClient


def test_demo_user_can_log_in_and_read_identity(client: TestClient) -> None:
    login_response = client.post(
        "/api/auth/login",
        json={"email": "ADMIN@SUTRA.LOCAL", "password": "sutra-demo-2026"},
    )

    assert login_response.status_code == 200
    payload = login_response.json()
    assert payload["token_type"] == "bearer"
    assert payload["expires_in"] > 0
    assert payload["user"]["email"] == "admin@sutra.local"
    assert payload["user"]["role"] == "administrator"

    identity_response = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {payload['access_token']}"},
    )
    assert identity_response.status_code == 200
    assert identity_response.json()["id"] == payload["user"]["id"]


def test_invalid_login_and_missing_token_use_structured_errors(client: TestClient) -> None:
    invalid_login = client.post(
        "/api/auth/login",
        json={"email": "admin@sutra.local", "password": "wrong-password"},
    )
    assert invalid_login.status_code == 401
    assert invalid_login.json()["error"]["code"] == "INVALID_CREDENTIALS"

    missing_token = client.get("/api/auth/me")
    assert missing_token.status_code == 401
    assert missing_token.json()["error"]["code"] == "AUTHENTICATION_REQUIRED"

