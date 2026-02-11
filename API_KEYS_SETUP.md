# API Keys Setup Guide for Rootvrse

## Quick Start

To use Rootvrse, you need at least one API key. Follow these steps to add your keys:

### 1. Open Settings
- Click the **⚙️ Settings** button in the top right of the header
- Select the **API Keys** tab

### 2. Add Your First API Key

#### Google Gemini (Required)
- Visit: https://ai.google.dev
- Click "Get API Key"
- Copy your key and paste it into the Gemini field
- Click **Test Key** to verify
- Click **Save All Keys**

#### Additional Providers (Optional)

**OpenAI**
- Visit: https://platform.openai.com/api-keys
- Create a new API key
- Paste into the OpenAI field
- Test and save

**Replicate**
- Visit: https://replicate.com/account/api-tokens
- Copy your API token
- Paste into the Replicate field
- Test and save

**Fal.ai**
- Visit: https://fal.ai/dashboard/keys
- Create a new key
- Paste into the Fal.ai field
- Test and save

### 3. Security Notes

🔒 **Your API keys are stored securely:**
- Keys are stored **locally in your browser** (localStorage), NOT on our servers
- Each API call goes directly to the provider's servers
- You can delete keys anytime by clicking **Clear**
- For production deployments, add keys to your `.env.local` file instead

## What Each Provider Does

| Provider | Purpose | Free Tier |
|----------|---------|-----------|
| **Gemini** | Image generation and AI analysis | 60 requests/min |
| **OpenAI** | Text generation with GPT models | Free trial ($5 credits) |
| **Replicate** | Thousands of open-source models | Free predictions available |
| **Fal.ai** | Fast image & video generation | Free monthly quota |

## Troubleshooting

### "Invalid API Key" Error
- Double-check you copied the entire key (including any dashes or underscores)
- Verify the key hasn't been revoked in your provider's dashboard
- Make sure you're using the correct provider type

### Key Not Being Used
- Verify the key has a ✅ "Valid" status
- Check your provider's usage dashboard to see if calls are being made
- Refresh the page and try again

### Different Behavior on Server vs. Browser
For server deployments:
1. Add keys to `.env.local` at the project root:
   ```
   GEMINI_API_KEY=your_key_here
   OPENAI_API_KEY=your_key_here
   REPLICATE_API_KEY=your_key_here
   FAL_API_KEY=your_key_here
   ```
2. Restart the server
3. Keys from `.env.local` take priority over browser keys

##Free API Key Resources

- **Gemini**: https://ai.google.dev (free tier available)
- **OpenAI**: https://platform.openai.com/account/billing/overview (free trial)
- **Replicate**: https://replicate.com/pricing (free predictions)
- **Fal.ai**: https://fal.ai/pricing (free tier)

## Next Steps

Once your keys are saved:
1. Click **Get Started** on the landing page
2. Create a new project
3. Start building workflows!

Questions? Check the [full documentation](https://node-banana-docs.vercel.app/)
