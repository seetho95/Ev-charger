import type { Station } from "../types";
import { haversineKm } from "./geo";

const DEDUPE_RADIUS_KM = 0.3;

/**
 * Combines the hand-curated dataset with community (Open Charge Map) data,
 * dropping community entries that sit within DEDUPE_RADIUS_KM of a curated
 * one — those are almost certainly the same physical site, and the curated
 * entry has richer, verified detail.
 */
export function mergeStations(curated: Station[], community: Station[]): Station[] {
  const extra = community.filter(
    (c) => !curated.some((k) => haversineKm(k, c) < DEDUPE_RADIUS_KM),
  );
  return [...curated, ...extra];
}
