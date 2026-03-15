import type { SmartResult } from '../types';
import { store } from '../store/AppStore';
import { formatPriceLarge, formatDistance, formatEuro, formatWalkingTime, getBrandInitials, getPriceColorClass } from '../utils/formatter';
import { icons } from '../utils/icons';

export function createStationCard(result: SmartResult): HTMLElement {
  const { station, rawPrice, recommendation, worthIt, netSavings, breakEvenLiters, detourKm } = result;
  const state = store.getState();
  const isFavorite = state.favorites.includes(station.id);

  const prices = state.smartResults.map(r => r.rawPrice);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceColorClass = getPriceColorClass(rawPrice, minPrice, maxPrice);

  const card = document.createElement('article');
  card.className = 'station-card group relative bg-[var(--fuel-surface)] border border-[var(--fuel-border)] rounded-[var(--fuel-radius)] p-3.5 cursor-pointer hover:border-[var(--fuel-border-light)] hover:bg-[var(--fuel-surface-2)] transition-all duration-150 touch-manipulation';
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-label', `${station.name}, ${formatPriceLarge(rawPrice)} Euro pro Liter, ${formatDistance(station.dist)} entfernt`);

  const badgeHtml = getBadgeHtml(recommendation);
  const savingsHtml = worthIt
    ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[var(--fuel-green-dim)] text-[var(--fuel-green)]">Spare ${formatEuro(netSavings)}</span>`
    : detourKm > 0
      ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-[var(--fuel-yellow-dim)] text-[var(--fuel-yellow)]">Zu weit</span>`
      : '';

  card.innerHTML = `
    <div class="flex items-start gap-3">
      <div class="flex-shrink-0 w-9 h-9 rounded-[var(--fuel-radius-sm)] bg-[var(--fuel-surface-3)] flex items-center justify-center text-[11px] font-bold text-[var(--fuel-text-secondary)] tracking-wide">
        ${getBrandInitials(station.brand)}
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center justify-between gap-2">
          <h3 class="text-[13px] font-semibold text-[var(--fuel-text)] truncate leading-tight">${station.name}</h3>
          <span class="text-[11px] text-[var(--fuel-text-muted)] whitespace-nowrap font-medium">${formatDistance(station.dist)}</span>
        </div>
        <p class="text-[11px] text-[var(--fuel-text-muted)] truncate mt-0.5 leading-tight">${station.street} ${station.houseNumber}, ${station.place}</p>
      </div>
    </div>

    <div class="mt-2.5 flex items-center justify-between gap-2">
      <div class="flex items-baseline gap-1">
        <span class="text-[22px] font-extrabold ${priceColorClass} text-tabular leading-none">${formatPriceLarge(rawPrice)}</span>
        <span class="text-[10px] text-[var(--fuel-text-muted)] font-medium">EUR/L</span>
      </div>
      <div class="flex items-center gap-1.5 flex-wrap justify-end">
        ${badgeHtml}
        ${savingsHtml}
      </div>
    </div>

    <div class="mt-2 flex items-center justify-between text-[11px] text-[var(--fuel-text-muted)]">
      <div class="flex items-center gap-2.5">
        ${breakEvenLiters > 0 ? `<span class="font-medium">Lohnt ab ${breakEvenLiters}L</span>` : ''}
        <span class="flex items-center gap-1 opacity-70" title="Gehzeit">${icons.walking} ${formatWalkingTime(station.dist)}</span>
      </div>
      <div class="flex items-center gap-1.5">
        ${station.isOpen
          ? `<span class="inline-block w-1.5 h-1.5 rounded-full bg-[var(--fuel-green)]"></span><span class="text-[var(--fuel-green)] font-medium">Offen</span>`
          : `<span class="inline-block w-1.5 h-1.5 rounded-full bg-[var(--fuel-text-muted)]"></span><span>Geschlossen</span>`
        }
      </div>
    </div>

    <div class="mt-2.5 flex items-center gap-1.5 pt-2.5 border-t border-[var(--fuel-border)]">
      <button class="btn-route flex-1 flex items-center justify-center gap-1.5 h-9 rounded-[var(--fuel-radius-sm)] bg-[var(--fuel-accent)] text-white text-[12px] font-semibold hover:bg-[var(--fuel-accent-hover)] active:scale-[0.98] transition-all" aria-label="Route starten">
        ${icons.navigation} Route
      </button>
      <button class="btn-fav flex items-center justify-center w-9 h-9 rounded-[var(--fuel-radius-sm)] border border-[var(--fuel-border)] hover:border-[var(--fuel-yellow)] hover:bg-[var(--fuel-yellow-dim)] active:scale-[0.95] transition-all ${isFavorite ? 'text-[var(--fuel-yellow)] border-[var(--fuel-yellow)] bg-[var(--fuel-yellow-dim)]' : 'text-[var(--fuel-text-muted)]'}" aria-label="${isFavorite ? 'Favorit entfernen' : 'Als Favorit markieren'}">
        ${isFavorite ? icons.starFilled : icons.star}
      </button>
      <button class="btn-share flex items-center justify-center w-9 h-9 rounded-[var(--fuel-radius-sm)] border border-[var(--fuel-border)] hover:border-[var(--fuel-accent)] hover:bg-[var(--fuel-accent-dim)] active:scale-[0.95] transition-all text-[var(--fuel-text-muted)]" aria-label="Teilen">
        ${icons.share}
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
      return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-[var(--fuel-accent-dim)] text-[var(--fuel-accent)]">${icons.trophy} Beste Wahl</span>`;
    case 'CHEAPEST':
      return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[var(--fuel-green-dim)] text-[var(--fuel-green)]">${icons.tag} Guenstigste</span>`;
    case 'CLOSEST':
      return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[var(--fuel-accent-dim)] text-[var(--fuel-accent)]">${icons.mapPin} Naechste</span>`;
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
  const text = `${name}: ${price.toFixed(3).replace('.', ',')} EUR (${fuelType}) -- https://maps.google.com/?q=${lat},${lng}`;

  if (navigator.share) {
    try {
      await navigator.share({ title: 'FuelFinder Pro', text });
      return;
    } catch {
      // User cancelled
    }
  }

  try {
    await navigator.clipboard.writeText(text);
    const { showToast } = await import('./Toast');
    showToast('In Zwischenablage kopiert', 'success');
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
  card.className = 'bg-[var(--fuel-surface)] border border-[var(--fuel-border)] rounded-[var(--fuel-radius)] p-3.5 animate-pulse';
  card.innerHTML = `
    <div class="flex items-start gap-3">
      <div class="w-9 h-9 rounded-[var(--fuel-radius-sm)] bg-[var(--fuel-surface-3)]"></div>
      <div class="flex-1 space-y-2">
        <div class="h-3.5 bg-[var(--fuel-surface-3)] rounded w-3/4"></div>
        <div class="h-2.5 bg-[var(--fuel-surface-3)] rounded w-1/2"></div>
      </div>
    </div>
    <div class="mt-3 flex items-center justify-between">
      <div class="h-6 bg-[var(--fuel-surface-3)] rounded w-20"></div>
      <div class="h-4 bg-[var(--fuel-surface-3)] rounded w-20"></div>
    </div>
    <div class="mt-3 flex gap-1.5 pt-2.5 border-t border-[var(--fuel-border)]">
      <div class="flex-1 h-9 bg-[var(--fuel-surface-3)] rounded-[var(--fuel-radius-sm)]"></div>
      <div class="w-9 h-9 bg-[var(--fuel-surface-3)] rounded-[var(--fuel-radius-sm)]"></div>
      <div class="w-9 h-9 bg-[var(--fuel-surface-3)] rounded-[var(--fuel-radius-sm)]"></div>
    </div>
  `;
  return card;
}
