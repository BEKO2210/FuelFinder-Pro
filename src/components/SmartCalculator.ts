import { store } from '../store/AppStore';
import { formatEuro } from '../utils/formatter';
import { icons } from '../utils/icons';

let panel: HTMLElement | null = null;

export function initSmartCalculator(): void {
  panel = document.createElement('div');
  panel.id = 'calculator-panel';
  panel.className = 'fixed inset-0 z-50 hidden';
  panel.innerHTML = `
    <div class="calc-overlay absolute inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true"></div>
    <div class="calc-sheet absolute bottom-0 left-0 right-0 bg-[var(--fuel-bg)] border-t border-[var(--fuel-border-light)] rounded-t-2xl max-h-[85vh] max-h-[85dvh] overflow-y-auto">
      <div class="flex items-center justify-between px-4 py-3 border-b border-[var(--fuel-border)]">
        <h2 class="text-[14px] font-semibold text-[var(--fuel-text)] tracking-tight">Smart Kalkulator</h2>
        <button id="calc-close" class="header-btn" aria-label="Schliessen">${icons.close}</button>
      </div>
      <div class="p-4 space-y-4" id="calc-body"></div>
    </div>
  `;
  document.body.appendChild(panel);

  panel.querySelector('.calc-overlay')?.addEventListener('click', () => store.toggleCalculator());
  panel.querySelector('#calc-close')?.addEventListener('click', () => store.toggleCalculator());

  store.on('calculatorToggled', togglePanel);
  store.on('profileChanged', renderCalcBody);
  store.on('stationsUpdated', renderCalcBody);

  renderCalcBody();
}

function togglePanel(): void {
  if (!panel) return;
  const isOpen = store.getState().calculatorOpen;
  if (isOpen) {
    panel.classList.remove('hidden');
    renderCalcBody();
  } else {
    panel.classList.add('hidden');
  }
}

function renderCalcBody(): void {
  const body = panel?.querySelector('#calc-body');
  if (!body) return;
  const { userProfile, smartResults, fuelType } = store.getState();

  const litersNeeded = userProfile.tankVolume * (1 - userProfile.currentFillPercent / 100);
  const bestResult = smartResults.length > 0 ? smartResults.reduce((a, b) => a.score > b.score ? a : b) : null;
  const nearestResult = smartResults.length > 0 ? smartResults.reduce((a, b) => a.station.dist < b.station.dist ? a : b) : null;

  body.innerHTML = `
    <div class="space-y-4">
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-[12px] text-[var(--fuel-text-secondary)] font-medium">Tankgroesse</label>
          <span class="text-[13px] font-bold text-[var(--fuel-text)] text-tabular">${userProfile.tankVolume} L</span>
        </div>
        <input type="range" min="20" max="120" step="1" value="${userProfile.tankVolume}" id="calc-volume" aria-label="Tankgroesse in Litern" />
      </div>

      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-[12px] text-[var(--fuel-text-secondary)] font-medium">Verbrauch</label>
          <span class="text-[13px] font-bold text-[var(--fuel-text)] text-tabular">${userProfile.consumption} L/100km</span>
        </div>
        <input type="range" min="3" max="20" step="0.1" value="${userProfile.consumption}" id="calc-consumption" aria-label="Verbrauch" />
      </div>

      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-[12px] text-[var(--fuel-text-secondary)] font-medium">Fuellstand</label>
          <span class="text-[13px] font-bold text-[var(--fuel-text)] text-tabular">${userProfile.currentFillPercent}%</span>
        </div>
        <input type="range" min="0" max="100" step="5" value="${userProfile.currentFillPercent}" id="calc-fill" aria-label="Aktueller Fuellstand" />
        <div class="mt-1.5 h-1.5 bg-[var(--fuel-surface-3)] rounded-full overflow-hidden">
          <div class="h-full bg-[var(--fuel-accent)] rounded-full transition-all duration-200" style="width:${userProfile.currentFillPercent}%"></div>
        </div>
      </div>

      <div class="flex gap-1.5">
        ${(['e5', 'e10', 'diesel'] as const).map(ft =>
          `<button data-calcfuel="${ft}" class="flex-1 py-2 rounded-lg text-[12px] font-semibold transition-all ${ft === fuelType ? 'bg-[var(--fuel-accent)] text-white' : 'bg-[var(--fuel-surface-2)] text-[var(--fuel-text-muted)] hover:text-[var(--fuel-text-secondary)]'}">${ft.toUpperCase()}</button>`
        ).join('')}
      </div>
    </div>

    <div class="card-surface p-4 space-y-2">
      <p class="text-[13px] text-[var(--fuel-text)]">Du brauchst ca. <strong class="text-[var(--fuel-text)]">${litersNeeded.toFixed(1)} Liter</strong></p>
      ${bestResult ? `
        <p class="text-[13px] text-[var(--fuel-text)]">Bei <strong>${bestResult.station.name}</strong>: <strong class="text-tabular">${formatEuro(litersNeeded * bestResult.rawPrice)}</strong></p>
        ${nearestResult && nearestResult.station.id !== bestResult.station.id ? `
          <div class="flex items-center gap-2 mt-2 pt-2 border-t border-[var(--fuel-border)]">
            <span class="text-[var(--fuel-green)]">${icons.trendDown}</span>
            <p class="text-[13px] text-[var(--fuel-text)]">Ersparnis: <strong class="text-[var(--fuel-green)]">${formatEuro(bestResult.netSavings)}</strong></p>
          </div>
          <p class="text-[11px] text-[var(--fuel-text-muted)]">Umweg: ${formatEuro(bestResult.detourCost)} / Netto: ${formatEuro(bestResult.netSavings)}</p>
        ` : ''}
      ` : `
        <p class="text-[13px] text-[var(--fuel-text-muted)]">Suche Tankstellen, um eine Berechnung zu sehen.</p>
      `}
    </div>
  `;

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
