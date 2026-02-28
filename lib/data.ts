export interface KelpSite {
  id: string;
  name: string;
  region: string;
  lat: number;
  lon: number;
  sst: number;           // Sea Surface Temp °C
  depth: number;         // meters
  historicalPresence: boolean;
  chlorophyll: number;   // mg/m³ (nutrient proxy)
  score: number;
  sstScore: number;
  depthScore: number;
  historyScore: number;
  nutrientScore: number;
  riskFlags: string[];
  viability: "high" | "moderate" | "low";
}

// --- Scoring functions ---
function scoreSST(sst: number): number {
  // Giant kelp (Macrocystis pyrifera) optimal: 10–15°C, peak at 12.5°C
  if (sst < 8)  return 10;
  if (sst < 10) return 10 + (sst - 8) * 30;
  if (sst <= 15) return Math.round(100 - Math.abs(sst - 12.5) * 10);
  if (sst <= 18) return Math.max(0, Math.round(75 - (sst - 15) * 22));
  return 0;
}

function scoreDepth(depth: number): number {
  if (depth < 3)  return 10;
  if (depth < 5)  return 50;
  if (depth <= 30) return 100;
  if (depth <= 40) return Math.round(100 - (depth - 30) * 3);
  return 50;
}

function scoreHistory(present: boolean): number {
  return present ? 100 : 15;
}

function scoreChlorophyll(chl: number): number {
  if (chl < 1)  return 10;
  if (chl < 2)  return 30;
  if (chl < 4)  return 60;
  if (chl < 6)  return 85;
  return 100;
}

function getRiskFlags(sst: number, depth: number, historical: boolean, chl: number): string[] {
  const flags: string[] = [];
  if (sst > 16)  flags.push("High SST");
  else if (sst > 15) flags.push("Warming Risk");
  if (!historical)   flags.push("No Historic Record");
  if (depth > 35)    flags.push("Depth Marginal");
  if (chl < 2)       flags.push("Low Nutrients");
  return flags;
}

function computeViability(score: number): "high" | "moderate" | "low" {
  if (score >= 70) return "high";
  if (score >= 45) return "moderate";
  return "low";
}

// --- Raw site data ---
const rawSites = [
  // Mendocino Coast
  { id: "MB1", name: "Fort Bragg North",   region: "Mendocino Coast",   lat: 39.45, lon: -123.82, sst: 11.2, depth: 15, historical: true,  chl: 4.2 },
  { id: "MB2", name: "Point Arena",        region: "Mendocino Coast",   lat: 38.91, lon: -123.69, sst: 12.1, depth: 18, historical: true,  chl: 3.8 },
  // Sonoma Coast
  { id: "SC1", name: "Bodega Bay",         region: "Sonoma Coast",      lat: 38.33, lon: -123.05, sst: 12.8, depth: 12, historical: true,  chl: 5.1 },
  { id: "SC2", name: "Salt Point",         region: "Sonoma Coast",      lat: 38.57, lon: -123.33, sst: 11.9, depth: 14, historical: true,  chl: 4.6 },
  { id: "SC3", name: "Jenner",             region: "Sonoma Coast",      lat: 38.45, lon: -123.12, sst: 13.4, depth: 8,  historical: false, chl: 3.2 },
  // Point Reyes / Marin
  { id: "PR1", name: "Point Reyes South",  region: "Point Reyes",       lat: 37.99, lon: -122.97, sst: 12.5, depth: 20, historical: true,  chl: 4.7 },
  { id: "PR2", name: "Duxbury Reef",       region: "Point Reyes",       lat: 37.90, lon: -122.71, sst: 13.8, depth: 10, historical: true,  chl: 3.9 },
  // Monterey Bay
  { id: "MO1", name: "Monterey Peninsula", region: "Monterey Bay",      lat: 36.62, lon: -121.92, sst: 13.1, depth: 25, historical: true,  chl: 6.2 },
  { id: "MO2", name: "Pacific Grove",      region: "Monterey Bay",      lat: 36.63, lon: -121.93, sst: 12.9, depth: 15, historical: true,  chl: 5.8 },
  { id: "MO3", name: "Carmel Bay",         region: "Monterey Bay",      lat: 36.54, lon: -121.94, sst: 13.5, depth: 22, historical: true,  chl: 5.1 },
  { id: "MO4", name: "Moss Landing",       region: "Monterey Bay",      lat: 36.80, lon: -121.79, sst: 14.2, depth:  8, historical: false, chl: 7.3 },
  // Big Sur
  { id: "BS1", name: "Point Lobos",        region: "Big Sur",           lat: 36.51, lon: -121.95, sst: 13.0, depth: 18, historical: true,  chl: 4.5 },
  { id: "BS2", name: "Pfeiffer Point",     region: "Big Sur",           lat: 36.24, lon: -121.83, sst: 14.8, depth: 35, historical: false, chl: 3.1 },
  // San Luis Obispo
  { id: "SL1", name: "Morro Bay",          region: "San Luis Obispo",   lat: 35.37, lon: -120.86, sst: 14.5, depth: 12, historical: true,  chl: 4.0 },
  { id: "SL2", name: "Pismo Beach",        region: "San Luis Obispo",   lat: 35.14, lon: -120.64, sst: 15.2, depth: 10, historical: false, chl: 3.2 },
  // Channel Islands
  { id: "CI1", name: "Santa Cruz Island",  region: "Channel Islands",   lat: 34.01, lon: -119.72, sst: 15.8, depth: 20, historical: true,  chl: 3.5 },
  { id: "CI2", name: "Anacapa Island",     region: "Channel Islands",   lat: 34.01, lon: -119.42, sst: 16.2, depth: 18, historical: true,  chl: 2.8 },
  { id: "CI3", name: "San Nicolas Island", region: "Channel Islands",   lat: 33.24, lon: -119.50, sst: 16.8, depth: 22, historical: true,  chl: 2.6 },
  // Santa Barbara
  { id: "SB1", name: "Santa Barbara Coast",region: "Santa Barbara",     lat: 34.41, lon: -119.69, sst: 16.5, depth: 15, historical: false, chl: 2.5 },
  // Los Angeles
  { id: "LA1", name: "Palos Verdes",       region: "Los Angeles",       lat: 33.74, lon: -118.40, sst: 17.1, depth: 25, historical: true,  chl: 2.2 },
  // San Diego
  { id: "SD1", name: "Point Loma",         region: "San Diego",         lat: 32.67, lon: -117.25, sst: 18.2, depth: 20, historical: true,  chl: 2.1 },
  { id: "SD2", name: "La Jolla Cove",      region: "San Diego",         lat: 32.85, lon: -117.27, sst: 17.9, depth: 18, historical: true,  chl: 2.4 },
];

// --- Build scored sites ---
export const SITES: KelpSite[] = rawSites.map((s) => {
  const ss = scoreSST(s.sst);
  const ds = scoreDepth(s.depth);
  const hs = scoreHistory(s.historical);
  const ns = scoreChlorophyll(s.chl);
  const score = Math.round(ss * 0.35 + ds * 0.25 + hs * 0.30 + ns * 0.10);
  return {
    id: s.id,
    name: s.name,
    region: s.region,
    lat: s.lat,
    lon: s.lon,
    sst: s.sst,
    depth: s.depth,
    historicalPresence: s.historical,
    chlorophyll: s.chl,
    score,
    sstScore: ss,
    depthScore: ds,
    historyScore: hs,
    nutrientScore: ns,
    riskFlags: getRiskFlags(s.sst, s.depth, s.historical, s.chl),
    viability: computeViability(score),
  };
}).sort((a, b) => b.score - a.score);

export const REGIONS = ["All Regions", ...Array.from(new Set(SITES.map((s) => s.region)))];

export const STATS = {
  totalSites: SITES.length,
  highViability: SITES.filter((s) => s.viability === "high").length,
  topScore: SITES[0].score,
  topSite: SITES[0].name,
  kelpLostPercent: 97,
};
