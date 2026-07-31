const EARTH_RADIUS_KM = 6371;

export function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Great-circle distance between two lat/lng points, in kilometres. */
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Shortest distance (km) from a point to a polyline, plus the cumulative
 * distance-along-the-line (km) of the closest point. Used to project
 * charging stations onto a driving route.
 */
export function distanceToPolylineKm(
  point: { lat: number; lng: number },
  line: [number, number][], // [lat, lng][]
): { distanceKm: number; distanceAlongKm: number } {
  let best = Infinity;
  let bestAlong = 0;
  let cumulative = 0;

  for (let i = 0; i < line.length - 1; i++) {
    const [aLat, aLng] = line[i];
    const [bLat, bLng] = line[i + 1];
    const segLen = haversineKm({ lat: aLat, lng: aLng }, { lat: bLat, lng: bLng });

    const { distanceKm, t } = pointToSegmentKm(point, { lat: aLat, lng: aLng }, { lat: bLat, lng: bLng });
    if (distanceKm < best) {
      best = distanceKm;
      bestAlong = cumulative + segLen * t;
    }
    cumulative += segLen;
  }

  return { distanceKm: best, distanceAlongKm: bestAlong };
}

function pointToSegmentKm(
  p: { lat: number; lng: number },
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): { distanceKm: number; t: number } {
  // Work in a local equirectangular projection (good enough at this scale).
  const cosLat = Math.cos(toRad(p.lat));
  const ax = a.lng * cosLat;
  const ay = a.lat;
  const bx = b.lng * cosLat;
  const by = b.lat;
  const px = p.lng * cosLat;
  const py = p.lat;

  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;

  let t = lenSq === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const closest = { lat: ay + t * dy, lng: (ax + t * dx) / cosLat };
  return { distanceKm: haversineKm(p, closest), t };
}

export function polylineLengthKm(line: [number, number][]): number {
  let total = 0;
  for (let i = 0; i < line.length - 1; i++) {
    total += haversineKm(
      { lat: line[i][0], lng: line[i][1] },
      { lat: line[i + 1][0], lng: line[i + 1][1] },
    );
  }
  return total;
}
