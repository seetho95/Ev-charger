import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import type { Station } from "../types";
import { availabilityStatus, type AvailabilityStatus, formatPricing, STATUS_COLOR } from "../utils/format";

const MALAYSIA_CENTER: [number, number] = [4.2105, 108.9758];
const MALAYSIA_ZOOM = 6;

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

function FlyToStation({ station }: { station: Station | undefined }) {
  const map = useMap();
  useEffect(() => {
    if (station) {
      map.flyTo([station.lat, station.lng], 15, { duration: 0.6 });
    }
  }, [station, map]);
  return null;
}

/**
 * On mobile, the map's container sits behind a List/Map toggle: it's
 * display:none at mount, so Leaflet measures it as 0x0 and never recovers
 * on its own. Re-measure whenever the container actually becomes visible.
 */
function InvalidateOnShow({ visible }: { visible: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (!visible) return;
    const id = window.setTimeout(() => map.invalidateSize(), 100);
    return () => window.clearTimeout(id);
  }, [visible, map]);
  return null;
}

interface MapViewProps {
  stations: Station[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  routeCoordinates?: [number, number][];
  visible?: boolean;
}

export function MapView({ stations, selectedId, onSelect, routeCoordinates, visible = true }: MapViewProps) {
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
      <FlyToStation station={selected} />
      <InvalidateOnShow visible={visible} />
    </MapContainer>
  );
}
