import { useAppStore } from "../store";
import { useVisibleStations } from "../hooks/useVisibleStations";
import { StationCard } from "./StationCard";

export function StationList() {
  const allStations = useAppStore((s) => s.stations);
  const selectedStationId = useAppStore((s) => s.selectedStationId);
  const selectStation = useAppStore((s) => s.selectStation);
  const { stations: filtered, distances } = useVisibleStations();

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-400">{filtered.length} of {allStations.length} stations</p>
      <div className="space-y-2 max-h-full overflow-y-auto pr-1">
        {filtered.map((s) => (
          <StationCard
            key={s.id}
            station={s}
            selected={s.id === selectedStationId}
            onClick={() => selectStation(s.id)}
            distanceKm={distances.get(s.id)}
          />
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-gray-400 py-6 text-center">No stations match your filters.</p>
        )}
      </div>
    </div>
  );
}
