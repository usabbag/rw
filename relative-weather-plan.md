# Relative Weather Implementation Plan

## Project Overview
Build a simple web application that displays current weather compared to yesterday's weather at the same time, helping users understand relative temperature changes.

## Technical Stack
- **Frontend**: Vanilla HTML, CSS, JavaScript
- **API**: OpenWeatherMap API
- **Hosting**: Static files (can be hosted on GitHub Pages, Netlify, etc.)

## Phase 1: Setup and Planning (30 minutes)

### 1.1 Project Structure
```
relative-weather/
├── index.html
├── style.css
├── script.js
└── README.md
```

### 1.2 OpenWeatherMap Setup
- Sign up for free account at https://openweathermap.org/api
- Get API key (free tier allows 1,000 calls/day)
- Review API documentation for:
  - Current Weather Data API
  - Historical Weather Data API (One Call API 3.0)

### 1.3 API Considerations
- Free tier limitations: Historical data might require paid subscription
- Alternative: Store yesterday's data in localStorage (update daily)
- Fallback: Use forecast API to show temperature trends

## Phase 2: HTML Structure (30 minutes)

### 2.1 Basic Layout
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Relative Weather</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="container">
        <header>
            <h1>Relative Weather</h1>
            <p>How does today feel compared to yesterday?</p>
        </header>
        
        <div class="search-section">
            <input type="text" id="cityInput" placeholder="Enter city name...">
            <button id="searchBtn">Get Weather</button>
        </div>
        
        <div id="weatherDisplay" class="weather-display hidden">
            <h2 id="cityName"></h2>
            <div class="weather-comparison">
                <div class="weather-card today">
                    <h3>Today</h3>
                    <p class="temperature" id="currentTemp"></p>
                    <p class="description" id="currentDesc"></p>
                </div>
                <div class="comparison-arrow">
                    <span id="tempDifference"></span>
                </div>
                <div class="weather-card yesterday">
                    <h3>Yesterday</h3>
                    <p class="temperature" id="yesterdayTemp"></p>
                    <p class="description" id="yesterdayDesc"></p>
                </div>
            </div>
        </div>
        
        <div id="errorMessage" class="error hidden"></div>
    </div>
    <script src="script.js"></script>
</body>
</html>
```

## Phase 3: CSS Styling (45 minutes)

### 3.1 Design Principles
- Clean, minimal interface
- Mobile-responsive
- Clear visual hierarchy
- Temperature difference prominently displayed

### 3.2 Key Styles
```css
/* Basic reset and typography */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
}

.container {
    background: white;
    border-radius: 20px;
    padding: 2rem;
    box-shadow: 0 20px 40px rgba(0,0,0,0.1);
    max-width: 600px;
    width: 90%;
}

/* Search section */
.search-section {
    display: flex;
    gap: 1rem;
    margin: 2rem 0;
}

#cityInput {
    flex: 1;
    padding: 0.75rem;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    font-size: 1rem;
}

#searchBtn {
    padding: 0.75rem 1.5rem;
    background: #667eea;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 600;
}

/* Weather display */
.weather-comparison {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: 1rem;
    align-items: center;
}

.weather-card {
    text-align: center;
    padding: 1.5rem;
    background: #f7f7f7;
    border-radius: 12px;
}

.temperature {
    font-size: 2.5rem;
    font-weight: 700;
    color: #333;
}

.comparison-arrow {
    font-size: 1.5rem;
    font-weight: 600;
    color: #667eea;
}

/* Utility classes */
.hidden {
    display: none;
}

.error {
    background: #fee;
    color: #c33;
    padding: 1rem;
    border-radius: 8px;
    margin-top: 1rem;
}
```

## Phase 4: JavaScript Implementation (2 hours)

### 4.1 Core Functionality
```javascript
// Configuration
const API_KEY = 'YOUR_API_KEY_HERE';
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

// DOM elements
const cityInput = document.getElementById('cityInput');
const searchBtn = document.getElementById('searchBtn');
const weatherDisplay = document.getElementById('weatherDisplay');
const errorMessage = document.getElementById('errorMessage');

// Event listeners
searchBtn.addEventListener('click', handleSearch);
cityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch();
});

// Main search handler
async function handleSearch() {
    const city = cityInput.value.trim();
    if (!city) return;
    
    showLoading();
    hideError();
    
    try {
        const currentWeather = await getCurrentWeather(city);
        const yesterdayWeather = await getYesterdayWeather(city, currentWeather.coord);
        displayWeatherComparison(currentWeather, yesterdayWeather);
    } catch (error) {
        showError(error.message);
    }
}

// API calls
async function getCurrentWeather(city) {
    const response = await fetch(
        `${BASE_URL}/weather?q=${city}&appid=${API_KEY}&units=metric`
    );
    
    if (!response.ok) {
        throw new Error('City not found');
    }
    
    return response.json();
}

async function getYesterdayWeather(city, coordinates) {
    // Option 1: Use stored data from localStorage
    const stored = getStoredWeather(city);
    if (stored && isYesterday(stored.timestamp)) {
        return stored.data;
    }
    
    // Option 2: Mock yesterday's data (if no historical API access)
    // In reality, you'd need OpenWeather One Call API 3.0 for historical data
    return mockYesterdayWeather();
}

// Display functions
function displayWeatherComparison(current, yesterday) {
    // Update city name
    document.getElementById('cityName').textContent = current.name;
    
    // Update temperatures
    const currentTemp = Math.round(current.main.temp);
    const yesterdayTemp = Math.round(yesterday.main.temp);
    
    document.getElementById('currentTemp').textContent = `${currentTemp}°C`;
    document.getElementById('yesterdayTemp').textContent = `${yesterdayTemp}°C`;
    
    // Update descriptions
    document.getElementById('currentDesc').textContent = current.weather[0].description;
    document.getElementById('yesterdayDesc').textContent = yesterday.weather[0].description;
    
    // Calculate and display difference
    const diff = currentTemp - yesterdayTemp;
    const diffText = diff > 0 ? `+${diff}°C` : `${diff}°C`;
    const diffDescription = diff > 0 ? 'warmer' : diff < 0 ? 'colder' : 'same';
    
    document.getElementById('tempDifference').textContent = 
        `${diffText} ${diffDescription} than yesterday`;
    
    // Show weather display
    weatherDisplay.classList.remove('hidden');
}

// Helper functions
function showLoading() {
    searchBtn.textContent = 'Loading...';
    searchBtn.disabled = true;
}

function hideLoading() {
    searchBtn.textContent = 'Get Weather';
    searchBtn.disabled = false;
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
    hideLoading();
}

function hideError() {
    errorMessage.classList.add('hidden');
}
```

### 4.2 Data Storage Strategy
Since OpenWeatherMap's free tier doesn't include historical data:

```javascript
// localStorage solution
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

function isYesterday(timestamp) {
    const stored = new Date(timestamp);
    const now = new Date();
    const diffTime = now - stored;
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays >= 1 && diffDays < 2;
}
```

## Phase 5: Enhancements (1 hour)

### 5.1 Visual Indicators
- Color-code temperature difference (red for warmer, blue for colder)
- Add weather icons
- Animate temperature comparison

### 5.2 Additional Features
```javascript
// Recent searches
function saveRecentSearch(city) {
    let recent = JSON.parse(localStorage.getItem('recentSearches') || '[]');
    recent = [city, ...recent.filter(c => c !== city)].slice(0, 5);
    localStorage.setItem('recentSearches', JSON.stringify(recent));
}

// Geolocation
function getCurrentLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => {
                const { latitude, longitude } = position.coords;
                fetchWeatherByCoords(latitude, longitude);
            },
            error => showError('Location access denied')
        );
    }
}

// Time display
function formatTime(timestamp) {
    return new Date(timestamp * 1000).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit'
    });
}
```

## Phase 6: Testing and Deployment (30 minutes)

### 6.1 Testing Checklist
- [ ] Valid city names return correct data
- [ ] Invalid city names show appropriate error
- [ ] Enter key triggers search
- [ ] Mobile responsive design
- [ ] Loading states work correctly
- [ ] Error messages clear properly
- [ ] localStorage data persists correctly

### 6.2 Edge Cases
- Cities with same names (add country code support)
- Non-English city names
- Network errors
- API rate limits
- Missing weather data fields

### 6.3 Deployment Options
1. **GitHub Pages** (free, easy)
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin [your-repo-url]
   git push -u origin main
   # Enable GitHub Pages in settings
   ```

2. **Netlify** (free, automatic deploys)
   - Drag and drop folder to Netlify
   - Set up continuous deployment from GitHub

3. **Vercel** (free, great for static sites)
   - Import GitHub repository
   - Deploy automatically

## Phase 7: Future Improvements

### 7.1 Premium Features (with paid API)
- Actual historical weather data
- Hourly comparisons
- Weekly trends
- Weather alerts

### 7.2 UI/UX Enhancements
- Dark mode
- Multiple city comparisons
- Weather graphs/charts
- Clothing recommendations
- "Feels like" temperature

### 7.3 Technical Improvements
- Service worker for offline access
- Progressive Web App (PWA)
- Weather data caching strategy
- Error retry logic
- Loading skeletons

## Time Estimate
- **Total Development Time**: 4-5 hours
- **MVP (basic functionality)**: 2-3 hours
- **Polish and enhancements**: 1-2 hours

## Notes for Implementation
1. Start with MVP - just show temperature comparison
2. API key should be hidden in production (use environment variables or backend proxy)
3. Consider API limitations early - design around them
4. Test on mobile devices throughout development
5. Keep the interface simple and focused on the core value proposition