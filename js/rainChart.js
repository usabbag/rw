// Rain chart visualization module
import { generateRainSummary, calculateRainChance } from './rain.js';

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

    // Find max precipitation for height scaling
    const maxPrecip = Math.max(...sampledData.map(d => d.precipRate || 0), 0.5);

    // Define absolute intensity scale for color mapping (mm/h)
    const INTENSITY_SCALE_MAX = 15; // Maximum for color scale

    // Generate chart HTML
    const chartHTML = `
        <div class="rain-forecast">
            <div class="rain-header">
                <h3>${summary}</h3>
                <div class="rain-chance">${rainChance}% chance</div>
            </div>

            <div class="rain-tooltip hidden" id="rainTooltip"></div>

            <div class="rain-chart">
                ${sampledData.map((data, index) => {
                    const precipRate = data.precipRate || 0;
                    const hasRain = precipRate > RAIN_THRESHOLD;
                    const heightPercent = maxPrecip > 0 ? (precipRate / maxPrecip) * 100 : 0;

                    // Calculate absolute intensity (0-1 scale) based on absolute precipitation rate
                    // This ensures dark blue always means "heavy rain" regardless of context
                    let absoluteIntensity = 0;
                    if (hasRain) {
                        absoluteIntensity = Math.min(precipRate / INTENSITY_SCALE_MAX, 1);
                    }

                    // Generate gradient colors based on absolute intensity
                    // Light blue (168, 216, 255) for light rain -> Dark blue (44, 107, 179) for heavy rain
                    const lightColor = { r: 168, g: 216, b: 255 };
                    const darkColor = { r: 44, g: 107, b: 179 };

                    const r = Math.round(lightColor.r + (darkColor.r - lightColor.r) * absoluteIntensity);
                    const g = Math.round(lightColor.g + (darkColor.g - lightColor.g) * absoluteIntensity);
                    const b = Math.round(lightColor.b + (darkColor.b - lightColor.b) * absoluteIntensity);

                    const gradientColor = `linear-gradient(to top, rgb(${r}, ${g}, ${b}), rgb(${Math.min(r + 20, 255)}, ${Math.min(g + 20, 255)}, ${Math.min(b + 20, 255)}))`;
                    const noRainColor = '#e5e5e5';

                    // Format time
                    const timestamp = data.timestampBegin;
                    const time = formatTimeForChart(timestamp, timezone);

                    return `
                        <div class="rain-bar">
                            <div
                                class="bar ${hasRain ? 'has-rain' : ''}"
                                style="height: ${Math.max(heightPercent, 2)}%; background: ${hasRain ? gradientColor : noRainColor};"
                                data-precip="${precipRate.toFixed(1)}"
                                data-time="${time}"
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

    // Add tooltip event listeners
    attachTooltipListeners();
}

/**
 * Attach tooltip event listeners to rain bars
 */
function attachTooltipListeners() {
    const tooltip = document.getElementById('rainTooltip');
    const bars = document.querySelectorAll('.rain-bar .bar');

    if (!tooltip || !bars.length) return;

    bars.forEach(bar => {
        // Desktop: hover
        bar.addEventListener('mouseenter', (e) => {
            showTooltip(e.target, tooltip);
        });

        bar.addEventListener('mouseleave', () => {
            hideTooltip(tooltip);
        });

        // Mobile: tap
        bar.addEventListener('click', (e) => {
            e.stopPropagation();
            showTooltip(e.target, tooltip);
        });
    });

    // Hide tooltip when clicking outside
    document.addEventListener('click', () => {
        hideTooltip(tooltip);
    });
}

/**
 * Show tooltip with precipitation data
 */
function showTooltip(bar, tooltip) {
    const precip = bar.getAttribute('data-precip');
    const time = bar.getAttribute('data-time');

    if (!precip || !time) return;

    // Format display text
    const precipValue = parseFloat(precip);
    let displayText;
    if (precipValue === 0) {
        displayText = `${time}<br><strong>No rain</strong>`;
    } else {
        displayText = `${time}<br><strong>${precip} mm/h</strong>`;
    }

    tooltip.innerHTML = displayText;
    tooltip.classList.remove('hidden');

    // Position tooltip above the bar
    const barRect = bar.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const chartContainer = bar.closest('.rain-forecast');
    const chartRect = chartContainer.getBoundingClientRect();

    // Calculate position relative to chart container
    const left = barRect.left - chartRect.left + (barRect.width / 2) - (tooltipRect.width / 2);
    const top = barRect.top - chartRect.top - tooltipRect.height - 8;

    tooltip.style.left = `${Math.max(10, Math.min(left, chartRect.width - tooltipRect.width - 10))}px`;
    tooltip.style.top = `${Math.max(10, top)}px`;
}

/**
 * Hide tooltip
 */
function hideTooltip(tooltip) {
    if (tooltip) {
        tooltip.classList.add('hidden');
    }
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
