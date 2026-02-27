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
    loadRecentSearches,
    displaySuggestions,
    hideSuggestions,
    displayLocationSuggestion
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
        showError('Geolocation is not supported by your browser.');
        return;
    }

    console.log('Requesting geolocation...');
    showLoading();

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            console.log('Geolocation success:', position.coords);
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
            } catch (error) {
                showError(error.message);
            } finally {
                hideLoading();
            }
        },
        (error) => {
            console.error('Geolocation error:', error);
            console.log('Error code:', error.code, 'Error message:', error.message);

            hideLoading();

            // Show error message
            let errorMessage = 'Unable to get your location. ';
            if (error.code === error.PERMISSION_DENIED) {
                errorMessage += 'Please allow location access in your browser settings. Check Safari → Settings for This Website → Location.';
            } else if (error.code === error.POSITION_UNAVAILABLE) {
                errorMessage += 'Location information is unavailable.';
            } else if (error.code === error.TIMEOUT) {
                errorMessage += 'Location request timed out.';
            } else {
                errorMessage += 'Please try again.';
            }
            showError(errorMessage);
        }
    );
}

// Update URL with city query parameter
function updateURL(city) {
    const url = new URL(window.location);
    url.searchParams.set('city', city);
    history.replaceState(null, '', url);
}

// Perform weather search for a city
async function performWeatherSearch(city) {
    showLoading();
    hideError();

    try {
        const currentWeather = await getCurrentWeather(city);
        const yesterdayWeather = await getYesterdayWeather(city, currentWeather.coordinates);

        await displayWeatherComparison(currentWeather, yesterdayWeather);
        saveRecentSearch(city);
        updateURL(city);

    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading();
    }
}

// Fetch weather for selected city from autocomplete
async function fetchWeatherForSelectedCity(coordinates, cityName) {
    try {
        const currentWeather = await fetchWeatherForCoordinates(coordinates);
        const yesterdayWeather = await getYesterdayWeather(cityName, coordinates);

        await displayWeatherComparison(currentWeather, yesterdayWeather);
        saveRecentSearch(cityName);
        updateURL(cityName);
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

    // Check for city in URL query params, default to Paris
    const urlParams = new URLSearchParams(window.location.search);
    const cityParam = urlParams.get('city');
    const defaultCity = cityParam || 'Paris';
    elements.cityInput.value = defaultCity;
    performWeatherSearch(defaultCity);

    // Event listeners
    elements.searchBtn.addEventListener('click', handleSearch);
    elements.cityInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            hideSuggestions();
            handleSearch();
        }
    });

    // Show location suggestion when input is focused and empty
    elements.cityInput.addEventListener('focus', (e) => {
        const query = e.target.value.trim();
        if (query.length === 0) {
            displayLocationSuggestion(handleLocationSearch);
        }
    });

    // Autocomplete event listener with debouncing
    const debouncedFetchSuggestions = debounce(handleAutocompleteInput, 300);
    elements.cityInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        if (query.length >= 2) {
            debouncedFetchSuggestions(query);
        } else if (query.length === 0) {
            // Show location suggestion when input is cleared
            displayLocationSuggestion(handleLocationSearch);
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
