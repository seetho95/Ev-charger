import { useState } from "react";
import { MY_CITIES } from "../data/cities";
import { fetchDrivingRoute, geocodeMalaysia, type GeoPoint } from "../services/routing";
import { useAppStore } from "../store";
import type { TripPlanResult, VehicleProfile } from "../types";
import { planChargingStops } from "../utils/tripPlanner";
import { formatPricing } from "../utils/format";

interface TripPlannerProps {
  onResult: (result: TripPlanResult | null) => void;
  onSelectStop: (stationId: string) => void;
}

const DEFAULT_VEHICLE: VehicleProfile = {
  rangeKm: 300,
  batteryCapacityKWh: 60,
  startChargePercent: 90,
  targetChargePercent: 80,
  minArrivalBufferPercent: 15,
};

async function resolveLocation(query: string): Promise<GeoPoint | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const preset = MY_CITIES.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
  if (preset) return { label: preset.name, lat: preset.lat, lng: preset.lng };

  const partial = MY_CITIES.find((c) => c.name.toLowerCase().includes(trimmed.toLowerCase()));
  try {
    const geocoded = await geocodeMalaysia(trimmed);
    if (geocoded) return geocoded;
  } catch {
    // fall through to partial-match fallback below
  }
  return partial ? { label: partial.name, lat: partial.lat, lng: partial.lng } : null;
}

export function TripPlanner({ onResult, onSelectStop }: TripPlannerProps) {
  const stations = useAppStore((s) => s.stations);
  const [origin, setOrigin] = useState("Kuala Lumpur");
  const [destination, setDestination] = useState("George Town, Penang");
  const [vehicle, setVehicle] = useState<VehicleProfile>(DEFAULT_VEHICLE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TripPlanResult | null>(null);
  const [routeApproximate, setRouteApproximate] = useState(false);

  async function handlePlan() {
    setLoading(true);
    setError(null);
    try {
      const [originPoint, destPoint] = await Promise.all([
        resolveLocation(origin),
        resolveLocation(destination),
      ]);
      if (!originPoint) throw new Error(`Couldn't find "${origin}" in Malaysia. Try a nearby city name.`);
      if (!destPoint) throw new Error(`Couldn't find "${destination}" in Malaysia. Try a nearby city name.`);

      const route = await fetchDrivingRoute(originPoint, destPoint);
      setRouteApproximate(route.approximate);

      const plan = planChargingStops(route.coordinates, route.distanceKm, stations, vehicle);
      setResult(plan);
      onResult(plan);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong planning this trip.");
      setResult(null);
      onResult(null);
    } finally {
      setLoading(false);
    }
  }

  const totalCost = result?.stops.reduce((sum, s) => sum + s.estimatedCostMYR, 0) ?? 0;
  const totalChargeMinutes = result?.stops.reduce((sum, s) => sum + s.estimatedChargeMinutes, 0) ?? 0;

  return (
    <div className="space-y-5 text-sm">
      <div className="grid grid-cols-1 gap-3">
        <LocationField label="From" value={origin} onChange={setOrigin} />
        <LocationField label="To" value={destination} onChange={setDestination} />
      </div>

      <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-3">
        <p className="text-xs uppercase tracking-wide text-gray-400">Vehicle profile</p>
        <NumberField
          label="Full-charge range (km)"
          value={vehicle.rangeKm}
          onChange={(v) => setVehicle((p) => ({ ...p, rangeKm: v }))}
          min={50}
          max={800}
        />
        <NumberField
          label="Battery capacity (kWh)"
          value={vehicle.batteryCapacityKWh}
          onChange={(v) => setVehicle((p) => ({ ...p, batteryCapacityKWh: v }))}
          min={10}
          max={150}
        />
        <NumberField
          label="Starting charge (%)"
          value={vehicle.startChargePercent}
          onChange={(v) => setVehicle((p) => ({ ...p, startChargePercent: v }))}
          min={10}
          max={100}
        />
        <NumberField
          label="Charge target at each stop (%)"
          value={vehicle.targetChargePercent}
          onChange={(v) => setVehicle((p) => ({ ...p, targetChargePercent: v }))}
          min={20}
          max={100}
        />
        <NumberField
          label="Safety buffer at arrival (%)"
          value={vehicle.minArrivalBufferPercent}
          onChange={(v) => setVehicle((p) => ({ ...p, minArrivalBufferPercent: v }))}
          min={0}
          max={50}
        />
      </div>

      <button
        onClick={handlePlan}
        disabled={loading}
        className="w-full rounded-md bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2 font-medium"
      >
        {loading ? "Planning route..." : "Plan trip"}
      </button>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      {result && (
        <div className="space-y-3">
          <div className="rounded-lg bg-gray-50 dark:bg-gray-800/60 p-3 space-y-1">
            <p><span className="font-medium">{result.totalDistanceKm.toFixed(0)} km</span> total distance</p>
            <p>{result.stops.length} charging stop{result.stops.length === 1 ? "" : "s"} needed</p>
            {result.stops.length > 0 && (
              <p>~{Math.round(totalChargeMinutes)} min charging · ~RM {totalCost.toFixed(2)} est. cost</p>
            )}
            {routeApproximate && (
              <p className="text-xs text-amber-600">
                Live routing service unavailable — showing a straight-line distance estimate instead of actual road route.
              </p>
            )}
            {result.warning && <p className="text-xs text-amber-600">{result.warning}</p>}
            {!result.feasible && (
              <p className="text-xs text-red-600 font-medium">
                Trip may not be completable as configured — see warning above.
              </p>
            )}
          </div>

          <div className="space-y-2">
            {result.stops.map((stop, i) => (
              <button
                key={stop.station.id}
                onClick={() => onSelectStop(stop.station.id)}
                className="w-full text-left rounded-lg border border-gray-200 dark:border-gray-700 p-3 hover:border-blue-300"
              >
                <p className="font-medium">
                  Stop {i + 1}: {stop.station.name}
                </p>
                <p className="text-xs text-gray-500">
                  {stop.distanceFromStartKm.toFixed(0)} km in · {stop.station.operator} · {formatPricing(stop.station.pricing)}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  Arrive at ~{stop.arrivalBatteryPercent.toFixed(0)}% → charge to {stop.chargeToPercent}%
                  {" · "}~{Math.round(stop.estimatedChargeMinutes)} min · ~RM {stop.estimatedCostMYR.toFixed(2)}
                </p>
              </button>
            ))}
            {result.stops.length === 0 && (
              <p className="text-sm text-green-700 dark:text-green-400">
                No charging stops needed — this trip is within your vehicle's range.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function LocationField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wide text-gray-400">{label}</span>
      <input
        list="my-cities"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-1.5"
        placeholder="e.g. Kuala Lumpur"
      />
      <datalist id="my-cities">
        {MY_CITIES.map((c) => (
          <option key={c.name} value={c.name} />
        ))}
      </datalist>
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
}) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="text-gray-600 dark:text-gray-300">{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-20 rounded-md border border-gray-300 dark:border-gray-700 bg-transparent px-2 py-1 text-right"
      />
    </label>
  );
}
