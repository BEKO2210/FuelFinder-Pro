import type { AppState, AppEvent, FuelType, GeoPosition, TKStation, SmartResult, SortOption, UserProfile } from '../types';
import { loadFromStorage, saveToStorage } from '../utils/storage';

type Listener = () => void;

class AppStore {
  private state: AppState;
  private listeners: Map<AppEvent, Set<Listener>> = new Map();

  constructor() {
    const savedProfile = loadFromStorage<UserProfile>('userProfile');
    const savedFavorites = loadFromStorage<string[]>('favorites');
    const savedFuelType = loadFromStorage<FuelType>('fuelType');
    const savedRadius = loadFromStorage<number>('radius');
    const savedRecent = loadFromStorage<GeoPosition[]>('recentSearches');

    this.state = {
      position: null,
      stations: [],
      smartResults: [],
      selectedStation: null,
      fuelType: savedFuelType ?? 'e5',
      radius: savedRadius ?? 5,
      userProfile: savedProfile ?? {
        tankVolume: 50,
        consumption: 7.5,
        fuelType: savedFuelType ?? 'e5',
        currentFillPercent: 25,
      },
      favorites: savedFavorites ?? [],
      recentSearches: savedRecent ?? [],
      isLoading: false,
      error: null,
      lastUpdated: null,
      showOnlyOpen: true,
      sortBy: 'score',
      sidebarOpen: false,
      calculatorOpen: false,
      showHeatmap: false,
    };
  }

  getState(): Readonly<AppState> {
    return this.state;
  }

  on(event: AppEvent, listener: Listener): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
    return () => this.listeners.get(event)?.delete(listener);
  }

  private emit(event: AppEvent): void {
    this.listeners.get(event)?.forEach(fn => fn());
  }

  setPosition(position: GeoPosition): void {
    this.state = { ...this.state, position };

    const recent = [position, ...this.state.recentSearches.slice(0, 4)];
    this.state.recentSearches = recent;
    saveToStorage('recentSearches', recent);

    this.emit('positionUpdated');
  }

  setStations(stations: TKStation[]): void {
    this.state = { ...this.state, stations, lastUpdated: new Date() };
    this.emit('stationsUpdated');
  }

  setSmartResults(results: SmartResult[]): void {
    this.state = { ...this.state, smartResults: results };
    this.emit('stationsUpdated');
  }

  selectStation(station: TKStation | null): void {
    this.state = { ...this.state, selectedStation: station };
    this.emit('stationSelected');
  }

  setFuelType(fuelType: FuelType): void {
    this.state = {
      ...this.state,
      fuelType,
      userProfile: { ...this.state.userProfile, fuelType },
    };
    saveToStorage('fuelType', fuelType);
    this.emit('fuelTypeChanged');
  }

  setRadius(radius: number): void {
    this.state = { ...this.state, radius };
    saveToStorage('radius', radius);
    this.emit('radiusChanged');
  }

  setUserProfile(profile: Partial<UserProfile>): void {
    this.state = {
      ...this.state,
      userProfile: { ...this.state.userProfile, ...profile },
    };
    saveToStorage('userProfile', this.state.userProfile);
    this.emit('profileChanged');
  }

  toggleFavorite(stationId: string): void {
    const favs = this.state.favorites.includes(stationId)
      ? this.state.favorites.filter(id => id !== stationId)
      : [...this.state.favorites, stationId];
    this.state = { ...this.state, favorites: favs };
    saveToStorage('favorites', favs);
    this.emit('favoritesChanged');
  }

  setLoading(isLoading: boolean): void {
    this.state = { ...this.state, isLoading };
    this.emit('loadingChanged');
  }

  setError(error: string | null): void {
    this.state = { ...this.state, error };
    this.emit('errorChanged');
  }

  setSortBy(sortBy: SortOption): void {
    this.state = { ...this.state, sortBy };
    this.emit('sortChanged');
  }

  setShowOnlyOpen(showOnlyOpen: boolean): void {
    this.state = { ...this.state, showOnlyOpen };
    this.emit('filterChanged');
  }

  toggleSidebar(): void {
    this.state = { ...this.state, sidebarOpen: !this.state.sidebarOpen };
    this.emit('sidebarToggled');
  }

  toggleCalculator(): void {
    this.state = { ...this.state, calculatorOpen: !this.state.calculatorOpen };
    this.emit('calculatorToggled');
  }

  toggleHeatmap(): void {
    this.state = { ...this.state, showHeatmap: !this.state.showHeatmap };
    this.emit('heatmapToggled');
  }

  updatePrices(stations: TKStation[]): void {
    this.state = { ...this.state, stations, lastUpdated: new Date() };
    this.emit('pricesRefreshed');
  }
}

export const store = new AppStore();
