"""Regression tests for the framework-independent SUTRA intelligence pipeline."""

from __future__ import annotations

from app.analytics import FinancialAnalyticsService, GraphAnalyticsService, Transaction
from app.document_ai import DocumentIntelligencePipeline
from app.entity_resolution import EntityRecord, EntityResolutionService, ResolutionStatus
from app.graph import GraphEdge, GraphNode, KnowledgeGraph
from app.ingestion import IngestionService
from app.intelligence import (
    CrossCaseDiscoveryService,
    GraphDeltaService,
    GraphGroundedCopilot,
    GraphSnapshot,
)
from app.model_registry import AdapterFactory, ModelManifest, ModelRegistry


def test_ingestion_document_pipeline_and_provenance() -> None:
    ingestion = IngestionService().ingest(
        filename="cdr.csv",
        payload=b"Caller,Called,IMEI\n9876543210,9123456789,123456789012345\n",
        case_id="CASE-1",
    )
    assert ingestion.successful
    assert ingestion.rows[0].record_kind == "CALL_DETAIL_RECORD"

    analysis = DocumentIntelligencePipeline().analyze_text(
        document_id="DOC-1",
        source_record_id=ingestion.rows[0].source_record_id,
        case_id="CASE-1",
        text="Mr. Rahul Sharma uses phone +91 98765 43210.",
    )
    assert {(item.type, item.text) for item in analysis.entities} >= {
        ("PERSON", "Rahul Sharma"),
        ("PHONE", "+91 98765 43210"),
    }
    assert analysis.relations[0].predicate == "USES"
    assert analysis.entities[0].provenance is not None


def test_entity_resolution_never_auto_merges_names_alone() -> None:
    resolver = EntityResolutionService()
    name_only = resolver.resolve_pair(
        EntityRecord("P1", "PERSON", {"name": "Rahul Kumar Sharma"}),
        EntityRecord("P2", "PERSON", {"name": "Rahul Sharma"}),
    )
    assert name_only.status is not ResolutionStatus.AUTO_MATCHED
    assert not name_only.auto_match_eligible

    supported = resolver.resolve_pair(
        EntityRecord(
            "P3",
            "PERSON",
            {"name": "Rahul Kumar Sharma", "account_number": "001234567890", "date_of_birth": "1990-01-01"},
        ),
        EntityRecord(
            "P4",
            "PERSON",
            {"name": "Rahul Sharma", "account_number": "001234567890", "date_of_birth": "1990-01-01"},
        ),
    )
    assert supported.status is ResolutionStatus.AUTO_MATCHED
    assert any(feature.name == "same_account" and feature.value is True for feature in supported.features)


def _bridge_graph() -> KnowledgeGraph:
    graph = KnowledgeGraph()
    graph.add_nodes(
        [
            GraphNode("A", "PERSON", "A", case_ids=("CASE-1",)),
            GraphNode("B", "PERSON", "B", case_ids=("CASE-1",)),
            GraphNode("C", "DEVICE", "C", case_ids=("CASE-1", "CASE-2")),
            GraphNode("D", "PERSON", "D", case_ids=("CASE-2",)),
        ]
    )
    graph.add_edges(
        [
            GraphEdge("A", "B", "CONTACTED", case_id="CASE-1"),
            GraphEdge("B", "C", "SHARES_DEVICE_WITH", case_id="CASE-1"),
            GraphEdge("C", "D", "SHARES_DEVICE_WITH", case_id="CASE-2"),
        ]
    )
    return graph


def test_graph_analytics_bridge_cross_case_delta_and_copilot() -> None:
    graph = _bridge_graph()
    analytics = GraphAnalyticsService()
    bridges = analytics.bridge_entities(graph)
    assert {item.node_id for item in bridges} >= {"B", "C"}
    assert graph.shortest_path("A", "D") is not None

    related = CrossCaseDiscoveryService().discover_from_graph(graph)
    assert related and related[0].case_a == "CASE-1"

    previous = GraphSnapshot.capture(graph, snapshot_id="old")
    graph.add_node(GraphNode("E", "PHONE", "E", case_ids=("CASE-2",)))
    graph.add_edge(GraphEdge("D", "E", "USES", case_id="CASE-2"))
    current = GraphSnapshot.capture(graph, snapshot_id="new")
    assert "E" in GraphDeltaService().compare(previous, current).new_node_ids

    answer = GraphGroundedCopilot().answer("Why is C important?", graph, entity_id="C")
    assert "decision support" in answer.limitations[0]
    assert "centrality" in answer.answer


def test_financial_patterns_are_computed_from_transactions() -> None:
    at = "2026-01-01T00:00:00+00:00"
    transactions = [
        Transaction("T1", "A", "B", 1000, at),
        Transaction("T2", "B", "C", 900, "2026-01-01T01:00:00+00:00"),
        Transaction("T3", "C", "A", 800, "2026-01-01T02:00:00+00:00"),
        Transaction("T4", "D", "B", 10, "2026-01-01T03:00:00+00:00"),
        Transaction("T5", "E", "B", 10, "2026-01-01T03:00:00+00:00"),
    ]
    patterns = {item.pattern_name for item in FinancialAnalyticsService().analyze(transactions)}
    assert {"FAN_IN", "SHARED_BENEFICIARY", "RAPID_PASS_THROUGH", "CIRCULAR_FLOW"} <= patterns


def test_rule_model_registry_contract() -> None:
    manifest = ModelManifest.from_mapping(
        {
            "id": "rules_ner",
            "name": "Rule NER",
            "version": "1.0.0",
            "task": "ner",
            "framework": "rules",
            "entrypoint": "model",
            "languages": ["en"],
            "input_schema": "text",
            "output_schema": "sutra-ner-v1",
        }
    )
    registry = ModelRegistry()
    registry.register(AdapterFactory.create(manifest), sample_input="Mr. Rahul Sharma uses +91 98765 43210")
    output = registry.predict("ner", "Mr. Rahul Sharma uses +91 98765 43210")
    assert output["entities"] and output["entities"][0]["model_id"] == "rules_ner"
