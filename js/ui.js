import { getContextualSuggestion } from './perception.js';
import { getRecentSearches } from './storage.js';

// DOM elements
export const elements = {
    cityInput: document.getElementById('cityInput'),
    searchBtn: document.getElementById('searchBtn'),
    locationBtn: document.getElementById('locationBtn'),
    weatherDisplay: document.getElementById('weatherDisplay'),
    errorMessage: document.getElementById('errorMessage'),
    recentSearches: document.getElementById('recentSearches'),
    recentList: document.getElementById('recentList'),
    cityDisambiguation: document.getElementById('cityDisambiguation'),
    cityChoices: document.getElementById('cityChoices'),
    citySuggestions: document.getElementById('citySuggestions')
};

// UI helper functions
export function showLoading() {
    elements.searchBtn.textContent = 'Loading...';
    elements.searchBtn.disabled = true;
    elements.searchBtn.classList.add('loading');
}

export function hideLoading() {
    elements.searchBtn.textContent = 'Get Weather';
    elements.searchBtn.disabled = false;
    elements.searchBtn.classList.remove('loading');
}

export function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorMessage.classList.remove('hidden');
    elements.weatherDisplay.classList.add('hidden');
}

export function hideError() {
    elements.errorMessage.classList.add('hidden');
}

// Format time with timezone support
function formatTime(timestamp, timezone = null) {
    const options = {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    };

    // If timezone is provided, use it; otherwise use local timezone
    if (timezone) {
        options.timeZone = timezone;
    }

    return new Date(timestamp * 1000).toLocaleTimeString('en-US', options);
}

// Display weather comparison
export async function displayWeatherComparison(current, yesterday) {
    // Update city name
    document.getElementById('cityName').textContent = current.name;

    // Get timezone from current weather data
    const timezone = current.timezone || null;

    // Calculate temperature difference
    const currentTemp = Math.round(current.main.temp);
    const yesterdayTemp = Math.round(yesterday.main.temp);
    const diff = currentTemp - yesterdayTemp;

    // Update hero: difference value
    const differenceValueEl = document.getElementById('differenceValue');
    const differenceLabelEl = document.getElementById('differenceLabel');

    let diffSymbol = '';
    let diffValue = '';
    let diffLabel = '';
    let className = '';

    if (diff > 0) {
        diffSymbol = '+';
        diffValue = `${diff}°C`;
        diffLabel = 'warmer';
        className = 'warmer';
    } else if (diff < 0) {
        diffSymbol = '-';
        diffValue = `${Math.abs(diff)}°C`;
        diffLabel = 'cooler';
        className = 'colder';
    } else {
        diffSymbol = '';
        diffValue = '0°C';
        diffLabel = 'the same';
        className = 'same';
    }

    differenceValueEl.textContent = `${diffSymbol} ${diffValue}`;
    differenceLabelEl.textContent = diffLabel;
    differenceValueEl.parentElement.className = `difference-main ${className}`;

    // Update details (secondary information)
    const todayTime = formatTime(Date.now() / 1000, timezone);
    const yesterdayTime = formatTime(yesterday.dt, timezone);

    document.getElementById('todayDetails').textContent =
        `${currentTemp}°C · ${current.weather[0].description} · ${todayTime}`;

    // Update yesterday's details in the same format
    document.getElementById('yesterdayDetails').textContent =
        `${yesterdayTemp}°C · ${yesterday.weather[0].description} · ${yesterdayTime}`;

    // Show weather display immediately
    elements.weatherDisplay.classList.remove('hidden');

    // Show loading state for AI suggestion
    const suggestionEl = document.getElementById('contextualSuggestion');
    suggestionEl.textContent = 'Getting personalized advice...';
    suggestionEl.classList.add('loading');

    // Update contextual suggestion (now with AI) - this runs in background
    getContextualSuggestion(current, yesterday, current.name, (text) => {
        // Streaming callback - update text as it arrives
        suggestionEl.textContent = text;
        suggestionEl.classList.remove('loading');
    }).then((finalSuggestion) => {
        // Final suggestion received
        if (finalSuggestion) {
            suggestionEl.textContent = finalSuggestion;
            suggestionEl.classList.remove('loading');
        }
    }).catch((error) => {
        console.error('Error getting suggestion:', error);
        suggestionEl.textContent = 'Could not load personalized advice';
        suggestionEl.classList.remove('loading');
    });

    // Hide rain forecast for now (can be re-enabled with Open-Meteo precipitation data)
    const rainContainer = document.getElementById('rainForecast');
    if (rainContainer) {
        rainContainer.classList.add('hidden');
    }
}

// Show city disambiguation UI
export function showCityDisambiguation(cities) {
    hideError();
    elements.weatherDisplay.classList.add('hidden');
    elements.cityDisambiguation.classList.remove('hidden');

    elements.cityChoices.innerHTML = '';

    return new Promise((resolve) => {
        cities.forEach(city => {
            const choiceDiv = document.createElement('div');
            choiceDiv.className = 'city-choice';

            const nameDiv = document.createElement('div');
            nameDiv.className = 'city-choice-name';
            nameDiv.textContent = city.name;

            const detailsDiv = document.createElement('div');
            detailsDiv.className = 'city-choice-details';
            const locationParts = [city.state, city.country].filter(Boolean);
            detailsDiv.textContent = locationParts.join(', ');

            choiceDiv.appendChild(nameDiv);
            choiceDiv.appendChild(detailsDiv);

            choiceDiv.addEventListener('click', () => {
                elements.cityDisambiguation.classList.add('hidden');
                resolve(city);
            });

            elements.cityChoices.appendChild(choiceDiv);
        });
    });
}

// Load and display recent searches
export function loadRecentSearches(onCityClick) {
    const recent = getRecentSearches();

    if (recent.length === 0) {
        elements.recentSearches.classList.add('hidden');
        return;
    }

    elements.recentList.innerHTML = '';
    recent.forEach(city => {
        const cityElement = document.createElement('span');
        cityElement.className = 'recent-city';
        cityElement.textContent = city;
        cityElement.addEventListener('click', () => {
            elements.cityInput.value = city;
            onCityClick(city);
        });
        elements.recentList.appendChild(cityElement);
    });

    elements.recentSearches.classList.remove('hidden');
}

// Autocomplete suggestions display
export function displaySuggestions(cities, onCitySelect) {
    elements.citySuggestions.innerHTML = '';

    cities.forEach(city => {
        const suggestionDiv = document.createElement('div');
        suggestionDiv.className = 'suggestion-item';

        const nameSpan = document.createElement('span');
        nameSpan.className = 'suggestion-name';
        nameSpan.textContent = city.name;

        const locationSpan = document.createElement('span');
        locationSpan.className = 'suggestion-location';
        const locationParts = [city.admin1, city.country].filter(Boolean);
        locationSpan.textContent = locationParts.join(', ');

        suggestionDiv.appendChild(nameSpan);
        suggestionDiv.appendChild(locationSpan);

        suggestionDiv.addEventListener('click', () => {
            // Transform geocoding result to coordinates format
            const coordinates = {
                lat: city.latitude,
                lon: city.longitude,
                name: city.name,
                country: city.country,
                country_code: city.country_code,
                state: city.admin1,
                timezone: city.timezone
            };

            elements.cityInput.value = city.name;
            hideSuggestions();
            onCitySelect(coordinates, city.name);
        });

        elements.citySuggestions.appendChild(suggestionDiv);
    });

    elements.citySuggestions.classList.remove('hidden');
}

export function hideSuggestions() {
    elements.citySuggestions.classList.add('hidden');
    elements.citySuggestions.innerHTML = '';
}
