"""Case-bound intake, real document parsers, provenance and failure regression tests."""
from io import BytesIO

import pytest
from docx import Document
from pypdf import PdfWriter
from pypdf.generic import DecodedStreamObject, DictionaryObject, NameObject


def create_case(client, headers, number):
    response = client.post("/api/cases", headers=headers, json={"case_number": number, "title": "Synthetic intake test"})
    assert response.status_code == 201, response.text
    return response.json()["id"]


def upload(client, headers, case_id, filename, payload, source_type=None):
    params = {"case_id": case_id}
    if source_type:
        params["source_type"] = source_type
    return client.post("/api/ingestion/upload", headers=headers, params=params, files={"file": (filename, payload)})


def test_failed_file_does_not_block_later_case_upload_and_stored_counts(client, auth_headers):
    case_id = create_case(client, auth_headers, "INTAKE-001")
    other_case = create_case(client, auth_headers, "INTAKE-OTHER")
    assert upload(client, auth_headers, case_id, "broken.json", b"{bad").status_code == 422
    good = upload(client, auth_headers, case_id, "transfers.csv",
                  b"txn_id,src_account,dst_account,amount,timestamp\nT1,ACC-A,ACC-B,100,2026-08-12T10:00:00Z\nT2,ACC-B,ACC-C,90,2026-08-12T11:00:00Z\n",
                  "BANK_RECORD")
    assert good.status_code == 200, good.text
    receipt = good.json()
    assert len(receipt["document_ids"]) == 2
    batches = client.get("/api/ingestion", headers=auth_headers, params={"case_id": case_id}).json()["items"]
    batch = next(item for item in batches if item["id"] == receipt["ingestion_id"])
    assert batch["case_id"] == case_id
    assert batch["document_count"] == 2
    assert batch["source_type"] == "BANK_RECORD"
    assert len(batch["file_hash"]) == 64
    assert any(item["status"] == "failed" for item in batches)
    docs = client.get("/api/documents", headers=auth_headers, params={"case_id": case_id, "ingestion_id": receipt["ingestion_id"]}).json()["items"]
    assert {item["id"] for item in docs} == set(receipt["document_ids"])
    assert client.get("/api/documents", headers=auth_headers, params={"case_id": other_case}).json()["items"] == []
    detail = client.get("/api/documents/" + docs[0]["id"], headers=auth_headers).json()
    assert "ACC-" in detail["raw_text"]
    answer = client.post("/api/copilot/query", headers=auth_headers, json={"case_id": case_id, "question": "Show the path between ACC-A and ACC-C."})
    assert answer.status_code == 200, answer.text
    assert len(answer.json()["edge_ids"]) == 2
    assert answer.json()["limitations"]
    assert {item["evidence"]["document_id"] for item in answer.json()["evidence"]} <= set(receipt["document_ids"])
    audit = client.get("/api/audit", headers=auth_headers, params={"case_id": case_id}).json()["items"]
    assert {"ingestion_started", "ingestion_completed", "ingestion_failed", "copilot_query"} <= {item["action"] for item in audit}


@pytest.mark.parametrize("filename,payload,expected", [
    ("unsupported.xlsx", b"not-an-excel-file", 415),
    ("empty.txt", b"", 422),
])
def test_rejected_uploads_do_not_report_success(client, auth_headers, filename, payload, expected):
    case_id = create_case(client, auth_headers, "REJECT-001")
    response = upload(client, auth_headers, case_id, filename, payload)
    assert response.status_code == expected, response.text
    assert client.get("/api/ingestion", headers=auth_headers, params={"case_id": case_id}).json()["items"] == []


def document_bytes(extension):
    text = "Mr. Rahul Sharma uses phone +91 98765 43210."
    if extension == "docx":
        document = Document()
        document.add_paragraph(text)
        stream = BytesIO()
        document.save(stream)
        return stream.getvalue()
    if extension == "pdf":
        writer = PdfWriter()
        page = writer.add_blank_page(width=400, height=200)
        font = DictionaryObject({NameObject("/Type"): NameObject("/Font"), NameObject("/Subtype"): NameObject("/Type1"), NameObject("/BaseFont"): NameObject("/Helvetica")})
        page[NameObject("/Resources")] = DictionaryObject({NameObject("/Font"): DictionaryObject({NameObject("/F1"): font})})
        content = DecodedStreamObject()
        content.set_data(("BT /F1 12 Tf 20 150 Td (" + text + ") Tj ET").encode())
        page[NameObject("/Contents")] = writer._add_object(content)
        stream = BytesIO()
        writer.write(stream)
        return stream.getvalue()
    if extension == "json":
        return b'[{"text":"Mr. Rahul Sharma uses phone +91 98765 43210."}]'
    return text.encode()


@pytest.mark.parametrize("extension", ["txt", "md", "json", "pdf", "docx"])
def test_supported_documents_are_really_extracted(client, auth_headers, extension):
    case_id = create_case(client, auth_headers, "FORMAT-001")
    response = upload(client, auth_headers, case_id, "statement." + extension, document_bytes(extension), "FIELD_REPORT")
    assert response.status_code == 200, response.text
    assert response.json()["document_ids"]
    document = client.get("/api/documents/" + response.json()["document_ids"][0], headers=auth_headers).json()
    assert "Rahul" in document["raw_text"]
    assert document["case_id"] == case_id


def test_intake_and_copilot_require_login(client):
    assert client.post("/api/ingestion/upload", files={"file": ("note.txt", b"test")}).status_code == 401
    assert client.post("/api/copilot/query", json={"question": "Why is Rahul important?"}).status_code == 401
