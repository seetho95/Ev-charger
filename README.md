# MY EV Charge

A web app for tracking EV charging stations across Malaysia: pricing, bay
availability, locations on a map, and a road-trip charging planner.

## Features

- **Map view** of charging stations across Malaysia (OpenStreetMap/Leaflet
  tiles via CARTO), color-coded by bay availability.
- **Filters** by network, state, connector type, and free-text search — the
  lists populate dynamically from whatever stations are actually loaded.
- **Station details**: pricing (per kWh / per minute / flat / free / not
  listed), idle fees, connector types and power, operating hours, amenities,
  and a bay availability snapshot.
- **Trip planner**: pick an origin and destination in Malaysia, set your
  vehicle's range/battery/charge targets, and get a road route with the
  minimum set of charging stops needed, including estimated charge time and
  cost at each stop.
- **Installable as an app** on Android/iOS/desktop (PWA) — see
  [Installing on your phone](#installing-on-your-phone) below.

## Data provenance — please read

Malaysia does not have one unified public API that exposes real-time,
bay-level availability across charge point operators — each network
(ChargEV, Gentari, JomCharge, Shell Recharge, DC HUB, Tesla, ParkEasy, EV
Connection, etc.) runs its own closed app/API. The app combines two sources,
visually distinguished on the map (green/red/gray pins vs. blue pins) and in
every list/detail view:

1. **Curated stations** (`src/data/stations.ts`) — real, well-known locations
   (malls, highway rest-and-service areas, city centres) with representative
   tariff structures per network. Bay-availability numbers here are
   **illustrative snapshots, not a live feed** — the "Refresh availability"
   button in the Explore view *simulates* a live poll (see
   `src/services/stationSource.ts`) so you can see how the UI would behave
   with a real feed.
2. **Community stations** (`src/services/openChargeMap.ts`) — fetched at
   runtime from [Open Charge Map](https://openchargemap.org), a free,
   community-maintained global database, filtered to Malaysia. This adds
   many more real, community-submitted locations/connectors/operators
   beyond the curated set. These render as **blue "unverified" pins**: OCM
   does not track live bay occupancy either, so rather than fabricate
   available/busy counts, the app labels them "availability not tracked."
   Duplicates within ~300m of a curated station are dropped in favour of the
   richer curated entry (`src/utils/mergeStations.ts`).

If Open Charge Map is unreachable, the app silently falls back to the
curated list only (with a small retry notice in the filter panel) — always
consult the relevant operator's own app for guaranteed-accurate pricing and
live availability.

To wire up real data later, replace/extend the body of `getStations()` in
`src/services/stationSource.ts` — every other part of the app only depends
on the `Station` shape defined in `src/types.ts`.

The trip planner's **geocoding** (place name → coordinates) and **routing**
(driving directions) use free public services — OpenStreetMap's Nominatim
and the OSRM demo server — which are rate-limited and best-effort. If either
is unreachable, the planner falls back to a quick-pick list of major
Malaysian cities (no network needed) and a straight-line distance estimate,
clearly labelled as such in the UI.

## Getting started

```bash
npm install
npm run dev       # start the dev server
npm run build     # type-check and build for production
npm run preview   # preview the production build locally
```

## Installing on your phone

The app is a PWA (installable web app) — visit the deployed URL in Chrome on
Android (or Safari on iOS) and:

- **Android (Chrome)**: tap the ⋮ menu → **"Install app"** (or **"Add to
  Home screen"**), or wait for the automatic install banner. It launches
  full-screen from your home screen icon, no browser chrome, like a native app.
- **iOS (Safari)**: tap Share → **"Add to Home Screen"**.

This works because the build includes a web app manifest and service worker
(`vite-plugin-pwa`, configured in `vite.config.ts`) — no Google Play listing
or native rebuild required. Icons live in `public/pwa-*.png` and
`public/maskable-icon-512x512.png`.

## Project structure

```
src/
  types.ts                 Core data model (Station, Pricing, VehicleProfile, ...)
  data/
    stations.ts             Seed dataset of Malaysian charging stations
    operatorDefaults.ts      Default connectors/pricing per network
    cities.ts                Quick-pick city list for the trip planner
  services/
    stationSource.ts         Station data source (swap in a real API here)
    routing.ts                Geocoding + driving directions (Nominatim/OSRM)
  utils/
    geo.ts                    Distance calculations, route projection
    tripPlanner.ts            Charging-stop planning algorithm
    format.ts                 Pricing/availability display helpers
  components/                Map, list, filters, detail panel, trip planner UI
  store.ts                    Global app state (zustand)
```

## Trip planner algorithm

Given a route (a polyline of lat/lng points) and a vehicle profile (range,
battery capacity, starting charge %, target charge %, and a safety buffer
%), the planner:

1. Projects every station within a corridor of the route (default 20 km)
   onto the route, ranked by distance travelled along it.
2. Walks the route, and whenever the remaining range (minus the safety
   buffer) can't reach the destination, greedily picks the **furthest
   reachable** station — minimising the number of stops, similar to the
   classic "gas station" routing problem.
3. Estimates charge time from the station's fastest available connector,
   and cost from its pricing model.
4. If no reachable station exists before running out of range, the trip is
   flagged infeasible with an explanation.
