# Deployment Instructions

## Cloudflare Pages Setup

### 1. Set Environment Variable

The app requires an OpenRouter API key to be set as an environment variable in Cloudflare Pages:

1. Go to your Cloudflare Pages dashboard
2. Select your project (`rw`)
3. Go to **Settings** → **Environment variables**
4. Click **Add variable**
5. Add:
   - **Variable name**: `OPENROUTER_API_KEY`
   - **Value**: Your OpenRouter API key (get one at https://openrouter.ai/keys)
   - **Environment**: Select "Production" (and "Preview" if you want it in previews too)
6. Click **Save**

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

# Create a .dev.vars file with your API key
echo "OPENROUTER_API_KEY=your-key-here" > .dev.vars

# Run local dev server
wrangler pages dev .
```

Then open http://localhost:8788 to test locally.

## How It Works

- **Client-side** (`js/perception.js`): Calls `/api/clothing-advice` endpoint
- **Serverless function** (`functions/api/clothing-advice.js`): Securely calls OpenRouter API with environment variable
- **API key**: Never exposed to browsers, only stored in Cloudflare's secure environment

## Troubleshooting

**AI advice not showing?**
- Check environment variable is set correctly in Cloudflare Pages
- Verify deployment completed successfully
- Check browser console for errors
- Confirm OpenRouter account has credits

**Getting fallback suggestions?**
- This is expected if the API key is not set or API fails
- Rule-based suggestions will always work as a fallback
