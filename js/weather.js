// WMO Weather interpretation codes (WW)
// https://open-meteo.com/en/docs
export const WMO_WEATHER_CODES = {
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

export function getWeatherDescription(wmoCode) {
    return WMO_WEATHER_CODES[wmoCode] || 'unknown';
}

// Map WMO weather codes to emojis
export const WMO_WEATHER_EMOJIS = {
    0: '☀️',   // clear sky
    1: '🌤️',   // mainly clear
    2: '⛅',   // partly cloudy
    3: '☁️',   // overcast
    45: '🌫️',  // fog
    48: '🌫️',  // depositing rime fog
    51: '🌦️',  // light drizzle
    53: '🌧️',  // moderate drizzle
    55: '🌧️',  // dense drizzle
    56: '🌧️',  // light freezing drizzle
    57: '🌧️',  // dense freezing drizzle
    61: '🌧️',  // slight rain
    63: '🌧️',  // moderate rain
    65: '🌧️',  // heavy rain
    66: '🌧️',  // light freezing rain
    67: '🌧️',  // heavy freezing rain
    71: '🌨️',  // slight snow fall
    73: '❄️',  // moderate snow fall
    75: '❄️',  // heavy snow fall
    77: '❄️',  // snow grains
    80: '🌦️',  // slight rain showers
    81: '🌧️',  // moderate rain showers
    82: '⛈️',  // violent rain showers
    85: '🌨️',  // slight snow showers
    86: '🌨️',  // heavy snow showers
    95: '⛈️',  // thunderstorm
    96: '⛈️',  // thunderstorm with slight hail
    99: '⛈️'   // thunderstorm with heavy hail
};

export function getWeatherEmoji(wmoCode, sunrise = null, sunset = null) {
    // Determine if it's nighttime based on sunrise/sunset
    let isNighttime = false;
    if (sunrise && sunset) {
        const now = new Date();
        const sunriseTime = new Date(sunrise);
        const sunsetTime = new Date(sunset);
        isNighttime = now < sunriseTime || now >= sunsetTime;
    } else {
        // Fallback to simple hour-based detection
        const hour = new Date().getHours();
        isNighttime = hour < 6 || hour >= 20;
    }

    // Use moon emojis for clear conditions at night
    if (isNighttime) {
        if (wmoCode === 0) return '🌙';  // clear sky at night
        if (wmoCode === 1) return '🌙';  // mainly clear at night
        if (wmoCode === 2) return '☁️';  // partly cloudy at night (just clouds)
    }

    return WMO_WEATHER_EMOJIS[wmoCode] || '🌡️';
}

// Get dynamic background gradient based on weather conditions and time of day
export function getWeatherBackground(wmoCode, isDay = true) {
    // Determine if it's day or night (simplified - in production you'd use sunrise/sunset times)
    const hour = new Date().getHours();
    const isDaytime = isDay && (hour >= 6 && hour < 20);

    // Clear sky
    if (wmoCode === 0) {
        return isDaytime
            ? 'linear-gradient(to bottom, #2B5876 0%, #4E7A96 50%, #6A93AB 100%)'
            : 'linear-gradient(to bottom, #0A1420 0%, #1C2935 50%, #283E4F 100%)';
    }

    // Mainly clear
    if (wmoCode === 1) {
        return isDaytime
            ? 'linear-gradient(to bottom, #2D5F7E 0%, #4A7D9A 50%, #5E8FAD 100%)'
            : 'linear-gradient(to bottom, #0F1923 0%, #1E2F3E 50%, #2D4356 100%)';
    }

    // Partly cloudy
    if (wmoCode === 2) {
        return isDaytime
            ? 'linear-gradient(to bottom, #36697F 0%, #4F7D92 50%, #6291A5 100%)'
            : 'linear-gradient(to bottom, #151F2B 0%, #243447 50%, #354858 100%)';
    }

    // Overcast
    if (wmoCode === 3) {
        return 'linear-gradient(to bottom, #3A4855 0%, #4F5D6A 50%, #63707D 100%)';
    }

    // Fog
    if (wmoCode === 45 || wmoCode === 48) {
        return 'linear-gradient(to bottom, #555E68 0%, #6B7680 50%, #7F8A94 100%)';
    }

    // Drizzle
    if ([51, 53, 55, 56, 57].includes(wmoCode)) {
        return isDaytime
            ? 'linear-gradient(to bottom, #3F5562 0%, #536874 50%, #657B87 100%)'
            : 'linear-gradient(to bottom, #1A2129 0%, #2A363F 50%, #374450 100%)';
    }

    // Rain
    if ([61, 63, 65, 66, 67, 80, 81, 82].includes(wmoCode)) {
        return isDaytime
            ? 'linear-gradient(to bottom, #3B4F5C 0%, #4F626F 50%, #617582 100%)'
            : 'linear-gradient(to bottom, #151D25 0%, #232E38 50%, #2F3E4A 100%)';
    }

    // Snow
    if ([71, 73, 75, 77, 85, 86].includes(wmoCode)) {
        return isDaytime
            ? 'linear-gradient(to bottom, #5A6D7A 0%, #738591 50%, #8A9CA8 100%)'
            : 'linear-gradient(to bottom, #293643 0%, #3D4E5C 50%, #4F6372 100%)';
    }

    // Thunderstorm
    if ([95, 96, 99].includes(wmoCode)) {
        return isDaytime
            ? 'linear-gradient(to bottom, #2A2E33 0%, #3D4349 50%, #4F565C 100%)'
            : 'linear-gradient(to bottom, #0A0D10 0%, #151A1F 50%, #1F262C 100%)';
    }

    // Default gradient (dark mode friendly)
    return 'linear-gradient(to bottom, #1a2634 0%, #2d3e50 50%, #3a4e61 100%)';
}
