# API Key Setup (Optional)

The app works perfectly fine **without API keys**! The comprehensive supplement database covers most common items. AI is only used for truly unknown supplements.

## For Local Testing (Your Development)

1. Create a `.env` file in the `backend/` directory:
   ```bash
   cd backend
   touch .env
   ```

2. Add your API key:
   ```
   GROQ_API_KEY=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
   ```

3. The `.env` file is gitignored and will NOT be committed to git.

## For Public Distribution

**IMPORTANT**: For public distribution, users should use their own API keys:

1. Users can get a free Groq API key at: https://console.groq.com/
2. They create their own `.env` file with their key
3. The app will work without keys (uses database + keyword matching)
4. AI is only used as a last resort for unknown items

## Security Notes

- ✅ `.env` files are gitignored (never committed)
- ✅ API keys are read from environment variables only
- ✅ No keys are hardcoded in the source code
- ✅ Users can use their own keys for public distribution
- ⚠️ For testing, you can use your key locally (it's safe in `.env`)

## Alternative APIs

You can also use:
- **OpenAI API**: Set `OPENAI_API_KEY` in `.env`
- **Grok API** (xAI): Set `GROK_API_KEY` in `.env` (if supported)

The app tries Groq first, then OpenAI, then falls back to safe defaults.

