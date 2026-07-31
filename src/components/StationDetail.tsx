import type { Station } from "../types";
import {
  availabilityStatus,
  formatPricing,
  googleMapsDirectionsUrl,
  googleMapsSearchUrl,
  STATUS_COLOR,
  STATUS_LABEL,
} from "../utils/format";

interface StationDetailProps {
  station: Station | undefined;
  onClose: () => void;
}

export function StationDetail({ station, onClose }: StationDetailProps) {
  if (!station) return null;
  const status = availabilityStatus(station);

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-base">{station.name}</h3>
          <p className="text-sm text-gray-500">{station.operator}</p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm"
          aria-label="Close details"
        >
          ✕
        </button>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-300">{station.address}</p>

      <div className="flex items-center gap-2 text-sm">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STATUS_COLOR[status] }} />
        <span>{STATUS_LABEL[status]}</span>
        {station.source === "curated" && (
          <span className="text-gray-400">
            ({station.bays.available} free / {station.bays.inUse} in use / {station.bays.offline} offline of {station.bays.total})
          </span>
        )}
      </div>
      {station.source === "curated" ? (
        <p className="text-xs text-gray-400">
          Snapshot as of {new Date(station.bays.lastUpdated).toLocaleString("en-MY")}
        </p>
      ) : (
        <p className="text-xs text-gray-400">
          {station.bays.total} bay{station.bays.total === 1 ? "" : "s"} listed · sourced from Open Charge Map (community-submitted, not a live feed)
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-gray-400 text-xs uppercase tracking-wide">Pricing</p>
          <p>{formatPricing(station.pricing)}</p>
          {station.pricing.idleFeeMYR && (
            <p className="text-xs text-gray-500">+ RM {station.pricing.idleFeeMYR.toFixed(2)}/min idle fee</p>
          )}
        </div>
        <div>
          <p className="text-gray-400 text-xs uppercase tracking-wide">Hours</p>
          <p>{station.operatingHours}</p>
        </div>
      </div>

      <div>
        <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Connectors</p>
        <div className="flex flex-wrap gap-1.5">
          {station.connectors.map((c, i) => (
            <span
              key={i}
              className="rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs"
            >
              {c.type} · {c.current} · {c.powerKW}kW × {c.count}
            </span>
          ))}
        </div>
      </div>

      {station.amenities.length > 0 && (
        <div>
          <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Amenities</p>
          <p className="text-sm">{station.amenities.join(" · ")}</p>
        </div>
      )}

      <div className="flex gap-4">
        <a
          className="inline-block text-sm text-blue-600 hover:underline"
          href={googleMapsSearchUrl(station)}
          target="_blank"
          rel="noreferrer"
        >
          View on Google Maps →
        </a>
        <a
          className="inline-block text-sm text-blue-600 hover:underline"
          href={googleMapsDirectionsUrl(station)}
          target="_blank"
          rel="noreferrer"
        >
          Directions →
        </a>
      </div>
    </div>
  );
}
