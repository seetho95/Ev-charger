# MY EV Charge

A web app for tracking EV charging stations across Malaysia: pricing, bay
availability, locations on a map, and a road-trip charging planner.

## Features

- **Map view** of charging stations across Malaysia (OpenStreetMap/Leaflet),
  color-coded by bay availability.
- **Filters** by network (ChargEV, Gentari, JomCharge, Shell Recharge, DC HUB,
  Tesla, ParkEasy, EV Connection), state, connector type, and free-text search.
- **Station details**: pricing (per kWh / per minute / flat / free), idle
  fees, connector types and power, operating hours, amenities, and a live-look
  bay availability snapshot.
- **Trip planner**: pick an origin and destination in Malaysia, set your
  vehicle's range/battery/charge targets, and get a road route with the
  minimum set of charging stops needed, including estimated charge time and
  cost at each stop.

## Data provenance — please read

Malaysia does not have one unified public API that exposes real-time,
bay-level availability across charge point operators — each network
(ChargEV, Gentari, JomCharge, Shell Recharge, DC HUB, Tesla, ParkEasy, EV
Connection, etc.) runs its own closed app/API. To make the app useful out of
the box, `src/data/stations.ts` ships with:

- **Real, well-known station locations** (malls, highway rest-and-service
  areas, city centres) across Peninsular and East Malaysia.
- **Representative tariff structures** per network, based on typical public
  pricing models (per kWh / per minute) — treat these as illustrative, not
  as live prices. Always confirm the exact rate on-site or in the operator's
  own app before charging.
- **Illustrative bay-availability snapshots**, not a live feed. The
  "Refresh availability" button in the Explore view *simulates* a live poll
  (see `src/services/stationSource.ts`) so you can see how the UI would
  behave with a real feed.

To wire up real data later, replace the body of `getStations()` in
`src/services/stationSource.ts` with a fetch to a real aggregator or
operator API — every other part of the app only depends on the `Station`
shape defined in `src/types.ts`.

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
