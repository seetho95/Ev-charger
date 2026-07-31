import { useState } from "react";
import "leaflet/dist/leaflet.css";
import { FilterBar } from "./components/FilterBar";
import { MapView } from "./components/MapView";
import { StationDetail } from "./components/StationDetail";
import { StationList } from "./components/StationList";
import { TripPlanner } from "./components/TripPlanner";
import { stationMatchesFilters, useAppStore } from "./store";
import type { TripPlanResult } from "./types";

type MobilePanel = "panel" | "map";

function App() {
  const view = useAppStore((s) => s.view);
  const setView = useAppStore((s) => s.setView);
  const stations = useAppStore((s) => s.stations);
  const filters = useAppStore((s) => s.filters);
  const selectedStationId = useAppStore((s) => s.selectedStationId);
  const selectStation = useAppStore((s) => s.selectStation);

  const [tripResult, setTripResult] = useState<TripPlanResult | null>(null);
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>("panel");

  const visibleStations =
    view === "map" ? stations.filter((s) => stationMatchesFilters(s, filters)) : stations;

  const selectedStation = stations.find((s) => s.id === selectedStationId);

  return (
    <div className="flex h-screen w-screen flex-col bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <header className="flex items-center justify-between gap-2 border-b border-gray-200 dark:border-gray-800 px-3 py-2.5 sm:px-4 sm:py-3">
        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-semibold truncate">MY EV Charge</h1>
          <p className="hidden sm:block text-xs text-gray-400">Malaysia EV charging station tracker</p>
        </div>
        <nav className="flex shrink-0 gap-1 rounded-lg bg-gray-100 dark:bg-gray-800 p-1">
          <TabButton
            active={view === "map"}
            onClick={() => {
              setView("map");
              setMobilePanel("panel");
            }}
          >
            Explore
          </TabButton>
          <TabButton
            active={view === "trip"}
            onClick={() => {
              setView("trip");
              setMobilePanel("panel");
            }}
          >
            Trip Planner
          </TabButton>
        </nav>
      </header>

      <div className="relative flex flex-1 overflow-hidden">
        <aside
          className={`${
            mobilePanel === "panel" ? "flex" : "hidden"
          } w-full flex-col overflow-y-auto border-gray-200 p-4 dark:border-gray-800 md:flex md:w-96 md:shrink-0 md:border-r`}
        >
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

        <main className={`${mobilePanel === "map" ? "block" : "hidden"} flex-1 md:block`}>
          <MapView
            stations={visibleStations}
            selectedId={selectedStationId}
            onSelect={selectStation}
            routeCoordinates={view === "trip" ? (tripResult?.routeCoordinates ?? undefined) : undefined}
          />
        </main>

        <button
          onClick={() => setMobilePanel(mobilePanel === "panel" ? "map" : "panel")}
          className="absolute bottom-5 left-1/2 z-[1000] -translate-x-1/2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg md:hidden"
        >
          {mobilePanel === "panel" ? "🗺️ Show map" : "☰ Show list"}
        </button>
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
