export interface MapStyle {
  id: string;
  name: string;
  url: string;
  subdomains: string;
  attribution: string;
  dark: boolean;
}

const CARTO_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

/**
 * A handful of free CARTO basemap styles, from most to least minimal. All
 * are the same CARTO service already in use (no new provider/cost).
 */
export const MAP_STYLES: MapStyle[] = [
  {
    id: "positron",
    name: "Minimal",
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    subdomains: "abcd",
    attribution: CARTO_ATTRIBUTION,
    dark: false,
  },
  {
    id: "positron-nolabels",
    name: "Bare",
    url: "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png",
    subdomains: "abcd",
    attribution: CARTO_ATTRIBUTION,
    dark: false,
  },
  {
    id: "voyager",
    name: "Voyager",
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    subdomains: "abcd",
    attribution: CARTO_ATTRIBUTION,
    dark: false,
  },
  {
    id: "dark",
    name: "Dark",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    subdomains: "abcd",
    attribution: CARTO_ATTRIBUTION,
    dark: true,
  },
];

export const DEFAULT_MAP_STYLE_ID = "positron";
const STORAGE_KEY = "ev-charger:map-style";

export function loadSavedMapStyleId(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved && MAP_STYLES.some((s) => s.id === saved) ? saved : DEFAULT_MAP_STYLE_ID;
  } catch {
    return DEFAULT_MAP_STYLE_ID;
  }
}

export function saveMapStyleId(id: string) {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // localStorage unavailable (private browsing, etc.) — not worth surfacing
  }
}
