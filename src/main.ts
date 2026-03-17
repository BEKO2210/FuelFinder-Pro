import './styles/main.css';
import { store } from './store/AppStore';
import { loadCachedStations, filterCachedStations, fetchStations, getCacheAge, invalidateCache } from './api/tankerkoenig';
import { calculateSmartResults } from './utils/calculator';
import { getCurrentPosition, getPositionByIP } from './utils/geo';
import { formatTimeAgo } from './utils/formatter';
import { icons } from './utils/icons';
import { initMap, setUserPosition, updateStationMarkers, showRouteLine, removeRouteLine, toggleHeatmap } from './components/Map';
import { initStationList } from './components/StationList';
import { initFilterOverlay } from './components/FilterPanel';
import { initSmartCalculator } from './components/SmartCalculator';
import { initBottomSheet, setSheetState, getSheetState } from './components/BottomSheet';
import { showToast } from './components/Toast';
import { loadFromStorage, saveToStorage } from './utils/storage';

// Auto-Refresh alle 30 Minuten (Daten werden alle 30 Min von GitHub Actions aktualisiert)
const REFRESH_INTERVAL = 30 * 60 * 1000;
let refreshTimer: ReturnType<typeof setInterval> | null = null;
let refreshCountdown = 1800; // 30 Minuten in Sekunden
let countdownInterval: ReturnType<typeof setInterval> | null = null;
let lastRefreshTime = Date.now(); // Zeitpunkt des letzten Refreshs (drift-resistent)

// Haupt-App aufbauen: Vollbild-Karte + Top-Bar + Bottom Sheet
function buildApp(): void {
  const app = document.getElementById('app')!;
  app.innerHTML = `
    <!-- Karte nimmt den gesamten Viewport ein -->
    <div id="map"></div>

    <!-- Schwebende Top-Bar mit Durchschnittspreis und Aktionen -->
    <div class="top-bar">
      <div id="price-ampel" class="top-bar-chip" style="display:none">
        <span class="logo-icon" style="color:var(--fuel-accent)">${icons.fuel}</span>
        <span id="ampel-text">--</span>
      </div>

      <div id="refresh-indicator" class="top-bar-chip" style="gap:4px; font-size:11px; font-weight:500; color:var(--fuel-text-secondary)">
        <svg class="refresh-ring" viewBox="0 0 32 32" width="16" height="16" style="flex-shrink:0">
          <circle cx="16" cy="16" r="13" fill="none" stroke="var(--fuel-surface-3)" stroke-width="3" />
          <circle cx="16" cy="16" r="13" fill="none" stroke="var(--fuel-accent)" stroke-width="3"
            stroke-dasharray="81.68" stroke-dashoffset="0" id="refresh-circle"
            stroke-linecap="round" transform="rotate(-90 16 16)" />
        </svg>
        <span id="refresh-text">--</span>
      </div>

      <div style="flex:1"></div>

      <button id="btn-filter" class="top-bar-btn" aria-label="Filter" title="Filter">
        ${icons.settings}
      </button>
      <button id="btn-refresh" class="top-bar-btn" aria-label="Aktualisieren" title="Preise aktualisieren">
        ${icons.refresh}
      </button>
      <button id="btn-locate" class="top-bar-btn" aria-label="Standort" title="Mein Standort" style="color:var(--fuel-accent)">
        ${icons.crosshair}
      </button>
      <button id="btn-settings" class="top-bar-btn" aria-label="Kalkulator" title="Smart Kalkulator">
        ${icons.fuel}
      </button>
    </div>

    <!-- Bottom Sheet mit Station-Liste (Mobile: drag, Desktop: Sidebar) -->
    <div id="bottom-sheet" class="bottom-sheet state-peek">
      <div class="sheet-handle"><div class="sheet-handle-bar"></div></div>
      <div class="sheet-header" id="sheet-header"></div>
      <div class="sheet-list" id="station-list-wrapper"></div>
    </div>
  `;

  // Karte initialisieren
  const mapContainer = document.getElementById('map')!;
  initMap(mapContainer);

  // Bottom Sheet Drag-Gesten
  const sheet = document.getElementById('bottom-sheet')!;
  initBottomSheet(sheet);

  // Station-Liste im Sheet
  const listWrapper = document.getElementById('station-list-wrapper')!;
  initStationList(listWrapper);

  // Sheet-Header mit Sortier-Pillen
  renderSheetHeader();

  // Filter-Overlay
  initFilterOverlay();

  // Smart Kalkulator
  initSmartCalculator();

  // Event-Listener
  document.getElementById('btn-settings')?.addEventListener('click', () => store.toggleCalculator());
  document.getElementById('btn-locate')?.addEventListener('click', locateUser);
  document.getElementById('btn-refresh')?.addEventListener('click', doRefresh);
  document.getElementById('btn-filter')?.addEventListener('click', openFilter);

  // Store Events
  store.on('positionUpdated', onPositionUpdated);
  store.on('stationSelected', onStationSelected);
  store.on('fuelTypeChanged', onSearchParamsChanged);
  store.on('radiusChanged', onSearchParamsChanged);
  store.on('heatmapToggled', onHeatmapToggled);
  store.on('stationsUpdated', updateAmpel);
  store.on('sortChanged', renderSheetHeader);

  // Retry nach Fehler
  window.addEventListener('fuelfinder:retry', () => {
    const pos = store.getState().position;
    if (pos) searchStations(pos.lat, pos.lng);
  });

  // Sofort Ladezustand setzen damit Skeletons angezeigt werden
  store.setLoading(true);

  showFirstVisitToast();
  locateUser();
  startRefreshTimer();

  // Wenn Tab wieder sichtbar wird → sofort prüfen ob Refresh nötig
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      const elapsed = Date.now() - lastRefreshTime;
      // Refresh wenn mehr als 2 Minuten seit letztem Refresh vergangen
      if (elapsed > 2 * 60 * 1000) {
        console.log(`[FuelFinder] Tab aktiv nach ${Math.round(elapsed / 60000)} Min. → Auto-Refresh`);
        doRefresh();
      }
    }
  });

  // Online-Event: Refresh wenn Verbindung wiederhergestellt
  window.addEventListener('online', () => {
    console.log('[FuelFinder] Wieder online → Refresh');
    doRefresh();
  });
}

// Sheet-Header: Sortier-Pillen rendern
function renderSheetHeader(): void {
  const header = document.getElementById('sheet-header');
  if (!header) return;
  const state = store.getState();
  const sortOptions: { key: typeof state.sortBy; label: string }[] = [
    { key: 'score', label: 'Score' },
    { key: 'price', label: 'Preis' },
    { key: 'distance', label: 'Nähe' },
    { key: 'name', label: 'Name' },
  ];

  header.innerHTML = sortOptions.map(o =>
    `<button data-sort="${o.key}" class="pill${o.key === state.sortBy ? ' active' : ''}">${o.label}</button>`
  ).join('');

  header.querySelectorAll('[data-sort]').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-sort') as typeof state.sortBy;
      store.setSortBy(key);
    });
  });
}

// Filter-Overlay öffnen
function openFilter(): void {
  const overlay = document.getElementById('filter-overlay');
  overlay?.classList.add('open');
}

async function locateUser(): Promise<void> {
  try {
    const pos = await getCurrentPosition();
    store.setPosition(pos);
    setUserPosition(pos);
  } catch {
    showToast('GPS nicht verfügbar, verwende IP-Standort', 'warning');
    try {
      const pos = await getPositionByIP();
      store.setPosition(pos);
      setUserPosition(pos);
    } catch {
      showToast('Standort nicht ermittelbar. Klicke auf die Karte.', 'error');
    }
  }
}

async function onPositionUpdated(): Promise<void> {
  const pos = store.getState().position;
  if (!pos) return;
  setUserPosition(pos);
  await searchStations(pos.lat, pos.lng);
}

// Tankstellen suchen: Erst vorgeladene Daten, dann Live-API als Fallback
async function searchStations(lat: number, lng: number): Promise<void> {
  const { fuelType, radius, userProfile } = store.getState();
  store.setLoading(true);
  store.setError(null);

  try {
    let stations;

    // 1. Vorgeladene Daten versuchen (von GitHub Actions geholt)
    const cached = await loadCachedStations();
    if (cached && cached.stations.length > 0) {
      stations = filterCachedStations(cached, lat, lng, radius, fuelType);

      // Cache-Alter anzeigen und bei alten Daten auch Live-API versuchen
      const cacheTime = getCacheAge();
      if (cacheTime) {
        const age = Date.now() - new Date(cacheTime).getTime();
        const ageMin = Math.round(age / 60000);
        if (ageMin > 60) {
          showToast(`Daten sind ${ageMin > 120 ? Math.round(ageMin / 60) + 'h' : ageMin + ' Min.'} alt — lade Live-Daten...`, 'warning', 3000);
          // Versuche frischere Live-Daten zu holen
          try {
            const response = await fetchStations(lat, lng, radius, fuelType);
            if (response.stations.length > 0) {
              stations = response.stations;
            }
          } catch {
            // Cache-Daten reichen als Fallback
          }
        }
      }
    }

    // 2. Fallback: Live-API falls keine gecachten Stationen im Umkreis
    if (!stations || stations.length === 0) {
      try {
        const response = await fetchStations(lat, lng, radius, fuelType);
        stations = response.stations;
      } catch (apiErr) {
        // Wenn auch API fehlschlägt und wir Cache-Daten haben, größeren Radius probieren
        if (cached && cached.stations.length > 0) {
          stations = filterCachedStations(cached, lat, lng, Math.min(radius * 2, 25), fuelType);
          if (stations.length > 0) {
            showToast('API nicht erreichbar, zeige Daten aus dem Cache', 'warning', 3000);
          }
        }
        if (!stations || stations.length === 0) {
          throw apiErr;
        }
      }
    }

    store.setStations(stations);
    const results = calculateSmartResults(stations, userProfile);
    store.setSmartResults(results);
    updateStationMarkers(results);

    // Sheet hochfahren wenn noch im peek-Zustand
    if (getSheetState() === 'peek') {
      setSheetState('half');
    }

    showToast(`${stations.length} Tankstellen gefunden`, 'success', 2000);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
    store.setError(message);
    showToast(message, 'error');
  } finally {
    store.setLoading(false);
  }
}

function onSearchParamsChanged(): void {
  const pos = store.getState().position;
  if (pos) {
    searchStations(pos.lat, pos.lng);
  }
}

function onStationSelected(): void {
  const { selectedStation, position } = store.getState();
  if (selectedStation && position) {
    showRouteLine(position, selectedStation);
  } else {
    removeRouteLine();
  }
}

function onHeatmapToggled(): void {
  const { showHeatmap, smartResults } = store.getState();
  toggleHeatmap(smartResults, showHeatmap);
}

// Preise aktualisieren: LIVE von der API holen, nicht nur stale JSON neu laden
async function doRefresh(): Promise<void> {
  const { position: pos, fuelType, radius, userProfile } = store.getState();
  if (!pos) {
    showToast('Kein Standort verfügbar — bitte GPS aktivieren', 'warning');
    return;
  }

  store.setLoading(true);
  showToast('Aktualisiere Preise...', 'info', 1500);

  try {
    let stations;

    // 1. Versuche LIVE-Daten von der Tankerkönig-API (frischeste Preise)
    try {
      const response = await fetchStations(pos.lat, pos.lng, radius, fuelType);
      stations = response.stations;
      console.log(`[FuelFinder] Live-API: ${stations.length} Stationen geladen`);
    } catch (apiErr) {
      console.warn('[FuelFinder] Live-API fehlgeschlagen, lade Cache:', apiErr);
    }

    // 2. Fallback: Cached stations.json neu laden
    if (!stations || stations.length === 0) {
      invalidateCache();
      const cached = await loadCachedStations();
      if (cached && cached.stations.length > 0) {
        stations = filterCachedStations(cached, pos.lat, pos.lng, radius, fuelType);
      }
    }

    if (stations && stations.length > 0) {
      store.setStations(stations);
      const results = calculateSmartResults(stations, userProfile);
      store.setSmartResults(results);
      updateStationMarkers(results);
      showToast(`${stations.length} Tankstellen aktualisiert`, 'success', 2000);
    } else {
      showToast('Keine Tankstellen gefunden', 'warning');
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Refresh fehlgeschlagen';
    showToast(message, 'error');
  } finally {
    store.setLoading(false);
    lastRefreshTime = Date.now();
    refreshCountdown = 1800;
  }
}

// Auto-Refresh Timer: Drift-resistent (prüft echte verstrichene Zeit)
function startRefreshTimer(): void {
  if (refreshTimer) clearInterval(refreshTimer);
  if (countdownInterval) clearInterval(countdownInterval);

  lastRefreshTime = Date.now();
  refreshCountdown = 1800;

  // Haupt-Timer: Alle 30 Min (Backup, falls visibilitychange nicht feuert)
  refreshTimer = setInterval(() => {
    doRefresh();
  }, REFRESH_INTERVAL);

  // Countdown-Tick: Jede Sekunde, aber drift-resistent
  countdownInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - lastRefreshTime) / 1000);
    refreshCountdown = Math.max(0, 1800 - elapsed);

    // Falls Timer vom Browser gedrosselt wurde: Refresh nachholen
    if (refreshCountdown <= 0) {
      doRefresh();
    }

    updateRefreshUI();
  }, 1000);
}

function updateRefreshUI(): void {
  const circle = document.getElementById('refresh-circle');
  const text = document.getElementById('refresh-text');
  if (circle) {
    const progress = refreshCountdown / 1800;
    const dashOffset = 81.68 * (1 - progress);
    circle.setAttribute('stroke-dashoffset', dashOffset.toString());
  }
  if (text) {
    // Zeige wann der Client zuletzt Daten geladen hat (nicht Server-Alter)
    const state = store.getState();
    if (state.lastUpdated) {
      text.textContent = formatTimeAgo(state.lastUpdated);
    } else {
      // Fallback: Server-Datenalter wenn noch kein Client-Refresh
      const cacheTime = getCacheAge();
      text.textContent = cacheTime
        ? formatTimeAgo(new Date(cacheTime))
        : '--';
    }
  }
}

// Preisampel in der Top-Bar aktualisieren
function updateAmpel(): void {
  const { smartResults } = store.getState();
  const ampel = document.getElementById('price-ampel');
  const ampelText = document.getElementById('ampel-text');

  if (!ampel || !ampelText || smartResults.length === 0) return;

  const prices = smartResults.map(r => r.rawPrice);
  const avg = prices.reduce((a, b) => a + b, 0) / prices.length;

  // Farbe je nach Preisniveau
  let dotColor: string;
  if (avg < 1.60) {
    dotColor = 'var(--fuel-green)';
  } else if (avg < 1.80) {
    dotColor = 'var(--fuel-yellow)';
  } else {
    dotColor = 'var(--fuel-red)';
  }

  ampelText.textContent = `${avg.toFixed(3).replace('.', ',')} EUR`;
  ampelText.style.color = dotColor;
  ampel.style.display = 'flex';
}

function showFirstVisitToast(): void {
  const visited = loadFromStorage<boolean>('hasVisited');
  if (!visited) {
    saveToStorage('hasVisited', true);
    setTimeout(() => {
      showToast('Willkommen! FuelFinder berechnet welche Tankstelle sich wirklich lohnt.', 'info', 5000);
    }, 1500);
  }
}

buildApp();
