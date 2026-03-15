// Station-Liste — Rendert Karten innerhalb des Bottom Sheets
// Unterstützt: Lazy Loading, Sortierung, Filter, Lade-/Fehlerzustand

import { store } from '../store/AppStore';
import { createStationCard, createSkeletonCard } from './StationCard';
import type { SmartResult, SortOption } from '../types';
import { icons } from '../utils/icons';

let listContainer: HTMLElement | null = null;
let visibleCount = 20;

// Liste im übergebenen Container initialisieren
export function initStationList(container: HTMLElement): void {
  container.innerHTML = `
    <div id="station-list" role="list" aria-label="Tankstellen-Liste"></div>
    <div id="list-empty" class="hidden" style="padding:40px 20px;text-align:center">
      <div style="color:var(--fuel-text-muted);margin-bottom:12px">${icons.search}</div>
      <p style="color:var(--fuel-text);font-weight:600;font-size:14px">Keine Tankstellen gefunden</p>
      <p style="font-size:12px;color:var(--fuel-text-muted);margin-top:4px">Versuche den Radius zu vergrößern</p>
    </div>
    <div id="list-error" class="hidden" style="padding:40px 20px;text-align:center">
      <div style="color:var(--fuel-red);margin-bottom:12px">${icons.alertTriangle}</div>
      <p style="color:var(--fuel-text);font-weight:600;font-size:14px" id="error-message">Fehler</p>
      <button id="retry-btn" class="btn-route" style="margin-top:12px;width:auto;padding:0 20px">Erneut versuchen</button>
    </div>
  `;

  listContainer = container.querySelector('#station-list');

  // Store Events abonnieren
  store.on('stationsUpdated', () => { visibleCount = 20; render(); });
  store.on('sortChanged', render);
  store.on('filterChanged', render);
  store.on('favoritesChanged', render);
  store.on('loadingChanged', renderLoadingState);
  store.on('errorChanged', renderErrorState);
  store.on('pricesRefreshed', render);

  // Lazy Loading bei Scroll
  container.addEventListener('scroll', handleScroll);

  // Retry-Handler einmalig registrieren
  initRetryHandler(container);
}

// Stationen rendern
function render(): void {
  if (!listContainer) return;
  const state = store.getState();
  const results = getSortedResults(state.smartResults, state.sortBy, state.showOnlyOpen);

  const emptyEl = listContainer.parentElement?.querySelector('#list-empty');
  const errorEl = listContainer.parentElement?.querySelector('#list-error');

  if (state.error) {
    listContainer.classList.add('hidden');
    emptyEl?.classList.add('hidden');
    errorEl?.classList.remove('hidden');
    return;
  }

  errorEl?.classList.add('hidden');

  if (results.length === 0 && !state.isLoading) {
    listContainer.classList.add('hidden');
    emptyEl?.classList.remove('hidden');
    return;
  }

  emptyEl?.classList.add('hidden');
  listContainer.classList.remove('hidden');

  const visible = results.slice(0, visibleCount);
  listContainer.innerHTML = '';

  visible.forEach((result, i) => {
    const card = createStationCard(result);
    card.setAttribute('role', 'listitem');
    // Staggered fade-in für die ersten 10 Karten
    if (i < 10) {
      card.style.animationDelay = `${i * 0.04}s`;
    }
    listContainer!.appendChild(card);
  });

  // Hinweis auf weitere Stationen
  if (results.length > visibleCount) {
    const more = document.createElement('div');
    more.style.cssText = 'text-align:center;padding:12px;font-size:11px;color:var(--fuel-text-muted)';
    more.textContent = `${results.length - visibleCount} weitere Stationen`;
    listContainer.appendChild(more);
  }
}

// Skeleton-Karten bei Ladevorgang
function renderLoadingState(): void {
  if (!listContainer) return;
  const state = store.getState();

  if (state.isLoading && state.stations.length === 0) {
    listContainer.innerHTML = '';
    for (let i = 0; i < 4; i++) {
      listContainer.appendChild(createSkeletonCard());
    }
  }
}

// Fehlerzustand anzeigen (Event Delegation statt wiederholtem addEventListener)
function renderErrorState(): void {
  const state = store.getState();
  const errorEl = listContainer?.parentElement?.querySelector('#list-error');
  const msgEl = errorEl?.querySelector('#error-message');

  if (state.error && msgEl) {
    msgEl.textContent = state.error;
  }
}

// Retry-Handler einmalig per Event-Delegation
function initRetryHandler(container: HTMLElement): void {
  container.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target.id === 'retry-btn' || target.closest('#retry-btn')) {
      store.setError(null);
      window.dispatchEvent(new CustomEvent('fuelfinder:retry'));
    }
  });
}

// Lazy Loading: Mehr Stationen laden beim Scrollen
function handleScroll(): void {
  const wrapper = listContainer?.parentElement;
  if (!wrapper) return;
  const { scrollTop, scrollHeight, clientHeight } = wrapper;
  if (scrollHeight - scrollTop - clientHeight < 100) {
    const state = store.getState();
    const total = getSortedResults(state.smartResults, state.sortBy, state.showOnlyOpen).length;
    if (visibleCount < total) {
      visibleCount += 20;
      render();
    }
  }
}

// Sortierung und Filterung anwenden
function getSortedResults(results: SmartResult[], sortBy: SortOption, onlyOpen: boolean): SmartResult[] {
  const filtered = onlyOpen ? results.filter(r => r.station.isOpen) : results;

  switch (sortBy) {
    case 'score':
      return [...filtered].sort((a, b) => b.score - a.score);
    case 'price':
      return [...filtered].sort((a, b) => a.rawPrice - b.rawPrice);
    case 'distance':
      return [...filtered].sort((a, b) => a.station.dist - b.station.dist);
    case 'name':
      return [...filtered].sort((a, b) => a.station.name.localeCompare(b.station.name));
    default:
      return filtered;
  }
}
