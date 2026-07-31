import type { Pricing, Station } from "../types";

export function formatPricing(p: Pricing): string {
  switch (p.unit) {
    case "free":
      return "Free";
    case "perKWh":
      return `RM ${p.rateMYR.toFixed(2)} / kWh`;
    case "perMinute":
      return `RM ${p.rateMYR.toFixed(2)} / min`;
    case "flatSession":
      return `RM ${p.rateMYR.toFixed(2)} / session`;
    case "unknown":
      return "Pricing not listed";
  }
}

export type AvailabilityStatus = "available" | "busy" | "offline" | "unverified";

/**
 * Community (Open Charge Map) entries don't carry real bay-occupancy data —
 * their bays.available/inUse numbers are just placeholders — so they always
 * render as "unverified" rather than a fabricated available/busy state.
 */
export function availabilityStatus(station: Station): AvailabilityStatus {
  if (station.source === "community") return "unverified";
  const { bays } = station;
  if (bays.total > 0 && bays.offline >= bays.total) return "offline";
  if (bays.available > 0) return "available";
  return "busy";
}

export const STATUS_COLOR: Record<AvailabilityStatus, string> = {
  available: "#16a34a",
  busy: "#dc2626",
  offline: "#6b7280",
  unverified: "#2563eb",
};

export const STATUS_LABEL: Record<AvailabilityStatus, string> = {
  available: "Bays available",
  busy: "All bays occupied",
  offline: "Offline",
  unverified: "Community-sourced · availability not tracked",
};

export function connectorSummary(station: Station): string {
  return station.connectors.map((c) => `${c.type} ${c.powerKW}kW ×${c.count}`).join(", ");
}
