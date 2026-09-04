import { describe, expect, it } from "vitest";
import { parseSutraRoute } from "./router";

describe("parseSutraRoute", () => {
  it("recognises the merged Fusion Lab route", () => {
    expect(parseSutraRoute("/fusion")).toEqual({ name: "fusion" });
  });

  it("keeps case workspace and evidence query routes intact", () => {
    expect(parseSutraRoute("/cases/case-104/timeline")).toEqual({ name: "case-workspace", caseId: "case-104", tab: "timeline" });
    expect(parseSutraRoute("/evidence?record=E-134")).toEqual({ name: "evidence", evidenceId: "E-134" });
  });

  it("routes authenticated live-console views independently from the demo", () => {
    expect(parseSutraRoute("/live")).toEqual({ name: "live-dashboard" });
    expect(parseSutraRoute("/live/cases/case-104")).toEqual({ name: "live-cases", caseId: "case-104" });
    expect(parseSutraRoute("/live/network?case=case-104")).toEqual({ name: "live-network", caseId: "case-104" });
    expect(parseSutraRoute("/live/evidence")).toEqual({ name: "live-evidence" });
    expect(parseSutraRoute("/live/data-store")).toEqual({ name: "live-data-store" });
    expect(parseSutraRoute("/live/assistant")).toEqual({ name: "live-assistant" });
  });
});
