import { useEffect, useMemo, useRef } from "react";
import { Circle, MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import type { Station } from "../types";
import { availabilityStatus, type AvailabilityStatus, formatPricing, STATUS_COLOR } from "../utils/format";

const MALAYSIA_CENTER: [number, number] = [4.2105, 108.9758];
const MALAYSIA_ZOOM = 6;
const NEAR_ME_ZOOM = 13;

function pinIcon(color: string) {
  return L.divIcon({
    className: "station-marker",
    html: `<div class="pin" style="background:${color}"><div class="pin-inner"></div></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 24],
    popupAnchor: [0, -22],
  });
}

const ICONS: Record<AvailabilityStatus, L.DivIcon> = {
  available: pinIcon(STATUS_COLOR.available),
  busy: pinIcon(STATUS_COLOR.busy),
  offline: pinIcon(STATUS_COLOR.offline),
  unverified: pinIcon(STATUS_COLOR.unverified),
};

const USER_LOCATION_ICON = L.divIcon({
  className: "user-location-marker",
  html: '<div class="user-dot-pulse"></div><div class="user-dot"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

interface FlyTarget {
  lat: number;
  lng: number;
  zoom: number;
  key: string;
}

/**
 * On mobile, the map's container sits behind a List/Map toggle (display:none
 * until shown) — Leaflet measures it as 0x0 at mount and any flyTo() call
 * against a zero-size container throws ("Invalid LatLng: NaN, NaN"). Rather
 * than guess at CSS breakpoints from React state, watch the container's
 * actual size with a ResizeObserver and only invalidate/fly once it's real.
 */
function MapController({ station, userLocation }: { station: Station | undefined; userLocation: { lat: number; lng: number } | null }) {
  const map = useMap();
  const hasSizeRef = useRef(false);
  const lastKeyRef = useRef<string | null>(null);
  // Always holds the latest target so the ResizeObserver callback below
  // (set up once in a mount-only effect) never reads a stale closure.
  const targetRef = useRef<FlyTarget | null>(null);

  const target: FlyTarget | null = station
    ? { lat: station.lat, lng: station.lng, zoom: 15, key: `station:${station.id}` }
    : userLocation
      ? { lat: userLocation.lat, lng: userLocation.lng, zoom: NEAR_ME_ZOOM, key: `user:${userLocation.lat.toFixed(5)},${userLocation.lng.toFixed(5)}` }
      : null;
  targetRef.current = target;

  const flyToLatestIfNew = () => {
    const t = targetRef.current;
    if (!t || lastKeyRef.current === t.key) return;
    lastKeyRef.current = t.key;
    map.flyTo([t.lat, t.lng], t.zoom, { duration: 0.6 });
  };

  useEffect(() => {
    const container = map.getContainer();
    let flyTimeout: number | undefined;
    const observer = new ResizeObserver(() => {
      const hasSize = container.clientWidth > 0 && container.clientHeight > 0;
      if (hasSize) {
        map.invalidateSize();
        if (!hasSizeRef.current) {
          hasSizeRef.current = true;
          // invalidateSize's own pixel-origin recalculation isn't synchronous
          // with this callback; flyTo-ing immediately can animate toward a
          // stale origin and land the view off-center. Give it a tick.
          flyTimeout = window.setTimeout(flyToLatestIfNew, 50);
        }
      } else {
        hasSizeRef.current = false;
      }
    });
    observer.observe(container);
    return () => {
      observer.disconnect();
      window.clearTimeout(flyTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  useEffect(() => {
    if (hasSizeRef.current) flyToLatestIfNew();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target?.key]);

  return null;
}

interface MapViewProps {
  stations: Station[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  routeCoordinates?: [number, number][];
  userLocation?: { lat: number; lng: number } | null;
  nearMeRadiusKm?: number;
}

export function MapView({
  stations,
  selectedId,
  onSelect,
  routeCoordinates,
  userLocation = null,
  nearMeRadiusKm,
}: MapViewProps) {
  const selected = useMemo(
    () => stations.find((s) => s.id === selectedId),
    [stations, selectedId],
  );

  return (
    <MapContainer
      center={MALAYSIA_CENTER}
      zoom={MALAYSIA_ZOOM}
      className="h-full w-full"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        maxZoom={19}
      />
      {routeCoordinates && routeCoordinates.length > 1 && (
        <Polyline positions={routeCoordinates} pathOptions={{ color: "#2563eb", weight: 4, opacity: 0.7 }} />
      )}
      {userLocation && (
        <>
          <Marker position={[userLocation.lat, userLocation.lng]} icon={USER_LOCATION_ICON} zIndexOffset={1000}>
            <Popup>Your location</Popup>
          </Marker>
          {nearMeRadiusKm && (
            <Circle
              center={[userLocation.lat, userLocation.lng]}
              radius={nearMeRadiusKm * 1000}
              pathOptions={{ color: "#2563eb", weight: 1, fillOpacity: 0.06 }}
            />
          )}
        </>
      )}
      {stations.map((s) => {
        const status = availabilityStatus(s);
        return (
          <Marker
            key={s.id}
            position={[s.lat, s.lng]}
            icon={ICONS[status]}
            eventHandlers={{ click: () => onSelect(s.id) }}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-semibold">{s.name}</p>
                <p className="text-gray-600">{s.operator} · {formatPricing(s.pricing)}</p>
                <p className="text-gray-600">
                  {s.source === "community"
                    ? `${s.bays.total} bay${s.bays.total === 1 ? "" : "s"} · availability not tracked`
                    : `${s.bays.available}/${s.bays.total} bays available`}
                </p>
              </div>
            </Popup>
          </Marker>
        );
      })}
      <MapController station={selected} userLocation={userLocation} />
    </MapContainer>
  );
}
