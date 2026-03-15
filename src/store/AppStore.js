import { loadFromStorage, saveToStorage } from '../utils/storage';
class AppStore {
    state;
    listeners = new Map();
    constructor() {
        const savedProfile = loadFromStorage('userProfile');
        const savedFavorites = loadFromStorage('favorites');
        const savedFuelType = loadFromStorage('fuelType');
        const savedRadius = loadFromStorage('radius');
        const savedRecent = loadFromStorage('recentSearches');
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
    getState() {
        return this.state;
    }
    on(event, listener) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(listener);
        return () => this.listeners.get(event)?.delete(listener);
    }
    emit(event) {
        this.listeners.get(event)?.forEach(fn => fn());
    }
    setPosition(position) {
        this.state = { ...this.state, position };
        const recent = [position, ...this.state.recentSearches.slice(0, 4)];
        this.state.recentSearches = recent;
        saveToStorage('recentSearches', recent);
        this.emit('positionUpdated');
    }
    setStations(stations) {
        this.state = { ...this.state, stations, lastUpdated: new Date() };
        this.emit('stationsUpdated');
    }
    setSmartResults(results) {
        this.state = { ...this.state, smartResults: results };
        this.emit('stationsUpdated');
    }
    selectStation(station) {
        this.state = { ...this.state, selectedStation: station };
        this.emit('stationSelected');
    }
    setFuelType(fuelType) {
        this.state = {
            ...this.state,
            fuelType,
            userProfile: { ...this.state.userProfile, fuelType },
        };
        saveToStorage('fuelType', fuelType);
        this.emit('fuelTypeChanged');
    }
    setRadius(radius) {
        this.state = { ...this.state, radius };
        saveToStorage('radius', radius);
        this.emit('radiusChanged');
    }
    setUserProfile(profile) {
        this.state = {
            ...this.state,
            userProfile: { ...this.state.userProfile, ...profile },
        };
        saveToStorage('userProfile', this.state.userProfile);
        this.emit('profileChanged');
    }
    toggleFavorite(stationId) {
        const favs = this.state.favorites.includes(stationId)
            ? this.state.favorites.filter(id => id !== stationId)
            : [...this.state.favorites, stationId];
        this.state = { ...this.state, favorites: favs };
        saveToStorage('favorites', favs);
        this.emit('favoritesChanged');
    }
    setLoading(isLoading) {
        this.state = { ...this.state, isLoading };
        this.emit('loadingChanged');
    }
    setError(error) {
        this.state = { ...this.state, error };
        this.emit('errorChanged');
    }
    setSortBy(sortBy) {
        this.state = { ...this.state, sortBy };
        this.emit('sortChanged');
    }
    setShowOnlyOpen(showOnlyOpen) {
        this.state = { ...this.state, showOnlyOpen };
        this.emit('filterChanged');
    }
    toggleSidebar() {
        this.state = { ...this.state, sidebarOpen: !this.state.sidebarOpen };
        this.emit('sidebarToggled');
    }
    toggleCalculator() {
        this.state = { ...this.state, calculatorOpen: !this.state.calculatorOpen };
        this.emit('calculatorToggled');
    }
    toggleHeatmap() {
        this.state = { ...this.state, showHeatmap: !this.state.showHeatmap };
        this.emit('heatmapToggled');
    }
    updatePrices(stations) {
        this.state = { ...this.state, stations, lastUpdated: new Date() };
        this.emit('pricesRefreshed');
    }
}
export const store = new AppStore();
