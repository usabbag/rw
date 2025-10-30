// Rain forecast API module using Rainbow.ai via serverless function

const RAIN_THRESHOLD = 0.1; // mm/h - threshold for considering it "raining"

// Intensity categories (from Rainbow.ai documentation)
export const RAIN_INTENSITY = {
    DRY: 0,
    LIGHT: 2.5,      // < 2.5 mm/h
    MODERATE: 10,    // 2.5-10 mm/h
    HEAVY: Infinity  // > 10 mm/h
};

/**
 * Fetch rain forecast from Rainbow.ai via serverless function
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<Object|null>} Rain forecast data or null on error
 */
export async function getRainForecast(lat, lon) {
    try {
        const response = await fetch('/api/rain-forecast', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ lat, lon })
        });

        if (!response.ok) {
            console.error('Rain forecast API error:', response.status);
            return null;
        }

        const data = await response.json();
        return data;

    } catch (error) {
        console.error('Error fetching rain forecast:', error);
        return null;
    }
}

/**
 * Get rain intensity category
 * @param {number} precipRate - Precipitation rate in mm/h
 * @returns {string} Intensity category
 */
export function getRainIntensity(precipRate) {
    if (precipRate <= RAIN_INTENSITY.DRY) return 'dry';
    if (precipRate < RAIN_INTENSITY.LIGHT) return 'light';
    if (precipRate < RAIN_INTENSITY.MODERATE) return 'moderate';
    return 'heavy';
}

/**
 * Generate DarkSky-style rain summary
 * @param {Array} forecast - Array of precipitation data points
 * @returns {string} Human-readable rain summary
 */
export function generateRainSummary(forecast) {
    if (!forecast || forecast.length === 0) {
        return 'No forecast data available';
    }

    const currentPrecip = forecast[0]?.precipRate || 0;
    const currentRaining = currentPrecip > RAIN_THRESHOLD;

    // Find when rain starts or stops
    for (let i = 0; i < forecast.length; i++) {
        const precip = forecast[i]?.precipRate || 0;
        const isRaining = precip > RAIN_THRESHOLD;

        if (!currentRaining && isRaining) {
            return `Rain starting in ${i} minute${i !== 1 ? 's' : ''}`;
        } else if (currentRaining && !isRaining) {
            return `Rain stopping in ${i} minute${i !== 1 ? 's' : ''}`;
        }
    }

    if (currentRaining) {
        return 'Rain for the next hour';
    } else {
        return 'No rain for the next hour';
    }
}

/**
 * Calculate rain probability for the next hour
 * @param {Array} forecast - Array of precipitation data points
 * @returns {number} Percentage of time it will rain (0-100)
 */
export function calculateRainChance(forecast) {
    if (!forecast || forecast.length === 0) return 0;

    // Take first 60 minutes
    const nextHour = forecast.slice(0, 60);
    const rainingMinutes = nextHour.filter(point =>
        (point?.precipRate || 0) > RAIN_THRESHOLD
    ).length;

    return Math.round((rainingMinutes / nextHour.length) * 100);
}
