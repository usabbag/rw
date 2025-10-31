// Temperature chart display module

export function showTempLoading() {
    const wrapper = document.getElementById('tempForecast');
    wrapper.innerHTML = '<div class="loading-temp">Loading temperature forecast...</div>';
    wrapper.classList.remove('hidden');
}

export function hideTempChart() {
    const wrapper = document.getElementById('tempForecast');
    wrapper.classList.add('hidden');
    wrapper.innerHTML = '';
}

export function displayTempChart(forecastData, timezone) {
    const wrapper = document.getElementById('tempForecast');

    if (!forecastData || !forecastData.today || !forecastData.yesterday) {
        hideTempChart();
        return;
    }

    const { today, yesterday } = forecastData;

    // Create chart HTML structure
    const chartHTML = `
        <div class="temp-forecast">
            <div class="temp-chart-header">
                <div class="temp-chart-title">Next 6 Hours vs. Yesterday</div>
                <div class="temp-chart-legend">
                    <div class="legend-item">
                        <div class="legend-line today"></div>
                        <span>Today</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-line yesterday"></div>
                        <span>Yesterday</span>
                    </div>
                </div>
            </div>
            <div class="temp-chart-container">
                <canvas id="tempCanvas"></canvas>
            </div>
        </div>
    `;

    wrapper.innerHTML = chartHTML;
    wrapper.classList.remove('hidden');

    // Draw the chart
    setTimeout(() => {
        drawTempChart(today, yesterday, timezone);
    }, 0);
}

function drawTempChart(today, yesterday, timezone) {
    const canvas = document.getElementById('tempCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const container = canvas.parentElement;

    // Set canvas size (account for container padding)
    const dpr = window.devicePixelRatio || 1;
    const computedStyle = getComputedStyle(container);
    const paddingX = parseFloat(computedStyle.paddingLeft) + parseFloat(computedStyle.paddingRight);
    const paddingY = parseFloat(computedStyle.paddingTop) + parseFloat(computedStyle.paddingBottom);
    const width = container.clientWidth - paddingX;
    const height = container.clientHeight - paddingY;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.scale(dpr, dpr);
    const padding = { top: 20, right: 20, bottom: 40, left: 40 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Combine all temperatures to find min/max
    const allTemps = [...today.temperatures, ...yesterday.temperatures];
    const minTemp = Math.min(...allTemps);
    const maxTemp = Math.max(...allTemps);
    const tempRange = maxTemp - minTemp;
    const tempPadding = tempRange * 0.2; // 20% padding

    // Helper function to convert temp to Y coordinate
    const tempToY = (temp) => {
        const normalized = (temp - (minTemp - tempPadding)) / (tempRange + tempPadding * 2);
        return padding.top + chartHeight - (normalized * chartHeight);
    };

    // Helper function to convert index to X coordinate
    const indexToX = (index) => {
        return padding.left + (index / (today.temperatures.length - 1)) * chartWidth;
    };

    // Draw grid lines
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const y = padding.top + (i / 4) * chartHeight;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(padding.left + chartWidth, y);
        ctx.stroke();
    }

    // Draw yesterday's line (dashed)
    ctx.strokeStyle = '#b0b0b0';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    yesterday.temperatures.forEach((temp, i) => {
        const x = indexToX(i);
        const y = tempToY(temp);
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    ctx.stroke();

    // Draw yesterday's points
    ctx.fillStyle = '#b0b0b0';
    yesterday.temperatures.forEach((temp, i) => {
        const x = indexToX(i);
        const y = tempToY(temp);
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
    });

    // Draw today's line (solid)
    ctx.setLineDash([]);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    today.temperatures.forEach((temp, i) => {
        const x = indexToX(i);
        const y = tempToY(temp);
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    ctx.stroke();

    // Draw today's points
    ctx.fillStyle = '#ffffff';
    today.temperatures.forEach((temp, i) => {
        const x = indexToX(i);
        const y = tempToY(temp);
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
    });

    // Draw temperature labels on lines
    ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';

    // Today's temperature labels
    ctx.fillStyle = '#ffffff';
    today.temperatures.forEach((temp, i) => {
        if (i % 2 === 0 || i === today.temperatures.length - 1) { // Show every other label
            const x = indexToX(i);
            const y = tempToY(temp) - 12;
            ctx.fillText(`${Math.round(temp)}°`, x, y);
        }
    });

    // Yesterday's temperature labels
    ctx.fillStyle = '#b0b0b0';
    yesterday.temperatures.forEach((temp, i) => {
        if (i % 2 === 1 && i !== yesterday.temperatures.length - 1) { // Alternate with today
            const x = indexToX(i);
            const y = tempToY(temp) + 18;
            ctx.fillText(`${Math.round(temp)}°`, x, y);
        }
    });

    // Draw time labels on X-axis
    ctx.fillStyle = '#8b8b8b';
    ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    today.times.forEach((time, i) => {
        const x = indexToX(i);
        const y = height - padding.bottom + 20;
        const hour = new Date(time).toLocaleTimeString('en-US', {
            hour: 'numeric',
            hour12: true,
            timeZone: timezone
        });
        ctx.fillText(hour, x, y);
    });

    // Draw Y-axis temperature labels
    ctx.fillStyle = '#8b8b8b';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
        const temp = (minTemp - tempPadding) + ((maxTemp + tempPadding - minTemp + tempPadding) * (4 - i) / 4);
        const y = padding.top + (i / 4) * chartHeight;
        ctx.fillText(`${Math.round(temp)}°`, padding.left - 10, y + 4);
    }
}

// Redraw chart on window resize
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        const canvas = document.getElementById('tempCanvas');
        if (canvas && !document.getElementById('tempForecast').classList.contains('hidden')) {
            // Re-fetch data from DOM or store it globally
            // For now, we'll just keep the existing implementation
            // A more robust solution would store the data
        }
    }, 250);
});
