import { lazy, Suspense, useState } from "react";
import { DemoExperienceProvider } from "../features/demo/DemoExperienceProvider";
import { FusionIntelligencePage } from "./FusionIntelligencePage";
import CrimeHotspotMap from "../features/teammate/components/CrimeHotspotMap";
import { EntityResolution } from "../features/teammate/components/EntityResolution";
import { mockEntityResolution } from "../features/teammate/data";
import { EvidencePage } from "./EvidencePage";

const SampleNetwork = lazy(async () => ({
  default: (await import("./NetworkExplorerPage")).NetworkExplorerPage,
}));

type FusionDetail = { name: "network" } | { name: "evidence"; evidenceId?: string };

/** Authenticated entry to the existing map, without inventing backend locations. */
export function LiveFusionPage({ onOpenLiveEvidence }: { onOpenLiveEvidence: () => void }) {
  const [mapView, setMapView] = useState("teammate");
  const [detail, setDetail] = useState<FusionDetail>();
  const openNetwork = () => setDetail({ name: "network" });
  const openEvidence = (evidenceId?: string) => setDetail({ name: "evidence", evidenceId });

  return (
    <DemoExperienceProvider>
      <div className="page-stack">
        <section className="panel intake-body" aria-label="Map data source">
          <span className="eyebrow">Authenticated workspace · Synthetic map data</span>
          <p>You are still in the live console. This map, its locations and linked records use the sample dataset—not your uploaded case evidence. Live geographic ingestion is not connected yet.</p>
        </section>
        <div className="team-sample-tabs" aria-label="Map and identity views">
          <button onClick={() => setMapView("teammate")} aria-pressed={mapView === "teammate"}>Hotspot map</button>
          <button onClick={() => setMapView("identity")} aria-pressed={mapView === "identity"}>Identity comparison</button>
          <button onClick={() => setMapView("linked")} aria-pressed={mapView === "linked"}>Linked evidence map</button>
        </div>
        {mapView === "teammate" && <div className="team-ui team-map-frame"><CrimeHotspotMap /></div>}
        {mapView === "identity" && <div className="team-ui"><EntityResolution data={mockEntityResolution} /></div>}
        {/* Keep map filters, selected markers and other fusion state on return. */}
        <div hidden={Boolean(detail) || mapView !== "linked"}>
          <FusionIntelligencePage onOpenNetwork={openNetwork} onOpenEvidence={openEvidence} />
        </div>
        {detail && mapView === "linked" && (
          <section className="page-stack" aria-label="Sample investigation details">
            <button className="button button--quiet" onClick={() => setDetail(undefined)}>
              Back to investigation map
            </button>
            <Suspense fallback={<p role="status">Opening sample network…</p>}>
              {detail.name === "network" ? <SampleNetwork /> : (
                <EvidencePage
                  key={detail.evidenceId ?? "all"}
                  initialEvidenceId={detail.evidenceId}
                  onOpenNetwork={openNetwork}
                  onOpenLiveEvidence={onOpenLiveEvidence}
                />
              )}
            </Suspense>
          </section>
        )}
      </div>
    </DemoExperienceProvider>
  );
}
