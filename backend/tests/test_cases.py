"""Case workspace endpoint integration coverage."""

from fastapi.testclient import TestClient


def test_case_lifecycle_and_pagination(client: TestClient, auth_headers: dict[str, str]) -> None:
    create_response = client.post(
        "/api/cases",
        headers=auth_headers,
        json={
            "case_number": "fir-demo-001",
            "title": "Synthetic UPI fraud report",
            "description": "Fictional evidence for local demo testing.",
            "priority": "high",
            "metadata": {"source": "synthetic"},
        },
    )
    assert create_response.status_code == 201, create_response.text
    created = create_response.json()
    assert created["case_number"] == "FIR-DEMO-001"
    assert created["status"] == "open"
    assert created["metadata"] == {"source": "synthetic"}

    list_response = client.get("/api/cases?search=upi", headers=auth_headers)
    assert list_response.status_code == 200
    listing = list_response.json()
    assert listing["total"] == 1
    assert listing["items"][0]["id"] == created["id"]

    update_response = client.patch(
        f"/api/cases/{created['id']}",
        headers=auth_headers,
        json={"status": "under_review", "metadata": {"source": "synthetic", "reviewed": True}},
    )
    assert update_response.status_code == 200
    updated = update_response.json()
    assert updated["status"] == "under_review"
    assert updated["metadata"]["reviewed"] is True

    read_response = client.get(f"/api/cases/{created['id']}", headers=auth_headers)
    assert read_response.status_code == 200
    assert read_response.json()["case_number"] == "FIR-DEMO-001"


def test_case_routes_require_auth_and_reject_duplicate_numbers(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    unauthenticated = client.get("/api/cases")
    assert unauthenticated.status_code == 401
    assert unauthenticated.json()["error"]["code"] == "AUTHENTICATION_REQUIRED"

    payload = {"case_number": "CASE-UNIQUE-001", "title": "A valid synthetic case"}
    assert client.post("/api/cases", headers=auth_headers, json=payload).status_code == 201
    duplicate = client.post("/api/cases", headers=auth_headers, json=payload)
    assert duplicate.status_code == 409
    assert duplicate.json()["error"]["code"] == "CASE_NUMBER_EXISTS"

