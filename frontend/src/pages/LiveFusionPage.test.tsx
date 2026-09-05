// @vitest-environment jsdom
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { LiveFusionPage } from "./LiveFusionPage";

vi.mock("../features/teammate/components/CrimeHotspotMap", () => ({ default: () => <p>Teammate hotspot map</p> }));

vi.mock("./FusionIntelligencePage", () => ({
  FusionIntelligencePage: ({ onOpenNetwork, onOpenEvidence }: { onOpenNetwork: () => void; onOpenEvidence: (id: string) => void }) => {
    const [selected, setSelected] = useState(false);
    return <div><button onClick={() => setSelected(true)}>Select marker</button>{selected && <span>Marker selected</span>}<button onClick={onOpenNetwork}>Show network</button><button onClick={() => onOpenEvidence("E-121")}>Open source</button></div>;
  },
}));
vi.mock("./NetworkExplorerPage", () => ({ NetworkExplorerPage: () => <p>Sample graph view</p> }));
vi.mock("./EvidencePage", () => ({
  EvidencePage: ({ initialEvidenceId, onOpenLiveEvidence }: { initialEvidenceId?: string; onOpenLiveEvidence: () => void }) => <div>Sample source: {initialEvidenceId}<button onClick={onOpenLiveEvidence}>Open secure upload</button></div>,
}));

let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); });
async function click(label: string) {
  const button = [...host.querySelectorAll("button")].find(item => item.textContent === label)!;
  await act(async () => button.click());
}

it("labels the sample data and preserves map state when opening and returning from graph", async () => {
  await act(async () => root.render(<LiveFusionPage onOpenLiveEvidence={vi.fn()} />));
  expect(host.textContent).toContain("Authenticated workspace");
  expect(host.textContent).toContain("not your uploaded case evidence");
  expect(host.textContent).toContain("Teammate hotspot map");
  await click("Linked evidence map");
  await click("Select marker");
  await click("Show network");
  expect(host.textContent).toContain("Sample graph view");
  expect(host.querySelector("[hidden]")?.textContent).toContain("Marker selected");
  await click("Back to investigation map");
  expect(host.querySelector("[hidden]")).toBeNull();
  expect(host.textContent).toContain("Marker selected");
});

it("opens the exact sample citation and provides a real-upload exit", async () => {
  const openLive = vi.fn();
  await act(async () => root.render(<LiveFusionPage onOpenLiveEvidence={openLive} />));
  await click("Linked evidence map");
  await click("Open source");
  expect(host.textContent).toContain("Sample source: E-121");
  await click("Open secure upload");
  expect(openLive).toHaveBeenCalledOnce();
});
