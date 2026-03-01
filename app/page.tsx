"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { FALLBACK_SITES, KelpSite, STATS } from "@/lib/data";

const KelpMap = dynamic(() => import("@/components/KelpMap"), { ssr: false });

const VIABILITY_COLOR = {
  high: { bg: "#06d6a0", text: "#050e1a", label: "High" },
  moderate: { bg: "#ffd166", text: "#050e1a", label: "Moderate" },
  low: { bg: "#ef476f", text: "#fff", label: "Low" },
};

type ApiPayload = {
  sites: KelpSite[];
  generatedAt: string;
  degraded?: boolean;
  sources?: Record<string, string>;
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
    <div className="glass rounded-xl p-4 flex flex-col gap-1" style={{ borderColor: `${accent}33` }}>
      <div style={{ color: "#90e0ef", fontSize: 12, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</div>
      <div style={{ color: accent, fontSize: 32, fontWeight: 800, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ color: "#5e8fa8", fontSize: 12 }}>{sub}</div>}
    </div>
  );
}

export default function Home() {
  const [sites, setSites] = useState<KelpSite[]>(FALLBACK_SITES);
  const [selectedRegion, setSelectedRegion] = useState("All Regions");
  const [minScore, setMinScore] = useState(0);
  const [selectedSite, setSelectedSite] = useState<KelpSite | null>(null);
  const [satellite, setSatellite] = useState(true);
  const [overlays, setOverlays] = useState({ temperature: true, nutrients: true, depth: true, currents: true });

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const res = await fetch("/api/kelp-sites", { cache: "no-store" });
        if (!res.ok) return;
        const payload = (await res.json()) as ApiPayload;
        if (!active || !payload?.sites?.length) return;
        setSites(payload.sites);
      } catch {}
    }
    load();
    const interval = setInterval(load, 60 * 60 * 1000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const regions = useMemo(
    () => ["All Regions", ...Array.from(new Set(sites.map((s) => s.region)))],
    [sites],
  );

  const filtered = useMemo(
    () =>
      sites
        .filter((s) => (selectedRegion === "All Regions" || s.region === selectedRegion) && s.score >= minScore)
        .sort((a, b) => b.score - a.score),
    [sites, selectedRegion, minScore],
  );

  const highCount = filtered.filter((s) => s.viability === "high").length;
  const midCount = filtered.filter((s) => s.viability === "moderate").length;

  useEffect(() => {
    if (selectedSite && !filtered.find((site) => site.id === selectedSite.id)) {
      setSelectedSite(null);
    }
  }, [filtered, selectedSite]);

  const trendData = useMemo(() => {
    if (!selectedSite) return [];
    return selectedSite.trend.map((p) => ({
      date: p.date.slice(5),
      observedSst: p.observedSst,
      predictedSst: p.predictedSst,
      predictedViability: p.predictedViability || null,
    }));
  }, [selectedSite]);

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #050e1a 0%, #0a1628 60%, #0d2137 100%)" }}>
      <header
        style={{
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
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: "linear-gradient(135deg, #06d6a0, #00b4d8)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
            }}
          >
            🌿
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 20, letterSpacing: "-0.02em", color: "#e8f4f8" }}>BlueGrid</div>
            <div style={{ fontSize: 11, color: "#5e8fa8", marginTop: 1 }}>Kelp Restoration: Months → Seconds</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 99, border: "1px solid #1a3a5c", color: "#90e0ef" }}>NOAA</span>
          <span style={{ fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 99, border: "1px solid #1a3a5c", color: "#90e0ef" }}>KelpWatch</span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: "4px 10px",
              borderRadius: 99,
              background: "linear-gradient(135deg, #06d6a0, #00b4d8)",
              color: "#050e1a",
            }}
          >
            × Blue Frontier
          </span>
        </div>
      </header>

      <div id="dashboard" style={{ padding: "20px 28px 0", display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
        <StatCard label="Global Kelp Stress" value="97%" sub="Severe declines in multiple regions" accent="#ef476f" />
        <StatCard label="Sites Analyzed" value={filtered.length} sub={`of ${sites.length || STATS.totalSites} total sites`} accent="#00b4d8" />
        <StatCard label="High-Viability Sites" value={highCount} sub={`${midCount} moderate · filtered view`} accent="#06d6a0" />
        <StatCard label="Top Site Score" value={`${filtered[0]?.score ?? "--"}/100`} sub={filtered[0]?.name ?? ""} accent="#ffd166" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 16, padding: "16px 28px", height: "calc(100vh - 270px)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, overflowY: "auto" }}>
          <div className="glass rounded-xl p-4">
            <div style={{ fontSize: 11, fontWeight: 600, color: "#90e0ef", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Filters</div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: "#5e8fa8", display: "block", marginBottom: 6 }}>Coastal Region</label>
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, background: "#0a1628", border: "1px solid #1a3a5c", color: "#e8f4f8", fontSize: 13, cursor: "pointer" }}
              >
                {regions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 12, color: "#5e8fa8", display: "block", marginBottom: 6 }}>
                Min. Viability Score: <span style={{ color: "#06d6a0", fontWeight: 700 }}>{minScore}</span>
              </label>
              <input type="range" min={0} max={90} step={5} value={minScore} onChange={(e) => setMinScore(Number(e.target.value))} style={{ width: "100%", accentColor: "#06d6a0" }} />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#90e0ef" }}>
                <input type="checkbox" checked={satellite} onChange={(e) => setSatellite(e.target.checked)} /> Satellite imagery basemap
              </label>
            </div>
            <div style={{ borderTop: "1px solid #1a3a5c", paddingTop: 8 }}>
              <div style={{ fontSize: 11, color: "#5e8fa8", marginBottom: 6 }}>GIS overlays</div>
              {[
                ["temperature", "Temperature"],
                ["nutrients", "Nutrients"],
                ["depth", "Depth"],
                ["currents", "Currents"],
              ].map(([key, label]) => (
                <label key={key} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#90e0ef", marginBottom: 4 }}>
                  <input
                    type="checkbox"
                    checked={overlays[key as keyof typeof overlays]}
                    onChange={(e) => setOverlays((prev) => ({ ...prev, [key]: e.target.checked }))}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <div className="glass rounded-xl p-4">
            <div style={{ fontSize: 11, fontWeight: 600, color: "#90e0ef", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Legend</div>
            {(["high", "moderate", "low"] as const).map((v) => (
              <div key={v} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: VIABILITY_COLOR[v].bg, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: "#90e0ef" }}>{VIABILITY_COLOR[v].label} Viability</span>
                <span style={{ fontSize: 11, color: "#5e8fa8", marginLeft: "auto" }}>{v === "high" ? "≥70" : v === "moderate" ? "45–69" : "<45"}</span>
              </div>
            ))}
          </div>

          <div className="glass rounded-xl p-4" style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#90e0ef", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Top Sites</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filtered.slice(0, 6).map((site, i) => {
                const c = VIABILITY_COLOR[site.viability];
                const isSelected = selectedSite?.id === site.id;
                return (
                  <div
                    key={site.id}
                    onClick={() => setSelectedSite(isSelected ? null : site)}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 10,
                      cursor: "pointer",
                      border: `1px solid ${isSelected ? `${c.bg}80` : "#1a3a5c"}`,
                      background: isSelected ? `${c.bg}15` : "transparent",
                      transition: "all 0.2s",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ color: "#5e8fa8", fontSize: 11, fontWeight: 700 }}>#{i + 1}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#e8f4f8" }}>{site.name}</span>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 800, color: c.bg, background: `${c.bg}20`, padding: "2px 8px", borderRadius: 6 }}>{site.score}</span>
                    </div>
                    <ScoreBar value={site.score} color={c.bg} />
                    <div style={{ fontSize: 11, color: "#5e8fa8", marginTop: 4 }}>
                      {site.sst}°C · {site.currentVelocity} m/s · {site.region}
                    </div>
                    {site.riskFlags.length > 0 && <div style={{ fontSize: 10, color: "#ffd166", marginTop: 3 }}>⚠ {site.riskFlags[0]}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid #1a3a5c", position: "relative" }}>
          <KelpMap
            sites={filtered}
            selectedSite={selectedSite}
            onSelectSite={(s) => setSelectedSite(selectedSite?.id === s.id ? null : s)}
            overlays={overlays}
            satellite={satellite}
          />

          {selectedSite && (
            <div
              style={{
                position: "absolute",
                bottom: 16,
                right: 16,
                zIndex: 1000,
                background: "rgba(13,33,55,0.95)",
                backdropFilter: "blur(16px)",
                border: `1px solid ${VIABILITY_COLOR[selectedSite.viability].bg}40`,
                borderRadius: 14,
                padding: "16px 18px",
                minWidth: 260,
                boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#e8f4f8" }}>{selectedSite.name}</div>
                  <div style={{ fontSize: 11, color: "#5e8fa8" }}>{selectedSite.region}</div>
                </div>
                <div style={{ fontSize: 22, fontWeight: 900, color: VIABILITY_COLOR[selectedSite.viability].bg, lineHeight: 1 }}>
                  {selectedSite.score}
                  <span style={{ fontSize: 11, fontWeight: 400, color: "#5e8fa8" }}>/100</span>
                </div>
              </div>
              <div style={{ height: 1, background: "#1a3a5c", margin: "12px 0" }} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12 }}>
                {[
                  { label: "SST", value: selectedSite.sstScore, icon: "🌡️" },
                  { label: "Depth", value: selectedSite.depthScore, icon: "📏" },
                  { label: "History", value: selectedSite.historyScore, icon: "📜" },
                  { label: "Nutrients", value: selectedSite.nutrientScore, icon: "🌿" },
                  { label: "Currents", value: selectedSite.currentScore, icon: "🌀" },
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
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: "0 28px 14px" }}>
        <div className="glass rounded-xl" style={{ overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #1a3a5c", fontSize: 13, fontWeight: 700, color: "#e8f4f8" }}>
            Historical Trend + Predictive Viability Overlay {selectedSite ? `— ${selectedSite.name}` : ""}
          </div>
          <div style={{ height: 220, padding: "8px 10px 10px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <XAxis dataKey="date" stroke="#5e8fa8" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="temp" stroke="#90e0ef" tick={{ fontSize: 11 }} domain={[8, 20]} />
                <YAxis yAxisId="score" orientation="right" stroke="#06d6a0" tick={{ fontSize: 11 }} domain={[0, 100]} />
                <Tooltip contentStyle={{ background: "#0d2137", border: "1px solid #1a3a5c", color: "#e8f4f8" }} />
                <Line yAxisId="temp" type="monotone" dataKey="observedSst" stroke="#5dade2" dot={false} strokeWidth={2} name="Observed SST" />
                <Line yAxisId="temp" type="monotone" dataKey="predictedSst" stroke="#ffd166" dot={false} strokeWidth={2} name="Predicted SST" />
                <Line yAxisId="score" type="monotone" dataKey="predictedViability" stroke="#06d6a0" dot={false} strokeWidth={2} name="Predicted Viability" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div style={{ padding: "0 28px 28px" }}>
        <div className="glass rounded-xl" style={{ overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #1a3a5c", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#e8f4f8" }}>All Candidate Sites — Ranked by Viability Score</div>
            <div style={{ fontSize: 12, color: "#5e8fa8" }}>{filtered.length} sites · Global Coastlines</div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #1a3a5c" }}>
                  {["Rank", "Site", "Region", "Score", "SST (°C)", "Current (m/s)", "Depth (m)", "Chlorophyll", "Historical", "Viability", "Risk Flags"].map((h) => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "#5e8fa8", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
                      {h}
                    </th>
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
                        background: isSelected ? `${c.bg}10` : i % 2 === 0 ? "transparent" : "#0a162810",
                        cursor: "pointer",
                        transition: "background 0.15s",
                      }}
                    >
                      <td style={{ padding: "10px 14px", color: "#5e8fa8", fontWeight: 700 }}>#{i + 1}</td>
                      <td style={{ padding: "10px 14px", color: "#e8f4f8", fontWeight: 600 }}>{site.name}</td>
                      <td style={{ padding: "10px 14px", color: "#90e0ef" }}>{site.region}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <span style={{ color: c.bg, fontWeight: 800, fontSize: 14, background: `${c.bg}20`, padding: "3px 10px", borderRadius: 6 }}>{site.score}</span>
                      </td>
                      <td style={{ padding: "10px 14px", color: site.sst > 15 ? "#ef476f" : "#e8f4f8" }}>{site.sst}</td>
                      <td style={{ padding: "10px 14px", color: "#e8f4f8" }}>{site.currentVelocity}</td>
                      <td style={{ padding: "10px 14px", color: "#e8f4f8" }}>{site.depth}</td>
                      <td style={{ padding: "10px 14px", color: "#e8f4f8" }}>{site.chlorophyll}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <span style={{ color: site.historicalPresence ? "#06d6a0" : "#5e8fa8" }}>{site.historicalPresence ? "✓ Yes" : "✗ No"}</span>
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: `${c.bg}25`, color: c.bg }}>{c.label}</span>
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        {site.riskFlags.length > 0 ? (
                          <span style={{ color: "#ffd166", fontSize: 11 }}>⚠ {site.riskFlags.join(" · ")}</span>
                        ) : (
                          <span style={{ color: "#06d6a0", fontSize: 11 }}>✓ Clear</span>
                        )}
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
