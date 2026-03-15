export function calculateSmartResults(stations, userProfile) {
    const openStations = stations.filter(s => s.isOpen && getPrice(s, userProfile.fuelType) !== null);
    if (openStations.length === 0)
        return [];
    const sorted = [...openStations].sort((a, b) => a.dist - b.dist);
    const nearest = sorted[0];
    const basePrice = getPrice(nearest, userProfile.fuelType);
    const litersNeeded = userProfile.tankVolume * (1 - userProfile.currentFillPercent / 100);
    const results = openStations.map(station => {
        const price = getPrice(station, userProfile.fuelType);
        const detourKm = Math.max(0, (station.dist - nearest.dist)) * 2;
        const detourCost = (detourKm * userProfile.consumption / 100) * price;
        const savingsPerLiter = basePrice - price;
        const grossSavings = savingsPerLiter * litersNeeded;
        const netSavings = grossSavings - detourCost;
        const breakEvenLiters = detourCost > 0 && savingsPerLiter > 0
            ? Math.ceil(detourCost / savingsPerLiter)
            : 0;
        const worthIt = netSavings > 0.50;
        const distScore = station.dist > 0 ? (1 / station.dist) * 5 : 10;
        const score = Math.max(0, Math.min(100, netSavings * 10 + distScore + 10));
        return {
            station,
            rawPrice: price,
            detourKm,
            detourCost,
            savingsPerLiter,
            grossSavings,
            netSavings,
            worthIt,
            breakEvenLiters,
            recommendation: 'SKIP',
            score,
        };
    });
    results.sort((a, b) => b.score - a.score);
    let cheapestPrice = Infinity;
    let closestDist = Infinity;
    let bestValueIdx = -1;
    let cheapestIdx = -1;
    let closestIdx = -1;
    results.forEach((r, i) => {
        if (r.rawPrice < cheapestPrice) {
            cheapestPrice = r.rawPrice;
            cheapestIdx = i;
        }
        if (r.station.dist < closestDist) {
            closestDist = r.station.dist;
            closestIdx = i;
        }
        if (r.netSavings > 0.50 && bestValueIdx === -1) {
            bestValueIdx = i;
        }
    });
    if (bestValueIdx >= 0)
        results[bestValueIdx].recommendation = 'BEST_VALUE';
    if (cheapestIdx >= 0 && cheapestIdx !== bestValueIdx)
        results[cheapestIdx].recommendation = 'CHEAPEST';
    if (closestIdx >= 0 && closestIdx !== bestValueIdx && closestIdx !== cheapestIdx) {
        results[closestIdx].recommendation = 'CLOSEST';
    }
    return results;
}
function getPrice(station, fuelType) {
    switch (fuelType) {
        case 'e5': return station.e5 ?? station.price;
        case 'e10': return station.e10 ?? station.price;
        case 'diesel': return station.diesel ?? station.price;
        default: return station.price;
    }
}
