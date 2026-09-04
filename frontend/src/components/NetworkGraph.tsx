import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import cytoscape, { type Core, type ElementDefinition, type StylesheetJson } from "cytoscape";
import type { GraphEdge, GraphNode } from "../types/api";

export interface NetworkGraphHandle {
  fit: () => void;
  reset: () => void;
  centerNode: (nodeId: string) => void;
}

interface NetworkGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  visibleNodeIds?: string[];
  visibleEdgeIds?: string[];
  selectedNodeId?: string;
  selectedEdgeId?: string;
  emphasisNodeIds?: string[];
  pathNodeIds?: string[];
  pathEdgeIds?: string[];
  searchMatchNodeIds?: string[];
  revealNodeIds?: string[];
  animationKey?: number;
  reducedMotion?: boolean;
  onNodeSelect?: (id: string) => void;
  onEdgeSelect?: (id: string) => void;
  onNodeHover?: (id?: string) => void;
  onCanvasTap?: () => void;
}

const graphStylesheet: StylesheetJson = [
  {
    selector: "node",
    style: {
      "background-color": "#66d7f0",
      "border-color": "#b5f4ff",
      "border-width": 1.5,
      "label": "data(label)",
      "color": "#e9f7fb",
      "font-family": "Inter, ui-sans-serif, system-ui, sans-serif",
      "font-size": "9px",
      "font-weight": 700,
      "text-wrap": "ellipsis",
      "text-max-width": "112px",
      "text-valign": "bottom",
      "text-margin-y": 7,
      "width": 27,
      "height": 27,
      "overlay-opacity": 0,
      "transition-property": "opacity, border-width, background-color, width, height",
      "transition-duration": 190,
    },
  },
  { selector: "node.entity-person", style: { "background-color": "#78b8ff", "border-color": "#c3e1ff", "width": 31, "height": 31 } },
  { selector: "node.entity-phone", style: { "background-color": "#72e3c3", "border-color": "#b8fae8", "shape": "round-rectangle" } },
  { selector: "node.entity-bankaccount", style: { "background-color": "#ffc26d", "border-color": "#ffe0a4", "shape": "round-rectangle" } },
  { selector: "node.role-fraudsource", style: { "background-color": "#f43f5e", "border-color": "#fecdd3", "shape": "diamond", "width": 34, "height": 34 } },
  { selector: "node.role-fraudmule", style: { "background-color": "#d946ef", "border-color": "#f5d0fe", "shape": "round-rectangle", "width": 31, "height": 31 } },
  { selector: "node.role-fraudcollector", style: { "background-color": "#7c3aed", "border-color": "#ddd6fe", "shape": "hexagon", "width": 37, "height": 37 } },
  { selector: "node.entity-device", style: { "background-color": "#94d895", "border-color": "#cef8cc", "shape": "round-rectangle" } },
  { selector: "node.entity-vehicle", style: { "background-color": "#b8a6ff", "border-color": "#d9d0ff", "shape": "round-rectangle" } },
  { selector: "node.entity-location", style: { "background-color": "#ee7074", "border-color": "#ffb4b6", "shape": "diamond", "width": 32, "height": 32 } },
  { selector: "node.entity-organization", style: { "background-color": "#80c9ed", "border-color": "#c2eeff", "shape": "hexagon", "width": 31, "height": 31 } },
  { selector: "node.entity-case", style: { "background-color": "#f17ca2", "border-color": "#ffbdd0", "shape": "round-rectangle", "width": 35, "height": 25 } },
  { selector: "node.entity-document", style: { "background-color": "#9daab9", "border-color": "#d5e0e7", "shape": "round-rectangle", "width": 27, "height": 25 } },
  { selector: "node.entity-default", style: { "background-color": "#66d7f0", "border-color": "#b5f4ff" } },
  {
    selector: "edge",
    style: {
      "width": 1.4,
      "line-color": "#577081",
      "target-arrow-color": "#577081",
      "target-arrow-shape": "triangle",
      "arrow-scale": 0.62,
      "curve-style": "bezier",
      "label": "data(label)",
      "font-family": "Inter, ui-sans-serif, system-ui, sans-serif",
      "font-size": "7px",
      "font-weight": 700,
      "color": "#839ba6",
      "text-background-color": "#0b131c",
      "text-background-opacity": 0.88,
      "text-background-padding": "2px",
      "text-rotation": "autorotate",
      "overlay-opacity": 0,
      "transition-property": "opacity, width, line-color, target-arrow-color",
      "transition-duration": 190,
    },
  },
  { selector: "edge.evidence-verified", style: { "line-style": "solid", "line-color": "#69dac6", "target-arrow-color": "#69dac6" } },
  { selector: "edge.evidence-inferred", style: { "line-style": "dashed", "line-color": "#8c9db0", "target-arrow-color": "#8c9db0" } },
  { selector: "edge.evidence-hypothesis", style: { "line-style": "dotted", "line-color": "#df99f3", "target-arrow-color": "#df99f3" } },
  { selector: "edge.relationship-transferredto", style: { "line-color": "#e8b662", "target-arrow-color": "#e8b662" } },
  { selector: "edge.relationship-called", style: { "line-color": "#6fcae8", "target-arrow-color": "#6fcae8" } },
  { selector: "edge.relationship-seenwith", style: { "line-color": "#e4767b", "target-arrow-color": "#e4767b" } },
  { selector: ".network-hidden", style: { "display": "none" } },
  { selector: ".network-dimmed", style: { "opacity": 0.13 } },
  { selector: "node.network-selected", style: { "border-width": 4, "border-color": "#ffffff", "width": 37, "height": 37, "z-index": 999 } },
  { selector: "edge.network-selected", style: { "width": 3.4, "line-color": "#f4fbff", "target-arrow-color": "#f4fbff", "z-index": 998 } },
  { selector: "node.network-neighbor", style: { "border-width": 3, "border-color": "#cbf8ff" } },
  { selector: "node.network-search-match", style: { "border-width": 3, "border-color": "#ffe5a6" } },
  { selector: "node.network-path-node", style: { "background-color": "#f46d72", "border-color": "#ffd0d2", "border-width": 3.5, "width": 35, "height": 35, "z-index": 1000 } },
  { selector: "edge.network-path-edge", style: { "width": 4, "line-color": "#ff777b", "target-arrow-color": "#ff777b", "z-index": 999 } },
  { selector: ".network-construction-hidden", style: { "opacity": 0 } },
];

function safeClass(value: string | undefined) {
  return value?.toLowerCase().replace(/[^a-z0-9]/g, "") || "default";
}

function makeElements(nodes: GraphNode[], edges: GraphEdge[]): ElementDefinition[] {
  return [
    ...nodes.map((node) => {
      const attributes = typeof node.raw?.attributes === "object" && node.raw.attributes !== null
        ? node.raw.attributes as Record<string, unknown>
        : {};
      const role = typeof attributes.role === "string" ? attributes.role : typeof node.raw?.role === "string" ? node.raw.role : "";
      return {
      group: "nodes" as const,
      data: {
        id: node.id,
        label: node.label,
        entityType: node.entityType,
        confidence: node.confidence ?? 0,
      },
      classes: `entity-${safeClass(node.entityType)}${role ? ` role-${safeClass(role)}` : ""}`,
    };
    }),
    ...edges.map((edge) => ({
      group: "edges" as const,
      data: {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.label,
        confidence: edge.confidence ?? 0,
      },
      classes: `evidence-${safeClass(edge.evidenceStatus)} relationship-${safeClass(edge.label)}`,
    })),
  ];
}

function getRevealGroups(nodes: GraphNode[], edges: GraphEdge[], revealNodeIds: string[]) {
  const revealSet = new Set(revealNodeIds);
  const adjacency = new Map<string, string[]>();
  edges.forEach((edge) => {
    if (!adjacency.has(edge.source)) adjacency.set(edge.source, []);
    if (!adjacency.has(edge.target)) adjacency.set(edge.target, []);
    adjacency.get(edge.source)?.push(edge.target);
    adjacency.get(edge.target)?.push(edge.source);
  });
  const root = nodes.find((node) => node.entityType === "PERSON" && revealSet.has(node.id))?.id ?? revealNodeIds[0];
  if (!root) return [] as string[][];

  const depthById = new Map<string, number>([[root, 0]]);
  const queue = [root];
  while (queue.length > 0) {
    const current = queue.shift()!;
    const depth = depthById.get(current) ?? 0;
    (adjacency.get(current) ?? []).forEach((neighbor) => {
      if (revealSet.has(neighbor) && !depthById.has(neighbor)) {
        depthById.set(neighbor, depth + 1);
        queue.push(neighbor);
      }
    });
  }

  const groups = new Map<number, string[]>();
  revealNodeIds.forEach((id) => {
    const depth = depthById.get(id) ?? 3;
    const group = groups.get(depth) ?? [];
    group.push(id);
    groups.set(depth, group);
  });
  return [...groups.entries()].sort(([first], [second]) => first - second).map(([, ids]) => ids);
}

export const NetworkGraph = forwardRef<NetworkGraphHandle, NetworkGraphProps>(function NetworkGraph({
  nodes,
  edges,
  visibleNodeIds,
  visibleEdgeIds,
  selectedNodeId,
  selectedEdgeId,
  emphasisNodeIds,
  pathNodeIds,
  pathEdgeIds,
  searchMatchNodeIds,
  revealNodeIds,
  animationKey = 0,
  reducedMotion = false,
  onNodeSelect,
  onEdgeSelect,
  onNodeHover,
  onCanvasTap,
}, ref) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cyRef = useRef<Core | null>(null);
  const callbacksRef = useRef({ onNodeSelect, onEdgeSelect, onNodeHover, onCanvasTap });
  const timerIdsRef = useRef<number[]>([]);
  const lastStructureRef = useRef("");
  const lastAnimationKeyRef = useRef<number | null>(null);
  const elements = useMemo(() => makeElements(nodes, edges), [nodes, edges]);
  const structureSignature = useMemo(
    () => `${nodes.map((node) => `${node.id}:${node.label}:${node.entityType}`).join("|")}::${edges.map((edge) => `${edge.id}:${edge.source}:${edge.target}:${edge.label}`).join("|")}`,
    [nodes, edges],
  );
  const visibleNodeSignature = (visibleNodeIds ?? nodes.map((node) => node.id)).join("|");
  const visibleEdgeSignature = (visibleEdgeIds ?? edges.map((edge) => edge.id)).join("|");
  const emphasisSignature = (emphasisNodeIds ?? []).join("|");
  const pathNodeSignature = (pathNodeIds ?? []).join("|");
  const pathEdgeSignature = (pathEdgeIds ?? []).join("|");
  const searchSignature = (searchMatchNodeIds ?? []).join("|");

  useEffect(() => {
    callbacksRef.current = { onNodeSelect, onEdgeSelect, onNodeHover, onCanvasTap };
  }, [onCanvasTap, onEdgeSelect, onNodeHover, onNodeSelect]);

  const fitVisible = useCallback(() => {
    const cy = cyRef.current;
    if (!cy) return;
    const visible = cy.elements().not(".network-hidden");
    if (visible.length > 0) cy.fit(visible, 52);
  }, []);

  const centerNode = useCallback((nodeId: string) => {
    const cy = cyRef.current;
    if (!cy) return;
    const node = cy.getElementById(nodeId);
    if (node.empty()) return;
    if (reducedMotion) {
      cy.center(node);
      return;
    }
    cy.animate({ center: { eles: node } }, { duration: 260, easing: "ease-out" });
  }, [reducedMotion]);

  useImperativeHandle(ref, () => ({
    fit: fitVisible,
    reset: () => {
      const cy = cyRef.current;
      if (!cy) return;
      cy.elements().removeClass("network-dimmed network-neighbor network-path-node network-path-edge network-search-match network-selected");
      fitVisible();
    },
    centerNode,
  }), [centerNode, fitVisible]);

  useEffect(() => {
    if (!containerRef.current) return undefined;
    const cy = cytoscape({
      container: containerRef.current,
      elements: [],
      style: graphStylesheet,
      minZoom: 0.25,
      maxZoom: 3.2,
      wheelSensitivity: 0.18,
      selectionType: "single",
      boxSelectionEnabled: false,
      layout: { name: "preset" },
    });
    cyRef.current = cy;
    cy.on("tap", "node", (event) => callbacksRef.current.onNodeSelect?.(String(event.target.id())));
    cy.on("tap", "edge", (event) => callbacksRef.current.onEdgeSelect?.(String(event.target.id())));
    cy.on("mouseover", "node", (event) => callbacksRef.current.onNodeHover?.(String(event.target.id())));
    cy.on("mouseout", "node", () => callbacksRef.current.onNodeHover?.());
    cy.on("tap", (event) => {
      if (event.target === cy) callbacksRef.current.onCanvasTap?.();
    });

    const resizeObserver = new ResizeObserver(() => cy.resize());
    resizeObserver.observe(containerRef.current);
    return () => {
      timerIdsRef.current.forEach((id) => window.clearTimeout(id));
      timerIdsRef.current = [];
      resizeObserver.disconnect();
      cy.destroy();
      cyRef.current = null;
    };
  }, []);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || lastStructureRef.current === structureSignature) return;
    lastStructureRef.current = structureSignature;
    const wantedIds = new Set(elements.map((element) => String(element.data?.id ?? "")));
    cy.batch(() => {
      cy.elements().forEach((element) => {
        if (!wantedIds.has(element.id())) element.remove();
      });
      elements.forEach((definition) => {
        const id = String(definition.data?.id ?? "");
        const existing = cy.getElementById(id);
        if (existing.empty()) {
          cy.add(definition);
        } else {
          existing.data(definition.data ?? {});
          existing.classes(definition.classes ?? "");
        }
      });
    });
    const layout = cy.layout({
      name: "cose",
      animate: false,
      fit: true,
      padding: 56,
      nodeRepulsion: () => 9200,
      idealEdgeLength: () => 128,
      gravity: 0.38,
      numIter: 420,
    });
    layout.run();
    const id = window.setTimeout(fitVisible, 35);
    timerIdsRef.current.push(id);
  }, [elements, fitVisible, structureSignature]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    const nodeIds = new Set(visibleNodeIds ?? nodes.map((node) => node.id));
    const edgeIds = new Set(visibleEdgeIds ?? edges.map((edge) => edge.id));
    const emphasisIds = new Set(emphasisNodeIds ?? []);
    const visibleSelectionExists = emphasisIds.size > 0;
    const pathNodes = new Set(pathNodeIds ?? []);
    const pathEdges = new Set(pathEdgeIds ?? []);
    const searchMatches = new Set(searchMatchNodeIds ?? []);

    cy.batch(() => {
      cy.nodes().forEach((node) => {
        node.toggleClass("network-hidden", !nodeIds.has(node.id()));
        node.toggleClass("network-dimmed", visibleSelectionExists && !emphasisIds.has(node.id()));
        node.toggleClass("network-neighbor", Boolean(selectedNodeId) && emphasisIds.has(node.id()) && node.id() !== selectedNodeId);
        node.toggleClass("network-selected", node.id() === selectedNodeId);
        node.toggleClass("network-path-node", pathNodes.has(node.id()));
        node.toggleClass("network-search-match", searchMatches.has(node.id()));
      });
      cy.edges().forEach((edge) => {
        const sourceVisible = nodeIds.has(edge.source().id());
        const targetVisible = nodeIds.has(edge.target().id());
        const edgeVisible = edgeIds.has(edge.id()) && sourceVisible && targetVisible;
        const adjacentToEmphasis = emphasisIds.has(edge.source().id()) && emphasisIds.has(edge.target().id());
        edge.toggleClass("network-hidden", !edgeVisible);
        edge.toggleClass("network-dimmed", visibleSelectionExists && !adjacentToEmphasis);
        edge.toggleClass("network-selected", edge.id() === selectedEdgeId);
        edge.toggleClass("network-path-edge", pathEdges.has(edge.id()));
      });
    });
  }, [edges, emphasisSignature, nodes, pathEdgeSignature, pathNodeSignature, searchSignature, selectedEdgeId, selectedNodeId, visibleEdgeSignature, visibleNodeSignature]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || lastAnimationKeyRef.current === animationKey) return;
    lastAnimationKeyRef.current = animationKey;
    const targetIds = revealNodeIds?.filter((id) => !cy.getElementById(id).empty()) ?? [];
    if (targetIds.length === 0 || reducedMotion) return;

    timerIdsRef.current.forEach((id) => window.clearTimeout(id));
    timerIdsRef.current = [];
    const targetNodes = targetIds.map((id) => cy.getElementById(id));
    const targetEdges = cy.edges().filter((edge) => targetIds.includes(edge.source().id()) || targetIds.includes(edge.target().id()));
    targetNodes.forEach((node) => node.addClass("network-construction-hidden"));
    targetEdges.addClass("network-construction-hidden");

    const groups = getRevealGroups(nodes, edges, targetIds);
    const groupDelay = groups.length <= 1 ? 120 : Math.max(260, Math.min(430, Math.floor(1200 / groups.length)));
    groups.forEach((group, index) => {
      const timer = window.setTimeout(() => {
        group.forEach((id) => {
          const node = cy.getElementById(id);
          node.removeClass("network-construction-hidden");
          node.connectedEdges().forEach((edge) => {
            const sourceIsVisible = !edge.source().hasClass("network-construction-hidden");
            const targetIsVisible = !edge.target().hasClass("network-construction-hidden");
            if (sourceIsVisible && targetIsVisible) edge.removeClass("network-construction-hidden");
          });
        });
      }, 90 + index * groupDelay);
      timerIdsRef.current.push(timer);
    });
    const cleanUp = window.setTimeout(() => {
      targetNodes.forEach((node) => node.removeClass("network-construction-hidden"));
      targetEdges.removeClass("network-construction-hidden");
    }, 180 + groups.length * groupDelay);
    timerIdsRef.current.push(cleanUp);
  }, [animationKey, edges, nodes, reducedMotion, revealNodeIds]);

  return <div className="network-graph" ref={containerRef} aria-label="Interactive relationship network visualization" role="application" tabIndex={0} />;
});
