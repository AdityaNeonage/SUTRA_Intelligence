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
});
