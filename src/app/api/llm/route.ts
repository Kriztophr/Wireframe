import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { LLMGenerateRequest, LLMGenerateResponse, LLMModelType } from "@/types";
import { logger } from "@/utils/logger";

export const maxDuration = 60; // 1 minute timeout

// Generate a unique request ID for tracking
function generateRequestId(): string {
  return `llm-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// Map model types to actual API model IDs
const GOOGLE_MODEL_MAP: Record<string, string> = {
  "gemini-2.5-flash": "gemini-2.5-flash",
  "gemini-3-flash-preview": "gemini-3-flash-preview",
  "gemini-3-pro-preview": "gemini-3-pro-preview",
};

const OPENAI_MODEL_MAP: Record<string, string> = {
  "gpt-4.1-mini": "gpt-4.1-mini",
  "gpt-4.1-nano": "gpt-4.1-nano",
};

async function generateWithGoogle(
  prompt: string,
  model: LLMModelType,
  temperature: number,
  maxTokens: number,
  images?: string[],
  requestId?: string,
  userApiKey?: string | null
): Promise<string> {
  // User-provided key takes precedence over env variable
  const apiKey = userApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    logger.error('api.error', 'GEMINI_API_KEY not configured', { requestId });
    throw new Error("GEMINI_API_KEY not configured. Add it to .env.local or configure in Settings.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const modelId = GOOGLE_MODEL_MAP[model];

  logger.info('api.llm', 'Calling Google AI API', {
    requestId,
    model: modelId,
    temperature,
    maxTokens,
    imageCount: images?.length || 0,
    promptLength: prompt.length,
  });

  // Build multimodal content if images are provided
  let contents: string | Array<{ inlineData: { mimeType: string; data: string } } | { text: string }>;
  if (images && images.length > 0) {
    contents = [
      ...images.map((img) => {
        // Extract base64 data and mime type from data URL
        const matches = img.match(/^data:(.+?);base64,(.+)$/);
        if (matches) {
          return {
            inlineData: {
              mimeType: matches[1],
              data: matches[2],
            },
          };
        }
        // Fallback: assume PNG if no data URL prefix
        return {
          inlineData: {
            mimeType: "image/png",
            data: img,
          },
        };
      }),
      { text: prompt },
    ];
  } else {
    contents = prompt;
  }

  const startTime = Date.now();
  const response = await ai.models.generateContent({
    model: modelId,
    contents,
    config: {
      temperature,
      maxOutputTokens: maxTokens,
    },
  });
  const duration = Date.now() - startTime;

  // Use the convenient .text property that concatenates all text parts
  const text = response.text;
  if (!text) {
    logger.error('api.error', 'No text in Google AI response', { requestId });
    throw new Error("No text in Google AI response");
  }

  logger.info('api.llm', 'Google AI API response received', {
    requestId,
    duration,
    responseLength: text.length,
  });

  return text;
}

async function generateWithOpenAI(
  prompt: string,
  model: LLMModelType,
  temperature: number,
  maxTokens: number,
  images?: string[],
  requestId?: string,
  userApiKey?: string | null
): Promise<string> {
  // User-provided key takes precedence over env variable
  const apiKey = userApiKey || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    logger.error('api.error', 'OPENAI_API_KEY not configured', { requestId });
    throw new Error("OPENAI_API_KEY not configured. Add it to .env.local or configure in Settings.");
  }

  const modelId = OPENAI_MODEL_MAP[model];

  logger.info('api.llm', 'Calling OpenAI API', {
    requestId,
    model: modelId,
    temperature,
    maxTokens,
    imageCount: images?.length || 0,
    promptLength: prompt.length,
  });

  // Build content array for vision if images are provided
  let content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
  if (images && images.length > 0) {
    content = [
      { type: "text", text: prompt },
      ...images.map((img) => ({
        type: "image_url" as const,
        image_url: { url: img },
      })),
    ];
  } else {
    content = prompt;
  }

  const startTime = Date.now();
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelId,
      messages: [{ role: "user", content }],
      temperature,
      max_tokens: maxTokens,
    }),
  });
  const duration = Date.now() - startTime;

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    logger.error('api.error', 'OpenAI API request failed', {
      requestId,
      status: response.status,
      error: error.error?.message,
    });
    throw new Error(error.error?.message || `OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;

  if (!text) {
    logger.error('api.error', 'No text in OpenAI response', { requestId });
    throw new Error("No text in OpenAI response");
  }

  logger.info('api.llm', 'OpenAI API response received', {
    requestId,
    duration,
    responseLength: text.length,
  });

  return text;
}

async function generateWithKimi(
  prompt: string,
  model: LLMModelType,
  temperature: number,
  maxTokens: number,
  images?: string[],
  requestId?: string,
  userApiKey?: string | null,
  userApiUrl?: string | null
): Promise<string> {
  // Kimi supports two modes:
  // 1) If a custom KIMI_API_URL is provided, POST to that URL with Bearer auth.
  // 2) Otherwise fall back to OpenAI-compatible endpoint using the provided API key.

  const apiUrl = userApiUrl || process.env.KIMI_API_URL || null;
  const apiKey = userApiKey || process.env.KIMI_API_KEY || null;

  if (!apiKey && !apiUrl) {
    logger.error('api.error', 'KIMI API not configured', { requestId });
    throw new Error("KIMI API not configured. Add KIMI_API_KEY or KIMI_API_URL to .env.local or configure in Settings.");
  }

  // If an explicit API URL is provided, assume OpenAI-compatible chat completions API shape
  if (apiUrl) {
    logger.info('api.llm', 'Calling Kimi custom API', { requestId, apiUrl, model });

    const body: any = {
      model: model || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature,
      max_tokens: maxTokens,
    };

    const startTime = Date.now();
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
    const duration = Date.now() - startTime;

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      logger.error('api.error', 'Kimi API request failed', { requestId, status: response.status, error: err });
      throw new Error(err?.error || `Kimi API error: ${response.status}`);
    }

    const data = await response.json();
    // Support OpenAI-style and simple { text } responses
    const text = data?.choices?.[0]?.message?.content || data?.text || data?.message || null;
    if (!text) {
      logger.error('api.error', 'No text in Kimi response', { requestId });
      throw new Error('No text in Kimi response');
    }

    logger.info('api.llm', 'Kimi API response received', { requestId, duration, responseLength: text.length });
    return text;
  }

  // Fallback: treat Kimi as OpenAI-compatible using the provided API key
  return await generateWithOpenAI(prompt, model, temperature, maxTokens, images, requestId, apiKey);
}

async function generateWithClaude(
  prompt: string,
  model: LLMModelType,
  temperature: number,
  maxTokens: number,
  images?: string[],
  requestId?: string,
  userApiKey?: string | null
): Promise<string> {
  const apiKey = userApiKey || process.env.CLAUDE_API_KEY;
  if (!apiKey) {
    logger.error('api.error', 'CLAUDE_API_KEY not configured', { requestId });
    throw new Error("CLAUDE_API_KEY not configured. Add it to .env.local or configure in Settings.");
  }

  // Prefer a recent Claude model; keep configurable in code if needed
  const modelId = "claude-2.1";

  // Anthropic expects a single string `prompt` for the /v1/complete API.
  // Use simple role-style framing to improve responses and add stop sequences
  const framedPrompt = `\n\nHuman: ${prompt}\n\nAssistant:`;

  const body: any = {
    model: modelId,
    prompt: framedPrompt,
    max_tokens_to_sample: maxTokens,
    temperature,
    // Stop when the assistant finishes or when a new human turn begins
    stop_sequences: ["\n\nHuman:"] ,
  };

  logger.info('api.llm', 'Calling Anthropic Claude API', {
    requestId,
    model: modelId,
    temperature,
    maxTokens,
    promptLength: prompt.length,
  });

  const startTime = Date.now();
  const response = await fetch("https://api.anthropic.com/v1/complete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  const duration = Date.now() - startTime;

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    logger.error('api.error', 'Anthropic API request failed', { requestId, status: response.status, error: err });
    throw new Error(err?.error || `Anthropic API error: ${response.status}`);
  }

  const data = await response.json();
  // Claude returns `completion` (string) for the v1/complete endpoint
  const text = data?.completion || data?.completion_text || data?.text || null;
  if (!text) {
    logger.error('api.error', 'No text in Anthropic response', { requestId });
    throw new Error('No text in Anthropic response');
  }

  logger.info('api.llm', 'Anthropic API response received', { requestId, duration, responseLength: text.length });
  // Trim any assistant/human framing left in the response
  return text.replace(/^\s*Assistant:\s*/i, "").trim();
}

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    // Get user-provided API keys from headers (override env variables)
    const geminiApiKey = request.headers.get("X-Gemini-API-Key");
    const openaiApiKey = request.headers.get("X-OpenAI-API-Key");
    const claudeApiKey = request.headers.get("X-Claude-API-Key");
    const kimiApiKey = request.headers.get("X-Kimi-API-Key");

    const body: LLMGenerateRequest = await request.json();
    const {
      prompt,
      images,
      provider,
      model,
      temperature = 0.7,
      maxTokens = 1024
    } = body;

    logger.info('api.llm', 'LLM generation request received', {
      requestId,
      provider,
      model,
      temperature,
      maxTokens,
      hasImages: !!(images && images.length > 0),
      imageCount: images?.length || 0,
      prompt,
    });

    if (!prompt) {
      logger.warn('api.llm', 'LLM request validation failed: missing prompt', { requestId });
      return NextResponse.json<LLMGenerateResponse>(
        { success: false, error: "Prompt is required" },
        { status: 400 }
      );
    }

    let text: string;

    if (provider === "google") {
      text = await generateWithGoogle(prompt, model, temperature, maxTokens, images, requestId, geminiApiKey);
    } else if (provider === "openai") {
      text = await generateWithOpenAI(prompt, model, temperature, maxTokens, images, requestId, openaiApiKey);
    } else if (provider === "claude") {
      // Anthropic Claude
      text = await generateWithClaude(prompt, model, temperature, maxTokens, images, requestId, claudeApiKey);
    } else if (provider === "kimi") {
      // Kimi - use Kimi helper which supports custom KIMI_API_URL or OpenAI-compatible fallback
      const kimiApiUrl = request.headers.get("X-Kimi-API-URL");
      text = await generateWithKimi(prompt, model, temperature, maxTokens, images, requestId, kimiApiKey || openaiApiKey, kimiApiUrl || undefined);
    } else {
      logger.warn('api.llm', 'Unknown provider requested', { requestId, provider });
      return NextResponse.json<LLMGenerateResponse>(
        { success: false, error: `Unknown provider: ${provider}` },
        { status: 400 }
      );
    }

    logger.info('api.llm', 'LLM generation successful', {
      requestId,
      responseLength: text.length,
    });

    return NextResponse.json<LLMGenerateResponse>({
      success: true,
      text,
    });
  } catch (error) {
    logger.error('api.error', 'LLM generation error', { requestId }, error instanceof Error ? error : undefined);

    // Handle rate limiting
    if (error instanceof Error && error.message.includes("429")) {
      return NextResponse.json<LLMGenerateResponse>(
        { success: false, error: "Rate limit reached. Please wait and try again." },
        { status: 429 }
      );
    }

    return NextResponse.json<LLMGenerateResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : "LLM generation failed",
      },
      { status: 500 }
    );
  }
}
