"""Liveness and dependency-status integration coverage."""

from fastapi.testclient import TestClient


def test_liveness_endpoints(client: TestClient) -> None:
    root = client.get("/health")
    api = client.get("/api/health")

    assert root.status_code == 200
    assert api.status_code == 200
    assert root.json()["status"] == "ok"
    assert api.json()["service"] == "sutra-api"


def test_system_health_reports_real_local_dependencies(client: TestClient) -> None:
    response = client.get("/api/system/health")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "healthy"
    services = {service["name"]: service for service in payload["services"]}
    assert services["database"]["status"] == "online"
    assert services["database"]["details"]["backend"] == "sqlite"
    assert services["file_storage"]["status"] == "online"
    assert services["neo4j"]["status"] == "not_configured"

