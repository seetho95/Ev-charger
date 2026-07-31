import { useMemo } from "react";
import { useAppStore } from "../store";
import type { ConnectorType } from "../types";

const CONNECTOR_TYPES: ConnectorType[] = ["Type2", "CCS2", "CHAdeMO", "GB/T", "Tesla", "Other"];

export function FilterBar() {
  const stations = useAppStore((s) => s.stations);
  const stationsLoading = useAppStore((s) => s.stationsLoading);
  const communityLoadError = useAppStore((s) => s.communityLoadError);
  const loadCommunityStations = useAppStore((s) => s.loadCommunityStations);
  const filters = useAppStore((s) => s.filters);
  const toggleOperator = useAppStore((s) => s.toggleOperator);
  const toggleState = useAppStore((s) => s.toggleState);
  const toggleConnector = useAppStore((s) => s.toggleConnector);
  const setOnlyAvailable = useAppStore((s) => s.setOnlyAvailable);
  const setSearch = useAppStore((s) => s.setSearch);
  const clearFilters = useAppStore((s) => s.clearFilters);
  const refreshAvailability = useAppStore((s) => s.refreshAvailability);
  const lastRefreshed = useAppStore((s) => s.lastRefreshed);

  const allOperators = useMemo(
    () => Array.from(new Set(stations.map((s) => s.operator))).sort(),
    [stations],
  );
  const allStates = useMemo(
    () => Array.from(new Set(stations.map((s) => s.state))).sort(),
    [stations],
  );
  const communityCount = useMemo(
    () => stations.filter((s) => s.source === "community").length,
    [stations],
  );

  const activeCount =
    filters.operators.length + filters.states.length + filters.connectorTypes.length + (filters.onlyAvailable ? 1 : 0);

  return (
    <div className="space-y-3 text-sm">
      <input
        type="text"
        placeholder="Search by name, mall, city..."
        value={filters.search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-1.5 text-sm"
      />

      {stationsLoading && (
        <p className="text-xs text-gray-400">Loading community-sourced stations from Open Charge Map…</p>
      )}
      {!stationsLoading && communityCount > 0 && (
        <p className="text-xs text-gray-400">
          {communityCount} additional community-sourced station{communityCount === 1 ? "" : "s"} loaded (blue markers — availability not tracked).
        </p>
      )}
      {!stationsLoading && communityLoadError && (
        <p className="text-xs text-amber-600">
          Couldn't reach Open Charge Map — showing curated stations only.{" "}
          <button onClick={loadCommunityStations} className="underline">
            Retry
          </button>
        </p>
      )}

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={filters.onlyAvailable}
          onChange={(e) => setOnlyAvailable(e.target.checked)}
        />
        Only show stations with a free bay
      </label>

      <div>
        <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Network</p>
        <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
          {allOperators.map((op) => (
            <Chip key={op} active={filters.operators.includes(op)} onClick={() => toggleOperator(op)}>
              {op}
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">State</p>
        <div className="flex max-h-24 flex-wrap gap-1.5 overflow-y-auto">
          {allStates.map((st) => (
            <Chip key={st} active={filters.states.includes(st)} onClick={() => toggleState(st)}>
              {st}
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Connector</p>
        <div className="flex flex-wrap gap-1.5">
          {CONNECTOR_TYPES.map((c) => (
            <Chip key={c} active={filters.connectorTypes.includes(c)} onClick={() => toggleConnector(c)}>
              {c}
            </Chip>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between pt-1">
        <button
          onClick={clearFilters}
          disabled={activeCount === 0}
          className="text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 disabled:opacity-40"
        >
          Clear filters {activeCount > 0 && `(${activeCount})`}
        </button>
        <button
          onClick={refreshAvailability}
          className="text-xs rounded-md border border-gray-300 dark:border-gray-700 px-2 py-1 hover:bg-gray-50 dark:hover:bg-gray-800"
          title="Simulated refresh for curated stations — see README for data provenance notes"
        >
          ⟳ Refresh availability
        </button>
      </div>
      {lastRefreshed && (
        <p className="text-xs text-gray-400">Last refreshed {lastRefreshed} (simulated, curated stations only)</p>
      )}
    </div>
  );
}

function Chip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-2.5 py-1 text-xs border transition-colors ${
        active
          ? "bg-blue-600 text-white border-blue-600"
          : "border-gray-300 dark:border-gray-700 hover:border-blue-400"
      }`}
    >
      {children}
    </button>
  );
}
