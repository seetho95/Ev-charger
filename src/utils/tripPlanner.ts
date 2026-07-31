import type { RouteChargeStop, Station, TripPlanResult, VehicleProfile } from "../types";
import { distanceToPolylineKm } from "./geo";

const CORRIDOR_KM = 20; // how far off-route a station can be and still count
const MAX_STOPS = 15; // loop guard

interface ProjectedStation {
  station: Station;
  distanceAlongKm: number;
  lateralKm: number;
}

function projectStationsOntoRoute(stations: Station[], route: [number, number][]): ProjectedStation[] {
  return stations
    .map((station) => {
      const { distanceKm, distanceAlongKm } = distanceToPolylineKm(
        { lat: station.lat, lng: station.lng },
        route,
      );
      return { station, distanceAlongKm, lateralKm: distanceKm };
    })
    .filter((p) => p.lateralKm <= CORRIDOR_KM)
    .sort((a, b) => a.distanceAlongKm - b.distanceAlongKm);
}

function fastestConnectorKW(station: Station): number {
  const dc = station.connectors.filter((c) => c.current === "DC");
  const pool = dc.length > 0 ? dc : station.connectors;
  return pool.reduce((max, c) => Math.max(max, c.powerKW), 0);
}

function estimateCost(station: Station, kWhNeeded: number, minutes: number): number {
  switch (station.pricing.unit) {
    case "perKWh":
      return kWhNeeded * station.pricing.rateMYR;
    case "perMinute":
      return minutes * station.pricing.rateMYR;
    case "flatSession":
      return station.pricing.rateMYR;
    case "free":
      return 0;
  }
}

export function planChargingStops(
  routeCoordinates: [number, number][],
  totalDistanceKm: number,
  stations: Station[],
  vehicle: VehicleProfile,
): TripPlanResult {
  const projected = projectStationsOntoRoute(stations, routeCoordinates);
  const bufferKm = (vehicle.rangeKm * vehicle.minArrivalBufferPercent) / 100;

  let currentDistanceKm = 0;
  let currentRangeKm = (vehicle.rangeKm * vehicle.startChargePercent) / 100;
  const stops: RouteChargeStop[] = [];
  let feasible = true;
  let warning: string | undefined;

  for (let i = 0; i < MAX_STOPS; i++) {
    const remainingTripKm = totalDistanceKm - currentDistanceKm;
    if (currentRangeKm - bufferKm >= remainingTripKm) {
      break; // can reach the destination safely from here
    }

    const reachableSafely = projected.filter(
      (p) =>
        p.distanceAlongKm > currentDistanceKm &&
        p.distanceAlongKm <= currentDistanceKm + currentRangeKm - bufferKm,
    );
    const reachableAtAll = projected.filter(
      (p) => p.distanceAlongKm > currentDistanceKm && p.distanceAlongKm <= currentDistanceKm + currentRangeKm,
    );

    const pool = reachableSafely.length > 0 ? reachableSafely : reachableAtAll;
    if (pool.length === 0) {
      feasible = false;
      warning = `No charging station found within range after ${currentDistanceKm.toFixed(
        0,
      )} km. This route may not be completable with the given vehicle range — consider a higher starting charge or a vehicle with longer range.`;
      break;
    }
    if (reachableSafely.length === 0) {
      warning = `Had to route through a stop below the ${vehicle.minArrivalBufferPercent}% safety buffer near ${pool[
        pool.length - 1
      ].station.name}.`;
    }

    // Greedy: pick the furthest reachable stop to minimise the number of stops.
    const chosen = pool[pool.length - 1];
    const distanceTraveled = chosen.distanceAlongKm - currentDistanceKm;
    const arrivalRangeKm = currentRangeKm - distanceTraveled;
    const arrivalBatteryPercent = Math.max(0, (arrivalRangeKm / vehicle.rangeKm) * 100);
    const chargeToPercent = vehicle.targetChargePercent;
    const kWhNeeded = Math.max(
      0,
      (vehicle.batteryCapacityKWh * (chargeToPercent - arrivalBatteryPercent)) / 100,
    );
    const powerKW = fastestConnectorKW(chosen.station);
    const estimatedChargeMinutes = powerKW > 0 ? (kWhNeeded / powerKW) * 60 : 0;
    const estimatedCostMYR = estimateCost(chosen.station, kWhNeeded, estimatedChargeMinutes);

    stops.push({
      station: chosen.station,
      distanceFromStartKm: chosen.distanceAlongKm,
      arrivalBatteryPercent,
      chargeToPercent,
      estimatedChargeMinutes,
      estimatedCostMYR,
    });

    currentDistanceKm = chosen.distanceAlongKm;
    currentRangeKm = (vehicle.rangeKm * chargeToPercent) / 100;
  }

  return {
    totalDistanceKm,
    routeCoordinates,
    stops,
    feasible,
    warning,
  };
}
