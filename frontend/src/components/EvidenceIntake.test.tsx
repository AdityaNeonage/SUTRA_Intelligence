// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { EvidenceIntake } from "./EvidenceIntake";
import { DemoUploadGate } from "./DemoUploadGate";
import { sutraApi } from "../api/client";

vi.mock("../api/client", () => ({ sutraApi: { uploadEvidence: vi.fn() } }));
let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement("div"); document.body.appendChild(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); });
function button(label: string) {
  const result = [...host.querySelectorAll("button")].find(item => item.textContent?.includes(label));
  if (!result) throw new Error("Missing button " + label);
  return result;
}

it("submits the selected case, shows the real receipt, refreshes caches and opens that batch", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidation = vi.spyOn(client, "invalidateQueries");
  const openStore = vi.fn();
  vi.mocked(sutraApi.uploadEvidence).mockResolvedValue({ ingestion_id: "real-batch", status: "completed", filename: "transfers.csv", file_hash: "hash", warnings: [], document_ids: ["d1", "d2"], entity_ids: ["e1"], relationship_ids: ["r1"] });
  await act(async () => root.render(<QueryClientProvider client={client}><EvidenceIntake token="test-only-token" caseId="selected-case" onOpenStore={openStore} /></QueryClientProvider>));
  const picker = host.querySelector('input[type="file"]')!;
  const file = new File(["src_account,dst_account\nA,B"], "transfers.csv");
  Object.defineProperty(picker, "files", { value: [file] });
  await act(async () => picker.dispatchEvent(new Event("change", { bubbles: true })));
  expect(host.textContent).toContain("transfers.csv");
  await act(async () => button("Process evidence").click());
  expect(sutraApi.uploadEvidence).toHaveBeenCalledWith("test-only-token", file, "selected-case", undefined);
  expect(host.textContent).toContain("2 records / 1 entities / 1 relationships");
  expect(host.textContent).toContain("1 completed / 0 failed");
  expect(invalidation.mock.calls.map(call => call[0]?.queryKey?.[0])).toEqual(expect.arrayContaining(["documents", "graph", "cases", "entities"]));
  await act(async () => button("View records").click());
  expect(openStore).toHaveBeenCalledWith("real-batch");
  client.clear();
});

it("gates public case ingestion with authentication instead of simulating persistence", async () => {
  const openLive = vi.fn();
  await act(async () => root.render(<DemoUploadGate onOpenLive={openLive} />));
  await act(async () => button("Upload Evidence").click());
  expect(host.textContent).toContain("Live evidence ingestion requires investigator authentication.");
  expect(host.querySelector('input[type="file"]')).toBeNull();
  await act(async () => button("Open live console").click());
  expect(openLive).toHaveBeenCalledOnce();
});
