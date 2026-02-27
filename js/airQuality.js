import { AIR_QUALITY_URL } from './config.js';
import { fetchWithRetry } from './api.js';

export async function getAirQuality(lat, lon) {
    try {
        const response = await fetchWithRetry(
            `${AIR_QUALITY_URL}?latitude=${lat}&longitude=${lon}&current=us_aqi,pm2_5,pm10`
        );

        if (!response.ok) return null;

        const data = await response.json();
        if (!data.current) return null;

        return {
            aqi: data.current.us_aqi,
            pm25: data.current.pm2_5,
            pm10: data.current.pm10
        };
    } catch (error) {
        console.error('Error fetching air quality:', error);
        return null;
    }
}

export function getAqiLevel(aqi) {
    if (aqi <= 50) return { label: 'Good', color: '#34c759' };
    if (aqi <= 100) return { label: 'Moderate', color: '#ffd60a' };
    if (aqi <= 150) return { label: 'Sensitive Groups', color: '#ff9f0a' };
    if (aqi <= 200) return { label: 'Unhealthy', color: '#ff453a' };
    if (aqi <= 300) return { label: 'Very Unhealthy', color: '#bf5af2' };
    return { label: 'Hazardous', color: '#8b0000' };
}
