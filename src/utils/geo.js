const EARTH_RADIUS_KM = 6371;
export function haversineDistance(a, b) {
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const sinLat = Math.sin(dLat / 2);
    const sinLng = Math.sin(dLng / 2);
    const h = sinLat * sinLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
    return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}
export function bearing(from, to) {
    const dLng = toRad(to.lng - from.lng);
    const lat1 = toRad(from.lat);
    const lat2 = toRad(to.lat);
    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    return (toDeg(Math.atan2(y, x)) + 360) % 360;
}
export function kmToWalkingMinutes(km) {
    return Math.round(km / 5 * 60);
}
function toRad(deg) {
    return deg * (Math.PI / 180);
}
function toDeg(rad) {
    return rad * (180 / Math.PI);
}
export async function getCurrentPosition() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation wird nicht unterstützt'));
            return;
        }
        navigator.geolocation.getCurrentPosition(pos => resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
        }), err => reject(err), { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
    });
}
export async function getPositionByIP() {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
        const res = await fetch('https://ipapi.co/json/', { signal: controller.signal });
        if (!res.ok)
            throw new Error('IP-Geolokalisierung fehlgeschlagen');
        const data = await res.json();
        return { lat: data.latitude, lng: data.longitude };
    }
    finally {
        clearTimeout(timer);
    }
}
