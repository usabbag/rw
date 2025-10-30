// Recent searches functionality

export function saveRecentSearch(city) {
    let recent = JSON.parse(localStorage.getItem('recentSearches') || '[]');

    // Remove city if it already exists and add to front
    recent = [city, ...recent.filter(c => c.toLowerCase() !== city.toLowerCase())].slice(0, 5);

    localStorage.setItem('recentSearches', JSON.stringify(recent));
}

export function getRecentSearches() {
    return JSON.parse(localStorage.getItem('recentSearches') || '[]');
}

export function clearRecentSearches() {
    localStorage.removeItem('recentSearches');
}
