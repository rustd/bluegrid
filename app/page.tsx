"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { SITES, REGIONS, STATS, KelpSite } from "@/lib/data";

const KelpMap = dynamic(() => import("@/components/KelpMap"), { ssr: false });

const VIABILITY_COLOR = {
  high:     { bg: "#06d6a0", text: "#050e1a", label: "High" },
  moderate: { bg: "#ffd166", text: "#050e1a", label: "Moderate" },
  low:      { bg: "#ef476f", text: "#fff",    label: "Low" },
};

function ScoreBar({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ background: "#1a3a5c", borderRadius: 99, height: 6, width: "100%" }}>
      <div style={{ background: color, borderRadius: 99, height: 6, width: `${value}%`, transition: "width 0.5s ease" }} />
    </div>
  );
}

function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent: string }) {
  return (
    <div className="glass rounded-xl p-4 flex flex-col gap-1" style={{ borderColor: accent + "33" }}>
      <div style={{ color: "#90e0ef", fontSize: 12, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</div>
      <div style={{ color: accent, fontSize: 32, fontWeight: 800, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ color: "#5e8fa8", fontSize: 12 }}>{sub}</div>}
    </div>
  );
}

export default function Home() {
  const [selectedRegion, setSelectedRegion] = useState("All Regions");
  const [minScore, setMinScore] = useState(0);
  const [selectedSite, setSelectedSite] = useState<KelpSite | null>(null);

  const filtered = useMemo(() =>
    SITES.filter((s) =>
      (selectedRegion === "All Regions" || s.region === selectedRegion) &&
      s.score >= minScore
    ), [selectedRegion, minScore]);

  const highCount  = filtered.filter((s) => s.viability === "high").length;
  const midCount   = filtered.filter((s) => s.viability === "moderate").length;

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #050e1a 0%, #0a1628 60%, #0d2137 100%)" }}>

      {/* ── HEADER ── */}
      <header style={{
        borderBottom: "1px solid #1a3a5c",
        padding: "16px 28px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "rgba(5,14,26,0.85)",
        backdropFilter: "blur(12px)",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: "linear-gradient(135deg, #06d6a0, #00b4d8)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20,
          }}>🌿</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 20, letterSpacing: "-0.02em", color: "#e8f4f8" }}>
              BlueGrid
            </div>
            <div style={{ fontSize: 11, color: "#5e8fa8", marginTop: 1 }}>
              Kelp Restoration Intelligence Platform
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={() => document.getElementById("dashboard")?.scrollIntoView({ behavior: "smooth" })}
            style={{
              fontSize: 13, fontWeight: 700, padding: "10px 20px", borderRadius: 10,
              background: "linear-gradient(135deg, #06d6a0, #00b4d8)", color: "#050e1a",
              border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
              boxShadow: "0 4px 14px rgba(6, 214, 160, 0.35)",
            }}
          >
            ⬡ Analyze Sites
          </button>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: "4px 10px",
            borderRadius: 99, border: "1px solid #1a3a5c", color: "#90e0ef"
          }}>NOAA CoastWatch</span>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: "4px 10px",
            borderRadius: 99, border: "1px solid #1a3a5c", color: "#90e0ef"
          }}>KelpWatch</span>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 99,
            background: "linear-gradient(135deg, #06d6a0, #00b4d8)", color: "#050e1a"
          }}>× Blue Frontier</span>
        </div>
      </header>

      {/* ── STATS BAR ── */}
      <div id="dashboard" style={{ padding: "20px 28px 0", display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
        <StatCard label="California Kelp Lost" value="97%" sub="Since 1980s baseline" accent="#ef476f" />
        <StatCard label="Sites Analyzed" value={filtered.length} sub={`of ${STATS.totalSites} total sites`} accent="#00b4d8" />
        <StatCard label="High-Viability Sites" value={highCount} sub={`${midCount} moderate · filtered view`} accent="#06d6a0" />
        <StatCard label="Top Site Score" value={`${filtered[0]?.score ?? "--"}/100`} sub={filtered[0]?.name ?? ""} accent="#ffd166" />
      </div>

      {/* ── MAIN CONTENT ── */}
      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 16, padding: "16px 28px", height: "calc(100vh - 220px)" }}>

        {/* ── SIDEBAR ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, overflowY: "auto" }}>

          {/* Filters */}
          <div className="glass rounded-xl p-4">
            <div style={{ fontSize: 11, fontWeight: 600, color: "#90e0ef", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
              Filters
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: "#5e8fa8", display: "block", marginBottom: 6 }}>Coastal Region</label>
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                style={{
                  width: "100%", padding: "8px 10px", borderRadius: 8,
                  background: "#0a1628", border: "1px solid #1a3a5c",
                  color: "#e8f4f8", fontSize: 13, cursor: "pointer",
                }}
              >
                {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: "#5e8fa8", display: "block", marginBottom: 6 }}>
                Min. Viability Score: <span style={{ color: "#06d6a0", fontWeight: 700 }}>{minScore}</span>
              </label>
              <input
                type="range" min={0} max={90} step={5} value={minScore}
                onChange={(e) => setMinScore(Number(e.target.value))}
                style={{ width: "100%", accentColor: "#06d6a0" }}
              />
            </div>
          </div>

          {/* Legend */}
          <div className="glass rounded-xl p-4">
            <div style={{ fontSize: 11, fontWeight: 600, color: "#90e0ef", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
              Legend
            </div>
            {(["high", "moderate", "low"] as const).map((v) => (
              <div key={v} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: VIABILITY_COLOR[v].bg, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: "#90e0ef" }}>{VIABILITY_COLOR[v].label} Viability</span>
                <span style={{ fontSize: 11, color: "#5e8fa8", marginLeft: "auto" }}>
                  {v === "high" ? "≥70" : v === "moderate" ? "45–69" : "<45"}
                </span>
              </div>
            ))}
          </div>

          {/* Top Sites */}
          <div className="glass rounded-xl p-4" style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#90e0ef", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
              Top Sites
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filtered.slice(0, 6).map((site, i) => {
                const c = VIABILITY_COLOR[site.viability];
                const isSelected = selectedSite?.id === site.id;
                return (
                  <div
                    key={site.id}
                    onClick={() => setSelectedSite(isSelected ? null : site)}
                    style={{
                      padding: "10px 12px", borderRadius: 10, cursor: "pointer",
                      border: `1px solid ${isSelected ? c.bg + "80" : "#1a3a5c"}`,
                      background: isSelected ? c.bg + "15" : "transparent",
                      transition: "all 0.2s",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ color: "#5e8fa8", fontSize: 11, fontWeight: 700 }}>#{i + 1}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#e8f4f8" }}>{site.name}</span>
                      </div>
                      <span style={{
                        fontSize: 13, fontWeight: 800, color: c.bg,
                        background: c.bg + "20", padding: "2px 8px", borderRadius: 6,
                      }}>{site.score}</span>
                    </div>
                    <ScoreBar value={site.score} color={c.bg} />
                    <div style={{ fontSize: 11, color: "#5e8fa8", marginTop: 4 }}>
                      {site.sst}°C · {site.depth}m · {site.region}
                    </div>
                    {site.riskFlags.length > 0 && (
                      <div style={{ fontSize: 10, color: "#ffd166", marginTop: 3 }}>⚠ {site.riskFlags[0]}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── MAP ── */}
        <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid #1a3a5c", position: "relative" }}>
          <KelpMap sites={filtered} selectedSite={selectedSite} onSelectSite={(s) => setSelectedSite(selectedSite?.id === s.id ? null : s)} />

          {/* Map overlay — selected site detail */}
          {selectedSite && (
            <div style={{
              position: "absolute", bottom: 16, right: 16, zIndex: 1000,
              background: "rgba(13,33,55,0.95)", backdropFilter: "blur(16px)",
              border: `1px solid ${VIABILITY_COLOR[selectedSite.viability].bg}40`,
              borderRadius: 14, padding: "16px 18px", minWidth: 240,
              boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#e8f4f8" }}>{selectedSite.name}</div>
                  <div style={{ fontSize: 11, color: "#5e8fa8" }}>{selectedSite.region}</div>
                </div>
                <div style={{
                  fontSize: 22, fontWeight: 900, color: VIABILITY_COLOR[selectedSite.viability].bg,
                  lineHeight: 1,
                }}>{selectedSite.score}<span style={{ fontSize: 11, fontWeight: 400, color: "#5e8fa8" }}>/100</span></div>
              </div>
              <div style={{ height: 1, background: "#1a3a5c", margin: "12px 0" }} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12 }}>
                {[
                  { label: "SST Score", value: selectedSite.sstScore, icon: "🌡️" },
                  { label: "Depth Score", value: selectedSite.depthScore, icon: "📏" },
                  { label: "History Score", value: selectedSite.historyScore, icon: "📜" },
                  { label: "Nutrient Score", value: selectedSite.nutrientScore, icon: "🌿" },
                ].map((item) => (
                  <div key={item.label}>
                    <div style={{ color: "#5e8fa8", fontSize: 10, marginBottom: 3 }}>{item.icon} {item.label}</div>
                    <ScoreBar value={item.value} color={VIABILITY_COLOR[selectedSite.viability].bg} />
                    <div style={{ color: "#90e0ef", fontSize: 11, marginTop: 2 }}>{item.value}/100</div>
                  </div>
                ))}
              </div>
              {selectedSite.riskFlags.length > 0 && (
                <div style={{ marginTop: 10, padding: "8px 10px", borderRadius: 8, background: "#ffd16615", border: "1px solid #ffd16630" }}>
                  {selectedSite.riskFlags.map((f) => (
                    <div key={f} style={{ fontSize: 11, color: "#ffd166" }}>⚠ {f}</div>
                  ))}
                </div>
              )}
              <button
                onClick={() => setSelectedSite(null)}
                style={{
                  marginTop: 10, width: "100%", padding: "6px", borderRadius: 8,
                  background: "transparent", border: "1px solid #1a3a5c",
                  color: "#5e8fa8", fontSize: 11, cursor: "pointer",
                }}
              >Close</button>
            </div>
          )}
        </div>
      </div>

      {/* ── RANKED TABLE ── */}
      <div style={{ padding: "0 28px 28px" }}>
        <div className="glass rounded-xl" style={{ overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #1a3a5c", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#e8f4f8" }}>
              All Candidate Sites — Ranked by Viability Score
            </div>
            <div style={{ fontSize: 12, color: "#5e8fa8" }}>{filtered.length} sites · California Coast</div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #1a3a5c" }}>
                  {["Rank", "Site", "Region", "Score", "SST (°C)", "Depth (m)", "Chlorophyll", "Historical", "Viability", "Risk Flags"].map((h) => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "#5e8fa8", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((site, i) => {
                  const c = VIABILITY_COLOR[site.viability];
                  const isSelected = selectedSite?.id === site.id;
                  return (
                    <tr
                      key={site.id}
                      onClick={() => setSelectedSite(isSelected ? null : site)}
                      style={{
                        borderBottom: "1px solid #0d2137",
                        background: isSelected ? c.bg + "10" : i % 2 === 0 ? "transparent" : "#0a162810",
                        cursor: "pointer",
                        transition: "background 0.15s",
                      }}
                    >
                      <td style={{ padding: "10px 14px", color: "#5e8fa8", fontWeight: 700 }}>#{i + 1}</td>
                      <td style={{ padding: "10px 14px", color: "#e8f4f8", fontWeight: 600 }}>{site.name}</td>
                      <td style={{ padding: "10px 14px", color: "#90e0ef" }}>{site.region}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <span style={{
                          color: c.bg, fontWeight: 800, fontSize: 14,
                          background: c.bg + "20", padding: "3px 10px", borderRadius: 6,
                        }}>{site.score}</span>
                      </td>
                      <td style={{ padding: "10px 14px", color: site.sst > 15 ? "#ef476f" : "#e8f4f8" }}>{site.sst}</td>
                      <td style={{ padding: "10px 14px", color: "#e8f4f8" }}>{site.depth}</td>
                      <td style={{ padding: "10px 14px", color: "#e8f4f8" }}>{site.chlorophyll}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <span style={{ color: site.historicalPresence ? "#06d6a0" : "#5e8fa8" }}>
                          {site.historicalPresence ? "✓ Yes" : "✗ No"}
                        </span>
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99,
                          background: c.bg + "25", color: c.bg,
                        }}>{c.label}</span>
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        {site.riskFlags.length > 0
                          ? <span style={{ color: "#ffd166", fontSize: 11 }}>⚠ {site.riskFlags.join(" · ")}</span>
                          : <span style={{ color: "#06d6a0", fontSize: 11 }}>✓ Clear</span>
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
