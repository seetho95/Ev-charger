import { useEffect, useMemo, useRef, useState } from "react";
import { useAppStore } from "../store";
import type { Station } from "../types";
import { haversineKm } from "../utils/geo";

function googleMapsQueryUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${query} EV charger Malaysia`)}`;
}

const MAX_RESULTS = 8;

interface StationSearchBoxProps {
  /** "overlay" floats as a pill on top of the map; "inline" matches the sidebar's plain inputs. */
  variant: "overlay" | "inline";
}

/**
 * Search box shared by the map overlay and the sidebar: typing narrows the
 * visible stations (bound to the same filters.search everything else reads),
 * and also shows a live dropdown of best matches so you can jump straight to
 * one — including from the default mobile list view, not just the map.
 */
export function StationSearchBox({ variant }: StationSearchBoxProps) {
  const stations = useAppStore((s) => s.stations);
  const userLocation = useAppStore((s) => s.userLocation);
  const search = useAppStore((s) => s.filters.search);
  const setSearch = useAppStore((s) => s.setSearch);
  const selectStation = useAppStore((s) => s.selectStation);
  const [open, setOpen] = useState(false);
  const blurTimeout = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(blurTimeout.current), []);

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
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
  }, [stations, search, userLocation]);

  function pick(station: Station) {
    selectStation(station.id);
    setSearch("");
    setOpen(false);
  }

  const wrapperClass =
    variant === "overlay"
      ? "absolute left-1/2 top-2.5 z-[1000] w-[calc(100%-5.5rem)] max-w-sm -translate-x-1/2 sm:w-80"
      : "relative";

  const inputClass =
    variant === "overlay"
      ? "w-full rounded-full border border-gray-300 bg-white/95 px-4 py-2 text-sm shadow-md backdrop-blur placeholder:text-gray-400 dark:border-gray-700 dark:bg-gray-900/95 dark:text-gray-100"
      : "w-full rounded-md border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-1.5 text-sm";

  return (
    <div className={wrapperClass}>
      <input
        type="text"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          // Delay so a click on a dropdown item registers before we close it.
          blurTimeout.current = window.setTimeout(() => setOpen(false), 150);
        }}
        placeholder="Search by name, mall, city..."
        className={inputClass}
      />
      {open && search.trim() && (
        <div className="absolute left-0 right-0 z-[1000] mt-1 max-h-80 overflow-y-auto rounded-xl border border-gray-200 bg-white/95 shadow-lg backdrop-blur dark:border-gray-700 dark:bg-gray-900/95">
          {matches.length > 0 ? (
            matches.map(({ station, distanceKm }) => (
              <button
                key={station.id}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(station)}
                className="block w-full border-b border-gray-100 px-4 py-2 text-left text-sm hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800"
              >
                <p className="font-medium">{station.name}</p>
                <p className="text-xs text-gray-500">
                  {station.operator} · {station.state}
                  {distanceKm !== undefined && ` · ${distanceKm.toFixed(1)} km away`}
                </p>
              </button>
            ))
          ) : (
            <p className="px-4 py-2 text-sm text-gray-400">No stations match "{search.trim()}"</p>
          )}
          <a
            href={googleMapsQueryUrl(search.trim())}
            target="_blank"
            rel="noreferrer"
            onMouseDown={(e) => e.preventDefault()}
            className="block px-4 py-2 text-left text-sm text-blue-600 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            🔍 Search "{search.trim()}" on Google Maps →
          </a>
        </div>
      )}
    </div>
  );
}
