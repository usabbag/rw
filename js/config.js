// Configuration - Open-Meteo API (Free for non-commercial use, no API key needed!)
// Documentation: https://open-meteo.com/en/docs
export const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
export const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
export const HISTORICAL_URL = 'https://archive-api.open-meteo.com/v1/archive';

// OpenRouter API is now handled server-side via Cloudflare Pages Functions
// No API key needed in client code - it's stored as an environment variable

// Retry configuration
export const MAX_RETRIES = 3;
export const INITIAL_RETRY_DELAY = 1000; // 1 second
