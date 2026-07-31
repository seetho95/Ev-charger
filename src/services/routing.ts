import { haversineKm } from "../utils/geo";

export interface GeoPoint {
  label: string;
  lat: number;
  lng: number;
}

export interface RouteResult {
  coordinates: [number, number][]; // [lat, lng]
  distanceKm: number;
  approximate: boolean;
}

/**
 * Geocodes a free-text query to a point inside Malaysia using the public
 * Nominatim (OpenStreetMap) API. Best-effort: callers should treat a
 * rejected/failed promise as "try the quick-pick city list instead."
 */
export async function geocodeMalaysia(query: string): Promise<GeoPoint | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("countrycodes", "my");
  url.searchParams.set("limit", "1");

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Geocoding failed (${res.status})`);
  const results = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
  if (results.length === 0) return null;
  const r = results[0];
  return { label: r.display_name, lat: parseFloat(r.lat), lng: parseFloat(r.lon) };
}

/**
 * Fetches a real driving route from the public OSRM demo server. Falls back
 * to a straight-line (great-circle) approximation if the request fails,
 * so the trip planner still produces a usable result offline.
 */
export async function fetchDrivingRoute(origin: GeoPoint, destination: GeoPoint): Promise<RouteResult> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Routing failed (${res.status})`);
    const data = await res.json();
    const route = data?.routes?.[0];
    if (!route) throw new Error("No route found");
    const coordinates: [number, number][] = route.geometry.coordinates.map(
      ([lng, lat]: [number, number]) => [lat, lng],
    );
    return { coordinates, distanceKm: route.distance / 1000, approximate: false };
  } catch {
    const coordinates: [number, number][] = [
      [origin.lat, origin.lng],
      [destination.lat, destination.lng],
    ];
    return {
      coordinates,
      distanceKm: haversineKm(origin, destination) * 1.25, // rough road-vs-straight-line factor
      approximate: true,
    };
  }
}
