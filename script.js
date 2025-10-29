// Configuration - Open-Meteo API (Free for non-commercial use, no API key needed!)
// Documentation: https://open-meteo.com/en/docs
const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const HISTORICAL_URL = 'https://archive-api.open-meteo.com/v1/archive';

// WMO Weather interpretation codes (WW)
// https://open-meteo.com/en/docs
const WMO_WEATHER_CODES = {
    0: 'clear sky',
    1: 'mainly clear',
    2: 'partly cloudy',
    3: 'overcast',
    45: 'fog',
    48: 'depositing rime fog',
    51: 'light drizzle',
    53: 'moderate drizzle',
    55: 'dense drizzle',
    56: 'light freezing drizzle',
    57: 'dense freezing drizzle',
    61: 'slight rain',
    63: 'moderate rain',
    65: 'heavy rain',
    66: 'light freezing rain',
    67: 'heavy freezing rain',
    71: 'slight snow fall',
    73: 'moderate snow fall',
    75: 'heavy snow fall',
    77: 'snow grains',
    80: 'slight rain showers',
    81: 'moderate rain showers',
    82: 'violent rain showers',
    85: 'slight snow showers',
    86: 'heavy snow showers',
    95: 'thunderstorm',
    96: 'thunderstorm with slight hail',
    99: 'thunderstorm with heavy hail'
};

function getWeatherDescription(wmoCode) {
    return WMO_WEATHER_CODES[wmoCode] || 'unknown';
}

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

// Retry helper function with exponential backoff
async function fetchWithRetry(url, options = {}, retries = MAX_RETRIES) {
    try {
        const response = await fetch(url, options);

        // Don't retry on client errors (4xx) except 429 (rate limit)
        if (!response.ok && response.status >= 400 && response.status < 500 && response.status !== 429) {
            return response;
        }

        // Retry on server errors (5xx) or rate limit (429)
        if (!response.ok && retries > 0) {
            const delay = INITIAL_RETRY_DELAY * Math.pow(2, MAX_RETRIES - retries);
            console.log(`Request failed (${response.status}), retrying in ${delay}ms... (${retries} retries left)`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return fetchWithRetry(url, options, retries - 1);
        }

        return response;
    } catch (error) {
        // Network errors - retry if we have retries left
        if (retries > 0) {
            const delay = INITIAL_RETRY_DELAY * Math.pow(2, MAX_RETRIES - retries);
            console.log(`Network error, retrying in ${delay}ms... (${retries} retries left)`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return fetchWithRetry(url, options, retries - 1);
        }
        throw error;
    }
}

// DOM elements
const cityInput = document.getElementById('cityInput');
const searchBtn = document.getElementById('searchBtn');
const locationBtn = document.getElementById('locationBtn');
const weatherDisplay = document.getElementById('weatherDisplay');
const errorMessage = document.getElementById('errorMessage');
const recentSearches = document.getElementById('recentSearches');
const recentList = document.getElementById('recentList');
const cityDisambiguation = document.getElementById('cityDisambiguation');
const cityChoices = document.getElementById('cityChoices');
const dataSourceNotice = document.getElementById('dataSourceNotice');

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadRecentSearches();

    // Event listeners
    searchBtn.addEventListener('click', handleSearch);
    locationBtn.addEventListener('click', handleLocationSearch);
    cityInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });

    // No API key needed! Open-Meteo is free for non-commercial use
    console.log('Weather app ready! Using Open-Meteo API (free, no key required)');
});

// Main search handler
async function handleSearch() {
    const city = cityInput.value.trim();
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
            await fetchWeatherByCoords(latitude, longitude);
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

        // If getCurrentWeather returns null, it means disambiguation UI was shown
        if (!currentWeather) {
            return;
        }

        const yesterdayWeather = await getYesterdayWeather(city, currentWeather.coordinates);

        displayWeatherComparison(currentWeather, yesterdayWeather);
        saveRecentSearch(city);
        storeWeatherData(city, currentWeather);

    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading();
    }
}

// Fetch weather by coordinates using Open-Meteo
async function fetchWeatherByCoords(lat, lon) {
    try {
        const response = await fetchWithRetry(
            `${FORECAST_URL}?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`
        );

        if (!response.ok) {
            throw new Error('Unable to get weather for your location');
        }

        const data = await response.json();

        // Transform Open-Meteo response to match expected format
        const currentWeather = {
            name: data.timezone, // Using timezone as location name
            main: {
                temp: data.current.temperature_2m
            },
            weather: [{
                description: getWeatherDescription(data.current.weather_code)
            }],
            dt: new Date(data.current.time).getTime() / 1000,
            coord: {
                lat: lat,
                lon: lon
            },
            timezone: data.timezone
        };

        const city = currentWeather.name;
        const yesterdayWeather = await getYesterdayWeather(city, {lat: lat, lon: lon, timezone: data.timezone});

        displayWeatherComparison(currentWeather, yesterdayWeather);
        saveRecentSearch(city);
        storeWeatherData(city, currentWeather);
        cityInput.value = city;

    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading();
    }
}

// Get coordinates from city name using Open-Meteo Geocoding API
async function getCityCoordinates(city, allowMultiple = true) {
    const response = await fetchWithRetry(
        `${GEOCODING_URL}?name=${encodeURIComponent(city)}&count=5&language=en&format=json`
    );

    if (!response.ok) {
        throw new Error('Unable to fetch city coordinates. Please try again.');
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
        throw new Error('City not found. Please check the spelling.');
    }

    // If multiple cities found and disambiguation is allowed, return all
    if (allowMultiple && data.results.length > 1) {
        return data.results.map(location => ({
            lat: location.latitude,
            lon: location.longitude,
            name: location.name,
            country: location.country,
            country_code: location.country_code,
            state: location.admin1,
            timezone: location.timezone
        }));
    }

    // Return single result
    const location = data.results[0];
    return {
        lat: location.latitude,
        lon: location.longitude,
        name: location.name,
        country: location.country,
        country_code: location.country_code,
        state: location.admin1,
        timezone: location.timezone
    };
}

// Show city disambiguation UI
function showCityDisambiguation(cities, originalQuery) {
    hideError();
    weatherDisplay.classList.add('hidden');
    cityDisambiguation.classList.remove('hidden');

    cityChoices.innerHTML = '';

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

        choiceDiv.addEventListener('click', async () => {
            cityDisambiguation.classList.add('hidden');
            await fetchWeatherForCoordinates(city, originalQuery);
        });

        cityChoices.appendChild(choiceDiv);
    });
}

// Fetch weather for specific coordinates using Open-Meteo
async function fetchWeatherForCoordinates(coordinates, cityName) {
    showLoading();
    hideError();

    try {
        const response = await fetchWithRetry(
            `${FORECAST_URL}?latitude=${coordinates.lat}&longitude=${coordinates.lon}&current=temperature_2m,weather_code&timezone=${encodeURIComponent(coordinates.timezone || 'auto')}`
        );

        if (!response.ok) {
            throw new Error('Unable to fetch weather data. Please try again.');
        }

        const data = await response.json();

        // Transform Open-Meteo response to match expected format
        const currentWeather = {
            name: coordinates.state
                ? `${coordinates.name}, ${coordinates.state}, ${coordinates.country}`
                : `${coordinates.name}, ${coordinates.country}`,
            main: {
                temp: data.current.temperature_2m
            },
            weather: [{
                description: getWeatherDescription(data.current.weather_code)
            }],
            dt: new Date(data.current.time).getTime() / 1000,
            coord: {
                lat: coordinates.lat,
                lon: coordinates.lon
            },
            coordinates: coordinates,
            timezone: coordinates.timezone || data.timezone
        };

        const yesterdayWeather = await getYesterdayWeather(cityName, coordinates);

        displayWeatherComparison(currentWeather, yesterdayWeather);
        saveRecentSearch(cityName);
        storeWeatherData(cityName, currentWeather);

    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading();
    }
}

// Get current weather data using Open-Meteo Forecast API
async function getCurrentWeather(city) {
    // First get coordinates for the city
    const coordinatesResult = await getCityCoordinates(city);

    // Check if multiple cities were returned
    if (Array.isArray(coordinatesResult)) {
        // Show disambiguation UI
        showCityDisambiguation(coordinatesResult, city);
        return null; // Return early, user will select a city
    }

    const coordinates = coordinatesResult;

    // Then get weather data using Open-Meteo Forecast API
    const response = await fetchWithRetry(
        `${FORECAST_URL}?latitude=${coordinates.lat}&longitude=${coordinates.lon}&current=temperature_2m,weather_code&timezone=${encodeURIComponent(coordinates.timezone || 'auto')}`
    );

    if (!response.ok) {
        throw new Error('Unable to fetch weather data. Please try again.');
    }

    const data = await response.json();

    // Transform Open-Meteo response to match expected format
    return {
        name: coordinates.state
            ? `${coordinates.name}, ${coordinates.state}, ${coordinates.country}`
            : `${coordinates.name}, ${coordinates.country}`,
        main: {
            temp: data.current.temperature_2m
        },
        weather: [{
            description: getWeatherDescription(data.current.weather_code)
        }],
        dt: new Date(data.current.time).getTime() / 1000,
        coord: {
            lat: coordinates.lat,
            lon: coordinates.lon
        },
        coordinates: coordinates,
        timezone: coordinates.timezone || data.timezone
    };
}

// Get yesterday's weather using Open-Meteo Historical Weather API
async function getYesterdayWeather(city, coordinates = null) {
    // Try to get stored data from yesterday first
    const stored = getStoredWeather(city);
    if (stored && isFromYesterday(stored.timestamp)) {
        return {
            data: stored.data,
            source: 'stored',
            message: 'Yesterday\'s data from your previous search'
        };
    }

    try {
        // If no coordinates provided, get them from city name
        if (!coordinates) {
            coordinates = await getCityCoordinates(city, false);
            if (Array.isArray(coordinates)) {
                coordinates = coordinates[0];
            }
        }

        // Get yesterday's date in ISO format (YYYY-MM-DD)
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const yesterdayDate = yesterday.toISOString().split('T')[0];

        // Use Open-Meteo Historical Weather API (archive)
        // This is FREE and includes historical data!
        const timezone = coordinates.timezone || 'auto';
        const response = await fetchWithRetry(
            `${HISTORICAL_URL}?latitude=${coordinates.lat}&longitude=${coordinates.lon}&start_date=${yesterdayDate}&end_date=${yesterdayDate}&hourly=temperature_2m,weather_code&timezone=${encodeURIComponent(timezone)}`
        );

        if (!response.ok) {
            console.log('Historical data not available, using stored or mock data');
            return {
                data: generateMockYesterdayWeather(),
                source: 'mock',
                message: 'Using simulated data (historical data unavailable)'
            };
        }

        const data = await response.json();

        // Get the same hour as now from yesterday's data
        const currentHour = new Date().getHours();
        const yesterdayTemp = data.hourly.temperature_2m[currentHour] || data.hourly.temperature_2m[12]; // fallback to noon
        const yesterdayCode = data.hourly.weather_code[currentHour] || data.hourly.weather_code[12];

        // Transform historical data to match expected format
        return {
            data: {
                main: {
                    temp: yesterdayTemp
                },
                weather: [{
                    description: getWeatherDescription(yesterdayCode)
                }],
                dt: yesterday.getTime() / 1000
            },
            source: 'api',
            message: 'Actual historical data from Open-Meteo'
        };

    } catch (error) {
        console.log('Error fetching historical data:', error.message);
        // Fallback to mock data if historical data fails
        return {
            data: generateMockYesterdayWeather(),
            source: 'mock',
            message: 'Using simulated data (error fetching historical data)'
        };
    }
}

// Display weather comparison
function displayWeatherComparison(current, yesterdayResult) {
    // Extract yesterday data and source info
    const yesterday = yesterdayResult.data || yesterdayResult;
    const dataSource = yesterdayResult.source || 'unknown';
    const dataMessage = yesterdayResult.message || '';

    // Update city name
    document.getElementById('cityName').textContent = current.name;

    // Show data source notice
    const noticeElement = document.getElementById('dataSourceNotice');
    if (dataSource && dataMessage) {
        noticeElement.textContent = dataMessage;
        noticeElement.classList.remove('hidden', 'info', 'success', 'warning');

        if (dataSource === 'api') {
            noticeElement.classList.add('success');
        } else if (dataSource === 'stored') {
            noticeElement.classList.add('info');
        } else if (dataSource === 'mock') {
            noticeElement.classList.add('warning');
        }
    } else {
        noticeElement.classList.add('hidden');
    }

    // Get timezone from current weather data
    const timezone = current.timezone || null;

    // Update current weather
    const currentTemp = Math.round(current.main.temp);
    document.getElementById('currentTemp').textContent = `${currentTemp}°C`;
    document.getElementById('currentDesc').textContent = current.weather[0].description;
    document.getElementById('currentTime').textContent = formatTime(Date.now() / 1000, timezone);

    // Update yesterday's weather
    const yesterdayTemp = Math.round(yesterday.main.temp);
    document.getElementById('yesterdayTemp').textContent = `${yesterdayTemp}°C`;
    document.getElementById('yesterdayDesc').textContent = yesterday.weather[0].description;
    document.getElementById('yesterdayTime').textContent = formatTime(yesterday.dt, timezone);
    
    // Calculate and display difference
    const diff = currentTemp - yesterdayTemp;
    const diffElement = document.getElementById('tempDifference');
    
    let diffText = '';
    let className = '';
    
    if (diff > 0) {
        diffText = `${diff}°C warmer than yesterday`;
        className = 'warmer';
    } else if (diff < 0) {
        diffText = `${Math.abs(diff)}°C colder than yesterday`;
        className = 'colder';
    } else {
        diffText = 'Same as yesterday';
        className = 'same';
    }
    
    diffElement.textContent = diffText;
    diffElement.className = className;
    
    // Show weather display
    weatherDisplay.classList.remove('hidden');

    // Hide rain forecast for now (can be re-enabled with Open-Meteo precipitation data)
    const rainContainer = document.getElementById('rainForecast');
    if (rainContainer) {
        rainContainer.classList.add('hidden');
    }
}

// Data storage functions
function storeWeatherData(city, data) {
    const key = `weather_${city.toLowerCase()}`;
    const stored = {
        timestamp: new Date().toISOString(),
        data: data
    };
    localStorage.setItem(key, JSON.stringify(stored));
}

function getStoredWeather(city) {
    const key = `weather_${city.toLowerCase()}`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : null;
}

function isFromYesterday(timestamp) {
    const stored = new Date(timestamp);
    const now = new Date();
    const diffTime = now - stored;
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays >= 0.8 && diffDays < 1.5; // Accept data from ~20 hours to 36 hours ago
}

// Mock yesterday weather (since free API doesn't have historical data)
function generateMockYesterdayWeather() {
    const tempVariation = (Math.random() - 0.5) * 10; // ±5°C variation
    const descriptions = [
        'clear sky', 'few clouds', 'scattered clouds', 'broken clouds', 
        'light rain', 'moderate rain', 'overcast clouds'
    ];
    
    return {
        main: {
            temp: 20 + tempVariation // Base temperature with variation
        },
        weather: [{
            description: descriptions[Math.floor(Math.random() * descriptions.length)]
        }],
        dt: Date.now() / 1000 - (24 * 60 * 60) // Yesterday's timestamp
    };
}

// Recent searches functionality
function saveRecentSearch(city) {
    let recent = JSON.parse(localStorage.getItem('recentSearches') || '[]');
    
    // Remove city if it already exists and add to front
    recent = [city, ...recent.filter(c => c.toLowerCase() !== city.toLowerCase())].slice(0, 5);
    
    localStorage.setItem('recentSearches', JSON.stringify(recent));
    loadRecentSearches();
}

function loadRecentSearches() {
    const recent = JSON.parse(localStorage.getItem('recentSearches') || '[]');
    
    if (recent.length === 0) {
        recentSearches.classList.add('hidden');
        return;
    }
    
    recentList.innerHTML = '';
    recent.forEach(city => {
        const cityElement = document.createElement('span');
        cityElement.className = 'recent-city';
        cityElement.textContent = city;
        cityElement.addEventListener('click', () => {
            cityInput.value = city;
            handleSearch();
        });
        recentList.appendChild(cityElement);
    });
    
    recentSearches.classList.remove('hidden');
}

// UI helper functions
function showLoading() {
    searchBtn.textContent = 'Loading...';
    searchBtn.disabled = true;
    searchBtn.classList.add('loading');
}

function hideLoading() {
    searchBtn.textContent = 'Get Weather';
    searchBtn.disabled = false;
    searchBtn.classList.remove('loading');
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
    weatherDisplay.classList.add('hidden');
}

function hideError() {
    errorMessage.classList.add('hidden');
}

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

// Demo mode (for when API key is not set)
function showDemoData() {
    const mockCurrent = {
        name: 'Demo City',
        main: { temp: 22 },
        weather: [{ description: 'partly cloudy' }],
        dt: Date.now() / 1000
    };
    
    const mockYesterday = {
        main: { temp: 18 },
        weather: [{ description: 'clear sky' }],
        dt: Date.now() / 1000 - (24 * 60 * 60)
    };
    
    displayWeatherComparison(mockCurrent, mockYesterday);
}

// Error handling for network issues
window.addEventListener('offline', () => {
    showError('No internet connection. Please check your network.');
});

window.addEventListener('online', () => {
    hideError();
});

// Rain Forecast Module - DISABLED (Can be re-enabled with Open-Meteo precipitation API)
// Open-Meteo provides precipitation data via:
// &hourly=precipitation,precipitation_probability
// See: https://open-meteo.com/en/docs

/*
async function fetchRainForecast(lat, lon) {
    // TODO: Implement with Open-Meteo hourly precipitation data
}

function createRainChart(rainData) {
    // TODO: Implement rain chart visualization
}

async function showRainForecast(lat, lon) {
    // TODO: Implement rain forecast display
}
*/ 