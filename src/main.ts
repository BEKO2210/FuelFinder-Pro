import './styles/main.css';
import { store } from './store/AppStore';
import { fetchStations, refreshPrices } from './api/tankerkoenig';
import { calculateSmartResults } from './utils/calculator';
import { getCurrentPosition, getPositionByIP } from './utils/geo';
import { formatTimeAgo } from './utils/formatter';
import { icons } from './utils/icons';
import { initMap, setUserPosition, updateStationMarkers, showRouteLine, removeRouteLine, toggleHeatmap } from './components/Map';
import { initStationList } from './components/StationList';
import { initFilterPanel } from './components/FilterPanel';
import { initSmartCalculator } from './components/SmartCalculator';
import { createPriceHistoryCard } from './components/PriceHistory';
import { showToast } from './components/Toast';
import { loadFromStorage, saveToStorage } from './utils/storage';

let refreshTimer: ReturnType<typeof setInterval> | null = null;
let refreshCountdown = 300;
let countdownInterval: ReturnType<typeof setInterval> | null = null;

function buildApp(): void {
  const app = document.getElementById('app')!;
  app.innerHTML = `
    <header class="app-header">
      <div class="logo">
        <span class="logo-icon" style="color:var(--fuel-accent)">${icons.fuel}</span>
        <span class="logo-text">FuelFinder Pro</span>
      </div>

      <div class="flex-1"></div>

      <div id="price-ampel" class="header-chip hidden" aria-label="Preisampel"></div>
      <div id="savings-banner" class="header-chip chip-green hidden"></div>

      <div id="refresh-indicator" class="flex items-center gap-1.5 text-[11px] text-[var(--fuel-text-muted)] flex-shrink-0">
        <svg class="refresh-ring" viewBox="0 0 32 32">
          <circle cx="16" cy="16" r="13" stroke-dasharray="81.68" stroke-dashoffset="0" id="refresh-circle" />
        </svg>
        <span id="refresh-text" class="hidden sm:inline">--</span>
      </div>

      <div class="header-actions">
        <button id="btn-refresh" class="header-btn" aria-label="Aktualisieren" title="Preise aktualisieren">
          ${icons.refresh}
        </button>
        <button id="btn-locate" class="header-btn" aria-label="Standort aktualisieren" title="Mein Standort" style="color:var(--fuel-accent)">
          ${icons.crosshair}
        </button>
        <button id="btn-settings" class="header-btn" aria-label="Einstellungen" title="Kalkulator">
          ${icons.settings}
        </button>
      </div>
    </header>

    <main class="app-main">
      <aside class="app-sidebar" id="sidebar">
        <div class="mobile-drawer-handle" aria-hidden="true"></div>
        <div id="filter-panel"></div>
        <div id="station-list-wrapper" class="flex-1 flex flex-col overflow-hidden min-h-0"></div>
        <div id="price-history" class="p-2.5 border-t border-[var(--fuel-border)] flex-shrink-0"></div>
      </aside>
      <div class="app-map-container">
        <div id="map" style="width:100%;height:100%"></div>
      </div>
    </main>
  `;

  const mapContainer = document.getElementById('map')!;
  initMap(mapContainer);

  const filterPanel = document.getElementById('filter-panel')!;
  initFilterPanel(filterPanel);

  const listWrapper = document.getElementById('station-list-wrapper')!;
  initStationList(listWrapper);

  const priceHistoryContainer = document.getElementById('price-history')!;
  priceHistoryContainer.appendChild(createPriceHistoryCard());

  initSmartCalculator();

  document.getElementById('btn-settings')?.addEventListener('click', () => store.toggleCalculator());
  document.getElementById('btn-locate')?.addEventListener('click', locateUser);
  document.getElementById('btn-refresh')?.addEventListener('click', doRefresh);

  store.on('positionUpdated', onPositionUpdated);
  store.on('stationSelected', onStationSelected);
  store.on('fuelTypeChanged', onSearchParamsChanged);
  store.on('radiusChanged', onSearchParamsChanged);
  store.on('heatmapToggled', onHeatmapToggled);
  store.on('stationsUpdated', updateAmpel);

  window.addEventListener('fuelfinder:retry', () => {
    const pos = store.getState().position;
    if (pos) searchStations(pos.lat, pos.lng);
  });

  showFirstVisitToast();
  locateUser();
  startRefreshTimer();
}

async function locateUser(): Promise<void> {
  try {
    const pos = await getCurrentPosition();
    store.setPosition(pos);
    setUserPosition(pos);
  } catch {
    showToast('GPS nicht verfuegbar, verwende IP-Standort', 'warning');
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

async function searchStations(lat: number, lng: number): Promise<void> {
  const { fuelType, radius, userProfile } = store.getState();
  store.setLoading(true);
  store.setError(null);

  try {
    const response = await fetchStations(lat, lng, radius, fuelType);
    store.setStations(response.stations);
    const results = calculateSmartResults(response.stations, userProfile);
    store.setSmartResults(results);
    updateStationMarkers(results);
    showToast(`${response.stations.length} Tankstellen gefunden`, 'success', 2000);
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
    const filterPanel = document.getElementById('filter-panel')!;
    initFilterPanel(filterPanel);
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

async function doRefresh(): Promise<void> {
  const { stations, userProfile } = store.getState();
  if (stations.length === 0) return;

  const ids = stations.filter(s => s.isOpen).slice(0, 10).map(s => s.id);
  const pricesResponse = await refreshPrices(ids);

  if (pricesResponse) {
    const updatedStations = stations.map(s => {
      const p = pricesResponse.prices[s.id];
      if (!p) return s;
      return {
        ...s,
        isOpen: p.status === 'open',
        e5: p.e5 === false ? null : p.e5,
        e10: p.e10 === false ? null : p.e10,
        diesel: p.diesel === false ? null : p.diesel,
        price: (() => {
          const ft = store.getState().fuelType;
          const val = p[ft];
          return val === false ? null : val;
        })(),
      };
    });
    store.updatePrices(updatedStations);
    const results = calculateSmartResults(updatedStations, userProfile);
    store.setSmartResults(results);
    updateStationMarkers(results);
    showToast('Preise aktualisiert', 'info', 2000);
  }

  refreshCountdown = 300;
}

function startRefreshTimer(): void {
  if (refreshTimer) clearInterval(refreshTimer);
  if (countdownInterval) clearInterval(countdownInterval);

  refreshCountdown = 300;

  refreshTimer = setInterval(() => {
    doRefresh();
  }, 300000);

  countdownInterval = setInterval(() => {
    refreshCountdown = Math.max(0, refreshCountdown - 1);
    updateRefreshUI();
  }, 1000);
}

function updateRefreshUI(): void {
  const circle = document.getElementById('refresh-circle');
  const text = document.getElementById('refresh-text');
  if (circle) {
    const progress = refreshCountdown / 300;
    const dashOffset = 81.68 * (1 - progress);
    circle.setAttribute('stroke-dashoffset', dashOffset.toString());
  }
  if (text) {
    const state = store.getState();
    text.textContent = state.lastUpdated
      ? formatTimeAgo(state.lastUpdated)
      : '--';
  }
}

function updateAmpel(): void {
  const { smartResults } = store.getState();
  const ampel = document.getElementById('price-ampel');
  const banner = document.getElementById('savings-banner');

  if (!ampel || !banner || smartResults.length === 0) return;

  const prices = smartResults.map(r => r.rawPrice);
  const avg = prices.reduce((a, b) => a + b, 0) / prices.length;

  let chipClass: string;
  if (avg < 1.60) {
    chipClass = 'chip-green';
  } else if (avg < 1.80) {
    chipClass = 'chip-yellow';
  } else {
    chipClass = 'chip-red';
  }

  ampel.className = `header-chip ${chipClass}`;
  ampel.textContent = `Avg ${avg.toFixed(3).replace('.', ',')} EUR`;
  ampel.classList.remove('hidden');

  const now = new Date().getHours();
  if ((now >= 14 && now < 18) || now >= 21) {
    const best = smartResults.find(r => r.recommendation === 'BEST_VALUE');
    if (best && best.netSavings > 0) {
      banner.textContent = `Spare ${best.netSavings.toFixed(2).replace('.', ',')} EUR heute`;
      banner.classList.remove('hidden');
    }
  } else {
    banner.classList.add('hidden');
  }
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
