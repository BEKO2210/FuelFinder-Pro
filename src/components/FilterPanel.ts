import type { FuelType } from '../types';
import { store } from '../store/AppStore';
import { icons } from '../utils/icons';

export function initFilterPanel(container: HTMLElement): void {
  const state = store.getState();

  container.innerHTML = `
    <div class="filter-panel flex items-center gap-2 px-3 py-2 border-b border-[var(--fuel-border)] overflow-x-auto scrollbar-none">
      <div id="fuel-toggle" class="flex bg-[var(--fuel-surface-2)] rounded-lg p-0.5 flex-shrink-0" role="radiogroup" aria-label="Kraftstofftyp">
        ${fuelButton('e5', 'E5', state.fuelType)}
        ${fuelButton('e10', 'E10', state.fuelType)}
        ${fuelButton('diesel', 'Diesel', state.fuelType)}
      </div>

      <div class="flex items-center gap-1.5 flex-shrink-0">
        <select id="radius-select" class="filter-chip bg-[var(--fuel-surface-2)] text-[var(--fuel-text-secondary)] text-[11px] font-medium rounded-lg px-2.5 py-1.5 border border-[var(--fuel-border)] focus:border-[var(--fuel-accent)] focus:outline-none cursor-pointer appearance-none pr-6" aria-label="Suchradius" style="background-image: url('data:image/svg+xml,${encodeURIComponent('<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="%238b95a8" stroke-width="3" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>')}'); background-repeat: no-repeat; background-position: right 6px center;">
          ${[1,2,3,5,10,15,20,25].map(r => `<option value="${r}" ${r === state.radius ? 'selected' : ''}>${r} km</option>`).join('')}
        </select>
      </div>

      <label class="flex items-center gap-1.5 flex-shrink-0 cursor-pointer select-none">
        <input type="checkbox" id="only-open" class="w-3.5 h-3.5 rounded accent-[var(--fuel-accent)] cursor-pointer" ${state.showOnlyOpen ? 'checked' : ''} />
        <span class="text-[11px] text-[var(--fuel-text-secondary)] font-medium">Offen</span>
      </label>

      <button id="heatmap-toggle" class="filter-chip flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium rounded-lg border transition-all flex-shrink-0 ${state.showHeatmap ? 'bg-[var(--fuel-accent-dim)] text-[var(--fuel-accent)] border-[var(--fuel-accent)]' : 'border-[var(--fuel-border)] text-[var(--fuel-text-muted)] hover:text-[var(--fuel-text-secondary)] hover:border-[var(--fuel-border-light)]'}" aria-label="Heatmap umschalten" aria-pressed="${state.showHeatmap}">
        ${icons.heatmap} Heatmap
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
  return `<button data-fuel="${type}" role="radio" aria-checked="${isActive}" class="filter-chip px-3 py-1.5 text-[11px] font-semibold rounded-md transition-all ${isActive ? 'bg-[var(--fuel-accent)] text-white shadow-sm' : 'text-[var(--fuel-text-muted)] hover:text-[var(--fuel-text-secondary)]'}">${label}</button>`;
}
