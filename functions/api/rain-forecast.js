// Cloudflare Pages Function for secure Rainbow.ai API calls
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
        const { lat, lon } = await request.json();

        // Get API key from environment variable (stored as RAINBOW_API_KEY in Cloudflare)
        const apiKey = env.RAINBOW_API_KEY;

        if (!apiKey) {
            console.error('Rainbow.ai API key not configured');
            return new Response(JSON.stringify({ error: 'API key not configured' }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Validate coordinates
        if (!lat || !lon || isNaN(lat) || isNaN(lon)) {
            return new Response(JSON.stringify({ error: 'Invalid coordinates' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // ⚠️ Important: Rainbow.ai uses lon/lat order (longitude first!)
        const rainbowUrl = `https://api.rainbow.ai/nowcast/v1/precip/${lon}/${lat}`;

        console.log('Fetching rain forecast from:', rainbowUrl);

        // Note: Rainbow.ai requires the header "Ocp-Apim-Subscription-Key" (Azure API Management standard)
        const response = await fetch(rainbowUrl, {
            method: 'GET',
            headers: {
                'Ocp-Apim-Subscription-Key': apiKey
            }
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('Rainbow.ai API error:', response.status, error);
            return new Response(JSON.stringify({
                error: 'Rain forecast unavailable',
                status: response.status
            }), {
                status: response.status,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const data = await response.json();

        // Return the forecast data
        return new Response(JSON.stringify(data), {
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
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
