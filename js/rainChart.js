// Rain chart visualization module
import { getRainIntensity, generateRainSummary, calculateRainChance } from './rain.js';

const RAIN_THRESHOLD = 0.1; // mm/h

/**
 * Display rain forecast chart
 * @param {Object} rainData - Rain forecast data from Rainbow.ai
 * @param {string} timezone - Timezone for time display
 */
export function displayRainChart(rainData, timezone = null) {
    const container = document.getElementById('rainForecast');
    if (!container) return;

    if (!rainData || !rainData.forecast || rainData.forecast.length === 0) {
        container.innerHTML = '<div class="no-rain-data">No rain data available for this location</div>';
        container.classList.remove('hidden');
        return;
    }

    const forecast = rainData.forecast;

    // Take first 60 minutes
    const nextHour = forecast.slice(0, 60);

    // Sample every 5 minutes for display (12 bars for 60 minutes)
    const sampledData = [];
    for (let i = 0; i < nextHour.length; i += 5) {
        sampledData.push(nextHour[i]);
    }

    // Calculate rain chance and summary
    const rainChance = calculateRainChance(nextHour);
    const summary = generateRainSummary(nextHour);

    // Find max precipitation for scaling
    const maxPrecip = Math.max(...sampledData.map(d => d.precipRate || 0), 0.5);

    // Generate chart HTML
    const chartHTML = `
        <div class="rain-forecast">
            <div class="rain-header">
                <h3>${summary}</h3>
                <div class="rain-chance">${rainChance}% chance</div>
            </div>

            <div class="rain-chart">
                ${sampledData.map((data, index) => {
                    const precipRate = data.precipRate || 0;
                    const hasRain = precipRate > RAIN_THRESHOLD;
                    const heightPercent = maxPrecip > 0 ? (precipRate / maxPrecip) * 100 : 0;
                    const intensity = getRainIntensity(precipRate);

                    // Format time
                    const timestamp = data.timestampBegin;
                    const time = formatTimeForChart(timestamp, timezone);

                    return `
                        <div class="rain-bar">
                            <div
                                class="bar ${hasRain ? 'has-rain' : ''} intensity-${intensity}"
                                style="height: ${Math.max(heightPercent, 2)}%"
                                data-precip="${precipRate.toFixed(1)}"
                                data-time="${time}"
                                title="${time}: ${precipRate.toFixed(1)} mm/h"
                            ></div>
                        </div>
                    `;
                }).join('')}
            </div>

            <div class="rain-time-labels">
                ${sampledData.map((data, index) => {
                    const timestamp = data.timestampBegin;
                    const time = formatTimeForChart(timestamp, timezone);
                    const showTime = index % 3 === 0;

                    return `<div class="time-label">${showTime ? time : ''}</div>`;
                }).join('')}
            </div>
        </div>
    `;

    container.innerHTML = chartHTML;
    container.classList.remove('hidden');
}

/**
 * Show loading state for rain chart
 */
export function showRainLoading() {
    const container = document.getElementById('rainForecast');
    if (!container) return;

    container.innerHTML = '<div class="loading-rain">Loading rain forecast...</div>';
    container.classList.remove('hidden');
}

/**
 * Hide rain chart
 */
export function hideRainChart() {
    const container = document.getElementById('rainForecast');
    if (!container) return;

    container.classList.add('hidden');
    container.innerHTML = '';
}

/**
 * Format timestamp for chart display
 * @param {number} timestamp - Unix timestamp
 * @param {string} timezone - Timezone string
 * @returns {string} Formatted time (e.g., "2:30 PM")
 */
function formatTimeForChart(timestamp, timezone = null) {
    const options = {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    };

    if (timezone) {
        options.timeZone = timezone;
    }

    const date = new Date(timestamp * 1000);
    const formatted = date.toLocaleTimeString('en-US', options);

    // Shorten format (remove space, lowercase am/pm)
    return formatted.replace(' ', '').toLowerCase();
}
