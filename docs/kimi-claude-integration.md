Kimi & Claude Integration
=========================

Overview
--------
This document explains how to configure and use the Kimi and Claude providers in the app.

Environment variables
---------------------
- `KIMI_API_KEY` - API key for Kimi when using the OpenAI-compatible fallback.
- `KIMI_API_URL` - Optional: custom Kimi API URL (OpenAI/chat-compatible). If set, the server will POST directly to this URL.
- `CLAUDE_API_KEY` - Anthropic API key for Claude.

Headers (per-request overrides)
------------------------------
You can pass API keys or override the Kimi URL per-request using headers:

- `X-Kimi-API-Key`: override Kimi API key for the request.
- `X-Kimi-API-URL`: override Kimi API URL for the request.
- `X-Claude-API-Key`: override Claude API key for the request.

Kimi usage
----------
1. If `KIMI_API_URL` is set (or `X-Kimi-API-URL` provided), the server will POST JSON like:

```json
{
  "model": "gpt-4o-mini",
  "messages": [{"role": "user", "content": "<your prompt>"}],
  "temperature": 0.7,
  "max_tokens": 1024
}
```

Use `Authorization: Bearer <KIMI_API_KEY>`.

2. If no `KIMI_API_URL` is set, the server will fall back to using the `KIMI_API_KEY` against an OpenAI-compatible endpoint via the same code path as `generateWithOpenAI`.

Claude usage
------------
The server calls Anthropic's `/v1/complete` endpoint with a framed prompt to improve response quality. Example body:

```json
{
  "model": "claude-2.1",
  "prompt": "\n\nHuman: <your prompt>\n\nAssistant:",
  "max_tokens_to_sample": 1024,
  "temperature": 0.7,
  "stop_sequences": ["\n\nHuman:"]
}
```

Use `Authorization: Bearer <CLAUDE_API_KEY>`.

Notes
-----
- Kimi custom URL must be OpenAI/chat-compatible; otherwise the server will try to extract `choices[0].message.content` or fallback to `text`.
- The handlers accept per-request overrides via headers for testing or temporary runs.

Examples
--------
Fetch to LLM API endpoint with Kimi override:

curl example:

```bash
curl -X POST /api/llm \
  -H "Content-Type: application/json" \
  -H "X-Kimi-API-URL: https://kimi.example.com/v1/chat/completions" \
  -H "X-Kimi-API-Key: <key>" \
  -d '{"provider":"kimi","model":"gpt-4o-mini","prompt":"Hello"}'
```

Fetch to LLM API endpoint for Claude:

```bash
curl -X POST /api/llm \
  -H "Content-Type: application/json" \
  -H "X-Claude-API-Key: <anthropic-key>" \
  -d '{"provider":"claude","model":"claude-2.1","prompt":"Explain recursion"}'
```
