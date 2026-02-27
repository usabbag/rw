// No longer need to import API keys - handled server-side

// Get perception label based on temperature difference
export function getPerceptionLabel(diff) {
    const absDiff = Math.abs(diff);

    if (absDiff === 0) {
        return 'About the same';
    } else if (absDiff <= 2) {
        return diff > 0 ? 'Slightly warmer' : 'Slightly cooler';
    } else if (absDiff <= 5) {
        return diff > 0 ? 'Noticeably warmer' : 'Noticeably cooler';
    } else if (absDiff <= 10) {
        return diff > 0 ? 'Much warmer' : 'Much colder';
    } else {
        return diff > 0 ? 'Significantly warmer' : 'Significantly colder';
    }
}

// Format weather data for AI prompt
function formatWeatherDataForAI(current, yesterday) {
    const currentExt = current.extended || {};
    const yesterdayExt = yesterday.extended || {};

    return `## Today's Weather
- Temperature: ${Math.round(current.main.temp)}°C
- Feels like: ${currentExt.apparent_temperature ? Math.round(currentExt.apparent_temperature) + '°C' : 'N/A'}
- Conditions: ${current.weather[0].description}
- Humidity: ${currentExt.humidity ? currentExt.humidity + '%' : 'N/A'}
- Wind: ${currentExt.wind_speed ? Math.round(currentExt.wind_speed) + ' km/h' : 'N/A'}${currentExt.wind_gusts ? ' (gusts: ' + Math.round(currentExt.wind_gusts) + ' km/h)' : ''}
- Cloud cover: ${currentExt.cloud_cover !== undefined ? currentExt.cloud_cover + '%' : 'N/A'}
- Precipitation: ${currentExt.precipitation !== undefined ? currentExt.precipitation + ' mm' : 'N/A'}
- UV index: ${currentExt.uv_index !== undefined ? currentExt.uv_index : 'N/A'}
- Dew point: ${currentExt.dew_point !== undefined ? Math.round(currentExt.dew_point) + '°C' : 'N/A'}
- Today's range: ${currentExt.temp_min ? Math.round(currentExt.temp_min) : 'N/A'}°C to ${currentExt.temp_max ? Math.round(currentExt.temp_max) : 'N/A'}°C

## Yesterday's Weather (same time)
- Temperature: ${Math.round(yesterday.main.temp)}°C
- Feels like: ${yesterdayExt.apparent_temperature ? Math.round(yesterdayExt.apparent_temperature) + '°C' : 'N/A'}
- Conditions: ${yesterday.weather[0].description}
- Humidity: ${yesterdayExt.humidity ? yesterdayExt.humidity + '%' : 'N/A'}
- Wind: ${yesterdayExt.wind_speed ? Math.round(yesterdayExt.wind_speed) + ' km/h' : 'N/A'}${yesterdayExt.wind_gusts ? ' (gusts: ' + Math.round(yesterdayExt.wind_gusts) + ' km/h)' : ''}
- Cloud cover: ${yesterdayExt.cloud_cover !== undefined ? yesterdayExt.cloud_cover + '%' : 'N/A'}
- Precipitation: ${yesterdayExt.precipitation !== undefined ? yesterdayExt.precipitation + ' mm' : 'N/A'}
- Dew point: ${yesterdayExt.dew_point !== undefined ? Math.round(yesterdayExt.dew_point) + '°C' : 'N/A'}
- Yesterday's range: ${yesterdayExt.temp_min ? Math.round(yesterdayExt.temp_min) : 'N/A'}°C to ${yesterdayExt.temp_max ? Math.round(yesterdayExt.temp_max) : 'N/A'}°C

## Temperature Change
${Math.round(current.main.temp - yesterday.main.temp) > 0 ? '+' : ''}${Math.round(current.main.temp - yesterday.main.temp)}°C from yesterday${current.airQuality ? `

## Air Quality
- US AQI: ${current.airQuality.aqi} (${getAqiLevelLabel(current.airQuality.aqi)})
- PM2.5: ${current.airQuality.pm25} µg/m³
- PM10: ${current.airQuality.pm10} µg/m³` : ''}`;
}

function getAqiLevelLabel(aqi) {
    if (aqi <= 50) return 'Good';
    if (aqi <= 100) return 'Moderate';
    if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
    if (aqi <= 200) return 'Unhealthy';
    if (aqi <= 300) return 'Very Unhealthy';
    return 'Hazardous';
}

// Call serverless function for AI-generated clothing advice with streaming support
async function getAIClothingAdvice(current, yesterday, location, onStream) {
    const weatherData = formatWeatherDataForAI(current, yesterday);

    try {
        const response = await fetch('/api/clothing-advice', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                weatherData,
                location
            })
        });

        if (!response.ok) {
            console.error('Clothing advice API error:', response.status);
            return null;
        }

        // Handle streaming response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let buffer = ''; // Buffer for incomplete lines

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk; // Add to buffer
            const lines = buffer.split('\n');

            // Keep the last incomplete line in buffer
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6).trim();

                    // Skip [DONE] message
                    if (data === '[DONE]') continue;

                    try {
                        const parsed = JSON.parse(data);
                        const content = parsed.choices?.[0]?.delta?.content;

                        if (content) {
                            fullText += content;
                            // Call streaming callback with accumulated text
                            if (onStream) {
                                onStream(fullText);
                            }
                        }
                    } catch (e) {
                        // Ignore parse errors for comments or incomplete JSON
                        console.debug('SSE parse error:', e.message, 'Line:', line);
                    }
                }
            }
        }

        return fullText || null;
    } catch (error) {
        console.error('Error calling clothing advice API:', error);
        return null;
    }
}

// Get contextual suggestion based on weather comparison
// Now with AI-powered suggestions via OpenRouter API with streaming support
export async function getContextualSuggestion(current, yesterday, location, onStream) {
    // Try to get AI-generated advice first with streaming
    const aiAdvice = await getAIClothingAdvice(current, yesterday, location, onStream);

    if (aiAdvice) {
        return aiAdvice;
    }

    // Fallback to rule-based suggestions if AI is not available
    const diff = current.main.temp - yesterday.main.temp;
    const absDiff = Math.abs(diff);

    let fallbackMessage = '';
    if (absDiff === 0) {
        fallbackMessage = 'Dress the same as you did yesterday';
    } else if (diff > 0) {
        if (absDiff <= 3) {
            fallbackMessage = 'You can dress slightly lighter than yesterday';
        } else if (absDiff <= 7) {
            fallbackMessage = 'Leave the heavy jacket at home today';
        } else {
            fallbackMessage = 'Dress much lighter than yesterday';
        }
    } else {
        if (absDiff <= 3) {
            fallbackMessage = 'Bring a light layer just in case';
        } else if (absDiff <= 7) {
            fallbackMessage = 'Dress warmer than you did yesterday';
        } else {
            fallbackMessage = 'Bundle up - it\'s much colder than yesterday';
        }
    }

    // Call the stream callback with fallback message
    if (onStream) {
        onStream(fallbackMessage);
    }

    return fallbackMessage;
}
