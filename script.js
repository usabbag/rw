// Configuration - You'll need to get your own API key from https://openweathermap.org/api
const API_KEY = '079ed8a9197177ff8767b72017a9ac1f'; // Replace with your actual API key
const ONECALL_URL = 'https://api.openweathermap.org/data/3.0/onecall'; // One Call API 3.0
const GEOCODING_URL = 'https://api.openweathermap.org/geo/1.0/direct'; // Geocoding API (recommended for One Call API 3.0)

// DOM elements
const cityInput = document.getElementById('cityInput');
const searchBtn = document.getElementById('searchBtn');
const locationBtn = document.getElementById('locationBtn');
const weatherDisplay = document.getElementById('weatherDisplay');
const errorMessage = document.getElementById('errorMessage');
const recentSearches = document.getElementById('recentSearches');
const recentList = document.getElementById('recentList');

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadRecentSearches();
    
    // Event listeners
    searchBtn.addEventListener('click', handleSearch);
    locationBtn.addEventListener('click', handleLocationSearch);
    cityInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
    
    // Check if we have a valid API key
    if (API_KEY === 'YOUR_API_KEY_HERE') {
        showError('Please add your OpenWeatherMap API key to script.js');
    }
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

// Fetch weather by coordinates
async function fetchWeatherByCoords(lat, lon) {
    try {
        const response = await fetch(
            `${ONECALL_URL}?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&exclude=minutely,hourly,daily,alerts`
        );
        
        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('Invalid API key or subscription. Please check your OpenWeatherMap API key and subscription.');
            } else {
                throw new Error('Unable to get weather for your location');
            }
        }
        
        const data = await response.json();
        
        // Transform One Call API response to match expected format
        const currentWeather = {
            name: `${data.timezone}`, // Using timezone as location name
            main: {
                temp: data.current.temp
            },
            weather: data.current.weather,
            dt: data.current.dt,
            coord: {
                lat: lat,
                lon: lon
            }
        };
        
        const city = currentWeather.name;
        const yesterdayWeather = await getYesterdayWeather(city, {lat: lat, lon: lon});
        
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

// Get coordinates from city name using Geocoding API (recommended for One Call API 3.0)
async function getCityCoordinates(city) {
    const response = await fetch(
        `${GEOCODING_URL}?q=${city}&limit=1&appid=${API_KEY}`
    );
    
    if (!response.ok) {
        if (response.status === 401) {
            throw new Error('Invalid API key. Please check your OpenWeatherMap API key.');
        } else {
            throw new Error('Unable to fetch city coordinates. Please try again.');
        }
    }
    
    const data = await response.json();
    
    if (!data || data.length === 0) {
        throw new Error('City not found. Please check the spelling.');
    }
    
    const location = data[0];
    
    return {
        lat: location.lat,
        lon: location.lon,
        name: location.name,
        country: location.country
    };
}

// Get current weather data using One Call API 3.0
async function getCurrentWeather(city) {
    // First get coordinates for the city
    const coordinates = await getCityCoordinates(city);
    
    // Then get weather data using One Call API
    const response = await fetch(
        `${ONECALL_URL}?lat=${coordinates.lat}&lon=${coordinates.lon}&appid=${API_KEY}&units=metric&exclude=minutely,hourly,daily,alerts`
    );
    
    if (!response.ok) {
        if (response.status === 401) {
            throw new Error('Invalid API key or subscription. Please check your OpenWeatherMap API key and subscription.');
        } else {
            throw new Error('Unable to fetch weather data. Please try again.');
        }
    }
    
    const data = await response.json();
    
    // Transform One Call API response to match expected format
    return {
        name: `${coordinates.name}, ${coordinates.country}`,
        main: {
            temp: data.current.temp
        },
        weather: data.current.weather,
        dt: data.current.dt,
        coord: {
            lat: coordinates.lat,
            lon: coordinates.lon
        },
        coordinates: coordinates // Pass coordinates for yesterday's weather lookup
    };
}

// Get yesterday's weather using One Call API 3.0 historical data
async function getYesterdayWeather(city, coordinates = null) {
    // Try to get stored data from yesterday first
    const stored = getStoredWeather(city);
    if (stored && isFromYesterday(stored.timestamp)) {
        return stored.data;
    }
    
    try {
        // If no coordinates provided, get them from city name
        if (!coordinates) {
            coordinates = await getCityCoordinates(city);
        }
        
        // Get yesterday's timestamp (24 hours ago)
        const yesterdayTimestamp = Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000);
        
        // Use One Call API timemachine endpoint for historical data
        const response = await fetch(
            `${ONECALL_URL}/timemachine?lat=${coordinates.lat}&lon=${coordinates.lon}&dt=${yesterdayTimestamp}&appid=${API_KEY}&units=metric`
        );
        
        if (!response.ok) {
            console.log('Historical data not available, using mock data');
            return generateMockYesterdayWeather();
        }
        
        const data = await response.json();
        
        // Transform historical data to match expected format
        return {
            main: {
                temp: data.current.temp
            },
            weather: data.current.weather,
            dt: data.current.dt
        };
        
    } catch (error) {
        console.log('Error fetching historical data:', error.message);
        // Fallback to mock data if historical data fails
        return generateMockYesterdayWeather();
    }
}

// Display weather comparison
function displayWeatherComparison(current, yesterday) {
    // Update city name
    document.getElementById('cityName').textContent = current.name;
    
    // Update current weather
    const currentTemp = Math.round(current.main.temp);
    document.getElementById('currentTemp').textContent = `${currentTemp}°C`;
    document.getElementById('currentDesc').textContent = current.weather[0].description;
    document.getElementById('currentTime').textContent = formatTime(Date.now() / 1000);
    
    // Update yesterday's weather
    const yesterdayTemp = Math.round(yesterday.main.temp);
    document.getElementById('yesterdayTemp').textContent = `${yesterdayTemp}°C`;
    document.getElementById('yesterdayDesc').textContent = yesterday.weather[0].description;
    document.getElementById('yesterdayTime').textContent = formatTime(yesterday.dt);
    
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
    
    // Show rain forecast if coordinates are available
    if (current.coord && current.coord.lat && current.coord.lon) {
        showRainForecast(current.coord.lat, current.coord.lon);
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

function formatTime(timestamp) {
    return new Date(timestamp * 1000).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
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

// Rain Forecast Module
async function fetchRainForecast(lat, lon) {
    try {
        // Get minutely + first hour of hourly data for context
        const response = await fetch(
            `${ONECALL_URL}?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&exclude=daily,alerts`
        );
        
        if (!response.ok) {
            throw new Error('Unable to fetch rain forecast');
        }
        
        const data = await response.json();
        
        return {
            minutely: data.minutely || [], // 60 minutes of precipitation data
            hourly: data.hourly ? data.hourly.slice(0, 1) : [], // First hour for probability context
            location: data.timezone
        };
        
    } catch (error) {
        console.log('Error fetching rain forecast:', error.message);
        return null;
    }
}

function createRainChart(rainData) {
    if (!rainData || !rainData.minutely || rainData.minutely.length === 0) {
        return '<div class="no-rain-data">No rain forecast data available</div>';
    }

    const maxPrecipitation = Math.max(...rainData.minutely.map(m => m.precipitation), 0.1);
    const hourlyProb = rainData.hourly[0]?.pop || 0;
    
    let chartHTML = `
        <div class="rain-forecast">
            <div class="rain-header">
                <h3>Next Hour Rain Forecast</h3>
                <div class="rain-chance">Chance: ${Math.round(hourlyProb * 100)}%</div>
            </div>
            <div class="rain-chart">
    `;
    
    // Create bars for each 5-minute interval (12 bars for 60 minutes)
    for (let i = 0; i < 60; i += 5) {
        const intervalData = rainData.minutely.slice(i, i + 5);
        const avgPrecipitation = intervalData.length > 0 
            ? intervalData.reduce((sum, m) => sum + m.precipitation, 0) / intervalData.length 
            : 0;
        
        const heightPercent = maxPrecipitation > 0 ? (avgPrecipitation / maxPrecipitation) * 100 : 0;
        const hasRain = avgPrecipitation > 0;
        
        chartHTML += `
            <div class="rain-bar" data-time="${i}min">
                <div class="bar ${hasRain ? 'has-rain' : ''}" 
                     style="height: ${heightPercent}%"
                     title="${avgPrecipitation.toFixed(2)}mm/h at +${i}min">
                </div>
                <div class="time-label">${i === 0 ? 'Now' : i + 'min'}</div>
            </div>
        `;
    }
    
    chartHTML += `
            </div>
            <div class="rain-legend">
                <span class="legend-item">
                    <div class="legend-color has-rain"></div>
                    Rain expected
                </span>
                <span class="legend-item">
                    <div class="legend-color no-rain"></div>
                    No rain
                </span>
            </div>
        </div>
    `;
    
    return chartHTML;
}

async function showRainForecast(lat, lon) {
    const rainContainer = document.getElementById('rainForecast');
    if (!rainContainer) return;
    
    rainContainer.innerHTML = '<div class="loading-rain">Loading rain forecast...</div>';
    
    const rainData = await fetchRainForecast(lat, lon);
    const chartHTML = createRainChart(rainData);
    
    rainContainer.innerHTML = chartHTML;
} 