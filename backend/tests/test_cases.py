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


def test_administrator_can_seed_and_query_synthetic_intelligence(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    seeded = client.post("/api/demo/seed", headers=auth_headers)
    assert seeded.status_code == 200, seeded.text
    payload = seeded.json()
    assert len(payload["cases"]) == 5
    assert payload["entity_count"] > 0

    cases = client.get("/api/cases", headers=auth_headers).json()["items"]
    target_case = next(item for item in cases if item["case_number"].startswith("SUTRA-"))
    graph = client.get(
        "/api/graph/neighborhood",
        headers=auth_headers,
        params={"case_id": target_case["id"], "depth": 2},
    )
    assert graph.status_code == 200, graph.text
    assert graph.json()["nodes"]


def test_money_mule_csv_upload_populates_graph_and_document_store(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    created_case = client.post(
        "/api/cases",
        headers=auth_headers,
        json={"case_number": "MULE-DATA-001", "title": "Synthetic mule-ring import"},
    ).json()
    case_id = created_case["id"]

    accounts = (
        "account_id,role,opened_date,country\n"
        "ACC0121,fraud_source,2024-04-27,US\n"
        "ACC0126,fraud_mule,2024-12-08,PH\n"
        "ACC0149,fraud_collector,2025-03-04,US\n"
    )
    transactions = (
        "txn_id,src_account,dst_account,amount,timestamp,is_fraud\n"
        "TXN00521,ACC0121,ACC0126,2115.71,2025-01-10 22:52,1\n"
        "TXN00522,ACC0126,ACC0149,2061.36,2025-01-12 05:36,1\n"
    )
    for filename, payload in (("accounts.csv", accounts), ("transactions.csv", transactions)):
        response = client.post(
            "/api/ingestion/upload",
            headers=auth_headers,
            params={"case_id": case_id},
            files={"file": (filename, payload, "text/csv")},
        )
        assert response.status_code == 200, response.text
        assert response.json()["status"] == "completed"

    graph = client.get(
        "/api/graph/neighborhood",
        headers=auth_headers,
        params={"case_id": case_id, "depth": 2},
    )
    assert graph.status_code == 200, graph.text
    graph_payload = graph.json()
    assert {node["label"] for node in graph_payload["nodes"]} == {"ACC0121", "ACC0126", "ACC0149"}
    assert [edge["relationship"] for edge in graph_payload["edges"]] == ["TRANSFERRED_TO", "TRANSFERRED_TO"]
    assert all(edge["attributes"]["is_fraud"] is True for edge in graph_payload["edges"])

    stored = client.get("/api/documents", headers=auth_headers, params={"case_id": case_id})
    assert stored.status_code == 200, stored.text
    assert len(stored.json()["items"]) == 5
    assert any("TXN00521" in item["raw_preview"] for item in stored.json()["items"])
