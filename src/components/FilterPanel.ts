// Filter Overlay — Wird ueber Top-Bar-Button geoeffnet
// Zeigt: Kraftstoffauswahl, Radius, Nur-Offen-Toggle, Heatmap-Toggle

import type { FuelType } from '../types';
import { store } from '../store/AppStore';
import { icons } from '../utils/icons';

let overlay: HTMLElement | null = null;

// Filter-Overlay erstellen und an body anhaengen
export function initFilterOverlay(): void {
  overlay = document.createElement('div');
  overlay.id = 'filter-overlay';
  overlay.className = 'filter-overlay';

  renderOverlay();
  document.body.appendChild(overlay);

  // Bei Store-Aenderungen neu rendern
  store.on('fuelTypeChanged', renderOverlay);
  store.on('filterChanged', renderOverlay);
  store.on('heatmapToggled', renderOverlay);
}

// Overlay-Inhalt rendern
function renderOverlay(): void {
  if (!overlay) return;
  const state = store.getState();

  overlay.innerHTML = `
    <div class="filter-backdrop"></div>
    <div class="filter-panel">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <h2 style="font-size:16px;font-weight:700;color:var(--fuel-text)">Filter</h2>
        <button id="filter-close" class="top-bar-btn" aria-label="Schliessen">${icons.close}</button>
      </div>

      <!-- Kraftstoff-Auswahl -->
      <div style="margin-bottom:16px">
        <label style="font-size:12px;color:var(--fuel-text-secondary);font-weight:600;display:block;margin-bottom:8px">Kraftstoff</label>
        <div style="display:flex;gap:6px">
          ${fuelPill('e5', 'E5', state.fuelType)}
          ${fuelPill('e10', 'E10', state.fuelType)}
          ${fuelPill('diesel', 'Diesel', state.fuelType)}
        </div>
      </div>

      <!-- Radius -->
      <div style="margin-bottom:16px">
        <label style="font-size:12px;color:var(--fuel-text-secondary);font-weight:600;display:block;margin-bottom:8px">Suchradius</label>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          ${[1, 2, 3, 5, 10, 15, 25].map(r =>
            `<button data-radius="${r}" class="pill${r === state.radius ? ' active' : ''}">${r} km</button>`
          ).join('')}
        </div>
      </div>

      <!-- Nur geoeffnete -->
      <div style="margin-bottom:16px">
        <label style="display:flex;align-items:center;gap:10px;cursor:pointer">
          <input type="checkbox" id="filter-only-open" ${state.showOnlyOpen ? 'checked' : ''} style="width:18px;height:18px;accent-color:var(--fuel-accent);cursor:pointer" />
          <span style="font-size:13px;font-weight:500;color:var(--fuel-text)">Nur geoeffnete Tankstellen</span>
        </label>
      </div>

      <!-- Heatmap -->
      <div>
        <button id="filter-heatmap" class="pill${state.showHeatmap ? ' active' : ''}" style="width:100%;justify-content:center;padding:10px">
          ${icons.heatmap} Preis-Heatmap ${state.showHeatmap ? 'an' : 'aus'}
        </button>
      </div>
    </div>
  `;

  // Event Listener
  overlay.querySelector('.filter-backdrop')?.addEventListener('click', closeOverlay);
  overlay.querySelector('#filter-close')?.addEventListener('click', closeOverlay);

  overlay.querySelectorAll('[data-fuel]').forEach(btn => {
    btn.addEventListener('click', () => {
      store.setFuelType(btn.getAttribute('data-fuel') as FuelType);
    });
  });

  overlay.querySelectorAll('[data-radius]').forEach(btn => {
    btn.addEventListener('click', () => {
      store.setRadius(parseInt(btn.getAttribute('data-radius')!));
      renderOverlay();
    });
  });

  overlay.querySelector('#filter-only-open')?.addEventListener('change', (e) => {
    store.setShowOnlyOpen((e.target as HTMLInputElement).checked);
  });

  overlay.querySelector('#filter-heatmap')?.addEventListener('click', () => {
    store.toggleHeatmap();
  });
}

// Overlay schliessen
function closeOverlay(): void {
  overlay?.classList.remove('open');
}

// Kraftstoff-Pill generieren
function fuelPill(type: FuelType, label: string, active: FuelType): string {
  return `<button data-fuel="${type}" class="pill${type === active ? ' active' : ''}" style="flex:1;justify-content:center">${label}</button>`;
}
