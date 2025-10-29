# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Relative Weather App** is a vanilla JavaScript web application that compares current weather with yesterday's weather at the same time. It helps users understand relative temperature changes rather than absolute values.

**API**: Uses [Open-Meteo](https://open-meteo.com) - a free, open-source weather API with no key required.

## Architecture

### Single-Page Application Structure
- **No build system**: Pure HTML, CSS, and JavaScript - open `index.html` directly in a browser
- **No frameworks**: Vanilla JavaScript using modern DOM APIs
- **No package manager**: No dependencies to install

### Core Components

1. **API Integration (script.js)**
   - Uses **Open-Meteo API** (free, no API key required)
   - Three API endpoints:
     - **Geocoding**: `geocoding-api.open-meteo.com/v1/search` - city name to coordinates
     - **Current Weather**: `api.open-meteo.com/v1/forecast` - current conditions
     - **Historical Data**: `archive-api.open-meteo.com/v1/archive` - past weather (FREE!)

2. **Weather Code System**
   - Open-Meteo uses WMO Weather Interpretation Codes (standard system)
   - Script includes `WMO_WEATHER_CODES` mapping object (line 9-38)
   - `getWeatherDescription()` converts numeric codes to readable text

3. **Data Storage Strategy**
   - Uses `localStorage` to persist weather data for quick access
   - Stores today's weather for future reference
   - Key pattern: `weather_${city.toLowerCase()}`
   - Recent searches stored in `recentSearches` key (max 5 cities)

4. **Data Source Priority**
   - **First**: Try Open-Meteo historical API (real data from yesterday)
   - **Second**: Check localStorage for data from previous searches
   - **Last resort**: Generate mock data if APIs unavailable

### Key Functions

- `getCityCoordinates(city, allowMultiple)`: Geocodes city using Open-Meteo Geocoding API
- `getCurrentWeather(city)`: Fetches current weather from Forecast API
- `getYesterdayWeather(city, coordinates)`: Gets real historical data from Archive API
- `getWeatherDescription(wmoCode)`: Converts WMO codes to readable weather descriptions
- `displayWeatherComparison()`: Renders side-by-side weather cards with temperature difference
- `storeWeatherData()` / `getStoredWeather()`: localStorage persistence layer

## API Configuration

**No API key needed!** Open-Meteo is completely free for non-commercial use.

### API Endpoints (script.js lines 3-5)
```javascript
const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const HISTORICAL_URL = 'https://archive-api.open-meteo.com/v1/archive';
```

### API Features
- **No rate limits** for reasonable use
- **Historical data included** (80+ years of data)
- **No authentication** required
- **Open source** and transparent

## Testing

**No automated tests exist.** To test manually:

1. **Basic functionality**: Open `index.html` in browser
2. **Search by city**: Enter "London" and verify weather displays
3. **Geolocation**: Click 📍 button (requires HTTPS or localhost)
4. **Recent searches**: Search multiple cities, verify they appear below
5. **LocalStorage**: Search same city on different days to test real comparison
6. **Offline mode**: Disable network to test offline detection

## Deployment

**Static hosting only** - no server required:

```bash
# GitHub Pages - just enable in repo settings
# Netlify - drag and drop the project folder
# Vercel - import repository
```

Files needed for deployment: `index.html`, `style.css`, `script.js`

## Common Modifications

### Change temperature units
Add `&temperature_unit=fahrenheit` to API URLs to get Fahrenheit instead of Celsius.

### Add weather parameters
Open-Meteo Forecast API supports additional variables:
- `relative_humidity_2m` - humidity percentage
- `apparent_temperature` - feels like temperature
- `wind_speed_10m` - wind speed
- `precipitation_probability` - chance of rain

Add to `&current=` parameter, e.g., `&current=temperature_2m,weather_code,relative_humidity_2m`

### Modify temperature difference thresholds
Currently all differences are shown. To add thresholds:
- Edit lines 264-273 in `script.js`
- Add conditional logic (e.g., only show if `Math.abs(diff) > 3`)

### Extend localStorage retention
Function `isFromYesterday()` (line 303) accepts data from 20-36 hours ago. Adjust `diffDays` range to modify this window.

## Browser Compatibility

- **Required**: ES6+ support (async/await, arrow functions, template literals)
- **Geolocation**: Requires HTTPS (except localhost)
- **LocalStorage**: Required for comparisons and recent searches
- **CSS Grid**: Used for responsive layout

## Recent Major Changes

### Migration to Open-Meteo (2025)

**Switched from OpenWeatherMap to Open-Meteo** for several benefits:

1. **No API Key Required**: Zero configuration, works immediately
2. **Free Historical Data**: Real yesterday's weather data (not simulated)
3. **No Rate Limits**: Reasonable use is completely free
4. **Open Source**: Transparent and community-driven

### Existing Features

1. **Retry Logic**: Automatic retry with exponential backoff (up to 3 retries)
   - See `fetchWithRetry()` in script.js:48

2. **City Disambiguation**: Select from multiple matching cities
   - See `showCityDisambiguation()` in script.js:254

3. **Timezone Support**: Times in location's timezone
   - See `formatTime()` in script.js:577

4. **Data Source Transparency**: Color-coded data source indicators
   - Green: Real historical data from Open-Meteo
   - Blue: Stored data from previous searches
   - Orange: Simulated data (only if API unavailable)

## Notes

- **Rain forecast temporarily disabled**: Can be re-enabled using Open-Meteo's `precipitation` parameter
- **WMO Weather Codes**: Uses standard WMO code system instead of proprietary codes
