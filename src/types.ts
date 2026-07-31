export type ConnectorType = "Type2" | "CCS2" | "CHAdeMO" | "GB/T" | "Tesla";

export type CurrentType = "AC" | "DC";

export interface Connector {
  type: ConnectorType;
  current: CurrentType;
  powerKW: number;
  count: number;
}

export type PricingUnit = "perKWh" | "perMinute" | "flatSession" | "free";

export interface Pricing {
  unit: PricingUnit;
  rateMYR: number; // 0 when unit === "free"
  idleFeeMYR?: number; // per-minute penalty after charge completes, if any
  parkingNote?: string;
}

export type BayAvailabilityStatus = "available" | "in_use" | "offline" | "unknown";

export interface BaySnapshot {
  total: number;
  available: number;
  inUse: number;
  offline: number;
  lastUpdated: string; // ISO timestamp of the (simulated) snapshot
}

export type Operator =
  | "ChargEV"
  | "Gentari"
  | "JomCharge"
  | "Shell Recharge"
  | "DC HUB"
  | "Tesla"
  | "ParkEasy"
  | "EV Connection";

export type MalaysianState =
  | "Kuala Lumpur"
  | "Selangor"
  | "Penang"
  | "Johor"
  | "Perak"
  | "Melaka"
  | "Negeri Sembilan"
  | "Pahang"
  | "Sabah"
  | "Sarawak"
  | "Putrajaya";

export type AccessType = "public" | "members-only" | "hotel-guests";

export interface Station {
  id: string;
  name: string;
  operator: Operator;
  address: string;
  state: MalaysianState;
  lat: number;
  lng: number;
  connectors: Connector[];
  pricing: Pricing;
  bays: BaySnapshot;
  amenities: string[];
  operatingHours: string;
  access: AccessType;
  isHighwayCorridor: boolean; // useful for trip planner along expressways
  notes?: string;
}

export interface RouteChargeStop {
  station: Station;
  distanceFromStartKm: number;
  arrivalBatteryPercent: number;
  chargeToPercent: number;
  estimatedChargeMinutes: number;
  estimatedCostMYR: number;
}

export interface TripPlanResult {
  totalDistanceKm: number;
  routeCoordinates: [number, number][]; // [lat, lng]
  stops: RouteChargeStop[];
  feasible: boolean;
  warning?: string;
}

export interface VehicleProfile {
  rangeKm: number; // full-charge range
  batteryCapacityKWh: number;
  startChargePercent: number;
  targetChargePercent: number; // charge-to level at each stop
  minArrivalBufferPercent: number; // safety margin before triggering a stop
}
