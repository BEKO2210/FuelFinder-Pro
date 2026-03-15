import { store } from '../store/AppStore';
import { formatEuro } from '../utils/formatter';

let panel: HTMLElement | null = null;

export function initSmartCalculator(): void {
  panel = document.createElement('div');
  panel.id = 'calculator-panel';
  panel.className = 'fixed inset-0 z-50 hidden';
  panel.innerHTML = `
    <div class="calc-overlay absolute inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true"></div>
    <div class="calc-sheet absolute bottom-0 left-0 right-0 bg-[var(--fuel-bg)] border-t border-[var(--fuel-border)] rounded-t-2xl max-h-[85vh] overflow-y-auto transform transition-transform duration-300">
      <div class="flex items-center justify-between px-5 py-4 border-b border-[var(--fuel-border)]">
        <h2 class="text-base font-semibold text-[var(--fuel-text)]">Smart Kalkulator</h2>
        <button id="calc-close" class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--fuel-surface-2)] text-[var(--fuel-text-muted)]" aria-label="Schließen">&times;</button>
      </div>
      <div class="p-5 space-y-5" id="calc-body"></div>
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
        <label class="block text-xs text-[var(--fuel-text-muted)] mb-1.5">Tankgröße: <strong class="text-[var(--fuel-text)]">${userProfile.tankVolume} L</strong></label>
        <input type="range" min="20" max="120" step="1" value="${userProfile.tankVolume}" id="calc-volume" class="w-full accent-[var(--fuel-accent)]" aria-label="Tankgröße in Litern" />
      </div>

      <div>
        <label class="block text-xs text-[var(--fuel-text-muted)] mb-1.5">Verbrauch: <strong class="text-[var(--fuel-text)]">${userProfile.consumption} L/100km</strong></label>
        <input type="range" min="3" max="20" step="0.1" value="${userProfile.consumption}" id="calc-consumption" class="w-full accent-[var(--fuel-accent)]" aria-label="Verbrauch in Liter pro 100 Kilometer" />
      </div>

      <div>
        <label class="block text-xs text-[var(--fuel-text-muted)] mb-1.5">Tank-Füllstand: <strong class="text-[var(--fuel-text)]">${userProfile.currentFillPercent}%</strong></label>
        <input type="range" min="0" max="100" step="5" value="${userProfile.currentFillPercent}" id="calc-fill" class="w-full accent-[var(--fuel-accent)]" aria-label="Aktueller Füllstand in Prozent" />
        <div class="mt-1 h-2 bg-[var(--fuel-surface-2)] rounded-full overflow-hidden">
          <div class="h-full bg-[var(--fuel-accent)] rounded-full transition-all" style="width:${userProfile.currentFillPercent}%"></div>
        </div>
      </div>

      <div class="flex gap-2">
        ${(['e5', 'e10', 'diesel'] as const).map(ft =>
          `<button data-calcfuel="${ft}" class="flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${ft === fuelType ? 'bg-[var(--fuel-accent)] text-white' : 'bg-[var(--fuel-surface-2)] text-[var(--fuel-text-muted)] hover:text-[var(--fuel-text)]'}">${ft.toUpperCase()}</button>`
        ).join('')}
      </div>
    </div>

    <div class="bg-[var(--fuel-surface)] rounded-xl p-4 space-y-2 border border-[var(--fuel-border)]">
      <p class="text-sm text-[var(--fuel-text)]">Du brauchst ca. <strong>${litersNeeded.toFixed(1)} Liter</strong></p>
      ${bestResult ? `
        <p class="text-sm text-[var(--fuel-text)]">Bei <strong>${bestResult.station.name}</strong> kostet das: <strong>${formatEuro(litersNeeded * bestResult.rawPrice)}</strong></p>
        ${nearestResult && nearestResult.station.id !== bestResult.station.id ? `
          <p class="text-sm text-[var(--fuel-text)]">Im Vergleich zur nächsten Station sparst du: <strong class="text-green-400">${formatEuro(bestResult.netSavings)}</strong></p>
          <p class="text-xs text-[var(--fuel-text-muted)]">Umweg kostet: ${formatEuro(bestResult.detourCost)} → Netto: ${formatEuro(bestResult.netSavings)}</p>
        ` : ''}
      ` : `
        <p class="text-sm text-[var(--fuel-text-muted)]">Suche Tankstellen, um eine Berechnung zu sehen.</p>
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
