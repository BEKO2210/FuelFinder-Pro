import { icons } from '../utils/icons';

let container: HTMLElement | null = null;

function ensureContainer(): HTMLElement {
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'fixed top-3 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-2 pointer-events-none';
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('role', 'status');
    document.body.appendChild(container);
  }
  return container;
}

export function showToast(
  message: string,
  type: 'success' | 'error' | 'info' | 'warning' = 'info',
  duration = 4000
): void {
  const c = ensureContainer();

  const styles: Record<string, string> = {
    success: 'border-[var(--fuel-green)] bg-[var(--fuel-green-dim)]',
    error: 'border-[var(--fuel-red)] bg-[var(--fuel-red-dim)]',
    info: 'border-[var(--fuel-accent)] bg-[var(--fuel-accent-dim)]',
    warning: 'border-[var(--fuel-yellow)] bg-[var(--fuel-yellow-dim)]',
  };

  const iconColors: Record<string, string> = {
    success: 'text-[var(--fuel-green)]',
    error: 'text-[var(--fuel-red)]',
    info: 'text-[var(--fuel-accent)]',
    warning: 'text-[var(--fuel-yellow)]',
  };

  const iconMap: Record<string, string> = {
    success: icons.check,
    error: icons.x,
    info: icons.info,
    warning: icons.alertTriangle,
  };

  const toast = document.createElement('div');
  toast.className = `pointer-events-auto flex items-center gap-2.5 px-4 py-2.5 rounded-xl border ${styles[type]} shadow-lg text-[13px] text-[var(--fuel-text)] max-w-[360px] animate-slide-in`;
  toast.innerHTML = `
    <span class="${iconColors[type]} flex-shrink-0">${iconMap[type]}</span>
    <span class="flex-1 leading-snug">${message}</span>
    <button class="toast-close-btn ml-1 opacity-40 hover:opacity-100 transition-opacity flex-shrink-0 text-[var(--fuel-text-secondary)]" aria-label="Schliessen">${icons.x}</button>
  `;

  const closeBtn = toast.querySelector('.toast-close-btn')!;
  closeBtn.addEventListener('click', () => removeToast(toast));

  c.appendChild(toast);

  if (duration > 0) {
    setTimeout(() => removeToast(toast), duration);
  }
}

function removeToast(toast: HTMLElement): void {
  toast.classList.add('animate-slide-out');
  toast.addEventListener('animationend', () => toast.remove());
}
