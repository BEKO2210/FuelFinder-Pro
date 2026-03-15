// Toast Benachrichtigungen — Zentriert am oberen Bildschirmrand
// Typen: success, error, info, warning

import { icons } from '../utils/icons';

let container: HTMLElement | null = null;

// Container erstellen falls noch nicht vorhanden
function ensureContainer(): HTMLElement {
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = 'position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:9999;display:flex;flex-direction:column;align-items:center;gap:8px;pointer-events:none;';
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('role', 'status');
    document.body.appendChild(container);
  }
  return container;
}

// Toast Farbschema je nach Typ
const typeConfig: Record<string, { borderColor: string; bgColor: string; iconColor: string; icon: () => string }> = {
  success: { borderColor: 'var(--fuel-green)', bgColor: 'var(--fuel-green-dim)', iconColor: 'var(--fuel-green)', icon: () => icons.check },
  error: { borderColor: 'var(--fuel-red)', bgColor: 'var(--fuel-red-dim)', iconColor: 'var(--fuel-red)', icon: () => icons.x },
  info: { borderColor: 'var(--fuel-accent)', bgColor: 'var(--fuel-accent-dim)', iconColor: 'var(--fuel-accent)', icon: () => icons.info },
  warning: { borderColor: 'var(--fuel-yellow)', bgColor: 'var(--fuel-yellow-dim)', iconColor: 'var(--fuel-yellow)', icon: () => icons.alertTriangle },
};

export function showToast(
  message: string,
  type: 'success' | 'error' | 'info' | 'warning' = 'info',
  duration = 4000
): void {
  const c = ensureContainer();
  const config = typeConfig[type];

  const toast = document.createElement('div');
  toast.className = 'animate-slide-in';
  toast.style.cssText = `
    pointer-events:auto;display:flex;align-items:center;gap:10px;
    padding:10px 16px;border-radius:14px;
    border:1px solid ${config.borderColor};
    background:${config.bgColor};
    backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
    box-shadow:0 8px 30px rgba(0,0,0,0.4);
    font-size:13px;color:var(--fuel-text);
    max-width:360px;
  `;
  toast.innerHTML = `
    <span style="color:${config.iconColor};flex-shrink:0">${config.icon()}</span>
    <span style="flex:1;line-height:1.4">${message}</span>
    <button class="toast-close-btn" aria-label="Schliessen" style="margin-left:4px;opacity:0.4;cursor:pointer;background:none;border:none;color:var(--fuel-text-secondary);transition:opacity 0.15s;flex-shrink:0">${icons.x}</button>
  `;

  const closeBtn = toast.querySelector('.toast-close-btn')!;
  closeBtn.addEventListener('click', () => removeToast(toast));
  closeBtn.addEventListener('mouseenter', () => { (closeBtn as HTMLElement).style.opacity = '1'; });
  closeBtn.addEventListener('mouseleave', () => { (closeBtn as HTMLElement).style.opacity = '0.4'; });

  c.appendChild(toast);

  if (duration > 0) {
    setTimeout(() => removeToast(toast), duration);
  }
}

function removeToast(toast: HTMLElement): void {
  toast.classList.add('animate-slide-out');
  toast.addEventListener('animationend', () => toast.remove());
}
