"use client";

import { Fragment, useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { KelpSite } from "@/lib/data";

interface Props {
  sites: KelpSite[];
  selectedSite: KelpSite | null;
  onSelectSite: (site: KelpSite) => void;
  overlays: {
    temperature: boolean;
    nutrients: boolean;
    depth: boolean;
    currents: boolean;
  };
  satellite: boolean;
}

function FlyToSite({ site }: { site: KelpSite | null }) {
  const map = useMap();
  useEffect(() => {
    if (site) map.flyTo([site.lat, site.lon], 10, { duration: 1.2 });
  }, [site, map]);
  return null;
}

export default function KelpMap({ sites, selectedSite, onSelectSite, overlays, satellite }: Props) {
  const getColor = (viability: string) => {
    if (viability === "high")     return "#06d6a0";
    if (viability === "moderate") return "#ffd166";
    return "#ef476f";
  };

  const getRadius = (score: number) => Math.max(6, score / 8);
  const overlayOpacity = 0.25;

  return (
    <MapContainer
      center={[12, 0]}
      zoom={2}
      style={{ height: "100%", width: "100%", borderRadius: "0.75rem" }}
      className="z-0"
    >
      {satellite ? (
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution='&copy; <a href="https://www.esri.com/">Esri World Imagery</a>'
        />
      ) : (
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />
      )}
      <FlyToSite site={selectedSite} />

      {sites.map((site) => (
        <Fragment key={`overlay-${site.id}`}>
          {overlays.temperature && (
            <CircleMarker
              center={[site.lat, site.lon]}
              radius={Math.max(8, site.sstScore / 3.5)}
              pathOptions={{ color: "#ff7f50", fillColor: "#ff7f50", fillOpacity: overlayOpacity, weight: 0 }}
            />
          )}
          {overlays.nutrients && (
            <CircleMarker
              center={[site.lat, site.lon]}
              radius={Math.max(8, site.nutrientScore / 3.5)}
              pathOptions={{ color: "#7dd56f", fillColor: "#7dd56f", fillOpacity: overlayOpacity, weight: 0 }}
            />
          )}
          {overlays.depth && (
            <CircleMarker
              center={[site.lat, site.lon]}
              radius={Math.max(8, site.depthScore / 3.5)}
              pathOptions={{ color: "#5dade2", fillColor: "#5dade2", fillOpacity: overlayOpacity, weight: 0 }}
            />
          )}
          {overlays.currents && (
            <CircleMarker
              center={[site.lat, site.lon]}
              radius={Math.max(8, site.currentScore / 3.5)}
              pathOptions={{ color: "#f5b041", fillColor: "#f5b041", fillOpacity: overlayOpacity, weight: 0 }}
            />
          )}
        </Fragment>
      ))}

      {sites.map((site) => (
        <CircleMarker
          key={site.id}
          center={[site.lat, site.lon]}
          radius={getRadius(site.score)}
          pathOptions={{
            color: getColor(site.viability),
            fillColor: getColor(site.viability),
            fillOpacity: selectedSite?.id === site.id ? 1 : 0.7,
            weight: selectedSite?.id === site.id ? 3 : 1.5,
          }}
          eventHandlers={{ click: () => onSelectSite(site) }}
        >
          <Popup className="kelp-popup">
            <div style={{
              background: "#0d2137",
              color: "#e8f4f8",
              borderRadius: "8px",
              padding: "12px",
              minWidth: "200px",
              fontFamily: "system-ui",
            }}>
              <div style={{ fontWeight: 700, fontSize: "14px", marginBottom: "8px", color: getColor(site.viability) }}>
                {site.name}
              </div>
              <div style={{ fontSize: "28px", fontWeight: 800, marginBottom: "4px" }}>
                {site.score}
                <span style={{ fontSize: "13px", fontWeight: 400, color: "#90e0ef", marginLeft: "4px" }}>/100</span>
              </div>
              <div style={{ fontSize: "12px", color: "#90e0ef", marginBottom: "10px" }}>Viability Score</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", fontSize: "12px" }}>
                <div>🌡️ SST: <strong>{site.sst}°C</strong></div>
                <div>📏 Depth: <strong>{site.depth}m</strong></div>
                <div>🌿 Chl: <strong>{site.chlorophyll} mg/m³</strong></div>
                <div>🌀 Current: <strong>{site.currentVelocity} m/s</strong></div>
                <div>📍 History: <strong>{site.historicalPresence ? "Yes" : "No"}</strong></div>
              </div>
              {site.riskFlags.length > 0 && (
                <div style={{ marginTop: "8px", borderTop: "1px solid #1a3a5c", paddingTop: "8px" }}>
                  {site.riskFlags.map((f) => (
                    <div key={f} style={{ fontSize: "11px", color: "#ffd166" }}>⚠ {f}</div>
                  ))}
                </div>
              )}
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
