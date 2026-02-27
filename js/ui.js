import { getContextualSuggestion } from './perception.js';
import { getRecentSearches } from './storage.js';
import { getRainForecast } from './rain.js';
import { displayRainSegments, showRainLoading, hideRainChart } from './rainChart.js';
// Weather emoji not used in current dark design, but kept available
// import { getWeatherEmoji } from './weather.js';
import { getAirQuality, getAqiLevel } from './airQuality.js';

// DOM elements
export const elements = {
    cityInput: document.getElementById('cityInput'),
    searchBtn: document.getElementById('searchBtn'),
    weatherDisplay: document.getElementById('weatherDisplay'),
    currentConditionsCard: document.getElementById('currentConditionsCard'),
    errorMessage: document.getElementById('errorMessage'),
    recentSearches: document.getElementById('recentSearches'),
    recentList: document.getElementById('recentList'),
    citySuggestions: document.getElementById('citySuggestions')
};

// UI helper functions
export function showLoading() {
    elements.searchBtn.textContent = 'Loading...';
    elements.searchBtn.disabled = true;
}

export function hideLoading() {
    elements.searchBtn.textContent = 'Get Weather';
    elements.searchBtn.disabled = false;
}

export function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorMessage.classList.remove('hidden');
    elements.weatherDisplay.classList.add('hidden');
    elements.currentConditionsCard.classList.add('hidden');
    const aqiCard = document.getElementById('airQualityCard');
    if (aqiCard) aqiCard.classList.add('hidden');
    const rainCard = document.getElementById('rainForecast');
    if (rainCard) rainCard.classList.add('hidden');
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
    if (timezone) {
        options.timeZone = timezone;
    }
    return new Date(timestamp * 1000).toLocaleTimeString('en-US', options);
}

// Display weather comparison
export async function displayWeatherComparison(current, yesterday) {
    // Show city name next to search
    const cityLabel = document.getElementById('cityLabel');
    if (cityLabel) {
        cityLabel.textContent = current.name;
    }
    // Clear search input after selecting
    elements.cityInput.value = '';

    // Show current conditions
    elements.currentConditionsCard.classList.remove('hidden');

    document.getElementById('currentTemp').textContent = `${Math.round(current.main.temp)}°`;
    document.getElementById('conditionDescription').textContent = current.weather[0].description;
    document.getElementById('feelsLike').textContent = `${Math.round(current.extended.apparent_temperature)}°`;
    document.getElementById('humidity').textContent = `${Math.round(current.extended.humidity)}%`;
    document.getElementById('windSpeed').textContent = `${Math.round(current.extended.wind_speed)} km/h`;

    const timezone = current.timezone || null;

    // Calculate temperature difference
    const currentTemp = Math.round(current.main.temp);
    const yesterdayTemp = Math.round(yesterday.main.temp);
    const diff = currentTemp - yesterdayTemp;

    const differenceValueEl = document.getElementById('differenceValue');
    const differenceLabelEl = document.getElementById('differenceLabel');
    const heroEl = document.getElementById('weatherDisplay');

    let diffText = '';
    let diffLabel = '';
    let className = '';

    if (diff > 0) {
        diffText = `+${diff}°`;
        diffLabel = 'warmer than yesterday';
        className = 'warmer';
    } else if (diff < 0) {
        diffText = `${diff}°`;
        diffLabel = 'cooler than yesterday';
        className = 'colder';
    } else {
        diffText = '0°';
        diffLabel = 'same as yesterday';
        className = 'same';
    }

    differenceValueEl.textContent = diffText;
    differenceLabelEl.textContent = diffLabel;
    heroEl.className = `weather-hero ${className}`;

    // Show weather display
    elements.weatherDisplay.classList.remove('hidden');

    // Fetch air quality data
    const aqiPromise = getAirQuality(current.coord.lat, current.coord.lon);

    // AI suggestion (runs in background, hidden from view but data available)
    const suggestionEl = document.getElementById('contextualSuggestion');

    // Wait for AQI
    const aqiData = await aqiPromise;
    const aqiCard = document.getElementById('airQualityCard');
    if (aqiData && aqiData.aqi != null) {
        const level = getAqiLevel(aqiData.aqi);
        const aqiValueEl = document.getElementById('aqiValue');
        const aqiLabelEl = document.getElementById('aqiLabel');
        aqiValueEl.textContent = aqiData.aqi;
        aqiValueEl.style.color = level.color;
        aqiLabelEl.textContent = level.label;
        aqiLabelEl.style.color = level.color;
        document.getElementById('aqiPm25').textContent = aqiData.pm25;
        document.getElementById('aqiPm10').textContent = aqiData.pm10;

        // Update AQI bar
        const aqiBarFill = document.getElementById('aqiBarFill');
        if (aqiBarFill) {
            const fillWidth = Math.min((aqiData.aqi / 300) * 100, 100);
            aqiBarFill.style.width = `${fillWidth}%`;
            aqiBarFill.style.backgroundColor = level.color;
        }

        aqiCard.classList.remove('hidden');
        current.airQuality = aqiData;
    } else {
        aqiCard.classList.add('hidden');
    }

    // AI clothing advice (in background)
    getContextualSuggestion(current, yesterday, current.name, (text) => {
        if (suggestionEl) {
            suggestionEl.textContent = text;
            suggestionEl.classList.remove('hidden');
        }
    }).then((finalSuggestion) => {
        if (finalSuggestion && suggestionEl) {
            suggestionEl.textContent = finalSuggestion;
            suggestionEl.classList.remove('hidden');
        }
    }).catch((error) => {
        console.error('Error getting suggestion:', error);
    });

    // Fetch rain forecast
    fetchAndDisplayRainForecast(current.coord.lat, current.coord.lon, timezone);
}

// Fetch and display rain forecast
async function fetchAndDisplayRainForecast(lat, lon, timezone) {
    try {
        showRainLoading();
        const rainData = await getRainForecast(lat, lon);
        if (rainData && rainData.forecast && rainData.forecast.length > 0) {
            displayRainSegments(rainData, timezone);
        } else {
            hideRainChart();
        }
    } catch (error) {
        console.error('Error fetching rain forecast:', error);
        hideRainChart();
    }
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

// Display "Use your current location" option
export function displayLocationSuggestion(handleLocationSearch) {
    elements.citySuggestions.innerHTML = '';
    const suggestionDiv = document.createElement('div');
    suggestionDiv.className = 'suggestion-item location-suggestion';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'suggestion-name';
    nameSpan.innerHTML = '📍 Use your current location';

    suggestionDiv.appendChild(nameSpan);
    suggestionDiv.addEventListener('click', function(e) {
        hideSuggestions();
        handleLocationSearch.call(this, e);
    });

    elements.citySuggestions.appendChild(suggestionDiv);
    elements.citySuggestions.classList.remove('hidden');
}
