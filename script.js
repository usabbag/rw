// Configuration - Open-Meteo API (Free for non-commercial use, no API key needed!)
// Documentation: https://open-meteo.com/en/docs
const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const HISTORICAL_URL = 'https://archive-api.open-meteo.com/v1/archive';

// OpenRouter API Configuration for AI-powered clothing advice
// Documentation: https://openrouter.ai/docs
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODEL = 'anthropic/claude-haiku-4.5';
// API key is loaded from config.js
const OPENROUTER_API_KEY = (typeof CONFIG !== 'undefined' && CONFIG.OPENROUTER_API_KEY) || '';

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
const citySuggestions = document.getElementById('citySuggestions');

// Debounce helper function
function debounce(func, delay) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadRecentSearches();

    // Event listeners
    searchBtn.addEventListener('click', handleSearch);
    locationBtn.addEventListener('click', handleLocationSearch);
    cityInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            hideSuggestions();
            handleSearch();
        }
    });

    // Autocomplete event listener with debouncing
    const debouncedFetchSuggestions = debounce(fetchCitySuggestions, 300);
    cityInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        if (query.length >= 2) {
            debouncedFetchSuggestions(query);
        } else {
            hideSuggestions();
        }
    });

    // Close suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (!cityInput.contains(e.target) && !citySuggestions.contains(e.target)) {
            hideSuggestions();
        }
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

        await displayWeatherComparison(currentWeather, yesterdayWeather);
        saveRecentSearch(city);

    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading();
    }
}

// Fetch weather by coordinates using Open-Meteo
async function fetchWeatherByCoords(lat, lon) {
    try {
        // Extended parameters for AI-powered clothing advice
        const currentParams = [
            'temperature_2m',
            'weather_code',
            'apparent_temperature',
            'relative_humidity_2m',
            'wind_speed_10m',
            'wind_direction_10m',
            'wind_gusts_10m',
            'precipitation',
            'pressure_msl',
            'cloud_cover',
            'uv_index',
            'dew_point_2m'
        ].join(',');

        const dailyParams = 'temperature_2m_max,temperature_2m_min';

        const response = await fetchWithRetry(
            `${FORECAST_URL}?latitude=${lat}&longitude=${lon}&current=${currentParams}&daily=${dailyParams}&timezone=auto`
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
            timezone: data.timezone,
            // Extended data for AI-powered clothing advice
            extended: {
                apparent_temperature: data.current.apparent_temperature,
                humidity: data.current.relative_humidity_2m,
                wind_speed: data.current.wind_speed_10m,
                wind_direction: data.current.wind_direction_10m,
                wind_gusts: data.current.wind_gusts_10m,
                precipitation: data.current.precipitation,
                pressure: data.current.pressure_msl,
                cloud_cover: data.current.cloud_cover,
                uv_index: data.current.uv_index,
                dew_point: data.current.dew_point_2m,
                temp_max: data.daily.temperature_2m_max[0],
                temp_min: data.daily.temperature_2m_min[0]
            }
        };

        const city = currentWeather.name;
        const yesterdayWeather = await getYesterdayWeather(city, {lat: lat, lon: lon, timezone: data.timezone});

        await displayWeatherComparison(currentWeather, yesterdayWeather);
        saveRecentSearch(city);
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
        // Extended parameters for AI-powered clothing advice
        const currentParams = [
            'temperature_2m',
            'weather_code',
            'apparent_temperature',
            'relative_humidity_2m',
            'wind_speed_10m',
            'wind_direction_10m',
            'wind_gusts_10m',
            'precipitation',
            'pressure_msl',
            'cloud_cover',
            'uv_index',
            'dew_point_2m'
        ].join(',');

        const dailyParams = 'temperature_2m_max,temperature_2m_min';

        const response = await fetchWithRetry(
            `${FORECAST_URL}?latitude=${coordinates.lat}&longitude=${coordinates.lon}&current=${currentParams}&daily=${dailyParams}&timezone=${encodeURIComponent(coordinates.timezone || 'auto')}`
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
            timezone: coordinates.timezone || data.timezone,
            // Extended data for AI-powered clothing advice
            extended: {
                apparent_temperature: data.current.apparent_temperature,
                humidity: data.current.relative_humidity_2m,
                wind_speed: data.current.wind_speed_10m,
                wind_direction: data.current.wind_direction_10m,
                wind_gusts: data.current.wind_gusts_10m,
                precipitation: data.current.precipitation,
                pressure: data.current.pressure_msl,
                cloud_cover: data.current.cloud_cover,
                uv_index: data.current.uv_index,
                dew_point: data.current.dew_point_2m,
                temp_max: data.daily.temperature_2m_max[0],
                temp_min: data.daily.temperature_2m_min[0]
            }
        };

        const yesterdayWeather = await getYesterdayWeather(cityName, coordinates);

        await displayWeatherComparison(currentWeather, yesterdayWeather);
        saveRecentSearch(cityName);

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

    // Extended parameters for AI-powered clothing advice
    const currentParams = [
        'temperature_2m',
        'weather_code',
        'apparent_temperature',
        'relative_humidity_2m',
        'wind_speed_10m',
        'wind_direction_10m',
        'wind_gusts_10m',
        'precipitation',
        'pressure_msl',
        'cloud_cover',
        'uv_index',
        'dew_point_2m'
    ].join(',');

    const dailyParams = 'temperature_2m_max,temperature_2m_min';

    // Then get weather data using Open-Meteo Forecast API
    const response = await fetchWithRetry(
        `${FORECAST_URL}?latitude=${coordinates.lat}&longitude=${coordinates.lon}&current=${currentParams}&daily=${dailyParams}&timezone=${encodeURIComponent(coordinates.timezone || 'auto')}`
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
        timezone: coordinates.timezone || data.timezone,
        // Extended data for AI-powered clothing advice
        extended: {
            apparent_temperature: data.current.apparent_temperature,
            humidity: data.current.relative_humidity_2m,
            wind_speed: data.current.wind_speed_10m,
            wind_direction: data.current.wind_direction_10m,
            wind_gusts: data.current.wind_gusts_10m,
            precipitation: data.current.precipitation,
            pressure: data.current.pressure_msl,
            cloud_cover: data.current.cloud_cover,
            uv_index: data.current.uv_index,
            dew_point: data.current.dew_point_2m,
            temp_max: data.daily.temperature_2m_max[0],
            temp_min: data.daily.temperature_2m_min[0]
        }
    };
}

// Get yesterday's weather using Open-Meteo Historical Weather API
async function getYesterdayWeather(city, coordinates = null) {
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

    // Extended parameters for AI-powered clothing advice
    const hourlyParams = [
        'temperature_2m',
        'weather_code',
        'apparent_temperature',
        'relative_humidity_2m',
        'wind_speed_10m',
        'wind_direction_10m',
        'wind_gusts_10m',
        'precipitation',
        'pressure_msl',
        'cloud_cover',
        'dew_point_2m'
    ].join(',');

    const dailyParams = 'temperature_2m_max,temperature_2m_min';

    // Use Open-Meteo Historical Weather API (archive)
    const timezone = coordinates.timezone || 'auto';
    const response = await fetchWithRetry(
        `${HISTORICAL_URL}?latitude=${coordinates.lat}&longitude=${coordinates.lon}&start_date=${yesterdayDate}&end_date=${yesterdayDate}&hourly=${hourlyParams}&daily=${dailyParams}&timezone=${encodeURIComponent(timezone)}`
    );

    if (!response.ok) {
        throw new Error('Unable to fetch historical weather data. Please try again.');
    }

    const data = await response.json();

    // Get the same hour as now from yesterday's data
    const currentHour = new Date().getHours();
    const hourIdx = currentHour;
    const fallbackIdx = 12; // noon fallback

    const yesterdayTemp = data.hourly.temperature_2m[hourIdx] ?? data.hourly.temperature_2m[fallbackIdx];
    const yesterdayCode = data.hourly.weather_code[hourIdx] ?? data.hourly.weather_code[fallbackIdx];

    // Transform historical data to match expected format
    return {
        main: {
            temp: yesterdayTemp
        },
        weather: [{
            description: getWeatherDescription(yesterdayCode)
        }],
        dt: yesterday.getTime() / 1000,
        // Extended data for AI-powered clothing advice
        extended: {
            apparent_temperature: data.hourly.apparent_temperature[hourIdx] ?? data.hourly.apparent_temperature[fallbackIdx],
            humidity: data.hourly.relative_humidity_2m[hourIdx] ?? data.hourly.relative_humidity_2m[fallbackIdx],
            wind_speed: data.hourly.wind_speed_10m[hourIdx] ?? data.hourly.wind_speed_10m[fallbackIdx],
            wind_direction: data.hourly.wind_direction_10m[hourIdx] ?? data.hourly.wind_direction_10m[fallbackIdx],
            wind_gusts: data.hourly.wind_gusts_10m[hourIdx] ?? data.hourly.wind_gusts_10m[fallbackIdx],
            precipitation: data.hourly.precipitation[hourIdx] ?? data.hourly.precipitation[fallbackIdx],
            pressure: data.hourly.pressure_msl[hourIdx] ?? data.hourly.pressure_msl[fallbackIdx],
            cloud_cover: data.hourly.cloud_cover[hourIdx] ?? data.hourly.cloud_cover[fallbackIdx],
            dew_point: data.hourly.dew_point_2m[hourIdx] ?? data.hourly.dew_point_2m[fallbackIdx],
            temp_max: data.daily.temperature_2m_max[0],
            temp_min: data.daily.temperature_2m_min[0],
            // Note: UV index not available in historical data
            uv_index: null
        }
    };
}

// Get perception label based on temperature difference
function getPerceptionLabel(diff) {
    const absDiff = Math.abs(diff);

    if (absDiff === 0) {
        return 'About the same';
    } else if (absDiff <= 2) {
        return diff > 0 ? 'Slightly warmer' : 'Slightly cooler';
    } else if (absDiff <= 5) {
        return diff > 0 ? 'Noticeably warmer' : 'Noticeably cooler';
    } else if (absDiff <= 10) {
        return diff > 0 ? 'Much warmer' : 'Much colder';
    } else {
        return diff > 0 ? 'Significantly warmer' : 'Significantly colder';
    }
}

// Format weather data for AI prompt
function formatWeatherDataForAI(current, yesterday) {
    const currentExt = current.extended || {};
    const yesterdayExt = yesterday.extended || {};

    return `## Today's Weather
- Temperature: ${Math.round(current.main.temp)}°C
- Feels like: ${currentExt.apparent_temperature ? Math.round(currentExt.apparent_temperature) + '°C' : 'N/A'}
- Conditions: ${current.weather[0].description}
- Humidity: ${currentExt.humidity ? currentExt.humidity + '%' : 'N/A'}
- Wind: ${currentExt.wind_speed ? Math.round(currentExt.wind_speed) + ' km/h' : 'N/A'}${currentExt.wind_gusts ? ' (gusts: ' + Math.round(currentExt.wind_gusts) + ' km/h)' : ''}
- Cloud cover: ${currentExt.cloud_cover !== undefined ? currentExt.cloud_cover + '%' : 'N/A'}
- Precipitation: ${currentExt.precipitation !== undefined ? currentExt.precipitation + ' mm' : 'N/A'}
- UV index: ${currentExt.uv_index !== undefined ? currentExt.uv_index : 'N/A'}
- Dew point: ${currentExt.dew_point !== undefined ? Math.round(currentExt.dew_point) + '°C' : 'N/A'}
- Today's range: ${currentExt.temp_min ? Math.round(currentExt.temp_min) : 'N/A'}°C to ${currentExt.temp_max ? Math.round(currentExt.temp_max) : 'N/A'}°C

## Yesterday's Weather (same time)
- Temperature: ${Math.round(yesterday.main.temp)}°C
- Feels like: ${yesterdayExt.apparent_temperature ? Math.round(yesterdayExt.apparent_temperature) + '°C' : 'N/A'}
- Conditions: ${yesterday.weather[0].description}
- Humidity: ${yesterdayExt.humidity ? yesterdayExt.humidity + '%' : 'N/A'}
- Wind: ${yesterdayExt.wind_speed ? Math.round(yesterdayExt.wind_speed) + ' km/h' : 'N/A'}${yesterdayExt.wind_gusts ? ' (gusts: ' + Math.round(yesterdayExt.wind_gusts) + ' km/h)' : ''}
- Cloud cover: ${yesterdayExt.cloud_cover !== undefined ? yesterdayExt.cloud_cover + '%' : 'N/A'}
- Precipitation: ${yesterdayExt.precipitation !== undefined ? yesterdayExt.precipitation + ' mm' : 'N/A'}
- Dew point: ${yesterdayExt.dew_point !== undefined ? Math.round(yesterdayExt.dew_point) + '°C' : 'N/A'}
- Yesterday's range: ${yesterdayExt.temp_min ? Math.round(yesterdayExt.temp_min) : 'N/A'}°C to ${yesterdayExt.temp_max ? Math.round(yesterdayExt.temp_max) : 'N/A'}°C

## Temperature Change
${Math.round(current.main.temp - yesterday.main.temp) > 0 ? '+' : ''}${Math.round(current.main.temp - yesterday.main.temp)}°C from yesterday`;
}

// Call OpenRouter API for AI-generated clothing advice
async function getAIClothingAdvice(current, yesterday, location) {
    // Check if API key is set
    if (!OPENROUTER_API_KEY) {
        console.log('OpenRouter API key not set, using rule-based suggestions');
        return null;
    }

    const weatherData = formatWeatherDataForAI(current, yesterday);

    // System prompt from dresshelp.md
    const systemPrompt = `You are a weather-based clothing advisor that helps people choose what to wear by comparing today's weather conditions with yesterday's weather at the same time. Your goal is to provide practical, nuanced clothing advice that accounts for how weather differences actually feel to humans, not just temperature numbers.

Here is the weather data comparing today and yesterday:

<weather_data>
${weatherData}
</weather_data>

Location: ${location}

Your task is to analyze the weather comparison and provide clothing recommendations that account for human perception of weather changes. Consider these key factors:

**Human Weather Perception Challenges:**
- People often dress based on what they see outside (sunny/cloudy) rather than actual temperature
- Wind makes temperatures feel much colder than they are
- Humidity affects how hot or cold temperatures feel
- Sudden weather changes catch people off guard
- Morning conditions may not reflect afternoon conditions
- People tend to under-dress in transitional seasons
- Layering decisions are often poorly planned

**Analysis Framework:**
1. **Temperature Difference Impact**: Consider not just the numeric difference, but how that translates to comfort. A 3°C difference can feel dramatic depending on the base temperature.

2. **Wind Factor**: Wind significantly affects perceived temperature. Even light wind can make someone feel much colder than expected.

3. **Humidity Considerations**: High humidity makes heat feel oppressive and cold feel more penetrating. Low humidity can make temperatures feel more comfortable.

4. **Weather Condition Changes**: Moving from sunny to cloudy (or vice versa) affects both actual warmth and psychological comfort.

5. **Activity Level**: Consider that people will be walking, commuting, and moving between indoor/outdoor environments.

**Clothing Advice Principles:**
- Be specific about garment types and layering strategies
- Address common mistakes people make in similar conditions
- Consider practical aspects like carrying extra layers
- Be gender-neutral in recommendations
- Account for the transition between different parts of the day
- Mention accessories that make a big difference (scarves, hats, etc.)

Provide your response with ONLY the practical clothing recommendations in 1-2 concise sentences. Do NOT include analysis tags or detailed reasoning - just give the actionable advice directly.`;

    try {
        const response = await fetch(OPENROUTER_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': window.location.origin,
                'X-Title': 'Relative Weather App'
            },
            body: JSON.stringify({
                model: OPENROUTER_MODEL,
                messages: [
                    {
                        role: 'user',
                        content: systemPrompt
                    }
                ]
            })
        });

        if (!response.ok) {
            console.error('OpenRouter API error:', response.status);
            return null;
        }

        const data = await response.json();
        const advice = data.choices?.[0]?.message?.content?.trim();

        return advice || null;
    } catch (error) {
        console.error('Error calling OpenRouter API:', error);
        return null;
    }
}

// Get contextual suggestion based on weather comparison
// Now with AI-powered suggestions via OpenRouter API
async function getContextualSuggestion(current, yesterday, location) {
    // Try to get AI-generated advice first
    const aiAdvice = await getAIClothingAdvice(current, yesterday, location);

    if (aiAdvice) {
        return aiAdvice;
    }

    // Fallback to rule-based suggestions if AI is not available
    const diff = current.main.temp - yesterday.main.temp;
    const absDiff = Math.abs(diff);

    if (absDiff === 0) {
        return 'Dress the same as you did yesterday';
    } else if (diff > 0) {
        if (absDiff <= 3) {
            return 'You can dress slightly lighter than yesterday';
        } else if (absDiff <= 7) {
            return 'Leave the heavy jacket at home today';
        } else {
            return 'Dress much lighter than yesterday';
        }
    } else {
        if (absDiff <= 3) {
            return 'Bring a light layer just in case';
        } else if (absDiff <= 7) {
            return 'Dress warmer than you did yesterday';
        } else {
            return 'Bundle up - it\'s much colder than yesterday';
        }
    }
}

// Display weather comparison
async function displayWeatherComparison(current, yesterday) {
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

    // Update perception label
    const perceptionLabel = getPerceptionLabel(diff);
    document.getElementById('perceptionLabel').textContent = perceptionLabel;

    // Show loading state for AI suggestion
    const suggestionEl = document.getElementById('contextualSuggestion');
    suggestionEl.textContent = 'Getting personalized advice...';

    // Update contextual suggestion (now with AI)
    const suggestion = await getContextualSuggestion(current, yesterday, current.name);
    suggestionEl.textContent = suggestion;

    // Update details (secondary information)
    const todayTime = formatTime(Date.now() / 1000, timezone);
    const yesterdayTime = formatTime(yesterday.dt, timezone);

    document.getElementById('todayDetails').textContent =
        `${currentTemp}°C · ${current.weather[0].description} · ${todayTime}`;

    document.getElementById('yesterdayDetails').textContent =
        `${yesterdayTemp}°C · ${yesterday.weather[0].description} · ${yesterdayTime}`;

    // Show weather display
    weatherDisplay.classList.remove('hidden');

    // Hide rain forecast for now (can be re-enabled with Open-Meteo precipitation data)
    const rainContainer = document.getElementById('rainForecast');
    if (rainContainer) {
        rainContainer.classList.add('hidden');
    }
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

// Autocomplete suggestions functionality
async function fetchCitySuggestions(query) {
    try {
        const response = await fetch(
            `${GEOCODING_URL}?name=${encodeURIComponent(query)}&count=5&language=en&format=json`
        );

        if (!response.ok) {
            hideSuggestions();
            return;
        }

        const data = await response.json();

        if (!data.results || data.results.length === 0) {
            hideSuggestions();
            return;
        }

        displaySuggestions(data.results);
    } catch (error) {
        console.error('Error fetching city suggestions:', error);
        hideSuggestions();
    }
}

function displaySuggestions(cities) {
    citySuggestions.innerHTML = '';

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

        suggestionDiv.addEventListener('click', async () => {
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

            cityInput.value = city.name;
            hideSuggestions();

            // Directly fetch weather with specific coordinates, bypassing disambiguation
            await fetchWeatherForCoordinates(coordinates, city.name);
        });

        citySuggestions.appendChild(suggestionDiv);
    });

    citySuggestions.classList.remove('hidden');
}

function hideSuggestions() {
    citySuggestions.classList.add('hidden');
    citySuggestions.innerHTML = '';
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
async function showDemoData() {
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

    await displayWeatherComparison(mockCurrent, mockYesterday);
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