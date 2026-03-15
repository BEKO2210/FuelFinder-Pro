// Smart Kalkulator — Berechnet Tankkosten und Ersparnis
// Wird als Overlay über dem Bottom Sheet geöffnet

import { store } from '../store/AppStore';
import { formatEuro } from '../utils/formatter';
import { icons } from '../utils/icons';

let panel: HTMLElement | null = null;

// Kalkulator initialisieren
export function initSmartCalculator(): void {
  panel = document.createElement('div');
  panel.id = 'calculator-panel';
  panel.className = 'filter-overlay';
  panel.innerHTML = `
    <div class="filter-backdrop calc-overlay-bg" aria-hidden="true"></div>
    <div class="filter-panel" style="max-height:85dvh;overflow-y:auto">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <h2 style="font-size:16px;font-weight:700;color:var(--fuel-text)">Smart Kalkulator</h2>
        <button id="calc-close" class="top-bar-btn" aria-label="Schließen">${icons.close}</button>
      </div>
      <div id="calc-body"></div>
    </div>
  `;
  document.body.appendChild(panel);

  panel.querySelector('.calc-overlay-bg')?.addEventListener('click', () => store.toggleCalculator());
  panel.querySelector('#calc-close')?.addEventListener('click', () => store.toggleCalculator());

  store.on('calculatorToggled', togglePanel);
  store.on('profileChanged', renderCalcBody);
  store.on('stationsUpdated', renderCalcBody);

  renderCalcBody();
}

// Panel ein-/ausblenden
function togglePanel(): void {
  if (!panel) return;
  const isOpen = store.getState().calculatorOpen;
  if (isOpen) {
    panel.classList.add('open');
    renderCalcBody();
  } else {
    panel.classList.remove('open');
  }
}

// Kalkulator-Inhalt rendern
function renderCalcBody(): void {
  const body = panel?.querySelector('#calc-body');
  if (!body) return;
  const { userProfile, smartResults, fuelType } = store.getState();

  const litersNeeded = userProfile.tankVolume * (1 - userProfile.currentFillPercent / 100);
  const bestResult = smartResults.length > 0 ? smartResults.reduce((a, b) => a.score > b.score ? a : b) : null;
  const nearestResult = smartResults.length > 0 ? smartResults.reduce((a, b) => a.station.dist < b.station.dist ? a : b) : null;

  body.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:16px">
      <div>
        <div style="display:flex;justify-content:space-between;margin-bottom:8px">
          <label style="font-size:12px;color:var(--fuel-text-secondary);font-weight:500">Tankgröße</label>
          <span style="font-size:13px;font-weight:700;color:var(--fuel-text);font-variant-numeric:tabular-nums">${userProfile.tankVolume} L</span>
        </div>
        <input type="range" min="20" max="120" step="1" value="${userProfile.tankVolume}" id="calc-volume" aria-label="Tankgröße in Litern" />
      </div>

      <div>
        <div style="display:flex;justify-content:space-between;margin-bottom:8px">
          <label style="font-size:12px;color:var(--fuel-text-secondary);font-weight:500">Verbrauch</label>
          <span style="font-size:13px;font-weight:700;color:var(--fuel-text);font-variant-numeric:tabular-nums">${userProfile.consumption} L/100km</span>
        </div>
        <input type="range" min="3" max="20" step="0.1" value="${userProfile.consumption}" id="calc-consumption" aria-label="Verbrauch" />
      </div>

      <div>
        <div style="display:flex;justify-content:space-between;margin-bottom:8px">
          <label style="font-size:12px;color:var(--fuel-text-secondary);font-weight:500">Füllstand</label>
          <span style="font-size:13px;font-weight:700;color:var(--fuel-text);font-variant-numeric:tabular-nums">${userProfile.currentFillPercent}%</span>
        </div>
        <input type="range" min="0" max="100" step="5" value="${userProfile.currentFillPercent}" id="calc-fill" aria-label="Aktueller Füllstand" />
        <div style="margin-top:6px;height:5px;background:var(--fuel-surface-3);border-radius:3px;overflow:hidden">
          <div style="height:100%;background:var(--fuel-accent);border-radius:3px;transition:width 0.2s;width:${userProfile.currentFillPercent}%"></div>
        </div>
      </div>

      <div style="display:flex;gap:6px">
        ${(['e5', 'e10', 'diesel'] as const).map(ft =>
          `<button data-calcfuel="${ft}" class="pill${ft === fuelType ? ' active' : ''}" style="flex:1;justify-content:center">${ft.toUpperCase()}</button>`
        ).join('')}
      </div>
    </div>

    <div style="margin-top:16px;background:var(--fuel-surface);border:1px solid var(--fuel-border);border-radius:var(--fuel-radius);padding:16px">
      <p style="font-size:13px;color:var(--fuel-text)">Du brauchst ca. <strong>${litersNeeded.toFixed(1)} Liter</strong></p>
      ${bestResult ? `
        <p style="font-size:13px;color:var(--fuel-text);margin-top:6px">Bei <strong>${bestResult.station.name}</strong>: <strong style="font-variant-numeric:tabular-nums">${formatEuro(litersNeeded * bestResult.rawPrice)}</strong></p>
        ${nearestResult && nearestResult.station.id !== bestResult.station.id ? `
          <div style="display:flex;align-items:center;gap:8px;margin-top:10px;padding-top:10px;border-top:1px solid var(--fuel-border)">
            <span style="color:var(--fuel-green)">${icons.trendDown}</span>
            <p style="font-size:13px;color:var(--fuel-text)">Ersparnis: <strong style="color:var(--fuel-green)">${formatEuro(bestResult.netSavings)}</strong></p>
          </div>
          <p style="font-size:11px;color:var(--fuel-text-muted);margin-top:4px">Umweg: ${formatEuro(bestResult.detourCost)} / Netto: ${formatEuro(bestResult.netSavings)}</p>
        ` : ''}
      ` : `
        <p style="font-size:13px;color:var(--fuel-text-muted);margin-top:6px">Suche Tankstellen, um eine Berechnung zu sehen.</p>
      `}
    </div>
  `;

  // Slider Events
  body.querySelector('#calc-volume')?.addEventListener('input', (e) => {
    store.setUserProfile({ tankVolume: parseFloat((e.target as HTMLInputElement).value) });
  });
  body.querySelector('#calc-consumption')?.addEventListener('input', (e) => {
    store.setUserProfile({ consumption: parseFloat((e.target as HTMLInputElement).value) });
  });
  body.querySelector('#calc-fill')?.addEventListener('input', (e) => {
    store.setUserProfile({ currentFillPercent: parseInt((e.target as HTMLInputElement).value) });
  });
  body.querySelectorAll('[data-calcfuel]').forEach(btn => {
    btn.addEventListener('click', () => {
      const ft = btn.getAttribute('data-calcfuel') as 'e5' | 'e10' | 'diesel';
      store.setFuelType(ft);
    });
  });
}
