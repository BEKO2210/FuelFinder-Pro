let container = null;
function ensureContainer() {
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'fixed top-4 right-4 z-[9999] flex flex-col gap-2';
        container.setAttribute('aria-live', 'polite');
        container.setAttribute('role', 'status');
        document.body.appendChild(container);
    }
    return container;
}
export function showToast(message, type = 'info', duration = 4000) {
    const c = ensureContainer();
    const colors = {
        success: 'border-green-500 bg-green-500/10',
        error: 'border-red-500 bg-red-500/10',
        info: 'border-blue-500 bg-blue-500/10',
        warning: 'border-yellow-500 bg-yellow-500/10',
    };
    const icons = {
        success: '✓',
        error: '✕',
        info: 'ℹ',
        warning: '⚠',
    };
    const toast = document.createElement('div');
    toast.className = `toast-item flex items-center gap-3 px-4 py-3 rounded-xl border ${colors[type]} backdrop-blur-sm shadow-lg text-sm text-[var(--fuel-text)] min-w-[280px] max-w-[400px] animate-slide-in`;
    toast.innerHTML = `
    <span class="text-lg">${icons[type]}</span>
    <span class="flex-1">${message}</span>
    <button class="ml-2 opacity-60 hover:opacity-100 text-lg leading-none" aria-label="Schließen">&times;</button>
  `;
    const closeBtn = toast.querySelector('button');
    closeBtn.addEventListener('click', () => removeToast(toast));
    c.appendChild(toast);
    if (duration > 0) {
        setTimeout(() => removeToast(toast), duration);
    }
}
function removeToast(toast) {
    toast.classList.add('animate-slide-out');
    toast.addEventListener('animationend', () => toast.remove());
}
