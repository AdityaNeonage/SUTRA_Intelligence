"""Shared isolated FastAPI test application fixture."""

from __future__ import annotations

from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app


@pytest.fixture
def app(tmp_path):
    database_path = tmp_path / "sutra-test.db"
    settings = Settings(
        environment="test",
        database_url=f"sqlite:///{database_path.as_posix()}",
        storage_path=tmp_path / "storage",
        model_registry_path=tmp_path / "models" / "registered",
        jwt_secret="test-secret-not-for-production-which-is-long-enough",
        demo_user_password="sutra-demo-2026",
    )
    return create_app(settings)


@pytest.fixture
def client(app) -> Generator[TestClient, None, None]:
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def auth_headers(client: TestClient) -> dict[str, str]:
    response = client.post(
        "/api/auth/login",
        json={"email": "admin@sutra.local", "password": "sutra-demo-2026"},
    )
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}
