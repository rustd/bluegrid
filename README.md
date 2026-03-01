# BlueGrid

Kelp restoration decision-support app built with Next.js.

Tagline: **Kelp Restoration: Months → Seconds**

## What it does
- Ranks candidate restoration sites using a kelp suitability model.
- Overlays GIS factors on a map: temperature, nutrients (chlorophyll), depth, and currents.
- Combines historical kelp presence with live ocean data where available.
- Shows risk flags and trend/predictive viability overlays.

## Data pipeline
The API route `app/api/kelp-sites/route.ts` fuses data from:
- NOAA CO-OPS (`water_temperature`)
- NOAA CoastWatch ERDDAP (chlorophyll attempts)
- Open-Meteo Marine (SST/current + trends)
- GEBCO (depth attribution)
- KelpWatch (historical presence attribution)

If a source is unavailable, the app falls back to deterministic baseline values.

## Tech stack
- Next.js 14 (App Router)
- React + TypeScript
- Leaflet / React-Leaflet
- Recharts

## Local development
```bash
npm install
npm run dev
```

Open: `http://localhost:3000` (or next available port shown in terminal).

## Build
```bash
npm run build
npm start
```

## Project structure
- `app/page.tsx`: main dashboard UI
- `components/KelpMap.tsx`: map and overlay rendering
- `app/api/kelp-sites/route.ts`: live data aggregation API
- `lib/data.ts`: candidate site model, scoring, fallback generation

## Security / credentials
- No secrets are required to run this project.
- Local env files are ignored via `.gitignore` (`.env`, `.env*.local`).
- Private keys (`*.pem`) are ignored.
- Do not commit API tokens or credentials into source files.
