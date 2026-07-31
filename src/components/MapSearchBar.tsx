import { useEffect, useMemo, useRef, useState } from "react";
import { useAppStore } from "../store";
import type { Station } from "../types";
import { haversineKm } from "../utils/geo";

const MAX_RESULTS = 8;

/**
 * A quick "find and jump to a station" box overlaid on the map, separate
 * from the sidebar's filter search (which narrows the list/markers). This
 * one keeps its own local query, shows a live dropdown of matches, and
 * selecting one jumps straight to it — it doesn't affect the active filters.
 */
export function MapSearchBar({ onSelect }: { onSelect: (id: string) => void }) {
  const stations = useAppStore((s) => s.stations);
  const userLocation = useAppStore((s) => s.userLocation);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const blurTimeout = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(blurTimeout.current), []);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const scored = stations
      .filter((s) =>
        `${s.name} ${s.address} ${s.state} ${s.operator}`.toLowerCase().includes(q),
      )
      .map((s) => ({ station: s, distanceKm: userLocation ? haversineKm(userLocation, s) : undefined }));

    scored.sort((a, b) => {
      // Prefer names starting with the query, then distance (if known), then name.
      const aStarts = a.station.name.toLowerCase().startsWith(q) ? 0 : 1;
      const bStarts = b.station.name.toLowerCase().startsWith(q) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;
      if (a.distanceKm !== undefined && b.distanceKm !== undefined) return a.distanceKm - b.distanceKm;
      return a.station.name.localeCompare(b.station.name);
    });

    return scored.slice(0, MAX_RESULTS);
  }, [stations, query, userLocation]);

  function pick(station: Station) {
    onSelect(station.id);
    setQuery("");
    setOpen(false);
  }

  return (
    <div className="absolute left-1/2 top-2.5 z-[1000] w-[calc(100%-5.5rem)] max-w-sm -translate-x-1/2 sm:w-80">
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          // Delay so a click on a dropdown item registers before we close it.
          blurTimeout.current = window.setTimeout(() => setOpen(false), 150);
        }}
        placeholder="Find a charging station…"
        className="w-full rounded-full border border-gray-300 bg-white/95 px-4 py-2 text-sm shadow-md backdrop-blur placeholder:text-gray-400 dark:border-gray-700 dark:bg-gray-900/95 dark:text-gray-100"
      />
      {open && matches.length > 0 && (
        <div className="mt-1 max-h-72 overflow-y-auto rounded-xl border border-gray-200 bg-white/95 shadow-lg backdrop-blur dark:border-gray-700 dark:bg-gray-900/95">
          {matches.map(({ station, distanceKm }) => (
            <button
              key={station.id}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(station)}
              className="block w-full border-b border-gray-100 px-4 py-2 text-left text-sm last:border-b-0 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800"
            >
              <p className="font-medium">{station.name}</p>
              <p className="text-xs text-gray-500">
                {station.operator} · {station.state}
                {distanceKm !== undefined && ` · ${distanceKm.toFixed(1)} km away`}
              </p>
            </button>
          ))}
        </div>
      )}
      {open && query.trim() && matches.length === 0 && (
        <div className="mt-1 rounded-xl border border-gray-200 bg-white/95 px-4 py-2 text-sm text-gray-400 shadow-lg backdrop-blur dark:border-gray-700 dark:bg-gray-900/95">
          No stations match "{query.trim()}"
        </div>
      )}
    </div>
  );
}
