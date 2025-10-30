import { OPENROUTER_API_URL, OPENROUTER_MODEL, OPENROUTER_API_KEY } from './config.js';

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
${Math.round(current.main.temp - yesterday.main.temp) > 0 ? '+' : ''}${Math.round(current.main.temp - yesterday.main.temp)}°C from yesterday`;
}

// Call OpenRouter API for AI-generated clothing advice with streaming support
async function getAIClothingAdvice(current, yesterday, location, onStream) {
    // Check if API key is set
    if (!OPENROUTER_API_KEY) {
        console.log('OpenRouter API key not set, using rule-based suggestions');
        return null;
    }

    const weatherData = formatWeatherDataForAI(current, yesterday);

    // System prompt from dresshelp.md
    const systemPrompt = `You are a weather-based clothing advisor that helps people choose what to wear by comparing today's weather conditions with yesterday's weather at the same time. Your goal is to provide practical, nuanced clothing advice that accounts for how weather differences actually feel to humans, not just temperature numbers.

Here is the weather data comparing today and yesterday:

<weather_data>
${weatherData}
</weather_data>

Location: ${location}

Your task is to analyze the weather comparison and provide clothing recommendations that account for human perception of weather changes. Consider these key factors:

**Human Weather Perception Challenges:**
- People often dress based on what they see outside (sunny/cloudy) rather than actual temperature
- Wind makes temperatures feel much colder than they are
- Humidity affects how hot or cold temperatures feel
- Sudden weather changes catch people off guard
- Morning conditions may not reflect afternoon conditions
- People tend to under-dress in transitional seasons
- Layering decisions are often poorly planned

**Analysis Framework:**
1. **Temperature Difference Impact**: Consider not just the numeric difference, but how that translates to comfort. A 3°C difference can feel dramatic depending on the base temperature.

2. **Wind Factor**: Wind significantly affects perceived temperature. Even light wind can make someone feel much colder than expected.

3. **Humidity Considerations**: High humidity makes heat feel oppressive and cold feel more penetrating. Low humidity can make temperatures feel more comfortable.

4. **Weather Condition Changes**: Moving from sunny to cloudy (or vice versa) affects both actual warmth and psychological comfort.

5. **Activity Level**: Consider that people will be walking, commuting, and moving between indoor/outdoor environments.

**Clothing Advice Principles:**
- Be specific about garment types and layering strategies
- Address common mistakes people make in similar conditions
- Consider practical aspects like carrying extra layers
- Be gender-neutral in recommendations
- Account for the transition between different parts of the day
- Mention accessories that make a big difference (scarves, hats, etc.)

Provide exactly 3 sentences following this structure:

Sentence 1: How today compares to yesterday in feel (not numbers).
Sentence 2: Exactly what to wear (specific items, no explanations).
Sentence 3: The main mistake to avoid today.

Keep each sentence under 15 words. Be conversational but direct.
Do NOT include analysis tags or detailed reasoning - just give the actionable advice directly.`;

    try {
        const response = await fetch(OPENROUTER_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': window.location.origin,
                'X-Title': 'Relative Weather App'
            },
            body: JSON.stringify({
                model: OPENROUTER_MODEL,
                messages: [
                    {
                        role: 'user',
                        content: systemPrompt
                    }
                ],
                stream: true // Enable streaming
            })
        });

        if (!response.ok) {
            console.error('OpenRouter API error:', response.status);
            return null;
        }

        // Handle streaming response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);

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
                    }
                }
            }
        }

        return fullText || null;
    } catch (error) {
        console.error('Error calling OpenRouter API:', error);
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
