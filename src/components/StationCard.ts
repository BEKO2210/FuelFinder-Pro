// Minimalistsche Station-Karte für das Bottom Sheet
// Zeigt: Name, Adresse, Preis gross, Entfernung, Status, Route-Button

import type { SmartResult } from '../types';
import { store } from '../store/AppStore';
import { formatPriceLarge, formatDistance, formatEuro, getPriceColor } from '../utils/formatter';
import { icons } from '../utils/icons';

export function createStationCard(result: SmartResult): HTMLElement {
  const { station, rawPrice, recommendation, worthIt, netSavings } = result;
  const state = store.getState();
  const isFavorite = state.favorites.includes(station.id);

  // Min/Max für Farbberechnung
  const prices = state.smartResults.map(r => r.rawPrice);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceColor = getPriceColor(rawPrice, minPrice, maxPrice);

  const card = document.createElement('article');
  card.className = 'station-card';
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-label', `${station.name}, ${formatPriceLarge(rawPrice)} Euro pro Liter`);

  // Badge für Beste Wahl / Günstigste
  const badgeHtml = getBadgeHtml(recommendation);

  // Ersparnis-Anzeige
  const savingsHtml = worthIt && netSavings > 0
    ? `<span class="card-badge" style="background:var(--fuel-green-dim);color:var(--fuel-green)">Spare ${formatEuro(netSavings)}</span>`
    : '';

  card.innerHTML = `
    <div class="card-top">
      <div style="flex:1;min-width:0">
        <div class="card-name">${station.name}</div>
        <div class="card-address">${station.street} ${station.houseNumber}, ${station.place}</div>
      </div>
      <div class="card-dist">${formatDistance(station.dist)}</div>
    </div>

    <div class="card-price-row">
      <div style="display:flex;align-items:baseline;gap:4px">
        <span class="card-price" style="color:${priceColor}">${formatPriceLarge(rawPrice)}</span>
        <span class="card-unit">EUR/L</span>
      </div>
      <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;justify-content:flex-end">
        ${badgeHtml}
        ${savingsHtml}
        <span style="display:flex;align-items:center;gap:3px">
          <span class="status-dot" style="background:${station.isOpen ? 'var(--fuel-green)' : 'var(--fuel-text-muted)'}"></span>
          <span style="font-size:11px;color:${station.isOpen ? 'var(--fuel-green)' : 'var(--fuel-text-muted)'};font-weight:500">${station.isOpen ? 'Offen' : 'Zu'}</span>
        </span>
      </div>
    </div>

    <div class="card-actions">
      <button class="btn-route" aria-label="Route starten">
        ${icons.navigation} Route
      </button>
      <button class="btn-icon${isFavorite ? ' is-active' : ''} btn-fav" aria-label="${isFavorite ? 'Favorit entfernen' : 'Favorit'}">
        ${isFavorite ? icons.starFilled : icons.star}
      </button>
      <button class="btn-icon btn-share" aria-label="Teilen">
        ${icons.share}
      </button>
    </div>
  `;

  // Klick auf Karte = Station auswaehlen
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

  // Route starten (externe Navigation)
  card.querySelector('.btn-route')?.addEventListener('click', (e) => {
    e.stopPropagation();
    openNavigation(station.lat, station.lng);
  });

  // Favorit umschalten
  card.querySelector('.btn-fav')?.addEventListener('click', (e) => {
    e.stopPropagation();
    store.toggleFavorite(station.id);
    if (navigator.vibrate) navigator.vibrate(50);
  });

  // Teilen
  card.querySelector('.btn-share')?.addEventListener('click', (e) => {
    e.stopPropagation();
    shareStation(station.name, rawPrice, station.lat, station.lng, state.fuelType.toUpperCase());
  });

  return card;
}

// Badge-HTML je nach Empfehlung
function getBadgeHtml(rec: string): string {
  switch (rec) {
    case 'BEST_VALUE':
      return `<span class="card-badge" style="background:var(--fuel-accent-dim);color:var(--fuel-accent)">${icons.trophy} Beste Wahl</span>`;
    case 'CHEAPEST':
      return `<span class="card-badge" style="background:var(--fuel-green-dim);color:var(--fuel-green)">${icons.tag} Günstigste</span>`;
    case 'CLOSEST':
      return `<span class="card-badge" style="background:var(--fuel-accent-dim);color:var(--fuel-accent)">${icons.mapPin} Nächste</span>`;
    default:
      return '';
  }
}

// Externe Navigation öffnen
function openNavigation(lat: number, lng: number): void {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('iphone') || ua.includes('ipad')) {
    window.open(`maps://maps.apple.com/?daddr=${lat},${lng}`, '_blank');
  } else {
    window.open(`https://maps.google.com/?daddr=${lat},${lng}`, '_blank');
  }
}

// Station teilen / in Zwischenablage
async function shareStation(name: string, price: number, lat: number, lng: number, fuelType: string): Promise<void> {
  const text = `${name}: ${price.toFixed(3).replace('.', ',')} EUR (${fuelType}) -- https://maps.google.com/?q=${lat},${lng}`;

  if (navigator.share) {
    try {
      await navigator.share({ title: 'FuelFinder Pro', text });
      return;
    } catch {
      // Nutzer hat abgebrochen
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

// Skeleton-Ladekarte
export function createSkeletonCard(): HTMLElement {
  const card = document.createElement('div');
  card.className = 'station-card skeleton-pulse';
  card.innerHTML = `
    <div class="card-top">
      <div style="flex:1">
        <div style="height:14px;background:var(--fuel-surface-3);border-radius:6px;width:70%"></div>
        <div style="height:11px;background:var(--fuel-surface-3);border-radius:6px;width:50%;margin-top:6px"></div>
      </div>
      <div style="height:12px;background:var(--fuel-surface-3);border-radius:6px;width:40px"></div>
    </div>
    <div class="card-price-row">
      <div style="height:28px;background:var(--fuel-surface-3);border-radius:8px;width:100px"></div>
    </div>
    <div class="card-actions">
      <div style="flex:1;height:42px;background:var(--fuel-surface-3);border-radius:var(--fuel-radius-sm)"></div>
      <div style="width:42px;height:42px;background:var(--fuel-surface-3);border-radius:var(--fuel-radius-sm)"></div>
    </div>
  `;
  return card;
}
