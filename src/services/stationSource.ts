import { STATIONS } from "../data/stations";
import type { Station } from "../types";

/**
 * Data source abstraction. Malaysia has no single public real-time API for
 * bay-level availability across operators, so this returns the curated seed
 * dataset. To wire up a real feed later, replace the body of getStations()
 * with a fetch to an aggregator or operator API — the rest of the app only
 * depends on the Station[] shape from src/types.ts.
 */
export function getStations(): Station[] {
  return STATIONS;
}

/**
 * Simulates polling a live availability feed by nudging each station's bay
 * occupancy within its fixed bay count. This is NOT real data — it exists so
 * the "Refresh availability" action in the UI demonstrates what a live feed
 * would look like end-to-end.
 */
export function simulateAvailabilityRefresh(stations: Station[]): Station[] {
  return stations.map((s) => {
    if (s.bays.total === 0) return s;
    const offline = s.bays.offline;
    const usable = s.bays.total - offline;
    const inUse = Math.round(Math.random() * usable);
    return {
      ...s,
      bays: {
        total: s.bays.total,
        offline,
        inUse,
        available: usable - inUse,
        lastUpdated: new Date().toISOString(),
      },
    };
  });
}
