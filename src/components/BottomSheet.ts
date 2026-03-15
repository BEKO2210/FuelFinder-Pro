// Bottom Sheet Komponente mit Touch-Drag-Gesten und Klick-Toggle
// Drei Zustaende: peek (nur Handle sichtbar), half (halber Viewport), full (komplett offen)

type SheetState = 'peek' | 'half' | 'full';

let sheet: HTMLElement | null = null;
let currentState: SheetState = 'half';
let startY = 0;
let startTranslate = 0;
let isDragging = false;
let dragDistance = 0;

// Bottom Sheet initialisieren und Events registrieren
export function initBottomSheet(el: HTMLElement): void {
  sheet = el;
  const handle = sheet.querySelector('.sheet-handle') as HTMLElement | null;
  if (!handle) return;

  // Klick auf Handle = Toggle zwischen half und peek
  handle.addEventListener('click', onHandleClick);

  // Touch Events fuer Mobile Drag
  handle.addEventListener('touchstart', onTouchStart as EventListener, { passive: true });
  document.addEventListener('touchmove', onTouchMove as EventListener, { passive: false });
  document.addEventListener('touchend', onTouchEnd);

  // Mouse Events fuer Desktop Drag
  handle.addEventListener('mousedown', onMouseDown as EventListener);
  document.addEventListener('mousemove', onMouseMove as EventListener);
  document.addEventListener('mouseup', onMouseUp);
}

// Klick-Toggle: peek <-> half <-> full
function onHandleClick(): void {
  // Nur toggeln wenn kein Drag stattfand
  if (dragDistance > 10) return;

  if (currentState === 'peek') {
    setSheetState('half');
  } else if (currentState === 'half') {
    setSheetState('full');
  } else {
    setSheetState('half');
  }
}

// Aktuellen Sheet-Zustand setzen mit smooth Animation
export function setSheetState(state: SheetState): void {
  if (!sheet) return;
  currentState = state;
  sheet.classList.remove('state-peek', 'state-half', 'state-full', 'dragging');
  sheet.classList.add(`state-${state}`);
  sheet.style.transform = '';
}

// Aktuellen Zustand abfragen
export function getSheetState(): SheetState {
  return currentState;
}

// === TOUCH EVENTS ===

function onTouchStart(e: TouchEvent): void {
  if (!sheet) return;
  isDragging = true;
  dragDistance = 0;
  startY = e.touches[0].clientY;
  startTranslate = getCurrentTranslateY();
  sheet.classList.add('dragging');
}

function onTouchMove(e: TouchEvent): void {
  if (!isDragging || !sheet) return;
  e.preventDefault();
  const deltaY = e.touches[0].clientY - startY;
  dragDistance = Math.abs(deltaY);
  const newTranslate = Math.max(0, startTranslate + deltaY);
  sheet.style.transform = `translateY(${newTranslate}px)`;
}

function onTouchEnd(): void {
  if (!isDragging || !sheet) return;
  isDragging = false;
  sheet.classList.remove('dragging');
  resolveState();
}

// === MOUSE EVENTS ===

function onMouseDown(e: MouseEvent): void {
  if (!sheet) return;
  isDragging = true;
  dragDistance = 0;
  startY = e.clientY;
  startTranslate = getCurrentTranslateY();
  sheet.classList.add('dragging');
  e.preventDefault();
}

function onMouseMove(e: MouseEvent): void {
  if (!isDragging || !sheet) return;
  const deltaY = e.clientY - startY;
  dragDistance = Math.abs(deltaY);
  const newTranslate = Math.max(0, startTranslate + deltaY);
  sheet.style.transform = `translateY(${newTranslate}px)`;
}

function onMouseUp(): void {
  if (!isDragging || !sheet) return;
  isDragging = false;
  sheet.classList.remove('dragging');
  resolveState();
}

// Aktuellen translateY-Wert aus der computed transform Matrix lesen
function getCurrentTranslateY(): number {
  if (!sheet) return 0;
  const style = window.getComputedStyle(sheet);
  const matrix = new DOMMatrix(style.transform);
  return matrix.m42;
}

// Naechsten Zustand bestimmen basierend auf aktueller Position
function resolveState(): void {
  if (!sheet) return;
  const viewportHeight = window.innerHeight;
  const currentY = getCurrentTranslateY();
  const sheetHeight = sheet.offsetHeight;
  const visiblePart = sheetHeight - currentY;
  const visibleRatio = visiblePart / viewportHeight;

  // Schwellenwerte: >60% = full, >25% = half, sonst peek
  if (visibleRatio > 0.6) {
    setSheetState('full');
  } else if (visibleRatio > 0.25) {
    setSheetState('half');
  } else {
    setSheetState('peek');
  }
}
