import { useEffect, useRef, useState, useMemo } from "react";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import { crimeIncidents, CrimeIncident } from "../data";

// Severity config
const SEV_CONFIG = {
    High: { color: "#ef4444", glow: "rgba(239,68,68,0.35)", label: "High Risk", weight: 3 },
    Medium: { color: "#f97316", glow: "rgba(249,115,22,0.35)", label: "Medium Risk", weight: 2 },
    Low: { color: "#22c55e", glow: "rgba(34,197,94,0.35)", label: "Low Risk", weight: 1 },
} as const;

type Severity = keyof typeof SEV_CONFIG;

const TYPE_ICONS: Record<string, string> = {
    Robbery: "🔫",
    Theft: "👜",
    Assault: "⚠️",
    Burglary: "🏚️",
    "Cyber Crime": "💻",
};

// ─── Sidebar Group Card ──────────────────────────────────────────────────────
function GroupedIncidentCard({
    type,
    count,
    severity,
    selected,
    onClick,
}: {
    type: string;
    count: number;
    severity: Severity;
    selected: boolean;
    onClick: () => void;
}) {
    const cfg = SEV_CONFIG[severity];
    return (
        <button
            onClick={onClick}
            className="w-full text-left"
            style={{ outline: "none" }}
        >
            <div
                style={{
                    background: selected ? "rgba(255,255,255,0.06)" : "transparent",
                    border: `1px solid ${selected ? cfg.color + "60" : "rgba(255,255,255,0.06)"}`,
                    borderRadius: 6,
                    padding: "10px 12px",
                    marginBottom: 6,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    boxShadow: selected ? `0 0 12px ${cfg.glow}` : "none",
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 14 }}>{TYPE_ICONS[type] ?? "📍"}</span>
                    <span style={{ color: "#fff", fontWeight: 700, fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                        {type}
                    </span>
                    <span
                        style={{
                            marginLeft: "auto",
                            fontSize: 9,
                            fontWeight: 800,
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                            color: cfg.color,
                            background: cfg.color + "18",
                            border: `1px solid ${cfg.color}40`,
                            borderRadius: 3,
                            padding: "2px 6px",
                        }}
                    >
                        {severity}
                    </span>
                </div>
                <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 10 }}>
                    {count} {count === 1 ? "Incident" : "Incidents"} Reported
                </div>
                <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 10, marginTop: 2 }}>
                    Click to view {count === 1 ? "it" : "all"} on map
                </div>
            </div>
        </button>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CrimeHotspotMap() {
    const mapRef = useRef<any>(null);
    const markersRef = useRef<Record<string, any>>({});
    
    // CRITICAL FIX: Changed map reference to State so the component re-renders when the map is ready!
    const [mapInstance, setMapInstance] = useState<any>(null);
    
    // States for filtering
    const [filterSev, setFilterSev] = useState<Severity | "All">("All");
    const [selectedType, setSelectedType] = useState<string | null>(null);
    const [leafletReady, setLeafletReady] = useState(false);

    // 1. Filter raw data by severity first
    const filteredBySev = useMemo(
        () => filterSev === "All" ? crimeIncidents : crimeIncidents.filter(c => c.severity === filterSev),
        [filterSev]
    );

    // 2. Group the filtered incidents by Crime Type for the sidebar
    const groupedTypes = useMemo(() => {
        const groups: Record<string, { type: string; count: number; severity: Severity }> = {};
        
        filteredBySev.forEach(c => {
            if (!groups[c.type]) {
                groups[c.type] = { type: c.type, count: 0, severity: c.severity as Severity };
            }
            groups[c.type].count += 1;
            
            // Assign the highest severity among grouped incidents to the group card
            const currentWeight = SEV_CONFIG[groups[c.type].severity].weight;
            const newWeight = SEV_CONFIG[c.severity as Severity].weight;
            if (newWeight > currentWeight) {
                groups[c.type].severity = c.severity as Severity;
            }
        });
        
        return Object.values(groups);
    }, [filteredBySev]);

    // Clear selected type if it no longer exists in the current severity filter
    useEffect(() => {
        if (selectedType && !groupedTypes.find(g => g.type === selectedType)) {
            setSelectedType(null);
        }
    }, [groupedTypes, selectedType]);

    // 3. Final data for map markers (filtered by severity AND selected sidebar type)
    const mapMarkersData = useMemo(() => {
        if (!selectedType) return filteredBySev; // This ensures ALL markers show if nothing is clicked
        return filteredBySev.filter(c => c.type === selectedType);
    }, [filteredBySev, selectedType]);

    // Bundle map styles and initialise synchronously: no CDN race on remount.
    useEffect(() => {
        if (!mapRef.current) return;
        const map = L.map(mapRef.current, { center: [22.5726, 88.3639], zoom: 12, zoomControl: false });
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
        }).addTo(map);
        L.control.zoom({ position: "bottomright" }).addTo(map);
        const observer = new ResizeObserver(() => map.invalidateSize());
        observer.observe(mapRef.current);
        setMapInstance(map);
        setLeafletReady(true);
        return () => { observer.disconnect(); map.remove(); };
    }, []);

    useEffect(() => {
        if (!mapInstance) return;
        Object.values(markersRef.current).forEach((marker: any) => marker.remove());
        markersRef.current = {};
        buildMarkers(L, mapInstance, mapMarkersData);
        if (mapMarkersData.length) mapInstance.fitBounds(
            L.latLngBounds(mapMarkersData.map(c => [c.lat, c.lng] as [number, number])),
            { padding: [50, 50], maxZoom: 15 }
        );
    }, [mapMarkersData, mapInstance]);

    function buildMarkers(L: any, map: any, crimes: CrimeIncident[]) {
        crimes.forEach((crime) => {
            const cfg = SEV_CONFIG[crime.severity as Severity];

            const svgIcon = L.divIcon({
                className: "",
                iconSize: [28, 28],
                iconAnchor: [14, 14],
                popupAnchor: [0, -16],
                html: `
          <div style="position:relative;width:28px;height:28px;display:flex;align-items:center;justify-content:center; mix-blend-mode: lighten;">
            <div style="
              position:absolute;
              width:28px;height:28px;
              border-radius:50%;
              background:${cfg.color}22;
              border:1.5px solid ${cfg.color}55;
              animation:sutra-pulse 2s ease-out infinite;
            "></div>
            <div style="
              width:12px;height:12px;
              border-radius:50%;
              background:${cfg.color};
              box-shadow:0 0 8px ${cfg.color};
              z-index:1;
            "></div>
          </div>`,
            });

            const marker = L.marker([crime.lat, crime.lng], { icon: svgIcon, zIndexOffset: cfg.weight * 100 });

            const popup = L.popup({
                className: "sutra-popup",
                maxWidth: 220,
                closeButton: false,
            }).setContent(`
        <div style="
          background:#0f0f0f;
          border:1px solid ${cfg.color}55;
          border-left:3px solid ${cfg.color};
          border-radius:6px;
          padding:12px 14px;
          font-family:system-ui,sans-serif;
          min-width:180px;
        ">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
            <span style="font-size:16px">${TYPE_ICONS[crime.type] ?? "📍"}</span>
            <span style="color:#fff;font-weight:800;font-size:12px;letter-spacing:0.08em;text-transform:uppercase">${crime.type}</span>
          </div>
          <div style="display:grid;gap:4px;">
            <div style="color:rgba(255,255,255,0.5);font-size:10px"><span style="color:rgba(255,255,255,0.3)">CASE</span> &nbsp;${crime.id}</div>
            <div style="color:rgba(255,255,255,0.5);font-size:10px"><span style="color:rgba(255,255,255,0.3)">LOC</span> &nbsp;${crime.location}</div>
            <div style="color:rgba(255,255,255,0.5);font-size:10px"><span style="color:rgba(255,255,255,0.3)">DATE</span> &nbsp;${crime.date}</div>
            <div style="margin-top:4px;display:inline-block;padding:2px 8px;border-radius:3px;font-size:9px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:${cfg.color};background:${cfg.color}18;border:1px solid ${cfg.color}40">${crime.severity} RISK · ${crime.status}</div>
          </div>
        </div>
      `);

            marker.bindPopup(popup);
            marker.addTo(map);
            markersRef.current[crime.id] = marker;
        });
    }

    const counts = useMemo(() => ({
        High: crimeIncidents.filter(c => c.severity === "High").length,
        Medium: crimeIncidents.filter(c => c.severity === "Medium").length,
        Low: crimeIncidents.filter(c => c.severity === "Low").length,
    }), []);

    return (
        <>
            <style>{`
        @keyframes sutra-pulse {
          0%   { transform: scale(1);   opacity: 0.8; }
          70%  { transform: scale(2.2); opacity: 0; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        .sutra-popup .leaflet-popup-content-wrapper,
        .sutra-popup .leaflet-popup-tip {
          background: transparent !important;
          box-shadow: none !important;
          padding: 0 !important;
        }
        .sutra-popup .leaflet-popup-content { margin: 0 !important; }
        .leaflet-attribution-flag { display: none !important; }
        .leaflet-control-attribution {
          background: rgba(0,0,0,0.5) !important;
          color: rgba(255,255,255,0.3) !important;
          font-size: 9px !important;
          border-radius: 3px !important;
        }
        .leaflet-control-attribution a { color: rgba(255,255,255,0.4) !important; }
      `}</style>

            <div className="team-hotspot-layout" style={{ display: "flex", height: "100%", width: "100%", background: "#0a0710" }}>

                {/* ── Sidebar ── */}
                <div className="team-hotspot-sidebar" style={{
                    width: 260,
                    flexShrink: 0,
                    borderRight: "1px solid rgba(255,255,255,0.06)",
                    background: "#0a0a0e",
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                }}>
                    {/* Header */}
                    <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 4 }}>
                            Crime Hotspot Map
                        </div>
                        <div style={{ color: "#fff", fontWeight: 800, fontSize: 13, letterSpacing: "0.05em" }}>
                            Kolkata Region
                        </div>
                        {/* Stats */}
                        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                            {(["High", "Medium", "Low"] as Severity[]).map((s) => (
                                <div key={s} style={{
                                    flex: 1, textAlign: "center",
                                    background: SEV_CONFIG[s].color + "10",
                                    border: `1px solid ${SEV_CONFIG[s].color}30`,
                                    borderRadius: 4, padding: "5px 0",
                                }}>
                                    <div style={{ color: SEV_CONFIG[s].color, fontWeight: 800, fontSize: 15 }}>{counts[s]}</div>
                                    <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 8, letterSpacing: "0.08em", textTransform: "uppercase" }}>{s}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Filter */}
                    <div style={{ padding: "10px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", gap: 6 }}>
                        {(["All", "High", "Medium", "Low"] as const).map((s) => (
                            <button
                                key={s}
                                onClick={() => setFilterSev(s)}
                                style={{
                                    flex: 1,
                                    padding: "5px 0",
                                    borderRadius: 4,
                                    border: `1px solid ${filterSev === s ? (s === "All" ? "#ffffff40" : SEV_CONFIG[s as Severity].color + "60") : "rgba(255,255,255,0.07)"}`,
                                    background: filterSev === s ? (s === "All" ? "rgba(255,255,255,0.06)" : SEV_CONFIG[s as Severity].color + "15") : "transparent",
                                    color: filterSev === s ? (s === "All" ? "#fff" : SEV_CONFIG[s as Severity].color) : "rgba(255,255,255,0.3)",
                                    fontSize: 9,
                                    fontWeight: 800,
                                    letterSpacing: "0.08em",
                                    textTransform: "uppercase",
                                    cursor: "pointer",
                                    transition: "all 0.15s",
                                    outline: "none",
                                }}
                            >
                                {s}
                            </button>
                        ))}
                    </div>

                    {/* List */}
                    <div style={{ flex: 1, overflowY: "auto", padding: "10px 10px", scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.08) transparent" }}>
                        {groupedTypes.length === 0 && (
                            <div style={{ color: "rgba(255,255,255,0.2)", fontSize: 11, textAlign: "center", marginTop: 24 }}>
                                No crime types match this filter
                            </div>
                        )}
                        {groupedTypes.map((group) => (
                            <GroupedIncidentCard
                                key={group.type}
                                type={group.type}
                                count={group.count}
                                severity={group.severity}
                                selected={selectedType === group.type}
                                onClick={() => setSelectedType(prev => prev === group.type ? null : group.type)}
                            />
                        ))}
                    </div>
                </div>

                {/* ── Map ── */}
                <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
                    {!leafletReady && (
                        <div style={{
                            position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                            background: "#060608", zIndex: 10, flexDirection: "column", gap: 12,
                        }}>
                            <div style={{
                                width: 32, height: 32, border: "2px solid rgba(255,255,255,0.1)",
                                borderTop: "2px solid #ef4444", borderRadius: "50%",
                                animation: "sutra-spin 0.8s linear infinite",
                            }} />
                            <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                                Loading Map…
                            </div>
                        </div>
                    )}
                    
                    <div ref={mapRef} style={{ width: "100%", height: "100%" }} />

                    {/* UI UPGRADE: Reset View Button */}
                    {(selectedType !== null || filterSev !== "All") && (
                        <button 
                            onClick={() => {
                                setSelectedType(null);
                                setFilterSev("All");
                            }}
                            style={{
                                position: "absolute", top: 16, right: 16, zIndex: 500,
                                background: "rgba(6,6,8,0.85)", border: "1px solid rgba(255,255,255,0.15)",
                                backdropFilter: "blur(8px)", borderRadius: 6, padding: "8px 16px",
                                color: "#fff", fontSize: 11, fontWeight: 700, letterSpacing: "0.05em",
                                textTransform: "uppercase", cursor: "pointer", transition: "all 0.2s",
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                            onMouseLeave={(e) => e.currentTarget.style.background = "rgba(6,6,8,0.85)"}
                        >
                            Reset View 🌍
                        </button>
                    )}

                    {/* Legend overlay */}
                    <div style={{
                        position: "absolute", bottom: 40, left: 16, zIndex: 500,
                        background: "rgba(6,6,8,0.75)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        backdropFilter: "blur(12px)",
                        borderRadius: 6,
                        padding: "10px 14px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 7,
                    }}>
                        {(["High", "Medium", "Low"] as Severity[]).map((s) => (
                            <div key={s} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{
                                    width: 10, height: 10, borderRadius: "50%",
                                    background: SEV_CONFIG[s].color,
                                    boxShadow: `0 0 6px ${SEV_CONFIG[s].color}`,
                                }} />
                                <span style={{ color: "rgba(255,255,255,0.65)", fontSize: 10, letterSpacing: "0.06em" }}>
                                    {SEV_CONFIG[s].label}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}
