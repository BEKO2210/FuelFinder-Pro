export type FuelType = 'e5' | 'e10' | 'diesel';

export interface TKStation {
  id: string;
  name: string;
  brand: string;
  street: string;
  place: string;
  lat: number;
  lng: number;
  dist: number;
  price: number | null;
  isOpen: boolean;
  houseNumber: string;
  postCode: number;
  e5?: number | null;
  e10?: number | null;
  diesel?: number | null;
}

export interface TKPrices {
  [stationId: string]: {
    status: 'open' | 'closed';
    e5: number | false;
    e10: number | false;
    diesel: number | false;
  };
}

export interface TKListResponse {
  ok: boolean;
  license: string;
  data: string;
  status: string;
  stations: TKStation[];
  message?: string;
}

export interface TKPricesResponse {
  ok: boolean;
  license: string;
  data: string;
  prices: TKPrices;
}

export interface TKDetailResponse {
  ok: boolean;
  license: string;
  data: string;
  station: TKStationDetail;
}

export interface TKStationDetail extends TKStation {
  openingTimes: Array<{
    text: string;
    start: string;
    end: string;
  }>;
  overrides: string[];
  wholeDay: boolean;
}

export interface UserProfile {
  tankVolume: number;
  consumption: number;
  fuelType: FuelType;
  currentFillPercent: number;
}

export interface SmartResult {
  station: TKStation;
  rawPrice: number;
  detourKm: number;
  detourCost: number;
  savingsPerLiter: number;
  grossSavings: number;
  netSavings: number;
  worthIt: boolean;
  breakEvenLiters: number;
  recommendation: 'BEST_VALUE' | 'CLOSEST' | 'CHEAPEST' | 'SKIP';
  score: number;
}

export interface GeoPosition {
  lat: number;
  lng: number;
  accuracy?: number;
}

export interface AppState {
  position: GeoPosition | null;
  stations: TKStation[];
  smartResults: SmartResult[];
  selectedStation: TKStation | null;
  fuelType: FuelType;
  radius: number;
  userProfile: UserProfile;
  favorites: string[];
  recentSearches: GeoPosition[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  showOnlyOpen: boolean;
  sortBy: SortOption;
  sidebarOpen: boolean;
  calculatorOpen: boolean;
  showHeatmap: boolean;
}

export type SortOption = 'score' | 'price' | 'distance' | 'name';

export type AppEvent =
  | 'stationsUpdated'
  | 'positionUpdated'
  | 'fuelTypeChanged'
  | 'radiusChanged'
  | 'stationSelected'
  | 'favoritesChanged'
  | 'profileChanged'
  | 'loadingChanged'
  | 'errorChanged'
  | 'sortChanged'
  | 'filterChanged'
  | 'sidebarToggled'
  | 'calculatorToggled'
  | 'heatmapToggled'
  | 'pricesRefreshed';
