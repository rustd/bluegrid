import { NextResponse } from "next/server";
import {
  buildSite,
  CANDIDATE_SITES,
  DATA_SOURCES,
  FALLBACK_SITES,
  KelpSite,
  SiteObservation,
  TrendPoint,
} from "@/lib/data";

export const revalidate = 3600;
export const dynamic = "force-dynamic";

type MarineHourlyResponse = {
  hourly?: {
    time?: string[];
    sea_surface_temperature?: number[];
    ocean_current_velocity?: number[];
  };
};

type NoaaTempResponse = {
  data?: Array<{ v?: string }>;
};

function pickLastFinite(values: Array<number | null | undefined>): number | null {
  for (let i = values.length - 1; i >= 0; i -= 1) {
    const value = values[i];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return null;
}

async function fetchJSON<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function fetchNoaaWaterTemp(stationId: string): Promise<number | null> {
  const today = new Date();
  const yyyymmdd = today.toISOString().slice(0, 10).replace(/-/g, "");
  const url = `${DATA_SOURCES.noaaCoops}?product=water_temperature&application=bluegrid&begin_date=${yyyymmdd}&end_date=${yyyymmdd}&station=${stationId}&time_zone=gmt&units=metric&format=json`;
  const payload = await fetchJSON<NoaaTempResponse>(url);
  const values = (payload?.data ?? []).map((row) => Number(row.v));
  return pickLastFinite(values);
}

async function fetchMarineData(lat: number, lon: number): Promise<{
  sst: number | null;
  current: number | null;
  trend: TrendPoint[];
}> {
  const url = `${DATA_SOURCES.openMeteoMarine}?latitude=${lat}&longitude=${lon}&hourly=sea_surface_temperature,ocean_current_velocity&past_days=30&forecast_days=7&timezone=UTC`;
  const payload = await fetchJSON<MarineHourlyResponse>(url);
  const times = payload?.hourly?.time ?? [];
  const sstValues = payload?.hourly?.sea_surface_temperature ?? [];
  const currentValues = payload?.hourly?.ocean_current_velocity ?? [];

  const lastSst = pickLastFinite(sstValues);
  const lastCurrent = pickLastFinite(currentValues);

  const nowDate = new Date().toISOString().slice(0, 10);
  const daySeen = new Set<string>();
  const trend: TrendPoint[] = [];
  for (let i = 0; i < times.length; i += 1) {
    const time = times[i];
    if (!time.includes("T12:00")) continue;
    const date = time.slice(0, 10);
    if (daySeen.has(date)) continue;
    daySeen.add(date);
    const sst = sstValues[i];
    const isFuture = date > nowDate;
    trend.push({
      date,
      observedSst: isFuture ? null : (Number.isFinite(sst) ? sst : null),
      predictedSst: isFuture && Number.isFinite(sst) ? sst : null,
      predictedViability: 0,
    });
  }

  return { sst: lastSst, current: lastCurrent, trend };
}

function extractFirstNumericFromCsv(csv: string): number | null {
  const lines = csv.split("\n").map((line) => line.trim()).filter(Boolean);
  for (const line of lines.slice(1).reverse()) {
    const columns = line.split(",").map((col) => col.trim().replace(/^"|"$/g, ""));
    for (const col of columns) {
      const n = Number(col);
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

async function fetchChlorophyll(lat: number, lon: number): Promise<number | null> {
  const attempts = [
    `${DATA_SOURCES.noaaCoastWatch}griddap/noaacwNPPVIIRSchlaDaily.csv?chlor_a[(last-3days):1:(last)][(${lat}):1:(${lat})][(${lon}):1:(${lon})]`,
    `${DATA_SOURCES.noaaCoastWatch}griddap/noaacwNPPN20VIIRSchlociDaily.csv?chlor_a[(last-3days):1:(last)][(${lat}):1:(${lat})][(${lon}):1:(${lon})]`,
  ];

  for (const url of attempts) {
    const text = await fetchText(url);
    if (!text) continue;
    const value = extractFirstNumericFromCsv(text);
    if (value !== null && value > 0 && value < 50) return value;
  }
  return null;
}

function computePredictedViability(site: KelpSite): TrendPoint[] {
  const sstScore = (sst: number) => {
    if (sst < 8) return 10;
    if (sst < 10) return 10 + (sst - 8) * 30;
    if (sst <= 15) return Math.round(100 - Math.abs(sst - 12.5) * 10);
    if (sst <= 18) return Math.max(0, Math.round(75 - (sst - 15) * 22));
    return 0;
  };

  return site.trend.map((point) => {
    const input = point.predictedSst ?? point.observedSst;
    if (input === null) return point;
    const estimated = Math.round(
      sstScore(input) * 0.3 +
      site.depthScore * 0.2 +
      site.historyScore * 0.2 +
      site.nutrientScore * 0.15 +
      site.currentScore * 0.15,
    );
    return { ...point, predictedViability: Math.max(0, Math.min(100, estimated)) };
  });
}

export async function GET() {
  try {
    const sites = await Promise.all(
      CANDIDATE_SITES.map(async (candidate) => {
        const [noaaTemp, marine, chlorophyll] = await Promise.all([
          candidate.noaaStationId ? fetchNoaaWaterTemp(candidate.noaaStationId) : Promise.resolve(null),
          fetchMarineData(candidate.lat, candidate.lon),
          fetchChlorophyll(candidate.lat, candidate.lon),
        ]);

        const observation: SiteObservation = {
          sst: noaaTemp ?? marine.sst ?? (12 + (40 - candidate.lat) * 0.24),
          chlorophyll: chlorophyll ?? candidate.baselineChlorophyll,
          currentVelocity: marine.current ?? 0.35,
        };

        const site = buildSite(
          candidate,
          observation,
          marine.trend,
          {
            temperature: noaaTemp !== null ? "NOAA CO-OPS station observations" : "Open-Meteo marine SST fallback",
            nutrients: chlorophyll !== null ? "NOAA CoastWatch chlorophyll (VIIRS)" : "Regional chlorophyll baseline fallback",
            currents: marine.current !== null ? "Open-Meteo marine current velocity" : "Marine current fallback",
            depth: "GEBCO bathymetry depth lookup",
            historical: "KelpWatch historical kelp presence",
          },
        );
        return { ...site, trend: computePredictedViability(site) };
      }),
    );

    const ranked = sites.sort((a, b) => b.score - a.score);
    return NextResponse.json(
      {
        sites: ranked,
        generatedAt: new Date().toISOString(),
        sources: DATA_SOURCES,
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      {
        sites: FALLBACK_SITES,
        generatedAt: new Date().toISOString(),
        sources: DATA_SOURCES,
        degraded: true,
      },
      { status: 200 },
    );
  }
}
