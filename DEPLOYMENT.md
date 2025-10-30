# Deployment Instructions

## Cloudflare Pages Setup

### 1. Set Environment Variables

The app requires two API keys to be set as environment variables in Cloudflare Pages:

1. Go to your Cloudflare Pages dashboard
2. Select your project (`rw`)
3. Go to **Settings** → **Environment variables**
4. Click **Add variable** for each key below:

**OpenRouter API Key (for AI clothing advice):**
   - **Variable name**: `OPENROUTER_API_KEY`
   - **Value**: Your OpenRouter API key (get one at https://openrouter.ai/keys)
   - **Environment**: Select "Production" (and "Preview" if you want it in previews too)

**Rainbow.ai API Key (for rain forecast):**
   - **Variable name**: `RAINBOW_API_KEY`
   - **Value**: Your Rainbow.ai API key (sign up at https://developer.rainbow.ai/)
   - **Environment**: Select "Production" (and "Preview" if you want it in previews too)

5. Click **Save**

### 2. Deploy

After setting the environment variable, deploy your app:

```bash
git add .
git commit -m "Add serverless function for AI clothing advice"
git push
```

Cloudflare Pages will automatically deploy. The AI clothing advice feature will now work securely without exposing your API key in the browser.

### 3. Test

Once deployed, search for any city and verify:
- Weather comparison displays correctly
- AI-generated clothing advice appears (streamed in real-time)
- If API fails, it falls back to rule-based suggestions

## Local Development

For local testing with Cloudflare Pages Functions:

```bash
# Install Wrangler CLI (if not already installed)
npm install -g wrangler

# Create a .dev.vars file with your API keys
cat > .dev.vars << EOF
OPENROUTER_API_KEY=your-openrouter-key-here
RAINBOW_API_KEY=your-rainbow-api-key-here
EOF

# Run local dev server
wrangler pages dev .
```

Then open http://localhost:8788 to test locally.

## How It Works

**AI Clothing Advice:**
- **Client-side** (`js/perception.js`): Calls `/api/clothing-advice` endpoint
- **Serverless function** (`functions/api/clothing-advice.js`): Securely calls OpenRouter API with environment variable

**Rain Forecast:**
- **Client-side** (`js/rain.js`, `js/rainChart.js`): Calls `/api/rain-forecast` endpoint
- **Serverless function** (`functions/api/rain-forecast.js`): Securely calls Rainbow.ai API with environment variable
- **Display**: Shows minute-by-minute precipitation for the next hour with visual chart

**Security:**
- API keys are never exposed to browsers, only stored in Cloudflare's secure environment

## Troubleshooting

**AI advice not showing?**
- Check `OPENROUTER_API_KEY` environment variable is set correctly in Cloudflare Pages
- Verify deployment completed successfully
- Check browser console for errors
- Confirm OpenRouter account has credits

**Getting fallback suggestions?**
- This is expected if the API key is not set or API fails
- Rule-based suggestions will always work as a fallback

**Rain forecast not showing?**
- Check `RAINBOW_API_KEY` environment variable is set correctly in Cloudflare Pages
- Verify you have signed up for Rainbow.ai API access at https://developer.rainbow.ai/
- Check browser console for errors (F12 → Console tab)
- Rain data may not be available for all locations (primarily works in areas with radar coverage)
- The chart will gracefully hide if no data is available

**Rain chart showing "No rain data available"?**
- This is expected for some locations where Rainbow.ai doesn't have coverage
- The feature will automatically hide if data is unavailable
- The rest of the app will continue to work normally
