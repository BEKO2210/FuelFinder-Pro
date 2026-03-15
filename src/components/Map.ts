import maplibregl from 'maplibre-gl';
import type { TKStation, GeoPosition, SmartResult } from '../types';
import { store } from '../store/AppStore';
import { formatPriceLarge, formatDistance, getPriceColor } from '../utils/formatter';
import { icons } from '../utils/icons';

let map: maplibregl.Map | null = null;
let userMarkerEl: HTMLElement | null = null;
let userMarker: maplibregl.Marker | null = null;
let accuracyCircle: maplibregl.Marker | null = null;
let stationMarkers: maplibregl.Marker[] = [];
let routeLine: string | null = null;

export function initMap(container: HTMLElement): maplibregl.Map {
  map = new maplibregl.Map({
    container,
    style: 'https://tiles.openfreemap.org/styles/liberty',
    center: [10.45, 51.16],
    zoom: 6,
    attributionControl: {},
  });

  map.addControl(new maplibregl.NavigationControl({ showCompass: true, showZoom: true }), 'top-right');
  map.addControl(new maplibregl.FullscreenControl(), 'top-right');

  map.on('click', (e: maplibregl.MapMouseEvent) => {
    const features = map!.queryRenderedFeatures(e.point);
    const hasMarker = features.some(f => f.layer?.id?.startsWith('cluster'));
    if (!hasMarker) {
      store.setPosition({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    }
  });

  return map;
}

export function setUserPosition(pos: GeoPosition): void {
  if (!map) return;

  if (!userMarkerEl) {
    userMarkerEl = document.createElement('div');
    userMarkerEl.className = 'user-marker';
    userMarkerEl.innerHTML = '<div class="user-marker-dot"></div><div class="user-marker-pulse"></div>';
    userMarker = new maplibregl.Marker({ element: userMarkerEl })
      .setLngLat([pos.lng, pos.lat])
      .addTo(map);
  } else {
    userMarker?.setLngLat([pos.lng, pos.lat]);
  }

  if (pos.accuracy && pos.accuracy < 5000) {
    if (accuracyCircle) accuracyCircle.remove();
    const el = document.createElement('div');
    const pixelRadius = Math.max(20, pos.accuracy * 0.5);
    el.style.cssText = `width:${pixelRadius}px;height:${pixelRadius}px;border-radius:50%;background:rgba(14,165,233,0.08);border:1.5px solid rgba(14,165,233,0.15);pointer-events:none;transform:translate(-50%,-50%);`;
    accuracyCircle = new maplibregl.Marker({ element: el, anchor: 'center' })
      .setLngLat([pos.lng, pos.lat])
      .addTo(map);
  }

  map.flyTo({ center: [pos.lng, pos.lat], zoom: 13, duration: 1500 });
}

export function updateStationMarkers(results: SmartResult[]): void {
  if (!map) return;

  stationMarkers.forEach(m => m.remove());
  stationMarkers = [];

  if (results.length === 0) return;

  const prices = results.map(r => r.rawPrice);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  results.forEach(result => {
    const { station, recommendation, worthIt, netSavings } = result;
    const color = !station.isOpen
      ? '#4b5563'
      : getPriceColor(result.rawPrice, minPrice, maxPrice);

    const el = document.createElement('div');
    el.className = `station-marker${recommendation === 'BEST_VALUE' ? ' marker-best' : ''}`;
    el.setAttribute('role', 'button');
    el.setAttribute('aria-label', `${station.name}: ${formatPriceLarge(result.rawPrice)} Euro pro Liter`);
    el.setAttribute('tabindex', '0');

    const badgeSvg = recommendation === 'BEST_VALUE'
      ? `<span class="marker-badge">${icons.trophy}</span>`
      : recommendation === 'CHEAPEST'
        ? `<span class="marker-badge">${icons.tag}</span>`
        : '';

    el.innerHTML = `
      <div class="marker-pin" style="background:${color}">
        <span class="marker-price">${formatPriceLarge(result.rawPrice)}</span>
        ${badgeSvg}
      </div>
      <div class="marker-arrow" style="border-top-color:${color}"></div>
    `;

    const savingsText = worthIt
      ? `<span class="popup-badge popup-badge-green">Spare ${netSavings.toFixed(2).replace('.', ',')} EUR</span>`
      : `<span class="popup-badge popup-badge-gray">Kein Vorteil</span>`;

    const statusText = station.isOpen
      ? '<span class="popup-status popup-status-open">Geöffnet</span>'
      : '<span class="popup-status popup-status-closed">Geschlossen</span>';

    const stationPopup = new maplibregl.Popup({ offset: 25, closeButton: true, maxWidth: '260px' })
      .setHTML(`
        <div class="station-popup">
          <span class="popup-name">${station.name}</span>
          <p class="popup-address">${station.street} ${station.houseNumber}, ${station.place}</p>
          <p class="popup-price" style="color:${color}">${formatPriceLarge(result.rawPrice)} EUR/L</p>
          <p class="popup-dist">${formatDistance(station.dist)} entfernt</p>
          <div style="margin-top:6px">${savingsText}${statusText}</div>
        </div>
      `);

    const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
      .setLngLat([station.lng, station.lat])
      .setPopup(stationPopup)
      .addTo(map!);

    el.addEventListener('click', () => store.selectStation(station));
    el.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        store.selectStation(station);
        marker.togglePopup();
      }
    });

    stationMarkers.push(marker);
  });

  fitMapToStations(results.map(r => r.station));
}

export function showRouteLine(from: GeoPosition, to: TKStation): void {
  if (!map) return;
  removeRouteLine();

  const id = 'route-line';
  routeLine = id;

  if (!map.getSource(id)) {
    map.addSource(id, {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: [[from.lng, from.lat], [to.lng, to.lat]],
        },
      },
    });
    map.addLayer({
      id,
      type: 'line',
      source: id,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#0ea5e9',
        'line-width': 2.5,
        'line-dasharray': [3, 2],
      },
    });
  } else {
    (map.getSource(id) as maplibregl.GeoJSONSource).setData({
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: [[from.lng, from.lat], [to.lng, to.lat]],
      },
    });
  }
}

export function removeRouteLine(): void {
  if (!map || !routeLine) return;
  if (map.getLayer(routeLine)) map.removeLayer(routeLine);
  if (map.getSource(routeLine)) map.removeSource(routeLine);
  routeLine = null;
}

export function toggleHeatmap(results: SmartResult[], show: boolean): void {
  if (!map) return;
  const id = 'price-heatmap';

  if (!show) {
    if (map.getLayer(id)) map.removeLayer(id);
    if (map.getSource(id)) map.removeSource(id);
    return;
  }

  const geojson = {
    type: 'FeatureCollection' as const,
    features: results.map(r => ({
      type: 'Feature' as const,
      properties: { price: r.rawPrice },
      geometry: {
        type: 'Point' as const,
        coordinates: [r.station.lng, r.station.lat],
      },
    })),
  };

  if (map.getSource(id)) {
    (map.getSource(id) as maplibregl.GeoJSONSource).setData(geojson);
  } else {
    map.addSource(id, { type: 'geojson', data: geojson });
    map.addLayer({
      id,
      type: 'heatmap',
      source: id,
      paint: {
        'heatmap-weight': ['interpolate', ['linear'], ['get', 'price'], 1.0, 0, 2.5, 1],
        'heatmap-intensity': 1,
        'heatmap-radius': 40,
        'heatmap-opacity': 0.5,
        'heatmap-color': [
          'interpolate', ['linear'], ['heatmap-density'],
          0, 'rgba(0,0,0,0)',
          0.2, '#34d399',
          0.5, '#fbbf24',
          0.8, '#f87171',
          1, '#ef4444',
        ],
      },
    });
  }
}

function fitMapToStations(stations: TKStation[]): void {
  if (!map || stations.length === 0) return;

  const bounds = new maplibregl.LngLatBounds();
  const pos = store.getState().position;
  if (pos) bounds.extend([pos.lng, pos.lat]);
  stations.forEach(s => bounds.extend([s.lng, s.lat]));

  map.fitBounds(bounds, { padding: 60, maxZoom: 15, duration: 1000 });
}

export function getMapInstance(): maplibregl.Map | null {
  return map;
}
