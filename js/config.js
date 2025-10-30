// Configuration - Open-Meteo API (Free for non-commercial use, no API key needed!)
// Documentation: https://open-meteo.com/en/docs
export const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
export const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
export const HISTORICAL_URL = 'https://archive-api.open-meteo.com/v1/archive';

// OpenRouter API Configuration for AI-powered clothing advice
// Documentation: https://openrouter.ai/docs
export const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
export const OPENROUTER_MODEL = 'anthropic/claude-haiku-4.5';
// Add your OpenRouter API key here (or leave empty for rule-based suggestions)
// Get your key at: https://openrouter.ai/keys
export const OPENROUTER_API_KEY = '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';

// Retry configuration
export const MAX_RETRIES = 3;
export const INITIAL_RETRY_DELAY = 1000; // 1 second
