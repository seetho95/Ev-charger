import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import type { Station } from "../types";
import { availabilityStatus, formatPricing, STATUS_COLOR } from "../utils/format";

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

const ICONS = {
  available: pinIcon(STATUS_COLOR.available),
  busy: pinIcon(STATUS_COLOR.busy),
  offline: pinIcon(STATUS_COLOR.offline),
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

interface MapViewProps {
  stations: Station[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  routeCoordinates?: [number, number][];
}

export function MapView({ stations, selectedId, onSelect, routeCoordinates }: MapViewProps) {
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
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {routeCoordinates && routeCoordinates.length > 1 && (
        <Polyline positions={routeCoordinates} pathOptions={{ color: "#2563eb", weight: 4, opacity: 0.7 }} />
      )}
      {stations.map((s) => {
        const status = availabilityStatus(s.bays);
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
                  {s.bays.available}/{s.bays.total} bays available
                </p>
              </div>
            </Popup>
          </Marker>
        );
      })}
      <FlyToStation station={selected} />
    </MapContainer>
  );
}
