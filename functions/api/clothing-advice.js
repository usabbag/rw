// Cloudflare Pages Function for secure OpenRouter API calls
export async function onRequestPost(context) {
    const { request, env } = context;

    // CORS headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle preflight
    if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const { weatherData, location } = await request.json();

        // Get API key from environment variable
        const apiKey = env.OPENROUTER_API_KEY;

        if (!apiKey) {
            return new Response(JSON.stringify({ error: 'API key not configured' }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // System prompt for clothing advice
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

        // Call OpenRouter API with streaming
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': request.headers.get('origin') || 'https://relative-weather.pages.dev',
                'X-Title': 'Relative Weather App'
            },
            body: JSON.stringify({
                model: 'anthropic/claude-haiku-4.5',
                messages: [
                    {
                        role: 'user',
                        content: systemPrompt
                    }
                ],
                stream: true
            })
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('OpenRouter API error:', response.status, error);
            return new Response(JSON.stringify({ error: 'AI service unavailable' }), {
                status: response.status,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Return streaming response
        return new Response(response.body, {
            headers: {
                ...corsHeaders,
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
            }
        });

    } catch (error) {
        console.error('Function error:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}
