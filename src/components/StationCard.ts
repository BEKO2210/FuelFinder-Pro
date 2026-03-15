import type { SmartResult } from '../types';
import { store } from '../store/AppStore';
import { formatPriceLarge, formatDistance, formatEuro, formatWalkingTime, getBrandInitials, getPriceColorClass } from '../utils/formatter';

export function createStationCard(result: SmartResult): HTMLElement {
  const { station, rawPrice, recommendation, worthIt, netSavings, breakEvenLiters, detourKm } = result;
  const state = store.getState();
  const isFavorite = state.favorites.includes(station.id);

  const prices = state.smartResults.map(r => r.rawPrice);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceColorClass = getPriceColorClass(rawPrice, minPrice, maxPrice);

  const card = document.createElement('article');
  card.className = 'station-card group relative bg-[var(--fuel-surface)] border border-[var(--fuel-border)] rounded-xl p-4 cursor-pointer hover:border-[var(--fuel-accent)] transition-all duration-200 touch-manipulation';
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-label', `${station.name}, ${formatPriceLarge(rawPrice)} Euro pro Liter, ${formatDistance(station.dist)} entfernt`);

  const badgeHtml = getBadgeHtml(recommendation);
  const savingsHtml = worthIt
    ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">Spare ${formatEuro(netSavings)}</span>`
    : detourKm > 0
      ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-500/20 text-orange-400">Zu weit</span>`
      : '';

  card.innerHTML = `
    <div class="flex items-start gap-3">
      <div class="flex-shrink-0 w-10 h-10 rounded-lg bg-[var(--fuel-surface-2)] flex items-center justify-center text-xs font-bold text-[var(--fuel-text-muted)]">
        ${getBrandInitials(station.brand)}
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center justify-between gap-2">
          <h3 class="text-sm font-semibold text-[var(--fuel-text)] truncate">${station.name}</h3>
          <span class="text-xs text-[var(--fuel-text-muted)] whitespace-nowrap">${formatDistance(station.dist)}</span>
        </div>
        <p class="text-xs text-[var(--fuel-text-muted)] truncate">${station.street} ${station.houseNumber}, ${station.place}</p>
      </div>
    </div>

    <div class="mt-3 flex items-center justify-between flex-wrap gap-2">
      <div class="flex items-baseline gap-1">
        <span class="text-2xl font-bold ${priceColorClass}" style="font-variant-numeric: tabular-nums">${formatPriceLarge(rawPrice)}</span>
        <span class="text-xs text-[var(--fuel-text-muted)]">€/L</span>
      </div>
      <div class="flex items-center gap-1.5 flex-wrap">
        ${badgeHtml}
        ${savingsHtml}
      </div>
    </div>

    <div class="mt-2 flex items-center justify-between text-xs text-[var(--fuel-text-muted)]">
      <div class="flex items-center gap-3">
        ${breakEvenLiters > 0 ? `<span>Lohnt ab ${breakEvenLiters}L</span>` : ''}
        <span title="Gehzeit">🚶 ${formatWalkingTime(station.dist)}</span>
      </div>
      <div class="flex items-center gap-1">
        ${station.isOpen
          ? '<span class="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse"></span><span class="text-green-400">Geöffnet</span>'
          : '<span class="inline-block w-2 h-2 rounded-full bg-gray-500"></span><span class="text-gray-400">Geschlossen</span>'
        }
      </div>
    </div>

    <div class="mt-3 flex items-center gap-2 border-t border-[var(--fuel-border)] pt-3">
      <button class="btn-route flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--fuel-accent)] text-white text-xs font-medium hover:opacity-90 transition-opacity" aria-label="Route starten">
        🗺️ Route
      </button>
      <button class="btn-fav flex items-center justify-center w-9 h-9 rounded-lg border border-[var(--fuel-border)] hover:border-yellow-500 transition-colors ${isFavorite ? 'text-yellow-400' : 'text-[var(--fuel-text-muted)]'}" aria-label="${isFavorite ? 'Favorit entfernen' : 'Als Favorit markieren'}">
        ${isFavorite ? '★' : '☆'}
      </button>
      <button class="btn-share flex items-center justify-center w-9 h-9 rounded-lg border border-[var(--fuel-border)] hover:border-[var(--fuel-accent)] text-[var(--fuel-text-muted)] transition-colors" aria-label="Teilen">
        📤
      </button>
    </div>
  `;

  card.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target.closest('.btn-route') || target.closest('.btn-fav') || target.closest('.btn-share')) return;
    store.selectStation(station);
  });

  card.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      store.selectStation(station);
    }
  });

  card.querySelector('.btn-route')?.addEventListener('click', (e) => {
    e.stopPropagation();
    openNavigation(station.lat, station.lng);
  });

  card.querySelector('.btn-fav')?.addEventListener('click', (e) => {
    e.stopPropagation();
    store.toggleFavorite(station.id);
    vibrate();
  });

  card.querySelector('.btn-share')?.addEventListener('click', (e) => {
    e.stopPropagation();
    shareStation(station.name, rawPrice, station.lat, station.lng, state.fuelType.toUpperCase());
  });

  return card;
}

function getBadgeHtml(rec: string): string {
  switch (rec) {
    case 'BEST_VALUE':
      return '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300">🏆 Beste Wahl</span>';
    case 'CHEAPEST':
      return '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">💰 Günstigste</span>';
    case 'CLOSEST':
      return '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400">📍 Nächste</span>';
    default:
      return '';
  }
}

function openNavigation(lat: number, lng: number): void {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('iphone') || ua.includes('ipad')) {
    window.open(`maps://maps.apple.com/?daddr=${lat},${lng}`, '_blank');
  } else {
    window.open(`https://maps.google.com/?daddr=${lat},${lng}`, '_blank');
  }
}

async function shareStation(name: string, price: number, lat: number, lng: number, fuelType: string): Promise<void> {
  const text = `${name}: ${price.toFixed(3).replace('.', ',')}€ (${fuelType}) — https://maps.google.com/?q=${lat},${lng}`;

  if (navigator.share) {
    try {
      await navigator.share({ title: 'FuelFinder Pro', text });
      return;
    } catch {
      // User cancelled or not supported
    }
  }

  try {
    await navigator.clipboard.writeText(text);
    const { showToast } = await import('./Toast');
    showToast('In Zwischenablage kopiert!', 'success');
  } catch {
    console.warn('Teilen fehlgeschlagen');
  }
}

function vibrate(): void {
  if (navigator.vibrate) {
    navigator.vibrate(50);
  }
}

export function createSkeletonCard(): HTMLElement {
  const card = document.createElement('div');
  card.className = 'station-card bg-[var(--fuel-surface)] border border-[var(--fuel-border)] rounded-xl p-4 animate-pulse';
  card.innerHTML = `
    <div class="flex items-start gap-3">
      <div class="w-10 h-10 rounded-lg bg-[var(--fuel-surface-2)]"></div>
      <div class="flex-1 space-y-2">
        <div class="h-4 bg-[var(--fuel-surface-2)] rounded w-3/4"></div>
        <div class="h-3 bg-[var(--fuel-surface-2)] rounded w-1/2"></div>
      </div>
    </div>
    <div class="mt-3 flex items-center justify-between">
      <div class="h-7 bg-[var(--fuel-surface-2)] rounded w-20"></div>
      <div class="h-5 bg-[var(--fuel-surface-2)] rounded w-24"></div>
    </div>
    <div class="mt-3 flex gap-2 pt-3 border-t border-[var(--fuel-border)]">
      <div class="flex-1 h-8 bg-[var(--fuel-surface-2)] rounded-lg"></div>
      <div class="w-9 h-8 bg-[var(--fuel-surface-2)] rounded-lg"></div>
      <div class="w-9 h-8 bg-[var(--fuel-surface-2)] rounded-lg"></div>
    </div>
  `;
  return card;
}
