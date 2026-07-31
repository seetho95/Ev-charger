import { create } from "zustand";
import { getStations, simulateAvailabilityRefresh } from "./services/stationSource";
import type { ConnectorType, MalaysianState, Operator, Station } from "./types";

export type ViewMode = "map" | "trip";

interface Filters {
  operators: Operator[];
  states: MalaysianState[];
  connectorTypes: ConnectorType[];
  onlyAvailable: boolean;
  search: string;
}

interface AppState {
  stations: Station[];
  filters: Filters;
  selectedStationId: string | null;
  view: ViewMode;
  lastRefreshed: string;
  setView: (v: ViewMode) => void;
  selectStation: (id: string | null) => void;
  toggleOperator: (op: Operator) => void;
  toggleState: (s: MalaysianState) => void;
  toggleConnector: (c: ConnectorType) => void;
  setOnlyAvailable: (v: boolean) => void;
  setSearch: (v: string) => void;
  clearFilters: () => void;
  refreshAvailability: () => void;
}

const EMPTY_FILTERS: Filters = {
  operators: [],
  states: [],
  connectorTypes: [],
  onlyAvailable: false,
  search: "",
};

export const useAppStore = create<AppState>((set) => ({
  stations: getStations(),
  filters: EMPTY_FILTERS,
  selectedStationId: null,
  view: "map",
  lastRefreshed: "",
  setView: (v) => set({ view: v }),
  selectStation: (id) => set({ selectedStationId: id }),
  toggleOperator: (op) =>
    set((state) => ({
      filters: {
        ...state.filters,
        operators: toggleInList(state.filters.operators, op),
      },
    })),
  toggleState: (s) =>
    set((state) => ({
      filters: {
        ...state.filters,
        states: toggleInList(state.filters.states, s),
      },
    })),
  toggleConnector: (c) =>
    set((state) => ({
      filters: {
        ...state.filters,
        connectorTypes: toggleInList(state.filters.connectorTypes, c),
      },
    })),
  setOnlyAvailable: (v) =>
    set((state) => ({ filters: { ...state.filters, onlyAvailable: v } })),
  setSearch: (v) => set((state) => ({ filters: { ...state.filters, search: v } })),
  clearFilters: () => set({ filters: EMPTY_FILTERS }),
  refreshAvailability: () =>
    set((state) => ({
      stations: simulateAvailabilityRefresh(state.stations),
      lastRefreshed: new Date().toLocaleTimeString("en-MY", { hour12: false }),
    })),
}));

function toggleInList<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function stationMatchesFilters(station: Station, filters: Filters): boolean {
  if (filters.operators.length && !filters.operators.includes(station.operator)) return false;
  if (filters.states.length && !filters.states.includes(station.state)) return false;
  if (
    filters.connectorTypes.length &&
    !station.connectors.some((c) => filters.connectorTypes.includes(c.type))
  )
    return false;
  if (filters.onlyAvailable && station.bays.available <= 0) return false;
  if (filters.search.trim()) {
    const q = filters.search.trim().toLowerCase();
    const haystack = `${station.name} ${station.address} ${station.state} ${station.operator}`.toLowerCase();
    if (!haystack.includes(q)) return false;
  }
  return true;
}
