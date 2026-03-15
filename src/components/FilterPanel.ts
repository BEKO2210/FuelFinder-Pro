import type { FuelType } from '../types';
import { store } from '../store/AppStore';

export function initFilterPanel(container: HTMLElement): void {
  const state = store.getState();

  container.innerHTML = `
    <div class="filter-panel flex items-center gap-2 px-4 py-2 border-b border-[var(--fuel-border)] overflow-x-auto">
      <div id="fuel-toggle" class="flex rounded-lg overflow-hidden border border-[var(--fuel-border)] flex-shrink-0" role="radiogroup" aria-label="Kraftstofftyp">
        ${fuelButton('e5', 'E5', state.fuelType)}
        ${fuelButton('e10', 'E10', state.fuelType)}
        ${fuelButton('diesel', 'Diesel', state.fuelType)}
      </div>

      <div class="flex items-center gap-2 flex-shrink-0">
        <label for="radius-select" class="text-xs text-[var(--fuel-text-muted)]">Radius:</label>
        <select id="radius-select" class="bg-[var(--fuel-surface-2)] text-[var(--fuel-text)] text-xs rounded-lg px-2 py-1.5 border border-[var(--fuel-border)] focus:border-[var(--fuel-accent)] focus:outline-none" aria-label="Suchradius">
          ${[1,2,3,5,10,15,20,25].map(r => `<option value="${r}" ${r === state.radius ? 'selected' : ''}>${r} km</option>`).join('')}
        </select>
      </div>

      <label class="flex items-center gap-1.5 flex-shrink-0 cursor-pointer">
        <input type="checkbox" id="only-open" class="w-4 h-4 rounded accent-[var(--fuel-accent)]" ${state.showOnlyOpen ? 'checked' : ''} />
        <span class="text-xs text-[var(--fuel-text-muted)]">Nur geöffnete</span>
      </label>

      <button id="heatmap-toggle" class="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg border border-[var(--fuel-border)] hover:border-[var(--fuel-accent)] transition-colors flex-shrink-0 ${state.showHeatmap ? 'bg-[var(--fuel-accent)] text-white border-[var(--fuel-accent)]' : 'text-[var(--fuel-text-muted)]'}" aria-label="Heatmap umschalten" aria-pressed="${state.showHeatmap}">
        🔥 Heatmap
      </button>
    </div>
  `;

  container.querySelectorAll('[data-fuel]').forEach(btn => {
    btn.addEventListener('click', () => {
      store.setFuelType(btn.getAttribute('data-fuel') as FuelType);
      initFilterPanel(container);
    });
  });

  container.querySelector('#radius-select')?.addEventListener('change', (e) => {
    store.setRadius(parseInt((e.target as HTMLSelectElement).value));
  });

  container.querySelector('#only-open')?.addEventListener('change', (e) => {
    store.setShowOnlyOpen((e.target as HTMLInputElement).checked);
  });

  container.querySelector('#heatmap-toggle')?.addEventListener('click', () => {
    store.toggleHeatmap();
    initFilterPanel(container);
  });
}

function fuelButton(type: FuelType, label: string, active: FuelType): string {
  const isActive = type === active;
  return `<button data-fuel="${type}" role="radio" aria-checked="${isActive}" class="px-3 py-1.5 text-xs font-medium transition-colors ${isActive ? 'bg-[var(--fuel-accent)] text-white' : 'text-[var(--fuel-text-muted)] hover:bg-[var(--fuel-surface-2)]'}">${label}</button>`;
}
