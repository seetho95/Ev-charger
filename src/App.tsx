import { useState } from "react";
import "leaflet/dist/leaflet.css";
import { FilterBar } from "./components/FilterBar";
import { MapView } from "./components/MapView";
import { StationDetail } from "./components/StationDetail";
import { StationList } from "./components/StationList";
import { TripPlanner } from "./components/TripPlanner";
import { stationMatchesFilters, useAppStore } from "./store";
import type { TripPlanResult } from "./types";

function App() {
  const view = useAppStore((s) => s.view);
  const setView = useAppStore((s) => s.setView);
  const stations = useAppStore((s) => s.stations);
  const filters = useAppStore((s) => s.filters);
  const selectedStationId = useAppStore((s) => s.selectedStationId);
  const selectStation = useAppStore((s) => s.selectStation);

  const [tripResult, setTripResult] = useState<TripPlanResult | null>(null);

  const visibleStations =
    view === "map" ? stations.filter((s) => stationMatchesFilters(s, filters)) : stations;

  const selectedStation = stations.find((s) => s.id === selectedStationId);

  return (
    <div className="flex h-screen w-screen flex-col bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <header className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 px-4 py-3">
        <div>
          <h1 className="text-lg font-semibold">MY EV Charge</h1>
          <p className="text-xs text-gray-400">Malaysia EV charging station tracker</p>
        </div>
        <nav className="flex gap-1 rounded-lg bg-gray-100 dark:bg-gray-800 p-1">
          <TabButton active={view === "map"} onClick={() => setView("map")}>
            Explore
          </TabButton>
          <TabButton active={view === "trip"} onClick={() => setView("trip")}>
            Trip Planner
          </TabButton>
        </nav>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-96 shrink-0 overflow-y-auto border-r border-gray-200 dark:border-gray-800 p-4">
          {view === "map" ? (
            <div className="space-y-4">
              <FilterBar />
              {selectedStation ? (
                <StationDetail station={selectedStation} onClose={() => selectStation(null)} />
              ) : (
                <StationList />
              )}
            </div>
          ) : (
            <TripPlanner onResult={setTripResult} onSelectStop={selectStation} />
          )}
        </aside>

        <main className="flex-1">
          <MapView
            stations={visibleStations}
            selectedId={selectedStationId}
            onSelect={selectStation}
            routeCoordinates={view === "trip" ? (tripResult?.routeCoordinates ?? undefined) : undefined}
          />
        </main>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        active ? "bg-white dark:bg-gray-950 shadow-sm" : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
      }`}
    >
      {children}
    </button>
  );
}

export default App;
