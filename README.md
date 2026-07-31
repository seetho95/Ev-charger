# MY EV Charge

A web app for tracking EV charging stations across Malaysia: pricing, bay
availability, locations on a map, and a road-trip charging planner.

## Features

- **Map view** of charging stations across Malaysia (OpenStreetMap/Leaflet
  tiles via CARTO), color-coded by bay availability, with 4 selectable basemap
  styles (Minimal, Bare, Voyager, Dark — bottom-right control, remembered
  between visits) and a "Find a charging station…" search box overlaid on
  the map itself (top-center) — type to get a live dropdown of matches with
  distance, click one to fly straight to it. This is separate from the
  sidebar's filter search: it doesn't narrow the list, just jumps to a
  result.
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
- **"Near me"**: on opening the Explore view, the app asks for your location
  and shows every charger within 5 km, sorted by distance, with a "Show all"
  toggle to go back to the full Malaysia-wide list at any time.

## Data provenance — please read

Malaysia does not have one unified public API that exposes real-time,
bay-level availability across charge point operators — each network
(ChargEV, Gentari, JomCharge, Shell Recharge, DC HUB, Tesla, ParkEasy, EV
Connection, Yinson, ChargeSini, Charge N Go, GoToU, etc.) runs its own closed
app/API, and commercial crowdsourcing platforms like PlugShare are not open
data — this app does not scrape them. The app combines two legitimate
sources instead, visually distinguished on the map (green/red/gray pins vs.
blue pins) and in every list/detail view:

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

Yinson, ChargeSini, Charge N Go, and GoToU are registered as known networks
(`src/data/operatorDefaults.ts`, representative connector/pricing templates)
so they display consistently the moment a station from them appears — via
Open Charge Map, or via a curated entry you add yourself in
`src/data/stations.ts` if you have a verified real address for one. Adding
made-up addresses for real networks would misdirect a driver, so the seed
data doesn't include any until they're confirmed.

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

## "Near me"

Opening the Explore view triggers a browser geolocation request (or tap
"Use my location" if you skipped/denied it). Once granted, the map flies to
your location, draws a 5 km radius circle, and both the map and the sidebar
list restrict themselves to stations inside it — the list also sorts by
distance. Toggle "Show all" / "Near me" at any time; "Recenter" re-requests
your current position. If geolocation is denied or unsupported, the app
just shows the full Malaysia-wide list with a small notice, same as before.

The map is also wrapped in a React error boundary (`src/components/ErrorBoundary.tsx`):
if Leaflet ever throws (e.g. an animation racing a container resize on a slow
device), the map panel shows a "Try again" fallback instead of taking the
whole app down. `src/components/MapView.tsx`'s `MapController` is the piece
that had to get this right — it watches the map container with a
`ResizeObserver` rather than guessing at visibility from CSS breakpoints, and
waits two animation frames after a resize before flying the view, so it
doesn't animate toward a stale, pre-resize position.

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
    stationSource.ts         Curated station data source
    openChargeMap.ts          Open Charge Map fetch + mapping to Station
    routing.ts                Geocoding + driving directions (Nominatim/OSRM)
  utils/
    geo.ts                    Distance calculations, route projection
    mergeStations.ts          Dedupe curated vs. community stations
    tripPlanner.ts            Charging-stop planning algorithm
    format.ts                 Pricing/availability display helpers
  hooks/
    useVisibleStations.ts     Shared filter/near-me/sort logic (map + list)
  components/                Map, list, filters, detail panel, trip planner UI
  store.ts                    Global app state (zustand) — filters, stations,
                               geolocation
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
