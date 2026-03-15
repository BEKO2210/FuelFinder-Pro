const BASE_URL = 'https://creativecommons.tankerkoenig.de/json';
const API_KEY = import.meta.env.VITE_TANKERKOENIG_API_KEY ?? '';
const TIMEOUT = 10000;
async function apiFetch(path, params) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT);
    const url = new URL(`${BASE_URL}/${path}`);
    url.searchParams.set('apikey', API_KEY);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    try {
        const res = await fetch(url.toString(), { signal: controller.signal });
        if (res.status === 401 || res.status === 403) {
            throw new Error('API-Key ungültig oder nicht gesetzt. Bitte prüfe deine Konfiguration.');
        }
        if (res.status === 429) {
            throw new Error('API Rate-Limit erreicht. Bitte warte einen Moment.');
        }
        if (!res.ok) {
            throw new Error(`API-Fehler: ${res.status} ${res.statusText}`);
        }
        const data = await res.json();
        if (!data.ok) {
            throw new Error(data.message ?? 'Unbekannter API-Fehler');
        }
        return data;
    }
    catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
            throw new Error('Zeitüberschreitung bei der API-Anfrage. Bitte versuche es erneut.');
        }
        throw err;
    }
    finally {
        clearTimeout(timer);
    }
}
export async function fetchStations(lat, lng, radius, fuelType) {
    return apiFetch('list.php', {
        lat: lat.toString(),
        lng: lng.toString(),
        rad: Math.min(25, Math.max(1, radius)).toString(),
        sort: 'price',
        type: fuelType,
    });
}
export async function fetchPrices(ids) {
    const batch = ids.slice(0, 10);
    return apiFetch('prices.php', {
        ids: batch.join(','),
    });
}
export async function fetchStationDetail(id) {
    return apiFetch('detail.php', { id });
}
export async function refreshPrices(stationIds) {
    if (stationIds.length === 0)
        return null;
    try {
        return await fetchPrices(stationIds);
    }
    catch (err) {
        console.warn('Preis-Refresh fehlgeschlagen:', err);
        return null;
    }
}
