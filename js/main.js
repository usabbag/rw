import {
    getCurrentWeather,
    getYesterdayWeather,
    fetchWeatherByCoords,
    fetchWeatherForCoordinates,
    fetchCitySuggestions
} from './api.js';
import { saveRecentSearch } from './storage.js';
import {
    elements,
    showLoading,
    hideLoading,
    showError,
    hideError,
    displayWeatherComparison,
    showCityDisambiguation,
    loadRecentSearches,
    displaySuggestions,
    hideSuggestions
} from './ui.js';

// Debounce helper function
function debounce(func, delay) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

// Main search handler
async function handleSearch() {
    const city = elements.cityInput.value.trim();
    if (!city) {
        showError('Please enter a city name');
        return;
    }

    await performWeatherSearch(city);
}

// Location-based search
function handleLocationSearch() {
    if (!navigator.geolocation) {
        showError('Geolocation is not supported by this browser');
        return;
    }

    showLoading();
    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const { latitude, longitude } = position.coords;
            try {
                const currentWeather = await fetchWeatherByCoords(latitude, longitude);
                const city = currentWeather.name;
                const yesterdayWeather = await getYesterdayWeather(city, {
                    lat: latitude,
                    lon: longitude,
                    timezone: currentWeather.timezone
                });

                await displayWeatherComparison(currentWeather, yesterdayWeather);
                saveRecentSearch(city);
                elements.cityInput.value = city;
            } catch (error) {
                showError(error.message);
            } finally {
                hideLoading();
            }
        },
        (error) => {
            hideLoading();
            showError('Unable to get your location. Please enable location access.');
        }
    );
}

// Perform weather search for a city
async function performWeatherSearch(city) {
    showLoading();
    hideError();

    try {
        const currentWeather = await getCurrentWeather(city);

        // If getCurrentWeather returns disambiguation data, show UI
        if (currentWeather.needsDisambiguation) {
            hideLoading();
            const selectedCity = await showCityDisambiguation(currentWeather.cities);
            showLoading();
            await fetchWeatherForSelectedCity(selectedCity, city);
            return;
        }

        const yesterdayWeather = await getYesterdayWeather(city, currentWeather.coordinates);

        await displayWeatherComparison(currentWeather, yesterdayWeather);
        saveRecentSearch(city);

    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading();
    }
}

// Fetch weather for selected city from disambiguation
async function fetchWeatherForSelectedCity(coordinates, cityName) {
    try {
        const currentWeather = await fetchWeatherForCoordinates(coordinates);
        const yesterdayWeather = await getYesterdayWeather(cityName, coordinates);

        await displayWeatherComparison(currentWeather, yesterdayWeather);
        saveRecentSearch(cityName);
    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading();
    }
}

// Handle autocomplete city selection
async function handleAutocompleteCitySelect(coordinates, cityName) {
    showLoading();
    hideError();

    try {
        await fetchWeatherForSelectedCity(coordinates, cityName);
    } finally {
        hideLoading();
    }
}

// Fetch and display autocomplete suggestions
async function handleAutocompleteInput(query) {
    try {
        const cities = await fetchCitySuggestions(query);

        if (!cities) {
            hideSuggestions();
            return;
        }

        displaySuggestions(cities, handleAutocompleteCitySelect);
    } catch (error) {
        console.error('Error fetching city suggestions:', error);
        hideSuggestions();
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadRecentSearches(handleSearch);

    // Event listeners
    elements.searchBtn.addEventListener('click', handleSearch);
    elements.locationBtn.addEventListener('click', handleLocationSearch);
    elements.cityInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            hideSuggestions();
            handleSearch();
        }
    });

    // Autocomplete event listener with debouncing
    const debouncedFetchSuggestions = debounce(handleAutocompleteInput, 300);
    elements.cityInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        if (query.length >= 2) {
            debouncedFetchSuggestions(query);
        } else {
            hideSuggestions();
        }
    });

    // Close suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (!elements.cityInput.contains(e.target) && !elements.citySuggestions.contains(e.target)) {
            hideSuggestions();
        }
    });

    // No API key needed! Open-Meteo is free for non-commercial use
    console.log('Weather app ready! Using Open-Meteo API (free, no key required)');
});

// Error handling for network issues
window.addEventListener('offline', () => {
    showError('No internet connection. Please check your network.');
});

window.addEventListener('online', () => {
    hideError();
});
