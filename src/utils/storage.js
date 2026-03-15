const PREFIX = 'fuelfinder_';
export function saveToStorage(key, value) {
    try {
        localStorage.setItem(PREFIX + key, JSON.stringify(value));
    }
    catch {
        console.warn('LocalStorage Speicherung fehlgeschlagen für:', key);
    }
}
export function loadFromStorage(key) {
    try {
        const raw = localStorage.getItem(PREFIX + key);
        if (raw === null)
            return null;
        return JSON.parse(raw);
    }
    catch {
        console.warn('LocalStorage Lesen fehlgeschlagen für:', key);
        return null;
    }
}
export function removeFromStorage(key) {
    try {
        localStorage.removeItem(PREFIX + key);
    }
    catch {
        console.warn('LocalStorage Löschen fehlgeschlagen für:', key);
    }
}
