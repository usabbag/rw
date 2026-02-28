import {
    GEOCODING_URL,
    FORECAST_URL,
    HISTORICAL_URL,
    MAX_RETRIES,
    INITIAL_RETRY_DELAY
} from './config.js';
import { getWeatherDescription } from './weather.js';

// Retry helper function with exponential backoff
export async function fetchWithRetry(url, options = {}, retries = MAX_RETRIES) {
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

// Get coordinates from city name using Open-Meteo Geocoding API
export async function getCityCoordinates(city) {
    const response = await fetchWithRetry(
        `${GEOCODING_URL}?name=${encodeURIComponent(city)}&count=1&language=en&format=json`
    );

    if (!response.ok) {
        throw new Error('Unable to fetch city coordinates. Please try again.');
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
        throw new Error('City not found. Please check the spelling.');
    }

    // Return first (best match) result
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

// Extended parameters for AI-powered clothing advice
const CURRENT_PARAMS = [
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

const DAILY_PARAMS = 'temperature_2m_max,temperature_2m_min,sunrise,sunset';

// Get current weather data using Open-Meteo Forecast API
export async function getCurrentWeather(city) {
    // First get coordinates for the city
    const coordinates = await getCityCoordinates(city);

    // Then get weather data using Open-Meteo Forecast API
    const response = await fetchWithRetry(
        `${FORECAST_URL}?latitude=${coordinates.lat}&longitude=${coordinates.lon}&current=${CURRENT_PARAMS}&daily=${DAILY_PARAMS}&timezone=${encodeURIComponent(coordinates.timezone || 'auto')}`
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
            description: getWeatherDescription(data.current.weather_code),
            code: data.current.weather_code
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
            temp_min: data.daily.temperature_2m_min[0],
            sunrise: data.daily.sunrise[0],
            sunset: data.daily.sunset[0]
        }
    };
}

// Fetch weather for specific coordinates using Open-Meteo
export async function fetchWeatherForCoordinates(coordinates) {
    const response = await fetchWithRetry(
        `${FORECAST_URL}?latitude=${coordinates.lat}&longitude=${coordinates.lon}&current=${CURRENT_PARAMS}&daily=${DAILY_PARAMS}&timezone=${encodeURIComponent(coordinates.timezone || 'auto')}`
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
            description: getWeatherDescription(data.current.weather_code),
            code: data.current.weather_code
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
            temp_min: data.daily.temperature_2m_min[0],
            sunrise: data.daily.sunrise[0],
            sunset: data.daily.sunset[0]
        }
    };
}

// Fetch weather by coordinates (for geolocation)
export async function fetchWeatherByCoords(lat, lon) {
    const response = await fetchWithRetry(
        `${FORECAST_URL}?latitude=${lat}&longitude=${lon}&current=${CURRENT_PARAMS}&daily=${DAILY_PARAMS}&timezone=auto`
    );

    if (!response.ok) {
        throw new Error('Unable to get weather for your location');
    }

    const data = await response.json();

    // Transform Open-Meteo response to match expected format
    return {
        name: data.timezone, // Using timezone as location name
        main: {
            temp: data.current.temperature_2m
        },
        weather: [{
            description: getWeatherDescription(data.current.weather_code),
            code: data.current.weather_code
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
            temp_min: data.daily.temperature_2m_min[0],
            sunrise: data.daily.sunrise[0],
            sunset: data.daily.sunset[0]
        }
    };
}

// Get yesterday's weather using Open-Meteo Historical Weather API
export async function getYesterdayWeather(city, coordinates = null) {
    // If no coordinates provided, get them from city name
    if (!coordinates) {
        coordinates = await getCityCoordinates(city);
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

// Fetch city suggestions for autocomplete
export async function fetchCitySuggestions(query) {
    const response = await fetch(
        `${GEOCODING_URL}?name=${encodeURIComponent(query)}&count=5&language=en&format=json`
    );

    if (!response.ok) {
        return null;
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
        return null;
    }

    return data.results;
}

// Get today's hourly precipitation forecast from Open-Meteo
export async function getTodayRainForecast(lat, lon, timezone = 'auto') {
    const response = await fetchWithRetry(
        `${FORECAST_URL}?latitude=${lat}&longitude=${lon}&hourly=precipitation,precipitation_probability&timezone=${encodeURIComponent(timezone)}&forecast_days=1`
    );

    if (!response.ok) return null;

    const data = await response.json();
    if (!data.hourly) return null;

    return {
        times: data.hourly.time,
        precipitation: data.hourly.precipitation,
        probability: data.hourly.precipitation_probability
    };
}

// Get 6-hour temperature forecast (today and yesterday)
export async function get6HourForecast(coordinates) {
    const timezone = coordinates.timezone || 'auto';

    // Get today's hourly forecast (full day, we'll slice it)
    const todayResponse = await fetchWithRetry(
        `${FORECAST_URL}?latitude=${coordinates.lat}&longitude=${coordinates.lon}&hourly=temperature_2m&timezone=${encodeURIComponent(timezone)}`
    );

    if (!todayResponse.ok) {
        throw new Error('Unable to fetch hourly forecast data.');
    }

    const todayData = await todayResponse.json();

    // Get yesterday's hourly data for the same time range
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const yesterdayDate = yesterday.toISOString().split('T')[0];

    const yesterdayResponse = await fetchWithRetry(
        `${HISTORICAL_URL}?latitude=${coordinates.lat}&longitude=${coordinates.lon}&start_date=${yesterdayDate}&end_date=${yesterdayDate}&hourly=temperature_2m&timezone=${encodeURIComponent(timezone)}`
    );

    if (!yesterdayResponse.ok) {
        throw new Error('Unable to fetch historical hourly data.');
    }

    const yesterdayData = await yesterdayResponse.json();

    // Find current hour index
    const now = new Date();
    const currentHourIndex = now.getHours();

    // Extract next 6 hours from today's forecast
    const todayTemps = [];
    const todayTimes = [];
    for (let i = 0; i < 6; i++) {
        const hourIndex = currentHourIndex + i;
        if (hourIndex < todayData.hourly.temperature_2m.length) {
            todayTemps.push(todayData.hourly.temperature_2m[hourIndex]);
            todayTimes.push(todayData.hourly.time[hourIndex]);
        }
    }

    // Extract the corresponding 6 hours from yesterday
    const yesterdayTemps = [];
    for (let i = 0; i < 6; i++) {
        const hourIndex = currentHourIndex + i;
        if (hourIndex < 24 && hourIndex < yesterdayData.hourly.temperature_2m.length) {
            yesterdayTemps.push(yesterdayData.hourly.temperature_2m[hourIndex]);
        }
    }

    return {
        today: {
            times: todayTimes,
            temperatures: todayTemps
        },
        yesterday: {
            temperatures: yesterdayTemps
        },
        timezone: todayData.timezone
    };
}
