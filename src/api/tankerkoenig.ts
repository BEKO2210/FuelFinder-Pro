// Tankerkoenig API — Tankstellenpreise aus Deutschland
// Unterstuetzt: Vorgeladene Daten (GitHub Actions) + Live-API Fallback

import type { TKListResponse, TKPricesResponse, TKDetailResponse, FuelType, TKStation } from '../types';

const BASE_URL = 'https://creativecommons.tankerkoenig.de/json';
const API_KEY = import.meta.env.VITE_TANKERKOENIG_API_KEY ?? '';
const TIMEOUT = 10000;

// === VORGELADENE DATEN (von GitHub Actions geholt) ===

interface CachedData {
  lastUpdated: string;
  stationCount: number;
  stations: Array<{
    id: string;
    name: string;
    brand: string;
    street: string;
    houseNumber: string;
    postCode: number;
    place: string;
    lat: number;
    lng: number;
    isOpen: boolean;
    e5: number | null;
    e10: number | null;
    diesel: number | null;
  }>;
}

let cachedData: CachedData | null = null;
let cacheLoadedAt = 0;

// Vorgeladene Daten aus public/data/stations.json laden
export async function loadCachedStations(): Promise<CachedData | null> {
  // Cache 5 Minuten im Speicher halten
  if (cachedData && Date.now() - cacheLoadedAt < 5 * 60 * 1000) {
    return cachedData;
  }

  try {
    const res = await fetch('./data/stations.json', { cache: 'no-cache' });
    if (!res.ok) return null;
    cachedData = await res.json();
    cacheLoadedAt = Date.now();
    return cachedData;
  } catch {
    return null;
  }
}

// Vorgeladene Stationen nach Entfernung filtern und Preis setzen
export function filterCachedStations(
  data: CachedData,
  lat: number,
  lng: number,
  radius: number,
  fuelType: FuelType
): TKStation[] {
  return data.stations
    .map(s => {
      const dist = haversine(lat, lng, s.lat, s.lng);
      const price = getFuelPrice(s, fuelType);
      return {
        ...s,
        dist,
        price,
      } as TKStation;
    })
    .filter(s => s.dist <= radius && s.price !== null)
    .sort((a, b) => (a.price ?? 999) - (b.price ?? 999));
}

// Haversine-Distanz in km
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Preis fuer gewaehlten Kraftstoff
function getFuelPrice(
  s: { e5: number | null; e10: number | null; diesel: number | null },
  fuelType: FuelType
): number | null {
  switch (fuelType) {
    case 'e5': return s.e5;
    case 'e10': return s.e10;
    case 'diesel': return s.diesel;
    default: return null;
  }
}

// Zeitpunkt der letzten Datenaktualisierung
export function getCacheAge(): string | null {
  if (!cachedData) return null;
  return cachedData.lastUpdated;
}

// === LIVE API (Fallback wenn keine vorgeladenen Daten) ===

async function apiFetch<T>(path: string, params: Record<string, string>): Promise<T> {
  if (!API_KEY) {
    throw new Error('Kein API-Key konfiguriert. Preise werden aus dem Cache geladen.');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);

  const url = new URL(`${BASE_URL}/${path}`);
  url.searchParams.set('apikey', API_KEY);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  try {
    const res = await fetch(url.toString(), { signal: controller.signal });
    if (res.status === 401 || res.status === 403) {
      throw new Error('API-Key ungueltig oder nicht gesetzt.');
    }
    if (res.status === 429) {
      throw new Error('API Rate-Limit erreicht. Bitte warte einen Moment.');
    }
    if (!res.ok) {
      throw new Error(`API-Fehler: ${res.status} ${res.statusText}`);
    }
    const data = await res.json() as T & { ok: boolean; message?: string };
    if (!data.ok) {
      throw new Error(data.message ?? 'Unbekannter API-Fehler');
    }
    return data;
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('Zeitueberschreitung bei der API-Anfrage.');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchStations(
  lat: number,
  lng: number,
  radius: number,
  fuelType: FuelType
): Promise<TKListResponse> {
  return apiFetch<TKListResponse>('list.php', {
    lat: lat.toString(),
    lng: lng.toString(),
    rad: Math.min(25, Math.max(1, radius)).toString(),
    sort: 'price',
    type: fuelType,
  });
}

export async function fetchPrices(ids: string[]): Promise<TKPricesResponse> {
  const batch = ids.slice(0, 10);
  return apiFetch<TKPricesResponse>('prices.php', {
    ids: batch.join(','),
  });
}

export async function fetchStationDetail(id: string): Promise<TKDetailResponse> {
  return apiFetch<TKDetailResponse>('detail.php', { id });
}

export async function refreshPrices(
  stationIds: string[]
): Promise<TKPricesResponse | null> {
  if (stationIds.length === 0) return null;
  try {
    return await fetchPrices(stationIds);
  } catch (err) {
    console.warn('Preis-Refresh fehlgeschlagen:', err);
    return null;
  }
}
