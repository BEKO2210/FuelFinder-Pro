export function formatPrice(price: number | null | undefined): string {
  if (price == null) return '—';
  return price.toFixed(3).replace('.', ',') + ' €';
}

export function formatPriceLarge(price: number | null | undefined): string {
  if (price == null) return '—';
  return price.toFixed(3).replace('.', ',');
}

export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(1)} km`;
}

export function formatEuro(amount: number): string {
  return amount.toFixed(2).replace('.', ',') + ' €';
}

export function formatWalkingTime(km: number): string {
  const minutes = Math.round(km / 5 * 60);
  if (minutes < 1) return '< 1 Min.';
  return `${minutes} Min.`;
}

export function formatTimeAgo(date: Date | null): string {
  if (!date) return 'Nie';
  const diff = Math.round((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return 'Gerade eben';
  if (diff < 3600) return `vor ${Math.floor(diff / 60)} Min.`;
  return `vor ${Math.floor(diff / 3600)} Std.`;
}

export function getPriceColor(price: number, min: number, max: number): string {
  if (max === min) return 'var(--fuel-green)';
  const ratio = (price - min) / (max - min);
  if (ratio < 0.33) return 'var(--fuel-green)';
  if (ratio < 0.66) return 'var(--fuel-yellow)';
  return 'var(--fuel-red)';
}

export function getPriceColorClass(price: number, min: number, max: number): string {
  if (max === min) return 'text-green-500';
  const ratio = (price - min) / (max - min);
  if (ratio < 0.33) return 'text-green-500';
  if (ratio < 0.66) return 'text-yellow-500';
  return 'text-red-500';
}

export function getBrandInitials(brand: string): string {
  if (!brand) return '??';
  const words = brand.split(/[\s-]+/);
  if (words.length === 1) return brand.slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}
