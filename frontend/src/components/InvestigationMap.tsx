import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { LocationEvent } from "../features/fusion/locationData";

export function InvestigationMap({ events, selectedId, relatedEntityId, onSelect }: { events: LocationEvent[]; selectedId?: string; relatedEntityId?: string; onSelect: (id: string) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map>();
  const markers = useRef(new Map<string, L.Marker>());
  const callback = useRef(onSelect);
  callback.current = onSelect;
  const [tileError, setTileError] = useState(false);
  useEffect(() => {
    if (!host.current) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const instance = L.map(host.current, { zoomAnimation: !reduced, fadeAnimation: !reduced, scrollWheelZoom: false }).setView([22.5726, 88.4], 12);
    map.current = instance;
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).on("tileerror", () => setTileError(true)).addTo(instance);
    const resize = new ResizeObserver(() => instance.invalidateSize());
    resize.observe(host.current);
    return () => { resize.disconnect(); instance.remove(); map.current = undefined; markers.current.clear(); };
  }, []);
  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    markers.current.forEach(marker => marker.remove());
    markers.current.clear();
    for (const event of events) {
      const icon = L.divIcon({ className: "", html: '<span class="investigation-pin"></span>', iconSize: [24, 24], iconAnchor: [12, 12] });
      const marker = L.marker([event.lat, event.lng], { icon, title: event.kind + " — " + event.location, keyboard: true }).addTo(instance);
      const label = document.createElement("span");
      label.textContent = event.kind + " / " + event.location + " / Synthetic location";
      marker.bindTooltip(label).on("click", () => callback.current(event.id));
      markers.current.set(event.id, marker);
    }
    if (events.length) instance.fitBounds(L.latLngBounds(events.map(e => [e.lat, e.lng] as [number, number])), { padding: [45, 45], maxZoom: 14, animate: false });
  }, [events]);
  useEffect(() => {
    markers.current.forEach((marker, id) => {
      marker.getElement()?.classList.toggle("map-event-selected", id === selectedId);
      marker.getElement()?.classList.toggle("map-event-related", Boolean(relatedEntityId && events.find(event => event.id === id)?.entityId === relatedEntityId));
    });
    const selected = markers.current.get(selectedId ?? "");
    if (selected) { map.current?.panTo(selected.getLatLng(), { animate: false }); selected.openTooltip(); }
  }, [selectedId, relatedEntityId, events]);
  return <div className="investigation-map-wrap"><div className="investigation-map" ref={host} aria-label="Interactive investigation map. Use zoom buttons or drag to pan." />
    {tileError && <p className="map-tile-error" role="status">Basemap tiles unavailable. Check your connection. Event markers and timeline remain usable.</p>}
    <small className="map-help">Drag to pan · use + / − to zoom · select a marker</small>
  </div>;
}
