// Rain forecast visualization - Timeline Segments (fixed 15-min intervals)
import { getRainIntensity } from './rain.js';

const RAIN_THRESHOLD = 0.1; // mm/h

// Fixed 15-minute intervals
const INTERVALS = [
    { startMin: 0, endMin: 15 },
    { startMin: 15, endMin: 30 },
    { startMin: 30, endMin: 45 },
    { startMin: 45, endMin: 60 }
];

/**
 * Analyze a 15-minute window and return its dominant intensity + description
 */
function analyzeInterval(forecast, startMin, endMin, prevIntensity) {
    const slice = forecast.slice(startMin, Math.min(endMin, forecast.length));
    if (slice.length === 0) return { intensity: 'dry', avgRate: 0, description: 'No data' };

    const rates = slice.map(d => d?.precipRate || 0);
    const avgRate = rates.reduce((a, b) => a + b, 0) / rates.length;
    const maxRate = Math.max(...rates);
    const rainyMinutes = rates.filter(r => r > RAIN_THRESHOLD).length;
    const intensity = getRainIntensity(avgRate);

    let description;
    if (rainyMinutes === 0) {
        if (prevIntensity && prevIntensity !== 'dry') {
            description = 'Clearing up';
        } else {
            description = 'Dry';
        }
    } else if (intensity === 'light') {
        if (!prevIntensity || prevIntensity === 'dry') {
            description = 'Light rain starting';
        } else {
            description = 'Light rain';
        }
    } else if (intensity === 'moderate') {
        description = 'Moderate rain';
    } else if (intensity === 'heavy') {
        description = 'Heavy rain';
    } else {
        description = 'Dry';
    }

    return { intensity, avgRate, maxRate, description };
}

/**
 * Format minute offset as time range label
 */
function formatMinuteRange(startMin, endMin) {
    if (startMin === 0) {
        return `Now \u2013 ${endMin}m`;
    }
    return `${startMin} \u2013 ${endMin}m`;
}

/**
 * Display rain forecast as 4 fixed 15-minute timeline segments
 */
export function displayRainSegments(rainData, timezone = null) {
    const container = document.getElementById('rainForecast');
    if (!container) return;

    if (!rainData || !rainData.forecast || rainData.forecast.length === 0) {
        container.classList.add('hidden');
        return;
    }

    const forecast = rainData.forecast.slice(0, 60);

    // Check if any rain at all in the next hour
    const hasAnyRain = forecast.some(d => (d?.precipRate || 0) > RAIN_THRESHOLD);
    if (!hasAnyRain) {
        container.classList.add('hidden');
        return;
    }

    // Build 4 segments
    let html = '';
    let prevIntensity = null;

    INTERVALS.forEach(({ startMin, endMin }) => {
        const analysis = analyzeInterval(forecast, startMin, endMin, prevIntensity);
        prevIntensity = analysis.intensity;

        const timeLabel = formatMinuteRange(startMin, endMin);

        // Bar fill based on average rate
        let fillWidth = 0;
        let fillColor = 'transparent';
        if (analysis.intensity === 'light') {
            fillWidth = 40;
            fillColor = '#5B9AE6';
        } else if (analysis.intensity === 'moderate') {
            fillWidth = 75;
            fillColor = '#5B9AE6';
        } else if (analysis.intensity === 'heavy') {
            fillWidth = 100;
            fillColor = '#5B9AE6';
        }

        const intensityClass = (analysis.intensity === 'moderate' || analysis.intensity === 'heavy') ? analysis.intensity : '';

        html += `
            <div class="rain-segment">
                <span class="rain-time">${timeLabel}</span>
                <div class="rain-intensity-bar">
                    <div class="rain-intensity-fill" style="width: ${fillWidth}%; background-color: ${fillColor};"></div>
                </div>
                <span class="rain-description ${intensityClass}">${analysis.description}</span>
            </div>
        `;
    });

    container.innerHTML = html;
    container.classList.remove('hidden');
}

// Alias for backward compatibility
export const displayRainChart = displayRainSegments;

/**
 * Show loading state
 */
export function showRainLoading() {
    const container = document.getElementById('rainForecast');
    if (!container) return;
    container.innerHTML = '<div class="loading-rain">Loading rain forecast...</div>';
    container.classList.remove('hidden');
}

/**
 * Hide rain forecast
 */
export function hideRainChart() {
    const container = document.getElementById('rainForecast');
    if (!container) return;
    container.classList.add('hidden');
    container.innerHTML = '';
}
