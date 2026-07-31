import type { Connector, ConnectorType, CurrentType, Station } from "../types";

/**
 * Open Charge Map (openchargemap.org) is a free, community-maintained,
 * global database of EV charging locations, including many more Malaysian
 * commercial sites than we can hand-curate. It does NOT track live bay
 * occupancy — only that a location/connector spec was submitted and,
 * loosely, whether the site is marked operational. Entries from here are
 * tagged `source: "community"` and rendered with a distinct "not tracked"
 * status rather than fabricated available/busy counts.
 */

const OCM_ENDPOINT = "https://api.openchargemap.io/v3/poi/";
const FETCH_TIMEOUT_MS = 15_000;
const MAX_ATTEMPTS = 2;
const RETRY_DELAY_MS = 1_500;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface OcmConnection {
  ConnectionType?: { Title?: string };
  CurrentType?: { Title?: string };
  PowerKW?: number;
  Quantity?: number;
}

interface OcmPoi {
  ID: number;
  AddressInfo?: {
    Title?: string;
    AddressLine1?: string;
    Town?: string;
    StateOrProvince?: string;
    Latitude?: number;
    Longitude?: number;
  };
  Connections?: OcmConnection[];
  OperatorInfo?: { Title?: string };
  StatusType?: { IsOperational?: boolean };
  UsageType?: { Title?: string };
  NumberOfPoints?: number;
  DateLastStatusUpdate?: string;
}

function normalizeConnectorType(title: string | undefined): ConnectorType {
  const t = (title ?? "").toLowerCase();
  if (t.includes("ccs") || t.includes("combo")) return "CCS2";
  if (t.includes("chademo")) return "CHAdeMO";
  if (t.includes("tesla")) return "Tesla";
  if (t.includes("gb/t") || t.includes("gb t")) return "GB/T";
  if (t.includes("type 2") || t.includes("type2") || t.includes("mennekes")) return "Type2";
  return "Other";
}

function normalizeCurrentType(title: string | undefined, connectorType: ConnectorType): CurrentType {
  const t = (title ?? "").toLowerCase();
  if (t.includes("dc")) return "DC";
  if (t.includes("ac")) return "AC";
  // Fall back on a sensible default per connector family when OCM omits CurrentType.
  return connectorType === "Type2" ? "AC" : "DC";
}

function mapConnectors(connections: OcmConnection[] | undefined): Connector[] {
  if (!connections || connections.length === 0) {
    return [{ type: "Other", current: "AC", powerKW: 0, count: 1 }];
  }
  return connections.map((c) => {
    const type = normalizeConnectorType(c.ConnectionType?.Title);
    return {
      type,
      current: normalizeCurrentType(c.CurrentType?.Title, type),
      powerKW: typeof c.PowerKW === "number" && c.PowerKW > 0 ? c.PowerKW : 0,
      count: typeof c.Quantity === "number" && c.Quantity > 0 ? c.Quantity : 1,
    };
  });
}

export function mapPoiToStation(poi: OcmPoi): Station | null {
  const info = poi.AddressInfo;
  if (!info || typeof info.Latitude !== "number" || typeof info.Longitude !== "number") return null;

  const connectors = mapConnectors(poi.Connections);
  const total = Math.max(
    poi.NumberOfPoints ?? 0,
    connectors.reduce((sum, c) => sum + c.count, 0),
    1,
  );
  const operational = poi.StatusType?.IsOperational !== false;

  return {
    id: `ocm-${poi.ID}`,
    name: info.Title?.trim() || "EV Charging Station",
    operator: poi.OperatorInfo?.Title?.trim() || "Other",
    address: [info.AddressLine1, info.Town, info.StateOrProvince].filter(Boolean).join(", "),
    state: info.StateOrProvince?.trim() || "Unknown",
    lat: info.Latitude,
    lng: info.Longitude,
    connectors,
    pricing: { unit: "unknown", rateMYR: 0 },
    bays: {
      total,
      available: operational ? total : 0,
      inUse: 0,
      offline: operational ? 0 : total,
      lastUpdated: poi.DateLastStatusUpdate ?? new Date(0).toISOString(),
    },
    amenities: [],
    operatingHours: poi.UsageType?.Title || "Check operator app for hours",
    access: "public",
    isHighwayCorridor: false,
    source: "community",
  };
}

async function fetchOnce(): Promise<Station[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const url = new URL(OCM_ENDPOINT);
    url.searchParams.set("output", "json");
    url.searchParams.set("countrycode", "MY");
    // Kept modest rather than the full remote max — a smaller, faster
    // response is more likely to complete within FETCH_TIMEOUT_MS on a
    // mobile connection than a larger one that just times out instead.
    url.searchParams.set("maxresults", "500");
    url.searchParams.set("compact", "true");

    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`Open Charge Map request failed (${res.status})`);

    const data = (await res.json()) as OcmPoi[];
    if (!Array.isArray(data)) throw new Error("Open Charge Map returned an unexpected response shape");

    return data.map(mapPoiToStation).filter((s): s is Station => s !== null);
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Fetches Malaysian charging locations from Open Charge Map. Returns an
 * empty array (never throws) on network failure or malformed responses, so
 * callers can treat "no community data" the same as "fetch failed" and just
 * keep showing the curated dataset. Retries once after a short delay, since
 * a single dropped request on a mobile connection shouldn't hide the whole
 * community layer for the rest of the session.
 */
export async function fetchOpenChargeMapStations(): Promise<Station[]> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await fetchOnce();
    } catch (err) {
      const isLastAttempt = attempt === MAX_ATTEMPTS;
      console.error(
        `Open Charge Map fetch failed (attempt ${attempt}/${MAX_ATTEMPTS})${isLastAttempt ? ", giving up" : ", retrying"}:`,
        err,
      );
      if (isLastAttempt) return [];
      await sleep(RETRY_DELAY_MS);
    }
  }
  return [];
}
