# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Relative Weather App** is a modular JavaScript web application that compares current weather with yesterday's weather at the same time. It helps users understand relative temperature changes rather than absolute values.

**Design Philosophy**: Inverted information hierarchy - the temperature *difference* is the hero element, with actual temperatures as supporting details. Features AI-powered clothing suggestions, real-time rain forecasts, and autocomplete city search.

## Architecture

### Technology Stack
- **Frontend**: Modular vanilla JavaScript (ES6 modules) - no build system required
- **Weather API**: [Open-Meteo](https://open-meteo.com) - free, no API key required
- **AI Integration**: OpenRouter API via Cloudflare Pages Functions (streaming responses)
- **Rain Forecasting**: Rainbow.ai API via Cloudflare Pages Functions
- **Deployment**: Cloudflare Pages with serverless functions

### Modular Code Structure

The application is organized into **7 specialized JavaScript modules**:

1. **`js/main.js`** - Application entry point and event handlers
   - Initializes the app on DOM load
   - Handles search, geolocation, and autocomplete events
   - Coordinates between all modules
   - Includes debounce helper for autocomplete (300ms delay)

2. **`js/api.js`** - All weather API interactions
   - Open-Meteo integration (geocoding, current, historical)
   - `fetchWithRetry()` - exponential backoff retry logic (3 attempts)
   - `getCurrentWeather()` - fetches current conditions + extended data for AI
   - `getYesterdayWeather()` - fetches historical data from archive API
   - `getCityCoordinates()` - geocoding with disambiguation support
   - `fetchCitySuggestions()` - autocomplete suggestions
   - Extended weather parameters for AI analysis (apparent temp, humidity, wind, UV, etc.)

3. **`js/weather.js`** - Weather code translations
   - `WMO_WEATHER_CODES` mapping object (WMO codes → readable descriptions)
   - `getWeatherDescription()` - converts numeric codes to text

4. **`js/ui.js`** - All DOM manipulation and display logic
   - Element references (`elements` object)
   - Loading states, error handling, suggestions display
   - `displayWeatherComparison()` - main display logic with streaming AI suggestions
   - `showCityDisambiguation()` - Promise-based city selection UI
   - `formatTime()` - timezone-aware time formatting
   - Rain forecast display integration

5. **`js/perception.js`** - AI-powered clothing advice (formerly rule-based)
   - `getContextualSuggestion()` - orchestrates AI suggestions with fallback
   - `getAIClothingAdvice()` - calls serverless function with streaming support
   - `formatWeatherDataForAI()` - formats extended weather data for AI prompt
   - Fallback to rule-based suggestions if API unavailable
   - **Streaming support**: callbacks for real-time text display

6. **`js/storage.js`** - LocalStorage management
   - Recent search persistence (max 5 cities)
   - `saveRecentSearch()`, `getRecentSearches()`

7. **`js/rain.js` & `js/rainChart.js`** - Rain forecast functionality
   - Calls `/api/rain-forecast` serverless function
   - Displays minute-by-minute precipitation chart for next hour
   - Uses Rainbow.ai API for nowcast data

### Serverless Functions (Cloudflare Pages Functions)

Located in `functions/api/`:

1. **`clothing-advice.js`** - AI clothing suggestions endpoint
   - Accepts weather data + location
   - Calls OpenRouter API with streaming (anthropic/claude-haiku-4.5)
   - Returns Server-Sent Events (SSE) stream
   - Requires `OPENROUTER_API_KEY` environment variable
   - **Important**: Buffers incomplete SSE lines to prevent truncation

2. **`rain-forecast.js`** - Rain forecast proxy endpoint
   - Accepts lat/lon coordinates
   - Calls Rainbow.ai nowcast API (note: **lon/lat order**)
   - Requires `RAINBOW_API_KEY` environment variable
   - Header: `Ocp-Apim-Subscription-Key` (Azure standard)

## Local Development

### Running Locally Without Serverless Functions
```bash
# Simply open index.html in a browser
open index.html
# OR
python3 -m http.server 8000  # Then visit http://localhost:8000
```

**Note**: AI clothing advice and rain forecasts require serverless functions (won't work with simple file:///)

### Running Locally WITH Serverless Functions
```bash
# Install Wrangler CLI if not already installed
npm install -g wrangler

# Create .dev.vars file with API keys
cat > .dev.vars << EOF
OPENROUTER_API_KEY=your-key-here
RAINBOW_API_KEY=your-key-here
EOF

# Run local dev server
wrangler pages dev .

# Visit http://localhost:8788
```

## Deployment

### Cloudflare Pages (Recommended)

The app uses Cloudflare Pages Functions for serverless API proxying.

**Environment Variables Required:**
- `OPENROUTER_API_KEY` - Get from https://openrouter.ai/keys
- `RAINBOW_API_KEY` - Sign up at https://developer.rainbow.ai/

**Setup Steps:**
1. Connect repo to Cloudflare Pages
2. Add environment variables in Settings → Environment variables
3. Deploy automatically via git push

See `DEPLOYMENT.md` for detailed setup instructions.

### Alternative Static Hosting

For basic functionality without AI/rain features, deploy to any static host:
- GitHub Pages
- Netlify
- Vercel

Just deploy the repository - no build step required.

## Common Development Tasks

### Adding New Weather Parameters

To extend weather data collection:

1. **Update API request** in `js/api.js`:
   ```javascript
   const CURRENT_PARAMS = [
     'temperature_2m',
     'weather_code',
     'your_new_parameter'  // Add here
   ].join(',');
   ```

2. **Add to response mapping** in `getCurrentWeather()` or `getYesterdayWeather()`:
   ```javascript
   extended: {
     your_new_parameter: data.current.your_new_parameter
   }
   ```

3. **Use in UI** via `current.extended.your_new_parameter` or `yesterday.extended.your_new_parameter`

### Modifying AI Prompt

Edit the system prompt in `functions/api/clothing-advice.js` (lines 38-85). The prompt uses structured analysis with specific output requirements.

### Adjusting Autocomplete Behavior

Modify debounce delay in `js/main.js:166`:
```javascript
const debouncedFetchSuggestions = debounce(handleAutocompleteInput, 300); // Change 300ms
```

### Changing Temperature Units

Add `&temperature_unit=fahrenheit` to API URLs in `js/config.js` (if that file exists) or directly in `js/api.js` fetch calls.

## Key Implementation Details

### Streaming AI Response Handling

The `js/perception.js` module implements SSE streaming with a critical **buffer for incomplete lines**:

```javascript
let buffer = ''; // Buffer for incomplete lines
const lines = buffer.split('\n');
buffer = lines.pop() || ''; // Keep last incomplete line
```

This prevents truncation of Server-Sent Events during streaming.

### City Disambiguation Flow

1. User types city name → `getCurrentWeather()` returns `needsDisambiguation: true`
2. UI shows city selection → returns Promise that resolves with selected coordinates
3. Weather fetched for specific coordinates → bypasses disambiguation

**Autocomplete bypasses disambiguation**: Selecting from dropdown provides exact coordinates immediately.

### Timezone Handling

- `formatTime()` in `js/ui.js` uses location's timezone from Open-Meteo
- Times are displayed in the **searched location's timezone**, not user's local time
- Critical for comparing "same time yesterday"

### Extended Weather Data

AI clothing advice uses **12 additional weather parameters** beyond basic temp/conditions:
- Apparent temperature (feels like)
- Humidity, wind speed/direction/gusts
- Precipitation, pressure, cloud cover
- UV index, dew point
- Daily min/max temperatures

These are fetched in `js/api.js` and passed to the AI prompt formatter in `js/perception.js`.

## Browser Compatibility

- **ES6 Modules**: Required (all modern browsers)
- **Async/Await**: Required
- **Geolocation API**: Requires HTTPS (except localhost)
- **Fetch API & ReadableStream**: For streaming responses
- **LocalStorage**: For recent searches

## Troubleshooting

### AI Suggestions Not Loading
1. Check browser console for errors
2. Verify `OPENROUTER_API_KEY` is set in Cloudflare Pages environment variables
3. Confirm OpenRouter account has credits
4. Check `/api/clothing-advice` endpoint is accessible
5. Rule-based fallback should still work

### Rain Chart Not Displaying
1. Check `RAINBOW_API_KEY` environment variable
2. Rainbow.ai coverage may not include all locations
3. Feature gracefully hides if data unavailable
4. Check browser console for API errors

### Streaming Response Truncation
- **Buffer implementation critical**: See `js/perception.js:84-88`
- SSE messages can arrive split across chunks
- Buffer holds incomplete lines until complete

### City Not Found
- Try alternative spelling or add country (e.g., "Paris, France")
- Very small villages may not be in Open-Meteo's geocoding database
- Use autocomplete suggestions for better results
