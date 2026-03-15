const PREFIX = 'fuelfinder_';

export function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    console.warn('LocalStorage Speicherung fehlgeschlagen für:', key);
  }
}

export function loadFromStorage<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch {
    console.warn('LocalStorage Lesen fehlgeschlagen für:', key);
    return null;
  }
}

export function removeFromStorage(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    console.warn('LocalStorage Löschen fehlgeschlagen für:', key);
  }
}
