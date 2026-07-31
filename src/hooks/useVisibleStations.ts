import { useMemo } from "react";
import { NEAR_ME_RADIUS_KM, stationMatchesFilters, useAppStore } from "../store";
import type { Station } from "../types";
import { haversineKm } from "../utils/geo";

/**
 * The Explore view's station list, shared by the map and the sidebar list so
 * they never disagree: filtered by the active chip filters, then further
 * restricted to NEAR_ME_RADIUS_KM when "near me" is on, sorted by distance
 * whenever the user's location is known.
 */
export function useVisibleStations(): { stations: Station[]; distances: Map<string, number> } {
  const stations = useAppStore((s) => s.stations);
  const filters = useAppStore((s) => s.filters);
  const userLocation = useAppStore((s) => s.userLocation);
  const nearMeOnly = useAppStore((s) => s.nearMeOnly);

  return useMemo(() => {
    const filtered = stations.filter((s) => stationMatchesFilters(s, filters));

    const distances = new Map<string, number>();
    if (userLocation) {
      for (const s of filtered) distances.set(s.id, haversineKm(userLocation, s));
    }

    const scoped =
      nearMeOnly && userLocation
        ? filtered.filter((s) => (distances.get(s.id) ?? Infinity) <= NEAR_ME_RADIUS_KM)
        : filtered;

    const sorted = userLocation
      ? [...scoped].sort((a, b) => (distances.get(a.id) ?? 0) - (distances.get(b.id) ?? 0))
      : scoped;

    return { stations: sorted, distances };
  }, [stations, filters, userLocation, nearMeOnly]);
}
