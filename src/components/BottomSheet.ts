// Bottom Sheet Komponente mit Touch-Drag-Gesten
// Drei Zustaende: peek (nur Handle sichtbar), half (halber Viewport), full (komplett offen)

type SheetState = 'peek' | 'half' | 'full';

let sheet: HTMLElement | null = null;
let startY = 0;
let startTranslate = 0;
let isDragging = false;

// Bottom Sheet initialisieren und Drag-Events registrieren
export function initBottomSheet(el: HTMLElement): void {
  sheet = el;
  const handle = sheet.querySelector('.sheet-handle');
  if (!handle) return;

  // Touch Events fuer Mobile
  handle.addEventListener('touchstart', onTouchStart as EventListener, { passive: true });
  document.addEventListener('touchmove', onTouchMove as EventListener, { passive: false });
  document.addEventListener('touchend', onTouchEnd);

  // Mouse Events fuer Desktop (optional)
  handle.addEventListener('mousedown', onMouseDown as EventListener);
  document.addEventListener('mousemove', onMouseMove as EventListener);
  document.addEventListener('mouseup', onMouseUp);
}

// Aktuellen Sheet-Zustand setzen
export function setSheetState(state: SheetState): void {
  if (!sheet) return;
  sheet.classList.remove('state-peek', 'state-half', 'state-full', 'dragging');
  sheet.classList.add(`state-${state}`);
  sheet.style.transform = '';
}

// Touch Start: Startposition merken
function onTouchStart(e: TouchEvent): void {
  if (!sheet) return;
  isDragging = true;
  startY = e.touches[0].clientY;
  startTranslate = getCurrentTranslateY();
  sheet.classList.add('dragging');
}

// Touch Move: Sheet verschieben
function onTouchMove(e: TouchEvent): void {
  if (!isDragging || !sheet) return;
  e.preventDefault();
  const deltaY = e.touches[0].clientY - startY;
  const newTranslate = Math.max(0, startTranslate + deltaY);
  sheet.style.transform = `translateY(${newTranslate}px)`;
}

// Touch End: Naechsten Zustand bestimmen
function onTouchEnd(): void {
  if (!isDragging || !sheet) return;
  isDragging = false;
  sheet.classList.remove('dragging');
  resolveState();
}

// Mouse Events (Mirror der Touch Events)
function onMouseDown(e: MouseEvent): void {
  if (!sheet) return;
  isDragging = true;
  startY = e.clientY;
  startTranslate = getCurrentTranslateY();
  sheet.classList.add('dragging');
  e.preventDefault();
}

function onMouseMove(e: MouseEvent): void {
  if (!isDragging || !sheet) return;
  const deltaY = e.clientY - startY;
  const newTranslate = Math.max(0, startTranslate + deltaY);
  sheet.style.transform = `translateY(${newTranslate}px)`;
}

function onMouseUp(): void {
  if (!isDragging || !sheet) return;
  isDragging = false;
  sheet.classList.remove('dragging');
  resolveState();
}

// Aktuellen translateY-Wert berechnen
function getCurrentTranslateY(): number {
  if (!sheet) return 0;
  const style = window.getComputedStyle(sheet);
  const matrix = new DOMMatrix(style.transform);
  return matrix.m42;
}

// Naechsten Zustand bestimmen basierend auf Position
function resolveState(): void {
  if (!sheet) return;
  const viewportHeight = window.innerHeight;
  const currentY = getCurrentTranslateY();
  const sheetHeight = sheet.offsetHeight;
  const visiblePart = sheetHeight - currentY;
  const visibleRatio = visiblePart / viewportHeight;

  // Schwellenwerte: >60% = full, >30% = half, sonst peek
  if (visibleRatio > 0.6) {
    setSheetState('full');
  } else if (visibleRatio > 0.25) {
    setSheetState('half');
  } else {
    setSheetState('peek');
  }
}
