// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppShell } from "../../components/AppShell";
import { InvestigationGraph } from "./components/InvestigationGraph";
import { EntityResolution } from "./components/EntityResolution";
import { mockEntityResolution } from "./data";
import type { NodeData } from "./types";

let container: HTMLDivElement, root: Root;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); vi.unstubAllGlobals(); });
function click(selector: string) {
  const target = container.querySelector(selector);
  expect(target).not.toBeNull();
  act(() => target!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
}

describe("teammate UI integration", () => {
  it("keeps live navigation, map access, search and logout connected", () => {
    const navigate = vi.fn(), exit = vi.fn(), search = vi.fn();
    act(() => root.render(<AppShell activeView="network" mode="live" onNavigate={navigate} onExit={exit} onOpenCommandPalette={search}>Live records</AppShell>));
    expect(container.querySelector('[aria-current="page"]')?.textContent).toBe("Network");
    click('[aria-label="Map & Identity"]'); expect(navigate).toHaveBeenCalledWith("fusion");
    click('[aria-label="Evidence Hub"]'); expect(navigate).toHaveBeenCalledWith("evidence");
    click('[aria-label="Data Store"]'); expect(navigate).toHaveBeenCalledWith("data-store");
    click('[aria-label="Open command palette"]'); expect(search).toHaveBeenCalledOnce();
    click(".nav-item--logout"); expect(exit).toHaveBeenCalledOnce();
    expect(container.querySelector('img')?.getAttribute("src")).toBe("/teammate-logo.jpeg");
  });
  it("makes graph entities and relationships selectable with keyboard and pointer", () => {
    const node: NodeData = { id: "a", label: "Account A", type: "account", x: 100, y: 100, riskScore: 0 };
    const selectNode = vi.fn(), selectEdge = vi.fn();
    act(() => root.render(<InvestigationGraph nodes={[node, { ...node, id: "b", label: "Account B", x: 300 }]} edges={[{ id: "ab", source: "a", target: "b", type: "linked_to", weight: 2, label: "Transfer" }]} onNodeSelect={selectNode} onEdgeSelect={selectEdge} />));
    click('[aria-label="Account A, account"]'); expect(selectNode).toHaveBeenCalledWith(node);
    const edge = container.querySelector('[aria-label="Account A to Account B: Transfer"]')!;
    act(() => edge.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })));
    expect(selectEdge).toHaveBeenCalledWith("ab");
    click('[aria-label="Search nodes"]');
    expect(container.querySelector('input[placeholder="Search nodes..."]')).not.toBeNull();
  });
  it("labels identity review as a local sample, never a live database mutation", () => {
    act(() => root.render(<EntityResolution data={mockEntityResolution} />));
    click("button");
    expect(container.querySelector('[role="status"]')?.textContent).toContain("No live records changed");
  });
});
