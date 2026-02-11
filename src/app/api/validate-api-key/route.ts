import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, createRateLimitResponse, isValidKeyFormat, sanitizeErrorMessage, validateOrigin, createCorsErrorResponse, hashKeyForLogging } from "@/lib/security";
import { logger } from "@/utils/logger";

// Rate limit: 5 validations per minute per IP
const VALIDATE_LIMIT = 5;

export async function POST(request: NextRequest) {
  try {
    // Validate CORS origin
    const originCheck = validateOrigin(request);
    if (!originCheck.allowed) {
      logger.warn('api.error', 'CORS validation failed', { reason: originCheck.reason });
      return createCorsErrorResponse(originCheck.reason);
    }

    // Get client IP for rate limiting
    const clientIp = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const rateLimitKey = `validate-key:${clientIp}`;

    // Check rate limit
    const rateLimit = checkRateLimit(rateLimitKey, VALIDATE_LIMIT);
    if (!rateLimit.allowed) {
      logger.warn('api.error', 'Rate limit exceeded for key validation', { clientIp, remaining: rateLimit.remaining });
      return createRateLimitResponse(rateLimit.resetTime);
    }

    const body = await request.json();
    const { provider, key } = body;

    // Input validation
    if (!provider || typeof provider !== "string") {
      logger.warn('workflow.validation', 'Missing or invalid provider', { clientIp });
      return NextResponse.json(
        { valid: false, error: "Invalid request" },
        { status: 400 }
      );
    }

    if (!key || !isValidKeyFormat(key)) {
      logger.warn('workflow.validation', 'Invalid key format', { clientIp, provider, keyHash: hashKeyForLogging(key) });
      return NextResponse.json(
        { valid: false, error: "Invalid key format" },
        { status: 400 }
      );
    }

    // Sanitize provider to prevent injection
    const sanitizedProvider = provider.toLowerCase().replace(/[^a-z0-9_-]/g, "");

    logger.info('workflow.validation', 'Starting key validation', {
      clientIp,
      provider: sanitizedProvider,
      keyHash: hashKeyForLogging(key),
      remaining: rateLimit.remaining,
    });

    // Validate key format and make a test call to each provider
    switch (sanitizedProvider) {
      case "gemini":
        return validateGeminiKey(key);
      case "openai":
        return validateOpenAIKey(key);
      case "replicate":
        return validateReplicateKey(key);
      case "fal":
        return validateFalKey(key);
      case "kimi":
        return validateKimiKey(key);
      case "claude":
        return validateClaudeKey(key);
      case "kling":
        return validateKlingKey(key);
      default:
        logger.warn('workflow.validation', 'Unknown provider', { provider: sanitizedProvider });
        return NextResponse.json(
          { valid: false, error: "Invalid request" },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.error('api.error', 'Key validation error', {}, error instanceof Error ? error : undefined);
    return NextResponse.json(
      {
        valid: false,
        error: sanitizeErrorMessage(error instanceof Error ? error : String(error)),
      },
      { status: 500 }
    );
  }
}


async function validateGeminiKey(key: string): Promise<NextResponse> {
  try {
    // Basic format check for Gemini keys
    if (!key || key.length < 20) {
      return NextResponse.json({ valid: false, error: "Invalid configuration" });
    }

    // Make a test request to Gemini API
    const response = await fetch("https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=" + encodeURIComponent(key), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: "test",
              },
            ],
          },
        ],
      }),
    });

    if (response.status === 401 || response.status === 403) {
    logger.warn('api.error', 'Invalid Gemini key');
      return NextResponse.json({ valid: false, error: "Invalid configuration" });
    }

    logger.info('api.error', 'Gemini key validated successfully');
    return NextResponse.json({ valid: true });
  } catch (error) {
    logger.error('api.error', 'Gemini validation error', {}, error instanceof Error ? error : undefined);
    return NextResponse.json({ valid: false, error: "Unable to validate" });
  }
}

async function validateOpenAIKey(key: string): Promise<NextResponse> {
  try {
    // Basic format check (OpenAI keys start with sk-)
    if (!key.startsWith("sk-") || key.length < 20) {
      return NextResponse.json({ valid: false, error: "Invalid configuration" });
    }

    // Make a test request to OpenAI API
    const response = await fetch("https://api.openai.com/v1/models", {
      headers: {
        Authorization: `Bearer ${key}`,
      },
    });

    if (response.status === 401) {
      logger.warn('api.error', 'Invalid OpenAI key');
      return NextResponse.json({ valid: false, error: "Invalid configuration" });
    }

    logger.info('api.error', 'OpenAI key validated successfully');
    return NextResponse.json({ valid: true });
  } catch (error) {
    logger.error('api.error', 'OpenAI validation error', {}, error instanceof Error ? error : undefined);
    return NextResponse.json({ valid: false, error: "Unable to validate" });
  }
}

async function validateReplicateKey(key: string): Promise<NextResponse> {
  try {
    if (!key || key.length < 20) {
      return NextResponse.json({ valid: false, error: "Invalid configuration" });
    }

    // Make a test request to Replicate API
    const response = await fetch("https://api.replicate.com/v1/account", {
      headers: {
        Authorization: `Token ${key}`,
      },
    });

    if (response.status === 401) {
      logger.warn('api.error', 'Invalid Replicate key');
      return NextResponse.json({ valid: false, error: "Invalid configuration" });
    }

    logger.info('api.error', 'Replicate key validated successfully');
    return NextResponse.json({ valid: true });
  } catch (error) {
    logger.error('api.error', 'Replicate validation error', {}, error instanceof Error ? error : undefined);
    return NextResponse.json({ valid: false, error: "Unable to validate" });
  }
}

async function validateFalKey(key: string): Promise<NextResponse> {
  try {
    if (!key || key.length < 20) {
      return NextResponse.json({ valid: false, error: "Invalid configuration" });
    }

    // Make a test request to Fal API
    const response = await fetch("https://api.fal.ai/v1/status", {
      headers: {
        Authorization: `Key ${key}`,
      },
    });

    if (response.status === 401) {
      logger.warn('api.error', 'Invalid Fal key');
      return NextResponse.json({ valid: false, error: "Invalid configuration" });
    }

    logger.info('api.error', 'Fal key validated successfully');
    return NextResponse.json({ valid: true });
  } catch (error) {
    logger.error('api.error', 'Fal validation error', {}, error instanceof Error ? error : undefined);
    return NextResponse.json({ valid: false, error: "Unable to validate" });
  }
}

async function validateClaudeKey(key: string): Promise<NextResponse> {
  try {
    if (!key || key.length < 20) {
      return NextResponse.json({ valid: false, error: "Invalid configuration" });
    }

    // Make a test request to Anthropic API
    const response = await fetch("https://api.anthropic.com/v1/models", {
      headers: {
        Authorization: `Bearer ${key}`,
      },
    });

    if (response.status === 401) {
      logger.warn('api.error', 'Invalid Claude key');
      return NextResponse.json({ valid: false, error: "Invalid configuration" });
    }

    logger.info('api.error', 'Claude key validated successfully');
    return NextResponse.json({ valid: true });
  } catch (error) {
    logger.error('api.error', 'Claude validation error', {}, error instanceof Error ? error : undefined);
    return NextResponse.json({ valid: false, error: "Unable to validate" });
  }
}

async function validateKimiKey(key: string): Promise<NextResponse> {
  try {
    if (!key || key.length < 10) {
      return NextResponse.json({ valid: false, error: "Invalid configuration" });
    }

    logger.info('api.error', 'Kimi key format validated');
    return NextResponse.json({ valid: true });
  } catch (error) {
    logger.error('api.error', 'Kimi validation error', {}, error instanceof Error ? error : undefined);
    return NextResponse.json({ valid: false, error: "Unable to validate" });
  }
}

async function validateKlingKey(key: string): Promise<NextResponse> {
  try {
    if (!key || key.length < 10) {
      return NextResponse.json({ valid: false, error: "Invalid configuration" });
    }

    logger.info('api.error', 'Kling key format validated');
    return NextResponse.json({ valid: true });
  } catch (error) {
    logger.error('api.error', 'Kling validation error', {}, error instanceof Error ? error : undefined);
    return NextResponse.json({ valid: false, error: "Unable to validate" });
  }
}
