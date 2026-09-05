// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import App from "./App";
import { writeSession } from "./lib/session";

vi.mock("./api/queries", async importOriginal => ({
  ...await importOriginal<typeof import("./api/queries")>(),
  useSystemHealth: () => ({ data: { status: "healthy", services: [] }, refetch: vi.fn() }),
}));
vi.mock("./pages/LiveFusionPage", () => ({
  LiveFusionPage: () => <p>Authenticated fusion map content</p>,
}));

let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  sessionStorage.clear();
  window.history.replaceState({}, "", "/live/fusion");
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); sessionStorage.clear(); });

it("requires login on direct entry to the live map", async () => {
  await act(async () => root.render(<App />));
  expect(host.querySelector('input[type="email"]')).not.toBeNull();
  expect(host.textContent).not.toContain("Authenticated fusion map content");
});

it("renders the map in the authenticated shell with its active sidebar entry", async () => {
  writeSession({ access_token: "test-session", token_type: "bearer", expires_in: 3600, user: { id: "test-user", email: "test@example.invalid", full_name: "Test", role: "administrator", is_active: true } });
  await act(async () => root.render(<App />));
  expect(host.textContent).toContain("Authenticated fusion map content");
  expect(host.querySelector(".nav-item--active")?.textContent).toContain("Intelligence Fusion Center");
  expect(host.textContent).toContain("Live Cases");
  expect(window.location.pathname).toBe("/live/fusion");
  expect(host.querySelector('input[type="email"]')).toBeNull();
});
