import { useEffect, useMemo, useRef, useState } from "react";
import { Circle, MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import type { Station } from "../types";
import { availabilityStatus, type AvailabilityStatus, formatPricing, STATUS_COLOR } from "../utils/format";
import { loadSavedMapStyleId, MAP_STYLES, saveMapStyleId } from "../data/mapStyles";
import { MapSearchBar } from "./MapSearchBar";

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
    try {
      map.flyTo([t.lat, t.lng], t.zoom, { duration: 0.6 });
    } catch (err) {
      // Leaflet can throw mid-animation if the container's geometry is still
      // unsettled on a slow device; don't take the rest of the app down for it.
      console.error("Map flyTo failed:", err);
    }
  };

  useEffect(() => {
    const container = map.getContainer();
    let raf1 = 0;
    let raf2 = 0;
    const observer = new ResizeObserver(() => {
      const hasSize = container.clientWidth > 0 && container.clientHeight > 0;
      if (hasSize) {
        map.invalidateSize();
        if (!hasSizeRef.current) {
          hasSizeRef.current = true;
          // invalidateSize's pixel-origin recalculation isn't guaranteed to be
          // done by the time this callback returns; flyTo-ing immediately can
          // animate toward a stale origin and land off-center (or throw on a
          // slow device). Waiting two animation frames guarantees at least one
          // full layout/paint cycle has completed first.
          raf1 = requestAnimationFrame(() => {
            raf2 = requestAnimationFrame(flyToLatestIfNew);
          });
        }
      } else {
        hasSizeRef.current = false;
      }
    });
    observer.observe(container);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
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

  const [styleId, setStyleId] = useState(loadSavedMapStyleId);
  const style = MAP_STYLES.find((s) => s.id === styleId) ?? MAP_STYLES[0];

  function chooseStyle(id: string) {
    setStyleId(id);
    saveMapStyleId(id);
  }

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={MALAYSIA_CENTER}
        zoom={MALAYSIA_ZOOM}
        className="h-full w-full"
        scrollWheelZoom
      >
        <TileLayer
          key={style.id}
          attribution={style.attribution}
          url={style.url}
          subdomains={style.subdomains}
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

      <MapSearchBar onSelect={onSelect} />

      <div className="absolute bottom-20 right-2.5 z-[1000] flex gap-1 rounded-lg bg-white/95 dark:bg-gray-900/95 p-1 shadow-md backdrop-blur">
        {MAP_STYLES.map((s) => (
          <button
            key={s.id}
            onClick={() => chooseStyle(s.id)}
            title={s.name}
            className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
              s.id === style.id
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>
    </div>
  );
}
