export interface SiteObservation {
  sst: number;
  chlorophyll: number;
  currentVelocity: number;
}

export interface TrendPoint {
  date: string;
  observedSst: number | null;
  predictedSst: number | null;
  predictedViability: number;
}

export interface KelpSite {
  id: string;
  name: string;
  region: string;
  lat: number;
  lon: number;
  sst: number;
  depth: number;
  historicalPresence: boolean;
  chlorophyll: number;
  currentVelocity: number;
  score: number;
  sstScore: number;
  depthScore: number;
  historyScore: number;
  nutrientScore: number;
  currentScore: number;
  riskFlags: string[];
  viability: "high" | "moderate" | "low";
  trend: TrendPoint[];
  sources: {
    temperature: string;
    nutrients: string;
    currents: string;
    depth: string;
    historical: string;
  };
  updatedAt: string;
}

export interface CandidateSite {
  id: string;
  name: string;
  region: string;
  lat: number;
  lon: number;
  depth: number;
  historicalPresence: boolean;
  baselineChlorophyll: number;
  noaaStationId?: string;
}

export const DATA_SOURCES = {
  noaaCoops: "https://api.tidesandcurrents.noaa.gov/api/prod/datagetter",
  noaaCoastWatch: "https://coastwatch.noaa.gov/erddap/",
  openMeteoMarine: "https://marine-api.open-meteo.com/v1/marine",
  gebcoBathymetry: "https://www.gebco.net/",
  kelpWatch: "https://kelpwatch.org/",
  satelliteBasemap: "https://www.esri.com/en-us/arcgis/products/arcgis-living-atlas",
};

function scoreSST(sst: number): number {
  if (sst < 8) return 10;
  if (sst < 10) return 10 + (sst - 8) * 30;
  if (sst <= 15) return Math.round(100 - Math.abs(sst - 12.5) * 10);
  if (sst <= 18) return Math.max(0, Math.round(75 - (sst - 15) * 22));
  return 0;
}

function scoreDepth(depth: number): number {
  if (depth < 3) return 10;
  if (depth < 5) return 50;
  if (depth <= 30) return 100;
  if (depth <= 40) return Math.round(100 - (depth - 30) * 3);
  return 50;
}

function scoreHistory(present: boolean): number {
  return present ? 100 : 20;
}

function scoreChlorophyll(chl: number): number {
  if (chl < 1) return 10;
  if (chl < 2) return 30;
  if (chl < 4) return 60;
  if (chl < 6) return 85;
  return 100;
}

function scoreCurrent(currentVelocity: number): number {
  if (currentVelocity < 0.05) return 30;
  if (currentVelocity <= 0.6) return 100;
  if (currentVelocity <= 1.0) return Math.round(100 - (currentVelocity - 0.6) * 90);
  return 30;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getRiskFlags(site: {
  sst: number;
  depth: number;
  historicalPresence: boolean;
  chlorophyll: number;
  currentVelocity: number;
  trend: TrendPoint[];
}): string[] {
  const flags: string[] = [];
  const future = site.trend.filter((p) => p.predictedSst !== null).map((p) => p.predictedSst as number);
  const futureMax = future.length > 0 ? Math.max(...future) : null;

  if (site.sst > 16) flags.push("High SST");
  else if (site.sst > 15) flags.push("Warming Risk");
  if (!site.historicalPresence) flags.push("No Historic Record");
  if (site.depth > 35) flags.push("Depth Marginal");
  if (site.chlorophyll < 2) flags.push("Low Nutrients");
  if (site.currentVelocity > 1.0) flags.push("Strong Current Exposure");
  if (site.currentVelocity < 0.05) flags.push("Low Water Exchange");
  if (futureMax !== null && futureMax > 16.5) flags.push("Forecast Heat Stress");
  return flags;
}

export function computeViability(score: number): "high" | "moderate" | "low" {
  if (score >= 70) return "high";
  if (score >= 45) return "moderate";
  return "low";
}

export function buildSite(
  candidate: CandidateSite,
  observation: SiteObservation,
  trend: TrendPoint[],
  sourceLabels: KelpSite["sources"],
): KelpSite {
  const ss = scoreSST(observation.sst);
  const ds = scoreDepth(candidate.depth);
  const hs = scoreHistory(candidate.historicalPresence);
  const ns = scoreChlorophyll(observation.chlorophyll);
  const cs = scoreCurrent(observation.currentVelocity);
  const score = Math.round(ss * 0.3 + ds * 0.2 + hs * 0.2 + ns * 0.15 + cs * 0.15);
  const safeScore = clamp(score, 0, 100);

  return {
    id: candidate.id,
    name: candidate.name,
    region: candidate.region,
    lat: candidate.lat,
    lon: candidate.lon,
    sst: Number(observation.sst.toFixed(2)),
    depth: candidate.depth,
    historicalPresence: candidate.historicalPresence,
    chlorophyll: Number(observation.chlorophyll.toFixed(2)),
    currentVelocity: Number(observation.currentVelocity.toFixed(2)),
    score: safeScore,
    sstScore: ss,
    depthScore: ds,
    historyScore: hs,
    nutrientScore: ns,
    currentScore: cs,
    riskFlags: getRiskFlags({
      sst: observation.sst,
      depth: candidate.depth,
      historicalPresence: candidate.historicalPresence,
      chlorophyll: observation.chlorophyll,
      currentVelocity: observation.currentVelocity,
      trend,
    }),
    viability: computeViability(safeScore),
    trend,
    sources: sourceLabels,
    updatedAt: new Date().toISOString(),
  };
}

export const CANDIDATE_SITES: CandidateSite[] = [
  { id: "US_CA_MN", name: "Monterey Bay Shelf", region: "Northeast Pacific", lat: 36.7, lon: -122.0, depth: 20, historicalPresence: true, baselineChlorophyll: 5.8, noaaStationId: "9413450" },
  { id: "US_CA_PR", name: "Point Reyes Shelf", region: "Northeast Pacific", lat: 38.0, lon: -122.9, depth: 16, historicalPresence: true, baselineChlorophyll: 4.7, noaaStationId: "9414290" },
  { id: "US_AK_AD", name: "Adak Island Coast", region: "North Pacific Rim", lat: 51.88, lon: -176.64, depth: 24, historicalPresence: true, baselineChlorophyll: 3.9 },
  { id: "CA_BC_HA", name: "Haida Gwaii West", region: "North Pacific Rim", lat: 53.25, lon: -132.1, depth: 18, historicalPresence: true, baselineChlorophyll: 4.2 },
  { id: "CA_BC_VI", name: "Vancouver Island Outer", region: "North Pacific Rim", lat: 49.35, lon: -126.2, depth: 22, historicalPresence: true, baselineChlorophyll: 4.5 },
  { id: "MX_BCS_SC", name: "Pacific Baja Norte", region: "Eastern Pacific", lat: 30.2, lon: -116.2, depth: 17, historicalPresence: true, baselineChlorophyll: 2.9 },
  { id: "CL_COQ_LS", name: "La Serena Coast", region: "Southeast Pacific", lat: -29.9, lon: -71.35, depth: 14, historicalPresence: true, baselineChlorophyll: 2.6 },
  { id: "CL_VAL_CE", name: "Central Chile Shelf", region: "Southeast Pacific", lat: -33.1, lon: -71.8, depth: 19, historicalPresence: true, baselineChlorophyll: 3.0 },
  { id: "AR_TI_UH", name: "Ushuaia Channel Mouth", region: "South Atlantic Fringe", lat: -54.9, lon: -68.35, depth: 16, historicalPresence: true, baselineChlorophyll: 2.3 },
  { id: "ZA_WC_CT", name: "Cape Town Kelp Belt", region: "South Atlantic", lat: -34.3, lon: 18.3, depth: 15, historicalPresence: true, baselineChlorophyll: 2.5 },
  { id: "NA_WB_WB", name: "Walvis Bay Shelf", region: "Southeast Atlantic", lat: -22.9, lon: 14.2, depth: 12, historicalPresence: false, baselineChlorophyll: 1.9 },
  { id: "NO_LO_TR", name: "Lofoten Margin", region: "North Atlantic", lat: 68.1, lon: 13.6, depth: 26, historicalPresence: true, baselineChlorophyll: 2.1 },
  { id: "UK_SC_IO", name: "Inner Hebrides", region: "North Atlantic", lat: 56.45, lon: -6.1, depth: 18, historicalPresence: true, baselineChlorophyll: 2.4 },
  { id: "ES_GA_CO", name: "Galicia Atlantic Shelf", region: "Northeast Atlantic", lat: 42.6, lon: -9.2, depth: 20, historicalPresence: false, baselineChlorophyll: 2.2 },
  { id: "PT_AZ_FA", name: "Azores Volcanic Shelf", region: "Northeast Atlantic", lat: 38.55, lon: -28.65, depth: 24, historicalPresence: false, baselineChlorophyll: 1.8 },
  { id: "JP_HK_NE", name: "Hokkaido East Coast", region: "Northwest Pacific", lat: 43.5, lon: 145.1, depth: 19, historicalPresence: true, baselineChlorophyll: 3.3 },
  { id: "KR_JJ_SW", name: "Jeju Southwest", region: "Northwest Pacific", lat: 33.1, lon: 126.1, depth: 14, historicalPresence: false, baselineChlorophyll: 1.7 },
  { id: "AU_TAS_SE", name: "Tasmania Southeast", region: "Southern Ocean Fringe", lat: -43.3, lon: 147.9, depth: 21, historicalPresence: true, baselineChlorophyll: 2.7 },
  { id: "NZ_SI_FV", name: "Foveaux Strait", region: "Southern Ocean Fringe", lat: -46.65, lon: 168.1, depth: 18, historicalPresence: true, baselineChlorophyll: 2.4 },
  { id: "AU_WA_AB", name: "Albany Coast", region: "Indian Ocean", lat: -35.1, lon: 117.9, depth: 16, historicalPresence: false, baselineChlorophyll: 1.8 },
  { id: "AU_SA_KI", name: "Kangaroo Island West", region: "Indian Ocean", lat: -35.9, lon: 136.4, depth: 22, historicalPresence: true, baselineChlorophyll: 2.2 },
  { id: "MA_AT_ES", name: "Essaouira Upwelling Edge", region: "Northeast Atlantic", lat: 31.5, lon: -9.9, depth: 13, historicalPresence: false, baselineChlorophyll: 2.0 },
];

function fallbackTrend(sst: number): TrendPoint[] {
  const trend: TrendPoint[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setUTCDate(now.getUTCDate() - i);
    trend.push({
      date: d.toISOString().slice(0, 10),
      observedSst: Number((sst + Math.sin(i / 5) * 0.5).toFixed(2)),
      predictedSst: null,
      predictedViability: 0,
    });
  }
  for (let i = 1; i <= 7; i += 1) {
    const d = new Date(now);
    d.setUTCDate(now.getUTCDate() + i);
    const predicted = Number((sst + i * 0.06).toFixed(2));
    trend.push({
      date: d.toISOString().slice(0, 10),
      observedSst: null,
      predictedSst: predicted,
      predictedViability: scoreSST(predicted),
    });
  }
  return trend;
}

export const FALLBACK_SITES: KelpSite[] = CANDIDATE_SITES.map((candidate) =>
  buildSite(
    candidate,
    {
      sst: 12 + (40 - candidate.lat) * 0.24,
      chlorophyll: candidate.baselineChlorophyll,
      currentVelocity: 0.35 + ((candidate.lat + 130) % 4) * 0.1,
    },
    fallbackTrend(12 + (40 - candidate.lat) * 0.24),
    {
      temperature: "Fallback climatology (NOAA unavailable)",
      nutrients: "Baseline chlorophyll profile (CoastWatch proxy)",
      currents: "Fallback marine climatology (Open-Meteo unavailable)",
      depth: "GEBCO static depth lookup",
      historical: "KelpWatch historical canopy presence",
    },
  ),
).sort((a, b) => b.score - a.score);

export const STATS = {
  totalSites: FALLBACK_SITES.length,
  highViability: FALLBACK_SITES.filter((s) => s.viability === "high").length,
  topScore: FALLBACK_SITES[0].score,
  topSite: FALLBACK_SITES[0].name,
  kelpLostPercent: 97,
};
