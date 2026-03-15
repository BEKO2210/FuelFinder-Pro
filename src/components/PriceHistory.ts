import { icons } from '../utils/icons';

export function createPriceHistoryCard(): HTMLElement {
  const card = document.createElement('div');
  card.className = 'card-surface p-3.5';

  const now = new Date();
  const currentHour = now.getHours();

  const segments = [
    { start: 6, end: 10, label: '6-10', level: 'high', color: '#f87171', text: 'Teuer (+2-4ct)' },
    { start: 10, end: 14, label: '10-14', level: 'mid', color: '#fbbf24', text: 'Mittel' },
    { start: 14, end: 18, label: '14-18', level: 'low', color: '#34d399', text: 'Guenstig (-1-3ct)' },
    { start: 18, end: 21, label: '18-21', level: 'high', color: '#f87171', text: 'Abend (+1-2ct)' },
    { start: 21, end: 24, label: '21-24', level: 'low', color: '#34d399', text: 'Nacht-Guenstig' },
  ];

  const currentSegment = segments.find(s => currentHour >= s.start && currentHour < s.end);
  const isGoodTime = currentSegment?.level === 'low';

  const svgBars = segments.map((s, i) => {
    const x = i * 60 + 10;
    const barHeight = s.level === 'high' ? 44 : s.level === 'mid' ? 30 : 18;
    const y = 55 - barHeight;
    const isCurrent = currentHour >= s.start && currentHour < s.end;
    const opacity = isCurrent ? '1' : '0.35';
    return `
      <rect x="${x}" y="${y}" width="44" height="${barHeight}" rx="5" fill="${s.color}" opacity="${opacity}" />
      <text x="${x + 22}" y="72" text-anchor="middle" fill="${isCurrent ? '#edf0f7' : '#5c6478'}" font-size="8.5" font-weight="${isCurrent ? '600' : '400'}" font-family="inherit">${s.label}</text>
      ${isCurrent ? `<rect x="${x}" y="${y - 3}" width="44" height="2" rx="1" fill="${s.color}" opacity="0.6" />` : ''}
    `;
  }).join('');

  const tipIcon = isGoodTime ? icons.trendDown : icons.clock;
  const tipColor = isGoodTime ? 'var(--fuel-green)' : 'var(--fuel-yellow)';
  const tipBg = isGoodTime ? 'var(--fuel-green-dim)' : 'var(--fuel-yellow-dim)';
  const tipText = isGoodTime
    ? 'Jetzt tanken -- aktuell guenstige Tageszeit.'
    : 'Tipp: Zwischen 14-18 Uhr und ab 21 Uhr meist guenstiger.';

  card.innerHTML = `
    <h3 class="text-[12px] font-semibold text-[var(--fuel-text)] mb-2 tracking-tight">Preisentwicklung heute</h3>
    <div class="flex items-start gap-2 mb-3 px-2.5 py-2 rounded-lg" style="background:${tipBg}">
      <span class="flex-shrink-0 mt-0.5" style="color:${tipColor}">${tipIcon}</span>
      <p class="text-[11px] font-medium leading-snug" style="color:${tipColor}">${tipText}</p>
    </div>
    <svg viewBox="0 0 320 80" class="w-full" role="img" aria-label="Preisentwicklung im Tagesverlauf">
      <rect x="0" y="0" width="320" height="58" rx="6" fill="var(--fuel-surface-2)" opacity="0.4" />
      ${svgBars}
    </svg>
    <div class="mt-2 flex flex-wrap gap-x-3 gap-y-0.5">
      ${segments.map(s => `<span class="flex items-center gap-1 text-[10px] text-[var(--fuel-text-muted)]"><span class="inline-block w-1.5 h-1.5 rounded-full" style="background:${s.color}"></span>${s.label}: ${s.text}</span>`).join('')}
    </div>
    <p class="mt-1.5 text-[9px] text-[var(--fuel-text-muted)] opacity-60">Basiert auf ADAC-Statistiken</p>
  `;

  return card;
}
