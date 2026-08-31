import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Crosshair,
  Expand,
  GitFork,
  Maximize2,
  Network,
  RotateCcw,
  Route,
  ScanSearch,
  X,
} from "lucide-react";
import { NetworkGraph, type NetworkGraphHandle } from "../components/NetworkGraph";
import type { GraphEdge, GraphNode } from "../types/api";
import { EntityInspectorDrawer } from "../features/network/EntityInspectorDrawer";
import { NetworkControls, toggleArrayItem } from "../features/network/NetworkControls";
import {
  createInitialMockNetwork,
  expandNetworkConnections,
} from "../features/network/mockNetworkData";
import {
  ENTITY_TYPES,
  ENTITY_TYPE_LABELS,
  EVIDENCE_VERIFICATION_STATUSES,
  RELATIONSHIP_TYPES,
  type MockNetworkData,
  type MockNetworkEdge,
  type MockNetworkNode,
  type NetworkEntityType,
  type NetworkPath,
  type NetworkRelationshipType,
} from "../features/network/networkTypes";
import {
  filterNetwork,
  findShortestPath,
  getConnectedNodeIds,
  getEvidenceCount,
} from "../features/network/networkUtils";
import "../features/network/network.css";

interface GraphUpdateDetail {
  nodes?: GraphNode[];
  edges?: GraphEdge[];
}

interface GraphFocusDetail {
  entityIds?: string[];
}

const GRAPH_FOCUS_STORAGE_KEY = "sutra.graph-focus";
const GRAPH_UPDATE_STORAGE_KEY = "sutra.graph-update";

function useReducedMotionPreference() {
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return reducedMotion;
}

function normalizeEntityType(value: string): NetworkEntityType {
  const upper = value.trim().toUpperCase().replace(/[\s-]+/g, "_");
  return ENTITY_TYPES.includes(upper as NetworkEntityType) ? upper as NetworkEntityType : "DOCUMENT";
}

function normalizeRelationshipType(edge: GraphEdge): NetworkRelationshipType {
  const rawType = typeof edge.raw?.relationship_type === "string" ? edge.raw.relationship_type : edge.label;
  const upper = String(rawType ?? "").trim().toUpperCase().replace(/[\s-]+/g, "_");
  return RELATIONSHIP_TYPES.includes(upper as NetworkRelationshipType) ? upper as NetworkRelationshipType : "ASSOCIATED_WITH";
}

function normalizeIncomingNode(node: GraphNode): MockNetworkNode {
  const candidate = node as Partial<MockNetworkNode>;
  const observedAt = typeof node.raw?.timestamp === "string" ? node.raw.timestamp : new Date().toISOString();
  return {
    ...node,
    entityType: normalizeEntityType(node.entityType),
    caseIds: Array.isArray(node.caseIds) ? node.caseIds : [],
    aliases: Array.isArray(candidate.aliases) ? candidate.aliases : [],
    summary: typeof candidate.summary === "string" && candidate.summary ? candidate.summary : `Synthetic assistant-derived entity: ${node.label}.`,
    details: candidate.details && typeof candidate.details === "object" ? candidate.details : {},
    evidenceRecords: Array.isArray(candidate.evidenceRecords) ? candidate.evidenceRecords : [],
    firstSeen: typeof candidate.firstSeen === "string" ? candidate.firstSeen : observedAt,
    lastSeen: typeof candidate.lastSeen === "string" ? candidate.lastSeen : observedAt,
    raw: node.raw ?? {},
  };
}

function normalizeIncomingEdge(edge: GraphEdge): MockNetworkEdge {
  const candidate = edge as Partial<MockNetworkEdge>;
  const evidenceStatus = EVIDENCE_VERIFICATION_STATUSES.includes(edge.evidenceStatus as MockNetworkEdge["evidenceStatus"])
    ? edge.evidenceStatus as MockNetworkEdge["evidenceStatus"]
    : "INFERRED";
  return {
    ...edge,
    label: edge.label || "associated with",
    relationshipType: normalizeRelationshipType(edge),
    evidenceStatus,
    evidence: Array.isArray(edge.evidence) ? edge.evidence : [],
    evidenceRecords: Array.isArray(candidate.evidenceRecords) ? candidate.evidenceRecords : [],
    caseId: typeof candidate.caseId === "string" ? candidate.caseId : "case-104",
    derivation: typeof candidate.derivation === "string" && candidate.derivation ? candidate.derivation : "Synthetic assistant graph update.",
    raw: edge.raw ?? {},
  };
}

function mergeMockGraph(current: MockNetworkData, detail: GraphUpdateDetail): MockNetworkData {
  const nodesById = new Map(current.nodes.map((node) => [node.id, node]));
  (detail.nodes ?? []).forEach((node) => {
    if (node?.id) nodesById.set(node.id, normalizeIncomingNode(node));
  });
  const nodeIds = new Set(nodesById.keys());
  const edgesById = new Map(current.edges.map((edge) => [edge.id, edge]));
  (detail.edges ?? []).forEach((edge) => {
    if (edge?.id && nodeIds.has(edge.source) && nodeIds.has(edge.target)) edgesById.set(edge.id, normalizeIncomingEdge(edge));
  });
  return { ...current, nodes: [...nodesById.values()], edges: [...edgesById.values()] };
}

function nodeMatchesQuery(node: MockNetworkNode, rawQuery: string) {
  const query = rawQuery.trim().toLocaleLowerCase();
  if (!query) return false;
  return [node.id, node.label, node.entityType, node.summary, ...node.aliases, ...Object.values(node.details)]
    .join(" ")
    .toLocaleLowerCase()
    .includes(query);
}

function safeReadGraphFocus() {
  try {
    const value = window.sessionStorage.getItem(GRAPH_FOCUS_STORAGE_KEY);
    if (!value) return [] as string[];
    const parsed = JSON.parse(value) as GraphFocusDetail;
    return Array.isArray(parsed.entityIds) ? parsed.entityIds.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [] as string[];
  }
}

function safeWriteGraphFocus(entityIds: string[]) {
  try {
    window.sessionStorage.setItem(GRAPH_FOCUS_STORAGE_KEY, JSON.stringify({ entityIds }));
  } catch {
    // Session storage is an enhancement only; the network remains functional without it.
  }
}

function safeClearGraphFocus() {
  try {
    window.sessionStorage.removeItem(GRAPH_FOCUS_STORAGE_KEY);
  } catch {
    // Session storage is an enhancement only.
  }
}

function safeReadGraphUpdate(): GraphUpdateDetail | undefined {
  try {
    const value = window.sessionStorage.getItem(GRAPH_UPDATE_STORAGE_KEY);
    if (!value) return undefined;
    const parsed = JSON.parse(value) as GraphUpdateDetail;
    if (!Array.isArray(parsed.nodes) && !Array.isArray(parsed.edges)) return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}

export function NetworkExplorerPage({ token: _token, caseId }: { token?: string; caseId?: string }) {
  void _token;
  const initialNetworkRef = useRef<MockNetworkData>(createInitialMockNetwork());
  const graphRef = useRef<NetworkGraphHandle | null>(null);
  const focusTimersRef = useRef<number[]>([]);
  const [network, setNetwork] = useState<MockNetworkData>(initialNetworkRef.current);
  const [query, setQuery] = useState("");
  const [entityTypes, setEntityTypes] = useState<NetworkEntityType[]>([]);
  const [relationshipTypes, setRelationshipTypes] = useState<NetworkRelationshipType[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string>();
  const [selectedEdgeId, setSelectedEdgeId] = useState<string>();
  const [hoveredNodeId, setHoveredNodeId] = useState<string>();
  const [pathMode, setPathMode] = useState(false);
  const [pathStartId, setPathStartId] = useState<string>();
  const [pathEndId, setPathEndId] = useState<string>();
  const [pathResult, setPathResult] = useState<NetworkPath | null>(null);
  const [pathStep, setPathStep] = useState(0);
  const [revealNodeIds, setRevealNodeIds] = useState<string[]>(initialNetworkRef.current.nodes.map((node) => node.id));
  const [animationKey, setAnimationKey] = useState(1);
  const [toast, setToast] = useState<string>();
  const reducedMotion = useReducedMotionPreference();
  const networkStateRef = useRef(network);

  useEffect(() => {
    networkStateRef.current = network;
  }, [network]);

  const visibleNetwork = useMemo(
    () => filterNetwork(network, { entityTypes, relationshipTypes }),
    [entityTypes, network, relationshipTypes],
  );
  const searchMatchNodeIds = useMemo(
    () => visibleNetwork.nodes.filter((node) => nodeMatchesQuery(node, query)).map((node) => node.id),
    [query, visibleNetwork.nodes],
  );
  const selectedNode = useMemo(() => network.nodes.find((node) => node.id === selectedNodeId), [network.nodes, selectedNodeId]);
  const selectedEdge = useMemo(() => network.edges.find((edge) => edge.id === selectedEdgeId), [network.edges, selectedEdgeId]);
  const visiblePathNodeIds = pathResult ? pathResult.nodeIds.slice(0, Math.max(pathStep, 1)) : [];
  const visiblePathEdgeIds = pathResult ? pathResult.edgeIds.slice(0, Math.max(pathStep - 1, 0)) : [];
  const focusNodeId = hoveredNodeId ?? selectedNodeId;
  const emphasisNodeIds = useMemo(() => {
    if (pathResult) return visiblePathNodeIds;
    if (selectedEdge) return [selectedEdge.source, selectedEdge.target];
    if (!focusNodeId) return [];
    return [focusNodeId, ...getConnectedNodeIds(focusNodeId, network.edges)];
  }, [focusNodeId, network.edges, pathResult, selectedEdge, visiblePathNodeIds]);
  const expansionAvailable = !network.nodes.some((node) => node.isExpansionNode);
  const currentCaseLabel = caseId ? `${network.caseLabel} · scoped request ${caseId}` : network.caseLabel;

  const notify = useCallback((message: string) => {
    setToast(message);
  }, []);

  const focusEntity = useCallback((entityId: string) => {
    setSelectedNodeId(entityId);
    setSelectedEdgeId(undefined);
    setHoveredNodeId(undefined);
    focusTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    const timer = window.setTimeout(() => graphRef.current?.centerNode(entityId), 40);
    focusTimersRef.current = [timer];
  }, []);

  const runSearch = useCallback(() => {
    if (!query.trim()) {
      notify("Enter an entity, alias, identifier, or evidence term to search this synthetic graph.");
      return;
    }
    const firstMatch = searchMatchNodeIds[0];
    if (!firstMatch) {
      notify("No visible synthetic entity matched that search. Clear filters or try another term.");
      return;
    }
    focusEntity(firstMatch);
    notify(`${searchMatchNodeIds.length} matching ${searchMatchNodeIds.length === 1 ? "entity" : "entities"}; centered the first result.`);
  }, [focusEntity, notify, query, searchMatchNodeIds]);

  const closeDrawer = useCallback(() => {
    setSelectedNodeId(undefined);
    setSelectedEdgeId(undefined);
    setHoveredNodeId(undefined);
  }, []);

  const handleNodeSelect = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
    setSelectedEdgeId(undefined);
    setHoveredNodeId(undefined);
    if (!pathMode) return;
    if (!pathStartId || pathEndId) {
      setPathStartId(nodeId);
      setPathEndId(undefined);
      setPathResult(null);
      setPathStep(0);
      notify("Connection source selected. Choose a second entity for the shortest path.");
      return;
    }
    if (pathStartId === nodeId) {
      notify("Choose a different second entity to compare the connection.");
      return;
    }
    setPathEndId(nodeId);
  }, [notify, pathEndId, pathMode, pathStartId]);

  const handleEdgeSelect = useCallback((edgeId: string) => {
    const edge = network.edges.find((item) => item.id === edgeId);
    setSelectedEdgeId(edgeId || undefined);
    if (edge) setSelectedNodeId(edge.source);
  }, [network.edges]);

  const expandConnections = useCallback(() => {
    const expansion = expandNetworkConnections(network);
    if (expansion.addedNodeIds.length === 0) {
      notify("All bounded mock secondary connections are already visible.");
      return;
    }
    setNetwork((current) => ({ ...current, nodes: expansion.nodes, edges: expansion.edges }));
    setRevealNodeIds(expansion.addedNodeIds);
    setAnimationKey((current) => current + 1);
    notify(`${expansion.addedNodeIds.length} secondary entities and ${expansion.addedEdgeIds.length} relationships expanded from mock evidence.`);
  }, [network, notify]);

  const resetGraph = useCallback(() => {
    setSelectedNodeId(undefined);
    setSelectedEdgeId(undefined);
    setHoveredNodeId(undefined);
    setPathMode(false);
    setPathStartId(undefined);
    setPathEndId(undefined);
    setPathResult(null);
    setPathStep(0);
    graphRef.current?.reset();
    notify("Graph focus and connection-path highlights were reset.");
  }, [notify]);

  const togglePathMode = useCallback(() => {
    setPathMode((active) => {
      const next = !active;
      if (next) notify("Find Connection enabled. Select entity A, then entity B in the graph or controls below.");
      return next;
    });
    setPathStartId(undefined);
    setPathEndId(undefined);
    setPathResult(null);
    setPathStep(0);
  }, [notify]);

  const loadFourHopDemo = useCallback(() => {
    const expansion = expandNetworkConnections(network);
    if (expansion.addedNodeIds.length > 0) {
      setNetwork((current) => ({ ...current, nodes: expansion.nodes, edges: expansion.edges }));
      setRevealNodeIds(expansion.addedNodeIds);
      setAnimationKey((current) => current + 1);
    }
    setPathMode(true);
    setPathStartId("case-087");
    setPathEndId("location-howrah-yard");
    setSelectedNodeId("case-087");
    setSelectedEdgeId(undefined);
    setPathResult(null);
    setPathStep(0);
    notify("Loaded the synthetic four-hop CASE-087 to Howrah Yard evidence path.");
  }, [network, notify]);

  useEffect(() => {
    if (!pathMode || !pathStartId || !pathEndId) {
      setPathResult(null);
      setPathStep(0);
      return;
    }
    const nextPath = findShortestPath(network, pathStartId, pathEndId);
    setPathResult(nextPath);
    setPathStep(0);
    if (!nextPath) notify("No bounded path exists between the selected synthetic entities.");
  }, [network, notify, pathEndId, pathMode, pathStartId]);

  useEffect(() => {
    if (!pathResult) return undefined;
    if (reducedMotion) {
      setPathStep(pathResult.nodeIds.length);
      return undefined;
    }
    const timers = pathResult.nodeIds.map((_, index) => window.setTimeout(() => setPathStep(index + 1), index * 220));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [pathResult, reducedMotion]);

  useEffect(() => {
    const timer = toast ? window.setTimeout(() => setToast(undefined), 4_200) : undefined;
    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [toast]);

  useEffect(() => () => focusTimersRef.current.forEach((timer) => window.clearTimeout(timer)), []);

  useEffect(() => {
    const storedUpdate = safeReadGraphUpdate();
    if (!storedUpdate) return;
    const existingNodeIds = new Set(network.nodes.map((node) => node.id));
    const incomingNodeIds = (storedUpdate.nodes ?? []).map((node) => node.id).filter((id) => id && !existingNodeIds.has(id));
    setNetwork((current) => mergeMockGraph(current, storedUpdate));
    if (incomingNodeIds.length > 0) {
      setRevealNodeIds(incomingNodeIds);
      setAnimationKey((current) => current + 1);
      notify(`${incomingNodeIds.length} assistant-derived graph ${incomingNodeIds.length === 1 ? "entity is" : "entities are"} ready for review.`);
    }
  // The persisted payload is consumed only when this route mounts; event updates cover live changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const receiveUpdate = (event: Event) => {
      const detail = (event as CustomEvent<GraphUpdateDetail>).detail;
      if (!detail || (!Array.isArray(detail.nodes) && !Array.isArray(detail.edges))) return;
      const existingNodeIds = new Set(networkStateRef.current.nodes.map((node) => node.id));
      const incomingNodeIds = (detail.nodes ?? []).map((node) => node.id).filter((id) => id && !existingNodeIds.has(id));
      setNetwork((current) => mergeMockGraph(current, detail));
      if (incomingNodeIds.length > 0) {
        setRevealNodeIds(incomingNodeIds);
        setAnimationKey((current) => current + 1);
        notify(`${incomingNodeIds.length} new graph ${incomingNodeIds.length === 1 ? "entity was" : "entities were"} added from the assistant mock analysis.`);
      }
    };
    window.addEventListener("sutra:graph-update", receiveUpdate);
    return () => window.removeEventListener("sutra:graph-update", receiveUpdate);
  }, [notify]);

  useEffect(() => {
    const receiveFocus = (event: Event) => {
      const detail = (event as CustomEvent<GraphFocusDetail>).detail;
      const entityIds = Array.isArray(detail?.entityIds) ? detail.entityIds.filter((id): id is string => typeof id === "string") : [];
      if (entityIds.length === 0) return;
      safeWriteGraphFocus(entityIds);
      const targetId = entityIds.find((id) => networkStateRef.current.nodes.some((node) => node.id === id));
      if (targetId) {
        focusEntity(targetId);
        safeClearGraphFocus();
      }
    };
    window.addEventListener("sutra:graph-focus", receiveFocus);
    return () => window.removeEventListener("sutra:graph-focus", receiveFocus);
  }, [focusEntity]);

  useEffect(() => {
    const storedIds = safeReadGraphFocus();
    const targetId = storedIds.find((id) => network.nodes.some((node) => node.id === id));
    if (!targetId) return;
    const timer = window.setTimeout(() => focusEntity(targetId), 280);
    safeClearGraphFocus();
    return () => window.clearTimeout(timer);
  }, [focusEntity, network.nodes]);

  return (
    <div className="network-explorer">
      <section className="network-explorer__hero">
        <div className="network-explorer__hero-copy">
          <div className="eyebrow">Network intelligence · synthetic demo</div>
          <h2>Trace evidence-backed relationships without losing the investigative thread.</h2>
          <p>{currentCaseLabel}. Pan, zoom, select, filter, expand, and compare only the bounded mock graph in this Phase 2 experience.</p>
        </div>
        <div className="network-explorer__stats" aria-label="Network statistics">
          <div className="network-explorer__stat"><strong>{network.nodes.length}</strong><span>Entities</span></div>
          <div className="network-explorer__stat"><strong>{network.edges.length}</strong><span>Links</span></div>
          <div className="network-explorer__stat"><strong>{getEvidenceCount(network)}</strong><span>Evidence</span></div>
        </div>
      </section>

      <NetworkControls
        query={query}
        filtersOpen={filtersOpen}
        entityTypes={entityTypes}
        relationshipTypes={relationshipTypes}
        onQueryChange={setQuery}
        onRunSearch={runSearch}
        onToggleFilters={() => setFiltersOpen((open) => !open)}
        onToggleEntityType={(entityType) => setEntityTypes((current) => toggleArrayItem(current, entityType))}
        onToggleRelationshipType={(relationshipType) => setRelationshipTypes((current) => toggleArrayItem(current, relationshipType))}
        onResetFilters={() => {
          setQuery("");
          setEntityTypes([]);
          setRelationshipTypes([]);
          notify("Network search and type filters cleared.");
        }}
      />

      {pathMode && (
        <section className="network-path-panel" aria-label="Find shortest connection">
          <div className="network-path-panel__head">
            <strong><Route size={14} /> Find Connection</strong>
            <span className="network-path-panel__head-actions"><button className="network-action-button" type="button" onClick={loadFourHopDemo}>Load 4-hop demo</button><button className="network-action-button" type="button" onClick={togglePathMode}><X size={13} /> Cancel</button></span>
          </div>
          <div className="network-path-panel__selects">
            <label>Entity A<select value={pathStartId ?? ""} onChange={(event) => { setPathStartId(event.target.value || undefined); setPathEndId(undefined); }}><option value="">Select source</option>{network.nodes.map((node) => <option value={node.id} key={node.id}>{node.label} · {ENTITY_TYPE_LABELS[node.entityType]}</option>)}</select></label>
            <label>Entity B<select value={pathEndId ?? ""} onChange={(event) => setPathEndId(event.target.value || undefined)} disabled={!pathStartId}><option value="">Select target</option>{network.nodes.filter((node) => node.id !== pathStartId).map((node) => <option value={node.id} key={node.id}>{node.label} · {ENTITY_TYPE_LABELS[node.entityType]}</option>)}</select></label>
          </div>
          <div className="network-path-panel__selection">
            {pathResult ? <><b>{pathResult.hops} hop{pathResult.hops === 1 ? "" : "s"}</b><span>·</span><b>{pathResult.evidenceRecords.length} evidence record{pathResult.evidenceRecords.length === 1 ? "" : "s"}</b><span>· sequentially highlighting the path</span></> : <span>Select entity A and B by clicking graph nodes or using these controls.</span>}
          </div>
        </section>
      )}

      <section className="network-workbench">
        <article className="network-canvas-panel">
          <header className="network-canvas-panel__header">
            <div className="network-canvas-panel__title">
              <span className="network-canvas-panel__title-icon"><Network size={17} /></span>
              <div><strong>Relationship map</strong><span>{selectedNode ? `Focused: ${selectedNode.label}` : pathMode ? "Choose two entities to compare a bounded path" : "Hover or select a node to highlight direct relationships"}</span></div>
            </div>
            <div className="network-canvas-panel__actions">
              <button className="network-action-button" type="button" onClick={() => graphRef.current?.fit()}><Maximize2 size={13} /> Fit</button>
              <button className="network-action-button" type="button" onClick={() => selectedNode && graphRef.current?.centerNode(selectedNode.id)} disabled={!selectedNode}><Crosshair size={13} /> Center</button>
              <button className={`network-action-button${pathMode ? " network-action-button--active" : ""}`} type="button" onClick={togglePathMode}><GitFork size={13} /> {pathMode ? "Selecting A/B" : "Find connection"}</button>
              <button className="network-action-button" type="button" onClick={expandConnections}><Expand size={13} /> Expand connections</button>
              <button className="network-action-button network-action-button--danger" type="button" onClick={resetGraph}><RotateCcw size={13} /> Reset</button>
            </div>
          </header>
          <div className="network-graph-shell">
            <NetworkGraph
              ref={graphRef}
              nodes={network.nodes}
              edges={network.edges}
              visibleNodeIds={visibleNetwork.nodes.map((node) => node.id)}
              visibleEdgeIds={visibleNetwork.edges.map((edge) => edge.id)}
              selectedNodeId={selectedNodeId}
              selectedEdgeId={selectedEdgeId}
              emphasisNodeIds={emphasisNodeIds}
              pathNodeIds={visiblePathNodeIds}
              pathEdgeIds={visiblePathEdgeIds}
              searchMatchNodeIds={searchMatchNodeIds}
              revealNodeIds={revealNodeIds}
              animationKey={animationKey}
              reducedMotion={reducedMotion}
              onNodeSelect={handleNodeSelect}
              onEdgeSelect={handleEdgeSelect}
              onNodeHover={setHoveredNodeId}
              onCanvasTap={closeDrawer}
            />
            <span className={`network-graph__status${pathResult ? " network-graph__status--path" : ""}`}><i /> {pathResult ? `Path mode · ${pathResult.hops} hops · ${pathResult.evidenceRecords.length} evidence` : `${visibleNetwork.nodes.length} visible entities · pan, zoom, drag, select`}</span>
          </div>
          <footer className="network-legend" aria-label="Network legend">
            <span className="network-legend__item"><i className="network-legend__swatch network-legend__swatch--person" /> Person</span>
            <span className="network-legend__item"><i className="network-legend__swatch network-legend__swatch--financial" /> Financial</span>
            <span className="network-legend__item"><i className="network-legend__swatch network-legend__swatch--device" /> Device</span>
            <span className="network-legend__item"><i className="network-legend__swatch network-legend__swatch--location" /> Location</span>
            <span className="network-legend__item"><i className="network-legend__line network-legend__line--verified" /> Verified</span>
            <span className="network-legend__item"><i className="network-legend__line network-legend__line--inferred" /> Inferred</span>
            <span className="network-legend__item"><i className="network-legend__line network-legend__line--hypothesis" /> Hypothesis</span>
          </footer>
        </article>

        <EntityInspectorDrawer
          key={selectedNode?.id ?? "empty-inspector"}
          node={selectedNode}
          selectedEdge={selectedEdge}
          nodes={network.nodes}
          edges={network.edges}
          canExpand={expansionAvailable}
          onClose={closeDrawer}
          onCenter={(nodeId) => graphRef.current?.centerNode(nodeId)}
          onExpand={expandConnections}
          onSelectNode={focusEntity}
          onSelectEdge={handleEdgeSelect}
          onNotice={notify}
        />
      </section>
      <p className="network-explorer__disclaimer"><ScanSearch size={15} /> This graph uses synthetic Phase 2 data. Verified, inferred, and hypothesis links remain visually distinct; no relationship is a determination of guilt or fact beyond its cited source.</p>
      {toast && <div className="network-toast network-toast--info" role="status"><CheckCircle2 size={15} /> {toast}</div>}
    </div>
  );
}
