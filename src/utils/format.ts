import type { BaySnapshot, Pricing, Station } from "../types";

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
  }
}

export type AvailabilityStatus = "available" | "busy" | "offline";

export function availabilityStatus(bays: BaySnapshot): AvailabilityStatus {
  if (bays.total > 0 && bays.offline >= bays.total) return "offline";
  if (bays.available > 0) return "available";
  return "busy";
}

export const STATUS_COLOR: Record<AvailabilityStatus, string> = {
  available: "#16a34a",
  busy: "#dc2626",
  offline: "#6b7280",
};

export const STATUS_LABEL: Record<AvailabilityStatus, string> = {
  available: "Bays available",
  busy: "All bays occupied",
  offline: "Offline",
};

export function connectorSummary(station: Station): string {
  return station.connectors.map((c) => `${c.type} ${c.powerKW}kW ×${c.count}`).join(", ");
}
