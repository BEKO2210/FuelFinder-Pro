export function createPriceHistoryCard(): HTMLElement {
  const card = document.createElement('div');
  card.className = 'bg-[var(--fuel-surface)] border border-[var(--fuel-border)] rounded-xl p-4';

  const now = new Date();
  const currentHour = now.getHours();

  const segments = [
    { start: 6, end: 10, label: '6–10', level: 'high', color: '#ef4444', text: 'Teuer (+2-4ct)', emoji: '🔴' },
    { start: 10, end: 14, label: '10–14', level: 'mid', color: '#eab308', text: 'Mittel', emoji: '🟡' },
    { start: 14, end: 18, label: '14–18', level: 'low', color: '#22c55e', text: 'Günstig (-1-3ct)', emoji: '🟢' },
    { start: 18, end: 21, label: '18–21', level: 'high', color: '#ef4444', text: 'Abend-Rallye (+1-2ct)', emoji: '🔴' },
    { start: 21, end: 24, label: '21–24', level: 'low', color: '#22c55e', text: 'Nacht-Günstig', emoji: '🟢' },
  ];

  const currentSegment = segments.find(s => currentHour >= s.start && currentHour < s.end);
  const isGoodTime = currentSegment?.level === 'low';

  const svgBars = segments.map((s, i) => {
    const x = i * 60 + 10;
    const barHeight = s.level === 'high' ? 50 : s.level === 'mid' ? 35 : 20;
    const y = 60 - barHeight;
    const isCurrent = currentHour >= s.start && currentHour < s.end;
    const opacity = isCurrent ? '1' : '0.5';
    return `
      <rect x="${x}" y="${y}" width="45" height="${barHeight}" rx="4" fill="${s.color}" opacity="${opacity}" />
      <text x="${x + 22}" y="80" text-anchor="middle" fill="#94a3b8" font-size="9">${s.label}</text>
      ${isCurrent ? `<polygon points="${x + 18},${y - 8} ${x + 22},${y - 3} ${x + 26},${y - 8}" fill="${s.color}" />` : ''}
    `;
  }).join('');

  card.innerHTML = `
    <h3 class="text-sm font-semibold text-[var(--fuel-text)] mb-2">Typische Preisentwicklung heute</h3>
    ${isGoodTime
      ? `<div class="mb-3 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-xs text-green-400 font-medium">💡 Jetzt tanken! Aktuell günstige Tageszeit.</div>`
      : `<div class="mb-3 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-xs text-yellow-400 font-medium">⏰ Tipp: Zwischen 14–18 Uhr und ab 21 Uhr ist es meist günstiger.</div>`
    }
    <svg viewBox="0 0 320 90" class="w-full" role="img" aria-label="Preisentwicklung im Tagesverlauf">
      <rect x="0" y="0" width="320" height="65" rx="8" fill="var(--fuel-surface-2)" opacity="0.5" />
      ${svgBars}
    </svg>
    <div class="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-[var(--fuel-text-muted)]">
      ${segments.map(s => `<span>${s.emoji} ${s.label}: ${s.text}</span>`).join('')}
    </div>
    <p class="mt-2 text-[10px] text-[var(--fuel-text-muted)] italic">Basiert auf ADAC-Statistiken</p>
  `;

  return card;
}
