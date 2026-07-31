import type { Station } from "../types";
import { availabilityStatus, formatPricing, STATUS_COLOR, STATUS_LABEL } from "../utils/format";

interface StationCardProps {
  station: Station;
  selected: boolean;
  onClick: () => void;
  distanceKm?: number;
}

export function StationCard({ station, selected, onClick, distanceKm }: StationCardProps) {
  const status = availabilityStatus(station);
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-lg border p-3 transition-colors ${
        selected
          ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40"
          : "border-gray-200 dark:border-gray-700 hover:border-blue-300"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-sm">{station.name}</p>
          <p className="text-xs text-gray-500">{station.operator} · {station.state}</p>
        </div>
        <span
          className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: STATUS_COLOR[status] }}
          title={STATUS_LABEL[status]}
        />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600 dark:text-gray-300">
        <span>{formatPricing(station.pricing)}</span>
        <span>
          {station.source === "community"
            ? `${station.bays.total} bay${station.bays.total === 1 ? "" : "s"} · not tracked`
            : `${station.bays.available}/${station.bays.total} bays free`}
        </span>
        {distanceKm !== undefined && <span>{distanceKm.toFixed(1)} km away</span>}
      </div>
    </button>
  );
}
