import type { Connector, Operator, Pricing } from "../types";

/**
 * Baseline connector line-ups and tariffs per charge point operator (CPO).
 * Individual stations override pieces of this (e.g. a mall site might only
 * have the AC connector, a highway R&R might only have DC).
 */
export const OPERATOR_DEFAULTS: Record<
  Operator,
  { connectors: Connector[]; pricing: Pricing }
> = {
  ChargEV: {
    connectors: [
      { type: "Type2", current: "AC", powerKW: 22, count: 2 },
      { type: "CCS2", current: "DC", powerKW: 60, count: 1 },
    ],
    pricing: { unit: "perKWh", rateMYR: 1.2 },
  },
  Gentari: {
    connectors: [
      { type: "Type2", current: "AC", powerKW: 22, count: 2 },
      { type: "CCS2", current: "DC", powerKW: 120, count: 2 },
    ],
    pricing: { unit: "perKWh", rateMYR: 1.3, idleFeeMYR: 0.5 },
  },
  JomCharge: {
    connectors: [{ type: "Type2", current: "AC", powerKW: 22, count: 2 }],
    pricing: { unit: "perKWh", rateMYR: 1.0 },
  },
  "Shell Recharge": {
    connectors: [
      { type: "CCS2", current: "DC", powerKW: 180, count: 2 },
      { type: "Type2", current: "AC", powerKW: 22, count: 1 },
    ],
    pricing: { unit: "perKWh", rateMYR: 1.45, idleFeeMYR: 0.6 },
  },
  "DC HUB": {
    connectors: [{ type: "CCS2", current: "DC", powerKW: 60, count: 1 }],
    pricing: { unit: "perKWh", rateMYR: 1.1 },
  },
  Tesla: {
    connectors: [{ type: "Tesla", current: "DC", powerKW: 250, count: 4 }],
    pricing: { unit: "perKWh", rateMYR: 1.35 },
  },
  ParkEasy: {
    connectors: [{ type: "Type2", current: "AC", powerKW: 7, count: 2 }],
    pricing: { unit: "perMinute", rateMYR: 0.2, parkingNote: "Standard mall parking fee applies" },
  },
  "EV Connection": {
    connectors: [
      { type: "Type2", current: "AC", powerKW: 22, count: 1 },
      { type: "CCS2", current: "DC", powerKW: 50, count: 1 },
    ],
    pricing: { unit: "perKWh", rateMYR: 1.15 },
  },
};
