import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Layers, Filter } from "lucide-react";

export default function GisMap({ assets = [], onOpenAsset }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Initialize Leaflet map centered on Gujarat state
      const map = L.map(mapContainerRef.current).setView([22.5, 72.6], 8);
      
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | Gujarat R&B GIS',
        maxZoom: 18,
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear previous markers
    markersRef.current.forEach((m) => map.removeLayer(m));
    markersRef.current = [];

    // Add markers for assets with coordinates
    assets.forEach((asset) => {
      const lat = asset.location?.lat || 22.3 + (Math.random() - 0.5) * 1.5;
      const lng = asset.location?.lng || 72.5 + (Math.random() - 0.5) * 1.5;

      const color =
        asset.condition === "Good"
          ? "#10b981"
          : asset.condition === "Fair"
          ? "#f59e0b"
          : "#ef4444";

      // Custom marker icon
      const customIcon = L.divIcon({
        className: "custom-gis-pin",
        html: `
          <div style="
            background: ${color};
            width: 24px;
            height: 24px;
            border-radius: 50%;
            border: 2px solid #ffffff;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            font-weight: 800;
            font-size: 10px;
          ">
            ${asset.type === "Road" ? "🛣️" : asset.type === "Bridge" ? "🌉" : "🏛️"}
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);

      const popupHtml = `
        <div style="font-family: inherit; font-size: 12px; min-width: 200px;">
          <div style="font-weight: 800; color: #0f2942; font-size: 13px;">${asset.assetId}</div>
          <div style="font-weight: 600; margin: 2px 0;">${asset.name}</div>
          <div style="color: #64748b; margin-bottom: 6px;">
            ${asset.type} · ${asset.subDivision?.name || "Gujarat"}
          </div>
          <div style="margin-bottom: 8px;">
            Condition: <strong style="color: ${color}">${asset.condition}</strong> (${asset.status})
          </div>
          <button
            id="view-asset-${asset._id}"
            style="
              background: #0f2942;
              color: #fff;
              border: none;
              padding: 4px 10px;
              border-radius: 4px;
              cursor: pointer;
              font-size: 11px;
              font-weight: 600;
              width: 100%;
            "
          >
            Open Asset Details
          </button>
        </div>
      `;

      marker.bindPopup(popupHtml);

      marker.on("popupopen", () => {
        const btn = document.getElementById(`view-asset-${asset._id}`);
        if (btn) {
          btn.onclick = () => onOpenAsset(asset._id);
        }
      });

      markersRef.current.push(marker);
    });

    return () => {
      // cleanup markers on unmount
    };
  }, [assets]);

  return (
    <div>
      <div className="card-header" style={{ marginBottom: 12 }}>
        <div>
          <h2 style={{ fontSize: 18, color: "var(--primary-dark)" }}>
            GIS Infrastructure Asset Geo-Map
          </h2>
          <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Interactive geographical mapping of roads, bridges, culverts, and state buildings across Gujarat.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, fontSize: 12 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#10b981" }} /> Good
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#f59e0b" }} /> Fair
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444" }} /> Poor / Critical
          </span>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden", height: 600 }}>
        <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />
      </div>
    </div>
  );
}
