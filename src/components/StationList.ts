import { store } from '../store/AppStore';
import { createStationCard, createSkeletonCard } from './StationCard';
import type { SmartResult, SortOption } from '../types';

let listContainer: HTMLElement | null = null;
let sortButtons: HTMLElement | null = null;
let visibleCount = 20;

export function initStationList(container: HTMLElement): void {
  container.innerHTML = `
    <div class="station-list-header flex items-center justify-between px-4 py-3 border-b border-[var(--fuel-border)]">
      <h2 class="text-sm font-semibold text-[var(--fuel-text)]">Tankstellen</h2>
      <div id="sort-buttons" class="flex gap-1" role="radiogroup" aria-label="Sortierung"></div>
    </div>
    <div id="station-list" class="overflow-y-auto flex-1 p-3 space-y-2" role="list" aria-label="Tankstellen-Liste"></div>
    <div id="list-empty" class="hidden flex-1 flex flex-col items-center justify-center p-8 text-center">
      <div class="text-4xl mb-3">⛽</div>
      <p class="text-[var(--fuel-text)] font-semibold">Keine Tankstellen gefunden</p>
      <p class="text-sm text-[var(--fuel-text-muted)] mt-1">Versuche den Radius zu vergrößern</p>
    </div>
    <div id="list-error" class="hidden flex-1 flex flex-col items-center justify-center p-8 text-center">
      <div class="text-4xl mb-3">⚠️</div>
      <p class="text-[var(--fuel-text)] font-semibold" id="error-message">Fehler</p>
      <button id="retry-btn" class="mt-3 px-4 py-2 rounded-lg bg-[var(--fuel-accent)] text-white text-sm font-medium hover:opacity-90">Erneut versuchen</button>
    </div>
  `;

  listContainer = container.querySelector('#station-list');
  sortButtons = container.querySelector('#sort-buttons');

  renderSortButtons();

  store.on('stationsUpdated', () => {
    visibleCount = 20;
    render();
  });
  store.on('sortChanged', render);
  store.on('filterChanged', render);
  store.on('favoritesChanged', render);
  store.on('loadingChanged', renderLoadingState);
  store.on('errorChanged', renderErrorState);
  store.on('pricesRefreshed', render);

  listContainer?.addEventListener('scroll', handleScroll);
}

function renderSortButtons(): void {
  if (!sortButtons) return;
  const options: { key: SortOption; label: string }[] = [
    { key: 'score', label: 'Score' },
    { key: 'price', label: 'Preis' },
    { key: 'distance', label: 'Nähe' },
    { key: 'name', label: 'Name' },
  ];

  sortButtons.innerHTML = options.map(o => {
    const active = store.getState().sortBy === o.key;
    return `<button data-sort="${o.key}" role="radio" aria-checked="${active}" class="px-2.5 py-1 text-xs rounded-lg transition-colors ${active ? 'bg-[var(--fuel-accent)] text-white' : 'text-[var(--fuel-text-muted)] hover:bg-[var(--fuel-surface-2)]'}">${o.label}</button>`;
  }).join('');

  sortButtons.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      store.setSortBy(btn.dataset.sort as SortOption);
      renderSortButtons();
    });
  });
}

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

  visible.forEach(result => {
    const card = createStationCard(result);
    card.setAttribute('role', 'listitem');
    listContainer!.appendChild(card);
  });

  if (results.length > visibleCount) {
    const more = document.createElement('div');
    more.className = 'text-center py-3 text-xs text-[var(--fuel-text-muted)]';
    more.textContent = `${results.length - visibleCount} weitere Stationen...`;
    listContainer.appendChild(more);
  }
}

function renderLoadingState(): void {
  if (!listContainer) return;
  const state = store.getState();

  if (state.isLoading && state.stations.length === 0) {
    listContainer.innerHTML = '';
    for (let i = 0; i < 5; i++) {
      listContainer.appendChild(createSkeletonCard());
    }
  }
}

function renderErrorState(): void {
  const state = store.getState();
  const errorEl = listContainer?.parentElement?.querySelector('#list-error');
  const msgEl = errorEl?.querySelector('#error-message');
  const retryBtn = errorEl?.querySelector('#retry-btn');

  if (state.error) {
    if (msgEl) msgEl.textContent = state.error;
    retryBtn?.addEventListener('click', () => {
      store.setError(null);
      const event = new CustomEvent('fuelfinder:retry');
      window.dispatchEvent(event);
    });
  }
}

function handleScroll(): void {
  if (!listContainer) return;
  const { scrollTop, scrollHeight, clientHeight } = listContainer;
  if (scrollHeight - scrollTop - clientHeight < 100) {
    const state = store.getState();
    const total = getSortedResults(state.smartResults, state.sortBy, state.showOnlyOpen).length;
    if (visibleCount < total) {
      visibleCount += 20;
      render();
    }
  }
}

function getSortedResults(results: SmartResult[], sortBy: SortOption, onlyOpen: boolean): SmartResult[] {
  let filtered = onlyOpen ? results.filter(r => r.station.isOpen) : results;

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
